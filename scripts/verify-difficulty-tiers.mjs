import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-difficulty-tiers');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/DifficultyTiers.ts');
const outputPath = path.join(outDir, 'DifficultyTiers.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const tiers = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.deepEqual(tiers.DIFFICULTY_DEFINITIONS.map((definition) => definition.id), ['normal', 'veteran', 'elite']);
assert.deepEqual(tiers.DIFFICULTY_DEFINITIONS.map((definition) => definition.requiredLevel), [1, 3, 5]);
assert.deepEqual(tiers.DIFFICULTY_DEFINITIONS.map((definition) => definition.affixesPerEnemy), [0, 1, 2]);
assert.deepEqual(tiers.DIFFICULTY_DEFINITIONS.map((definition) => definition.rarePlusChance), [0.24, 0.40, 0.58]);
for (const color of Object.values(tiers.DIFFICULTY_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);
assert.deepEqual(Object.keys(tiers.DIFFICULTY_AFFIXES), [
  'difficulty_fortified', 'difficulty_vicious', 'difficulty_relentless',
]);

function stateFor(id, canChange = true) {
  const current = tiers.DIFFICULTY_DEFINITIONS.find((definition) => definition.id === id);
  const globalLock = canChange ? undefined : 'Aguarde todos retornarem da dungeon.';
  return {
    id: current.id, label: current.label, rank: current.rank,
    enemyHpMultiplier: current.enemyHpMultiplier, enemyDamageMultiplier: current.enemyDamageMultiplier,
    enemySpeedMultiplier: current.enemySpeedMultiplier, xpMultiplier: current.xpMultiplier,
    coinMultiplier: current.coinMultiplier, lootChanceBonus: current.lootChanceBonus,
    itemPowerBonus: current.itemPowerBonus, rarePlusChance: current.rarePlusChance,
    affixesPerEnemy: current.affixesPerEnemy, leaderId: 'player-1', canChange,
    ...(globalLock ? { lockedReason: globalLock } : {}),
    options: tiers.DIFFICULTY_DEFINITIONS.map((option) => {
      const selected = option.id === id;
      return {
        id: option.id, label: option.label, description: option.description, requiredLevel: option.requiredLevel,
        selected, canSelect: canChange && !selected,
        ...((selected || !canChange) ? { lockedReason: selected ? 'Dificuldade atual.' : globalLock } : {}),
      };
    }),
  };
}

const veteran = stateFor('veteran');
assert.equal(tiers.difficultyStatePresentationGate(veteran), veteran);
assert.equal(tiers.difficultyStatePresentationGate(stateFor('elite', false))?.id, 'elite');
for (const malformed of [
  { ...veteran, id: 'nightmare' },
  { ...veteran, enemyHpMultiplier: 1.34 },
  { ...veteran, rarePlusChance: 0.41 },
  { ...veteran, canChange: false },
  { ...veteran, options: veteran.options.slice(0, 2) },
  { ...veteran, options: veteran.options.map((option) => option.id === 'elite' ? { ...option, canSelect: true, lockedReason: 'Bloqueado' } : option) },
  { ...veteran, options: veteran.options.map((option) => ({ ...option, selected: option.id === 'elite' })) },
]) assert.equal(tiers.difficultyStatePresentationGate(malformed), null);

const fallback = tiers.legacyNormalDifficultyState();
assert.equal(fallback.id, 'normal');
assert.equal(fallback.canChange, false);
assert.equal(fallback.options.every((option) => !option.canSelect), true);

const fortified = { ...tiers.DIFFICULTY_AFFIXES.difficulty_fortified, active: true };
const enemy = { id: 'enemy-1', kind: 'enemy', difficultyModifiers: [fortified] };
assert.equal(tiers.difficultyModifiersPresentationGate(enemy, veteran)?.[0], fortified);
for (const malformed of [
  { ...enemy, kind: 'player' },
  { ...enemy, difficultyModifiers: [] },
  { ...enemy, difficultyModifiers: [{ ...fortified, active: false }] },
  { ...enemy, difficultyModifiers: [{ ...fortified, description: '+21%' }] },
  { ...enemy, difficultyModifiers: [{ ...fortified, id: 'unknown' }] },
]) assert.equal(tiers.difficultyModifiersPresentationGate(malformed, veteran), null);
assert.deepEqual(tiers.difficultyModifiersPresentationGate({ id: 'enemy-2', kind: 'enemy' }, stateFor('normal')), []);

const [typesSource, gameSource, hudSource, stylesSource, packageSource, backendSource, aiSource,
  combatSource, stateSource, commandSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/difficulty.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/ai.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/command.go'), 'utf8'),
  readFile(path.join(backendRoot, 'DIFFICULTY_TIERS_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /difficultyModifiers\?: EnemyModifierState\[\]/);
assert.match(typesSource, /difficulty: DifficultyState/);
assert.match(typesSource, /type: 'set-world-difficulty'/);
assert.match(gameSource, /private syncDifficultyAffixVisual/);
assert.match(gameSource, /difficultyStatePresentationGate/);
assert.match(hudSource, /class="difficulty-selector"/);
assert.match(hudSource, /difficultyModifiersPresentationGate/);
assert.match(stylesSource, /\.difficulty-option/);
assert.match(stylesSource, /\.difficulty-affix-chip/);
assert.match(packageSource, /"verify:difficulty-tiers"/);
assert.match(backendSource, /difficultyAffixesFor/);
assert.match(backendSource, /rescaleEnemyDifficulty/);
assert.match(backendSource, /hashDifficultyState/);
assert.match(aiSource, /rescaleEnemyDifficulty\(entity, s\.difficultyID\)/);
assert.match(combatSource, /difficultyXPReward/);
assert.match(combatSource, /pickRarityForDifficulty/);
assert.match(stateSource, /Difficulty\s+DifficultyState/);
assert.match(commandSource, /DifficultyID\s+string `json:"difficultyId,omitempty"`/);
assert.match(contractSource, /Afixos determinísticos/);
assert.match(roadmapSource, /Dificuldades Normal\/Veterano\/Elite.*\*\*Entregue em v1\*\*/s);

console.info('room-wide Normal/Veteran/Elite tiers, deterministic affixes, safe selection, reward scaling and strict presentation verification passed');
