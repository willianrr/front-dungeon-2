const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_ARCANA_PROBE_TIMEOUT_MS ?? 60000);
const interactRange = Number(process.env.ARANNA_ARCANA_PROBE_INTERACT_RANGE ?? 3.05);
const novaApproachRange = Number(process.env.ARANNA_ARCANA_PROBE_NOVA_RANGE ?? 3.8);
const boltMinRange = 5;
const boltMaxRange = 8;
const boltDesiredRange = 6.4;
const masteryCap = 1350;
const masteryGain = 5;

const expectedSkills = new Map([
  ['arcane-nova', { discipline: 'arcana', targetMode: 'self-area', stationary: true, masteryId: 'arcana' }],
  ['war-cry', { discipline: 'martial', targetMode: 'self', stationary: false, masteryId: '' }],
  ['charge', { discipline: 'martial', targetMode: 'enemy', stationary: false, masteryId: 'martial' }],
  ['heavy-strike', { discipline: 'martial', targetMode: 'enemy', stationary: true, masteryId: 'martial' }],
  ['steel-sweep', { discipline: 'martial', targetMode: 'self-area', stationary: true, masteryId: 'martial' }],
  ['iron-guard', { discipline: 'survival', targetMode: 'self', stationary: true, masteryId: 'survival' }],
  ['arcane-bolt', {
    discipline: 'arcana', targetMode: 'enemy', stationary: true, masteryId: 'arcana',
    manaCost: 18, cooldown: 2.8, range: 12,
  }],
  ['bulwark-call', {
    discipline: 'survival', targetMode: 'self-area', stationary: false, masteryId: 'survival',
    manaCost: 0, cooldown: 12, range: 8.5,
  }],
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
  const configuredEmail = process.env.ARANNA_ARCANA_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_ARCANA_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-arcana-${stamp}@local.test`;
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
  const requestedId = Number(process.env.ARANNA_ARCANA_PROBE_CHARACTER_ID ?? 0);
  let character = requestedId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedId)
    : characters[0];
  if (requestedId > 0 && !character) throw new Error(`Character ${requestedId} was not found in the configured Arcana probe account.`);
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_ARCANA_PROBE_NAME ?? 'ArcanaProbe' }),
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

function mastery(state, id = 'arcana') {
  return state.snapshot?.masteries?.find((candidate) => candidate.id === id) ?? null;
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

function newEvent(state, baseline, predicate) {
  return [...state.events.values()].find((event) => !baseline.has(event.id) && predicate(event)) ?? null;
}

function roundedPosition(position) {
  return [position.x, position.y, position.z].map((value) => Number(value).toFixed(3)).join(':');
}

function mergeSnapshot(state, incoming) {
  if (Array.isArray(incoming.npcs)) state.npcs = incoming.npcs;
  if (Array.isArray(incoming.inventory)) state.inventory = incoming.inventory;
  return {
    ...incoming,
    npcs: state.npcs,
    inventory: state.inventory,
    projectiles: Array.isArray(incoming.projectiles) ? incoming.projectiles : [],
    combatEvents: Array.isArray(incoming.combatEvents) ? incoming.combatEvents : [],
    masteries: Array.isArray(incoming.masteries) ? incoming.masteries : [],
  };
}

async function connectProbeClient(player) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(player.auth.token)}&characterId=${player.character.id}`);
  const state = {
    playerId: '',
    snapshot: null,
    snapshots: 0,
    sequence: 0,
    npcs: [],
    inventory: [],
    events: new Map(),
    projectileTracks: new Map(),
    statusObservations: [],
    boltAttempt: null,
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
      if (event?.id) state.events.set(event.id, event);
    }
    for (const projectile of state.snapshot.projectiles) {
      if (!projectile?.id) continue;
      let track = state.projectileTracks.get(projectile.id);
      if (!track) {
        track = {
          id: projectile.id,
          kind: projectile.kind,
          casterId: projectile.casterId,
          firstSequence: state.sequence,
          lastSequence: state.sequence,
          positions: [],
        };
        state.projectileTracks.set(projectile.id, track);
      }
      track.lastSequence = state.sequence;
      const key = roundedPosition(projectile.position);
      if (!track.positions.some((entry) => entry.key === key)) {
        track.positions.push({ key, position: projectile.position, sequence: state.sequence });
      }
    }
    for (const entity of state.snapshot.entities ?? []) {
      for (const status of Array.isArray(entity.statuses) ? entity.statuses : []) {
        if (status.id !== 'arcane-slow' && status.id !== 'arcane-resonance') continue;
        state.statusObservations.push({
          sequence: state.sequence,
          id: status.id,
          targetId: entity.id,
          targetAlive: entity.alive === true,
          sourceId: status.sourceId,
          sourceSkill: status.sourceSkill,
          duration: status.duration,
          remaining: status.remaining,
        });
      }
    }

    const attempt = state.boltAttempt;
    if (attempt) {
      const arcana = mastery(state);
      const relevantEvents = state.snapshot.combatEvents.filter((event) => !attempt.baselineEvents.has(event.id) && event.casterId === state.playerId);
      const impact = relevantEvents.find((event) => event.type === 'skill-effect' && event.skill === 'arcane-bolt-impact');
      const damage = relevantEvents.find((event) => event.type === 'damage' && event.sourceSkill === 'arcane-bolt');
      const launch = relevantEvents.find((event) => event.type === 'skill-effect' && event.skill === 'arcane-bolt');
      if (launch && attempt.launchSequence === null) attempt.launchSequence = state.sequence;
      if (impact && attempt.impactSequence === null) attempt.impactSequence = state.sequence;
      if (damage && attempt.damageSequence === null) attempt.damageSequence = state.sequence;
      if ((arcana?.xp ?? attempt.baselineXp) !== attempt.baselineXp && attempt.xpChangeSequence === null) {
        attempt.xpChangeSequence = state.sequence;
      }
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Arcana probe WebSocket connection failed.')), { once: true });
  });
  await waitFor(
    () => state.playerId && state.snapshot && state.npcs.length > 0 && localPlayer(state) && mastery(state),
    'initial Arcana snapshot',
  );
  return { socket, state };
}

