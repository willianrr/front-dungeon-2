const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_SURVIVAL_PROBE_TIMEOUT_MS ?? 75000);
const interactRange = Number(process.env.ARANNA_SURVIVAL_PROBE_INTERACT_RANGE ?? 3.05);
const bulwarkRadius = 8.5;
const bulwarkDuration = 4;
const masteryCap = 1350;
const masteryGain = 5;

const expectedSkillIds = [
  'arcane-nova',
  'war-cry',
  'charge',
  'heavy-strike',
  'steel-sweep',
  'iron-guard',
  'arcane-bolt',
  'bulwark-call',
];
const expectedMasteryIds = ['martial', 'arcana', 'survival'];

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
  const configuredEmail = process.env.ARANNA_SURVIVAL_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_SURVIVAL_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-survival-${stamp}@local.test`;
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
  const requestedId = Number(process.env.ARANNA_SURVIVAL_PROBE_CHARACTER_ID ?? 0);
  let character = requestedId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedId)
    : characters[0];
  if (requestedId > 0 && !character) throw new Error(`Character ${requestedId} was not found in the configured Survival probe account.`);
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_SURVIVAL_PROBE_NAME ?? 'SurvivalProbe' }),
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
      setTimeout(tick, 40);
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

function survivalMastery(state) {
  return state.snapshot?.masteries?.find((mastery) => mastery.id === 'survival') ?? null;
}

function skill(state, id) {
  return localPlayer(state)?.skills?.find((candidate) => candidate.id === id) ?? null;
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
}

function eventKeySet(state) {
  return new Set(state.events.keys());
}

function eventsAfter(state, baseline, predicate) {
  return [...state.events.values()].filter((event) => !baseline.has(event.id) && predicate(event));
}

function mergeSnapshot(state, incoming) {
  if (Array.isArray(incoming.npcs)) state.npcs = incoming.npcs;
  if (Array.isArray(incoming.inventory)) state.inventory = incoming.inventory;
  if (Array.isArray(incoming.masteries)) state.masteries = incoming.masteries;
  return {
    ...incoming,
    npcs: state.npcs,
    inventory: state.inventory,
    masteries: state.masteries,
    combatEvents: Array.isArray(incoming.combatEvents) ? incoming.combatEvents : [],
  };
}

async function connectProbeClient(player) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`);
  const state = {
    playerId: '',
    snapshot: null,
    sequence: 0,
    snapshots: 0,
    npcs: [],
    inventory: [],
    masteries: [],
    events: new Map(),
    statusObservations: [],
    masteryObservations: [],
    lastSurvivalXp: null,
  };

  socket.addEventListener('message', (messageEvent) => {
    let message;
    try {
      message = JSON.parse(String(messageEvent.data));
    } catch {
      return;
    }
    if (message.type === 'welcome') state.playerId = message.playerId ?? state.playerId;
    if (message.type !== 'snapshot' || !message.snapshot) return;

    state.sequence++;
    state.snapshot = mergeSnapshot(state, message.snapshot);
    state.snapshots++;
    for (const event of state.snapshot.combatEvents) {
      if (event?.id) state.events.set(event.id, { ...event, observedSequence: state.sequence });
    }
    for (const entity of state.snapshot.entities ?? []) {
      for (const status of Array.isArray(entity.statuses) ? entity.statuses : []) {
        if (status.id !== 'bulwark-taunt') continue;
        state.statusObservations.push({
          sequence: state.sequence,
          targetId: entity.id,
          targetAlive: entity.alive === true,
          sourceId: status.sourceId,
          sourceSkill: status.sourceSkill,
          duration: status.duration,
          remaining: status.remaining,
        });
      }
    }
    const survival = survivalMastery(state);
    if (survival && state.lastSurvivalXp !== survival.xp) {
      state.masteryObservations.push({ sequence: state.sequence, xp: survival.xp });
      state.lastSurvivalXp = survival.xp;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Survival probe WebSocket connection failed.')), { once: true });
  });
  await waitFor(
    () => state.playerId && state.snapshot && state.npcs.length > 0 && localPlayer(state) && survivalMastery(state),
    'initial Survival snapshot',
  );
  return { socket, state };
}

async function closeClient(client, reason = 'survival probe reconnect') {
  if (!client || client.socket.readyState >= WebSocket.CLOSING) return;
  const closed = new Promise((resolve) => client.socket.addEventListener('close', resolve, { once: true }));
  client.socket.close(1000, reason);
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 2000))]);
}

