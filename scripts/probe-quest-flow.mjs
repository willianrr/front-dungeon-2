const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_QUEST_PROBE_TIMEOUT_MS ?? 95000);
const interactRange = Number(process.env.ARANNA_QUEST_PROBE_INTERACT_RANGE ?? 3.1);
const meleeRange = Number(process.env.ARANNA_QUEST_PROBE_MELEE_RANGE ?? 2.35);

const OVERWORLD_MILESTONE = 'Acampamento seguro: use o portal ou fale com Edrik.';
const DUNGEON_MILESTONE = 'Dungeon purificada: volte para Lyra no acampamento.';

if (typeof WebSocket === 'undefined') {
  throw new Error('This Node.js runtime does not expose WebSocket. Use the bundled/current Node runtime used by the project.');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return body.data;
}

async function createProbePlayer() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const auth = await request('/accounts/register', {
    method: 'POST',
    body: JSON.stringify({ email: `codex-quest-${stamp}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: 'QuestProbe' }),
  });
  return { auth, character };
}

function distance2d(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(predicate, label, timeout = timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const value = predicate();
        if (value) {
          resolve(value);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      if (Date.now() - startedAt > timeout) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

function localPlayer(state) {
  return state.snapshot?.entities?.find((entity) => entity.id === state.playerId);
}

function aliveEnemies(state) {
  return state.snapshot?.entities?.filter((entity) => entity.kind === 'enemy' && entity.alive) ?? [];
}

function nearestEnemy(state) {
  const player = localPlayer(state);
  if (!player) return null;
  return aliveEnemies(state)
    .map((enemy) => ({ enemy, distance: distance2d(player.position, enemy.position) }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function skillReady(player, skillId) {
  const skill = player?.skills?.find((candidate) => candidate.id === skillId);
  if (!skill || skill.cooldownRemaining > 0.05) return false;
  return (player.mana ?? 0) >= (skill.manaCost ?? 0);
}

function countSeenEvents(state, type) {
  return state.partyEventCounts.get(type) ?? 0;
}

function sawEventMessage(state, message) {
  return state.partyEventMessages.has(message);
}

function mergeSnapshot(state, snapshot) {
  if (snapshot.npcs !== null && snapshot.npcs !== undefined) state.npcs = snapshot.npcs;
  if (snapshot.quest !== null && snapshot.quest !== undefined) state.quest = snapshot.quest;
  if (snapshot.inventory !== null && snapshot.inventory !== undefined) state.inventory = snapshot.inventory;
  if (snapshot.equipment !== null && snapshot.equipment !== undefined) state.equipment = snapshot.equipment;
  if (snapshot.talents !== null && snapshot.talents !== undefined) state.talents = snapshot.talents;

  const partyEvents = Array.isArray(snapshot.partyEvents) ? snapshot.partyEvents : [];
  for (const event of partyEvents) {
    if (!event?.id || state.seenPartyEventIds.has(event.id)) continue;
    state.seenPartyEventIds.add(event.id);
    state.partyEventCounts.set(event.type, countSeenEvents(state, event.type) + 1);
    if (event.message) state.partyEventMessages.add(event.message);
  }

  state.snapshot = {
    ...(state.snapshot ?? {}),
    ...snapshot,
    npcs: state.npcs,
    quest: state.quest,
    inventory: state.inventory,
    equipment: state.equipment,
    talents: state.talents,
  };
}

async function connectProbeClient(player) {
  const url = `${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`;
  const socket = new WebSocket(url);
  const state = {
    characterId: player.character.id,
    name: player.character.name,
    playerId: '',
    seed: 0,
    snapshot: null,
    npcs: null,
    quest: null,
    inventory: null,
    equipment: null,
    talents: null,
    snapshots: 0,
    messages: 0,
    seenPartyEventIds: new Set(),
    partyEventCounts: new Map(),
    partyEventMessages: new Set(),
  };

  socket.addEventListener('message', (event) => {
    state.messages++;
    const raw = String(event.data);
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === 'welcome') {
      state.playerId = message.playerId ?? state.playerId;
      state.seed = message.seed ?? state.seed;
    }
    if (message.type === 'snapshot' && message.snapshot) {
      mergeSnapshot(state, message.snapshot);
      state.snapshots++;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && state.npcs && state.quest && localPlayer(state), 'initial quest snapshot');
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

function npcById(client, id) {
  return client.state.npcs?.find((npc) => npc.id === id) ?? null;
}

async function moveNear(client, target, label, range = interactRange) {
  await waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    const distance = distance2d(player.position, target);
    if (distance <= range) return true;
    send(client, {
      type: 'move',
      entityId: client.state.playerId,
      target,
      run: true,
    });
    return null;
  }, `move near ${label}`);
}

async function fightUntil(client, predicate, label) {
  const startedAt = Date.now();
  let lastAttackAt = 0;
  let lastMoveAt = 0;
  let lastPotionAt = 0;
  let lastChargeAt = 0;
  let lastHeavyAt = 0;
  let lastNovaAt = 0;

  while (Date.now() - startedAt <= timeoutMs) {
    if (predicate(client.state.quest)) return client.state.quest;

    const player = localPlayer(client.state);
    if (!player) {
      await delay(150);
      continue;
    }
    if (!player.alive) {
      throw new Error(`Quest probe player died while waiting for ${label}`);
    }

    const now = Date.now();
    if (player.hp / Math.max(1, player.maxHp) < 0.45 && now - lastPotionAt > 1500) {
      send(client, { type: 'use-item', entityId: client.state.playerId, item: 'potion' });
      lastPotionAt = now;
    }

    const target = nearestEnemy(client.state);
    if (!target) {
      await delay(250);
      continue;
    }

    if (target.distance > meleeRange + 0.25 && now - lastMoveAt > 350) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: target.enemy.position,
        run: true,
      });
      lastMoveAt = now;
    }

    if (target.distance <= 14 && skillReady(player, 'charge') && now - lastChargeAt > 900) {
      send(client, {
        type: 'cast-skill',
        entityId: client.state.playerId,
        skill: 'charge',
        targetId: target.enemy.id,
      });
      lastChargeAt = now;
    }

    if (target.distance <= meleeRange + 0.35 && skillReady(player, 'heavy-strike') && now - lastHeavyAt > 700) {
      send(client, {
        type: 'cast-skill',
        entityId: client.state.playerId,
        skill: 'heavy-strike',
        targetId: target.enemy.id,
      });
      lastHeavyAt = now;
    }

    if (target.distance <= 5.2 && skillReady(player, 'arcane-nova') && now - lastNovaAt > 900) {
      send(client, {
        type: 'cast-skill',
        entityId: client.state.playerId,
        skill: 'arcane-nova',
      });
      lastNovaAt = now;
    }

    if (now - lastAttackAt > 550) {
      send(client, {
        type: 'attack',
        entityId: client.state.playerId,
        targetId: target.enemy.id,
      });
      lastAttackAt = now;
    }

    await delay(120);
  }

  throw new Error(`Timed out fighting for ${label}: zone=${client.state.snapshot?.zone} quest=${JSON.stringify(client.state.quest)} enemies=${aliveEnemies(client.state).length}`);
}

async function closeClient(client) {
  if (!client?.socket || client.socket.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    client.socket.addEventListener('close', resolve, { once: true });
    client.socket.close();
    setTimeout(resolve, 1000);
  });
}

let client;

try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);

  const lyra = npcById(client, 'npc-quest-lyra');
  if (!lyra) throw new Error('Lyra quest NPC missing from snapshot');

  await moveNear(client, lyra.position, 'Lyra');
  send(client, {
    type: 'accept-quest',
    entityId: client.state.playerId,
    npcId: lyra.id,
  });

  await waitFor(
    () => client.state.quest?.accepted && countSeenEvents(client.state, 'quest_accepted') >= 1,
    'quest acceptance and system event',
  );

  await fightUntil(
    client,
    (quest) => quest?.accepted && quest.goal === 4 && quest.progress >= 4 && sawEventMessage(client.state, OVERWORLD_MILESTONE),
    'overworld quest objective 4/4',
  );

  const edrik = npcById(client, 'npc-travel-edrik');
  if (!edrik) throw new Error('Edrik travel NPC missing from snapshot');
  await moveNear(client, edrik.position, 'Edrik');
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: edrik.id,
  });

  await waitFor(
    () => client.state.snapshot?.zone === 'dungeon' && client.state.quest?.goal === 6,
    'dungeon quest snapshot',
  );

  await fightUntil(
    client,
    (quest) => quest?.accepted && quest.completed && quest.progress >= 6 && sawEventMessage(client.state, DUNGEON_MILESTONE),
    'dungeon quest objective 6/6',
  );

  const riven = npcById(client, 'npc-travel-riven');
  if (!riven) throw new Error('Riven travel NPC missing from snapshot');
  await moveNear(client, riven.position, 'Riven');
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: riven.id,
  });

  await waitFor(() => client.state.snapshot?.zone === 'overworld', 'return to overworld');
  await moveNear(client, lyra.position, 'Lyra after dungeon');
  send(client, {
    type: 'claim-quest-reward',
    entityId: client.state.playerId,
    npcId: lyra.id,
  });

  await waitFor(
    () => client.state.quest?.rewardClaimed && countSeenEvents(client.state, 'quest_completed') >= 1,
    'quest reward claim and completion event',
  );

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      name: client.state.name,
      characterId: client.state.characterId,
      playerId: client.state.playerId,
      snapshots: client.state.snapshots,
      messages: client.state.messages,
    },
    quest: client.state.quest,
    checks: {
      accepted: true,
      overworldMilestone: sawEventMessage(client.state, OVERWORLD_MILESTONE),
      dungeonMilestone: sawEventMessage(client.state, DUNGEON_MILESTONE),
      rewardClaimed: client.state.quest?.rewardClaimed === true,
      questAcceptedEvent: countSeenEvents(client.state, 'quest_accepted') >= 1,
      questCompletedEvent: countSeenEvents(client.state, 'quest_completed') >= 1,
    },
  }, null, 2));
} finally {
  await closeClient(client);
}
