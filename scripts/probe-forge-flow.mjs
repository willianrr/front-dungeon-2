const apiUrl = process.env.ARANNA_API_URL ?? 'http://localhost:8080/api/v1';
const wsUrl = process.env.ARANNA_WS_URL ?? 'ws://localhost:8080/ws/game';
const timeoutMs = Number(process.env.ARANNA_FORGE_PROBE_TIMEOUT_MS ?? 16000);
const serviceRange = Number(process.env.ARANNA_FORGE_PROBE_INTERACT_RANGE ?? 3.05);
const bagSlotCapacity = 44;

const resourceEventTypes = new Set([
  'ore_smelted',
  'item_forged',
  'tool_forged',
  'smelt_error',
  'forge_error',
  'profession_progress',
  'profession_level_up',
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
  if (!response.ok || body.error) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return body.data;
}

async function createProbePlayer() {
  const configuredEmail = process.env.ARANNA_FORGE_PROBE_EMAIL?.trim();
  const password = process.env.ARANNA_FORGE_PROBE_PASSWORD ?? 'codex123456';
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = configuredEmail || `codex-forge-${stamp}@local.test`;
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
  const requestedCharacterId = Number(process.env.ARANNA_FORGE_PROBE_CHARACTER_ID ?? 0);
  let character = requestedCharacterId > 0
    ? characters.find((candidate) => Number(candidate.id) === requestedCharacterId)
    : characters[0];
  if (requestedCharacterId > 0 && !character) {
    throw new Error(`Character ${requestedCharacterId} was not found in the configured forge probe account.`);
  }
  character ??= await request('/characters', {
    method: 'POST',
    token: auth.token,
    body: JSON.stringify({ name: process.env.ARANNA_FORGE_PROBE_NAME ?? 'ForgeProbe' }),
  });
  return { auth, character, email, reusedAccount: Boolean(configuredEmail) };
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

function distance2d(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
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
    snapshot: null,
    inventory: [],
    inventoryReceived: false,
    npcs: [],
    npcsReceived: false,
    resourceEvents: new Map(),
    snapshots: 0,
    messages: 0,
  };

  socket.addEventListener('message', (event) => {
    state.messages++;
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message.type === 'welcome') {
      state.playerId = message.playerId ?? state.playerId;
    }
    if (message.type !== 'snapshot' || !message.snapshot) return;

    state.snapshot = message.snapshot;
    state.snapshots++;
    if (Array.isArray(message.snapshot.inventory)) {
      state.inventory = message.snapshot.inventory;
      state.inventoryReceived = true;
    }
    if (Array.isArray(message.snapshot.npcs)) {
      state.npcs = message.snapshot.npcs;
      state.npcsReceived = true;
    }
    for (const resourceEvent of message.snapshot.partyEvents ?? []) {
      if (!resourceEventTypes.has(resourceEvent.type)) continue;
      const key = resourceEvent.id
        ?? `${message.snapshot.tick}:${resourceEvent.type}:${resourceEvent.message ?? ''}`;
      state.resourceEvents.set(key, resourceEvent);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error(`WebSocket connection failed for ${player.character.name}`)), { once: true });
  });
  await waitFor(
    () => state.playerId
      && state.snapshot?.professions
      && state.inventoryReceived
      && state.npcsReceived
      && localPlayer(state),
    'initial forge snapshot',
  );
  return { socket, state };
}

async function closeClient(client) {
  if (!client?.socket || client.socket.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    client.socket.addEventListener('close', resolve, { once: true });
    client.socket.close();
    setTimeout(resolve, 1000);
  });
}

async function moveNear(client, npc) {
  let lastMoveAt = 0;
  await waitFor(() => {
    const player = localPlayer(client.state);
    if (!player) return null;
    if (client.state.snapshot?.zone !== npc.zone) {
      throw new Error(`Borin is in ${npc.zone}, but the probe character is in ${client.state.snapshot?.zone}.`);
    }
    const distance = distance2d(player.position, npc.position);
    if (distance <= serviceRange) return distance;
    const now = Date.now();
    if (now - lastMoveAt >= 250) {
      send(client, {
        type: 'move',
        entityId: client.state.playerId,
        target: npc.position,
        run: true,
      });
      lastMoveAt = now;
    }
    return null;
  }, 'move into Borin service range');
}