async function closeClient(client, reason = 'arcana probe reconnect') {
  if (!client || client.socket.readyState >= WebSocket.CLOSING) return;
  const closed = new Promise((resolve) => client.socket.addEventListener('close', resolve, { once: true }));
  client.socket.close(1000, reason);
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 2000))]);
}

function validateCatalogAndMasteries(state) {
  const skills = localPlayer(state)?.skills ?? [];
  if (skills.length !== expectedSkills.size) throw new Error(`Expected ${expectedSkills.size} skills, received ${skills.length}.`);
  for (const [id, expected] of expectedSkills) {
    const candidate = skills.find((entry) => entry.id === id);
    if (!candidate) throw new Error(`Missing skill ${id}.`);
    for (const [field, value] of Object.entries(expected)) {
      if ((candidate[field] ?? '') !== value) {
        throw new Error(`${id}.${field}=${JSON.stringify(candidate[field])}, expected ${JSON.stringify(value)}.`);
      }
    }
  }
  const masteries = state.snapshot.masteries ?? [];
  if (masteries.length !== 3 || masteries[0]?.id !== 'martial' || masteries[1]?.id !== 'arcana' || masteries[2]?.id !== 'survival') {
    throw new Error(`Masteries are not canonically ordered [martial, arcana, survival]: ${JSON.stringify(masteries.map((entry) => entry.id))}`);
  }
  for (const entry of masteries) {
    for (const field of ['level', 'xp', 'xpIntoLevel', 'xpToNext', 'maxLevel', 'damageBonus']) {
      if (typeof entry[field] !== 'number' || !Number.isFinite(entry[field])) throw new Error(`Malformed ${entry.id}.${field}.`);
    }
    if (entry.level < 1 || entry.level > 10 || entry.xp < 0 || entry.xp > masteryCap) {
      throw new Error(`Out-of-bounds mastery ${JSON.stringify(entry)}.`);
    }
    if (entry.id === 'survival' && (typeof entry.defenseBonus !== 'number' || !Number.isFinite(entry.defenseBonus))) {
      throw new Error('Malformed survival.defenseBonus.');
    }
  }
  const arcanaLevel = masteries.find((entry) => entry.id === 'arcana')?.level ?? 1;
  const resonanceContracts = {
    'arcane-bolt': {
      label: 'Ressonância Arcana',
      description: 'Maestria Arcana 5: impacto efetivo aplica uma Marca de Ressonância por 4,5 s.',
    },
    'arcane-nova': {
      label: 'Ruptura Arcana',
      description: 'Consome sua Marca: +30% no alvo, pulso de 45% em até 3 adjacentes e +6 de mana.',
    },
  };
  for (const [id, contract] of Object.entries(resonanceContracts)) {
    const modifiers = skills.find((entry) => entry.id === id)?.modifiers ?? [];
    const matches = modifiers.filter((modifier) => modifier.id === 'arcane_resonance');
    if (arcanaLevel >= 5) {
      if (matches.length !== 1 || matches[0].label !== contract.label || matches[0].description !== contract.description) {
        throw new Error(`Malformed unlocked Arcane Resonance modifier for ${id}: ${JSON.stringify(matches)}.`);
      }
    } else if (matches.length !== 0) {
      throw new Error(`Arcane Resonance leaked below mastery 5 on ${id}.`);
    }
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

async function enterDungeonViaEdrik(client) {
  if (client.state.snapshot?.zone === 'dungeon') return;
  const edrik = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === 'overworld' && /edrik/i.test(`${npc.id} ${npc.name}`))
      ?? client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === 'overworld'),
    'Edrik travel NPC',
  );
  await moveNear(client, edrik.position, interactRange, `Edrik (${edrik.id})`);
  send(client, { type: 'travel-at-npc', entityId: client.state.playerId, npcId: edrik.id });
  await waitFor(() => client.state.snapshot?.zone === 'dungeon' && localPlayer(client.state)?.alive, 'dungeon entry via Edrik');
}

