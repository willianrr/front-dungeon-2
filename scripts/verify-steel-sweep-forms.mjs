import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-steel-sweep-forms');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compileShared(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const outputPath = path.join(outDir, `${name}.mjs`);
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
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
}

const forms = await compileShared('SteelSweepForms');
assert.equal(forms.STEEL_SWEEP_TECHNIQUE_VERSION, 1);
assert.equal(forms.STEEL_SWEEP_FORM_REQUIRED_MASTERY_LEVEL, 5);
assert.equal(forms.STEEL_SWEEP_ORBIT_RADIUS, 4.2);
assert.equal(forms.STEEL_SWEEP_ORBIT_MAX_TARGETS, 7);
assert.equal(forms.STEEL_SWEEP_ORBIT_DAMAGE_MULTIPLIER, 0.65);
assert.equal(forms.STEEL_SWEEP_WEDGE_RADIUS, 5.2);
assert.equal(forms.STEEL_SWEEP_WEDGE_ARC_DEGREES, 110);
assert.equal(forms.STEEL_SWEEP_WEDGE_MAX_TARGETS, 3);
assert.equal(forms.STEEL_SWEEP_WEDGE_DAMAGE_MULTIPLIER, 1.15);
assert.deepEqual(forms.STEEL_SWEEP_FORM_IDS, [
  'warrior_sweep_form_orbit',
  'warrior_sweep_form_wedge',
]);
assert.equal(new Set(Object.values(forms.STEEL_SWEEP_FORM_PALETTE)).size, 4);

const choices = [
  {
    id: 'warrior_sweep_form_orbit',
    label: 'Órbita de Aço',
    description: 'Forma circular.',
    choiceGroup: 'warrior_steel_sweep_form',
    cost: 1,
    requiredMasteryId: 'martial',
    requiredMasteryLevel: 5,
    modifiesSkills: ['steel-sweep'],
  },
  {
    id: 'warrior_sweep_form_wedge',
    label: 'Cunha Rompedora',
    description: 'Forma direcional.',
    choiceGroup: 'warrior_steel_sweep_form',
    cost: 1,
    requiredMasteryId: 'martial',
    requiredMasteryLevel: 5,
    modifiesSkills: ['steel-sweep'],
  },
];
const talentState = (talents = {}, availablePoints = 3) => ({
  talentPoints: 12,
  spentPoints: Object.values(talents).reduce((sum, rank) => sum + rank, 0),
  availablePoints,
  talents,
  techniqueVersion: 1,
  techniqueChoices: choices,
});
assert.deepEqual(
  forms.normalizeSteelSweepTechniqueChoices(talentState()).map((choice) => choice.id),
  forms.STEEL_SWEEP_FORM_IDS,
);
for (const malformed of [
  {},
  { ...talentState(), techniqueVersion: 2 },
  { ...talentState(), techniqueChoices: choices.slice(0, 1) },
  { ...talentState(), techniqueChoices: [...choices].reverse() },
  { ...talentState(), techniqueChoices: [{ ...choices[0], cost: 2 }, choices[1]] },
  { ...talentState(), techniqueChoices: [{ ...choices[0], requiredMasteryLevel: 4 }, choices[1]] },
  { ...talentState(), techniqueChoices: [{ ...choices[0], modifiesSkills: ['charge'] }, choices[1]] },
  { ...talentState(), techniqueChoices: [{ ...choices[0], label: '' }, choices[1]] },
]) {
  assert.equal(forms.normalizeSteelSweepTechniqueChoices(malformed), null);
}

const normalizedChoices = forms.normalizeSteelSweepTechniqueChoices(talentState());
assert.deepEqual(forms.steelSweepFormSelection(talentState(), normalizedChoices), { valid: true, activeId: null });
assert.deepEqual(
  forms.steelSweepFormSelection(talentState({ warrior_sweep_form_orbit: 1 }), normalizedChoices),
  { valid: true, activeId: 'warrior_sweep_form_orbit' },
);
for (const talents of [
  { warrior_sweep_form_orbit: 2 },
  { warrior_sweep_form_orbit: 1, warrior_sweep_form_wedge: 1 },
  { warrior_sweep_form_future: 1 },
]) {
  assert.equal(forms.steelSweepFormSelection(talentState(talents), normalizedChoices).valid, false);
}