function validateForgeCatalog(borin) {
  if (borin.id !== 'npc-blacksmith-borin' || borin.kind !== 'blacksmith') {
    throw new Error(`Unexpected Borin identity: ${JSON.stringify({ id: borin.id, kind: borin.kind })}`);
  }
  if (!Array.isArray(borin.forgeRecipes) || borin.forgeRecipes.length === 0) {
    throw new Error('Borin snapshot does not expose forgeRecipes.');
  }

  const seenIds = new Set();
  let smeltingRecipes = 0;
  let toolRecipes = 0;
  let equipmentRecipes = 0;
  for (const recipe of borin.forgeRecipes) {
    if (typeof recipe.id !== 'string' || !recipe.id || seenIds.has(recipe.id)) {
      throw new Error(`Invalid or duplicate forge recipe id: ${JSON.stringify(recipe.id)}`);
    }
    seenIds.add(recipe.id);
    if (typeof recipe.label !== 'string' || !recipe.label) {
      throw new Error(`Recipe ${recipe.id} is missing its label.`);
    }
    if (recipe.recipeType !== 'smelting' && recipe.recipeType !== 'tool' && recipe.recipeType !== 'equipment') {
      throw new Error(`Recipe ${recipe.id} has invalid recipeType ${JSON.stringify(recipe.recipeType)}.`);
    }
    if (!Number.isInteger(recipe.requiredLevel) || recipe.requiredLevel < 1 || recipe.requiredLevel > 10) {
      throw new Error(`Recipe ${recipe.id} has invalid requiredLevel ${JSON.stringify(recipe.requiredLevel)}; expected an integer from 1 to 10.`);
    }
    if (!Number.isInteger(recipe.xpReward) || recipe.xpReward <= 0) {
      throw new Error(`Recipe ${recipe.id} has invalid xpReward ${JSON.stringify(recipe.xpReward)}; expected a positive integer.`);
    }
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new Error(`Recipe ${recipe.id} does not expose canonical ingredients.`);
    }
    for (const ingredient of recipe.ingredients) {
      if (typeof ingredient.kind !== 'string' || !ingredient.kind || !Number.isInteger(ingredient.count) || ingredient.count <= 0) {
        throw new Error(`Recipe ${recipe.id} has an invalid ingredient: ${JSON.stringify(ingredient)}`);
      }
    }
    const primary = recipe.ingredients[0];
    if (recipe.inputKind !== primary.kind || recipe.inputCount !== primary.count) {
      throw new Error(`Recipe ${recipe.id} legacy input fields do not match its first canonical ingredient.`);
    }
    if (typeof recipe.outputKind !== 'string' || !recipe.outputKind || !Number.isInteger(recipe.outputCount) || recipe.outputCount <= 0) {
      throw new Error(`Recipe ${recipe.id} has an invalid output contract.`);
    }
    if (recipe.recipeType === 'smelting') {
      smeltingRecipes++;
    } else if (recipe.recipeType === 'tool') {
      toolRecipes++;
      if (recipe.outputCount !== 1 || recipe.outputRarity !== undefined
          || !Number.isInteger(recipe.toolTier) || recipe.toolTier < 1 || recipe.toolTier > 3
          || (recipe.requiredToolTier ?? 0) !== recipe.toolTier - 1) {
        throw new Error(`Tool recipe ${recipe.id} has an invalid permanent progression contract.`);
      }
    } else {
      equipmentRecipes++;
      if (recipe.outputCount !== 1 || typeof recipe.outputRarity !== 'string' || !recipe.outputRarity) {
        throw new Error(`Equipment recipe ${recipe.id} must expose one output and outputRarity.`);
      }
    }
  }
  if (smeltingRecipes === 0 || toolRecipes !== 3 || equipmentRecipes === 0) {
    throw new Error(`Borin must expose smelting, 3 tools and equipment recipes; got ${smeltingRecipes}/${toolRecipes}/${equipmentRecipes}.`);
  }
  return { recipes: borin.forgeRecipes, smeltingRecipes, toolRecipes, equipmentRecipes };
}

function professionXPThreshold(level) {
  return level <= 1 ? 0 : 15 * level * (level - 1);
}