function inventoryCount(state, kind) {
  return state.inventory.find((item) => item.kind === kind)?.count ?? 0;
}

async function ensureMana(client, amount) {
  if ((localPlayer(client.state)?.mana ?? 0) >= amount) return;
  if (inventoryCount(client.state, 'mana_potion') <= 0) {
    throw new Error(`Need ${amount} mana but no mana potion is available.`);
  }
  const before = localPlayer(client.state).mana;
  send(client, { type: 'use-item', entityId: client.state.playerId, item: 'mana_potion' });
  await waitFor(() => (localPlayer(client.state)?.mana ?? 0) > before && (localPlayer(client.state)?.mana ?? 0) >= amount, `${amount} mana after potion`);
}

function commonEnemies(state) {
  return (state.snapshot?.entities ?? [])
    .filter((entity) => entity.kind === 'enemy' && entity.enemyVariant === 'zombie' && entity.alive);
}

async function approachCommonForNova(client) {
  let targetId = '';
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player?.alive) throw new Error('Player died while approaching a Nova target.');
    let target = targetId
      ? commonEnemies(client.state).find((enemy) => enemy.id === targetId)
      : null;
    target ??= commonEnemies(client.state)
      .sort((a, b) => distance2d(player.position, a.position) - distance2d(player.position, b.position) || b.hp - a.hp)[0];
    if (!target) return null;
    targetId = target.id;
    if (distance2d(player.position, target.position) <= novaApproachRange) {
      send(client, { type: 'move', entityId: client.state.playerId, target: player.position, run: false });
      return target;
    }
    const now = Date.now();
    if (now - lastMoveAt >= 220) {
      send(client, { type: 'move', entityId: client.state.playerId, target: target.position, run: true });
      lastMoveAt = now;
    }
    return null;
  }, 'living common zombie in Arcane Nova range');
}

function expectedMasteryXp(before) {
  return Math.min(masteryCap, before + masteryGain);
}

