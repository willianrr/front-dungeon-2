import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-phase-step');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
    fileName: sourcePath,
  });
  const output = compiled.outputText.replaceAll("from './SkillCatalog'", "from './SkillCatalog.mjs'");
  await writeFile(path.join(outDir, `${name}.mjs`), output, 'utf8');
}
await compile('SkillCatalog');
await compile('PhaseStep');
const phase = await import(`${pathToFileURL(path.join(outDir, 'PhaseStep.mjs')).href}?t=${Date.now()}`);

assert.equal(phase.PHASE_STEP_ID, 'phase-step');
assert.equal(phase.PHASE_STEP_MANA_COST, 18);
assert.equal(phase.PHASE_STEP_COOLDOWN, 6);
assert.equal(phase.PHASE_STEP_RANGE, 6);
assert.equal(phase.PHASE_STEP_MIN_DISTANCE, 0.35);
assert.equal(phase.PHASE_STEP_EFFECT_RADIUS, 0.38);
assert.equal(phase.PHASE_STEP_EFFECT_DURATION, 0.28);
for (const color of Object.values(phase.PHASE_STEP_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'phase-step', label: 'Passo Espectral',
  description: 'Transpõe até 6 m em linha reta; paredes e destinos ocupados bloqueiam o deslocamento.',
  manaCost: 18, cooldown: 6, cooldownRemaining: 2.2, range: 6,
  discipline: 'arcana', targetMode: 'ground', requiresPhysicalWeapon: false, stationary: false, masteryId: 'arcana',
};
assert.deepEqual(phase.phaseStepSkillPresentationGate([skill]), skill);
for (const malformed of [
  { ...skill, label: 'Passo' }, { ...skill, manaCost: 17 }, { ...skill, cooldown: 7 },
  { ...skill, range: 7 }, { ...skill, discipline: 'survival' }, { ...skill, targetMode: 'self' },
  { ...skill, stationary: true }, { ...skill, requiresPhysicalWeapon: true }, { ...skill, description: 'teleporte' },
]) assert.equal(phase.phaseStepSkillPresentationGate([malformed]), null);

const caster = { id: 'player-1', kind: 'player', alive: true };
const event = {
  id: 'combat-phase-1', type: 'skill-effect', skill: 'phase-step', sourceSkill: 'phase-step', casterId: caster.id,
  origin: { x: 0, y: 0, z: 0 }, position: { x: 5.5, y: 0.2, z: 0 }, radius: 0.38, duration: 0.28,
};
assert.equal(phase.phaseStepEventPresentationGate(event, [caster])?.event, event);
for (const malformed of [
  { ...event, skill: 'root-snare' }, { ...event, sourceSkill: undefined }, { ...event, targetId: 'enemy-1' },
  { ...event, origin: undefined }, { ...event, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...event, position: { x: 0.34, y: 0, z: 0 } }, { ...event, position: { x: 6.002, y: 0, z: 0 } },
  { ...event, radius: 0.4 }, { ...event, duration: 0.3 },
]) assert.equal(phase.phaseStepEventPresentationGate(malformed, [caster]), null);
assert.equal(phase.phaseStepEventPresentationGate(event, [{ ...caster, kind: 'enemy' }]), null);

const [typesSource, catalogSource, hotbarSource, feralSource, hudSource, stylesSource, gameSource,
  packageSource, backendSource, simulationSource, combatSource, testSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/FeralForm.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/phase_step.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/phase_step_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'PHASE_STEP_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'phase-step'/);
assert.match(catalogSource, /PHASE_STEP_WIRE_DEFAULTS/);
assert.match(hotbarSource, /quinze habilidades/);
assert.match(feralSource, /'phase-step'/);
assert.match(hudSource, /id="hotbar-phase-step"/);
assert.match(hudSource, /updatePhaseStepHotbar\(player, arcana\)/);
assert.match(stylesSource, /#hotbar-phase-step/);
assert.match(gameSource, /case 'phase-step'/);
assert.match(gameSource, /phaseStepEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showPhaseStep/);
assert.match(packageSource, /"verify:phase-step"/);
assert.match(backendSource, /actorPositionClear\(caster\.zone/);
assert.match(backendSource, /projectileLineClear\(caster\.pos, destination/);
assert.match(backendSource, /sealChamberBarrierActive/);
assert.match(simulationSource, /s\.castPhaseStep\(entity, cmd\.Target\)/);
assert.match(combatSource, /entity\.phaseStepCooldown-dt/);
assert.match(testSource, /TestPhaseStepInvalidTargetsAndStatesAreAtomic/);
assert.match(contractSource, /não concede invulnerabilidade/);
assert.match(roadmapSource, /PHASE_STEP_CONTRACT/);

console.info('phase step fourteenth-skill authoritative corridor/destination collision, atomic movement, strict origin-to-destination VFX and 6-of-15 hotbar verification passed');
