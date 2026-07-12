import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-arcana');
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
  const outputPath = path.join(outDir, `${name}.mjs`);
  await writeFile(outputPath, compiled.outputText, 'utf8');
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
}

const catalog = await compile('SkillCatalog');
const motion = await compile('ProjectileMotion');

const legacyIds = ['arcane-nova', 'war-cry', 'charge', 'heavy-strike', 'steel-sweep', 'iron-guard'];
assert.deepEqual(catalog.normalizeSkillCatalog().map((skill) => skill.id), legacyIds);
assert.deepEqual(catalog.normalizeSkillCatalog({ broken: true }).map((skill) => skill.id), legacyIds);
assert.equal(catalog.catalogSkill(undefined, 'arcane-bolt'), null, 'old servers must never fabricate Arcane Bolt');

const wireSkills = [
  ...legacyIds.map((id) => ({ id })),
  {
    id: 'arcane-bolt',
    label: 'Dardo do servidor',
    description: 'Projétil autoritativo.',
    manaCost: 18,
    cooldown: 2.8,
    cooldownRemaining: 1.2,
    range: 12,
    discipline: 'arcana',
    targetMode: 'enemy',
    requiresPhysicalWeapon: false,
    stationary: true,
    masteryId: 'arcana',
    pending: true,
  },
  {
    id: 'bulwark-call',
    discipline: 'survival',
    targetMode: 'self-area',
    stationary: false,
    masteryId: 'survival',
  },
];
const skills = catalog.normalizeSkillCatalog(wireSkills);
assert.equal(skills.length, 8);
assert.deepEqual(skills.map((skill) => skill.id), [...legacyIds, 'arcane-bolt', 'bulwark-call']);
const bolt = catalog.catalogSkill(wireSkills, 'arcane-bolt');
assert.ok(bolt);
assert.deepEqual(
  {
    id: bolt.id,
    label: bolt.label,
    manaCost: bolt.manaCost,
    cooldown: bolt.cooldown,
    range: bolt.range,
    discipline: bolt.discipline,
    targetMode: bolt.targetMode,
    stationary: bolt.stationary,
    masteryId: bolt.masteryId,
    pending: bolt.pending,
  },
  {
    id: 'arcane-bolt',
    label: 'Dardo do servidor',
    manaCost: 18,
    cooldown: 2.8,
    range: 12,
    discipline: 'arcana',
    targetMode: 'enemy',
    stationary: true,
    masteryId: 'arcana',
    pending: true,
  },
);
const repairedBolt = catalog.normalizeSkillState('arcane-bolt', {
  id: 'arcane-bolt', manaCost: -9, cooldown: Number.NaN, range: -1,
  discipline: 'future', targetMode: 'future-ground', stationary: 'yes', masteryId: 'unknown',
});
assert.equal(repairedBolt.manaCost, 18);
assert.equal(repairedBolt.cooldown, 2.8);
assert.equal(repairedBolt.range, 12);
assert.equal(repairedBolt.discipline, 'arcana');
assert.equal(repairedBolt.targetMode, 'enemy');
assert.equal(repairedBolt.stationary, true);
assert.equal(repairedBolt.masteryId, 'arcana');

const boltPlan = catalog.skillCastPlan(bolt, {
  selectedTargetId: 'enemy-7',
  selectedTargetIsAliveEnemy: true,
  movementInterruptionPlausible: true,
});
assert.equal(boltPlan.allowed, true);
assert.equal(boltPlan.targetId, 'enemy-7');
assert.equal(boltPlan.clearMovement, true);
assert.equal(catalog.skillCastPlan(bolt, { selectedTargetId: null }).failure, 'target-required');

assert.deepEqual(catalog.normalizeMasteries(undefined, undefined).map((mastery) => mastery.id), ['martial']);
assert.equal(catalog.arcanaMastery(undefined, undefined), null, 'Arcana bar must stay hidden for old servers');
const arcanaFromSkill = catalog.arcanaMastery(undefined, wireSkills);
assert.ok(arcanaFromSkill);
assert.equal(arcanaFromSkill.id, 'arcana');
assert.equal(arcanaFromSkill.xpToNext, 30);