async function castEffectiveNova(client) {
  await ensureMana(client, 25);
  await waitFor(() => (skill(client.state, 'arcane-nova')?.cooldownRemaining ?? 1) <= 0.05, 'Arcane Nova ready');
  const target = await approachCommonForNova(client);
  const baselineXp = mastery(client.state).xp;
  const baselineEvents = eventKeySet(client.state);
  send(client, { type: 'cast-skill', entityId: client.state.playerId, skill: 'arcane-nova' });

  const damage = await waitFor(() => newEvent(client.state, baselineEvents, (event) => (
    event.type === 'damage'
      && event.casterId === client.state.playerId
      && event.targetId === target.id
      && event.sourceSkill === 'arcane-nova'
      && event.damageKind === 'magic'
      && event.amount > 0
  )), 'correlated effective Arcane Nova damage');
  const effect = newEvent(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect' && event.skill === 'arcane-nova' && event.casterId === client.state.playerId
  ));
  if (!effect) throw new Error('Arcane Nova damage arrived without its own skill-effect event.');
  const expectedXp = baselineXp >= masteryCap ? masteryCap : expectedMasteryXp(baselineXp);
  await waitFor(() => mastery(client.state)?.xp === expectedXp, 'Arcana XP after effective Nova');
  if ((skill(client.state, 'arcane-nova')?.cooldownRemaining ?? 0) <= 0.05) throw new Error('Effective Arcane Nova did not start cooldown.');
  return { targetId: target.id, damage: damage.amount, baselineXp, finalXp: expectedXp };
}

function estimatedBoltDamage(state) {
  const player = localPlayer(state);
  const energy = player?.attributes?.energy ?? 0;
  const level = player?.level ?? 1;
  const bonus = mastery(state)?.damageBonus ?? 0;
  return Math.round(16 + energy * 2.4 + level * 3) * (1 + bonus);
}

function targetPointAtRange(player, target, desired) {
  let dx = player.position.x - target.position.x;
  let dz = player.position.z - target.position.z;
  let length = Math.hypot(dx, dz);
  if (length < 0.01) {
    dx = 1;
    dz = 0;
    length = 1;
  }
  return {
    x: target.position.x + (dx / length) * desired,
    y: player.position.y,
    z: target.position.z + (dz / length) * desired,
  };
}

async function positionForBolt(client, excluded = new Set()) {
  let targetId = '';
  let lastMoveAt = 0;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player?.alive) throw new Error('Player died while positioning an Arcane Bolt.');
    const minimumHp = estimatedBoltDamage(client.state) + 4;
    let target = targetId
      ? commonEnemies(client.state).find((enemy) => enemy.id === targetId && enemy.hp > minimumHp)
      : null;
    if (!target) {
      const candidates = commonEnemies(client.state)
        .filter((enemy) => !excluded.has(enemy.id) && enemy.hp > minimumHp)
        .sort((a, b) => {
          const aInRange = distance2d(player.position, a.position) >= boltMinRange && distance2d(player.position, a.position) <= boltMaxRange;
          const bInRange = distance2d(player.position, b.position) >= boltMinRange && distance2d(player.position, b.position) <= boltMaxRange;
          return Number(bInRange) - Number(aInRange) || b.hp - a.hp || a.id.localeCompare(b.id);
        });
      target = candidates[0];
      targetId = target?.id ?? '';
    }
    if (!target) return null;
    const distance = distance2d(player.position, target.position);
    if (distance >= boltMinRange && distance <= boltMaxRange) {
      send(client, { type: 'move', entityId: client.state.playerId, target: player.position, run: false });
      return { target, distance };
    }
    const now = Date.now();
    if (now - lastMoveAt >= 180) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: targetPointAtRange(player, target, boltDesiredRange),
        run: true,
      });
      lastMoveAt = now;
    }
    return null;
  }, 'healthy living common zombie at 5-8m for Arcane Bolt');
}