function validateCatalogAndMasteries(state) {
  const skills = localPlayer(state)?.skills ?? [];
  const skillIds = skills.map((entry) => entry.id);
  if (skillIds.length !== expectedSkillIds.length || expectedSkillIds.some((id, index) => skillIds[index] !== id)) {
    throw new Error(`Skills are not canonically ordered ${JSON.stringify(expectedSkillIds)}: ${JSON.stringify(skillIds)}`);
  }
  const ironGuard = skills.find((entry) => entry.id === 'iron-guard');
  if (ironGuard?.masteryId !== 'survival') throw new Error(`iron-guard.masteryId=${JSON.stringify(ironGuard?.masteryId)}.`);
  const bulwark = skills.find((entry) => entry.id === 'bulwark-call');
  const expectedBulwark = {
    discipline: 'survival',
    targetMode: 'self-area',
    requiresPhysicalWeapon: false,
    stationary: false,
    masteryId: 'survival',
    manaCost: 0,
    cooldown: 12,
    range: 8.5,
  };
  for (const [field, expected] of Object.entries(expectedBulwark)) {
    if (bulwark?.[field] !== expected) throw new Error(`bulwark-call.${field}=${JSON.stringify(bulwark?.[field])}, expected ${JSON.stringify(expected)}.`);
  }

  const masteries = state.snapshot.masteries ?? [];
  const masteryIds = masteries.map((entry) => entry.id);
  if (masteryIds.length !== expectedMasteryIds.length || expectedMasteryIds.some((id, index) => masteryIds[index] !== id)) {
    throw new Error(`Masteries are not canonically ordered ${JSON.stringify(expectedMasteryIds)}: ${JSON.stringify(masteryIds)}`);
  }
  for (const entry of masteries) {
    for (const field of ['level', 'xp', 'xpIntoLevel', 'xpToNext', 'maxLevel', 'damageBonus', 'defenseBonus']) {
      if (typeof entry[field] !== 'number' || !Number.isFinite(entry[field])) throw new Error(`Malformed ${entry.id}.${field}.`);
    }
    if (entry.level < 1 || entry.level > 10 || entry.xp < 0 || entry.xp > masteryCap) throw new Error(`Out-of-bounds mastery ${JSON.stringify(entry)}.`);
  }
  const survival = survivalMastery(state);
  if (survival.damageBonus !== 0 || survival.defenseBonus < 0 || survival.defenseBonus > 0.18) {
    throw new Error(`Malformed Survival bonus contract: ${JSON.stringify(survival)}.`);
  }
}

async function moveNear(client, target, range, label) {
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player?.alive) throw new Error(`Player died while moving near ${label}.`);
    if (distance2d(player.position, target) <= range) return player;
    const now = Date.now();
    if (now - lastMoveAt >= 220) {
      send(client, { type: 'move', entityId: client.state.playerId, target, run: true });
      lastMoveAt = now;
    }
    return null;
  }, `move near ${label}`);
}

async function travelToZone(client, zone) {
  if (client.state.snapshot?.zone === zone) return;
  const currentZone = client.state.snapshot?.zone;
  const travelNpc = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === currentZone),
    `${currentZone} travel NPC`,
  );
  await moveNear(client, travelNpc.position, interactRange, `${travelNpc.name ?? travelNpc.id}`);
  send(client, { type: 'travel-at-npc', entityId: client.state.playerId, npcId: travelNpc.id });
  await waitFor(() => client.state.snapshot?.zone === zone && localPlayer(client.state)?.alive, `${zone} travel`);
}

async function ensureHealthy(client) {
  const player = localPlayer(client.state);
  if (!player || player.hp >= player.maxHp * 0.75) return;
  const potion = client.state.inventory.find((item) => item.kind === 'potion');
  if (!potion || potion.count <= 0) throw new Error('Player is too injured and has no potion for the Survival probe.');
  const before = player.hp;
  send(client, { type: 'use-item', entityId: client.state.playerId, item: 'potion' });
  await waitFor(() => (localPlayer(client.state)?.hp ?? 0) > before, 'health potion recovery');
}

