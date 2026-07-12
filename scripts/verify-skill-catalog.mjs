import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-skill-catalog');
const sourcePath = path.join(root, 'src/shared/SkillCatalog.ts');
const outputPath = path.join(outDir, 'SkillCatalog.mjs');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
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

const catalog = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

const skills = catalog.normalizeSkillCatalog();
assert.deepEqual(skills.map((skill) => skill.id), [
  'arcane-nova',
  'war-cry',
  'charge',
  'heavy-strike',
  'steel-sweep',
  'iron-guard',
]);
assert.deepEqual(
  skills.map(({ id, discipline, targetMode, requiresPhysicalWeapon, stationary, masteryId }) => ({
    id,
    discipline,
    targetMode,
    requiresPhysicalWeapon,
    stationary,
    masteryId,
  })),
  [
    { id: 'arcane-nova', discipline: 'arcana', targetMode: 'self-area', requiresPhysicalWeapon: false, stationary: true, masteryId: undefined },
    { id: 'war-cry', discipline: 'martial', targetMode: 'self', requiresPhysicalWeapon: false, stationary: false, masteryId: undefined },
    { id: 'charge', discipline: 'martial', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: false, masteryId: 'martial' },
    { id: 'heavy-strike', discipline: 'martial', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: true, masteryId: 'martial' },
    { id: 'steel-sweep', discipline: 'martial', targetMode: 'self-area', requiresPhysicalWeapon: true, stationary: true, masteryId: 'martial' },
    { id: 'iron-guard', discipline: 'survival', targetMode: 'self', requiresPhysicalWeapon: false, stationary: true, masteryId: undefined },
  ],
  'legacy fallback metadata must reproduce the six-skill contract',
);
for (const malformedContainer of [{}, 'skills', 17, null]) {
  assert.equal(
    catalog.normalizeSkillCatalog(malformedContainer).length,
    6,
    'non-array skill containers must use the complete legacy fallback',
  );
  assert.equal(
    catalog.catalogSkill(malformedContainer, 'heavy-strike').id,
    'heavy-strike',
    'catalogSkill must tolerate non-array wire containers',
  );
}
assert.equal(catalog.catalogSkill(undefined, 'arcane-bolt'), null, 'legacy fallback must not invent Arcane Bolt');
const announcedBolt = catalog.catalogSkill([{ id: 'arcane-bolt' }], 'arcane-bolt');
assert.ok(announcedBolt, 'wire announcement must unlock Arcane Bolt presentation');
assert.deepEqual(
  {
    manaCost: announcedBolt.manaCost,
    cooldown: announcedBolt.cooldown,
    range: announcedBolt.range,
    discipline: announcedBolt.discipline,
    targetMode: announcedBolt.targetMode,
    stationary: announcedBolt.stationary,
    masteryId: announcedBolt.masteryId,
  },
  { manaCost: 18, cooldown: 2.8, range: 12, discipline: 'arcana', targetMode: 'enemy', stationary: true, masteryId: 'arcana' },
);

const authoritativeHeavy = catalog.catalogSkill([{
  id: 'heavy-strike',
  label: 'Golpe do servidor',
  description: 'Descrição autoritativa.',
  manaCost: 3,
  cooldown: 2.75,
  cooldownRemaining: 1.25,
  discipline: 'martial',
  targetMode: 'enemy',
  requiresPhysicalWeapon: false,
  stationary: true,
  masteryId: 'martial',
}], 'heavy-strike');
assert.equal(authoritativeHeavy.label, 'Golpe do servidor');
assert.equal(authoritativeHeavy.cooldown, 2.75);
assert.equal(authoritativeHeavy.description, 'Descrição autoritativa.');
assert.equal(
  catalog.normalizeSkillState('heavy-strike', {
    id: 'heavy-strike',
    discipline: 'future',
    targetMode: 'future-target',
    requiresPhysicalWeapon: 'yes',
    stationary: null,
  }).targetMode,
  'enemy',
  'malformed metadata must fall back as one coherent cast contract',
);

assert.equal(catalog.catalogSkill(undefined, 'root-snare'), null, 'legacy fallback must not invent Root Snare');
const roots = catalog.catalogSkill([{ id: 'root-snare' }], 'root-snare');
assert.ok(roots);
assert.equal(roots.targetMode, 'ground');
assert.equal(catalog.skillCastPlan(roots).failure, 'ground-target-required');
assert.deepEqual(catalog.skillCastPlan(roots, { groundTargetAvailable: true }), {
  allowed: true, failure: null, skill: 'root-snare', targetMode: 'ground', clearMovement: true,
});

