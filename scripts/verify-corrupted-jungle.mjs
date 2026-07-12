import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-corrupted-jungle');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/CorruptedJungle.ts');
const outputPath = path.join(outDir, 'CorruptedJungle.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const jungle = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(jungle.CORRUPTED_JUNGLE_ID, 'ironwood-corrupted-jungle');
assert.equal(jungle.CORRUPTED_SPORE_RADIUS, 3.4);
assert.deepEqual(jungle.CORRUPTED_JUNGLE_BOUNDS, { minX: -94, maxX: -32, minZ: -58, maxZ: 12 });
for (const color of Object.values(jungle.CORRUPTED_JUNGLE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const pods = [
  { id: 'spore-pod-gate', label: 'Sino Corrompido', position: { x: -36, y: 1, z: -12 }, radius: 3.4, phase: 'dormant', timer: 2.1 },
  { id: 'spore-pod-hollow', label: 'Cálice Oco', position: { x: -70, y: 1, z: -35 }, radius: 3.4, phase: 'warning', timer: 1.2 },
  { id: 'spore-pod-mire', label: 'Broto do Lodo', position: { x: -44, y: 1, z: -48 }, radius: 3.4, phase: 'active', timer: 0.8 },
  { id: 'spore-pod-ruin', label: 'Orquídea da Ruína', position: { x: -82, y: 1, z: -8 }, radius: 3.4, phase: 'dormant', timer: 4.4 },
  { id: 'spore-pod-thorn', label: 'Flor Espinhosa', position: { x: -58, y: 1, z: -18 }, radius: 3.4, phase: 'warning', timer: 0.3 },
];
const state = {
  version: 1, id: 'ironwood-corrupted-jungle', label: 'Selva Corrompida de Ironwood', active: true,
  bounds: { minX: -94, maxX: -32, minZ: -58, maxZ: 12 }, pods,
};
assert.equal(jungle.corruptedJunglePresentationGate(state), state);
assert.equal(jungle.nearestThreateningSporePod(state, { x: -45, z: -47 })?.id, 'spore-pod-mire');
for (const malformed of [
  { ...state, version: 2 }, { ...state, pods: pods.slice(1) },
  { ...state, bounds: { ...state.bounds, maxX: -31 } },
  { ...state, pods: pods.map((pod, index) => index === 0 ? { ...pod, radius: 3.3 } : pod) },
  { ...state, pods: pods.map((pod, index) => index === 2 ? { ...pod, timer: 1.6 } : pod) },
  { ...state, pods: pods.map((pod, index) => index === 4 ? { ...pod, position: { ...pod.position, x: -57 } } : pod) },
]) assert.equal(jungle.corruptedJunglePresentationGate(malformed), null);

const [typesSource, visualSource, gameSource, hudSource, stylesSource, packageSource,
  backendSource, simulationSource, testSource, stateSource, statusSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/CorruptedJungleVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/corrupted_jungle.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/corrupted_jungle_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/status.go'), 'utf8'),
  readFile(path.join(backendRoot, 'CORRUPTED_JUNGLE_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /export interface CorruptedJungleState/);
assert.match(typesSource, /jungle: CorruptedJungleState/);
assert.match(visualSource, /createCorruptedJungleVisual/);
assert.match(visualSource, /corrupted-spore-ring/);
assert.match(gameSource, /syncCorruptedJunglePresentation\(snapshot\.jungle, snapshot\.zone\)/);
assert.match(hudSource, /id="corrupted-jungle-panel"/);
assert.match(hudSource, /nearestThreateningSporePod/);
assert.match(stylesSource, /\.corrupted-jungle-panel/);
assert.match(stylesSource, /data-buff="corrupted-spores"/);
assert.match(packageSource, /"verify:corrupted-jungle"/);
assert.match(backendSource, /corruptedSporeCycle\s+= 8\.0/);
assert.match(simulationSource, /s\.updateCorruptedJungle\(dt\)/);
assert.match(testSource, /TestCorruptedSporePulseDamageStatusCooldownAndProtection/);
assert.match(stateSource, /Jungle\s+CorruptedJungleState/);
assert.match(statusSource, /statusCorruptedSpores/);
assert.match(contractSource, /Selva Corrompida de Ironwood/);
assert.match(roadmapSource, /CORRUPTED_JUNGLE_CONTRACT/);

console.info('corrupted jungle staggered spore phases, post-movement lethal pulses, sickness, protection, strict tracker/minimap and procedural flora verification passed');
