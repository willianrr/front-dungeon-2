import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-ash-corruptor');
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

const presentation = await compileShared('RangedEnemyPresentation');
const ash = await compileShared('AshCorruptorPresentation');

const corruptorPresentation = presentation.enemyPresentationForVariant('zombieAshCorruptor');
assert.deepEqual(corruptorPresentation, {
  variant: 'zombieAshCorruptor',
  targetName: 'Corruptor de Cinzas',
  targetSubtitle: 'Suporte corpo a corpo',
  minimapColor: presentation.ASH_CORRUPTOR_PALETTE.minimap,
  minimapRingColor: presentation.ASH_CORRUPTOR_PALETTE.minimapRing,
  minimapSize: 4.5,
  ranged: false,
});
assert.equal(presentation.normalizeEnemyVariant('zombieAshCorruptor'), 'zombieAshCorruptor');
assert.equal(presentation.normalizeEnemyVariant('future-support'), 'zombie');
assert.equal(presentation.isAshCorruptorVariant('zombieAshCorruptor'), true);
assert.equal(presentation.isAshCorruptorVariant('zombieShardcaster'), false);
assert.equal(ash.ASH_VEIL_RADIUS, 10);
assert.equal(ash.ASH_VEIL_DELAY, 1.15);
assert.equal(ash.ASH_VEIL_DURATION, 5);