const skillIds = [
  'arcane-nova', 'war-cry', 'charge', 'heavy-strike',
  'steel-sweep', 'iron-guard', 'arcane-bolt', 'bulwark-call',
];
const skillWire = (modifiers = undefined) => skillIds.map((id) => ({
  id,
  label: id,
  manaCost: 0,
  cooldown: 1,
  cooldownRemaining: 0,
  ...(id === 'steel-sweep' && modifiers ? { modifiers } : {}),
}));
const orbitModifier = { id: 'warrior_sweep_form_orbit', label: 'Órbita', description: 'Circular.' };
const wedgeModifier = { id: 'warrior_sweep_form_wedge', label: 'Cunha', description: 'Cone.' };
const vanguardModifier = { id: 'warrior_doctrine_vanguard', label: 'Vanguarda', description: 'Sinergia.' };

assert.equal(forms.steelSweepFormPresentationGate(talentState(), skillWire())?.activeId, null);
const orbitGate = forms.steelSweepFormPresentationGate(
  talentState({ warrior_sweep_form_orbit: 1 }),
  skillWire([vanguardModifier, orbitModifier]),
);
assert.equal(orbitGate?.activeId, 'warrior_sweep_form_orbit');
assert.equal(orbitGate?.skills.find((skill) => skill.id === 'steel-sweep').modifiers.length, 2);
assert.equal(forms.steelSweepFormPresentationGate(
  talentState({ warrior_sweep_form_orbit: 1 }),
  skillWire([orbitModifier, vanguardModifier]),
), null, 'form must follow doctrine in canonical modifier order');
for (const malformedSkills of [
  skillWire(),
  skillWire([wedgeModifier]),
  skillWire([orbitModifier, wedgeModifier]),
  skillWire([{ id: 'warrior_sweep_form_future', label: 'x', description: 'x' }]),
  [...skillWire([orbitModifier]), { ...skillWire()[0] }],
]) {
  assert.equal(forms.steelSweepFormPresentationGate(
    talentState({ warrior_sweep_form_orbit: 1 }),
    malformedSkills,
  ), null);
}
assert.equal(forms.steelSweepFormPresentationGate(
  { ...talentState({ warrior_sweep_form_orbit: 1 }), techniqueVersion: undefined },
  skillWire([orbitModifier]),
), null, 'legacy wire must hide only the form section');

const masteries = (level) => [{ id: 'martial', label: 'Maestria Marcial', level, xp: 0, xpIntoLevel: 0, xpToNext: 1, maxLevel: 10, damageBonus: 0 }];
assert.equal(forms.steelSweepFormCanLearn(talentState({}, 1), normalizedChoices[0], masteries(5), normalizedChoices), true);
assert.equal(forms.steelSweepFormCanLearn(talentState({}, 1), normalizedChoices[0], masteries(4), normalizedChoices), false);
assert.equal(forms.steelSweepFormCanLearn(talentState({}, 0), normalizedChoices[0], masteries(5), normalizedChoices), false);
assert.equal(forms.steelSweepFormCanLearn(
  talentState({ warrior_sweep_form_wedge: 1 }, 1),
  normalizedChoices[0],
  masteries(5),
  normalizedChoices,
), false);

const caster = {
  id: 'player-1',
  kind: 'player',
  alive: true,
  position: { x: 0, y: 0, z: 0 },
};
const position = { x: 3.25, y: 0, z: -1.5 };
const orbitEvent = {
  id: 'form-event-orbit',
  type: 'steel-sweep-effect',
  casterId: caster.id,
  skill: 'steel-sweep',
  variant: 'axe',
  modifierId: 'warrior_sweep_form_orbit',
  position,
  radius: 4.2,
};
const wedgeEvent = {
  id: 'form-event-wedge',
  type: 'steel-sweep-effect',
  casterId: caster.id,
  skill: 'steel-sweep',
  variant: 'hammer',
  modifierId: 'warrior_sweep_form_wedge',
  position,
  radius: 5.2,
  rotationY: 0,
  arcDegrees: 110,
};
assert.equal(forms.steelSweepFormEventPresentationGate(orbitEvent, [caster])?.formId, 'warrior_sweep_form_orbit');
assert.equal(forms.steelSweepFormEventPresentationGate(wedgeEvent, [caster])?.rotationY, 0);
assert.equal(forms.steelSweepFormEventPresentationGate(wedgeEvent, [])?.historical, true);
assert.equal(forms.steelSweepFormEventPresentationGate(wedgeEvent, [{ ...caster, alive: false }])?.historical, true);
for (const malformed of [
  null,
  {},
  { ...orbitEvent, id: '' },
  { ...orbitEvent, casterId: '' },
  { ...orbitEvent, skill: 'charge' },
  { ...orbitEvent, variant: 'great_axe' },
  { ...orbitEvent, variant: { toString: () => 'axe' } },
  { ...orbitEvent, radius: 4.19 },
  { ...orbitEvent, rotationY: 0 },
  { ...orbitEvent, arcDegrees: 110 },
  { ...wedgeEvent, radius: 5.19 },
  { ...wedgeEvent, rotationY: Number.NaN },
  { ...wedgeEvent, rotationY: undefined },
  { ...wedgeEvent, arcDegrees: 109 },
  { ...wedgeEvent, modifierId: 'warrior_sweep_form_orbit' },
  { ...wedgeEvent, targetId: 'enemy-1' },
  { ...wedgeEvent, amount: 0 },
  { ...wedgeEvent, sourceSkill: 'steel-sweep' },
  { ...wedgeEvent, duration: 1 },
]) {
  assert.equal(forms.steelSweepFormEventPresentationGate(malformed, [caster]), null);
}
assert.equal(forms.steelSweepFormEventPresentationGate(wedgeEvent, [{ ...caster, kind: 'enemy' }]), null);
assert.equal(forms.steelSweepFormEventPresentationGate(wedgeEvent, [caster, { ...caster }]), null);

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const stylesSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
const skillCatalogSource = await readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8');
const doctrineSource = await readFile(path.join(root, 'src/shared/CombatDoctrines.ts'), 'utf8');
const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');
const readmeSource = await readFile(path.join(root, 'README.md'), 'utf8');

