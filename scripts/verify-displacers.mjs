import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-displacers');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/Displacers.ts');
const outputPath = path.join(outDir, 'Displacers.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const displacers = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(displacers.DISPLACER_INTERACT_RANGE, 3);
assert.deepEqual(displacers.DISPLACER_DEFINITIONS.map((entry) => entry.id), [
  'displacer-camp',
  'displacer-northwatch',
  'displacer-ironwood',
  'displacer-seal-gate',
  'displacer-deep-vault',
]);
assert.deepEqual(displacers.DISPLACER_DEFINITIONS.map((entry) => entry.requiredLevel), [1, 2, 3, 1, 5]);
assert.equal(displacers.DISPLACER_DEFINITIONS.filter((entry) => entry.defaultActive).length, 1);
for (const color of Object.values(displacers.DISPLACER_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const states = displacers.DISPLACER_DEFINITIONS.map((definition, index) => ({
  id: definition.id,
  label: definition.label,
  zone: definition.zone,
  position: { x: definition.x, y: index * 0.25, z: definition.z },
  interactRange: 3,
  requiredLevel: definition.requiredLevel,
  activated: index < 2,
  current: index === 0,
  canActivate: false,
  canTravel: index === 1,
  ...(index === 0
    ? { lockedReason: 'Âncora atual.' }
    : index > 1
      ? { lockedReason: 'Destino ainda não descoberto.' }
      : {}),
}));
assert.equal(displacers.displacerStatesPresentationGate(states, 'overworld')?.[0], states[0]);
assert.equal(displacers.displacerColor(states[0]), displacers.DISPLACER_PALETTE.current);
assert.equal(displacers.displacerColor(states[1]), displacers.DISPLACER_PALETTE.active);
assert.equal(displacers.displacerColor(states[2]), displacers.DISPLACER_PALETTE.locked);

const activating = states.map((state, index) => ({
  ...state,
  activated: index === 0,
  current: index === 1,
  canActivate: index === 1,
  canTravel: false,
  lockedReason: index === 1 ? undefined : index === 0 ? 'Aproxime-se de uma âncora ativa.' : 'Destino ainda não descoberto.',
}));
assert.equal(displacers.displacerStatesPresentationGate(activating, 'overworld')?.[1], activating[1]);

for (const malformed of [
  states.slice(0, 4),
  states.map((state, index) => index === 1 ? { ...state, id: 'foreign' } : state),
  states.map((state, index) => index === 1 ? { ...state, position: { ...state.position, x: 1 } } : state),
  states.map((state, index) => index === 1 ? { ...state, canTravel: true, activated: false } : state),
  states.map((state, index) => index === 1 ? { ...state, canTravel: true, lockedReason: 'Bloqueado' } : state),
  states.map((state, index) => index === 1 ? { ...state, current: true, canTravel: false, lockedReason: 'Atual' } : state),
  states.map((state, index) => index === 0 ? { ...state, activated: false } : state),
]) assert.equal(displacers.displacerStatesPresentationGate(malformed, 'overworld'), null);
assert.equal(displacers.displacerStatesPresentationGate(states, 'dungeon'), null);

const [typesSource, gameSource, hudSource, visualSource, stylesSource, packageSource,
  backendSource, stateSource, commandSource, progressSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/DisplacerVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/displacers.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/command.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/encounter_progress.go'), 'utf8'),
  readFile(path.join(backendRoot, 'DISPLACERS_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /displacers: DisplacerState\[\]/);
assert.match(typesSource, /type: 'activate-displacer'/);
assert.match(typesSource, /type: 'travel-displacer'/);
assert.match(gameSource, /private interactWithDisplacer/);
assert.match(gameSource, /private reconcileDisplacers/);
assert.match(gameSource, /displacerStatesPresentationGate/);
assert.match(hudSource, /showDisplacerNetwork/);
assert.match(hudSource, /snapshot\.displacers/);
assert.match(visualSource, /createDisplacerVisual/);
assert.match(visualSource, /updateDisplacerVisual/);
assert.match(stylesSource, /\.displacer-destination/);
assert.match(packageSource, /"verify:displacers"/);
assert.match(backendSource, /displacerCombatLockRange\s+= 8\.0/);
assert.match(backendSource, /hashDisplacerStates/);
assert.match(stateSource, /Displacers\s+\[\]DisplacerState/);
assert.match(commandSource, /activate-displacer \/ travel-displacer/);
assert.match(commandSource, /NodeID\s+string `json:"nodeId,omitempty"`/);
assert.match(progressSource, /playerEncounterProgressSaveVersion = 2/);
assert.match(contractSource, /cinco âncoras na ordem canônica/);
assert.match(roadmapSource, /Rede de Displacers.*\*\*Entregue em v1\*\*/s);

console.info('five-node persistent Displacer discovery, combat lock, authoritative permissions, world UI and compatibility verification passed');