const ashColors = Object.values(presentation.ASH_CORRUPTOR_PALETTE);
const shardColors = new Set(Object.values(presentation.SHARDCASTER_PALETTE));
assert.equal(new Set(ashColors).size, ashColors.length, 'ash palette colors must be distinct');
for (const color of ashColors) {
  assert.match(color, /^#[0-9a-f]{6}$/i, `invalid ash palette color ${color}`);
  assert.equal(shardColors.has(color), false, `ash palette must not reuse shardcaster purple ${color}`);
}

const entity = (id, kind, enemyVariant, alive = true, statuses = []) => ({
  id,
  kind,
  ...(enemyVariant ? { enemyVariant } : {}),
  alive,
  statuses,
  position: { x: id.length, y: 0, z: id.length * 2 },
});
const caster = entity('ash-caster', 'enemy', 'zombieAshCorruptor');
const zombie = entity('zombie-target', 'enemy', 'zombie');
const shardcaster = entity('shard-target', 'enemy', 'zombieShardcaster');
const ruinBrute = entity('ruin-brute-target', 'enemy', 'zombieRuinBrute');
const boss = entity('boss-target', 'enemy', 'zombieBoss');
const secondSupport = entity('support-target', 'enemy', 'zombieAshCorruptor');
const legacyEnemy = entity('legacy-target', 'enemy', undefined);
const player = entity('player-interrupter', 'player', undefined);
const entities = [caster, zombie, shardcaster, ruinBrute, boss, secondSupport, legacyEnemy, player];

const warning = {
  id: 'support-warning-1',
  type: 'enemy-support-warning',
  casterId: caster.id,
  targetId: zombie.id,
  skill: 'ash-veil',
  radius: 10,
  delay: 1.15,
};
const gatedWarning = ash.ashSupportEventPresentationGate(warning, entities);
assert.equal(gatedWarning?.type, 'warning');
assert.equal(gatedWarning?.caster, caster);
assert.equal(gatedWarning?.target, zombie);
assert.equal(
  ash.ashSupportEventPresentationGate({ ...warning, id: 'support-warning-shard', targetId: shardcaster.id }, entities)?.type,
  'warning',
);
assert.equal(
  ash.ashSupportEventPresentationGate({ ...warning, id: 'support-warning-brute', targetId: ruinBrute.id }, entities)?.target,
  ruinBrute,
);

const apply = {
  id: 'support-apply-1',
  type: 'enemy-support-apply',
  casterId: caster.id,
  targetId: zombie.id,
  skill: 'ash-veil',
  duration: 5,
};
const gatedApply = ash.ashSupportEventPresentationGate(apply, entities);
assert.equal(gatedApply?.type, 'apply');
assert.equal(gatedApply?.target, zombie);
assert.equal(
  ash.ashSupportEventPresentationGate({ ...apply, id: 'support-apply-brute', targetId: ruinBrute.id }, entities)?.target,
  ruinBrute,
);

for (const sourceSkill of ash.ASH_VEIL_INTERRUPT_SKILLS) {
  const interrupted = ash.ashSupportEventPresentationGate({
    id: `support-interrupted-${sourceSkill}`,
    type: 'enemy-support-interrupted',
    casterId: caster.id,
    targetId: player.id,
    skill: 'ash-veil',
    sourceSkill,
  }, entities);
  assert.equal(interrupted?.type, 'interrupted');
  assert.equal(interrupted?.caster, caster);
  assert.equal(interrupted?.interrupter, player);
  assert.equal(interrupted?.sourceSkill, sourceSkill);
}

// Eventos antigos, incompletos, incoerentes ou com campos de outra variante fecham o gate.
for (const malformed of [
  null,
  {},
  { ...warning, id: '' },
  { ...warning, skill: undefined },
  { ...warning, skill: 'future-veil' },
  { ...warning, casterId: 'missing' },
  { ...warning, casterId: zombie.id },
  { ...warning, targetId: 'missing' },
  { ...warning, targetId: caster.id },
  { ...warning, targetId: player.id },
  { ...warning, targetId: boss.id },
  { ...warning, targetId: secondSupport.id },
  { ...warning, targetId: legacyEnemy.id },
  { ...warning, radius: 0 },
  { ...warning, radius: Number.NaN },
  { ...warning, radius: 9.99 },
  { ...warning, radius: 10.01 },
  { ...warning, delay: 0 },
  { ...warning, delay: 1.14 },
  { ...warning, delay: 1.16 },
  { ...warning, sourceSkill: 'heavy-strike' },
  { ...warning, duration: 5 },
  { ...apply, targetId: boss.id },
  { ...apply, targetId: secondSupport.id },
  { ...apply, targetId: legacyEnemy.id },
  { ...apply, duration: 0 },
  { ...apply, duration: 4.99 },
  { ...apply, duration: 5.01 },
  { ...apply, radius: 10 },
  {
    id: 'bad-interrupt-target',
    type: 'enemy-support-interrupted',
    casterId: caster.id,
    targetId: zombie.id,
    skill: 'ash-veil',
    sourceSkill: 'heavy-strike',
  },
  {
    id: 'bad-interrupt-skill',
    type: 'enemy-support-interrupted',
    casterId: caster.id,
    targetId: player.id,
    skill: 'ash-veil',
    sourceSkill: 'war-cry',
  },
  {
    id: 'bad-interrupt-extra',
    type: 'enemy-support-interrupted',
    casterId: caster.id,
    targetId: player.id,
    skill: 'ash-veil',
    sourceSkill: 'arcane-bolt',
    duration: 5,
  },
]) {
  assert.equal(ash.ashSupportEventPresentationGate(malformed, entities), null);
}

const status = {
  id: 'ash-veil',
  sourceId: caster.id,
  sourceSkill: 'ash-veil',
  remaining: 4.2,
  duration: 5,
};
const veiledZombie = { ...zombie, statuses: [status] };
const veiledShardcaster = { ...shardcaster, statuses: [status] };
const veiledRuinBrute = { ...ruinBrute, statuses: [status] };
assert.equal(ash.ashVeilStatusPresentationGate(veiledZombie, entities)?.source, caster);
assert.equal(ash.ashVeilStatusPresentationGate(veiledShardcaster, entities)?.status, status);
assert.equal(ash.ashVeilStatusPresentationGate(veiledRuinBrute, entities)?.status, status);

for (const invalidTarget of [
  { ...veiledZombie, alive: false },
  { ...boss, statuses: [status] },
  { ...secondSupport, statuses: [status] },
  { ...legacyEnemy, statuses: [status] },
  { ...player, statuses: [status] },
  { ...veiledZombie, statuses: [] },
  { ...veiledZombie, statuses: [status, { ...status }] },
  { ...veiledZombie, statuses: [{ ...status, sourceId: undefined }] },
  { ...veiledZombie, statuses: [{ ...status, sourceSkill: undefined }] },
  { ...veiledZombie, statuses: [{ ...status, sourceSkill: 'arcane-nova' }] },
  { ...veiledZombie, statuses: [{ ...status, remaining: 0 }] },
  { ...veiledZombie, statuses: [{ ...status, remaining: 6 }] },
  { ...veiledZombie, statuses: [{ ...status, duration: 4.99 }] },
  { ...veiledZombie, statuses: [{ ...status, duration: 5.01 }] },
  { ...veiledZombie, statuses: [{ ...status, duration: Number.NaN }] },
]) {
  assert.equal(ash.ashVeilStatusPresentationGate(invalidTarget, entities), null);
}
assert.equal(
  ash.ashVeilStatusPresentationGate(veiledZombie, entities.filter((candidate) => candidate.id !== caster.id)),
  null,
);
assert.equal(
  ash.ashVeilStatusPresentationGate(veiledZombie, [{ ...caster, alive: false }, ...entities.slice(1)]),
  null,
);

// Interrupcao e historica: morte posterior no mesmo tick nao apaga o feedback.
const deadCaster = { ...caster, alive: false };
const deadPlayer = { ...player, alive: false };
assert.equal(ash.ashSupportEventPresentationGate({
  id: 'historical-interrupt',
  type: 'enemy-support-interrupted',
  casterId: deadCaster.id,
  targetId: deadPlayer.id,
  skill: 'ash-veil',
  sourceSkill: 'heavy-strike',
}, [deadCaster, deadPlayer])?.type, 'interrupted');

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const stylesSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');

assert.match(gameSource, /ashSupportEventPresentationGate\(event, entities\)/, 'all support events must pass the central gate');
assert.match(gameSource, /support\.caster\.position,[\s\S]*support\.target\.position/, 'warning/apply must use server-correlated entities');
assert.match(gameSource, /showAshVeilInterrupted\(support\.caster\.position, support\.interrupter\.id\)/, 'interrupt collapse must stay on caster');
assert.match(gameSource, /syncAshVeilStatus\(view, e, entities\)/, 'status overlay must reconcile from every snapshot');
assert.match(gameSource, /clearAshVeilVisual\(view\)/, 'status disappearance must have explicit cleanup');
assert.match(gameSource, /clearEnemySpecialVisuals\(view\)/, 'variant/view lifecycle must clean adornments');
assert.match(gameSource, /ash-corruptor-crown/, 'corruptor model must carry an unmistakable crown');
assert.match(gameSource, /ash-corruptor-orb/, 'corruptor model must carry an amber orb');
assert.match(gameSource, /ash-veil-warning-target-rune/, 'warning must render a per-target rune');
assert.match(gameSource, /ash-veil-authoritative-target-tether/, 'warning/apply must render authoritative tethers');
assert.match(gameSource, /ash-veil-interrupted-shard/, 'interruption must visibly collapse into shards');
assert.match(hudSource, /enemyPresentation\.minimapRingColor/, 'minimap must draw the amber outer marker');
assert.match(hudSource, /status\.id === 'ash-veil'/, 'target HUD must expose the authoritative veil status');
assert.match(hudSource, /ashVeilStatusPresentationGate\(target, entities\)/, 'target HUD must share the strict status gate');
assert.match(stylesSource, /data-enemy-variant='zombieAshCorruptor'/, 'target frame must style the support identity');

const commandSection = typesSource.slice(typesSource.indexOf('export type Command ='));
assert.doesNotMatch(commandSection, /ash-veil|enemy-support/, 'support mechanics must not add a client command');
const warningMethod = gameSource.slice(
  gameSource.indexOf('private showAshVeilWarning'),
  gameSource.indexOf('private showAshVeilApply'),
);
assert.doesNotMatch(warningMethod, /this\.net\.send|latestEntities|entities\.filter/, 'warning presentation must not simulate cast or select targets');

console.info('ash corruptor presentation, strict wire gates, status and lifecycle verification passed');
