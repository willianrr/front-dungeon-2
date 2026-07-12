import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-expedition-cargo');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/ExpeditionCargo.ts');
const compiled = ts.transpileModule(await readFile(sourcePath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
const outputPath = path.join(outDir, 'ExpeditionCargo.mjs');
await writeFile(outputPath, compiled.outputText, 'utf8');
const cargoModule = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(cargoModule.EXPEDITION_CARGO_CAPACITY, 12);
assert.equal(cargoModule.EXPEDITION_CARGO_INTERACT_RANGE, 4.5);
assert.deepEqual(cargoModule.EXPEDITION_CARGO_KINDS, [
  'potion', 'mana_potion', 'copper_ore', 'iron_ore', 'mithril_ore', 'copper_bar', 'iron_bar', 'mithril_bar',
]);
for (const color of Object.values(cargoModule.EXPEDITION_CARGO_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const cargo = {
  version: 1, id: 'expedition-cargo-party-1', partyId: 'party-1', leaderId: 'player-1',
  position: { x: 2, y: 0.4, z: 3 }, capacity: 12, used: 5, interactRange: 4.5,
  items: [{ kind: 'copper_ore', count: 3 }, { kind: 'potion', count: 2 }],
};
const party = { id: 'party-1', leaderId: 'player-1', members: [], cargo };
assert.equal(cargoModule.expeditionCargoPresentationGate(party), cargo);
assert.equal(cargoModule.expeditionCargoCount(cargo, 'copper_ore'), 3);
assert.equal(cargoModule.expeditionCargoCount(cargo, 'mithril_bar'), 0);
for (const malformed of [
  { ...cargo, version: 2 }, { ...cargo, id: 'forged' }, { ...cargo, partyId: 'party-2' },
  { ...cargo, leaderId: 'player-2' }, { ...cargo, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...cargo, capacity: 13 }, { ...cargo, interactRange: 5 }, { ...cargo, used: 4 },
  { ...cargo, items: [{ kind: 'future', count: 5 }] },
  { ...cargo, items: [{ kind: 'potion', count: 2 }, { kind: 'potion', count: 3 }] },
  { ...cargo, items: [{ kind: 'potion', count: 0 }], used: 0 },
]) assert.equal(cargoModule.expeditionCargoPresentationGate({ ...party, cargo: malformed }), null);
assert.equal(cargoModule.expeditionCargoPresentationGate({ ...party, leaderId: 'player-2' }), null);
assert.equal(cargoModule.expeditionCargoPresentationGate(null), null);

const [typesSource, hudSource, gameSource, npcSource, stylesSource, packageSource, backendSource, testSource,
  purchaseTestSource, shopSource, progressSource, characterSource, sessionSource,
  partySource, stateSource, simulationSource, roomSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
	readFile(path.join(root, 'src/core/Npc.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/expedition_cargo.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/expedition_cargo_test.go'), 'utf8'),
	readFile(path.join(backendRoot, 'sim/expedition_mule_purchase_test.go'), 'utf8'),
	readFile(path.join(backendRoot, 'sim/shop.go'), 'utf8'),
	readFile(path.join(backendRoot, 'sim/progress.go'), 'utf8'),
	readFile(path.join(backendRoot, 'schemas/character.go'), 'utf8'),
	readFile(path.join(backendRoot, 'game/session.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/party.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'game/room.go'), 'utf8'),
  readFile(path.join(backendRoot, 'EXPEDITION_CARGO_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /interface ExpeditionCargoState/);
assert.match(typesSource, /type: 'expedition-cargo-deposit'/);
assert.match(typesSource, /type: 'expedition-cargo-withdraw'/);
assert.match(hudSource, /className = 'expedition-cargo-card'/);
assert.match(hudSource, /this\.partyPanel\.hidden = !party/);
assert.match(hudSource, /this\.onCargoDeposit\(kind\)/);
assert.match(hudSource, /if \(party\.members\.length > 1\) actions\.append\(chat, leave\)/);
assert.match(gameSource, /private createExpeditionCargoView/);
assert.match(gameSource, /reconcileExpeditionCargo\(snapshot\.party\)/);
assert.match(gameSource, /type: 'expedition-cargo-deposit'/);
assert.match(stylesSource, /\.expedition-cargo-card/);
assert.match(npcSource, /vendor-expedition-mule/);
assert.match(npcSource, /Mula de Expedição/);
assert.match(packageSource, /"verify:expedition-cargo"/);
assert.match(backendSource, /expeditionCargoCapacity\s+= 12/);
assert.match(backendSource, /inventoryCanReceiveStack/);
assert.match(backendSource, /PreparePlayerDisconnect/);
assert.match(testSource, /TestPreparePlayerDisconnectRecoversBeforeExportAndIsIdempotent/);
assert.match(purchaseTestSource, /TestExpeditionMuleIsCampPurchaseAndNotAutomaticPartyCargo/);
assert.match(purchaseTestSource, /TestExpeditionMuleOwnershipRoundTripCreatesSoloCargo/);
assert.match(purchaseTestSource, /TestSoloMuleOwnerCanAcceptPartyInviteWithoutLosingCargo/);
assert.match(shopSource, /expeditionMulePrice = 180/);
assert.match(shopSource, /service: "expedition_mule"/);
assert.match(progressSource, /ExpeditionMuleBought/);
assert.match(characterSource, /column:vendor_mule_bought/);
assert.match(sessionSource, /"vendor_mule_bought"/);
assert.match(partySource, /Cargo: s\.expeditionCargoState\(party\)/);
assert.match(stateSource, /json:"cargo,omitempty"/);
assert.match(simulationSource, /hashFloat\(h, float64\(party\.Cargo\.Used\)\)/);
assert.match(simulationSource, /len\(party\.cargo\.path\) > 0/);
const navigationSource = await readFile(path.join(backendRoot, 'sim/navigation.go'), 'utf8');
assert.match(navigationSource, /uma diagonal/);
assert.match(navigationSource, /if !lineClear\(/);
const prepareIndex = roomSource.indexOf('PreparePlayerDisconnect(s.playerID)');
const persistIndex = roomSource.indexOf('r.persistSessionSync(s)');
assert.ok(prepareIndex >= 0 && persistIndex > prepareIndex, 'cargo recovery must precede session persistence');
assert.match(contractSource, /antes de\s+`session\.persist\(\)`/);
assert.match(roadmapSource, /EXPEDITION_CARGO_CONTRACT/);

console.info('camp purchase, persistent mule ownership, solo/group cargo, 12-unit atomic transfers, bounded follow and safe owner-disconnect recovery verification passed');
