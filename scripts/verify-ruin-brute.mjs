import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-ruin-brute');
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
const brute = await compileShared('RuinBrutePresentation');

assert.deepEqual(presentation.enemyPresentationForVariant('zombieRuinBrute'), {
  variant: 'zombieRuinBrute',
  targetName: 'Bruto da Ruína',
  targetSubtitle: 'Quebra-linhas',
  minimapColor: presentation.RUIN_BRUTE_PALETTE.minimap,
  minimapRingColor: presentation.RUIN_BRUTE_PALETTE.minimapRing,
  minimapSize: 5.4,
  ranged: false,
});
assert.equal(presentation.normalizeEnemyVariant('zombieRuinBrute'), 'zombieRuinBrute');
assert.equal(presentation.normalizeEnemyVariant('future-brute'), 'zombie');
assert.equal(presentation.isRuinBruteVariant('zombieRuinBrute'), true);
assert.equal(presentation.isRuinBruteVariant('zombie'), false);
assert.equal(brute.RUIN_CLEAVE_RADIUS, 5.4);
assert.equal(brute.RUIN_CLEAVE_ARC_DEGREES, 80);
assert.equal(brute.RUIN_CLEAVE_WARNING_DELAY, 1.05);
assert.equal(brute.RUIN_EXPOSED_DURATION, 3);

