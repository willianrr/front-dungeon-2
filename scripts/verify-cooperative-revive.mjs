import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-cooperative-revive');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const sourcePath = path.join(root, 'src/shared/CooperativeRevive.ts');
const outputPath = path.join(outDir, 'CooperativeRevive.mjs');
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
  fileName: sourcePath,
});
await writeFile(outputPath, compiled.outputText, 'utf8');
const revive = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

assert.equal(revive.COOPERATIVE_REVIVE_DURATION, 3);
assert.equal(revive.COOPERATIVE_REVIVE_RANGE, 3.2);
assert.equal(revive.REVIVE_PROTECTION_DURATION, 1.5);
for (const color of Object.values(revive.COOPERATIVE_REVIVE_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const target = { id: 'player-2', kind: 'player', alive: false, position: { x: 1, y: 0, z: 0 } };
const reviver = {
  id: 'player-1', kind: 'player', alive: true, position: { x: 0, y: 0, z: 0 },
  revive: { targetId: target.id, remaining: 1.8, duration: 3, range: 3.2 },
};
const presentation = revive.reviveChannelPresentationGate(reviver, [reviver, target]);
assert.equal(presentation?.target, target);
assert.equal(presentation?.state, reviver.revive);
assert.equal(presentation?.progress, 0.4);
for (const malformed of [
  { ...reviver, alive: false }, { ...reviver, revive: { ...reviver.revive, targetId: reviver.id } },
  { ...reviver, revive: { ...reviver.revive, remaining: 0 } }, { ...reviver, revive: { ...reviver.revive, duration: 2.9 } },
  { ...reviver, revive: { ...reviver.revive, range: 3.1 } },
]) assert.equal(revive.reviveChannelPresentationGate(malformed, [malformed, target]), null);
assert.equal(revive.reviveChannelPresentationGate(reviver, [reviver, { ...target, alive: true }]), null);
assert.deepEqual(revive.reviveChannelPresentations([reviver, target]), [presentation]);

const protectedPlayer = {
  id: target.id, kind: 'player', alive: true,
  buffs: [{ id: 'revive-protection', label: 'Proteção da Aurora', remaining: 0.9, duration: 1.5 }],
};
assert.equal(revive.reviveProtectionBuffPresentationGate(protectedPlayer), protectedPlayer.buffs[0]);
for (const malformed of [
  { ...protectedPlayer, alive: false },
  { ...protectedPlayer, buffs: [{ ...protectedPlayer.buffs[0], duration: 1.4 }] },
  { ...protectedPlayer, buffs: [{ ...protectedPlayer.buffs[0], charges: 1 }] },
]) assert.equal(revive.reviveProtectionBuffPresentationGate(malformed), null);

const localMember = { id: 'player-1', online: true, alive: true, hp: 100 };
const fallenMember = { id: 'player-2', online: true, alive: false, hp: 0 };
assert.equal(revive.partyMemberCanRequestRevive(fallenMember, localMember), true);
assert.equal(revive.partyMemberCanRequestRevive({ ...fallenMember, alive: true }, localMember), false);
assert.equal(revive.partyMemberCanRequestRevive(fallenMember, { ...localMember, alive: false }), false);

const [typesSource, visualSource, gameSource, hudSource, stylesSource, packageSource,
  backendSource, testSource, stateSource, partySource, combatSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/playcanvas/CooperativeReviveVisual.ts'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/cooperative_revive.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/cooperative_revive_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/party.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'COOPERATIVE_REVIVE_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /export interface ReviveChannelState/);
assert.match(typesSource, /type: 'revive-player'/);
assert.match(visualSource, /createCooperativeReviveVisual/);
assert.match(gameSource, /requestCooperativeRevive\(targetPlayerId\)/);
assert.match(gameSource, /kind: 'revive'/);
assert.match(gameSource, /reconcileCooperativeRevives\(snapshot\.entities\)/);
assert.match(gameSource, /syncReviveProtectionVisual/);
assert.match(hudSource, /onPartyRevive/);
assert.match(hudSource, /Retornar ao Santuário/);
assert.match(stylesSource, /\.party-revive/);
assert.match(stylesSource, /data-buff="revive-protection"/);
assert.match(packageSource, /"verify:cooperative-revive"/);
assert.match(backendSource, /cooperativeReviveDuration\s+= 3\.0/);
assert.match(backendSource, /cooperativeReviveHealthFraction\s+= 0\.35/);
assert.match(backendSource, /projectileLineClear/);
assert.match(testSource, /TestCooperativeReviveChannelCompletionSnapshotAndProtection/);
assert.match(stateSource, /Revive\s+\*ReviveChannelState/);
assert.match(partySource, /member\.Alive = player\.alive/);
assert.match(combatSource, /Canal de reanimação interrompido pelo dano recebido/);
assert.match(contractSource, /Reanimação Cooperativa/);
assert.match(roadmapSource, /COOPERATIVE_REVIVE_CONTRACT/);

console.info('cooperative revive three-second channel, interruption, party UI, public VFX, field protection and sanctuary fallback verification passed');
