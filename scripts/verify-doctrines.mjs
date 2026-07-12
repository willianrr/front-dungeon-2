import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-doctrines');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: sourcePath,
  });
  await writeFile(path.join(outDir, `${name}.mjs`), compiled.outputText, 'utf8');
}

await compile('CombatDoctrines');
await compile('SkillCatalog');
const doctrines = await import(`${pathToFileURL(path.join(outDir, 'CombatDoctrines.mjs')).href}?t=${Date.now()}`);
const catalog = await import(`${pathToFileURL(path.join(outDir, 'SkillCatalog.mjs')).href}?t=${Date.now()}`);

const skillIds = [
  'arcane-nova',
  'war-cry',
  'charge',
  'heavy-strike',
  'steel-sweep',
  'iron-guard',
  'arcane-bolt',
  'bulwark-call',
];
const doctrineIds = [
  'warrior_doctrine_vanguard',
  'warrior_doctrine_arcane_convergence',
  'warrior_doctrine_guardian_cadence',
];
const choices = [
  {
    id: doctrineIds[0],
    label: 'Doutrina da Vanguarda',
    description: 'Investida prepara Varredura de Aço.',
    choiceGroup: 'warrior_combat_doctrine',
    cost: 1,
    requiredMasteryId: 'martial',
    requiredMasteryLevel: 3,
    modifiesSkills: ['charge', 'steel-sweep'],
  },
  {
    id: doctrineIds[1],
    label: 'Convergência Arcana',
    description: 'Dardo e Nova alimentam um ao outro.',
    choiceGroup: 'warrior_combat_doctrine',
    cost: 1,
    requiredMasteryId: 'arcana',
    requiredMasteryLevel: 3,
    modifiesSkills: ['arcane-bolt', 'arcane-nova'],
  },
  {
    id: doctrineIds[2],
    label: 'Cadência Guardiã',
    description: 'Guarda e Baluarte formam uma cadência.',
    choiceGroup: 'warrior_combat_doctrine',
    cost: 1,
    requiredMasteryId: 'survival',
    requiredMasteryLevel: 3,
    modifiesSkills: ['iron-guard', 'bulwark-call'],
  },
];

function talentState(overrides = {}) {
  return {
    talentPoints: 1,
    spentPoints: 0,
    availablePoints: 1,
    talents: {},
    signatureVersion: 1,
    signatureChoices: structuredClone(choices),
    ...overrides,
  };
}

function wireSkills(modifiers = {}) {
  return skillIds.map((id) => ({
    id,
    ...(modifiers[id] ? { modifiers: structuredClone(modifiers[id]) } : {}),
  }));
}

function modifier(id, label = 'Doutrina ativa', description = 'Sinergia autoritativa.') {
  return { id, label, description };
}

const normalized = doctrines.normalizeCombatDoctrineChoices(talentState());
assert.deepEqual(normalized?.map((choice) => choice.id), doctrineIds);
assert.deepEqual(normalized?.map((choice) => choice.modifiesSkills), [
  ['charge', 'steel-sweep'],
  ['arcane-bolt', 'arcane-nova'],
  ['iron-guard', 'bulwark-call'],
]);
assert.deepEqual(doctrines.combatDoctrinePresentationGate(talentState(), wireSkills())?.activeId, null);

// Gate antigo, parcial, malformado e versao desconhecida fica totalmente fechado.
assert.equal(doctrines.combatDoctrinePresentationGate({ talentPoints: 1, talents: {} }, wireSkills()), null);
assert.equal(doctrines.combatDoctrinePresentationGate(talentState({ signatureVersion: 2 }), wireSkills()), null);
assert.equal(doctrines.combatDoctrinePresentationGate(talentState({ signatureChoices: choices.slice(0, 2) }), wireSkills()), null);
assert.equal(doctrines.combatDoctrinePresentationGate(talentState(), wireSkills().slice(0, 6)), null);
assert.equal(doctrines.combatDoctrinePresentationGate(talentState(), wireSkills().slice(0, 7)), null);
assert.equal(doctrines.combatDoctrinePresentationGate(talentState(), [...wireSkills(), { id: 'charge' }]), null);
const duplicateSkillWire = wireSkills();
duplicateSkillWire[7] = { id: 'charge' };
assert.equal(doctrines.combatDoctrinePresentationGate(talentState(), duplicateSkillWire), null);

