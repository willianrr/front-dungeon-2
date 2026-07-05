const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_LOOT_PROBE_TIMEOUT_MS ?? 22000);
const interactRange = Number(process.env.ARANNA_LOOT_PROBE_INTERACT_RANGE ?? 3.1);

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
    body: JSON.stringify({ email: `codex-loot-${stamp}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: 'LootProbe' }),
  });
  return { auth, character };
}

function distance2d(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
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

async function connectProbeClient(player) {
  const url = `${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`;
  const socket = new WebSocket(url);
  const state = {
    characterId: player.character.id,
    name: player.character.name,
    playerId: '',
    seed: 0,
    snapshot: null,
    snapshots: 0,
    messages: 0,
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
      state.snapshot = message.snapshot;
      state.snapshots++;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && localPlayer(state), 'initial loot snapshot');
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

async function moveNear(client, target, label) {
  await waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    const distance = distance2d(player.position, target);
    if (distance <= interactRange) return true;
    send(client, {
      type: 'move',
      entityId: client.state.playerId,
      target,
      run: true,
    });
    return null;
  }, `move near ${label}`);
}

let client;

try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);

  const travelNpc = await waitFor(
    () => client.state.snapshot?.npcs?.find((npc) => npc.kind === 'travel' && npc.zone === 'overworld'),
    'overworld travel NPC',
  );
  await moveNear(client, travelNpc.position, `travel NPC ${travelNpc.id}`);
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: travelNpc.id,
  });

  await waitFor(() => client.state.snapshot?.zone === 'dungeon' && localPlayer(client.state)?.position, 'dungeon snapshot');
  const openedChestIds = [];
  const beforeLootIds = new Set(client.state.snapshot?.loot?.map((loot) => loot.id) ?? []);

  for (let attempts = 0; attempts < 3; attempts++) {
    const chest = client.state.snapshot?.chests?.find((candidate) => !candidate.opened && !openedChestIds.includes(candidate.id));
    if (!chest) break;
    await moveNear(client, chest.position, `chest ${chest.id}`);
    send(client, {
      type: 'open-chest',
      entityId: client.state.playerId,
      chestId: chest.id,
    });
    openedChestIds.push(chest.id);
    await waitFor(
      () => client.state.snapshot?.chests?.find((candidate) => candidate.id === chest.id)?.opened === true,
      `chest ${chest.id} opened`,
    );
  }

  const loot = await waitFor(() => {
    const current = client.state.snapshot?.loot ?? [];
    const fresh = current.filter((item) => !beforeLootIds.has(item.id));
    const sword = fresh.find((item) => item.kind === 'sword' && item.rarity && item.damageMin > 0 && item.damageMax >= item.damageMin);
    const gem = fresh.find((item) => item.glowGem === 'bless' || item.glowGem === 'soul');
    if (sword && gem) return { fresh, sword, gem };
    return null;
  }, 'chest loot with sword rarity and gem glow');

  const highlighted = loot.fresh.filter((item) => (
    item.element === 'fire'
    || item.glowGem
    || (item.rarity && item.rarity !== 'comum')
  ));

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
    openedChestIds,
    loot: {
      freshCount: loot.fresh.length,
      highlightedCount: highlighted.length,
      sword: {
        id: loot.sword.id,
        rarity: loot.sword.rarity,
        damageMin: loot.sword.damageMin,
        damageMax: loot.sword.damageMax,
        element: loot.sword.element ?? '',
      },
      gem: {
        id: loot.gem.id,
        kind: loot.gem.kind,
        glowGem: loot.gem.glowGem,
      },
    },
    checks: {
      dungeonEntered: true,
      chestOpened: openedChestIds.length > 0,
      swordHasRarity: Boolean(loot.sword.rarity),
      gemHasGlow: Boolean(loot.gem.glowGem),
      highlightedLootData: highlighted.length > 0,
    },
  }, null, 2));
} finally {
  client?.socket.close();
}
