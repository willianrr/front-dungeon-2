import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-treasure-lode');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/TreasureLode.ts');
const outputPath = path.join(outDir, 'TreasureLode.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const lode = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(lode.TREASURE_LODE_ID, 'treasure-lode-ironwood');
assert.equal(lode.TREASURE_LODE_NODE_ID, 'ore-iron-3');
assert.equal(lode.TREASURE_LODE_TOTAL_WAVES, 2);
assert.equal(lode.TREASURE_LODE_ARENA_RADIUS, 11);
for (const color of Object.values(lode.TREASURE_LODE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const base = {
  id: 'treasure-lode-ironwood', label: 'Jazida do Coração de Ferro', nodeId: 'ore-iron-3',
  center: { x: -41, y: 1.2, z: 32 }, chestPosition: { x: -38.4, y: 1.1, z: 33.2 },
  triggerRadius: 3.4, arenaRadius: 11, totalWaves: 2, chestInteractRange: 4,
};
const states = [
  { ...base, phase: 'dormant', wave: 0, remainingEnemies: 0, timer: 0, participant: false, rewardReady: false, canClaim: false, lockedReason: 'Mine o veio rico para desafiar a jazida.' },
  { ...base, phase: 'wave', wave: 1, remainingEnemies: 3, timer: 0, participant: true, rewardReady: false, canClaim: false, lockedReason: 'Derrote os invasores da onda 1.' },
  { ...base, phase: 'intermission', wave: 1, remainingEnemies: 0, timer: 1.2, participant: true, rewardReady: false, canClaim: false, lockedReason: 'A próxima onda se aproxima.' },
  { ...base, phase: 'reward', wave: 2, remainingEnemies: 0, timer: 0, participant: true, rewardReady: true, canClaim: true },
  { ...base, phase: 'cooldown', wave: 0, remainingEnemies: 0, timer: 90, participant: false, rewardReady: false, canClaim: false, lockedReason: 'A jazida se recompõe.' },
];
for (const state of states) {
  assert.equal(lode.treasureLodeStatePresentationGate(state), state);
  assert.ok(lode.treasureLodePhaseLabel(state));
  assert.match(lode.treasureLodeColor(state), /^#/);
}
for (const malformed of [
  { ...states[0], id: 'other' },
  { ...states[0], nodeId: 'ore-iron-2' },
  { ...states[0], chestPosition: { ...states[0].chestPosition, x: -38.5 } },
  { ...states[1], remainingEnemies: 0 },
  { ...states[1], wave: 3 },
  { ...states[2], timer: 1.6 },
  { ...states[3], canClaim: true, lockedReason: 'Bloqueado' },
  { ...states[3], participant: false },
  { ...states[4], timer: 0 },
]) assert.equal(lode.treasureLodeStatePresentationGate(malformed), null);

const [typesSource, gameSource, hudSource, visualSource, stylesSource, packageSource,
  backendSource, miningSource, simulationSource, stateSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/TreasureLodeVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/treasure_lode.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/mining.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'TREASURE_LODE_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /treasureLode\?: TreasureLodeState/);
assert.match(typesSource, /type: 'claim-treasure-lode'/);
assert.match(gameSource, /private interactWithTreasureLode/);
assert.match(gameSource, /private syncTreasureLodePresentation/);
assert.match(gameSource, /triggersTreasureLode/);
assert.match(hudSource, /id="treasure-lode-panel"/);
assert.match(hudSource, /renderTreasureLodeTracker/);
assert.match(visualSource, /createTreasureLodeVisual/);
assert.match(visualSource, /treasure-lode-mineral-chest/);
assert.match(stylesSource, /\.treasure-lode-panel/);
assert.match(packageSource, /"verify:treasure-lode"/);
assert.match(backendSource, /treasureLodePhaseIntermission/);
assert.match(backendSource, /difficultyID: normalizedDifficultyID\(s\.difficultyID\)/);
assert.match(backendSource, /hashTreasureLodeState/);
assert.match(miningSource, /treasureLodeMiningLocked/);
assert.match(simulationSource, /s\.updateTreasureLode\(dt\)/);
assert.match(stateSource, /TreasureLode\s+\*TreasureLodeState/);
assert.match(contractSource, /duas ondas/);
assert.match(roadmapSource, /Primeira jazida[\s\S]*entregue em v1/);

console.info('recurring Ironheart treasure lode trigger, two-wave ambush, committed-tier chest, strict world UI and lifecycle verification passed');
