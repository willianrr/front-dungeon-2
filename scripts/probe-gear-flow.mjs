const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_GEAR_PROBE_TIMEOUT_MS ?? 26000);
const interactRange = Number(process.env.ARANNA_GEAR_PROBE_INTERACT_RANGE ?? 3.1);

const weaponKinds = new Set(['sword', 'axe', 'great_sword', 'great_axe', 'war_hammer']);
const oneHandKinds = new Set(['sword', 'axe']);
const twoHandKinds = new Set(['great_sword', 'great_axe', 'war_hammer']);
const gearKinds = new Set([...weaponKinds, 'armor', 'helmet', 'gloves', 'ring', 'necklace']);
const defaultSlotByKind = {
  armor: 'chest',
  helmet: 'head',
  gloves: 'hands',
  ring: 'ring',
  necklace: 'trinket',
};
const vendorTrainingHelmetId = 'vendor-training-helmet';

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
  const email = process.env.ARANNA_GEAR_PROBE_EMAIL ?? `codex-gear-${stamp}@local.test`;
  const password = process.env.ARANNA_GEAR_PROBE_PASSWORD ?? 'codex123456';
  const name = process.env.ARANNA_GEAR_PROBE_NAME ?? 'GearProbe';
  const auth = await request('/accounts/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const characters = await request('/characters', { token: auth.token });
  const character = characters[0] ?? await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name }),
  });
  return { auth, character, email };
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

function inventoryItem(state, itemId) {
  return state.inventory.find((item) => item.id === itemId);
}

