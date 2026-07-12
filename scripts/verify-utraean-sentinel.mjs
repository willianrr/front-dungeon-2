import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-utraean-sentinel');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/UtraeanSentinel.ts');
const outputPath = path.join(outDir, 'UtraeanSentinel.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const sentinel = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(sentinel.UTRAEAN_SENTINEL_VARIANT, 'utraeanSentinel');
assert.equal(sentinel.UTRAEAN_LANCE_RANGE, 12);
assert.equal(sentinel.UTRAEAN_LANCE_HALF_WIDTH, 0.9);
assert.equal(sentinel.UTRAEAN_LANCE_WINDUP, 0.85);
assert.equal(sentinel.UTRAEAN_LANCE_INTERRUPTED_RECOVERY, 1.8);
assert.deepEqual(sentinel.UTRAEAN_LANCE_INTERRUPT_SKILLS, [
  'heavy-strike', 'charge', 'steel-sweep', 'arcane-nova', 'arcane-bolt', 'chain-lightning',
]);
for (const color of Object.values(sentinel.UTRAEAN_SENTINEL_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const guardian = { id: 'enemy-sentinel', kind: 'enemy', enemyVariant: 'utraeanSentinel' };
const player = { id: 'player-1', kind: 'player' };
const warning = {
  id: 'combat-warning', type: 'utraean-lance-warning', casterId: guardian.id, skill: 'utraean-lance',
  origin: { x: 0, y: 1, z: 0 }, position: { x: 12, y: 1, z: 0 }, radius: 0.9, delay: 0.85,
};
assert.equal(sentinel.utraeanSentinelEventPresentationGate(warning, [guardian, player])?.type, 'warning');
const impact = { ...warning, id: 'combat-impact', type: 'utraean-lance-impact' };
delete impact.delay;
assert.equal(sentinel.utraeanSentinelEventPresentationGate(impact, [guardian, player])?.type, 'impact');
const interrupted = {
  id: 'combat-interrupt', type: 'utraean-lance-interrupted', casterId: player.id, targetId: guardian.id,
  skill: 'utraean-lance', sourceSkill: 'chain-lightning', position: { x: 0, y: 1, z: 0 }, duration: 1.8,
};
assert.equal(sentinel.utraeanSentinelEventPresentationGate(interrupted, [guardian, player])?.type, 'interrupted');
for (const malformed of [
  { ...warning, skill: 'other' }, { ...warning, radius: 1 }, { ...warning, delay: 0.8 },
  { ...warning, position: { x: 11.9, y: 1, z: 0 } }, { ...warning, origin: undefined },
  { ...interrupted, sourceSkill: 'war-cry' }, { ...interrupted, duration: 2 },
]) assert.equal(sentinel.utraeanSentinelEventPresentationGate(malformed, [guardian, player]), null);
assert.equal(sentinel.utraeanSentinelEventPresentationGate(warning, [{ ...guardian, enemyVariant: 'zombie' }, player]), null);

const [typesSource, presentationSource, gameSource, hudSource, visualSource, packageSource,
  backendSource, relaySource, aiSource, movementSource, simulationSource, testSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/RangedEnemyPresentation.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/UtraeanRelayVisual.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/utraean_sentinel.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/utraean_relay.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/ai.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/movement.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/utraean_sentinel_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'UTRAEAN_SENTINEL_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'utraeanSentinel'/);
assert.match(typesSource, /type: 'utraean-lance-warning'/);
assert.match(presentationSource, /targetName: 'Sentinela Utraeano'/);
assert.match(gameSource, /ensureUtraeanSentinelVisual/);
assert.match(gameSource, /utraeanSentinelEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /showUtraeanLanceWarning/);
assert.match(gameSource, /showUtraeanLanceImpact/);
assert.match(gameSource, /showUtraeanLanceInterrupted/);
assert.match(hudSource, /state\.guardianActive \? 'Tempo pausado'/);
assert.match(visualSource, /state\.guardianActive/);
assert.match(packageSource, /"verify:utraean-sentinel"/);
assert.match(backendSource, /utraeanLanceWindup\s+= 0\.85/);
assert.match(backendSource, /maybeInterruptUtraeanLance/);
assert.match(relaySource, /spawnUtraeanRelayGuardian/);
assert.match(relaySource, /combate de recuperação: o relógio fica congelado/);
assert.match(aiSource, /VariantUtraeanSentinel/);
assert.match(movementSource, /utraeanSentinelCommitted/);
assert.match(simulationSource, /s\.resolvePendingUtraeanLances\(\)/);
assert.match(testSource, /TestUtraeanLanceCommitsLineSidestepImpactEvadeAndRealtime/);
assert.match(contractSource, /direção congelada/);
assert.match(roadmapSource, /UTRAEAN_SENTINEL_CONTRACT/);

console.info('Utraean wrong-rune sentinel, paused relay recovery combat, committed line lance, sidestep/jump/evade, explicit interrupts and strict VFX verification passed');
