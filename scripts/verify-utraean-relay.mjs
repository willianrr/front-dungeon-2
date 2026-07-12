import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-utraean-relay');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/UtraeanRelay.ts');
const outputPath = path.join(outDir, 'UtraeanRelay.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const relay = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(relay.UTRAEAN_RELAY_ID, 'utraean-rune-relay');
assert.equal(relay.UTRAEAN_RELAY_DURATION, 30);
assert.equal(relay.UTRAEAN_RELAY_REWARD_DURATION, 20);
assert.equal(relay.UTRAEAN_RELAY_COOLDOWN, 90);
assert.equal(relay.UTRAEAN_RELAY_RUNES.length, 3);
for (const color of Object.values(relay.UTRAEAN_RELAY_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const runeState = (sequence, progress, phase) => relay.UTRAEAN_RELAY_RUNES.map((rune) => {
  const step = sequence.indexOf(rune.id);
  return {
    id: rune.id, label: rune.label, position: { x: rune.x, y: 1, z: rune.z }, sequenceStep: step,
    activated: step >= 0 && step < progress, current: phase === 'active' && step === progress,
  };
});
const base = {
  id: 'utraean-rune-relay', label: 'Circuito Rúnico Utraeano',
  center: { x: 50, y: 1, z: -38 }, chestPosition: { x: 52, y: 1, z: -38 },
  consoleInteractRange: 3.4, chestInteractRange: 3.6, guardianActive: false,
};
const sequence = ['utraean-rune-sun', 'utraean-rune-tide', 'utraean-rune-star'];
const states = [
  { ...base, phase: 'dormant', runes: runeState([], 0, 'dormant'), sequence: [], progress: 0, timer: 0, participant: false, claimed: false, canClaim: false, lockedReason: 'Ative o console.' },
  { ...base, phase: 'active', runes: runeState(sequence, 1, 'active'), sequence, progress: 1, timer: 18.5, participant: true, claimed: false, canClaim: false, lockedReason: 'Sincronize as runas.' },
  { ...base, phase: 'active', guardianActive: true, guardianId: 'enemy-sentinel-1', runes: runeState(sequence, 0, 'active'), sequence, progress: 0, timer: 25, participant: true, claimed: false, canClaim: false, lockedReason: 'Derrote o Sentinela; relógio pausado.' },
  { ...base, phase: 'reward', runes: runeState(sequence, 3, 'reward'), sequence, progress: 3, timer: 12, participant: true, claimed: false, canClaim: true },
  { ...base, phase: 'reward', runes: runeState(sequence, 3, 'reward'), sequence, progress: 3, timer: 8, participant: true, claimed: true, canClaim: false, lockedReason: 'Sua recompensa já foi recolhida.' },
  { ...base, phase: 'cooldown', runes: runeState([], 0, 'cooldown'), sequence: [], progress: 0, timer: 44, participant: false, claimed: false, canClaim: false, lockedReason: 'Recompondo.' },
];
for (const state of states) {
  assert.equal(relay.utraeanRelayStatePresentationGate(state), state);
  assert.ok(relay.utraeanRelayPhaseLabel(state));
  assert.match(relay.utraeanRelayColor(state), /^#/);
}
for (const malformed of [
  { ...states[0], center: { ...states[0].center, x: 49 } },
  { ...states[1], sequence: [sequence[0], sequence[0], sequence[2]] },
  { ...states[1], timer: 31 },
  { ...states[1], runes: states[1].runes.map((rune, index) => index === 2 ? { ...rune, current: true } : rune) },
  { ...states[1], guardianActive: true },
  { ...states[2], guardianId: undefined },
  { ...states[3], progress: 2 },
  { ...states[3], canClaim: true, lockedReason: 'Bloqueado' },
  { ...states[4], canClaim: true },
  { ...states[5], timer: 0 },
]) assert.equal(relay.utraeanRelayStatePresentationGate(malformed), null);

const [typesSource, gameSource, hudSource, visualSource, stylesSource, packageSource,
  backendSource, simulationSource, stateSource, testSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/UtraeanRelayVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/utraean_relay.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/utraean_relay_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'UTRAEAN_RELAY_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /utraeanRelay\?: UtraeanRelayState/);
assert.match(typesSource, /type: 'activate-utraean-rune'/);
assert.match(gameSource, /private interactWithUtraeanConsole/);
assert.match(gameSource, /private interactWithUtraeanRune/);
assert.match(gameSource, /private interactWithUtraeanChest/);
assert.match(gameSource, /syncUtraeanRelayPresentation\(snapshot\.utraeanRelay, snapshot\.zone\)/);
assert.match(hudSource, /id="utraean-relay-panel"/);
assert.match(hudSource, /renderUtraeanRelayTracker/);
assert.match(visualSource, /createUtraeanRelayVisual/);
assert.match(visualSource, /utraean-reward-chest/);
assert.match(stylesSource, /\.utraean-relay-panel/);
assert.match(packageSource, /"verify:utraean-relay"/);
assert.match(backendSource, /utraeanRelayWrongRunePenalty\s+= 5\.0/);
assert.match(backendSource, /inventoryCanReceiveStacks/);
assert.match(backendSource, /hashUtraeanRelayState/);
assert.match(simulationSource, /s\.updateUtraeanRelay\(dt\)/);
assert.match(stateSource, /UtraeanRelay\s+\*UtraeanRelayState/);
assert.match(testSource, /TestUtraeanRelayPersonalAtomicRewardsAndRecurringRotation/);
assert.match(contractSource, /3 minérios de mithril/);
assert.match(roadmapSource, /UTRAEAN_RELAY_CONTRACT/);

console.info('recurring Utraean three-rune relay, shared timer, wrong-rune penalty, personal atomic mithril rewards, strict world UI and lifecycle verification passed');