function professionLevelForXP(xp, maxLevel) {
  let level = 1;
  for (let candidate = 2; candidate <= maxLevel; candidate++) {
    if (xp < professionXPThreshold(candidate)) break;
    level = candidate;
  }
  return level;
}

function validateProfession(value, expectedId) {
  if (!value || typeof value !== 'object') {
    throw new Error(`Snapshot does not expose professions.${expectedId}.`);
  }
  if (value.id !== expectedId || typeof value.label !== 'string' || !value.label) {
    throw new Error(`Profession ${expectedId} has invalid identity fields.`);
  }
  if (!Number.isInteger(value.maxLevel) || value.maxLevel !== 10) {
    throw new Error(`Profession ${expectedId} has invalid maxLevel ${JSON.stringify(value.maxLevel)}; expected 10.`);
  }
  if (!Number.isInteger(value.level) || value.level < 1 || value.level > value.maxLevel) {
    throw new Error(`Profession ${expectedId} has invalid level ${JSON.stringify(value.level)}.`);
  }
  const capXP = professionXPThreshold(value.maxLevel);
  if (!Number.isInteger(value.xp) || value.xp < 0 || value.xp > capXP) {
    throw new Error(`Profession ${expectedId} has invalid xp ${JSON.stringify(value.xp)}.`);
  }
  if (!Number.isInteger(value.xpIntoLevel) || value.xpIntoLevel < 0) {
    throw new Error(`Profession ${expectedId} has invalid xpIntoLevel ${JSON.stringify(value.xpIntoLevel)}.`);
  }
  if (!Number.isInteger(value.xpToNext) || value.xpToNext < 0) {
    throw new Error(`Profession ${expectedId} has invalid xpToNext ${JSON.stringify(value.xpToNext)}.`);
  }
  if (typeof value.bonusYieldChance !== 'number'
      || !Number.isFinite(value.bonusYieldChance)
      || value.bonusYieldChance < 0
      || value.bonusYieldChance > 1) {
    throw new Error(`Profession ${expectedId} has invalid bonusYieldChance ${JSON.stringify(value.bonusYieldChance)}.`);
  }

  const expectedLevel = professionLevelForXP(value.xp, value.maxLevel);
  const expectedIntoLevel = value.xp - professionXPThreshold(value.level);
  const expectedToNext = value.level < value.maxLevel
    ? professionXPThreshold(value.level + 1) - professionXPThreshold(value.level)
    : 0;
  const expectedBonusYieldChance = expectedId === 'mining'
    ? Math.min(0.25, Math.max(0, (value.level - 1) * 0.04))
    : 0;
  if (value.level !== expectedLevel
      || value.xpIntoLevel !== expectedIntoLevel
      || value.xpToNext !== expectedToNext
      || Math.abs(value.bonusYieldChance - expectedBonusYieldChance) > 1e-9) {
    throw new Error(`Profession ${expectedId} has internally inconsistent progress: ${JSON.stringify(value)}.`);
  }

  return {
    id: value.id,
    label: value.label,
    level: value.level,
    xp: value.xp,
    xpIntoLevel: value.xpIntoLevel,
    xpToNext: value.xpToNext,
    maxLevel: value.maxLevel,
    bonusYieldChance: value.bonusYieldChance,
    capXP,
  };
}

function validateProfessions(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Snapshot does not expose the professions contract.');
  }
  return {
    mining: validateProfession(value.mining, 'mining'),
    smithing: validateProfession(value.smithing, 'smithing'),
  };
}

function stackCount(inventory, kind) {
  return inventory.reduce((total, item) => (
    item.stackable && item.kind === kind ? total + Math.max(0, item.count ?? 0) : total
  ), 0);
}

function stackCounts(inventory) {
  const counts = {};
  for (const item of inventory) {
    if (item.stackable && item.count > 0) counts[item.kind] = (counts[item.kind] ?? 0) + item.count;
  }
  return counts;
}

function hasIngredients(inventory, recipe) {
  return recipe.ingredients.every((ingredient) => stackCount(inventory, ingredient.kind) >= ingredient.count);
}

function bagSlotsUsed(inventory) {
  const stackKinds = new Set(
    inventory
      .filter((item) => item.stackable && item.kind !== 'coin' && item.count > 0)
      .map((item) => item.kind),
  );
  const unequippedGear = inventory.filter((item) => !item.stackable && !item.equipped).length;
  return stackKinds.size + unequippedGear;
}

