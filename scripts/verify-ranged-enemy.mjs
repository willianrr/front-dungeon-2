import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-ranged-enemy');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compileModule(name) {
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

const presentation = await compileModule('RangedEnemyPresentation');
const motion = await compileModule('ProjectileMotion');

const melee = presentation.enemyPresentationForVariant('zombie');
const boss = presentation.enemyPresentationForVariant('zombieBoss');
const shardcaster = presentation.enemyPresentationForVariant('zombieShardcaster');
assert.equal(shardcaster.targetName, 'Conjurador de Estilhaços');
assert.equal(shardcaster.ranged, true);
assert.ok(shardcaster.minimapSize > melee.minimapSize, 'ranged minimap marker must exceed melee');
assert.ok(shardcaster.minimapSize < boss.minimapSize, 'ranged minimap marker must remain below boss');
assert.equal(presentation.enemyPresentationForVariant('future-enemy').variant, 'zombie');
assert.equal(presentation.isShardcasterVariant('zombieShardcaster'), true);
assert.equal(presentation.isShardcasterVariant('zombieBoss'), false);

const colors = Object.values(presentation.SHARDCASTER_PALETTE);
assert.equal(new Set(colors).size, colors.length, 'shardcaster palette colors must be distinct');
for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i, `invalid palette color ${color}`);
assert.equal(motion.isSupportedProjectileKind('corruptedShard'), true);
assert.equal(motion.isSupportedProjectileKind('arcaneBolt'), true);
assert.equal(motion.isSupportedProjectileKind('future-projectile'), false);
assert.notEqual(
  motion.projectilePresentation('corruptedShard').coreColor,
  motion.projectilePresentation('arcaneBolt').coreColor,
  'enemy warning shard and player Arcane Bolt must keep distinct palettes',
);

const projectile = {
  position: { x: 1, y: 2, z: 3 },
  velocity: { x: 10, y: -2, z: 4 },
};
assert.deepEqual(
  motion.extrapolatedProjectilePosition(projectile, 1),
  { x: 3, y: 1.6, z: 3.8 },
  'visual extrapolation must clamp to 200ms',
);
assert.deepEqual(
  motion.extrapolatedProjectilePosition(projectile, -4),
  projectile.position,
  'negative snapshot age must not rewind the projectile',
);

const corrected = motion.correctedProjectilePosition(
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  0.05,
);
assert.ok(corrected.x > 0 && corrected.x < 1, 'small corrections must converge smoothly');
assert.deepEqual(
  motion.correctedProjectilePosition(
    { x: 0, y: 0, z: 0 },
    { x: 3, y: 1, z: 0 },
    0.016,
  ),
  { x: 3, y: 1, z: 0 },
  'large divergence must snap to the authoritative prediction',
);

const lifecycle = motion.projectileLifecyclePlan(
  ['projectile-a', 'projectile-b'],
  [{ id: 'projectile-b' }, { id: 'projectile-c' }, { id: 'projectile-c' }],
);
assert.deepEqual(lifecycle, {
  create: ['projectile-c'],
  update: ['projectile-b'],
  remove: ['projectile-a'],
});
const simulatedViews = new Set(['projectile-a', 'projectile-b']);
for (const id of lifecycle.remove) simulatedViews.delete(id);
for (const id of lifecycle.create) simulatedViews.add(id);
assert.deepEqual([...simulatedViews].sort(), ['projectile-b', 'projectile-c'], 'lifecycle must converge to snapshot IDs');

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
assert.match(gameSource, /!isSupportedProjectileKind\(projectile\.kind\)/, 'reconciliation must accept both known projectile kinds');
assert.match(gameSource, /this\.clearProjectileViews\(\)/, 'zone/dispose cleanup must remain explicit');
assert.match(gameSource, /event\.type === 'enemy-projectile-warning'/, 'purple enemy telegraph must remain intact');
assert.match(gameSource, /SHARDCASTER_PALETTE\.warning/, 'enemy warning must not inherit the cyan player palette');

console.info('ranged enemy presentation and projectile motion verification passed');
