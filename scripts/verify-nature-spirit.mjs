import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-nature-spirit');
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
await compile('NatureSpirit');
const spirit = await import(`${pathToFileURL(path.join(outDir, 'NatureSpirit.mjs')).href}?t=${Date.now()}`);

assert.equal(spirit.NATURE_SPIRIT_ID, 'nature-spirit');
assert.equal(spirit.NATURE_SPIRIT_MANA_COST, 32);
assert.equal(spirit.NATURE_SPIRIT_COOLDOWN, 24);
assert.equal(spirit.NATURE_SPIRIT_DURATION, 18);
assert.equal(spirit.NATURE_SPIRIT_ATTACK_RANGE, 8);
assert.equal(spirit.NATURE_SPIRIT_ATTACK_INTERVAL, 1.6);
for (const color of Object.values(spirit.NATURE_SPIRIT_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'nature-spirit', label: 'Espírito de Aranna',
  description: 'Invoca por 18 s um espírito que acompanha o herói, segue seu foco de combate ou ataca o inimigo visível mais próximo.',
  manaCost: 32, cooldown: 24, cooldownRemaining: 12, range: 8,
  discipline: 'survival', targetMode: 'self', requiresPhysicalWeapon: false, stationary: true, masteryId: 'survival',
};
assert.deepEqual(spirit.natureSpiritSkillPresentationGate([skill]), skill);
for (const malformed of [
  { ...skill, label: 'Espírito' }, { ...skill, manaCost: 31 }, { ...skill, cooldown: 23 }, { ...skill, range: 9 },
  { ...skill, discipline: 'arcana' }, { ...skill, targetMode: 'ground' }, { ...skill, stationary: false },
  { ...skill, requiresPhysicalWeapon: true }, { ...skill, description: 'invoca' },
]) assert.equal(spirit.natureSpiritSkillPresentationGate([malformed]), null);

const owner = { id: 'player-1', kind: 'player', alive: true };
const enemy = { id: 'enemy-1', kind: 'enemy', alive: true };
const state = {
  version: 1, id: 'nature-spirit-player-1', ownerId: owner.id,
  position: { x: 1.45, y: 1.35, z: 0 }, remaining: 17.5, duration: 18, attackCooldown: 1.2, targetId: enemy.id,
};
assert.deepEqual(spirit.natureSpiritStatesPresentationGate([state], [owner, enemy]), [state]);
for (const malformed of [
  { ...state, version: 2 }, { ...state, id: 'forged' }, { ...state, ownerId: '' },
  { ...state, position: { x: Number.NaN, y: 0, z: 0 } }, { ...state, remaining: 0 },
  { ...state, remaining: 18.1 }, { ...state, duration: 17 }, { ...state, attackCooldown: 1.61 }, { ...state, targetId: '' },
]) assert.deepEqual(spirit.natureSpiritStatesPresentationGate([malformed], [owner, enemy]), []);
assert.deepEqual(spirit.natureSpiritStatesPresentationGate([state], [{ ...owner, kind: 'enemy' }, enemy]), []);

const summon = {
  id: 'combat-spirit-cast', type: 'skill-effect', skill: 'nature-spirit-summon', sourceSkill: 'nature-spirit',
  casterId: owner.id, origin: { x: 0, y: 0, z: 0 }, position: state.position, radius: 0.45, duration: 0.55,
};
assert.equal(spirit.natureSpiritEventPresentationGate(summon, [owner, enemy])?.phase, 'summon');
const bolt = {
  id: 'combat-spirit-bolt', type: 'skill-effect', skill: 'nature-spirit-bolt', sourceSkill: 'nature-spirit',
  casterId: owner.id, targetId: enemy.id, origin: state.position, position: { x: 7, y: 0, z: 0 }, radius: 0.18, duration: 0.32,
};
assert.equal(spirit.natureSpiritEventPresentationGate(bolt, [owner, enemy])?.phase, 'bolt');
for (const malformed of [
  { ...summon, sourceSkill: undefined }, { ...summon, targetId: enemy.id }, { ...summon, radius: 0.4 },
  { ...summon, position: { x: 1.47, y: 0, z: 0 } }, { ...bolt, targetId: '' },
  { ...bolt, origin: undefined }, { ...bolt, position: { x: 9.46, y: 0, z: 0 } }, { ...bolt, duration: 0.3 },
]) assert.equal(spirit.natureSpiritEventPresentationGate(malformed, [owner, enemy]), null);

const [typesSource, catalogSource, hotbarSource, feralSource, hudSource, stylesSource, gameSource,
  serverClientSource, packageSource, backendSource, simulationSource, stateSource, testSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/FeralForm.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/net/ServerClient.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/nature_spirit.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/nature_spirit_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'NATURE_SPIRIT_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'nature-spirit'/);
assert.match(typesSource, /interface NatureSpiritState/);
assert.match(catalogSource, /NATURE_SPIRIT_WIRE_DEFAULTS/);
assert.match(hotbarSource, /quinze habilidades/);
assert.match(feralSource, /'nature-spirit'/);
assert.match(hudSource, /id="hotbar-nature-spirit"/);
assert.match(hudSource, /updateNatureSpiritHotbar\(player, survival, snapshot\.natureSpirits\)/);
assert.match(hudSource, /spirit-active/);
assert.match(stylesSource, /#hotbar-nature-spirit/);
assert.match(gameSource, /reconcileNatureSpirits\(snapshot\.natureSpirits\)/);
assert.match(gameSource, /private createNatureSpiritView/);
assert.match(gameSource, /natureSpiritEventPresentationGate\(event, entities\)/);
assert.match(serverClientSource, /natureSpirits: \[\]/);
assert.match(packageSource, /"verify:nature-spirit"/);
assert.match(backendSource, /sort\.Strings\(ownerIDs\)/);
assert.match(backendSource, /projectileLineClear\(spirit\.position/);
assert.match(backendSource, /dealPureMagicSpellDamage\(owner, target/);
assert.match(simulationSource, /s\.updateNatureSpirits\(dt\)/);
assert.match(simulationSource, /hashNatureSpiritStates\(natureSpirits\)/);
assert.match(stateSource, /json:"natureSpirits"/);
assert.match(testSource, /TestNatureSpiritInvalidCastsAreAtomicAndLifecycleClearsActiveOnly/);
assert.match(contractSource, /inimigo vivo e visível mais próximo/);
assert.match(roadmapSource, /NATURE_SPIRIT_CONTRACT/);

console.info('nature spirit fifteenth-skill authoritative public summon, bounded follow, deterministic nearest/LOS attacks, lifecycle, strict VFX and 6-of-15 hotbar verification passed');