function projectedSlots(inventory, recipe) {
  let projected = bagSlotsUsed(inventory);
  for (const ingredient of recipe.ingredients) {
    if (stackCount(inventory, ingredient.kind) === ingredient.count) projected--;
  }
  if (recipe.recipeType === 'tool') return projected;
  if (recipe.recipeType === 'equipment') return projected + recipe.outputCount;
  if (stackCount(inventory, recipe.outputKind) <= 0) projected++;
  return projected;
}

function ingredientSnapshot(inventory, recipe) {
  return Object.fromEntries(recipe.ingredients.map((ingredient) => [
    ingredient.kind,
    stackCount(inventory, ingredient.kind),
  ]));
}

function ingredientDeltasMatch(before, afterInventory, recipe) {
  return recipe.ingredients.every((ingredient) => (
    stackCount(afterInventory, ingredient.kind) === before[ingredient.kind] - ingredient.count
  ));
}

function newResourceEvents(state, baselineKeys) {
  return [...state.resourceEvents.entries()]
    .filter(([key]) => !baselineKeys.has(key))
    .map(([, resourceEvent]) => resourceEvent);
}

function missingMaterials(inventory, recipe) {
  return recipe.ingredients
    .map((ingredient) => ({
      kind: ingredient.kind,
      required: ingredient.count,
      owned: stackCount(inventory, ingredient.kind),
    }))
    .filter((ingredient) => ingredient.owned < ingredient.required);
}

let client;

