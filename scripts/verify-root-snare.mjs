import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-root-snare');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const outputPath = path.join(outDir, `${name}.mjs`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
    fileName: sourcePath,
  });
  await writeFile(outputPath, compiled.outputText, 'utf8');
  return import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
}

const roots = await compile('RootSnare');
const catalog = await compile('SkillCatalog');
assert.equal(roots.ROOT_SNARE_ID, 'root-snare');
assert.equal(roots.ROOT_SNARE_LABEL, 'Círculo de Raízes');
assert.equal(roots.ROOT_SNARE_MANA_COST, 24);
assert.equal(roots.ROOT_SNARE_COOLDOWN, 9);
assert.equal(roots.ROOT_SNARE_RANGE, 10);
assert.equal(roots.ROOT_SNARE_RADIUS, 3.6);
assert.equal(roots.ROOT_SNARE_DURATION, 4);
assert.equal(roots.ROOT_SNARE_SLOW_MULTIPLIER, 0.65);
assert.equal(roots.ROOT_SNARE_STATUS_GRACE, 0.35);
for (const color of Object.values(roots.ROOT_SNARE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'root-snare', label: 'Círculo de Raízes',
  description: 'Cria por 4 s uma área de raízes que reduz movimento em 35% e atrasa a primeira ação de até oito inimigos.',
  discipline: 'survival', targetMode: 'ground', stationary: true, requiresPhysicalWeapon: false,
  masteryId: 'survival', manaCost: 24, cooldown: 9, cooldownRemaining: 4, range: 10,
};
assert.equal(roots.rootSnareSkillPresentationGate([skill]), skill);
for (const malformed of [
  [], [skill, skill], [{ ...skill, targetMode: 'enemy' }], [{ ...skill, range: 9.9 }],
  [{ ...skill, cooldownRemaining: 9.1 }], [{ ...skill, blockedReason: 'sem blocked' }],
]) assert.equal(roots.rootSnareSkillPresentationGate(malformed), null);

const zone = {
  id: 'root-snare-17', kind: 'root-snare', casterId: 'player-1',
  position: { x: 2, y: 0.4, z: -1 }, radius: 3.6, remaining: 2.7, duration: 4, slowMultiplier: 0.65,
};
assert.equal(roots.rootSnareZonePresentationGate(zone), zone);
for (const malformed of [
  { ...zone, id: 'zone-17' }, { ...zone, kind: 'future' }, { ...zone, radius: 3.5 },
  { ...zone, remaining: 0 }, { ...zone, remaining: 4.1 }, { ...zone, slowMultiplier: 0.7 },
  { ...zone, position: { x: Number.NaN, y: 0, z: 0 } },
]) assert.equal(roots.rootSnareZonePresentationGate(malformed), null);
assert.deepEqual(roots.rootSnareZonesPresentationGate([zone, zone, { ...zone, id: 'bad' }]), [zone]);

const player = { id: 'player-1', kind: 'player', alive: true };
const enemy = {
  id: 'enemy-1', kind: 'enemy', alive: true,
  statuses: [{ id: 'root-snare', sourceId: player.id, sourceSkill: 'root-snare', remaining: 0.2, duration: 0.35 }],
};
assert.equal(roots.rootSnareStatusPresentationGate(enemy, [player, enemy])?.status, enemy.statuses[0]);
for (const malformed of [
  { ...enemy, kind: 'player' }, { ...enemy, statuses: [] },
  { ...enemy, statuses: [{ ...enemy.statuses[0], sourceSkill: 'arcane-bolt' }] },
  { ...enemy, statuses: [{ ...enemy.statuses[0], duration: 4 }] },
]) assert.equal(roots.rootSnareStatusPresentationGate(malformed, [player, enemy]), null);

const cast = {
  id: 'combat-root-cast', type: 'skill-effect', casterId: player.id, skill: 'root-snare',
  position: zone.position, radius: 3.6, duration: 4,
};
assert.equal(roots.rootSnareEventPresentationGate(cast, [player, enemy])?.historical, false);
for (const malformed of [
  { ...cast, radius: 3.5 }, { ...cast, duration: 3.9 }, { ...cast, targetId: enemy.id }, { ...cast, amount: 1 },
]) assert.equal(roots.rootSnareEventPresentationGate(malformed, [player, enemy]), null);

const announced = catalog.catalogSkill([skill], 'root-snare');
assert.ok(announced);
assert.equal(announced.targetMode, 'ground');
assert.equal(catalog.skillCastPlan(announced).failure, 'ground-target-required');
const plan = catalog.skillCastPlan(announced, { groundTargetAvailable: true });
assert.equal(plan.allowed, true);
assert.equal(plan.clearMovement, true);

const [typesSource, catalogSource, gateSource, visualSource, gameSource, hudSource, stylesSource, packageSource,
  backendSource, simulationSource, stateSource, statusSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/RootSnare.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/RootSnareVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/root_snare.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/status.go'), 'utf8'),
  readFile(path.join(backendRoot, 'ROOT_SNARE_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'root-snare'/);
assert.match(typesSource, /export interface ControlZoneState/);
assert.match(typesSource, /controlZones: ControlZoneState\[\]/);
assert.match(catalogSource, /ROOT_SNARE_WIRE_DEFAULTS/);
assert.match(catalogSource, /groundTargetAvailable/);
assert.match(gateSource, /rootSnareZonePresentationGate/);
assert.match(visualSource, /createRootSnareVisual/);
assert.match(gameSource, /case 'root-snare'/);
assert.match(gameSource, /reconcileControlZones\(snapshot\.controlZones\)/);
assert.match(gameSource, /rootSnareEventPresentationGate\(event, entities\)/);
assert.match(hudSource, /id="hotbar-root-snare"/);
assert.match(hudSource, /rootSnareStatusPresentationGate\(target, entities\)/);
assert.match(stylesSource, /#hotbar-root-snare/);
assert.match(stylesSource, /data-status='root-snare'/);
assert.match(packageSource, /"verify:root-snare"/);
assert.match(backendSource, /rootSnareMaxTargets\s+= 8/);
assert.match(backendSource, /target\.attackTimer = math\.Max\(0, target\.attackTimer\) \+ rootSnareEntryDelay/);
assert.match(simulationSource, /s\.castRootSnare\(entity, cmd\.Target\)/);
assert.match(simulationSource, /len\(s\.rootSnareZones\) > 0/);
assert.match(stateSource, /ControlZones\s+\[\]ControlZoneState/);
assert.match(statusSource, /statusRootSnare/);
assert.match(contractSource, /décima primeira habilidade/);
assert.match(roadmapSource, /Prioridade 6 — Controle de espaço/);

console.info('root snare eleventh-skill ground targeting, authoritative zone/control, lifecycle and 6-of-11 presentation verification passed');