const missingTarget = catalog.skillCastPlan(authoritativeHeavy, {
  selectedTargetId: null,
  selectedTargetIsAliveEnemy: false,
  hasPhysicalWeapon: false,
});
assert.equal(missingTarget.allowed, false);
assert.equal(missingTarget.failure, 'target-required');
const targeted = catalog.skillCastPlan(authoritativeHeavy, {
  selectedTargetId: 'enemy-7',
  selectedTargetIsAliveEnemy: true,
  hasPhysicalWeapon: false,
});
assert.equal(targeted.allowed, true);
assert.equal(targeted.targetId, 'enemy-7');
assert.equal(targeted.clearMovement, true);

const invalidStationaryAttempt = catalog.skillCastPlan(authoritativeHeavy, {
  selectedTargetId: 'enemy-7',
  selectedTargetIsAliveEnemy: true,
  movementInterruptionPlausible: false,
});
assert.equal(invalidStationaryAttempt.allowed, true, 'server must still receive a locally implausible attempt');
assert.equal(invalidStationaryAttempt.clearMovement, false, 'invalid cooldown/mana/jump attempts must not cancel movement locally');

const selfPlan = catalog.skillCastPlan(catalog.catalogSkill(null, 'war-cry'));
assert.equal(selfPlan.allowed, true);
assert.equal(selfPlan.targetId, undefined);
assert.equal(selfPlan.targetMode, 'self');
const novaPlan = catalog.skillCastPlan(catalog.catalogSkill(null, 'arcane-nova'));
assert.equal(novaPlan.targetMode, 'self-area');
assert.equal(novaPlan.clearMovement, true);

const sweep = catalog.catalogSkill(null, 'steel-sweep');
assert.equal(catalog.skillCastPlan(sweep, { hasPhysicalWeapon: false }).failure, 'physical-weapon-required');
assert.equal(catalog.skillCastPlan(sweep, { hasPhysicalWeapon: true }).allowed, true);
assert.equal(
  catalog.skillCastPlan(catalog.catalogSkill(null, 'charge'), { selectedTargetId: 'enemy', selectedTargetIsAliveEnemy: true, hasPhysicalWeapon: false }).allowed,
  true,
  'charge must not inherit Steel Sweep weapon requirements',
);

const initialMastery = catalog.martialMastery();
assert.equal(initialMastery.level, 1);
assert.equal(initialMastery.xpIntoLevel, 0);
assert.equal(initialMastery.xpToNext, 30);
assert.equal(catalog.masteryProgressRatio(initialMastery), 0);
for (const malformedContainer of [{}, 'masteries', 17, null]) {
  assert.deepEqual(
    catalog.martialMastery(malformedContainer),
    initialMastery,
    'non-array mastery containers must use the canonical initial state',
  );
}

const progressing = catalog.martialMastery([{
  id: 'martial', label: 'Maestria Marcial', level: 2, xp: 47, xpIntoLevel: 17, xpToNext: 60, maxLevel: 10, damageBonus: 0.02,
}]);
assert.deepEqual(progressing, {
  id: 'martial', label: 'Maestria Marcial', level: 2, xp: 47, xpIntoLevel: 17, xpToNext: 60, maxLevel: 10, damageBonus: 0.02,
}, 'valid backend progress must survive normalization unchanged');
assert.equal(catalog.masteryProgressRatio(progressing), 17 / 60);

const partial = catalog.normalizeMartialMastery({ xp: 47 });
assert.deepEqual(partial, {
  id: 'martial', label: 'Maestria Marcial', level: 2, xp: 47, xpIntoLevel: 17, xpToNext: 60, maxLevel: 10, damageBonus: 0.02,
}, 'partial progress must derive a coherent canonical state from total XP');

const tampered = catalog.normalizeMartialMastery({
  id: 'martial', label: 'Marcial alterada', level: 99, xp: 47, xpIntoLevel: 900, xpToNext: 1, maxLevel: 99, damageBonus: 0.9,
});
assert.deepEqual(tampered, {
  id: 'martial', label: 'Marcial alterada', level: 2, xp: 47, xpIntoLevel: 17, xpToNext: 60, maxLevel: 10, damageBonus: 0.18,
}, 'tampered derived fields must be rebuilt and bounded by the canonical contract');

