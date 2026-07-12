import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-guardian-retaliation');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/GuardianRetaliation.ts');
const outputPath = path.join(outDir, 'GuardianRetaliation.mjs');
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
const retaliation = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(retaliation.GUARDIAN_RETALIATION_MODIFIER_ID, 'guardian_retaliation');
assert.equal(retaliation.GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID, 'guardian_retaliation_release');
assert.equal(retaliation.GUARDIAN_RETALIATION_BUFF_ID, 'guardian-retaliation');
assert.equal(retaliation.GUARDIAN_RETALIATION_REQUIRED_MASTERY_LEVEL, 5);
assert.equal(retaliation.GUARDIAN_RETALIATION_DURATION, 4);
assert.equal(retaliation.GUARDIAN_RETALIATION_READY_RADIUS, 1.6);
assert.equal(retaliation.GUARDIAN_RETALIATION_RELEASE_RADIUS, 2.2);
for (const color of Object.values(retaliation.GUARDIAN_RETALIATION_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const guardModifier = {
  id: 'guardian_retaliation',
  label: 'Retaliação do Guardião',
  description: 'Maestria de Sobrevivência 5: Guarda perfeita efetiva marca o agressor por 4 s.',
};
const releaseModifier = {
  id: 'guardian_retaliation_release',
  label: 'Golpe de Retaliação',
  description: 'Golpe Pesado no agressor marcado causa +40% de dano e atrasa sua próxima ação em 0,8 s.',
};
const doctrine = { id: 'warrior_doctrine_guardian_cadence', label: 'Cadência', description: 'Fluxo.' };
const skills = [
  { id: 'iron-guard', modifiers: [doctrine, guardModifier] },
  { id: 'heavy-strike', modifiers: [releaseModifier] },
];
const mastery = [{ id: 'survival', level: 5 }];
const skillGate = retaliation.guardianRetaliationSkillPresentationGate(skills, mastery);
assert.equal(skillGate?.guard, skills[0]);
assert.equal(skillGate?.heavy, skills[1]);
for (const [badSkills, badMasteries] of [
  [skills, [{ id: 'survival', level: 4 }]],
  [skills, [{ id: 'survival', level: 5 }, { id: 'survival', level: 5 }]],
  [skills.slice(0, 1), mastery],
  [[skills[0], { ...skills[1], modifiers: [] }], mastery],
  [[{ ...skills[0], modifiers: [{ ...guardModifier, label: 'Retaliação' }] }, skills[1]], mastery],
  [[{ ...skills[0], modifiers: [guardModifier, guardModifier] }, skills[1]], mastery],
  [[skills[0], { ...skills[1], modifiers: [{ ...releaseModifier, extra: true }] }], mastery],
]) assert.equal(retaliation.guardianRetaliationSkillPresentationGate(badSkills, badMasteries), null);

const player = {
  id: 'player-1', kind: 'player', alive: true,
  buffs: [{ id: 'guardian-retaliation', label: 'Retaliação Pronta', remaining: 3.2, duration: 4, targetId: 'enemy-1' }],
};
const enemy = { id: 'enemy-1', kind: 'enemy', alive: true };
const buffGate = retaliation.guardianRetaliationBuffPresentationGate(player, [player, enemy]);
assert.equal(buffGate?.target, enemy);
assert.equal(buffGate?.historical, false);
assert.equal(retaliation.guardianRetaliationBuffPresentationGate(player, [player])?.historical, true);
for (const malformed of [
  { ...player, kind: 'enemy' },
  { ...player, alive: false },
  { ...player, buffs: [] },
  { ...player, buffs: [...player.buffs, player.buffs[0]] },
  { ...player, buffs: [{ ...player.buffs[0], label: 'Retaliação' }] },
  { ...player, buffs: [{ ...player.buffs[0], remaining: 0 }] },
  { ...player, buffs: [{ ...player.buffs[0], remaining: 4.01 }] },
  { ...player, buffs: [{ ...player.buffs[0], duration: 3.9 }] },
  { ...player, buffs: [{ ...player.buffs[0], targetId: '' }] },
]) assert.equal(retaliation.guardianRetaliationBuffPresentationGate(malformed, [malformed, enemy]), null);
assert.equal(retaliation.guardianRetaliationBuffPresentationGate(player, [player, { ...enemy, alive: false }]), null);

const ready = {
  id: 'combat-retaliation-ready', type: 'guardian-retaliation-ready', casterId: player.id, targetId: enemy.id,
  skill: 'guardian-retaliation', variant: 'ready', sourceSkill: 'iron-guard', modifierId: 'guardian_retaliation',
  position: { x: 1, y: 0, z: 2 }, radius: 1.6, duration: 4,
};
const release = {
  id: 'combat-retaliation-release', type: 'guardian-retaliation-release', casterId: player.id, targetId: enemy.id,
  skill: 'guardian-retaliation', variant: 'release', sourceSkill: 'heavy-strike', modifierId: 'guardian_retaliation',
  position: { x: 1, y: 0, z: 2 }, radius: 2.2,
};
assert.equal(retaliation.guardianRetaliationEventPresentationGate(ready, [player, enemy])?.phase, 'ready');
assert.equal(retaliation.guardianRetaliationEventPresentationGate(release, [player, enemy])?.phase, 'release');
assert.equal(retaliation.guardianRetaliationEventPresentationGate(release, [])?.historical, true);
for (const malformed of [
  { ...ready, id: '' },
  { ...ready, targetId: '' },
  { ...ready, variant: 'release' },
  { ...ready, sourceSkill: 'heavy-strike' },
  { ...ready, radius: 1.61 },
  { ...ready, duration: 3.99 },
  { ...ready, modifierId: 'guardian_retaliation_release' },
  { ...ready, damageKind: 'physical' },
  { ...release, variant: 'ready' },
  { ...release, sourceSkill: 'iron-guard' },
  { ...release, radius: 2.21 },
  { ...release, duration: 4 },
  { ...release, amount: 1 },
  { ...release, position: { x: Number.NaN, y: 0, z: 0 } },
]) assert.equal(retaliation.guardianRetaliationEventPresentationGate(malformed, [player, enemy]), null);

const [gameSource, hudSource, stylesSource, typesSource, packageSource, readmeSource,
  backendSource, combatSource, entitySource, talentsSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/guardian_retaliation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/entity.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/talents.go'), 'utf8'),
  readFile(path.join(backendRoot, 'GUARDIAN_RETALIATION_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /targetId\?: string/);
assert.match(typesSource, /type: 'guardian-retaliation-ready'/);
assert.match(typesSource, /type: 'guardian-retaliation-release'/);
assert.match(gameSource, /guardianRetaliationBuffPresentationGate\(local, entities\)/);
assert.match(gameSource, /guardianRetaliationEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showGuardianRetaliationPulse/);
assert.match(gameSource, /private clearGuardianRetaliationVisual/);
assert.match(hudSource, /guardianRetaliationSkillPresentationGate\(player\.skills, snapshot\.masteries\)/);
assert.match(hudSource, /Alvo da Retaliação/);
assert.match(stylesSource, /guardian-retaliation-modified/);
assert.match(stylesSource, /data-status='guardian-retaliation'/);
assert.match(packageSource, /"verify:guardian-retaliation"/);
assert.match(readmeSource, /Retaliação do Guardião/);

assert.match(backendSource, /guardianRetaliationRequiredMasteryLevel = 5/);
assert.match(backendSource, /guardianRetaliationDuration\s+= 4\.0/);
assert.match(backendSource, /guardianRetaliationDamageMultiplier\s+= 1\.40/);
assert.match(backendSource, /guardianRetaliationRecoveryDelay\s+= 0\.8/);
assert.match(combatSource, /retaliationUnlocked && enemyHit && guardEffective && guardPerfect/);
assert.match(combatSource, /physicalMultiplier \*= guardianRetaliationDamageMultiplier/);
assert.match(entitySource, /guardianRetaliationTargetID string/);
assert.match(talentsSource, /ID:\s+"guardian-retaliation"/);
assert.match(contractSource, /Somente um Golpe Pesado/);
assert.match(contractSource, /não é cancelado nem reescrito/);

const pulseVfx = gameSource.slice(
  gameSource.indexOf('private showGuardianRetaliationPulse'),
  gameSource.indexOf('private showIronGuard'),
);
assert.doesNotMatch(pulseVfx, /this\.net\.send|latestEntities|this\.views|damage|attackTimer|collision/i,
  'retaliation VFX must remain presentation-only');

console.info('guardian retaliation mastery gate, bound buff, ready/release events, HUD and authoritative counter verification passed');
