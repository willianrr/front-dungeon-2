import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-arhok-frost-coast');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/ArhokFrostCoast.ts');
const outputPath = path.join(outDir, 'ArhokFrostCoast.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const frost = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(frost.ARHOK_FROST_BIOME_ID, 'arhok-frost-coast');
assert.equal(frost.ARHOK_FROST_MAX_EXPOSURE, 100);
assert.deepEqual(frost.ARHOK_FROST_BOUNDS, { minX: -38, maxX: 38, minZ: 32, maxZ: 94 });
for (const color of Object.values(frost.ARHOK_FROST_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const sources = [
  { id: 'arhok-hearth-northwatch', label: 'Braseiro da Vigília', position: { x: 0, y: 1, z: 48 }, radius: 5.5 },
  { id: 'arhok-hearth-west', label: 'Fogueira dos Batedores', position: { x: -19, y: 2, z: 41 }, radius: 4.5 },
  { id: 'arhok-hearth-east', label: 'Fogo do Penhasco', position: { x: 20, y: 3, z: 58 }, radius: 4.5 },
];
const state = {
  version: 1, id: 'arhok-frost-coast', label: 'Costa Fria de Arhok', active: true,
  bounds: { minX: -38, maxX: 38, minZ: 32, maxZ: 94 }, exposure: 48, maxExposure: 100,
  stage: 'chilled', warmth: false, moveSpeedMultiplier: 0.9, warmthSources: sources,
};
assert.equal(frost.arhokFrostBiomePresentationGate(state), state);
assert.equal(frost.arhokFrostStageLabel(state), 'Frio crescente');
assert.equal(frost.arhokFrostColor(state), frost.ARHOK_FROST_PALETTE.chilled);
assert.equal(frost.arhokFrostStageLabel({ ...state, warmth: true }), 'Aquecendo');
for (const malformed of [
  { ...state, version: 2 }, { ...state, exposure: 101 }, { ...state, stage: 'clear' },
  { ...state, moveSpeedMultiplier: 1 }, { ...state, warmthSources: sources.slice(1) },
  { ...state, bounds: { ...state.bounds, minZ: 31 } },
  { ...state, warmthSources: sources.map((source, index) => index === 1 ? { ...source, position: { ...source.position, x: -18 } } : source) },
]) assert.equal(frost.arhokFrostBiomePresentationGate(malformed), null);

const severe = { ...state, exposure: 80, stage: 'frostbitten', moveSpeedMultiplier: 0.78 };
assert.equal(frost.arhokFrostBiomePresentationGate(severe), severe);
assert.equal(frost.arhokFrostStageLabel(severe), 'Congelamento severo');

const [typesSource, visualSource, gameSource, hudSource, stylesSource, packageSource,
  backendSource, testSource, stateSource, statusSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/ArhokFrostVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/arhok_frost.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/arhok_frost_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/status.go'), 'utf8'),
  readFile(path.join(backendRoot, 'ARHOK_FROST_COAST_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /export interface BiomeState/);
assert.match(typesSource, /biome: BiomeState/);
assert.match(visualSource, /createArhokFrostVisual/);
assert.match(visualSource, /arhok-frost-snow-field/);
assert.match(gameSource, /syncArhokFrostPresentation\(snapshot\.biome, snapshot\.zone\)/);
assert.match(gameSource, /updateArhokFrostVisual/);
assert.match(hudSource, /id="arhok-frost-panel"/);
assert.match(hudSource, /arhokFrostBiomePresentationGate\(snapshot\.biome\)/);
assert.match(stylesSource, /\.arhok-frost-panel/);
assert.match(packageSource, /"verify:arhok-frost-coast"/);
assert.match(backendSource, /arhokFrostGainPerSecond\s+= 8\.0/);
assert.match(backendSource, /math\.Min\(player\.hp-1/);
assert.match(testSource, /TestArhokFrostWarmthRecoverySevereDamageAndProtection/);
assert.match(stateSource, /Biome\s+BiomeState/);
assert.match(statusSource, /speed \*= arhokFrostMoveMultiplier\(entity\)/);
assert.match(contractSource, /Costa Fria de Arhok/);
assert.match(roadmapSource, /ARHOK_FROST_COAST_CONTRACT/);

console.info('Arhok frost coast bounds, exposure stages, warmth sources, nonlethal hazard, strict HUD/minimap and procedural biome presentation verification passed');
