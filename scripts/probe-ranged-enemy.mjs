const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_RANGED_PROBE_TIMEOUT_MS ?? 45000);
const engageRange = Number(process.env.ARANNA_RANGED_PROBE_ENGAGE_RANGE ?? 9);
const interactRange = Number(process.env.ARANNA_RANGED_PROBE_INTERACT_RANGE ?? 3.05);

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
  const configuredEmail = process.env.ARANNA_RANGED_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_RANGED_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-ranged-${stamp}@local.test`;
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
  const requestedCharacterId = Number(process.env.ARANNA_RANGED_PROBE_CHARACTER_ID ?? 0);
  let character = requestedCharacterId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedCharacterId)
    : characters[0];
  if (requestedCharacterId > 0 && !character) {
    throw new Error(`Character ${requestedCharacterId} was not found in the configured ranged probe account.`);
  }
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_RANGED_PROBE_NAME ?? 'RangedProbe' }),
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

function nearestShardcaster(state) {
  const player = localPlayer(state);
  if (!player) return null;
  return (state.snapshot?.entities ?? [])
    .filter((entity) => entity.kind === 'enemy' && entity.alive && entity.enemyVariant === 'zombieShardcaster')
    .map((enemy) => ({ enemy, distance: distance2d(player.position, enemy.position) }))
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

async function connectProbeClient(player) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`);
  const state = {
    playerId: '',
    snapshot: null,
    snapshots: 0,
    messages: 0,
    npcs: [],
    sawVariant: false,
    sawWarning: false,
    sawImpact: false,
    warningCasterIds: new Set(),
    activeProjectileIds: new Set(),
    projectileCasterIds: new Map(),
    projectilePositions: new Map(),
    removedProjectileIds: new Set(),
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
    if (message.snapshot.entities?.some((entity) => entity.enemyVariant === 'zombieShardcaster')) {
      state.sawVariant = true;
    }
    for (const combatEvent of message.snapshot.combatEvents ?? []) {
      if (combatEvent.type === 'enemy-projectile-warning' && combatEvent.targetId === state.playerId) {
        state.sawWarning = true;
        if (combatEvent.casterId) state.warningCasterIds.add(combatEvent.casterId);
      }
      if (combatEvent.type === 'enemy-projectile-impact') state.sawImpact = true;
    }

    const currentIds = new Set();
    for (const projectile of message.snapshot.projectiles ?? []) {
      if (projectile.kind !== 'corruptedShard' || !projectile.id) continue;
      currentIds.add(projectile.id);
      state.projectileCasterIds.set(projectile.id, projectile.casterId);
      const samples = state.projectilePositions.get(projectile.id) ?? [];
      const signature = [projectile.position?.x, projectile.position?.y, projectile.position?.z]
        .map((value) => Number(value ?? 0).toFixed(3))
        .join(':');
      if (samples.at(-1)?.signature !== signature) {
        samples.push({ signature, position: projectile.position });
        state.projectilePositions.set(projectile.id, samples);
      }
    }
    for (const id of state.activeProjectileIds) {
      if (currentIds.has(id)) continue;
      if ((state.projectilePositions.get(id)?.length ?? 0) >= 2) state.removedProjectileIds.add(id);
    }
    state.activeProjectileIds = currentIds;
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Ranged probe WebSocket connection failed.')), { once: true });
  });
  await waitFor(
    () => state.playerId && state.snapshot && state.npcs.length > 0 && localPlayer(state),
    'initial ranged enemy snapshot',
  );
  return { socket, state };
}

async function moveNear(client, target, label) {
  let lastMoveAt = 0;
  await waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    if (distance2d(player.position, target) <= interactRange) return true;
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
    'overworld travel NPC for ranged probe',
  );
  await moveNear(client, travelNpc.position, `travel NPC ${travelNpc.id}`);
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: travelNpc.id,
  });
  await waitFor(() => client.state.snapshot?.zone === 'dungeon', 'dungeon snapshot for ranged probe');
}

async function approachShardcaster(client) {
  let lastMoveAt = 0;
  let stopped = false;
  return waitFor(() => {
    const candidate = nearestShardcaster(client.state);
    const player = localPlayer(client.state);
    if (!candidate || !player) return null;
    if (candidate.distance <= engageRange) {
      if (!stopped) {
        send(client, {
          type: 'move',
          entityId: client.state.playerId,
          target: player.position,
          run: false,
        });
        stopped = true;
      }
      return candidate.enemy;
    }
    const dx = player.position.x - candidate.enemy.position.x;
    const dz = player.position.z - candidate.enemy.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const desired = Math.max(5.5, engageRange - 1);
    const target = {
      x: candidate.enemy.position.x + (dx / length) * desired,
      y: candidate.enemy.position.y,
      z: candidate.enemy.position.z + (dz / length) * desired,
    };
    const now = Date.now();
    if (now - lastMoveAt >= 250) {
      send(client, { type: 'move', entityId: client.state.playerId, target, run: true });
      lastMoveAt = now;
    }
    return null;
  }, 'a live zombieShardcaster within ranged engagement distance');
}

let client;
try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  await enterDungeon(client);
  const shardcaster = await approachShardcaster(client);
  const removedId = await waitFor(() => {
    if (!client.state.sawVariant || !client.state.sawWarning) return null;
    return [...client.state.removedProjectileIds]
      .find((id) => client.state.warningCasterIds.has(client.state.projectileCasterIds.get(id)))
      ?? null;
  }, 'shardcaster warning and a projectile with two positions followed by authoritative removal');
  const samples = client.state.projectilePositions.get(removedId) ?? [];

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      name: player.character.name,
      characterId: player.character.id,
      playerId: client.state.playerId,
      account: player.reusedAccount ? 'configured' : 'ephemeral',
      snapshots: client.state.snapshots,
      messages: client.state.messages,
    },
    shardcaster: { id: shardcaster.id, variant: shardcaster.enemyVariant },
    checks: {
      variant: client.state.sawVariant,
      warning: client.state.sawWarning,
      warningCasterId: client.state.projectileCasterIds.get(removedId),
      impactObserved: client.state.sawImpact,
      projectileId: removedId,
      distinctPositions: samples.length,
      removedBySnapshot: client.state.removedProjectileIds.has(removedId),
    },
  }, null, 2));
} finally {
  client?.socket.close();
}
