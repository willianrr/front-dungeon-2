import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-arcane-resonance');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const sourcePath = path.join(root, 'src/shared/ArcaneResonance.ts');
const outputPath = path.join(outDir, 'ArcaneResonance.mjs');
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
const resonance = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(resonance.ARCANE_RESONANCE_MODIFIER_ID, 'arcane_resonance');
assert.equal(resonance.ARCANE_RESONANCE_STATUS_ID, 'arcane-resonance');
assert.equal(resonance.ARCANE_RESONANCE_REQUIRED_MASTERY_LEVEL, 5);
assert.equal(resonance.ARCANE_RESONANCE_DURATION, 4.5);
assert.equal(resonance.ARCANE_RESONANCE_RUPTURE_RADIUS, 2.8);
assert.equal(resonance.ARCANE_RESONANCE_MANA_REFUND, 6);
for (const color of Object.values(resonance.ARCANE_RESONANCE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);
assert.equal(new Set(Object.values(resonance.ARCANE_RESONANCE_PALETTE)).size, 4);

const boltModifier = {
  id: 'arcane_resonance',
  label: 'Ressonância Arcana',
  description: 'Maestria Arcana 5: impacto efetivo aplica uma Marca de Ressonância por 4,5 s.',
};
const novaModifier = {
  id: 'arcane_resonance',
  label: 'Ruptura Arcana',
  description: 'Consome sua Marca: +30% no alvo, pulso de 45% em até 3 adjacentes e +6 de mana.',
};
const doctrineModifier = { id: 'warrior_doctrine_arcane_convergence', label: 'Convergência Arcana', description: 'Fluxo.' };
const skills = [
  { id: 'arcane-nova', modifiers: [doctrineModifier, novaModifier] },
  { id: 'arcane-bolt', modifiers: [doctrineModifier, boltModifier] },
];
const mastery = [{ id: 'arcana', level: 5 }];
const skillGate = resonance.arcaneResonanceSkillPresentationGate(skills, mastery);
assert.equal(skillGate?.bolt, skills[1]);
assert.equal(skillGate?.nova, skills[0]);
for (const [badSkills, badMasteries] of [
  [skills, [{ id: 'arcana', level: 4 }]],
  [skills, [{ id: 'arcana', level: 5 }, { id: 'arcana', level: 5 }]],
  [skills.slice(0, 1), mastery],
  [[skills[0], { ...skills[1], modifiers: [] }], mastery],
  [[skills[0], { ...skills[1], modifiers: [{ ...boltModifier, label: 'Ressonância' }] }], mastery],
  [[skills[0], { ...skills[1], modifiers: [boltModifier, boltModifier] }], mastery],
  [[skills[0], { ...skills[1], modifiers: [{ ...boltModifier, extra: true }] }], mastery],
]) assert.equal(resonance.arcaneResonanceSkillPresentationGate(badSkills, badMasteries), null);

const sourcePlayer = { id: 'player-1', kind: 'player', alive: true };
const markedEnemy = {
  id: 'enemy-1', kind: 'enemy', alive: true,
  statuses: [{
    id: 'arcane-resonance', sourceId: sourcePlayer.id, sourceSkill: 'arcane-bolt', remaining: 3.25, duration: 4.5,
  }],
};
const statusGate = resonance.arcaneResonanceStatusPresentationGate(markedEnemy, [sourcePlayer, markedEnemy]);
assert.equal(statusGate?.target, markedEnemy);
assert.equal(statusGate?.sourceId, sourcePlayer.id);
assert.equal(statusGate?.orphaned, false);
const orphan = {
  ...markedEnemy,
  statuses: [{ id: 'arcane-resonance', sourceSkill: 'arcane-bolt', remaining: 1, duration: 4.5 }],
};
assert.equal(resonance.arcaneResonanceStatusPresentationGate(orphan, [orphan])?.orphaned, true);
for (const malformed of [
  { ...markedEnemy, kind: 'player' },
  { ...markedEnemy, alive: false },
  { ...markedEnemy, statuses: [] },
  { ...markedEnemy, statuses: [...markedEnemy.statuses, markedEnemy.statuses[0]] },
  { ...markedEnemy, statuses: [{ ...markedEnemy.statuses[0], duration: 4.49 }] },
  { ...markedEnemy, statuses: [{ ...markedEnemy.statuses[0], remaining: 0 }] },
  { ...markedEnemy, statuses: [{ ...markedEnemy.statuses[0], remaining: 4.51 }] },
  { ...markedEnemy, statuses: [{ ...markedEnemy.statuses[0], sourceSkill: 'arcane-nova' }] },
  { ...markedEnemy, statuses: [{ ...markedEnemy.statuses[0], variant: 'rupture' }] },
]) assert.equal(resonance.arcaneResonanceStatusPresentationGate(malformed, [sourcePlayer, malformed]), null);
assert.equal(
  resonance.arcaneResonanceStatusPresentationGate(markedEnemy, [{ ...sourcePlayer, alive: false }, markedEnemy]),
  null,
);

const ruptureEvent = {
  id: 'combat-resonance-1',
  type: 'arcane-resonance-rupture',
  casterId: sourcePlayer.id,
  targetId: markedEnemy.id,
  amount: 6,
  skill: 'arcane-resonance',
  variant: 'rupture',
  sourceSkill: 'arcane-nova',
  modifierId: 'arcane_resonance',
  position: { x: 3, y: 0, z: -2 },
  radius: 2.8,
};
const eventGate = resonance.arcaneResonanceEventPresentationGate(ruptureEvent, [sourcePlayer, markedEnemy]);
assert.equal(eventGate?.event, ruptureEvent);
assert.equal(eventGate?.historical, false);
assert.equal(resonance.arcaneResonanceEventPresentationGate(ruptureEvent, [])?.historical, true);
for (const malformed of [
  { ...ruptureEvent, id: '' },
  { ...ruptureEvent, casterId: '' },
  { ...ruptureEvent, targetId: '' },
  { ...ruptureEvent, amount: 5 },
  { ...ruptureEvent, skill: 'arcane-nova' },
  { ...ruptureEvent, variant: 'mark' },
  { ...ruptureEvent, sourceSkill: 'arcane-bolt' },
  { ...ruptureEvent, modifierId: 'arcane-resonance' },
  { ...ruptureEvent, radius: 2.81 },
  { ...ruptureEvent, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...ruptureEvent, damageKind: 'magic' },
  { ...ruptureEvent, duration: 1 },
]) assert.equal(resonance.arcaneResonanceEventPresentationGate(malformed, [sourcePlayer, markedEnemy]), null);
assert.equal(
  resonance.arcaneResonanceEventPresentationGate(ruptureEvent, [sourcePlayer, { ...sourcePlayer }, markedEnemy]),
  null,
);

const [gameSource, hudSource, stylesSource, typesSource, packageSource, readmeSource,
  backendSource, projectileSource, combatSource, statusSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/arcane_resonance.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/projectile.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/status.go'), 'utf8'),
  readFile(path.join(backendRoot, 'ARCANE_RESONANCE_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /type: 'arcane-resonance-rupture'/);
assert.match(typesSource, /amount: 6/);
assert.match(gameSource, /arcaneResonanceStatusPresentationGate\(entity, entities\)/);
assert.match(gameSource, /arcaneResonanceEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showArcaneResonanceRupture/);
assert.match(gameSource, /private clearArcaneResonanceVisual/);
assert.match(hudSource, /arcaneResonanceSkillPresentationGate\(player\.skills, snapshot\.masteries\)/);
assert.match(hudSource, /Marca de Ressonância/);
assert.match(stylesSource, /arcane-resonance-modified/);
assert.match(stylesSource, /data-status='arcane-resonance'/);
assert.match(packageSource, /"verify:arcane-resonance"/);
assert.match(readmeSource, /Ressonância Arcana/);

assert.match(backendSource, /arcaneResonanceRequiredMasteryLevel = 5/);
assert.match(backendSource, /arcaneResonancePrimaryMultiplier\s+= 1\.30/);
assert.match(backendSource, /arcaneResonanceRuptureMultiplier\s+= 0\.45/);
assert.match(backendSource, /arcaneResonanceRuptureMaxTargets\s+= 3/);
assert.match(backendSource, /arcaneResonanceManaRefund\s+= 6\.0/);
assert.match(projectileSource, /resonanceEligible/);
assert.match(projectileSource, /s\.applyArcaneResonance/);
assert.match(combatSource, /selectArcaneResonanceTarget/);
assert.match(combatSource, /resolveArcaneResonanceRupture/);
assert.match(statusSource, /statusArcaneResonance\s+= "arcane-resonance"/);
assert.match(contractSource, /No máximo uma marca pode ser consumida por cast/);
assert.match(contractSource, /até 3 \*\*outros\*\* inimigos/);

const ruptureVfx = gameSource.slice(
  gameSource.indexOf('private showArcaneResonanceRupture'),
  gameSource.indexOf('private showBulwarkCall'),
);
assert.doesNotMatch(ruptureVfx, /this\.net\.send|latestEntities|this\.views|statuses|damage|collision|mana\s*=/i,
  'resonance rupture VFX must remain presentation-only');

console.info('arcane resonance unlock, mark/status, rupture event gates, HUD and authoritative combo verification passed');
