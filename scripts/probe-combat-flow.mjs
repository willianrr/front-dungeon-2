const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_COMBAT_PROBE_TIMEOUT_MS ?? 18000);
const meleeRange = Number(process.env.ARANNA_COMBAT_PROBE_MELEE_RANGE ?? 2.35);
const steelSweepVariants = new Set(['sword', 'axe', 'hammer']);

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
  const configuredEmail = process.env.ARANNA_COMBAT_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_COMBAT_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-combat-${stamp}@local.test`;
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
  const requestedCharacterId = Number(process.env.ARANNA_COMBAT_PROBE_CHARACTER_ID ?? 0);
  let character = requestedCharacterId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedCharacterId)
    : characters[0];
  if (requestedCharacterId > 0 && !character) {
    throw new Error(`Character ${requestedCharacterId} was not found in the configured combat probe account.`);
  }
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_COMBAT_PROBE_NAME ?? 'CombatProbe' }),
  });
  return { auth, character, reusedAccount: Boolean(configuredEmail) };
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

function healthiestEnemy(state) {
  const player = localPlayer(state);
  if (!player) return null;
  return aliveEnemies(state)
    .map((enemy) => ({ enemy, distance: distance2d(player.position, enemy.position) }))
    .sort((a, b) => (
      b.enemy.hp - a.enemy.hp
      || b.enemy.maxHp - a.enemy.maxHp
      || a.distance - b.distance
    ))[0] ?? null;
}

function steelSweepSkill(state) {
  return localPlayer(state)?.skills?.find((skill) => skill.id === 'steel-sweep') ?? null;
}

async function moveIntoMelee(client, label, preferredTargetId = '', preferHealthiest = false) {
  let lastMoveAt = 0;
  let lockedTargetId = preferredTargetId;
  return waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    const preferred = lockedTargetId
      ? aliveEnemies(client.state).find((enemy) => enemy.id === lockedTargetId)
      : null;
    const candidate = preferred
      ? { enemy: preferred, distance: distance2d(player.position, preferred.position) }
      : preferHealthiest
        ? healthiestEnemy(client.state)
        : nearestEnemy(client.state);
    if (!candidate) return null;
    lockedTargetId = candidate.enemy.id;
    if (candidate.distance <= meleeRange) return candidate.enemy;
    const now = Date.now();
    if (now - lastMoveAt >= 250) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: candidate.enemy.position,
        run: true,
      });
      lastMoveAt = now;
    }
    return null;
  }, label);
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
    sawIronGuardBuff: false,
    sawIronGuardCooldown: false,
    sawIronGuardEffect: false,
    sawIronGuardExpired: false,
    sawIronGuardBlock: false,
    sawIronGuardPerfect: false,
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
    // Conta nova normalmente nasce desarmada. Quando ha uma arma, o probe exige
    // um cast novo completo em vez de inferir cobertura por eventos antigos.
    steelSweepStateVariant: null,
    sawSteelSweepDescription: false,
    steelSweepExpectedVariant: null,
    steelSweepBaselineIds: null,
    steelSweepTargetId: '',
    sawSteelSweepCooldown: false,
    sawSteelSweepBaseEffect: false,
    sawSteelSweepSourceDamage: false,
    sawSteelSweepBleedDamage: false,
    sawSteelSweepBleedEffect: false,
    sawSteelSweepStaggerEffect: false,
    // IDs de combat events ja vistos ANTES de cada cast: sem isso, dano de
    // auto-attack anterior (ainda dentro do TTL) no mesmo alvo marcava
    // chargeDamage/heavyStrikeDamage como falso-positivo.
    seenEventIds: new Set(),
    ironGuardBaselineIds: null,
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
      const hasIronGuardBuff = playerState?.buffs?.some((buff) => buff.id === 'iron-guard') ?? false;
      if (hasIronGuardBuff) state.sawIronGuardBuff = true;
      if (playerState && state.sawIronGuardBuff && !hasIronGuardBuff) state.sawIronGuardExpired = true;
      if (playerState?.skills?.some((skill) => skill.id === 'iron-guard' && skill.cooldownRemaining > 0)) {
        state.sawIronGuardCooldown = true;
      }
      if (playerState?.buffs?.some((buff) => buff.id === 'war-cry')) state.sawWarCryBuff = true;
      if (playerState?.skills?.some((skill) => skill.id === 'war-cry' && skill.cooldownRemaining > 0)) state.sawWarCryCooldown = true;
      if (playerState?.skills?.some((skill) => skill.id === 'charge' && skill.cooldownRemaining > 0)) state.sawChargeCooldown = true;
      if (playerState?.skills?.some((skill) => skill.id === 'heavy-strike' && skill.cooldownRemaining > 0)) state.sawHeavyStrikeCooldown = true;
      const steelSweepState = playerState?.skills?.find((skill) => skill.id === 'steel-sweep');
      state.steelSweepStateVariant = steelSweepVariants.has(steelSweepState?.variant)
        ? steelSweepState.variant
        : null;
      if (typeof steelSweepState?.description === 'string' && steelSweepState.description.trim()) {
        state.sawSteelSweepDescription = true;
      }
      if (state.steelSweepBaselineIds && steelSweepState?.cooldownRemaining > 0) {
        state.sawSteelSweepCooldown = true;
      }
      const isNewIronGuardEvent = (event, skill) => (
        event.type === 'skill-effect'
        && event.skill === skill
        && state.ironGuardBaselineIds
        && !state.ironGuardBaselineIds.has(event.id)
      );
      if (message.snapshot.combatEvents?.some((event) => isNewIronGuardEvent(event, 'iron-guard'))) {
        state.sawIronGuardEffect = true;
      }
      if (message.snapshot.combatEvents?.some((event) => isNewIronGuardEvent(event, 'iron-guard-block'))) {
        state.sawIronGuardBlock = true;
      }
      if (message.snapshot.combatEvents?.some((event) => isNewIronGuardEvent(event, 'iron-guard-perfect'))) {
        state.sawIronGuardPerfect = true;
      }
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
        const isNewSteelSweepEvent = state.steelSweepBaselineIds
          && !state.steelSweepBaselineIds.has(event.id)
          && event.casterId === state.playerId;
        if (isNewSteelSweepEvent
          && event.type === 'skill-effect'
          && event.skill === 'steel-sweep'
          && event.variant === state.steelSweepExpectedVariant) {
          state.sawSteelSweepBaseEffect = true;
        }
        if (isNewSteelSweepEvent
          && event.type === 'skill-effect'
          && event.skill === 'steel-sweep-bleed'
          && event.variant === 'axe'
          && event.sourceSkill === 'steel-sweep'
          && typeof event.targetId === 'string'
          && event.targetId) {
          state.sawSteelSweepBleedEffect = true;
        }
        if (isNewSteelSweepEvent
          && event.type === 'skill-effect'
          && event.skill === 'steel-sweep-stagger'
          && event.variant === 'hammer'
          && event.sourceSkill === 'steel-sweep'
          && typeof event.targetId === 'string'
          && event.targetId) {
          state.sawSteelSweepStaggerEffect = true;
        }
        if (isNewSteelSweepEvent
          && event.type === 'damage'
          && event.sourceSkill === 'steel-sweep'
          && event.variant === state.steelSweepExpectedVariant
          && event.damageEffect !== 'bleed') {
          state.sawSteelSweepSourceDamage = true;
        }
        if (isNewSteelSweepEvent
          && event.type === 'damage'
          && event.sourceSkill === 'steel-sweep'
          && event.variant === 'axe'
          && event.damageEffect === 'bleed') {
          state.sawSteelSweepBleedDamage = true;
        }
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

  client.state.ironGuardBaselineIds = new Set(client.state.seenEventIds);
  send(client, {
    type: 'cast-skill',
    entityId: client.state.playerId,
    skill: 'iron-guard',
  });

  await waitFor(
    () => client.state.sawIronGuardBuff && client.state.sawIronGuardCooldown && client.state.sawIronGuardEffect,
    'iron guard buff, cooldown and activation effect',
  );

  // Movimento e ataques cancelam a guarda. Esperar o fim autoritativo da
  // janela mantem esta verificacao isolada dos casts ofensivos abaixo.
  await waitFor(
    () => client.state.sawIronGuardExpired,
    'iron guard duration to expire',
  );

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
  let target = await moveIntoMelee(client, 'player close enough to an enemy for charge');

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

  target = await moveIntoMelee(
    client,
    'player close enough to an enemy for heavy strike',
    client.state.chargeTargetId,
  );

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

  const detectedSteelSweepVariant = client.state.steelSweepStateVariant;
  let steelSweepCheck;
  if (!detectedSteelSweepVariant) {
    steelSweepCheck = {
      status: 'skipped_unarmed',
      reason: 'Character has no physical weapon; no steel-sweep cast was sent.',
      stateVariant: null,
      descriptionObserved: client.state.sawSteelSweepDescription,
    };
  } else {
    await waitFor(() => {
      const skill = steelSweepSkill(client.state);
      return skill?.variant === detectedSteelSweepVariant
        && typeof skill.description === 'string'
        && skill.description.trim()
        && skill.cooldownRemaining <= 0.05;
    }, `steel sweep ${detectedSteelSweepVariant} state and cooldown readiness`);

    const steelSweepTarget = await moveIntoMelee(
      client,
      'player close enough to an enemy after heavy strike for steel sweep',
      '',
      true,
    );
    const steelSweepTargetHealth = {
      hp: steelSweepTarget.hp,
      maxHp: steelSweepTarget.maxHp,
    };
    client.state.steelSweepExpectedVariant = detectedSteelSweepVariant;
    client.state.steelSweepTargetId = steelSweepTarget.id;
    client.state.steelSweepBaselineIds = new Set(client.state.seenEventIds);
    send(client, {
      type: 'cast-skill',
      entityId: client.state.playerId,
      skill: 'steel-sweep',
    });

    await waitFor(() => {
      const commonContract = client.state.sawSteelSweepCooldown
        && client.state.sawSteelSweepBaseEffect
        && client.state.sawSteelSweepSourceDamage;
      if (!commonContract) return false;
      if (detectedSteelSweepVariant === 'axe') {
        return client.state.sawSteelSweepBleedEffect && client.state.sawSteelSweepBleedDamage;
      }
      if (detectedSteelSweepVariant === 'hammer') return client.state.sawSteelSweepStaggerEffect;
      return true;
    }, `authoritative ${detectedSteelSweepVariant} steel sweep contract`);

    steelSweepCheck = {
      status: 'validated',
      variant: detectedSteelSweepVariant,
      targetId: client.state.steelSweepTargetId,
      targetHealthBeforeCast: steelSweepTargetHealth,
      descriptionObserved: client.state.sawSteelSweepDescription,
      cooldown: client.state.sawSteelSweepCooldown,
      baseEffectVariant: client.state.sawSteelSweepBaseEffect,
      sourceDamage: client.state.sawSteelSweepSourceDamage,
      bleedEffect: detectedSteelSweepVariant === 'axe' ? client.state.sawSteelSweepBleedEffect : 'not_applicable',
      bleedTick: detectedSteelSweepVariant === 'axe' ? client.state.sawSteelSweepBleedDamage : 'not_applicable',
      staggerEffect: detectedSteelSweepVariant === 'hammer' ? client.state.sawSteelSweepStaggerEffect : 'not_applicable',
    };
  }

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      name: client.state.name,
      characterId: client.state.characterId,
      playerId: client.state.playerId,
      account: player.reusedAccount ? 'configured' : 'ephemeral',
      snapshots: client.state.snapshots,
      messages: client.state.messages,
    },
    target: {
      id: target.id,
      damage: client.state.heavyStrikeDamageAmount,
    },
    checks: {
      ironGuardBuff: client.state.sawIronGuardBuff,
      ironGuardCooldown: client.state.sawIronGuardCooldown,
      ironGuardEffect: client.state.sawIronGuardEffect,
      ironGuardExpiredBeforeCombat: client.state.sawIronGuardExpired,
      warCryBuff: client.state.sawWarCryBuff,
      warCryCooldown: client.state.sawWarCryCooldown,
      chargeCooldown: client.state.sawChargeCooldown,
      chargeEffect: client.state.sawChargeEffect,
      chargeDamage: client.state.sawChargeDamage,
      heavyStrikeCooldown: client.state.sawHeavyStrikeCooldown,
      heavyStrikeDamage: client.state.sawHeavyStrikeDamage,
      steelSweep: steelSweepCheck,
    },
    optionalObservations: {
      ironGuardBlock: client.state.sawIronGuardBlock,
      ironGuardPerfect: client.state.sawIronGuardPerfect,
    },
  }, null, 2));
} finally {
  client?.socket.close();
}