const arcana = catalog.arcanaMastery([{
  id: 'arcana', label: 'Maestria Arcana', level: 99, xp: 347,
  xpIntoLevel: 999, xpToNext: 1, maxLevel: 99, damageBonus: 0.08,
}], wireSkills);
assert.deepEqual(arcana, {
  id: 'arcana', label: 'Maestria Arcana', level: 5, xp: 347,
  xpIntoLevel: 47, xpToNext: 150, maxLevel: 10, damageBonus: 0.08,
});
const cappedArcana = catalog.arcanaMastery([{ id: 'arcana', xp: 99999, damageBonus: 9 }], wireSkills);
assert.equal(cappedArcana.level, 10);
assert.equal(cappedArcana.xp, 1350);
assert.equal(cappedArcana.xpIntoLevel, 0);
assert.equal(cappedArcana.xpToNext, 0);
assert.equal(cappedArcana.damageBonus, 0.18);
assert.equal(catalog.masteryProgressRatio(cappedArcana), 1);
assert.deepEqual(catalog.normalizeMasteries([{ id: 'broken' }], undefined).map((mastery) => mastery.id), ['martial']);

const nova = catalog.catalogSkill([{ id: 'arcane-nova', masteryId: 'arcana' }], 'arcane-nova');
const novaTooltip = catalog.skillCatalogTooltip(nova, { mastery: arcana });
const boltTooltip = catalog.skillCatalogTooltip(bolt, { mastery: arcana });
for (const tooltip of [novaTooltip, boltTooltip]) {
  assert.match(tooltip, /Maestria Arcana Nv 5 \(\+8% dano\)/);
}
assert.match(boltTooltip, /Alcance 12 m/);
assert.match(boltTooltip, /18 mana/);
assert.match(boltTooltip, /Recarga 2,8 s/);

assert.equal(motion.isSupportedProjectileKind('corruptedShard'), true);
assert.equal(motion.isSupportedProjectileKind('arcaneBolt'), true);
assert.equal(motion.isSupportedProjectileKind('futureBolt'), false);
const shardPresentation = motion.projectilePresentation('corruptedShard');
const boltPresentation = motion.projectilePresentation('arcaneBolt');
assert.notEqual(shardPresentation.coreColor, boltPresentation.coreColor);
assert.equal(boltPresentation.coreColor, '#f5ffff');
assert.equal(boltPresentation.trailColor, '#69e9ff');
for (const color of [boltPresentation.coreColor, boltPresentation.trailColor, boltPresentation.lightColor]) {
  assert.match(color, /^#[0-9a-f]{6}$/i);
}
const p0 = motion.extrapolatedProjectilePosition({
  position: { x: 2, y: 1, z: 3 },
  velocity: { x: 8, y: 0, z: -2 },
}, 0);
const p1 = motion.extrapolatedProjectilePosition({
  position: { x: 2, y: 1, z: 3 },
  velocity: { x: 8, y: 0, z: -2 },
}, 0.1);
assert.deepEqual(p0, { x: 2, y: 1, z: 3 });
assert.deepEqual(p1, { x: 2.8, y: 1, z: 2.8 });
assert.notDeepEqual(p0, p1, 'Arcane Bolt must expose visible motion between at least two positions');

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
for (const effect of ['arcane-bolt', 'arcane-bolt-impact', 'arcane-bolt-slow']) {
  assert.match(gameSource, new RegExp(`event\\.skill === '${effect}'`));
}
assert.match(gameSource, /!isSupportedProjectileKind\(projectile\.kind\)/);
assert.match(gameSource, /projectilePresentation\(state\.kind\)/);
assert.match(gameSource, /this\.net\.send\(\{\s*type: 'cast-skill'/s, 'casts must still be sent to the authoritative server');
assert.doesNotMatch(gameSource, /event\.skill === 'arcane-bolt-impact'[\s\S]{0,400}(?:target\.hp|\.hp\s*[-+]=)/, 'impact VFX must not apply local damage');

const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
assert.match(hudSource, /id="arcana-mastery-summary"[^>]*hidden/);
assert.match(hudSource, /status\.id === 'arcane-slow'\) return 'Descompasso'/);
assert.match(hudSource, /skill\.pending === true/);
assert.match(hudSource, /updateArcaneNovaHotbar\(player, arcana\)/);
assert.match(hudSource, /updateArcaneBoltHotbar\(player, arcana\)/);

const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
for (const token of ["'arcane-bolt'", "'arcane-bolt-impact'", "'arcane-bolt-slow'", "'arcaneBolt'", "'arcana'"]) {
  assert.match(typesSource, new RegExp(token));
}

console.info('Arcane Mastery, Arcane Bolt contract, presentation and compatibility verification passed');