const capped = catalog.normalizeMartialMastery({
  id: 'martial', label: 'Marcial', level: 99, xp: 9999, xpIntoLevel: 500, xpToNext: 70, maxLevel: 10, damageBonus: 0.18,
});
assert.equal(capped.level, 10);
assert.equal(capped.xp, 1350);
assert.equal(capped.xpIntoLevel, 0);
assert.equal(capped.xpToNext, 0);
assert.equal(capped.maxLevel, 10);
assert.equal(catalog.masteryProgressRatio(capped), 1);
assert.equal(
  catalog.normalizeMartialMastery({ xp: 47, damageBonus: 0.9 }).damageBonus,
  0.18,
  'wire damage bonus must never exceed the canonical +18% cap',
);

const malformed = catalog.normalizeMartialMastery({
  id: 'broken', label: '', level: -4, xp: Number.NaN, xpIntoLevel: -2, xpToNext: 0, maxLevel: -1, damageBonus: Number.POSITIVE_INFINITY,
});
assert.deepEqual(malformed, initialMastery, 'malformed mastery payload must fall back to a safe 0/30 state');
assert.deepEqual(catalog.normalizeMasteries(undefined, undefined).map(({ id }) => id), ['martial']);
assert.deepEqual(
  catalog.normalizeMasteries([{ id: 'arcana', xp: 47 }], undefined).map(({ id, level, xp }) => ({ id, level, xp })),
  [{ id: 'martial', level: 1, xp: 0 }, { id: 'arcana', level: 2, xp: 47 }],
  'explicit Arcana mastery must use the same bounded canonical curve',
);

const tooltip = catalog.skillCatalogTooltip(authoritativeHeavy, { mastery: progressing });
assert.match(tooltip, /Descrição autoritativa/);
assert.match(tooltip, /Disciplina: Marcial/);
assert.match(tooltip, /Alvo: inimigo selecionado/);
assert.match(tooltip, /Maestria Marcial Nv 2 \(\+2% dano\)/);
assert.match(tooltip, /Recarga 2,8 s/);

const unarmedSweepTooltip = catalog.skillCatalogTooltip(catalog.normalizeSkillState('steel-sweep', {
  id: 'steel-sweep',
  description: 'Requer uma arma física equipada.',
  requiresPhysicalWeapon: true,
}));
assert.equal(
  [...unarmedSweepTooltip.matchAll(/Requer (?:uma )?arma física equipada/gi)].length,
  1,
  'authoritative unarmed descriptions must not duplicate the weapon requirement',
);

const ironGuard = catalog.normalizeSkillState('iron-guard', {
  id: 'iron-guard',
  label: 'Guarda do servidor',
  description: 'Descrição defensiva autoritativa.',
  cooldown: 9.25,
  discipline: 'survival',
  targetMode: 'self',
  stationary: true,
});
const ironTooltip = catalog.skillCatalogTooltip(ironGuard, {
  mechanics: `${ironGuard.description} Por 1,4 s bloqueia 45% do dano; nos primeiros 0,35 s, o bloqueio perfeito reduz 80%; mover, atacar, pular ou usar outra habilidade cancela`,
});
for (const expected of ['Descrição defensiva autoritativa', '1,4 s', '45%', '0,35 s', '80%', 'mover, atacar, pular', 'Recarga 9,3 s']) {
  assert.match(ironTooltip, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Iron Guard tooltip must include ${expected}`);
}

const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
assert.match(hudSource, /id="talent-panel" role="dialog" aria-modal="false" aria-labelledby="talent-panel-title"/);
assert.match(hudSource, /this\.talentClose\.focus\(\{ preventScroll: true \}\)/);
assert.match(hudSource, /restoreFocus\?\.isConnected/);
assert.match(hudSource, /this\.hotbarIronGuardSlot\.setAttribute\('aria-label', tooltip\)/);
const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
assert.match(gameSource, /if \(this\.hud\.closeTalentPanel\(\)\)/, 'Escape/cancel must close the talent dialog first');
const probeSource = await readFile(path.join(root, 'scripts/probe-mastery-flow.mjs'), 'utf8');
assert.match(probeSource, /duplicateTargetWhileOnCooldown/);
assert.match(probeSource, /cooldownValidationRange = Math\.min\(meleeRange, 1\.85\)/);
assert.match(probeSource, /distance2d\(player\.position, enemy\.position\) <= cooldownValidationRange/);
assert.match(probeSource, /entity\.alive/);
assert.match(probeSource, /masteryCapped \? baselineXp : baselineXp \+ 5/);

console.info('skill catalog and Martial Mastery verification passed');
