import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-seal-chamber');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const sourcePath = path.join(root, 'src/shared/SealChamberPresentation.ts');
const outputPath = path.join(outDir, 'SealChamberPresentation.mjs');
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
const seal = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(seal.SEAL_CHAMBER_VERSION, 1);
assert.equal(seal.SEAL_CHAMBER_ID, 'seal-chamber');
assert.deepEqual(seal.SEAL_CHAMBER_CENTER, { x: 0, y: 0, z: 3 });
assert.equal(seal.SEAL_CHAMBER_TRIGGER_RADIUS, 8.5);
assert.equal(seal.SEAL_CHAMBER_BARRIER_RADIUS, 8);
assert.equal(seal.SEAL_CHAMBER_TOTAL_WAVES, 3);
assert.equal(seal.SEAL_CHAMBER_ARMING_DURATION, 2);
assert.equal(seal.SEAL_CHAMBER_INTERMISSION_DURATION, 1.5);
assert.equal(seal.SEAL_CHAMBER_COMPLETE_DURATION, 3);
assert.equal(seal.SEAL_CHAMBER_MAX_COOLDOWN, 10);

const idle = {
  version: 1,
  id: 'seal-chamber',
  phase: 'idle',
  wave: 0,
  totalWaves: 3,
  remaining: 0,
  timer: 0,
  center: { x: 0, y: 0, z: 3 },
  triggerRadius: 8.5,
  barrierRadius: 8,
  barrierActive: false,
  participant: false,
  rewardEligible: false,
  completed: false,
};

const validStates = [
  idle,
  { ...idle, phase: 'arming', timer: 2 },
  { ...idle, phase: 'wave', wave: 2, remaining: 3, barrierActive: true, participant: true, rewardEligible: true },
  { ...idle, phase: 'intermission', wave: 2, timer: 1.5, barrierActive: true, participant: true },
  { ...idle, phase: 'complete', wave: 3, timer: 3, participant: true, rewardEligible: true, completed: true },
  { ...idle, phase: 'cooldown', wave: 3, timer: 10, completed: true },
];
for (const state of validStates) {
  assert.equal(seal.sealChamberStatePresentationGate(state, 'dungeon'), state);
}
assert.equal(seal.sealChamberStatePresentationGate(idle, 'overworld'), null);
for (const invalid of [
  null,
  [],
  { ...idle, version: 2 },
  { ...idle, id: 'future-room' },
  { ...idle, phase: 'boss' },
  { ...idle, totalWaves: 4 },
  { ...idle, center: { x: 0.01, y: 0, z: 3 } },
  { ...idle, center: { x: 0, y: Number.NaN, z: 3 } },
  { ...idle, triggerRadius: 8.49 },
  { ...idle, barrierRadius: 8.01 },
  { ...idle, timer: -0.01 },
  { ...idle, timer: Number.POSITIVE_INFINITY },
  { ...idle, wave: 1 },
  { ...idle, remaining: 1 },
  { ...idle, barrierActive: true },
  { ...idle, rewardEligible: true },
  { ...idle, phase: 'arming', wave: 1, timer: 1 },
  { ...idle, phase: 'arming', timer: 2.01 },
  { ...idle, phase: 'wave', wave: 0, barrierActive: true },
  { ...idle, phase: 'wave', wave: 1, remaining: 4, barrierActive: true },
  { ...idle, phase: 'intermission', wave: 3, barrierActive: true },
  { ...idle, phase: 'complete', wave: 2 },
  { ...idle, phase: 'cooldown', timer: 10.01 },
]) {
  assert.equal(seal.sealChamberStatePresentationGate(invalid, 'dungeon'), null);
}