function send(client, command) {
  client.socket.send(JSON.stringify(command));
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
    inventory: [],
    equipment: null,
    npcs: [],
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
      if (Array.isArray(message.snapshot.inventory)) state.inventory = message.snapshot.inventory;
      if (message.snapshot.equipment) state.equipment = message.snapshot.equipment;
      if (Array.isArray(message.snapshot.npcs)) state.npcs = message.snapshot.npcs;
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(() => state.playerId && state.snapshot && state.equipment && localPlayer(state), 'initial gear snapshot');
  return { socket, state };
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

function freshLoot(state, beforeLootIds) {
  return (state.snapshot?.loot ?? []).filter((item) => !beforeLootIds.has(item.id));
}

async function collectLoot(client, item) {
  await moveNear(client, item.position, `loot ${item.id}`);
  send(client, {
    type: 'collect',
    entityId: client.state.playerId,
    lootId: item.id,
  });
  await waitFor(() => {
    const stillOnGround = client.state.snapshot?.loot?.some((loot) => loot.id === item.id);
    if (stillOnGround) return null;
    if (!gearKinds.has(item.kind)) return true;
    return inventoryItem(client.state, item.id);
  }, `collect loot ${item.id}`);
}

async function equipItem(client, item, slot) {
  send(client, {
    type: 'equip-item',
    entityId: client.state.playerId,
    itemId: item.id,
    ...(slot ? { slot } : {}),
  });
  await waitFor(() => {
    const equipment = client.state.equipment;
    if (!equipment) return null;
    if (slot) return equipment[slot] === item.id;
    return Object.values(equipment).includes(item.id);
  }, `equip ${item.id}${slot ? ` to ${slot}` : ''}`);
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

  const travelNpc = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === 'overworld'),
    'overworld travel NPC',
  );
  await moveNear(client, travelNpc.position, `travel NPC ${travelNpc.id}`);
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: travelNpc.id,
  });

  await waitFor(() => client.state.snapshot?.zone === 'dungeon' && localPlayer(client.state)?.position, 'dungeon snapshot');
  const enteredDungeon = true;
  const basePlayer = localPlayer(client.state);
  const baseArmor = basePlayer?.armor ?? 0;
  const baseMaxHp = basePlayer?.maxHp ?? 0;
  const baseMaxMana = basePlayer?.maxMana ?? 0;
  const baseCrit = basePlayer?.criticalChance ?? 0;

  const openedChestIds = [];
  const collectedLootIds = [];
  const collectedGearIds = [];

  for (let attempts = 0; attempts < 3; attempts++) {
    const chest = client.state.snapshot?.chests?.find((candidate) => !candidate.opened && !openedChestIds.includes(candidate.id));
    if (!chest) break;
    await moveNear(client, chest.position, `chest ${chest.id}`);
    const beforeLootIds = new Set(client.state.snapshot?.loot?.map((loot) => loot.id) ?? []);
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
    const drops = await waitFor(() => {
      const current = freshLoot(client.state, beforeLootIds);
      return current.length >= 6 ? current : null;
    }, `loot from chest ${chest.id}`);
    for (const item of drops) {
      await collectLoot(client, item);
      collectedLootIds.push(item.id);
      if (gearKinds.has(item.kind)) collectedGearIds.push(item.id);
    }
  }

  const collectedGear = collectedGearIds
    .map((id) => inventoryItem(client.state, id))
    .filter(Boolean);
  const weapons = collectedGear.filter((item) => weaponKinds.has(item.kind) && item.damageMax >= item.damageMin && item.damageMax > 0);
  const oneHanders = weapons.filter((item) => oneHandKinds.has(item.kind));
  const twoHanders = weapons.filter((item) => twoHandKinds.has(item.kind));
  const armorVisualItem = collectedGear.find((item) => item.kind === 'armor');
  const helmetVisualItem = collectedGear.find((item) => item.kind === 'helmet');
  const armorStatItem = collectedGear.find((item) => item.armor > 0);
  const ringItems = collectedGear.filter((item) => item.kind === 'ring');
  const accessoryItem = collectedGear.find((item) => item.bonusHp > 0 || item.bonusMana > 0 || item.bonusCrit > 0);

  if (openedChestIds.length < 1) throw new Error('Expected to open at least one dungeon chest');
  if (collectedGear.length < openedChestIds.length * 2) {
    throw new Error(`Expected at least ${openedChestIds.length * 2} collected gear items, got ${collectedGear.length}`);
  }
  if (weapons.length < 1) throw new Error('Expected at least one collected weapon');
  if (!armorStatItem && !accessoryItem) throw new Error('Expected at least one collected armor/accessory stat item');

  const weaponForMain = oneHanders[0] ?? weapons[0];
  await equipItem(client, weaponForMain, 'weapon');
  await waitFor(() => localPlayer(client.state)?.equippedWeapon?.kind === weaponForMain.kind, 'main weapon visual');

  let dualWield = null;
  if (oneHanders.length >= 2) {
    await equipItem(client, oneHanders[0], 'weapon');
    await equipItem(client, oneHanders[1], 'offhand');
    await waitFor(() => localPlayer(client.state)?.offhandWeapon?.kind === oneHanders[1].kind, 'offhand weapon visual');
    dualWield = {
      weapon: oneHanders[0].kind,
      offhand: oneHanders[1].kind,
      equipmentOffhand: client.state.equipment?.offhand,
    };
  }

  let twoHanded = null;
  if (twoHanders.length >= 1) {
    await equipItem(client, twoHanders[0], 'weapon');
    await waitFor(() => {
      const playerState = localPlayer(client.state);
      return client.state.equipment?.weapon === twoHanders[0].id
        && client.state.equipment?.offhand == null
        && playerState?.equippedWeapon?.kind === twoHanders[0].kind
        && !playerState?.offhandWeapon;
    }, '2H weapon clears offhand visual');
    twoHanded = {
      weapon: twoHanders[0].kind,
      equipmentWeapon: client.state.equipment?.weapon,
      equipmentOffhand: client.state.equipment?.offhand,
    };
  }

  let armorStat = null;
  if (armorStatItem) {
    await equipItem(client, armorStatItem, defaultSlotByKind[armorStatItem.kind]);
    await waitFor(() => (localPlayer(client.state)?.armor ?? 0) > baseArmor, 'armor stat increase');
    armorStat = {
      kind: armorStatItem.kind,
      armor: armorStatItem.armor,
      playerArmor: localPlayer(client.state)?.armor ?? 0,
    };
  }

  let armorVisual = null;
  if (armorVisualItem) {
    await equipItem(client, armorVisualItem, 'chest');
    await waitFor(() => localPlayer(client.state)?.armorVisual?.kind === 'armor', 'armor visual');
    armorVisual = client.state.equipment?.chest;
  }

  let helmetVisual = null;
  if (helmetVisualItem) {
    await equipItem(client, helmetVisualItem, 'head');
    await waitFor(() => localPlayer(client.state)?.helmetVisual?.kind === 'helmet', 'helmet visual');
    helmetVisual = client.state.equipment?.head;
  }

  let accessory = null;
  if (accessoryItem) {
    await equipItem(client, accessoryItem, defaultSlotByKind[accessoryItem.kind]);
    await waitFor(() => {
      const playerState = localPlayer(client.state);
      if (!playerState) return null;
      return (playerState.maxHp > baseMaxHp)
        || ((playerState.maxMana ?? 0) > baseMaxMana)
        || ((playerState.criticalChance ?? 0) > baseCrit);
    }, 'accessory stat increase');
    const playerState = localPlayer(client.state);
    accessory = {
      kind: accessoryItem.kind,
      maxHp: playerState?.maxHp ?? 0,
      maxMana: playerState?.maxMana ?? 0,
      criticalChance: playerState?.criticalChance ?? 0,
    };
  }

  let ring2 = null;
  if (ringItems.length >= 2) {
    await equipItem(client, ringItems[0], 'ring');
    await equipItem(client, ringItems[1], 'ring2');
    await waitFor(
      () => client.state.equipment?.ring === ringItems[0].id && client.state.equipment?.ring2 === ringItems[1].id,
      'ring and ring2 equipment slots',
    );
    ring2 = {
      ring: client.state.equipment?.ring,
      ring2: client.state.equipment?.ring2,
    };
  }

  const dungeonTravelNpc = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'travel' && npc.zone === 'dungeon'),
    'dungeon travel NPC',
  );
  await moveNear(client, dungeonTravelNpc.position, `travel NPC ${dungeonTravelNpc.id}`);
  send(client, {
    type: 'travel-at-npc',
    entityId: client.state.playerId,
    npcId: dungeonTravelNpc.id,
  });
  await waitFor(() => client.state.snapshot?.zone === 'overworld' && localPlayer(client.state)?.position, 'overworld snapshot after dungeon');

  const vendor = await waitFor(
    () => client.state.npcs.find((npc) => npc.kind === 'vendor' && npc.zone === 'overworld'),
    'overworld gear vendor',
  );
  await moveNear(client, vendor.position, `vendor ${vendor.id}`);
  send(client, {
    type: 'buy-vendor-item',
    entityId: client.state.playerId,
    vendorId: vendor.id,
    itemId: vendorTrainingHelmetId,
  });
  const helmet = await waitFor(() => {
    const item = client.state.inventory.find((candidate) => candidate.kind === 'helmet' && candidate.equipped);
    const playerState = localPlayer(client.state);
    if (item && client.state.equipment?.head === item.id && playerState?.helmetVisual?.kind === 'helmet') return item;
    return null;
  }, 'vendor helmet equipped and visible');

  console.info(JSON.stringify({
    ok: true,
    apiUrl,
    wsUrl,
    player: {
      email: player.email,
      name: client.state.name,
      characterId: client.state.characterId,
      playerId: client.state.playerId,
      snapshots: client.state.snapshots,
      messages: client.state.messages,
    },
    openedChestIds,
    collected: {
      lootCount: collectedLootIds.length,
      gearCount: collectedGear.length,
      weaponKinds: weapons.map((item) => item.kind),
      statGearKinds: collectedGear
        .filter((item) => item.armor > 0 || item.bonusHp > 0 || item.bonusMana > 0 || item.bonusCrit > 0)
        .map((item) => item.kind),
    },
    equipped: {
      mainWeapon: localPlayer(client.state)?.equippedWeapon ?? null,
      offhandWeapon: localPlayer(client.state)?.offhandWeapon ?? null,
      armorVisual: localPlayer(client.state)?.armorVisual ?? null,
      helmetVisual: localPlayer(client.state)?.helmetVisual ?? null,
      equipment: client.state.equipment,
    },
    optional: {
      dualWield,
      twoHanded,
      armorVisual,
      helmetVisual,
      accessory,
      vendorHelmet: {
        id: helmet.id,
        armor: helmet.armor,
        equipmentHead: client.state.equipment?.head,
        visual: localPlayer(client.state)?.helmetVisual ?? null,
      },
      ring2,
    },
    checks: {
      dungeonEntered: enteredDungeon,
      chestsOpened: openedChestIds.length > 0,
      collectedGear: collectedGear.length >= openedChestIds.length * 2,
      weaponEquipped: Boolean(localPlayer(client.state)?.equippedWeapon),
      armorStatApplied: armorStat ? armorStat.playerArmor > baseArmor : null,
      accessoryStatApplied: accessory
        ? accessory.maxHp > baseMaxHp || accessory.maxMana > baseMaxMana || accessory.criticalChance > baseCrit
        : null,
      dualWieldVisual: dualWield ? Boolean(dualWield.equipmentOffhand) : null,
      twoHandedClearsOffhand: twoHanded ? twoHanded.equipmentOffhand == null : null,
      armorVisual: armorVisual ? Boolean(localPlayer(client.state)?.armorVisual) : null,
      helmetVisual: Boolean(localPlayer(client.state)?.helmetVisual),
      ring2Slot: ring2 ? Boolean(ring2.ring && ring2.ring2) : null,
    },
  }, null, 2));
} finally {
  await closeClient(client);
}
