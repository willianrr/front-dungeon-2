const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_MASTERY_PROBE_TIMEOUT_MS ?? 45000);
const meleeRange = Number(process.env.ARANNA_MASTERY_PROBE_MELEE_RANGE ?? 2.2);
// Estritamente dentro do alcance efetivo do Golpe Pesado (~2,0 em zumbi comum):
// evita que a duplicata seja apenas enfileirada por estar entre 2,0 e 2,2.
const cooldownValidationRange = Math.min(meleeRange, 1.85);
const interactRange = Number(process.env.ARANNA_MASTERY_PROBE_INTERACT_RANGE ?? 3.05);

const expectedSkillMetadata = new Map([
  ['arcane-nova', { discipline: 'arcana', targetMode: 'self-area', requiresPhysicalWeapon: false, stationary: true, masteryId: 'arcana' }],
  ['war-cry', { discipline: 'martial', targetMode: 'self', requiresPhysicalWeapon: false, stationary: false, masteryId: '' }],
  ['charge', { discipline: 'martial', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: false, masteryId: 'martial' }],
  ['heavy-strike', { discipline: 'martial', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: true, masteryId: 'martial' }],
  ['steel-sweep', { discipline: 'martial', targetMode: 'self-area', requiresPhysicalWeapon: true, stationary: true, masteryId: 'martial' }],
  ['iron-guard', { discipline: 'survival', targetMode: 'self', requiresPhysicalWeapon: false, stationary: true, masteryId: 'survival' }],
  ['arcane-bolt', { discipline: 'arcana', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: true, masteryId: 'arcana', manaCost: 18, cooldown: 2.8, range: 12 }],
  ['bulwark-call', { discipline: 'survival', targetMode: 'self-area', requiresPhysicalWeapon: false, stationary: false, masteryId: 'survival', manaCost: 0, cooldown: 12, range: 8.5 }],
]);

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
  if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body.data;
}

async function createProbePlayer() {
  const configuredEmail = process.env.ARANNA_MASTERY_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_MASTERY_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-mastery-${stamp}@local.test`;
  const auth = configuredEmail
    ? await request('/accounts/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    : await request('/accounts/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  const characters = await request('/characters', { token: auth.token });
  const requestedCharacterId = Number(process.env.ARANNA_MASTERY_PROBE_CHARACTER_ID ?? 0);
  let character = requestedCharacterId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedCharacterId)
    : characters[0];
  if (requestedCharacterId > 0 && !character) {
    throw new Error(`Character ${requestedCharacterId} was not found in the configured mastery probe account.`);
  }
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_MASTERY_PROBE_NAME ?? 'MasteryProbe' }),
  });
  return { auth, character, reusedAccount: Boolean(configuredEmail) };
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

function distance2d(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}

function localPlayer(state) {
  return state.snapshot?.entities?.find((entity) => entity.id === state.playerId) ?? null;
}

function martialMastery(state) {
  return state.snapshot?.masteries?.find((mastery) => mastery.id === 'martial') ?? null;
}

function skill(state, id) {
  return localPlayer(state)?.skills?.find((candidate) => candidate.id === id) ?? null;
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

function skillMetadataMismatch(state) {
  const skills = localPlayer(state)?.skills ?? [];
  if (skills.length !== expectedSkillMetadata.size) return `expected ${expectedSkillMetadata.size} skills, received ${skills.length}`;
  for (const [id, expected] of expectedSkillMetadata) {
    const candidate = skills.find((entry) => entry.id === id);
    if (!candidate) return `missing skill ${id}`;
    for (const [field, value] of Object.entries(expected)) {
      if ((candidate[field] ?? '') !== value) return `${id}.${field}=${JSON.stringify(candidate[field])}, expected ${JSON.stringify(value)}`;
    }
  }
  return '';
}

async function connectProbeClient(player) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`);
  const state = {
    playerId: '',
    snapshot: null,
    snapshots: 0,
    messages: 0,
    npcs: [],
  };

  socket.addEventListener('message', (event) => {
    state.messages++;
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message.type === 'welcome') state.playerId = message.playerId ?? state.playerId;
    if (message.type !== 'snapshot' || !message.snapshot) return;
    state.snapshot = message.snapshot;
    state.snapshots++;
    if (Array.isArray(message.snapshot.npcs)) state.npcs = message.snapshot.npcs;
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Mastery probe WebSocket connection failed.')), { once: true });
  });
  await waitFor(
    () => state.playerId && state.snapshot && state.npcs.length > 0 && localPlayer(state) && martialMastery(state),
    'initial mastery snapshot',
  );
  return { socket, state };
}