async function castEmptyBulwark(client) {
  await travelToZone(client, 'overworld');
  await waitFor(() => (skill(client.state, 'bulwark-call')?.cooldownRemaining ?? 1) <= 0.05, 'Bulwark Call ready for empty cast');
  const player = localPlayer(client.state);
  const nearbyEnemy = (client.state.snapshot.entities ?? []).find((entity) => (
    entity.kind === 'enemy' && entity.alive && distance2d(player.position, entity.position) <= bulwarkRadius + 0.25
  ));
  if (nearbyEnemy) throw new Error(`Safe overworld cast is not empty; ${nearbyEnemy.id} is ${distance2d(player.position, nearbyEnemy.position).toFixed(2)}m away.`);

  const baselineXp = survivalMastery(client.state).xp;
  const baselineEvents = eventKeySet(client.state);
  const baselineSequence = client.state.sequence;
  send(client, { type: 'cast-skill', entityId: client.state.playerId, skill: 'bulwark-call' });
  const cast = await waitFor(() => eventsAfter(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect' && event.skill === 'bulwark-call' && event.casterId === client.state.playerId
  ))[0], 'one authoritative empty Bulwark cast');
  if (Math.abs(cast.radius - bulwarkRadius) > 0.01 || Math.abs(cast.duration - bulwarkDuration) > 0.01) {
    throw new Error(`Malformed empty cast event: ${JSON.stringify(cast)}.`);
  }
  await waitFor(() => (localPlayer(client.state)?.buffs ?? []).some((buff) => (
    buff.id === 'bulwark-call' && buff.remaining > 0
  )), 'authoritative empty Bulwark buff');
  await waitFor(() => !(localPlayer(client.state)?.buffs ?? []).some((buff) => (
    buff.id === 'bulwark-call' && buff.remaining > 0
  )), 'full empty Bulwark buff expiration', 7000);
  const expiredSequence = client.state.sequence;
  await waitFor(() => client.state.sequence > expiredSequence, 'snapshot after empty Bulwark expiration');
  const castEvents = eventsAfter(client.state, baselineEvents, (event) => event.type === 'skill-effect' && event.skill === 'bulwark-call');
  const blockEvents = eventsAfter(client.state, baselineEvents, (event) => event.type === 'skill-effect' && event.skill === 'bulwark-call-block');
  if (castEvents.length !== 1) throw new Error(`Empty cast emitted ${castEvents.length} cast events instead of exactly one.`);
  if (blockEvents.length !== 0) throw new Error(`Empty cast emitted ${blockEvents.length} block events.`);
  if (survivalMastery(client.state).xp !== baselineXp) throw new Error('Empty Bulwark cast changed Survival XP.');
  const emptyStatuses = client.state.statusObservations.filter((observation) => observation.sequence > baselineSequence && observation.sourceId === client.state.playerId);
  if (emptyStatuses.length !== 0) throw new Error(`Empty cast applied ${emptyStatuses.length} taunt status observations.`);
  return { castEventId: cast.id, baselineXp, finalXp: baselineXp };
}

function livingMeleeEnemies(state) {
  return (state.snapshot?.entities ?? []).filter((entity) => (
    entity.kind === 'enemy' && entity.alive && entity.enemyVariant !== 'zombieShardcaster'
  ));
}

async function approachEnemyForBlock(client) {
  let targetId = '';
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player?.alive) throw new Error('Player died while approaching a Bulwark target.');
    let target = targetId ? livingMeleeEnemies(client.state).find((enemy) => enemy.id === targetId) : null;
    target ??= livingMeleeEnemies(client.state)
      .filter((enemy) => enemy.hp > 8)
      .sort((a, b) => distance2d(player.position, a.position) - distance2d(player.position, b.position) || b.hp - a.hp)[0];
    if (!target) return null;
    targetId = target.id;
    if (distance2d(player.position, target.position) <= 1.75) {
      send(client, { type: 'move', entityId: client.state.playerId, target: player.position, run: false });
      return target;
    }
    const now = Date.now();
    if (now - lastMoveAt >= 180) {
      send(client, { type: 'move', entityId: client.state.playerId, target: target.position, run: true });
      lastMoveAt = now;
    }
    return null;
  }, 'living melee enemy in Bulwark range');
}

