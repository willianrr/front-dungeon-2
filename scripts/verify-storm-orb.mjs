import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-storm-orb');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/StormOrb.ts');
const outputPath = path.join(outDir, 'StormOrb.mjs');
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
const orb = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(orb.STORM_ORB_ID, 'storm-orb');
assert.equal(orb.STORM_ORB_LABEL, 'Orbe da Tempestade');
assert.equal(orb.STORM_ORB_MANA_COST, 22);
assert.equal(orb.STORM_ORB_COOLDOWN, 12);
assert.equal(orb.STORM_ORB_DURATION, 8);
assert.equal(orb.STORM_ORB_MAX_CHARGES, 5);
assert.equal(orb.STORM_ORB_RANGE, 9);
assert.equal(orb.STORM_ORB_CAST_RADIUS, 1.4);
assert.equal(orb.STORM_ORB_DISCHARGE_RADIUS, 0.9);
assert.equal(orb.STORM_ORB_DISCHARGE_MODIFIER_ID, 'storm_orb_autonomous');
for (const color of Object.values(orb.STORM_ORB_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'storm-orb', label: 'Orbe da Tempestade',
  description: 'Invoca um orbe de quatro cargas que ataca autonomamente inimigos visíveis próximos.',
  discipline: 'arcana', targetMode: 'self', stationary: true, requiresPhysicalWeapon: false,
  masteryId: 'arcana', manaCost: 22, cooldown: 12, cooldownRemaining: 7.4, range: 9,
};
assert.equal(orb.stormOrbSkillPresentationGate([skill]), skill);
for (const malformed of [
  [], [skill, skill],
  [{ ...skill, label: 'Orbe' }],
  [{ ...skill, description: 'Ataca.' }],
  [{ ...skill, discipline: 'survival' }],
  [{ ...skill, targetMode: 'enemy' }],
  [{ ...skill, stationary: false }],
  [{ ...skill, manaCost: 21 }],
  [{ ...skill, cooldown: 11.9 }],
  [{ ...skill, cooldownRemaining: 12.1 }],
  [{ ...skill, range: 8.9 }],
  [{ ...skill, pending: true }],
]) assert.equal(orb.stormOrbSkillPresentationGate(malformed), null);

const player = {
  id: 'player-1', kind: 'player', alive: true,
  buffs: [{ id: 'storm-orb', label: 'Orbe da Tempestade', remaining: 6.4, duration: 8, charges: 3 }],
};
assert.equal(orb.stormOrbBuffPresentationGate(player)?.buff, player.buffs[0]);
assert.equal(orb.stormOrbBuffPresentationGate({ ...player, buffs: [{ ...player.buffs[0], charges: 5 }] })?.buff.charges, 5);
for (const malformed of [
  { ...player, kind: 'enemy' },
  { ...player, alive: false },
  { ...player, buffs: [] },
  { ...player, buffs: [...player.buffs, player.buffs[0]] },
  { ...player, buffs: [{ ...player.buffs[0], label: 'Orbe' }] },
  { ...player, buffs: [{ ...player.buffs[0], remaining: -0.1 }] },
  { ...player, buffs: [{ ...player.buffs[0], remaining: 8.1 }] },
  { ...player, buffs: [{ ...player.buffs[0], duration: 7.9 }] },
  { ...player, buffs: [{ ...player.buffs[0], charges: 0 }] },
  { ...player, buffs: [{ ...player.buffs[0], charges: 6 }] },
  { ...player, buffs: [{ ...player.buffs[0], charges: 2.5 }] },
  { ...player, buffs: [{ ...player.buffs[0], targetId: 'enemy-1' }] },
]) assert.equal(orb.stormOrbBuffPresentationGate(malformed), null);

const enemy = { id: 'enemy-1', kind: 'enemy', alive: true };
const cast = {
  id: 'combat-orb-cast', type: 'skill-effect', casterId: player.id, skill: 'storm-orb',
  position: { x: 0, y: 1, z: 0 }, radius: 1.4, duration: 8,
};
const discharge = {
  id: 'combat-orb-discharge', type: 'storm-orb-discharge', casterId: player.id, targetId: enemy.id,
  skill: 'storm-orb', variant: 'discharge', modifierId: 'storm_orb_autonomous', charges: 2,
  origin: { x: 0, y: 1, z: 0 }, position: { x: 4, y: 1, z: 0 }, radius: 0.9,
};
assert.equal(orb.stormOrbEventPresentationGate(cast, [player, enemy])?.phase, 'cast');
assert.equal(orb.stormOrbEventPresentationGate(discharge, [player, enemy])?.phase, 'discharge');
assert.equal(orb.stormOrbEventPresentationGate({ ...discharge, charges: 4 }, [player, enemy])?.phase, 'discharge');
assert.equal(orb.stormOrbEventPresentationGate(discharge, [])?.historical, true);
for (const malformed of [
  { ...cast, id: '' },
  { ...cast, casterId: '' },
  { ...cast, radius: 1.39 },
  { ...cast, duration: 7.9 },
  { ...cast, targetId: enemy.id },
  { ...cast, variant: 'cast' },
  { ...cast, charges: 4 },
  { ...discharge, targetId: '' },
  { ...discharge, variant: 'impact' },
  { ...discharge, modifierId: 'storm_orb' },
  { ...discharge, charges: -1 },
  { ...discharge, charges: 5 },
  { ...discharge, charges: 1.5 },
  { ...discharge, origin: { x: Number.NaN, y: 0, z: 0 } },
  { ...discharge, radius: 1 },
  { ...discharge, duration: 8 },
  { ...discharge, amount: 18 },
]) assert.equal(orb.stormOrbEventPresentationGate(malformed, [player, enemy]), null);
assert.equal(orb.stormOrbEventPresentationGate(cast, [{ ...player, kind: 'enemy' }]), null);
assert.equal(orb.stormOrbEventPresentationGate(discharge, [player, { ...enemy, kind: 'player' }]), null);

const [typesSource, catalogSource, hotbarSource, gameSource, hudSource, stylesSource, packageSource, readmeSource,
  backendSource, catalogBackendSource, simulationSource, stateSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/storm_orb.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/skill_catalog.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'STORM_ORB_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);

assert.match(typesSource, /\| 'storm-orb'/);
assert.match(typesSource, /type: 'storm-orb-discharge'/);
assert.match(typesSource, /charges\?: number/);
assert.match(catalogSource, /'storm-orb'/);
assert.match(catalogSource, /STORM_ORB_WIRE_DEFAULTS/);
assert.match(hotbarSource, /HOTBAR_SKILL_SLOT_COUNT = 6/);
assert.match(gameSource, /case 'storm-orb'/);
assert.match(gameSource, /stormOrbEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /stormOrbBuffPresentationGate\(entity\)/);
assert.match(gameSource, /private showStormOrbDischarge/);
assert.match(gameSource, /private syncStormOrbVisual/);
assert.match(hudSource, /id="hotbar-storm-orb"/);
assert.match(hudSource, /updateStormOrbHotbar\(player\)/);
assert.match(stylesSource, /#hotbar-storm-orb/);
assert.match(packageSource, /"verify:storm-orb"/);
assert.match(readmeSource, /Orbe da Tempestade/);

assert.match(backendSource, /stormOrbManaCost\s+= 22\.0/);
assert.match(backendSource, /stormOrbCharges\s+= 4/);
assert.match(backendSource, /sort\.Slice/);
assert.match(backendSource, /projectileLineClear/);
assert.match(backendSource, /dealPureMagicSpellDamage\(player, target, damage, "storm-orb"\)/);
assert.match(catalogBackendSource, /id:\s+"storm-orb"/);
assert.match(simulationSource, /s\.updateStormOrbs\(dt\)/);
assert.match(simulationSource, /float64\(events\[i\]\.Charges\)/);
assert.match(stateSource, /Charges\s+int\s+`json:"charges,omitempty"`/);
assert.match(contractSource, /nona habilidade do catálogo/);
assert.match(contractSource, /não aplica Marca de Ressonância/);
assert.match(roadmapSource, /Prioridade 1 — Magia de Orbe/);

const vfxSource = gameSource.slice(
  gameSource.indexOf('private showStormOrbCast'),
  gameSource.indexOf('private showActiveEvasionTrail'),
);
assert.doesNotMatch(vfxSource, /this\.net\.send|latestEntities|dealDamage|collision|stormOrbTargetFor/i,
  'storm orb VFX must remain presentation-only');

console.info('storm orb ninth-skill gate, four base/five set-charge cap, discharge event, 6-of-11 hotbar and authoritative scheduler verification passed');
