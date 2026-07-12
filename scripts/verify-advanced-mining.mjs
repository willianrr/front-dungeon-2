import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-advanced-mining');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const sourcePath = path.join(root, 'src/shared/AdvancedMining.ts');
const outputPath = path.join(outDir, 'AdvancedMining.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const mining = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(mining.MINING_TOOL_VERSION, 1);
assert.equal(mining.MINING_FOCUS_DURATION, 4);
assert.equal(mining.MINING_PERFECT_EVENT_RADIUS, 1.8);
assert.deepEqual(mining.MINING_TOOL_DEFINITIONS.map((tool) => ({
  id: tool.id,
  tier: tool.tier,
  cooldown: tool.cooldown,
  perfectEvery: tool.perfectEvery,
  perfectYieldBonus: tool.perfectYieldBonus,
})), [
  { id: 'improvised_pickaxe', tier: 0, cooldown: 0.9, perfectEvery: 0, perfectYieldBonus: 0 },
  { id: 'copper_pickaxe', tier: 1, cooldown: 0.84, perfectEvery: 3, perfectYieldBonus: 1 },
  { id: 'iron_pickaxe', tier: 2, cooldown: 0.76, perfectEvery: 3, perfectYieldBonus: 1 },
  { id: 'mithril_pickaxe', tier: 3, cooldown: 0.68, perfectEvery: 3, perfectYieldBonus: 2 },
]);

for (const tool of mining.MINING_TOOL_DEFINITIONS) {
  assert.equal(mining.miningToolPresentationGate(tool), tool);
  assert.equal(mining.miningToolForTier(tool.tier), tool);
}
for (const malformed of [
  null,
  {},
  { ...mining.MINING_TOOL_DEFINITIONS[1], version: 2 },
  { ...mining.MINING_TOOL_DEFINITIONS[1], id: 'mithril_pickaxe' },
  { ...mining.MINING_TOOL_DEFINITIONS[1], cooldown: 0.83 },
  { ...mining.MINING_TOOL_DEFINITIONS[1], perfectEvery: 2 },
  { ...mining.MINING_TOOL_DEFINITIONS[1], perfectYieldBonus: 2 },
]) assert.equal(mining.miningToolPresentationGate(malformed), null);

const legacyMining = mining.normalizeMiningState({ cooldown: 0.9, cooldownRemaining: 0.2, interactRange: 3.4 });
assert.equal(legacyMining.tool.tier, 0);
assert.equal(legacyMining.cooldown, 0.9);
assert.equal(legacyMining.strikeStreak, 0);
assert.equal(legacyMining.perfectReady, false);
const copperTool = mining.MINING_TOOL_DEFINITIONS[1];
const focused = mining.normalizeMiningState({
  cooldown: 0.84,
  cooldownRemaining: 0.4,
  interactRange: 3.4,
  tool: copperTool,
  focusNodeId: 'ore-copper-1',
  strikeStreak: 2,
  focusRemaining: 3.25,
  perfectReady: true,
});
assert.equal(focused.tool, copperTool);
assert.equal(focused.focusNodeId, 'ore-copper-1');
assert.equal(focused.perfectReady, true);
for (const malformed of [
  { ...focused, tool: { ...copperTool, cooldown: 0.9 } },
  { ...focused, cooldown: 0.9 },
  { ...focused, strikeStreak: 0, perfectReady: false },
  { ...focused, strikeStreak: 2, perfectReady: false },
  { ...focused, focusRemaining: 4.01 },
]) {
  const normalized = mining.normalizeMiningState(malformed);
  assert.equal(normalized.focusNodeId, undefined);
  assert.equal(normalized.strikeStreak, 0);
  assert.equal(normalized.perfectReady, false);
}

const node = (kind, index, overrides = {}) => {
  const contract = {
    copper: { oreKind: 'copper_ore', level: 1, capacity: 5 },
    iron: { oreKind: 'iron_ore', level: 2, capacity: 4 },
    mithril: { oreKind: 'mithril_ore', level: 3, capacity: 3 },
  }[kind];
  return {
    id: `ore-${kind}-${index}`,
    kind,
    oreKind: contract.oreKind,
    position: { x: index * 3, y: 0, z: -index },
    remaining: contract.capacity,
    capacity: contract.capacity,
    requiredLevel: contract.level,
    depleted: false,
    respawnRemaining: 0,
    interactRange: 3.4,
    ...overrides,
  };
};
const legacyCopper = node('copper', 1);
assert.equal(mining.oreNodePresentationGate(legacyCopper)?.legacy, true);
const normalIron = node('iron', 2, { rich: false, baseYield: 1, requiredToolTier: 0 });
assert.equal(mining.oreNodePresentationGate(normalIron)?.baseYield, 1);
const richMithril = node('mithril', 3, {
  rich: true,
  baseYield: 2,
  requiredToolTier: 3,
  requiredLevel: 4,
  capacity: 6,
  remaining: 6,
});
assert.equal(mining.oreNodePresentationGate(richMithril)?.rich, true);
for (const malformed of [
  { ...richMithril, id: 'ore-mithril-2' },
  { ...richMithril, baseYield: 1 },
  { ...richMithril, requiredToolTier: 2 },
  { ...richMithril, capacity: 5, remaining: 5 },
  { ...richMithril, requiredLevel: 3 },
  { ...normalIron, rich: true },
  { ...normalIron, remaining: -1 },
]) assert.equal(mining.oreNodePresentationGate(malformed), null);

const recipes = [
  {
    id: 'forge-copper-pickaxe', label: 'Picareta de Cobre', recipeType: 'tool',
    ingredients: [{ kind: 'copper_bar', count: 2 }], inputKind: 'copper_bar', inputCount: 2,
    outputKind: 'copper_pickaxe', outputCount: 1, requiredLevel: 1, xpReward: 18,
    toolTier: 1, requiredToolTier: 0,
  },
  {
    id: 'forge-iron-pickaxe', label: 'Picareta de Ferro', recipeType: 'tool',
    ingredients: [{ kind: 'iron_bar', count: 2 }, { kind: 'copper_bar', count: 1 }],
    inputKind: 'iron_bar', inputCount: 2, outputKind: 'iron_pickaxe', outputCount: 1,
    requiredLevel: 2, xpReward: 30, toolTier: 2, requiredToolTier: 1,
  },
  {
    id: 'forge-mithril-pickaxe', label: 'Picareta de Mithril', recipeType: 'tool',
    ingredients: [{ kind: 'mithril_bar', count: 2 }, { kind: 'iron_bar', count: 1 }],
    inputKind: 'mithril_bar', inputCount: 2, outputKind: 'mithril_pickaxe', outputCount: 1,
    requiredLevel: 3, xpReward: 48, toolTier: 3, requiredToolTier: 2,
  },
];
for (const recipe of recipes) assert.equal(mining.miningToolRecipeGate(recipe), recipe);
for (const malformed of [
  { ...recipes[0], recipeType: 'equipment' },
  { ...recipes[0], outputKind: 'iron_pickaxe' },
  { ...recipes[0], requiredToolTier: 1 },
  { ...recipes[0], ingredients: [{ kind: 'copper_bar', count: 1 }] },
  { ...recipes[0], outputRarity: 'comum' },
]) assert.equal(mining.miningToolRecipeGate(malformed), null);

const player = { id: 'player-1', kind: 'player' };
const event = {
  id: 'combat-mining-perfect-1',
  type: 'mining-perfect-strike',
  casterId: player.id,
  skill: 'mining-perfect-strike',
  modifierId: 'mithril_pickaxe',
  resourceId: richMithril.id,
  variant: 'mithril',
  amount: 2,
  position: richMithril.position,
  radius: 1.8,
};
const gatedEvent = mining.miningPerfectStrikeEventGate(event, [player], [richMithril]);
assert.equal(gatedEvent?.event, event);
assert.equal(gatedEvent?.node.rich, true);
assert.equal(gatedEvent?.historical, false);
assert.equal(mining.miningPerfectStrikeEventGate(event, [], [richMithril])?.historical, true);
for (const malformed of [
  { ...event, id: '' },
  { ...event, resourceId: 'ore-mithril-2' },
  { ...event, modifierId: 'iron_pickaxe' },
  { ...event, amount: 1 },
  { ...event, variant: 'iron' },
  { ...event, radius: 1.81 },
  { ...event, position: { ...event.position, x: event.position.x + 0.01 } },
  { ...event, damageKind: 'physical' },
]) assert.equal(mining.miningPerfectStrikeEventGate(malformed, [player], [richMithril]), null);

const [gameSource, hudSource, visualSource, stylesSource, typesSource, packageSource, readmeSource,
  backendSource, miningSource, stateSource, professionsSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/OreNodeVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/advanced_mining.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/mining.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/professions.go'), 'utf8'),
  readFile(path.join(backendRoot, 'ADVANCED_MINING_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /recipeType: 'smelting' \| 'tool' \| 'equipment'/);
assert.match(typesSource, /resourceId: string/);
assert.match(typesSource, /type: 'mining-perfect-strike'/);
assert.match(gameSource, /oreNodePresentationGate\(node\)/);
assert.match(gameSource, /miningPerfectStrikeEventGate\(event, entities, oreNodes\)/);
assert.match(gameSource, /event\.type === 'tool_forged'/);
assert.match(gameSource, /recipeType !== 'smelting'/);
assert.match(gameSource, /pending\.recipeType === 'tool'\) return undefined/);
assert.match(hudSource, /type: 'tool', title: 'Forjar picaretas'/);
assert.match(hudSource, /Forjar e equipar · permanente/);
assert.match(visualSource, /readonly rich: boolean/);
assert.match(visualSource, /ore-node-\$\{kind\}-rich-crown/);
assert.match(stylesSource, /data-recipe-type="tool"/);
assert.match(stylesSource, /data-rich="true"/);
assert.match(packageSource, /"verify:advanced-mining"/);
assert.match(readmeSource, /picaret/i);

assert.match(backendSource, /cooldown:\s+0\.68/);
assert.match(backendSource, /perfectYieldBonus:\s+2/);
assert.match(backendSource, /"mining-perfect-strike"/);
assert.match(miningSource, /"tool_forged"/);
assert.match(miningSource, /oreNodeBaseYield/);
assert.match(stateSource, /json:"resourceId,omitempty"/);
assert.match(professionsSource, /json:"pickaxeTier,omitempty"/);
assert.match(contractSource, /terceiro golpe válido/);
assert.match(contractSource, /não ocupa a mochila/);

const perfectVfx = gameSource.slice(
  gameSource.indexOf('private showMiningPerfectStrike'),
  gameSource.indexOf('private showRunicElitePulse'),
);
assert.doesNotMatch(perfectVfx, /this\.net\.send|latestEntities|oreNodeViews|damage|collision|inventory/i,
  'perfect strike VFX must remain presentation-only');

console.info('advanced mining tools, rich veins, perfect-strike gates and forge integration verification passed');