async function castBulwarkForMitigatedHit(client) {
  await waitFor(() => (skill(client.state, 'bulwark-call')?.cooldownRemaining ?? 1) <= 0.05, 'Bulwark Call ready for effective cast');
  await ensureHealthy(client);
  const target = await approachEnemyForBlock(client);
  const baselineXp = survivalMastery(client.state).xp;
  if (baselineXp > masteryCap - masteryGain) {
    throw new Error(`Survival XP ${baselineXp} is too close to cap to validate an exact +${masteryGain}; use a fresh probe character.`);
  }
  const baselineEvents = eventKeySet(client.state);
  const castSequence = client.state.sequence;
  send(client, { type: 'cast-skill', entityId: client.state.playerId, skill: 'bulwark-call' });

  const cast = await waitFor(() => eventsAfter(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect' && event.skill === 'bulwark-call' && event.casterId === client.state.playerId
  ))[0], 'effective Bulwark cast event');
  const status = await waitFor(() => client.state.statusObservations.find((observation) => (
    observation.sequence > castSequence
      && observation.targetId === target.id
      && observation.targetAlive
      && observation.sourceId === client.state.playerId
      && observation.sourceSkill === 'bulwark-call'
      && Math.abs(observation.duration - bulwarkDuration) < 0.01
  )), 'correlated authoritative bulwark-taunt status');
  const block = await waitFor(() => eventsAfter(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect' && event.skill === 'bulwark-call-block' && event.casterId === client.state.playerId
  ))[0], 'authoritative mitigated-hit block event', 12000);
  const damage = await waitFor(() => eventsAfter(client.state, baselineEvents, (event) => (
    event.type === 'damage'
      && event.targetId === client.state.playerId
      && event.amount > 0
      && event.observedSequence === block.observedSequence
  ))[0], 'incoming damage correlated to Bulwark block', 3000);
  const expectedXp = baselineXp + masteryGain;
  await waitFor(() => survivalMastery(client.state)?.xp === expectedXp, 'exact +5 Survival XP after mitigated hit');
  const xpObservation = client.state.masteryObservations.find((observation) => observation.xp === expectedXp && observation.sequence > castSequence);
  if (!xpObservation || xpObservation.sequence < block.observedSequence) {
    throw new Error(`Survival XP changed before its authoritative block: ${JSON.stringify({ xpObservation, block })}.`);
  }

  // Fecha assim que o ganho chega. Mais de um inimigo ainda pode acertar no
  // mesmo tick; por isso exigimos >=1 bloqueio e XP total exatamente +5.
  await closeClient(client, 'survival effective hit captured');
  const casts = eventsAfter(client.state, baselineEvents, (event) => event.type === 'skill-effect' && event.skill === 'bulwark-call');
  const blocks = eventsAfter(client.state, baselineEvents, (event) => event.type === 'skill-effect' && event.skill === 'bulwark-call-block');
  if (casts.length !== 1) throw new Error(`Effective attempt emitted ${casts.length} cast events instead of exactly one.`);
  if (blocks.length < 1) throw new Error('Effective attempt emitted no block event before disconnect.');
  if (survivalMastery(client.state).xp !== expectedXp) throw new Error(`Survival XP is not exactly ${baselineXp}+${masteryGain}.`);
  return {
    castEventId: cast.id,
    blockEventId: block.id,
    blockCount: blocks.length,
    damageEventId: damage.id,
    targetId: target.id,
    damage: damage.amount,
    tauntRemaining: status.remaining,
    baselineXp,
    finalXp: expectedXp,
  };
}

let client;
try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  validateCatalogAndMasteries(client.state);

  const emptyCast = await castEmptyBulwark(client);
  await waitFor(() => (skill(client.state, 'bulwark-call')?.cooldownRemaining ?? 1) <= 0.05, 'Bulwark cooldown after empty cast');
  await travelToZone(client, 'dungeon');
  const effectiveHit = await castBulwarkForMitigatedHit(client);
  const persistedSurvivalXp = effectiveHit.finalXp;
  const snapshotsBeforeReconnect = client.state.snapshots;

  // O disconnect exporta masteries; evita disputar o reconnect com o save.
  await new Promise((resolve) => setTimeout(resolve, 350));
  client = await connectProbeClient(player);
  validateCatalogAndMasteries(client.state);
  await waitFor(() => survivalMastery(client.state)?.xp === persistedSurvivalXp, 'Survival mastery persistence after reconnect');

  console.info(JSON.stringify({
    ok: true,
    reusedAccount: player.reusedAccount,
    characterId: player.character.id,
    catalogSkills: expectedSkillIds.length,
    masteryOrder: client.state.snapshot.masteries.map((entry) => entry.id),
    emptyCast,
    effectiveHit,
    persistedSurvivalXp,
    snapshotsBeforeReconnect,
    snapshotsAfterReconnect: client.state.snapshots,
  }, null, 2));
} finally {
  await closeClient(client, 'survival probe complete');
}
