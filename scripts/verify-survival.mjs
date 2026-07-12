import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-survival');
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
  const output = compiled.outputText.replaceAll("from './SkillCatalog'", "from './SkillCatalog.mjs'");
  await writeFile(path.join(outDir, `${name}.mjs`), output, 'utf8');
}

await compile('SkillCatalog');
await compile('HotbarLoadout');
const catalog = await import(`${pathToFileURL(path.join(outDir, 'SkillCatalog.mjs')).href}?t=${Date.now()}`);
const hotbar = await import(`${pathToFileURL(path.join(outDir, 'HotbarLoadout.mjs')).href}?t=${Date.now()}`);

const legacyIds = ['arcane-nova', 'war-cry', 'charge', 'heavy-strike', 'steel-sweep', 'iron-guard'];
const sevenIds = [...legacyIds, 'arcane-bolt'];
const eightIds = [...sevenIds, 'bulwark-call'];
const legacyWire = legacyIds.map((id) => ({ id }));
const sevenWire = [...legacyWire, { id: 'arcane-bolt', masteryId: 'arcana' }];
const eightWire = [...sevenWire, {
  id: 'bulwark-call',
  label: 'Clamor autoritativo',
  description: 'Provoca e protege.',
  manaCost: 0,
  cooldown: 12,
  cooldownRemaining: 3.5,
  range: 8.5,
  discipline: 'survival',
  targetMode: 'self-area',
  requiresPhysicalWeapon: false,
  stationary: false,
  masteryId: 'survival',
}];

assert.deepEqual(catalog.normalizeSkillCatalog().map((skill) => skill.id), legacyIds);
assert.equal(catalog.catalogSkill(undefined, 'bulwark-call'), null, 'legacy servers must never fabricate Bulwark Call');
assert.equal(catalog.catalogSkill(sevenWire, 'bulwark-call'), null, 'seven-skill servers must never fabricate Bulwark Call');
assert.deepEqual(catalog.normalizeSkillCatalog(eightWire).map((skill) => skill.id), eightIds);
const bulwark = catalog.catalogSkill(eightWire, 'bulwark-call');
assert.ok(bulwark);
assert.deepEqual({
  id: bulwark.id,
  label: bulwark.label,
  manaCost: bulwark.manaCost,
  cooldown: bulwark.cooldown,
  range: bulwark.range,
  discipline: bulwark.discipline,
  targetMode: bulwark.targetMode,
  requiresPhysicalWeapon: bulwark.requiresPhysicalWeapon,
  stationary: bulwark.stationary,
  masteryId: bulwark.masteryId,
}, {
  id: 'bulwark-call',
  label: 'Clamor autoritativo',
  manaCost: 0,
  cooldown: 12,
  range: 8.5,
  discipline: 'survival',
  targetMode: 'self-area',
  requiresPhysicalWeapon: false,
  stationary: false,
  masteryId: 'survival',
});
const repairedBulwark = catalog.normalizeSkillState('bulwark-call', {
  manaCost: -1,
  cooldown: Number.NaN,
  range: -5,
  discipline: 'future',
  targetMode: 'future-ground',
  requiresPhysicalWeapon: 'yes',
  stationary: 'yes',
  masteryId: 'unknown',
});
assert.deepEqual({
  manaCost: repairedBulwark.manaCost,
  cooldown: repairedBulwark.cooldown,
  range: repairedBulwark.range,
  discipline: repairedBulwark.discipline,
  targetMode: repairedBulwark.targetMode,
  requiresPhysicalWeapon: repairedBulwark.requiresPhysicalWeapon,
  stationary: repairedBulwark.stationary,
  masteryId: repairedBulwark.masteryId,
}, {
  manaCost: 0,
  cooldown: 12,
  range: 8.5,
  discipline: 'survival',
  targetMode: 'self-area',
  requiresPhysicalWeapon: false,
  stationary: false,
  masteryId: 'survival',
});
assert.deepEqual(catalog.skillCastPlan(bulwark), {
  allowed: true,
  failure: null,
  skill: 'bulwark-call',
  targetMode: 'self-area',
  clearMovement: false,
});

