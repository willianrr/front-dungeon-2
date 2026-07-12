import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-boss-seal-rupture');
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

const seal = await compileShared('BossSealRupturePresentation');
assert.equal(seal.BOSS_SEAL_VARIANT, 'zombieBoss');
assert.equal(seal.BOSS_SEAL_RUPTURE_SKILL, 'seal-rupture');
assert.equal(seal.BOSS_SEAL_PULSE_SKILL, 'seal-pulse');
assert.equal(seal.BOSS_SEAL_RADIUS, 8);
assert.equal(seal.BOSS_SEAL_RUPTURE_DURATION, 1.4);
assert.equal(seal.BOSS_SEAL_PULSE_INNER_RADIUS, 2.4);
assert.equal(seal.BOSS_SEAL_PULSE_DELAY, 1.2);

const palette = Object.values(seal.BOSS_SEAL_PALETTE);
assert.equal(new Set(palette).size, palette.length, 'phase II palette colors must remain distinct');
for (const color of palette) assert.match(color, /^#[0-9a-f]{6}$/i);

const entity = (id, kind, enemyVariant, alive = true, bossPhase = undefined) => ({
  id,
  kind,
  ...(enemyVariant !== undefined ? { enemyVariant } : {}),
  ...(bossPhase !== undefined ? { bossPhase } : {}),
  alive,
  position: { x: id.length, y: 0, z: id.length * 2 },
});
const legacyBoss = entity('legacy-boss', 'enemy', 'zombieBoss');
const phaseOneBoss = entity('phase-one-boss', 'enemy', 'zombieBoss', true, 1);
const phaseTwoBoss = entity('phase-two-boss', 'enemy', 'zombieBoss', true, 2);
const deadPhaseTwoBoss = { ...phaseTwoBoss, alive: false };
const zombie = entity('zombie', 'enemy', 'zombie');
const player = entity('player', 'player', undefined);

assert.deepEqual(seal.bossPhasePresentationGate(legacyBoss), { applies: true, phase: 1, legacy: true });
assert.deepEqual(seal.bossPhasePresentationGate(phaseOneBoss), { applies: true, phase: 1, legacy: false });
assert.deepEqual(seal.bossPhasePresentationGate(phaseTwoBoss), { applies: true, phase: 2, legacy: false });
assert.deepEqual(seal.bossPhasePresentationGate(zombie), { applies: false });
assert.deepEqual(seal.bossPhasePresentationGate(player), { applies: false });
for (const malformed of [
  null,
  {},
  { ...phaseTwoBoss, id: '' },
  { ...phaseTwoBoss, alive: undefined },
  { ...phaseTwoBoss, alive: 'yes' },
  { ...phaseTwoBoss, bossPhase: 0 },
  { ...phaseTwoBoss, bossPhase: 3 },
  { ...phaseTwoBoss, bossPhase: Number.NaN },
  { ...phaseTwoBoss, bossPhase: '2' },
  { ...phaseTwoBoss, bossPhase: null },
  { ...zombie, bossPhase: 1 },
  { ...zombie, bossPhase: 2 },
  { ...player, bossPhase: 2 },
  { ...player, enemyVariant: 'zombieBoss' },
]) {
  assert.equal(seal.bossPhasePresentationGate(malformed), null);
}

const frozenPosition = { x: 19.25, y: -0.15, z: -11.5 };
const rupture = {
  id: 'seal-rupture-1',
  type: 'boss-seal-rupture',
  casterId: phaseTwoBoss.id,
  skill: 'seal-rupture',
  position: frozenPosition,
  radius: 8,
  duration: 1.4,
};
const warning = {
  id: 'seal-pulse-warning-1',
  type: 'boss-seal-pulse-warning',
  casterId: phaseTwoBoss.id,
  skill: 'seal-pulse',
  position: frozenPosition,
  innerRadius: 2.4,
  radius: 8,
  delay: 1.2,
};
const impact = {
  id: 'seal-pulse-impact-1',
  type: 'boss-seal-pulse-impact',
  casterId: phaseTwoBoss.id,
  skill: 'seal-pulse',
  position: frozenPosition,
  innerRadius: 2.4,
  radius: 8,
};

const gatedRupture = seal.bossSealEventPresentationGate(rupture, [phaseTwoBoss]);
assert.equal(gatedRupture?.type, 'rupture');
assert.equal(gatedRupture?.boss, phaseTwoBoss);
assert.equal(gatedRupture?.historical, false);
assert.equal(gatedRupture?.position, frozenPosition, 'transition must preserve wire position');
const gatedWarning = seal.bossSealEventPresentationGate(warning, [phaseTwoBoss]);
assert.equal(gatedWarning?.type, 'pulse-warning');
assert.equal(gatedWarning?.innerRadius, 2.4);
assert.equal(gatedWarning?.radius, 8);
assert.equal(gatedWarning?.delay, 1.2);
assert.equal(gatedWarning?.position, frozenPosition, 'warning must preserve its frozen origin');
const gatedImpact = seal.bossSealEventPresentationGate(impact, [phaseTwoBoss]);
assert.equal(gatedImpact?.type, 'pulse-impact');
assert.equal(gatedImpact?.position, frozenPosition, 'impact must preserve its frozen origin');

// Historico presente exige identidade fase II; removido usa somente o wire congelado.
assert.equal(seal.bossSealEventPresentationGate(rupture, [deadPhaseTwoBoss])?.historical, true);
assert.equal(seal.bossSealEventPresentationGate(warning, [deadPhaseTwoBoss])?.type, 'pulse-warning');
assert.equal(seal.bossSealEventPresentationGate(impact, [deadPhaseTwoBoss])?.type, 'pulse-impact');
assert.equal(seal.bossSealEventPresentationGate(rupture, [])?.boss, null);
assert.equal(seal.bossSealEventPresentationGate(warning, [])?.historical, true);
assert.equal(seal.bossSealEventPresentationGate(impact, [])?.historical, true);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, bossPhase: 1 }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, bossPhase: 1, alive: false }]), null);
assert.equal(seal.bossSealEventPresentationGate(warning, [{ ...phaseTwoBoss, bossPhase: undefined }]), null);
assert.equal(seal.bossSealEventPresentationGate(impact, [{ ...phaseTwoBoss, bossPhase: undefined, alive: false }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, enemyVariant: 'zombie' }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, enemyVariant: 'zombie', alive: false }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, kind: 'player', enemyVariant: undefined }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, alive: undefined }]), null);
assert.equal(seal.bossSealEventPresentationGate(rupture, [{ ...phaseTwoBoss, alive: 'yes' }]), null);
assert.equal(
  seal.bossSealEventPresentationGate(rupture, [phaseTwoBoss, { ...phaseTwoBoss }]),
  null,
  'duplicate caster identities must close the gate',
);

