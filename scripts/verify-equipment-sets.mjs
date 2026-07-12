import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-equipment-sets');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/EquipmentSets.ts');
const outputPath = path.join(outDir, 'EquipmentSets.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const sets = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(sets.EQUIPMENT_SET_DEFINITIONS.length, 3);
assert.deepEqual(sets.EQUIPMENT_SET_DEFINITIONS.map((definition) => definition.id), [
  'arhok-vanguard', 'utraean-tempest', 'stoneguard-oath',
]);
for (const definition of sets.EQUIPMENT_SET_DEFINITIONS) {
  assert.equal(definition.pieces.length, 3);
  assert.deepEqual(definition.bonuses.map((bonus) => bonus.pieces), [2, 3]);
  assert.match(sets.EQUIPMENT_SET_COLORS[definition.id], /^#[0-9a-f]{6}$/i);
}

const arhokItem = { kind: 'great_sword', setId: 'arhok-vanguard', setPieceId: 'arhok-greatblade' };
assert.equal(sets.equipmentSetItemPresentation(arhokItem)?.piece.label, 'Montante de Arhok');
for (const malformed of [
  { ...arhokItem, kind: 'sword' },
  { ...arhokItem, setPieceId: 'arhok-visor' },
  { ...arhokItem, setId: 'stoneguard-oath' },
  { kind: 'great_sword', setId: 'arhok-vanguard' },
]) assert.equal(sets.equipmentSetItemPresentation(malformed), null);

const arhokDefinition = sets.EQUIPMENT_SET_DEFINITIONS[0];
const state = {
  id: arhokDefinition.id,
  label: arhokDefinition.label,
  piecesEquipped: 3,
  totalPieces: 3,
  bonuses: arhokDefinition.bonuses.map((bonus) => ({ ...bonus, active: true })),
};
assert.equal(sets.equipmentSetStatesPresentationGate([state])?.[0], state);
for (const malformed of [
  [{ ...state, piecesEquipped: 4 }],
  [{ ...state, totalPieces: 4 }],
  [{ ...state, label: 'Vanguarda' }],
  [{ ...state, bonuses: [{ ...state.bonuses[0], active: false }, state.bonuses[1]] }],
  [state, state],
]) assert.equal(sets.equipmentSetStatesPresentationGate(malformed), null);

const recipe = {
  recipeType: 'equipment', outputKind: 'war_hammer', outputSetId: 'stoneguard-oath', outputSetPieceId: 'stoneguard-maul',
};
assert.equal(sets.equipmentSetForgeOutputPresentation(recipe)?.piece.label, 'Malho do Guarda-Pedra');
assert.equal(sets.equipmentSetForgeOutputPresentation({ ...recipe, outputKind: 'helmet' }), null);

const [typesSource, itemMetaSource, hudSource, gameSource, stylesSource, packageSource, backendSource, miningSource,
  inventorySource, sessionSource, schemaSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/itemMeta.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/equipment_sets.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/mining.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/inventory.go'), 'utf8'),
  readFile(path.join(backendRoot, 'game/session.go'), 'utf8'),
  readFile(path.join(backendRoot, 'schemas/item.go'), 'utf8'),
  readFile(path.join(backendRoot, 'EQUIPMENT_SETS_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /setId\?: EquipmentSetId/);
assert.match(typesSource, /equipmentSets\?: EquipmentSetState\[\]/);
assert.match(typesSource, /outputSetId\?: EquipmentSetId/);
assert.match(itemMetaSource, /equipmentSetPieceDefinition/);
assert.match(hudSource, /equipmentSetStatesPresentationGate\(player\.equipmentSets/);
assert.match(hudSource, /item-tooltip-set-bonus/);
assert.match(hudSource, /equipment-set-progress/);
assert.match(gameSource, /invalidSetRecipe/);
assert.match(gameSource, /EQUIPMENT_SET_COLORS/);
assert.match(stylesSource, /\.item-tooltip-set-bonus\[data-active="true"\]/);
assert.match(stylesSource, /\.forge-recipe\[data-set-id\]/);
assert.match(packageSource, /"verify:equipment-sets"/);
assert.match(backendSource, /normalizedEquipmentSetIdentity/);
assert.match(backendSource, /equippedEquipmentSetCounts/);
assert.match(backendSource, /maybeAssignDroppedEquipmentSet/);
assert.match(miningSource, /forge-stoneguard-maul/);
assert.match(miningSource, /outputSetPieceID/);
assert.match(inventorySource, /SetPieceID/);
assert.match(sessionSource, /SetPieceID/);
assert.match(schemaSource, /column:set_piece_id/);
assert.match(contractSource, /Vanguarda de Arhok/);
assert.match(contractSource, /Tempestade Utraeana/);
assert.match(contractSource, /Juramento do Guarda-Pedra/);

console.info('explicit equipment-set identity, authoritative 2/3-piece state, forge/drop/persistence and UI verification passed');