async function closeClient(client) {
  if (!client || client.socket.readyState >= WebSocket.CLOSING) return;
  const closed = new Promise((resolve) => client.socket.addEventListener('close', resolve, { once: true }));
  client.socket.close(1000, 'mastery probe reconnect');
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 2000))]);
}

async function moveNear(client, target, range, label) {
  let lastMoveAt = 0;
  await waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    if (distance2d(player.position, target) <= range) return true;
    const now = Date.now();
    if (now - lastMoveAt >= 250) {
      send(client, { type: 'move', entityId: client.state.playerId, target, run: true });
      lastMoveAt = now;
    }
    return null;
  }, `move near ${label}`);
}

async function enterDungeon(client) {
  if (client.state.snapshot?.zone === 'dungeon') return;
  const travelNpc = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === 'overworld'),
    'overworld travel NPC for mastery probe',
  );
  await moveNear(client, travelNpc.position, interactRange, `travel NPC ${travelNpc.id}`);
  send(client, { type: 'travel-at-npc', entityId: client.state.playerId, npcId: travelNpc.id });
  await waitFor(() => client.state.snapshot?.zone === 'dungeon', 'dungeon snapshot for mastery probe');
}

function healthyEnemy(state) {
  const player = localPlayer(state);
  if (!player) return null;
  const candidates = (state.snapshot?.entities ?? [])
    .filter((entity) => entity.kind === 'enemy' && entity.alive)
    .map((enemy) => ({ enemy, distance: distance2d(player.position, enemy.position) }));
  const commonZombies = candidates.filter(({ enemy }) => enemy.enemyVariant === 'zombie');
  const nonRanged = candidates.filter(({ enemy }) => enemy.enemyVariant !== 'zombieShardcaster');
  return (commonZombies.length > 0 ? commonZombies : nonRanged.length > 0 ? nonRanged : candidates)
    .sort((a, b) => b.enemy.hp - a.enemy.hp || a.distance - b.distance || a.enemy.id.localeCompare(b.enemy.id))[0] ?? null;
}

async function approachEnemy(client) {
  let targetId = '';
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    const locked = targetId
      ? (client.state.snapshot?.entities ?? []).find((entity) => entity.id === targetId && entity.alive)
      : null;
    const enemy = locked ?? healthyEnemy(client.state)?.enemy;
    if (!enemy) return null;
    targetId = enemy.id;
    if (distance2d(player.position, enemy.position) <= meleeRange) {
      send(client, { type: 'move', entityId: client.state.playerId, target: player.position, run: false });
      return enemy;
    }
    const now = Date.now();
    if (now - lastMoveAt >= 250) {
      send(client, { type: 'move', entityId: client.state.playerId, target: enemy.position, run: true });
      lastMoveAt = now;
    }
    return null;
  }, 'healthy dungeon enemy in Heavy Strike range');
}

async function duplicateTargetWhileOnCooldown(client, preferredTargetId) {
  let targetId = preferredTargetId;
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    const heavy = skill(client.state, 'heavy-strike');
    if (!player?.alive) return null;
    if ((heavy?.cooldownRemaining ?? 0) <= 0.05) {
      throw new Error('Heavy Strike cooldown expired before a live in-range duplicate target was available.');
    }
    const preferred = targetId
      ? (client.state.snapshot?.entities ?? []).find((entity) => entity.id === targetId && entity.kind === 'enemy' && entity.alive)
      : null;
    const enemy = preferred ?? healthyEnemy(client.state)?.enemy;
    if (!enemy) return null;
    targetId = enemy.id;
    if (distance2d(player.position, enemy.position) <= cooldownValidationRange) return enemy;
    const now = Date.now();
    if (now - lastMoveAt >= 180) {
      send(client, { type: 'move', entityId: client.state.playerId, target: enemy.position, run: true });
      lastMoveAt = now;
    }
    return null;
  }, 'live enemy inside Heavy Strike range while cooldown remains active');
}