for (const malformed of [
  null,
  {},
  { ...rupture, id: '' },
  { ...rupture, casterId: '' },
  { ...rupture, skill: 'seal-pulse' },
  { ...rupture, position: undefined },
  { ...rupture, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...rupture, position: { x: 0, y: Number.POSITIVE_INFINITY, z: 0 } },
  { ...rupture, radius: 7.99 },
  { ...rupture, radius: 8.01 },
  { ...rupture, radius: Number.NaN },
  { ...rupture, duration: 1.39 },
  { ...rupture, duration: 1.41 },
  { ...rupture, innerRadius: 2.4 },
  { ...rupture, delay: 1.2 },
  { ...warning, skill: 'seal-rupture' },
  { ...warning, innerRadius: 2.39 },
  { ...warning, innerRadius: 2.41 },
  { ...warning, innerRadius: Number.NaN },
  { ...warning, radius: 7.99 },
  { ...warning, delay: 1.19 },
  { ...warning, delay: 1.21 },
  { ...warning, duration: 1.4 },
  { ...impact, delay: 1.2 },
  { ...impact, duration: 1.4 },
  { ...impact, radius: 0 },
  { ...impact, innerRadius: 0 },
  { ...impact, type: 'boss-seal-pulse-future' },
  { ...rupture, targetId: player.id },
  { ...rupture, amount: 0 },
  { ...rupture, damageKind: 'physical' },
  { ...rupture, critical: false },
  { ...rupture, variant: 'hammer' },
  { ...rupture, sourceSkill: 'seal-pulse' },
  { ...rupture, damageEffect: 'bleed' },
  { ...rupture, rotationY: 0 },
  { ...rupture, arcDegrees: 80 },
  { ...rupture, encounterId: 'seal-chamber' },
  { ...rupture, wave: 1 },
  { ...warning, encounterId: 'seal-chamber' },
  { ...impact, wave: 2 },
]) {
  assert.equal(seal.bossSealEventPresentationGate(malformed, [phaseTwoBoss, player]), null);
}