async function castCorrelatedBolt(client, excludedTargets) {
  await ensureMana(client, 18);
  await waitFor(() => (skill(client.state, 'arcane-bolt')?.cooldownRemaining ?? 1) <= 0.05, 'Arcane Bolt ready');
  const positioned = await positionForBolt(client, excludedTargets);
  const targetAtCast = commonEnemies(client.state).find((enemy) => enemy.id === positioned.target.id);
  const playerAtCast = localPlayer(client.state);
  if (!targetAtCast?.alive || !playerAtCast?.alive) throw new Error('Bolt target/caster stopped being alive before command.');
  const castDistance = distance2d(playerAtCast.position, targetAtCast.position);
  if (castDistance < boltMinRange || castDistance > boltMaxRange) throw new Error(`Arcane Bolt cast distance escaped 5-8m: ${castDistance}.`);

  const baselineXp = mastery(client.state).xp;
  const baselineEvents = eventKeySet(client.state);
  const castSequence = client.state.sequence;
  const attempt = {
    baselineXp,
    baselineLevel: mastery(client.state).level,
    baselineEvents,
    castSequence,
    launchSequence: null,
    impactSequence: null,
    damageSequence: null,
    xpChangeSequence: null,
  };
  client.state.boltAttempt = attempt;
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'arcane-bolt',
    targetId: targetAtCast.id,
  });

  const launch = await waitFor(() => newEvent(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect' && event.skill === 'arcane-bolt' && event.casterId === client.state.playerId
  )), 'own Arcane Bolt launch', 8000);
  let track;
  try {
    track = await waitFor(() => [...client.state.projectileTracks.values()].find((candidate) => (
      candidate.firstSequence > castSequence
        && candidate.kind === 'arcaneBolt'
        && candidate.casterId === client.state.playerId
    )), 'own new arcaneBolt projectile', 3000);
    await waitFor(() => track.positions.length >= 2, 'two distinct authoritative Arcane Bolt positions', 3000);
  } catch (error) {
    const earlyImpact = newEvent(client.state, baselineEvents, (event) => (
      event.type === 'skill-effect'
        && event.skill === 'arcane-bolt-impact'
        && event.casterId === client.state.playerId
        && event.sourceSkill === 'arcane-bolt'
    ));
    const earlyDamage = newEvent(client.state, baselineEvents, (event) => (
      event.type === 'damage' && event.casterId === client.state.playerId && event.sourceSkill === 'arcane-bolt'
    ));
    if (!earlyImpact || earlyDamage || earlyImpact.targetId) throw error;
    client.state.boltAttempt = null;
    if (mastery(client.state).xp !== baselineXp) throw new Error('Early wall/bounds impact changed Arcana XP.');
    excludedTargets.add(targetAtCast.id);
    return { success: false, reason: 'early-wall-impact', castDistance, launch, impact: earlyImpact, track: track ?? null };
  }

  const impact = await waitFor(() => newEvent(client.state, baselineEvents, (event) => (
    event.type === 'skill-effect'
      && event.skill === 'arcane-bolt-impact'
      && event.casterId === client.state.playerId
      && event.sourceSkill === 'arcane-bolt'
  )), 'own Arcane Bolt impact', 8000);
  const damage = newEvent(client.state, baselineEvents, (event) => (
    event.type === 'damage'
      && event.casterId === client.state.playerId
      && event.sourceSkill === 'arcane-bolt'
      && event.damageKind === 'magic'
      && event.amount > 0
  ));
  if (!impact.targetId || !damage || damage.targetId !== impact.targetId) {
    client.state.boltAttempt = null;
    if (mastery(client.state).xp !== baselineXp) throw new Error('Wall/bounds Arcane Bolt changed Arcana XP.');
    excludedTargets.add(targetAtCast.id);
    return { success: false, reason: 'wall-or-no-damage', castDistance, launch, impact, track };
  }

  const hitTarget = await waitFor(() => (client.state.snapshot.entities ?? []).find((entity) => entity.id === damage.targetId), 'impacted enemy state');
  const expectedXp = baselineXp >= masteryCap ? masteryCap : expectedMasteryXp(baselineXp);
  await waitFor(() => mastery(client.state)?.xp === expectedXp, 'Arcana XP only after Arcane Bolt impact');
  if (baselineXp < masteryCap) {
    if (attempt.xpChangeSequence === null || attempt.damageSequence === null || attempt.impactSequence === null) {
      throw new Error(`Missing XP/damage/impact sequence correlation: ${JSON.stringify(attempt)}`);
    }
    if (attempt.xpChangeSequence < attempt.damageSequence || attempt.xpChangeSequence < attempt.impactSequence) {
      throw new Error(`Arcana XP changed before impact damage: ${JSON.stringify(attempt)}`);
    }
  } else if (mastery(client.state).xp !== masteryCap) {
    throw new Error('Arcana mastery overflowed cap after Arcane Bolt.');
  }
  if (attempt.launchSequence === null || attempt.launchSequence > attempt.impactSequence) {
    throw new Error(`Launch/impact ordering is invalid: ${JSON.stringify(attempt)}`);
  }

  if (hitTarget.enemyVariant !== 'zombie') {
    client.state.boltAttempt = null;
    excludedTargets.add(targetAtCast.id);
    excludedTargets.add(hitTarget.id);
    return { success: false, reason: 'non-common-bodyblock', castDistance, launch, impact, track };
  }

  let slowEvent;
  let status;
  try {
    slowEvent = await waitFor(() => newEvent(client.state, baselineEvents, (event) => (
      event.type === 'skill-effect'
        && event.skill === 'arcane-bolt-slow'
        && event.casterId === client.state.playerId
        && event.targetId === damage.targetId
        && event.sourceSkill === 'arcane-bolt'
        && Math.abs(event.duration - 1.6) < 0.01
    )), 'correlated Arcane Bolt slow event', 2500);
    status = await waitFor(() => client.state.statusObservations.find((observation) => (
      observation.sequence > castSequence
        && observation.id === 'arcane-slow'
        && observation.targetId === damage.targetId
        && observation.targetAlive
        && observation.sourceId === client.state.playerId
        && observation.sourceSkill === 'arcane-bolt'
        && Math.abs(observation.duration - 1.6) < 0.01
    )), 'living impacted common zombie with authoritative arcane-slow', 2500);
  } catch (error) {
    const current = (client.state.snapshot.entities ?? []).find((entity) => entity.id === damage.targetId);
    if (current?.alive) throw error;
    client.state.boltAttempt = null;
    excludedTargets.add(targetAtCast.id);
    excludedTargets.add(damage.targetId);
    return { success: false, reason: 'lethal-common-bodyblock', castDistance, launch, impact, track };
  }
  let resonanceStatus = null;
  if (attempt.baselineLevel >= 5) {
    resonanceStatus = await waitFor(() => client.state.statusObservations.find((observation) => (
      observation.sequence > castSequence
        && observation.id === 'arcane-resonance'
        && observation.targetId === damage.targetId
        && observation.targetAlive
        && observation.sourceId === client.state.playerId
        && observation.sourceSkill === 'arcane-bolt'
        && Math.abs(observation.duration - 4.5) < 0.01
    )), 'Arcane Resonance mark after eligible Bolt impact', 2500);
  }
  client.state.boltAttempt = null;
  return {
    success: true,
    castDistance,
    intendedTargetId: targetAtCast.id,
    targetId: damage.targetId,
    damage: damage.amount,
    launchId: launch.id,
    impactId: impact.id,
    slowEventId: slowEvent.id,
    statusRemaining: status.remaining,
    resonanceEligibleAtLaunch: attempt.baselineLevel >= 5,
    resonanceRemaining: resonanceStatus?.remaining ?? null,
    projectileId: track.id,
    projectilePositions: track.positions.length,
    baselineXp,
    finalXp: expectedXp,
  };
}