let client;
try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  const mismatch = skillMetadataMismatch(client.state);
  if (mismatch) throw new Error(`Skill catalog mismatch: ${mismatch}`);
  const initialMastery = martialMastery(client.state);
  const masteryCapped = initialMastery.level >= initialMastery.maxLevel || initialMastery.xp >= 1350;

  await enterDungeon(client);
  await waitFor(() => (skill(client.state, 'heavy-strike')?.cooldownRemaining ?? 1) <= 0.05, 'Heavy Strike ready');
  const target = await approachEnemy(client);
  const baselineXp = martialMastery(client.state).xp;
  const castBaselineSnapshots = client.state.snapshots;
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'heavy-strike',
    targetId: target.id,
  });

  await waitFor(() => {
    const mastery = martialMastery(client.state);
    const heavy = skill(client.state, 'heavy-strike');
    const expectedXp = masteryCapped ? baselineXp : baselineXp + 5;
    return mastery?.xp === expectedXp && (heavy?.cooldownRemaining ?? 0) > 0.05;
  }, masteryCapped
    ? 'effective Heavy Strike at mastery cap without overflow XP'
    : 'effective Heavy Strike granting exactly +5 Martial Mastery XP');

  const gainedXp = martialMastery(client.state).xp;
  const snapshotsToApply = client.state.snapshots - castBaselineSnapshots;
  const duplicateTarget = await duplicateTargetWhileOnCooldown(client, target.id);
  const cooldownBeforeDuplicate = skill(client.state, 'heavy-strike').cooldownRemaining;
  const snapshotsBeforeDuplicate = client.state.snapshots;
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'heavy-strike',
    targetId: duplicateTarget.id,
  });
  await waitFor(() => client.state.snapshots >= snapshotsBeforeDuplicate + 5, 'snapshots after duplicate cooldown cast');
  const cooldownAfterDuplicate = skill(client.state, 'heavy-strike').cooldownRemaining;
  if (martialMastery(client.state).xp !== gainedXp) {
    throw new Error(`Cooldown duplicate changed mastery XP from ${gainedXp} to ${martialMastery(client.state).xp}.`);
  }
  if (cooldownAfterDuplicate > cooldownBeforeDuplicate + 0.05) {
    throw new Error(`Cooldown duplicate reset Heavy Strike from ${cooldownBeforeDuplicate} to ${cooldownAfterDuplicate}.`);
  }

  await closeClient(client);
  client = undefined;
  await new Promise((resolve) => setTimeout(resolve, 250));
  const reconnected = await connectProbeClient(player);
  client = reconnected;
  await waitFor(() => martialMastery(client.state)?.xp === gainedXp, 'persisted Martial Mastery XP after reconnect');
  const reconnectMismatch = skillMetadataMismatch(client.state);
  if (reconnectMismatch) throw new Error(`Reconnected skill catalog mismatch: ${reconnectMismatch}`);

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      name: player.character.name,
      characterId: player.character.id,
      playerId: client.state.playerId,
      reusedAccount: player.reusedAccount,
    },
    catalog: [...expectedSkillMetadata.keys()],
    cast: {
      skill: 'heavy-strike',
      targetId: target.id,
      duplicateTargetId: duplicateTarget.id,
      masteryCapped,
      baselineXp,
      gainedXp,
      xpGain: gainedXp - baselineXp,
      cooldownBeforeDuplicate,
      cooldownAfterDuplicate,
      snapshotsToApply,
    },
    reconnect: { persistedXp: martialMastery(client.state).xp },
  }, null, 2));
} finally {
  await closeClient(client);
}
