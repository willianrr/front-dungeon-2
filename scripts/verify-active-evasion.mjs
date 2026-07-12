import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-active-evasion');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/ActiveEvasion.ts');
const outputPath = path.join(outDir, 'ActiveEvasion.mjs');
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
const evasion = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(evasion.ACTIVE_EVASION_MODIFIER_ID, 'targeted_evasion');
assert.equal(evasion.ACTIVE_EVASION_COOLDOWN, 3);
assert.equal(evasion.ACTIVE_EVASION_DURATION, 0.32);
assert.equal(evasion.ACTIVE_EVASION_MAX_DISTANCE, 3.2);
assert.equal(evasion.ACTIVE_EVASION_MIN_DISTANCE, 0.6);
assert.equal(evasion.ACTIVE_EVASION_AVOID_RADIUS, 1.2);
for (const color of Object.values(evasion.ACTIVE_EVASION_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const player = {
  id: 'player-1', kind: 'player', alive: true,
  evade: { cooldown: 3, cooldownRemaining: 0, duration: 0.32, remaining: 0 },
};
let state = evasion.activeEvasionStatePresentationGate(player);
assert.equal(state?.ready, true);
assert.equal(state?.evading, false);
assert.equal(state?.cooldownRatio, 0);
state = evasion.activeEvasionStatePresentationGate({
  ...player,
  evading: true,
  evade: { ...player.evade, cooldownRemaining: 3, remaining: 0.32 },
});
assert.equal(state?.evading, true);
assert.equal(state?.ready, false);
assert.equal(state?.cooldownRatio, 1);
for (const malformed of [
  { ...player, evade: undefined },
  { ...player, kind: 'enemy' },
  { ...player, evade: { ...player.evade, cooldown: 2.9 } },
  { ...player, evade: { ...player.evade, duration: 0.31 } },
  { ...player, evade: { ...player.evade, cooldownRemaining: -0.01 } },
  { ...player, evade: { ...player.evade, cooldownRemaining: 3.01 } },
  { ...player, evade: { ...player.evade, remaining: 0.33 } },
  { ...player, evade: { ...player.evade, extra: true } },
  { ...player, evading: false, evade: { ...player.evade, remaining: 0.1 } },
]) assert.equal(evasion.activeEvasionStatePresentationGate(malformed), null);

const enemy = { id: 'enemy-1', kind: 'enemy', alive: true };
const start = {
  id: 'combat-evade-start', type: 'evade-start', casterId: player.id,
  skill: 'evade', variant: 'start', modifierId: 'targeted_evasion',
  origin: { x: 0, y: 1, z: 0 }, position: { x: 3.2, y: 1, z: 0 }, radius: 3.2, duration: 0.32,
};
const avoid = {
  id: 'combat-evade-avoid', type: 'evade-avoid', casterId: player.id, targetId: enemy.id,
  skill: 'evade', variant: 'avoid', modifierId: 'targeted_evasion',
  position: { x: 3.2, y: 1, z: 0 }, radius: 1.2, duration: 0.32,
};
assert.equal(evasion.activeEvasionEventPresentationGate(start, [player, enemy])?.phase, 'start');
assert.equal(evasion.activeEvasionEventPresentationGate(avoid, [player, enemy])?.phase, 'avoid');
assert.equal(evasion.activeEvasionEventPresentationGate(start, [])?.historical, true);
assert.equal(evasion.activeEvasionEventPresentationGate(avoid, [])?.historical, true);
for (const malformed of [
  { ...start, id: '' },
  { ...start, casterId: '' },
  { ...start, targetId: enemy.id },
  { ...start, variant: 'avoid' },
  { ...start, modifierId: 'evasion' },
  { ...start, origin: { x: Number.NaN, y: 0, z: 0 } },
  { ...start, radius: 0.59 },
  { ...start, radius: 3.21 },
  { ...start, duration: 0.31 },
  { ...start, amount: 1 },
  { ...avoid, targetId: '' },
  { ...avoid, origin: start.origin },
  { ...avoid, radius: 1.19 },
  { ...avoid, sourceSkill: 'iron-guard' },
  { ...avoid, position: { x: 0, y: Infinity, z: 0 } },
]) assert.equal(evasion.activeEvasionEventPresentationGate(malformed, [player, enemy]), null);
assert.equal(evasion.activeEvasionEventPresentationGate(start, [{ ...player, kind: 'enemy' }]), null);
assert.equal(evasion.activeEvasionEventPresentationGate(avoid, [player, { ...enemy, kind: 'player' }]), null);

const [inputSource, gameSource, hudSource, stylesSource, typesSource, packageSource,
  backendSource, combatSource, simulationSource, stateSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/core/Input.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/evasion.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'ACTIVE_EVASION_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /type: 'evade'; entityId: string; target: V3/);
assert.match(typesSource, /type: 'evade-start'/);
assert.match(typesSource, /type: 'evade-avoid'/);
assert.match(inputSource, /e\.button === 2/);
assert.match(inputSource, /ControlLeft/);
assert.match(inputSource, /takeEvades\(\)/);
assert.match(gameSource, /processActiveEvasionInput\(request/);
assert.match(gameSource, /this\.world\.pickGround\(this\.world\.screenRay\(request\.ndc\)\)/);
assert.match(gameSource, /this\.net\.send\(\{ type: 'evade'/);
assert.match(gameSource, /activeEvasionEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showActiveEvasionTrail/);
assert.match(gameSource, /private showActiveEvasionAvoid/);
assert.doesNotMatch(gameSource.slice(
  gameSource.indexOf('private showActiveEvasionTrail'),
  gameSource.indexOf('private showGuardianRetaliationPulse'),
), /this\.net\.send|dealDamage|collision|cooldownRemaining/i, 'evasion VFX must remain presentation-only');
assert.match(hudSource, /activeEvasionStatePresentationGate\(player\)/);
assert.match(hudSource, /RMB · CTRL/);
assert.match(stylesSource, /\.evade-indicator/);
assert.match(packageSource, /"verify:active-evasion"/);

assert.match(backendSource, /evasionCooldownDuration = 3\.0/);
assert.match(backendSource, /evasionDuration\s+= 0\.32/);
assert.match(backendSource, /evasionMaxDistance\s+= 3\.2/);
assert.match(backendSource, /segmentCircleFirstT/);
assert.match(backendSource, /segmentBoundsExitT/);
assert.match(combatSource, /target\.evadeTimer > 0/);
assert.match(combatSource, /pushEvasionAvoidEvent/);
assert.match(simulationSource, /case "evade":/);
assert.match(simulationSource, /commandBlockedDuringEvasion/);
assert.match(stateSource, /Evade\s+\*EvadeState/);
assert.match(contractSource, /não uma nona habilidade/);
assert.match(contractSource, /não evita DoT/);

console.info('active evasion state/event gates, RMB/Ctrl intent, authoritative sweep, HUD and VFX verification passed');