let client;
try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  validateCatalogAndMasteries(client.state);
  await enterDungeonViaEdrik(client);

  const nova = await castEffectiveNova(client);
  const excludedTargets = new Set([nova.targetId]);
  let bolt = null;
  const failedAttempts = [];
  for (let attempt = 1; attempt <= 3 && !bolt; attempt++) {
    const result = await castCorrelatedBolt(client, excludedTargets);
    if (result.success) bolt = result;
    else failedAttempts.push(result.reason);
  }
  if (!bolt) throw new Error(`No Arcane Bolt hit a living common zombie after three attempts (${failedAttempts.join(', ')}).`);
  const persistedArcanaXp = mastery(client.state).xp;
  const finalSnapshotCount = client.state.snapshots;

  await closeClient(client);
  // A sessao exporta masteries no disconnect; evita disputar o reconnect com
  // a transacao de save ainda em voo.
  await new Promise((resolve) => setTimeout(resolve, 350));
  client = await connectProbeClient(player);
  validateCatalogAndMasteries(client.state);
  await waitFor(() => mastery(client.state)?.xp === persistedArcanaXp, 'Arcana mastery persistence after reconnect');

  console.info(JSON.stringify({
    ok: true,
    reusedAccount: player.reusedAccount,
    characterId: player.character.id,
    catalogSkills: expectedSkills.size,
    masteryOrder: client.state.snapshot.masteries.map((entry) => entry.id),
    nova,
    bolt,
    failedBoltAttempts: failedAttempts,
    persistedArcanaXp,
    snapshotsBeforeReconnect: finalSnapshotCount,
    snapshotsAfterReconnect: client.state.snapshots,
  }, null, 2));
} finally {
  await closeClient(client, 'arcana probe complete');
}
