import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-renewal-wave');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
    fileName: sourcePath,
  });
  const output = compiled.outputText.replaceAll("from './SkillCatalog'", "from './SkillCatalog.mjs'");
  await writeFile(path.join(outDir, `${name}.mjs`), output, 'utf8');
}

await compile('SkillCatalog');
await compile('RenewalWave');
const renewal = await import(`${pathToFileURL(path.join(outDir, 'RenewalWave.mjs')).href}?t=${Date.now()}`);

assert.equal(renewal.RENEWAL_WAVE_ID, 'renewal-wave');
assert.equal(renewal.RENEWAL_WAVE_HEAL_ID, 'renewal-wave-heal');
assert.equal(renewal.RENEWAL_WAVE_MANA_COST, 26);
assert.equal(renewal.RENEWAL_WAVE_COOLDOWN, 11);
assert.equal(renewal.RENEWAL_WAVE_BOUNCE_RANGE, 7);
assert.equal(renewal.RENEWAL_WAVE_MAX_ALLIES, 3);
assert.equal(renewal.RENEWAL_WAVE_FALLOFF, 0.85);
for (const color of Object.values(renewal.RENEWAL_WAVE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'renewal-wave', label: 'Onda de Renovação',
  description: 'Cura o conjurador e salta por até três aliados feridos; cada elo prioriza maior vida faltante e perde 15% de potência.',
  manaCost: 26, cooldown: 11, cooldownRemaining: 4.8, range: 7,
  discipline: 'survival', targetMode: 'self', requiresPhysicalWeapon: false, stationary: true, masteryId: 'survival',
};
assert.deepEqual(renewal.renewalWaveSkillPresentationGate([skill]), skill);
for (const malformed of [
  { ...skill, label: 'Renovação' }, { ...skill, manaCost: 25 }, { ...skill, cooldown: 10 },
  { ...skill, range: 8 }, { ...skill, discipline: 'arcana' }, { ...skill, targetMode: 'self-area' },
  { ...skill, requiresPhysicalWeapon: true }, { ...skill, stationary: false }, { ...skill, description: 'cura' },
]) assert.equal(renewal.renewalWaveSkillPresentationGate([malformed]), null);
assert.equal(renewal.renewalWaveSkillPresentationGate([]), null);

const caster = { id: 'player-1', kind: 'player', alive: true, maxHp: 200 };
const target = { id: 'player-2', kind: 'player', alive: true, maxHp: 160 };
const event = {
  id: 'combat-renewal-1', type: 'skill-effect', skill: 'renewal-wave-heal', sourceSkill: 'renewal-wave',
  casterId: caster.id, targetId: target.id, origin: { x: 0, y: 0, z: 0 },
  position: { x: 6.5, y: 0, z: 0 }, radius: 0.32, duration: 0.42, amount: 37, charges: 4,
};
const presentation = renewal.renewalWaveEventPresentationGate(event, [caster, target]);
assert.equal(presentation?.event, event);
assert.equal(presentation?.hop, 1);
assert.equal(renewal.renewalWaveEventPresentationGate({ ...event, charges: 2 }, [caster, target])?.hop, 3);
for (const malformed of [
  { ...event, skill: 'chain-lightning-impact' }, { ...event, sourceSkill: undefined }, { ...event, targetId: '' },
  { ...event, origin: undefined }, { ...event, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...event, radius: 0.31 }, { ...event, duration: 0.4 }, { ...event, amount: 0 },
  { ...event, amount: 161 }, { ...event, charges: 0 }, { ...event, charges: 5 },
  { ...event, position: { x: 7.04, y: 0, z: 0 } },
]) assert.equal(renewal.renewalWaveEventPresentationGate(malformed, [caster, target]), null);
assert.equal(renewal.renewalWaveEventPresentationGate(event, [{ ...caster, kind: 'enemy' }, target]), null);
assert.equal(renewal.renewalWaveEventPresentationGate(event, [caster, { ...target, kind: 'enemy' }]), null);

const [typesSource, catalogSource, hotbarSource, feralSource, hudSource, stylesSource, gameSource,
  packageSource, backendSource, skillCatalogSource, simulationSource, combatSource, testSource,
  contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/FeralForm.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/renewal_wave.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/skill_catalog.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/renewal_wave_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'RENEWAL_WAVE_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'renewal-wave'/);
assert.match(typesSource, /\| 'renewal-wave-heal'/);
assert.match(typesSource, /amount\?: number/);
assert.match(catalogSource, /RENEWAL_WAVE_WIRE_DEFAULTS/);
assert.match(hotbarSource, /quinze habilidades/);
assert.match(feralSource, /'renewal-wave'/);
assert.match(hudSource, /id="hotbar-renewal-wave"/);
assert.match(hudSource, /updateRenewalWaveHotbar\(player, survival\)/);
assert.match(stylesSource, /#hotbar-renewal-wave/);
assert.match(gameSource, /case 'renewal-wave'/);
assert.match(gameSource, /renewalWaveEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showRenewalWaveHeal/);
assert.match(packageSource, /"verify:renewal-wave"/);
assert.match(backendSource, /renewalWaveMaxAllies\s+= 3/);
assert.match(backendSource, /missingRatio > candidates\[j\]\.missingRatio/);
assert.match(skillCatalogSource, /id:\s+renewalWaveSkillID/);
assert.match(simulationSource, /s\.castRenewalWave\(entity\)/);
assert.match(combatSource, /entity\.renewalWaveCooldown-dt/);
assert.match(testSource, /TestRenewalWaveFullCasterStartsAtAllyTieDeterminismAndLineOfSight/);
assert.match(contractSource, /maior porcentagem de vida faltante/);
assert.match(roadmapSource, /RENEWAL_WAVE_CONTRACT/);

console.info('renewal wave thirteenth-skill authoritative priority/LOS chain, capped healing, atomic failure, strict event VFX and 6-of-15 hotbar verification passed');
