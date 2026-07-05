const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_COMBAT_PROBE_TIMEOUT_MS ?? 18000);
const meleeRange = Number(process.env.ARANNA_COMBAT_PROBE_MELEE_RANGE ?? 2.35);

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
    body: JSON.stringify({ email: `codex-combat-${stamp}@local.test`, password: 'codex123456' }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: 'CombatProbe' }),
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
    sawWarCryBuff: false,
    sawWarCryCooldown: false,
    sawChargeCooldown: false,
    sawChargeEffect: false,
    sawChargeDamage: false,
    chargeDamageAmount: 0,
    chargeTargetId: '',
    sawHeavyStrikeCooldown: false,
    sawHeavyStrikeDamage: false,
    heavyStrikeDamageAmount: 0,
    heavyStrikeTargetId: '',
    // IDs de combat events ja vistos ANTES de cada cast: sem isso, dano de
    // auto-attack anterior (ainda dentro do TTL) no mesmo alvo marcava
    // chargeDamage/heavyStrikeDamage como falso-positivo.
    seenEventIds: new Set(),
    chargeBaselineIds: null,
    heavyStrikeBaselineIds: null,
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
      const playerState = localPlayer(state);
      if (playerState?.buffs?.some((buff) => buff.id === 'war-cry')) state.sawWarCryBuff = true;
      if (playerState?.skills?.some((skill) => skill.id === 'war-cry' && skill.cooldownRemaining > 0)) state.sawWarCryCooldown = true;
      if (playerState?.skills?.some((skill) => skill.id === 'charge' && skill.cooldownRemaining > 0)) state.sawChargeCooldown = true;
      if (playerState?.skills?.some((skill) => skill.id === 'heavy-strike' && skill.cooldownRemaining > 0)) state.sawHeavyStrikeCooldown = true;
      if (message.snapshot.combatEvents?.some((event) => event.type === 'skill-effect' && event.skill === 'charge')) {
        state.sawChargeEffect = true;
      }
      const chargeDamage = message.snapshot.combatEvents?.find((event) => (
        event.type === 'damage'
        && event.targetId === state.chargeTargetId
        && event.amount > 0
        && state.chargeBaselineIds
        && !state.chargeBaselineIds.has(event.id)
      ));
      if (chargeDamage) {
        state.sawChargeDamage = true;
        state.chargeDamageAmount = chargeDamage.amount;
      }
      const damage = message.snapshot.combatEvents?.find((event) => (
        event.type === 'damage'
        && event.targetId === state.heavyStrikeTargetId
        && event.amount > 0
        && state.heavyStrikeBaselineIds
        && !state.heavyStrikeBaselineIds.has(event.id)
      ));
      if (damage) {
        state.sawHeavyStrikeDamage = true;
        state.heavyStrikeDamageAmount = damage.amount;
      }
      for (const event of message.snapshot.combatEvents ?? []) {
        state.seenEventIds.add(event.id);
      }
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && localPlayer(state), 'initial combat snapshot');
  return { socket, state };
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

let client;

try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);

  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'war-cry',
  });

  await waitFor(
    () => client.state.sawWarCryBuff && client.state.sawWarCryCooldown,
    'war cry buff and cooldown',
  );

  await waitFor(() => nearestEnemy(client.state), 'nearby enemy in snapshot');
  let target = nearestEnemy(client.state);
  send(client, {
    type: 'move',
    entityId: client.state.playerId,
    target: target.enemy.position,
    run: true,
  });

  target = await waitFor(() => {
    const candidate = nearestEnemy(client.state);
    const playerState = localPlayer(client.state);
    if (!candidate || !playerState) return null;
    if (candidate.distance > meleeRange) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: candidate.enemy.position,
        run: true,
      });
      return null;
    }
    return candidate.enemy;
  }, 'player close enough to an enemy for charge');

  client.state.chargeTargetId = target.id;
  client.state.chargeBaselineIds = new Set(client.state.seenEventIds);
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'charge',
    targetId: target.id,
  });

  await waitFor(
    () => client.state.sawChargeCooldown && client.state.sawChargeEffect && client.state.sawChargeDamage,
    'charge cooldown, effect and damage event',
  );

  target = await waitFor(() => {
    const previous = client.state.snapshot?.entities?.find((entity) => entity.id === client.state.chargeTargetId && entity.alive);
    const candidate = previous
      ? {
          enemy: previous,
          distance: distance2d(localPlayer(client.state)?.position, previous.position),
        }
      : nearestEnemy(client.state);
    const playerState = localPlayer(client.state);
    if (!candidate || !playerState) return null;
    if (candidate.distance > meleeRange) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: candidate.enemy.position,
        run: true,
      });
      return null;
    }
    return candidate.enemy;
  }, 'player close enough to an enemy for heavy strike');

  client.state.heavyStrikeTargetId = target.id;
  client.state.heavyStrikeBaselineIds = new Set(client.state.seenEventIds);
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'heavy-strike',
    targetId: target.id,
  });

  await waitFor(
    () => client.state.sawHeavyStrikeCooldown && client.state.sawHeavyStrikeDamage,
    'heavy strike cooldown and damage event',
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
    target: {
      id: target.id,
      damage: client.state.heavyStrikeDamageAmount,
    },
      checks: {
        warCryBuff: client.state.sawWarCryBuff,
        warCryCooldown: client.state.sawWarCryCooldown,
        chargeCooldown: client.state.sawChargeCooldown,
        chargeEffect: client.state.sawChargeEffect,
        chargeDamage: client.state.sawChargeDamage,
        heavyStrikeCooldown: client.state.sawHeavyStrikeCooldown,
        heavyStrikeDamage: client.state.sawHeavyStrikeDamage,
      },
  }, null, 2));
} finally {
  client?.socket.close();
}