try {
  const player = await createProbePlayer();
  client = await connectProbeClient(player);
  const borin = await waitFor(
    () => client.state.npcs.find((npc) => npc.id === 'npc-blacksmith-borin'),
    'Borin in NPC catalog',
  );
  const catalog = validateForgeCatalog(borin);
  const professionsBefore = validateProfessions(client.state.snapshot?.professions);
  const toolTierBefore = client.state.snapshot?.mining?.tool?.tier ?? 0;
  const inventoryBefore = client.state.inventory;
  const materialCountsBefore = stackCounts(inventoryBefore);
  const unlockedRecipes = catalog.recipes.filter((recipe) => (
    professionsBefore.smithing.level >= recipe.requiredLevel
  ));
  const lockedRecipes = catalog.recipes.filter((recipe) => (
    professionsBefore.smithing.level < recipe.requiredLevel
  ));

  const candidates = unlockedRecipes
    .filter((recipe) => recipe.recipeType !== 'tool'
      || (recipe.toolTier > toolTierBefore && (recipe.requiredToolTier ?? 0) === toolTierBefore))
    .filter((recipe) => hasIngredients(inventoryBefore, recipe))
    .map((recipe) => ({ recipe, projectedSlots: projectedSlots(inventoryBefore, recipe) }))
    .filter((candidate) => candidate.projectedSlots <= bagSlotCapacity)
    .sort((a, b) => Number(b.recipe.recipeType === 'tool') - Number(a.recipe.recipeType === 'tool')
      || Number(b.recipe.recipeType === 'equipment') - Number(a.recipe.recipeType === 'equipment'));
  const selected = candidates[0];

  if (!selected) {
    const closest = [...unlockedRecipes]
      .map((recipe) => ({ recipe, missing: missingMaterials(inventoryBefore, recipe) }))
      .sort((a, b) => (
        a.missing.reduce((total, ingredient) => total + ingredient.required - ingredient.owned, 0)
        - b.missing.reduce((total, ingredient) => total + ingredient.required - ingredient.owned, 0)
      ))[0];
    const missing = closest ? closest.missing : [];
    console.info(JSON.stringify({
      status: 'skipped',
      reason: unlockedRecipes.length === 0
        ? 'profession_locked'
        : unlockedRecipes.some((recipe) => hasIngredients(inventoryBefore, recipe))
          ? 'bag_capacity'
          : 'insufficient_materials',
      apiUrl,
      wsUrl,
      player: {
        email: player.email,
        name: client.state.name,
        characterId: client.state.characterId,
        playerId: client.state.playerId,
        reusedAccount: player.reusedAccount,
      },
      catalog: {
        valid: true,
        totalRecipes: catalog.recipes.length,
        smeltingRecipes: catalog.smeltingRecipes,
        toolRecipes: catalog.toolRecipes,
        equipmentRecipes: catalog.equipmentRecipes,
        recipeTypes: [...new Set(catalog.recipes.map((recipe) => recipe.recipeType))],
        unlockedRecipes: unlockedRecipes.map((recipe) => ({
          id: recipe.id,
          requiredLevel: recipe.requiredLevel,
          xpReward: recipe.xpReward,
        })),
        lockedRecipes: lockedRecipes.map((recipe) => ({
          id: recipe.id,
          requiredLevel: recipe.requiredLevel,
          xpReward: recipe.xpReward,
        })),
      },
      professions: professionsBefore,
      inventory: materialCountsBefore,
      flow: {
        attempted: false,
        validated: false,
        closestRecipe: closest?.recipe.id ?? null,
        missing,
      },
      checks: {
        borinContract: true,
        canonicalIngredients: true,
        professionContract: true,
        recipeProgressionContract: true,
        recipeSelectionRespectsSmithingLevel: true,
      },
      instruction: unlockedRecipes.length === 0
        ? `Avance Ferraria além do nível ${professionsBefore.smithing.level} para desbloquear uma receita e execute novamente.`
        : missing.length > 0
        ? `Abasteca ${missing.map((item) => `${item.required - item.owned}x ${item.kind}`).join(', ')} e execute novamente. Para reutilizar um personagem abastecido, defina ARANNA_FORGE_PROBE_EMAIL, ARANNA_FORGE_PROBE_PASSWORD e, opcionalmente, ARANNA_FORGE_PROBE_CHARACTER_ID.`
        : `Libere espaco na mochila (limite autoritativo de ${bagSlotCapacity} slots) e execute novamente.`,
    }, null, 2));
  } else {
    const recipe = selected.recipe;
    await moveNear(client, borin);
    const beforeIngredients = ingredientSnapshot(client.state.inventory, recipe);
    const beforeOutputCount = stackCount(client.state.inventory, recipe.outputKind);
    const beforeItemIds = new Set(client.state.inventory.map((item) => item.id));
    const smithingBefore = validateProfessions(client.state.snapshot?.professions).smithing;
    const expectedSmithingXPDelta = Math.min(recipe.xpReward, smithingBefore.capXP - smithingBefore.xp);
    const baselineEventKeys = new Set(client.state.resourceEvents.keys());
    const beforeToolTier = client.state.snapshot?.mining?.tool?.tier ?? 0;
    send(client, recipe.recipeType !== 'smelting'
      ? {
        type: 'forge-item-at-npc',
        entityId: client.state.playerId,
        npcId: borin.id,
        recipeId: recipe.id,
      }
      : {
        type: 'smelt-ore-at-npc',
        entityId: client.state.playerId,
        npcId: borin.id,
        recipeId: recipe.id,
        count: 1,
      });

    const result = await waitFor(() => {
      const events = newResourceEvents(client.state, baselineEventKeys);
      const failure = events.find((resourceEvent) => resourceEvent.type === 'smelt_error' || resourceEvent.type === 'forge_error');
      if (failure) throw new Error(`${failure.type}: ${failure.message ?? 'forge request rejected'}`);
      const expectedEvent = recipe.recipeType === 'equipment'
        ? 'item_forged'
        : recipe.recipeType === 'tool'
          ? 'tool_forged'
          : 'ore_smelted';
      const successEvent = events.find((resourceEvent) => resourceEvent.type === expectedEvent);
      if (!successEvent || !ingredientDeltasMatch(beforeIngredients, client.state.inventory, recipe)) return null;
      const professionsAfter = validateProfessions(client.state.snapshot?.professions);
      const actualSmithingXPDelta = professionsAfter.smithing.xp - smithingBefore.xp;
      if (actualSmithingXPDelta !== expectedSmithingXPDelta) return null;
      const progressEvent = events.find((resourceEvent) => resourceEvent.type === 'profession_progress');
      const levelUpEvents = events.filter((resourceEvent) => resourceEvent.type === 'profession_level_up');
      if (expectedSmithingXPDelta > 0 && !progressEvent) return null;
      if (professionsAfter.smithing.level > smithingBefore.level && levelUpEvents.length === 0) return null;

      if (recipe.recipeType === 'smelting') {
        const outputAfter = stackCount(client.state.inventory, recipe.outputKind);
        if (outputAfter !== beforeOutputCount + recipe.outputCount) return null;
        return {
          successEvent,
          progressEvent: progressEvent ?? null,
          levelUpEvents,
          professionsAfter,
          actualSmithingXPDelta,
          outputAfter,
          forgedItem: null,
        };
      }
      if (recipe.recipeType === 'tool') {
        const toolTierAfter = client.state.snapshot?.mining?.tool?.tier;
        const forgedBagItem = client.state.inventory.find((item) => (
          !beforeItemIds.has(item.id) && item.kind === recipe.outputKind
        ));
        if (beforeToolTier !== (recipe.requiredToolTier ?? 0)
            || toolTierAfter !== recipe.toolTier || forgedBagItem) return null;
        return {
          successEvent,
          progressEvent: progressEvent ?? null,
          levelUpEvents,
          professionsAfter,
          actualSmithingXPDelta,
          outputAfter: null,
          forgedItem: null,
          toolTierAfter,
        };
      }
      const forgedItem = client.state.inventory.find((item) => (
        !beforeItemIds.has(item.id) && item.kind === recipe.outputKind && !item.stackable
      ));
      if (!forgedItem || forgedItem.rarity !== recipe.outputRarity || forgedItem.equipped) return null;
      return {
        successEvent,
        progressEvent: progressEvent ?? null,
        levelUpEvents,
        professionsAfter,
        actualSmithingXPDelta,
        outputAfter: null,
        forgedItem,
        toolTierAfter: null,
      };
    }, `${recipe.recipeType} recipe ${recipe.id}`);

    console.info(JSON.stringify({
      status: 'passed',
      apiUrl,
      wsUrl,
      player: {
        email: player.email,
        name: client.state.name,
        characterId: client.state.characterId,
        playerId: client.state.playerId,
        reusedAccount: player.reusedAccount,
        snapshots: client.state.snapshots,
        messages: client.state.messages,
      },
      catalog: {
        valid: true,
        totalRecipes: catalog.recipes.length,
        smeltingRecipes: catalog.smeltingRecipes,
        toolRecipes: catalog.toolRecipes,
        equipmentRecipes: catalog.equipmentRecipes,
        unlockedRecipeIds: unlockedRecipes.map((candidate) => candidate.id),
        lockedRecipeIds: lockedRecipes.map((candidate) => candidate.id),
      },
      professions: {
        before: professionsBefore,
        after: result.professionsAfter,
      },
      flow: {
        attempted: true,
        validated: true,
        recipeId: recipe.id,
        recipeType: recipe.recipeType,
        ingredientsBefore: beforeIngredients,
        ingredientsAfter: ingredientSnapshot(client.state.inventory, recipe),
        outputKind: recipe.outputKind,
        outputStackBefore: recipe.recipeType === 'smelting' ? beforeOutputCount : null,
        outputStackAfter: result.outputAfter,
        forgedItem: result.forgedItem,
        toolTierBefore: recipe.recipeType === 'tool' ? beforeToolTier : null,
        toolTierAfter: result.toolTierAfter ?? null,
        event: result.successEvent,
        professionProgressEvent: result.progressEvent,
        professionLevelUpEvents: result.levelUpEvents,
        smithingXPBefore: smithingBefore.xp,
        smithingXPAfter: result.professionsAfter.smithing.xp,
        expectedSmithingXPDelta,
        actualSmithingXPDelta: result.actualSmithingXPDelta,
      },
      checks: {
        borinContract: true,
        canonicalIngredients: true,
        professionContract: true,
        recipeProgressionContract: true,
        recipeUnlockedForSmithingLevel: true,
        commandAccepted: true,
        ingredientsConsumedAtomically: true,
        outputConfirmedByInventoryDelta: recipe.recipeType === 'tool' ? 'not_applicable_profession_bound' : true,
        permanentToolTierConfirmed: recipe.recipeType === 'tool' ? true : 'not_applicable',
        successEventReceived: true,
        smithingXPDeltaConfirmed: true,
        professionProgressEvent: expectedSmithingXPDelta > 0 ? true : 'not_emitted_at_cap',
      },
    }, null, 2));
  }
} finally {
  await closeClient(client);
}
