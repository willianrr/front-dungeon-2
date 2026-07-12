import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-feral-form');
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

const form = await compile('FeralForm');
const catalog = await compile('SkillCatalog');
assert.equal(form.FERAL_FORM_ID, 'feral-form');
assert.equal(form.FERAL_FORM_LABEL, 'Forma Feral');
assert.equal(form.FERAL_FORM_MANA_COST, 20);
assert.equal(form.FERAL_FORM_COOLDOWN, 20);
assert.equal(form.FERAL_FORM_DURATION, 7);
assert.equal(form.FERAL_FORM_CAST_RADIUS, 1.35);
assert.equal(form.FERAL_FORM_BLOCKED_SKILLS.length, 12);
for (const color of Object.values(form.FERAL_FORM_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'feral-form', label: 'Forma Feral',
  description: 'Assume uma forma bestial: +25% de movimento e cadência, +0,45 m de alcance e +15% de dano nos ataques básicos por 7 s.',
  discipline: 'survival', targetMode: 'self', stationary: true, requiresPhysicalWeapon: false,
  masteryId: 'survival', manaCost: 20, cooldown: 20, cooldownRemaining: 13,
};
assert.equal(form.feralFormSkillPresentationGate([skill]), skill);
for (const malformed of [
  [], [skill, skill], [{ ...skill, label: 'Forma' }], [{ ...skill, discipline: 'martial' }],
  [{ ...skill, targetMode: 'enemy' }], [{ ...skill, stationary: false }], [{ ...skill, manaCost: 19 }],
  [{ ...skill, cooldownRemaining: 20.1 }], [{ ...skill, blocked: true, blockedReason: form.FERAL_FORM_BLOCKED_REASON }],
]) assert.equal(form.feralFormSkillPresentationGate(malformed), null);

const player = {
  id: 'player-1', kind: 'player', alive: true,
  buffs: [{ id: 'feral-form', label: 'Forma Feral', remaining: 5.4, duration: 7 }],
};
assert.equal(form.feralFormBuffPresentationGate(player)?.buff, player.buffs[0]);
for (const malformed of [
  { ...player, kind: 'enemy' }, { ...player, alive: false }, { ...player, buffs: [] },
  { ...player, buffs: [{ ...player.buffs[0], remaining: 0 }] },
  { ...player, buffs: [{ ...player.buffs[0], duration: 6.9 }] },
  { ...player, buffs: [{ ...player.buffs[0], charges: 1 }] },
]) assert.equal(form.feralFormBuffPresentationGate(malformed), null);

const locks = [
  ...form.FERAL_FORM_BLOCKED_SKILLS.map((id) => ({ id, blocked: true, blockedReason: form.FERAL_FORM_BLOCKED_REASON })),
  { id: 'iron-guard' }, { id: 'bulwark-call' }, skill,
];
assert.equal(form.feralFormSkillLocksPresentationGate(locks), locks);
assert.equal(form.feralFormSkillLocksPresentationGate(locks.map((entry) => entry.id === 'heavy-strike' ? { ...entry, blocked: false } : entry)), null);
assert.equal(form.feralFormSkillLocksPresentationGate(locks.map((entry) => entry.id === 'iron-guard' ? { ...entry, blocked: true, blockedReason: form.FERAL_FORM_BLOCKED_REASON } : entry)), null);

const enemy = { id: 'enemy-1', kind: 'enemy', alive: true };
const cast = {
  id: 'combat-form-cast', type: 'skill-effect', casterId: player.id, skill: 'feral-form',
  position: { x: 0, y: 0, z: 0 }, radius: 1.35, duration: 7,
};
const claw = {
  id: 'combat-form-claw', type: 'damage', casterId: player.id, targetId: enemy.id,
  sourceSkill: 'feral-form', damageKind: 'physical', amount: 23,
  position: { x: 2, y: 0, z: 0 },
};
assert.equal(form.feralFormEventPresentationGate(cast, [player, enemy])?.phase, 'cast');
assert.equal(form.feralFormEventPresentationGate(claw, [player, enemy])?.phase, 'claw');
for (const malformed of [
  { ...cast, radius: 1.34 }, { ...cast, duration: 6.9 }, { ...cast, targetId: enemy.id },
  { ...claw, sourceSkill: 'heavy-strike' }, { ...claw, damageKind: 'magic' }, { ...claw, amount: 0 },
]) assert.equal(form.feralFormEventPresentationGate(malformed, [player, enemy]), null);

const announced = catalog.catalogSkill([skill], 'feral-form');
assert.ok(announced);
assert.equal(announced.masteryId, 'survival');
assert.equal(catalog.catalogSkill(undefined, 'feral-form'), null);
const blocked = catalog.normalizeSkillState('heavy-strike', {
  id: 'heavy-strike', blocked: true, blockedReason: form.FERAL_FORM_BLOCKED_REASON,
});
const blockedPlan = catalog.skillCastPlan(blocked, { selectedTargetId: 'enemy-1', selectedTargetIsAliveEnemy: true });
assert.equal(blockedPlan.allowed, false);
assert.equal(blockedPlan.failure, 'temporarily-blocked');
assert.equal(blockedPlan.failureReason, form.FERAL_FORM_BLOCKED_REASON);

const [typesSource, catalogSource, hotbarSource, hudSource, gameSource, stylesSource, packageSource,
  backendSource, combatSource, simulationSource, stateSource, zonesSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/HotbarLoadout.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/feral_form.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/zones.go'), 'utf8'),
  readFile(path.join(backendRoot, 'FERAL_FORM_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'feral-form'/);
assert.match(typesSource, /blockedReason\?: string/);
assert.match(catalogSource, /FERAL_FORM_WIRE_DEFAULTS/);
assert.match(catalogSource, /failure: 'temporarily-blocked'/);
assert.match(hotbarSource, /quinze habilidades/);
assert.match(hudSource, /id="hotbar-feral-form"/);
assert.match(hudSource, /skill-temporarily-blocked/);
assert.match(hudSource, /updateFeralFormHotbar\(player\)/);
assert.match(gameSource, /feralFormEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private syncFeralFormVisual/);
assert.match(gameSource, /private showFeralClaw/);
assert.match(stylesSource, /#hotbar-feral-form/);
assert.match(stylesSource, /\.hotbar-skill-slot\.skill-temporarily-blocked/);
assert.match(packageSource, /"verify:feral-form"/);
assert.match(backendSource, /feralFormPhysicalMultiplier\s+= 1\.15/);
assert.match(backendSource, /feralFormBlocksSkill/);
assert.match(combatSource, /options\.sourceSkill = "feral-form"/);
assert.match(simulationSource, /s\.castFeralForm\(entity\)/);
assert.match(stateSource, /BlockedReason string `json:"blockedReason,omitempty"`/);
assert.match(zonesSource, /s\.clearFeralFormActive/);
assert.match(contractSource, /Décima habilidade do catálogo/);
assert.match(roadmapSource, /Prioridade 3 — Forma temporária/);

console.info('feral form tenth-skill gate, authoritative profile/locks, lifecycle, public silhouette and 6-of-15 hotbar verification passed');