for (const mutate of [
  (copy) => { copy[0].cost = 2; },
  (copy) => { copy[0].label = ''; },
  (copy) => { copy[0].choiceGroup = 'future_group'; },
  (copy) => { copy[0].requiredMasteryLevel = 4; },
  (copy) => { copy[0].requiredMasteryId = 'arcana'; },
  (copy) => { copy[0].modifiesSkills = ['charge', 'heavy-strike']; },
  (copy) => { copy[2].id = copy[1].id; },
]) {
  const malformed = structuredClone(choices);
  mutate(malformed);
  assert.equal(doctrines.combatDoctrinePresentationGate(talentState({ signatureChoices: malformed }), wireSkills()), null);
}

assert.equal(
  doctrines.combatDoctrinePresentationGate(
    talentState({ talents: { warrior_doctrine_future: 1 } }),
    wireSkills(),
  ),
  null,
  'unknown positive doctrine ranks invalidate the selection',
);
assert.equal(
  doctrines.combatDoctrinePresentationGate(
    talentState({ talents: { warrior_doctrine_future: '1' } }),
    wireSkills(),
  ),
  null,
  'malformed unknown doctrine ranks invalidate the selection',
);
assert.equal(
  doctrines.combatDoctrinePresentationGate(
    talentState({ talents: { [doctrineIds[0]]: 1, [doctrineIds[1]]: 1 } }),
    wireSkills(),
  ),
  null,
  'two active choices invalidate exclusivity',
);

// Uma escolha ativa exige exatamente os dois modifiers dela, sem extras doctrine_*.
const vanguardModifiers = {
  charge: [modifier(doctrineIds[0])],
  'steel-sweep': [modifier(doctrineIds[0])],
};
const activeVanguard = talentState({
  spentPoints: 1,
  availablePoints: 0,
  talents: { [doctrineIds[0]]: 1 },
});
assert.equal(doctrines.combatDoctrinePresentationGate(activeVanguard, wireSkills()), null);
assert.equal(doctrines.combatDoctrinePresentationGate(activeVanguard, wireSkills({ charge: vanguardModifiers.charge })), null);
assert.equal(
  doctrines.combatDoctrinePresentationGate(activeVanguard, wireSkills(vanguardModifiers))?.activeId,
  doctrineIds[0],
);
assert.equal(
  doctrines.combatDoctrinePresentationGate(activeVanguard, wireSkills({
    ...vanguardModifiers,
    'arcane-nova': [modifier(doctrineIds[2])],
  })),
  null,
  'an extra known doctrine modifier closes the whole gate',
);
assert.equal(
  doctrines.combatDoctrinePresentationGate(talentState(), wireSkills({ charge: [modifier(doctrineIds[0])] })),
  null,
  'an isolated modifier cannot opt an unselected doctrine in',
);

const mastery = (id, level) => ({ id, label: id, level, xp: 0, xpIntoLevel: 0, xpToNext: 30, maxLevel: 10, damageBonus: 0 });
const allLevelThree = [mastery('martial', 3), mastery('arcana', 3), mastery('survival', 3)];
assert.equal(doctrines.combatDoctrineCanLearn(talentState(), normalized[0], allLevelThree, normalized), true);
assert.equal(doctrines.combatDoctrineCanLearn(talentState(), normalized[0], [mastery('martial', 2)], normalized), false);
assert.equal(doctrines.combatDoctrineCanLearn(talentState({ availablePoints: 0 }), normalized[0], allLevelThree, normalized), false);
assert.equal(doctrines.combatDoctrineCanLearn(activeVanguard, normalized[1], allLevelThree, normalized), false);
assert.equal(doctrines.combatDoctrineCanLearn(activeVanguard, normalized[0], allLevelThree, normalized), false);