const gameSource = await readFile(path.join(root, 'src/core/Game.ts'), 'utf8');
const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
const stylesSource = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const typesSource = await readFile(path.join(root, 'src/shared/types.ts'), 'utf8');
const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');
const readmeSource = await readFile(path.join(root, 'README.md'), 'utf8');
const chamberSource = await readFile(path.join(root, 'src/shared/SealChamberPresentation.ts'), 'utf8');

assert.match(typesSource, /bossPhase\?: 1 \| 2/, 'entity wire must expose only phases 1 and 2');
assert.match(typesSource, /type: 'boss-seal-rupture'/);
assert.match(typesSource, /type: 'boss-seal-pulse-warning'/);
assert.match(typesSource, /type: 'boss-seal-pulse-impact'/);
assert.match(typesSource, /innerRadius: number/, 'pulse wire must carry its safe-core radius');
assert.match(typesSource, /sourceSkill\?: SkillId \| EnemyBruteSkill \| BossSealSkill/, 'damage wire must admit seal-pulse');
assert.match(gameSource, /bossSealEventPresentationGate\(event, entities\)/, 'every phase II event must cross the central gate');
assert.match(gameSource, /if \(!seal \|\| this\.zone !== 'dungeon'\) continue/, 'historical events must remain dungeon-only');
assert.match(gameSource, /showBossSealRupture\(seal\.position, seal\.radius, seal\.duration\)/, 'transition must use only gated wire geometry');
assert.match(gameSource, /showBossSealPulseWarning\(\s*seal\.position,\s*seal\.innerRadius,\s*seal\.radius,\s*seal\.delay/s, 'warning must use gated wire geometry');
assert.match(gameSource, /showBossSealPulseImpact\(seal\.position, seal\.innerRadius, seal\.radius\)/, 'impact must use gated wire geometry');

assert.match(gameSource, /boss-seal-phase2-persistent-aura/, 'phase II needs a persistent aura');
assert.match(gameSource, /boss-seal-phase2-ruptured-crown/, 'phase II needs a persistent crown');
assert.match(gameSource, /boss-seal-phase2-chest-crack/, 'phase II needs visible seal cracks');
assert.match(gameSource, /syncBossSealPhaseVisual\(view, e\)/, 'phase visual must reconcile every entity snapshot');
assert.match(gameSource, /clearBossSealPhaseVisual\(view\)/, 'phase visual needs explicit cleanup');
assert.match(gameSource, /for \(const view of this\.views\.values\(\)\) this\.clearBossSealPhaseVisual\(view\)/, 'zone transition must clean persistent phase visuals');
assert.match(gameSource, /this\.zone === 'dungeon'[\s\S]*phase\?\.applies === true[\s\S]*phase\.phase === 2/, 'persistent aura must be gated to a live phase II dungeon boss');

assert.match(gameSource, /boss-seal-rupture-authoritative-transition/);
assert.match(gameSource, /FadingEntityEffect\(root, material, duration, 0\.72\)/, 'transition must persist for wire duration');
assert.match(gameSource, /addShake\(0\.38\)/, 'transition needs moderate feedback');
assert.match(gameSource, /boss-seal-pulse-warning-authoritative-annulus/);
assert.match(gameSource, /boss-seal-pulse-warning-danger-band/);
assert.match(gameSource, /boss-seal-pulse-warning-inner-boundary/);
assert.match(gameSource, /boss-seal-pulse-warning-outer-boundary/);
assert.match(gameSource, /boss-seal-pulse-safe-core-shield-symbol/);
assert.match(gameSource, /NÚCLEO SEGURO/, 'safe core must have explicit textual guidance');
assert.match(gameSource, /boss-seal-pulse-impact-authoritative-annulus/);
assert.match(gameSource, /boss-seal-pulse-impact-annular-wave/);
assert.match(gameSource, /boss-seal-pulse-impact-annular-shard/);

const warningMethod = gameSource.slice(
  gameSource.indexOf('private showBossSealPulseWarning'),
  gameSource.indexOf('private showBossSealPulseImpact'),
);
assert.match(warningMethod, /setEntityPosition\(dangerRoot, position\)/);
assert.match(warningMethod, /setEntityPosition\(safeRoot, position\)/);
assert.match(warningMethod, /innerRadius \+ bandWidth \* ratio/, 'danger band must begin outside the safe core');
assert.match(warningMethod, /FadingEntityEffect\(dangerRoot, dangerMaterial, delay/);
assert.match(warningMethod, /FadingEntityEffect\(safeRoot, safeMaterial, delay/);
assert.doesNotMatch(warningMethod, /'sphere'|'plane'|'cylinder'/, 'warning cannot fill the safe core with a disc');
assert.doesNotMatch(warningMethod, /this\.views|latestEntities|entities\.(?:find|filter)|groundHeightAt|this\.net\.send|collision|damage/i, 'warning cannot query or simulate gameplay');

const impactMethod = gameSource.slice(
  gameSource.indexOf('private showBossSealPulseImpact'),
  gameSource.indexOf('private showBossSlamWarning'),
);
assert.match(impactMethod, /innerRadius \+ bandWidth \* ratio/);
assert.match(impactMethod, /innerRadius \+ bandWidth \* \(index % 2 === 0 \? 0\.28 : 0\.74\)/);
assert.doesNotMatch(impactMethod, /'sphere'|'plane'|'cylinder'|PulseEffect|showHitImpact/, 'impact must remain an annulus, never a filled circle');
assert.doesNotMatch(impactMethod, /this\.views|latestEntities|entities\.(?:find|filter)|groundHeightAt|this\.net\.send|collision|damage/i, 'impact cannot query or simulate gameplay');

assert.match(hudSource, /Fase II • Ruptura do Selo/, 'target frame must announce phase II');
assert.match(hudSource, /chip\.textContent = 'Ruptura'/, 'target frame must add the Ruptura chip');
assert.match(hudSource, /dataset\.bossPhase = '2'/);
assert.match(hudSource, /BOSS_SEAL_PALETTE\.minimapRing/, 'minimap must use the phase II-only ring');
assert.match(hudSource, /bossPhase\?\.applies === true && bossPhase\.phase === 2/, 'HUD phase effects must share the phase gate');
assert.match(stylesSource, /data-enemy-variant='zombieBoss'\]\[data-boss-phase='2'/, 'phase II target frame needs its own style');
assert.match(stylesSource, /data-status='boss-seal-rupture'/, 'Ruptura chip needs its own style');

const commandSection = typesSource.slice(typesSource.indexOf('export type Command ='));
assert.doesNotMatch(commandSection, /boss-seal|seal-pulse|seal-rupture|bossPhase/, 'phase II must add no client command');
assert.match(packageSource, /"verify:boss-seal-rupture"/);
assert.match(readmeSource, /Ruptura do Selo/);
// A segunda fase e aditiva: a Câmara do Selo continua com contrato e render próprios.
assert.match(typesSource, /EncounterSealArmingCombatEvent/);
assert.match(gameSource, /sealChamberEventPresentationGate\(event\)/);
assert.match(gameSource, /syncSealChamberPresentation/);
assert.match(packageSource, /"verify:seal-chamber"/);
assert.match(chamberSource, /sealChamberStatePresentationGate/);

console.info('boss phase II wire gates, historical events, annular VFX, lifecycle, HUD and chamber compatibility verification passed');