assert.match(typesSource, /techniqueVersion\?: number/);
assert.match(typesSource, /techniqueChoices\?: SteelSweepTechniqueChoiceState\[\]/);
assert.match(typesSource, /type: 'steel-sweep-effect'/);
assert.match(typesSource, /modifierId: 'warrior_sweep_form_orbit' \| 'warrior_sweep_form_wedge'/);
assert.match(typesSource, /type: 'cast-skill'[\s\S]*target\?: V3/);
assert.match(gameSource, /steelSweepFormEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /showSteelSweepOrbit\(form\.position, form\.radius, event\.casterId, form\.variant\)/);
assert.match(gameSource, /showSteelSweepWedge\([\s\S]*form\.rotationY![\s\S]*form\.arcDegrees!/);
assert.match(gameSource, /const sweepAim = plan\.skill === 'steel-sweep'/);
assert.match(gameSource, /target: \{ x: sweepAim\.x, y: sweepAim\.y, z: sweepAim\.z \}/);
assert.match(gameSource, /steel-sweep-form-orbit-authoritative-ring/);
assert.match(gameSource, /steel-sweep-form-wedge-authoritative-sector/);

const orbitMethod = gameSource.slice(
  gameSource.indexOf('private showSteelSweepOrbit'),
  gameSource.indexOf('private showSteelSweepWedge'),
);
assert.match(orbitMethod, /this\.showSteelSweep\(position, radius, casterId, variant\)/);
assert.doesNotMatch(orbitMethod, /latestEntities|this\.views|this\.net\.send|damage|collision/i);
const wedgeMethod = gameSource.slice(
  gameSource.indexOf('private showSteelSweepWedge'),
  gameSource.indexOf('/** Feedback curto de aplicacao'),
);
assert.match(wedgeMethod, /const halfArcRadians = arcDegrees \* Math\.PI \/ 360/);
assert.match(wedgeMethod, /const yaw = rotationY \+ offset/);
assert.doesNotMatch(wedgeMethod, /latestEntities|this\.views|this\.net\.send|damage|collision/i);

assert.match(hudSource, /Forma da Varredura — escolha 1/);
assert.match(hudSource, /steelSweepFormPresentationGate\(snapshot\.talents, player\.skills\)/);
assert.match(hudSource, /steelSweepFormCanLearn\(state, choice, masteries, sweepFormChoices\)/);
assert.match(hudSource, /dataset\.steelSweepForm/);
assert.match(hudSource, /'ÓRBITA'/);
assert.match(hudSource, /'CUNHA'/);
assert.match(hudSource, /skill-form-badge/);
assert.match(stylesSource, /\.steel-sweep-form-choices/);
assert.match(stylesSource, /data-geometry='orbit'/);
assert.match(stylesSource, /data-geometry='wedge'/);
assert.match(stylesSource, /\.hotbar-steel-sweep-form-badge/);
assert.match(skillCatalogSource, /activeModifierIds\?: readonly string\[\]/);
assert.match(skillCatalogSource, /const category = modifier\.id\.startsWith\('warrior_sweep_form_'\) \? 'Forma' : 'Doutrina'/);
assert.match(doctrineSource, /modifier\.id\.startsWith\('warrior_doctrine_'\)/, 'doctrine gate must remain independent');
assert.match(packageSource, /"verify:steel-sweep-forms"/);
assert.match(readmeSource, /Formas da Varredura/);

console.info('Steel Sweep Forms choices, strict gates, aimed wire, geometry VFX, HUD and doctrine compatibility verification passed');