const bruteColors = Object.values(presentation.RUIN_BRUTE_PALETTE);
const forbiddenColors = new Set([
  ...Object.values(presentation.SHARDCASTER_PALETTE),
  ...Object.values(presentation.ASH_CORRUPTOR_PALETTE),
]);
assert.equal(new Set(bruteColors).size, bruteColors.length, 'brute palette colors must be distinct');
for (const color of bruteColors) {
  assert.match(color, /^#[0-9a-f]{6}$/i, `invalid ruin brute palette color ${color}`);
  assert.equal(forbiddenColors.has(color), false, `ruin brute must not reuse magic/support palette ${color}`);
}

const entity = (id, kind, enemyVariant, alive = true, statuses = []) => ({
  id,
  kind,
  ...(enemyVariant ? { enemyVariant } : {}),
  alive,
  statuses,
  position: { x: id.length, y: 0, z: id.length * 2 },
});
const ruinBrute = entity('ruin-brute', 'enemy', 'zombieRuinBrute');
const zombie = entity('zombie', 'enemy', 'zombie');
const corruptor = entity('corruptor', 'enemy', 'zombieAshCorruptor');
const guarder = entity('guarder', 'player', undefined);
const otherPlayer = entity('other-player', 'player', undefined);
const entities = [ruinBrute, zombie, corruptor, guarder, otherPlayer];
const frozenPosition = { x: 12.5, y: -0.2, z: -7.75 };

const warning = {
  id: 'brute-warning-1',
  type: 'enemy-brute-warning',
  casterId: ruinBrute.id,
  skill: 'ruin-cleave',
  position: frozenPosition,
  rotationY: -2.35,
  radius: 5.4,
  arcDegrees: 80,
  delay: 1.05,
};
const gatedWarning = brute.ruinBruteEventPresentationGate(warning, entities);
assert.equal(gatedWarning?.type, 'warning');
assert.equal(gatedWarning?.brute, ruinBrute);
assert.equal(gatedWarning?.position, frozenPosition, 'gate must preserve authoritative origin');
assert.equal(gatedWarning?.rotationY, warning.rotationY, 'gate must preserve authoritative yaw');
for (const rotationY of [-Math.PI, 0, Math.PI]) {
  assert.equal(
    brute.ruinBruteEventPresentationGate({ ...warning, id: `valid-yaw-${rotationY}`, rotationY }, entities)?.rotationY,
    rotationY,
  );
}

const impact = {
  id: 'brute-impact-1',
  type: 'enemy-brute-impact',
  casterId: ruinBrute.id,
  skill: 'ruin-cleave',
  position: frozenPosition,
  rotationY: warning.rotationY,
  radius: 5.4,
  arcDegrees: 80,
};
const gatedImpact = brute.ruinBruteEventPresentationGate(impact, entities);
assert.equal(gatedImpact?.type, 'impact');
assert.equal(gatedImpact?.position, frozenPosition);
assert.equal(gatedImpact?.rotationY, warning.rotationY);

const exposedPosition = { x: -4, y: 0, z: 8 };
const exposed = {
  id: 'brute-exposed-1',
  type: 'enemy-brute-exposed',
  casterId: guarder.id,
  targetId: ruinBrute.id,
  skill: 'ruin-exposed',
  sourceSkill: 'iron-guard',
  position: exposedPosition,
  duration: 3,
};
const gatedExposed = brute.ruinBruteEventPresentationGate(exposed, entities);
assert.equal(gatedExposed?.type, 'exposed');
assert.equal(gatedExposed?.guarder, guarder);
assert.equal(gatedExposed?.brute, ruinBrute);
assert.equal(gatedExposed?.position, exposedPosition);

// Eventos sao historicos: entidades presentes continuam correlacionaveis mesmo mortas.
const deadBrute = { ...ruinBrute, alive: false };
const deadGuarder = { ...guarder, alive: false };
assert.equal(brute.ruinBruteEventPresentationGate(warning, [deadBrute])?.type, 'warning');
assert.equal(brute.ruinBruteEventPresentationGate(impact, [deadBrute])?.type, 'impact');
assert.equal(brute.ruinBruteEventPresentationGate(exposed, [deadBrute, deadGuarder])?.type, 'exposed');

for (const malformed of [
  null,
  {},
  { ...warning, id: '' },
  { ...warning, casterId: 'missing' },
  { ...warning, casterId: guarder.id },
  { ...warning, casterId: zombie.id },
  { ...warning, skill: 'ruin-exposed' },
  { ...warning, position: undefined },
  { ...warning, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...warning, position: { x: 0, y: Number.POSITIVE_INFINITY, z: 0 } },
  { ...warning, rotationY: Number.NaN },
  { ...warning, rotationY: '0' },
  { ...warning, rotationY: -Math.PI - Number.EPSILON * 4 },
  { ...warning, rotationY: Math.PI + Number.EPSILON * 4 },
  { ...warning, radius: 5.39 },
  { ...warning, radius: 5.41 },
  { ...warning, arcDegrees: 79.99 },
  { ...warning, arcDegrees: 80.01 },
  { ...warning, delay: 1.04 },
  { ...warning, delay: 1.06 },
  { ...warning, targetId: guarder.id },
  { ...warning, amount: 0 },
  { ...warning, damageKind: 'physical' },
  { ...warning, critical: false },
  { ...warning, variant: 'hammer' },
  { ...warning, sourceSkill: 'iron-guard' },
  { ...warning, damageEffect: 'bleed' },
  { ...warning, duration: 3 },
  { ...impact, delay: 1.05 },
  { ...impact, targetId: guarder.id },
  { ...impact, radius: Number.NaN },
  { ...exposed, casterId: zombie.id },
  { ...exposed, casterId: 'missing' },
  { ...exposed, targetId: zombie.id },
  { ...exposed, targetId: guarder.id },
  { ...exposed, skill: 'ruin-cleave' },
  { ...exposed, sourceSkill: 'heavy-strike' },
  { ...exposed, position: { x: 0, y: 0, z: Number.NaN } },
  { ...exposed, duration: 2.99 },
  { ...exposed, duration: 3.01 },
  { ...exposed, amount: 0 },
  { ...exposed, damageKind: 'physical' },
  { ...exposed, critical: false },
  { ...exposed, variant: 'hammer' },
  { ...exposed, damageEffect: 'bleed' },
  { ...exposed, rotationY: 0 },
  { ...exposed, radius: 5.4 },
  { ...exposed, arcDegrees: 80 },
  { ...exposed, delay: 1.05 },
]) {
  assert.equal(brute.ruinBruteEventPresentationGate(malformed, entities), null);
}
assert.equal(
  brute.ruinBruteEventPresentationGate(warning, [ruinBrute, { ...ruinBrute }]),
  null,
  'duplicate entity IDs must close the correlation gate',
);
assert.equal(
  brute.ruinBruteEventPresentationGate(exposed, [ruinBrute, { ...guarder, enemyVariant: 'zombie' }]),
  null,
  'a player source cannot carry an enemy variant',
);

const exposedStatus = {
  id: 'ruin-exposed',
  sourceId: guarder.id,
  sourceSkill: 'iron-guard',
  remaining: 2.4,
  duration: 3,
};
const exposedBrute = { ...ruinBrute, statuses: [exposedStatus] };
assert.equal(brute.ruinExposedStatusPresentationGate(exposedBrute, entities)?.status, exposedStatus);
assert.equal(brute.ruinExposedStatusPresentationGate(exposedBrute, entities)?.source, guarder);
assert.equal(
  brute.ruinExposedStatusPresentationGate(
    { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: '' }] },
    entities.filter((entityState) => entityState.id !== guarder.id),
  )?.source,
  null,
  'empty sourceId must remain presentable after the guarder leaves',
);
assert.equal(
  brute.ruinExposedStatusPresentationGate(
    { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: undefined }] },
    entities.filter((entityState) => entityState.id !== guarder.id),
  )?.source,
  null,
);
assert.equal(
  brute.ruinExposedStatusPresentationGate(exposedBrute, [{ ...guarder, alive: false }, ruinBrute])?.source?.id,
  guarder.id,
  'a historical source may be dead while the status is active',
);