const eventBase = {
  id: 'seal-event-1',
  encounterId: 'seal-chamber',
  position: { x: 0, y: 0, z: 3 },
  radius: 8,
};
const arming = { ...eventBase, type: 'encounter-seal-arming', delay: 2 };
const wave = { ...eventBase, id: 'seal-event-2', type: 'encounter-seal-wave', wave: 3 };
const complete = { ...eventBase, id: 'seal-event-3', type: 'encounter-seal-complete' };
const reset = { ...eventBase, id: 'seal-event-4', type: 'encounter-seal-reset' };
assert.deepEqual(seal.sealChamberEventPresentationGate(arming), {
  type: 'arming', position: arming.position, radius: 8, delay: 2,
});
assert.deepEqual(seal.sealChamberEventPresentationGate(wave), {
  type: 'wave', position: wave.position, radius: 8, wave: 3,
});
assert.deepEqual(seal.sealChamberEventPresentationGate(complete), {
  type: 'complete', position: complete.position, radius: 8,
});
assert.deepEqual(seal.sealChamberEventPresentationGate(reset), {
  type: 'reset', position: reset.position, radius: 8,
});
for (const invalid of [
  { ...arming, id: '' },
  { ...arming, encounterId: 'other' },
  { ...arming, position: { x: 0, y: 0, z: 3.1 } },
  { ...arming, radius: 8.1 },
  { ...arming, delay: 1.99 },
  { ...arming, wave: 1 },
  { ...wave, wave: 0 },
  { ...wave, wave: 4 },
  { ...wave, delay: 2 },
  { ...complete, wave: 3 },
  { ...reset, casterId: 'player' },
  { ...reset, amount: 0 },
  { ...reset, type: 'encounter-future' },
]) {
  assert.equal(seal.sealChamberEventPresentationGate(invalid), null);
}

const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const stylesSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');

for (const token of [
  "type: 'encounter-seal-arming'",
  "type: 'encounter-seal-wave'",
  "type: 'encounter-seal-complete'",
  "type: 'encounter-seal-reset'",
  'encounter?: EncounterState',
]) assert.ok(typesSource.includes(token), `types wire is missing ${token}`);

assert.match(gameSource, /sealChamberEventPresentationGate\(event\)/, 'events must cross the shared fail-closed gate');
assert.match(gameSource, /sealChamberStatePresentationGate\(value, zone\)/, 'world state must cross the shared gate');
assert.match(gameSource, /seal-chamber-dormant-marker/, 'dormant seal marker must be visible in-world');
assert.match(gameSource, /seal-chamber-presentation-only-barrier/, 'barrier must name its presentation-only role');
assert.match(gameSource, /visual\.barrierRoot\.enabled = state\.barrierActive/, 'wire must exclusively toggle the barrier');
assert.match(gameSource, /state\.barrierRadius/, 'wire radius must drive barrier geometry');
assert.match(gameSource, /clearSealChamberPresentation\(\)/, 'persistent visuals need explicit cleanup');
assert.match(gameSource, /this\.world\.dungeon\.addChild\(root\)/, 'room visuals must belong to dungeon lifecycle');
for (const tone of ['arming', 'wave', 'complete', 'reset']) {
  assert.match(gameSource, new RegExp(`showSealChamberPulse\\(encounter\\.position, encounter\\.radius, '${tone}'`));
}

const chamberVisualMethod = gameSource.slice(
  gameSource.indexOf('private createSealChamberPresentation'),
  gameSource.indexOf('private updateSealChamberPresentation'),
);
assert.doesNotMatch(chamberVisualMethod, /addComponent\(['"](?:collision|rigidbody)/, 'client barrier must never add collision');
assert.doesNotMatch(chamberVisualMethod, /this\.net\.send|resolve|clamp|distance/, 'client visuals must not simulate confinement');
const commandSection = typesSource.slice(typesSource.indexOf('export type Command ='));
assert.doesNotMatch(commandSection, /seal-chamber|encounter-seal/, 'encounter adds no client command');

assert.match(hudSource, /sealChamberStatePresentationGate\(snapshot\.encounter, snapshot\.zone\)/, 'HUD/minimap must share the gate');
assert.match(hudSource, /Câmara do Selo/);
assert.match(hudSource, /Onda \$\{encounter\.wave\}\/\$\{encounter\.totalWaves\}/);
assert.match(hudSource, /180 moedas \+ 150 EXP/);
assert.match(hudSource, /sem recompensa única nesta investida/);
assert.match(hudSource, /encounter\.barrierActive \? '#e46dff'/, 'minimap ring must expose barrier state');
assert.match(stylesSource, /\.encounter-panel\[hidden\]/, 'invalid/absent state must hide the tracker');
assert.match(stylesSource, /data-phase='wave'/, 'combat phase must not rely only on text/color defaults');
assert.match(packageSource, /"verify:seal-chamber"/, 'package must expose focused verification');

console.info('seal chamber constants, strict wire gates, presentation-only arena, HUD, minimap, events and lifecycle verification passed');