// Modifiers sao dados de apresentacao; normalizacao nao os fabrica e castPlan nao os le.
const plainCharge = catalog.normalizeSkillState('charge', { cooldownRemaining: 0 });
assert.equal(plainCharge.modifiers, undefined);
const modifiedCharge = catalog.normalizeSkillState('charge', {
  cooldownRemaining: 0,
  modifiers: [
    modifier(doctrineIds[0], 'Vanguarda wire', 'Varredura recebe o ímpeto.'),
    { id: doctrineIds[0], label: 'Duplicada', description: 'Ignorada.' },
    { id: '', label: 'Inválida', description: 'Ignorada.' },
    { id: 'future-non-doctrine', label: '', description: 'Inválida.' },
  ],
});
assert.deepEqual(modifiedCharge.modifiers, [modifier(doctrineIds[0], 'Vanguarda wire', 'Varredura recebe o ímpeto.')]);
assert.doesNotMatch(catalog.skillCatalogTooltip(modifiedCharge), /Vanguarda wire/);
assert.match(catalog.skillCatalogTooltip(modifiedCharge, {
  showModifiers: true,
  activeModifierId: doctrineIds[0],
}), /Doutrina: Vanguarda wire — Varredura recebe o ímpeto/);
assert.doesNotMatch(catalog.skillCatalogTooltip(modifiedCharge, {
  showModifiers: true,
  activeModifierId: doctrineIds[1],
}), /Vanguarda wire/);
assert.deepEqual(catalog.skillCastPlan(modifiedCharge, { selectedTargetId: 'enemy-1', selectedTargetIsAliveEnemy: true }),
  catalog.skillCastPlan(plainCharge, { selectedTargetId: 'enemy-1', selectedTargetIsAliveEnemy: true }));

const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const styleSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
const hotbarSource = await readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8');

for (const token of [
  'Doutrina de Combate — escolha 1',
  'combatDoctrinePresentationGate(snapshot.talents, player.skills)',
  'Use Reset para trocar',
  'skill-doctrine-badge',
  'doctrine-modified',
  'activeModifierId',
]) assert.ok(hudSource.includes(token), `HUD is missing ${token}`);
assert.match(hudSource, /combatDoctrineCanLearn\(state, choice, masteries, doctrineChoices\)/);
assert.match(hudSource, /this\.onTalentLearn\(choice\.id\)/);
assert.match(hudSource, /mastery\.id}:\$\{mastery\.level}:\$\{mastery\.xp}/);

for (const token of [
  "'doctrine-vanguard-ready'",
  "'doctrine-vanguard-release'",
  "'doctrine-arcane-flow'",
  "'doctrine-guardian-flow'",
  "event.variant === 'bolt-to-nova' && event.sourceSkill === 'arcane-bolt'",
  "event.variant === 'nova-to-bolt' && event.sourceSkill === 'arcane-nova'",
  "event.variant === 'guard-to-bulwark' && event.sourceSkill === 'iron-guard'",
  "event.variant === 'bulwark-to-guard' && event.sourceSkill === 'bulwark-call'",
]) assert.ok(gameSource.includes(token), `Game is missing ${token}`);
assert.match(gameSource, /const doctrineGate = combatDoctrinePresentationGate\([\s\S]*?this\.doctrinePresentationEnabled = doctrineGate !== null/);
assert.match(gameSource, /this\.activeDoctrinePresentationId = doctrineGate\?\.activeId \?\? null/);
assert.match(gameSource, /const remoteDoctrineCaster = event\.casterId !== this\.net\.playerId/);
for (const doctrineId of doctrineIds) {
  assert.ok(gameSource.includes(`remoteDoctrineCaster || activeDoctrineId === '${doctrineId}'`));
}
assert.doesNotMatch(
  gameSource,
  /event\.skill === 'doctrine-[^']+'[\s\S]{0,700}(?:\.hp\s*[-+]=|\.mana\s*[-+]=|\.xp\s*[-+]=|cooldownRemaining\s*=)/,
  'Doctrine event handling must remain presentation-only',
);

for (const token of [
  '.skill-doctrine-badge',
  '.hotbar-skill-slot.doctrine-modified::after',
  '.buff-icon[data-buff="doctrine-vanguard-momentum"]',
]) assert.ok(styleSource.includes(token), `Styles are missing ${token}`);
for (const token of ['signatureVersion', 'signatureChoices', 'modifiers?', 'DoctrineFlowVariant']) {
  assert.ok(typesSource.includes(token), `Types are missing ${token}`);
}
assert.match(hotbarSource, /version: 2/);
assert.doesNotMatch(hotbarSource, /warrior_doctrine_/);

console.info('Combat Doctrines strict gate, locks, modifiers, presentation and compatibility verification passed');