for (const invalidTarget of [
  { ...exposedBrute, alive: false },
  { ...zombie, statuses: [exposedStatus] },
  { ...corruptor, statuses: [exposedStatus] },
  { ...guarder, statuses: [exposedStatus] },
  { ...ruinBrute, statuses: [] },
  { ...ruinBrute, statuses: [exposedStatus, { ...exposedStatus }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: 'missing' }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: '   ' }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: 42 }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceId: zombie.id }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceSkill: undefined }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, sourceSkill: 'heavy-strike' }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, variant: 'hammer' }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, remaining: 0 }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, remaining: 3.01 }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, remaining: Number.NaN }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, duration: 2.99 }] },
  { ...ruinBrute, statuses: [{ ...exposedStatus, duration: 3.01 }] },
]) {
  assert.equal(brute.ruinExposedStatusPresentationGate(invalidTarget, entities), null);
}

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const stylesSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');
const ashSource = await readFile(path.join(root, 'src/shared/AshCorruptorPresentation.ts'), 'utf8');

assert.match(typesSource, /'zombieRuinBrute'/, 'wire type must announce the exact brute variant');
assert.match(typesSource, /type: 'enemy-brute-warning'/);
assert.match(typesSource, /type: 'enemy-brute-impact'/);
assert.match(typesSource, /type: 'enemy-brute-exposed'/);
assert.match(gameSource, /ruinBruteEventPresentationGate\(event, entities\)/, 'every brute event must cross the central gate');
assert.match(gameSource, /showRuinCleaveWarning\(\s*brute\.position,\s*brute\.rotationY/s, 'warning must use wire origin/yaw');
assert.match(gameSource, /showRuinCleaveImpact\(\s*brute\.position,\s*brute\.rotationY/s, 'impact must use wire origin/yaw');
assert.match(gameSource, /showRuinBruteExposed\(brute\.position, brute\.guarder\.id\)/, 'exposed burst must use its wire position');
assert.match(gameSource, /ruin-cleave-warning-authoritative-sector/, 'warning must render a named oriented sector');
assert.match(gameSource, /ruin-cleave-warning-sector-ray/, 'warning sector must use readable rays');
assert.match(gameSource, /ruin-cleave-warning-rear-stop/, 'warning must distinguish the safe rear');
assert.match(gameSource, /ruin-cleave-impact-sector-wave/, 'impact must repeat the authoritative sector');
assert.match(gameSource, /ruin-cleave-impact-sector-dust/, 'impact needs sector-localized dust');
assert.match(gameSource, /ruin-exposed-event-armor-shard/, 'event must visibly break armor');
assert.match(gameSource, /ruin-exposed-status-overlay/, 'status must maintain a persistent overlay');
assert.match(gameSource, /syncRuinExposedStatus\(view, e, entities\)/, 'overlay must reconcile every snapshot');
assert.match(gameSource, /clearRuinExposedVisual\(view\)/, 'overlay lifecycle must explicitly clean up');
assert.match(gameSource, /ruin-brute-shoulder-/, 'brute adornment must carry broad shoulders');
assert.match(gameSource, /ruin-brute-armor-plate/, 'brute adornment must carry armor plates');
assert.match(gameSource, /ruin-brute-maul-head/, 'brute adornment must carry an unmistakable heavy mass');
assert.match(hudSource, /ruinExposedStatusPresentationGate\(target, entities\)/, 'HUD status must share the strict gate');
assert.match(hudSource, /return 'Exposto'/, 'HUD must label the exposure chip');
assert.match(hudSource, /enemyPresentation\.minimapRingColor/, 'minimap must honor the brute ring and size');
assert.match(stylesSource, /data-enemy-variant='zombieRuinBrute'/, 'target frame must style the brute identity');
assert.match(stylesSource, /data-status='ruin-exposed'/, 'exposure chip needs its own style');
assert.match(ashSource, /target\.enemyVariant !== 'zombieRuinBrute'/, 'Ash Veil must explicitly accept Brute as ally/status target');
assert.match(packageSource, /"verify:ruin-brute"/, 'package must expose the focused verifier');

const warningMethod = gameSource.slice(
  gameSource.indexOf('private showRuinCleaveWarning'),
  gameSource.indexOf('private showRuinCleaveImpact'),
);
assert.match(warningMethod, /setEntityPosition\(sector, position\)/, 'warning root must stay at event origin');
assert.match(warningMethod, /setYaw\(sector, rotationY\)/, 'warning root must stay at event yaw');
assert.match(warningMethod, /FadingEntityEffect\(sector, material, delay/, 'warning must persist for authoritative delay');
assert.doesNotMatch(warningMethod, /'torus'|this\.views|latestEntities|entities\.(?:find|filter)|this\.net\.send/, 'warning cannot be a full circle or query/simulate local state');

const impactMethod = gameSource.slice(
  gameSource.indexOf('private showRuinCleaveImpact'),
  gameSource.indexOf('private showRuinBruteExposed'),
);
assert.doesNotMatch(impactMethod, /'torus'|this\.views|latestEntities|entities\.(?:find|filter)|this\.net\.send/, 'impact cannot become a circle or local simulation');

const commandSection = typesSource.slice(typesSource.indexOf('export type Command ='));
assert.doesNotMatch(commandSection, /ruin-cleave|ruin-exposed|enemy-brute|zombieRuinBrute/, 'brute mechanics must add no client command');

console.info('ruin brute constants, strict gates, oriented VFX, status, HUD and lifecycle verification passed');