assert.equal(catalog.survivalMastery(undefined, legacyWire), null, 'legacy six must keep Survival hidden');
assert.equal(catalog.survivalMastery(undefined, sevenWire), null, 'Arcana seven must keep Survival hidden');
assert.equal(
  catalog.survivalMastery(undefined, [...legacyWire.slice(0, 5), { id: 'iron-guard', masteryId: 'survival' }]),
  null,
  'legacy Iron Guard metadata cannot opt into a new mastery bar',
);
const survivalFromSkill = catalog.survivalMastery(undefined, eightWire);
assert.ok(survivalFromSkill);
assert.deepEqual(survivalFromSkill, {
  id: 'survival', label: 'Maestria de Sobrevivência', level: 1, xp: 0,
  xpIntoLevel: 0, xpToNext: 30, maxLevel: 10, damageBonus: 0, defenseBonus: 0,
});
const survival = catalog.survivalMastery([{
  id: 'survival', label: 'Sobrevivência do servidor', xp: 347,
  level: 99, xpIntoLevel: 999, xpToNext: 1, maxLevel: 99,
  damageBonus: 0.9, defenseBonus: 0.08,
}], sevenWire);
assert.deepEqual(survival, {
  id: 'survival', label: 'Sobrevivência do servidor', level: 5, xp: 347,
  xpIntoLevel: 47, xpToNext: 150, maxLevel: 10, damageBonus: 0, defenseBonus: 0.08,
});
const capped = catalog.normalizeMastery('survival', { xp: 99999, damageBonus: 9, defenseBonus: 9 });
assert.equal(capped.level, 10);
assert.equal(capped.xp, 1350);
assert.equal(capped.damageBonus, 0);
assert.equal(capped.defenseBonus, 0.18);
assert.deepEqual(catalog.normalizeMasteries(undefined, sevenWire).map((mastery) => mastery.id), ['martial', 'arcana']);
assert.deepEqual(catalog.normalizeMasteries(undefined, eightWire).map((mastery) => mastery.id), ['martial', 'arcana', 'survival']);
const tooltip = catalog.skillCatalogTooltip(bulwark, { mastery: survival });
assert.match(tooltip, /Sobrevivência do servidor Nv 5 \(\+8% potência defensiva\)/);
assert.doesNotMatch(tooltip, /\+8% dano/);
assert.match(tooltip, /Alcance 8,5 m/);
assert.match(tooltip, /Recarga 12 s/);

const defaultSlots = [...hotbar.DEFAULT_HOTBAR_LOADOUT];
assert.equal(defaultSlots.includes('arcane-bolt'), false);
assert.equal(defaultSlots.includes('bulwark-call'), false);
assert.equal(hotbar.isValidHotbarLoadout(defaultSlots, eightIds), true);
assert.deepEqual(hotbar.announcedSkillIdsFromWire(eightWire), eightIds);
assert.equal(
  hotbar.announcedSkillIdsFromWire([...sevenWire.slice(1), { id: 'bulwark-call' }]),
  null,
  'six arbitrary known ids without the complete legacy base are still partial',
);
const bulwarkSlots = hotbar.replaceHotbarSkill(defaultSlots, 'bulwark-call', 'war-cry', eightIds);
assert.ok(bulwarkSlots);
assert.equal(bulwarkSlots.includes('bulwark-call'), true);
assert.equal(bulwarkSlots.includes('war-cry'), false);
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(bulwarkSlots, sevenIds),
  defaultSlots,
  'downgrade to seven skills must remove only the unavailable optional skill and repair safely',
);

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
for (const token of ["case 'bulwark-call'", "event.skill === 'bulwark-call'", "event.skill === 'bulwark-call-block'", "status.id !== 'bulwark-taunt'"]) {
  assert.match(gameSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(gameSource, /this\.net\.send\(\{\s*type: 'cast-skill'/s);
assert.doesNotMatch(
  gameSource,
  /event\.skill === 'bulwark-call-block'[\s\S]{0,500}(?:\.hp\s*[-+]=|mastery|\.xp\s*[-+]=)/,
  'Bulwark presentation must not apply local mitigation or mastery XP',
);
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
assert.match(hudSource, /id="hotbar-bulwark-call"[^>]*hidden/);
assert.match(hudSource, /id="survival-mastery-summary"[^>]*hidden/);
assert.match(hudSource, /status\.id === 'bulwark-taunt'\) return 'Provocado'/);
assert.match(hudSource, /\+\$\{bonus\}% potência defensiva/);
assert.match(hudSource, /updateIronGuardHotbar\(player, survival\)/);

const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
for (const token of ["'bulwark-call'", "'bulwark-call-block'", "'survival'", 'defenseBonus']) {
  assert.match(typesSource, new RegExp(token));
}

console.info('Survival Mastery, Bulwark Call, 6-of-11 loadout and legacy compatibility verification passed');
