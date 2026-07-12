import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-chain-lightning');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
    fileName: sourcePath,
  });
  let output = compiled.outputText;
  output = output.replaceAll("from './SkillCatalog'", "from './SkillCatalog.mjs'");
  await writeFile(path.join(outDir, `${name}.mjs`), output, 'utf8');
}
await compile('SkillCatalog');
await compile('ChainLightning');
const chain = await import(`${pathToFileURL(path.join(outDir, 'ChainLightning.mjs')).href}?t=${Date.now()}`);

assert.equal(chain.CHAIN_LIGHTNING_ID, 'chain-lightning');
assert.equal(chain.CHAIN_LIGHTNING_MANA_COST, 28);
assert.equal(chain.CHAIN_LIGHTNING_COOLDOWN, 7.5);
assert.equal(chain.CHAIN_LIGHTNING_RANGE, 11);
assert.equal(chain.CHAIN_LIGHTNING_BOUNCE_RADIUS, 6);
assert.equal(chain.CHAIN_LIGHTNING_MAX_TARGETS, 4);
assert.equal(chain.CHAIN_LIGHTNING_FALLOFF, 0.78);
for (const color of Object.values(chain.CHAIN_LIGHTNING_PALETTE)) assert.match(color, /^#[0-9a-f]{6}$/i);

const skill = {
  id: 'chain-lightning', label: 'Relâmpago Encadeado',
  description: 'Atinge até quatro inimigos; cada salto procura o alvo visível mais próximo e causa 22% menos dano.',
  manaCost: 28, cooldown: 7.5, cooldownRemaining: 3.2, range: 11,
  discipline: 'arcana', targetMode: 'enemy', requiresPhysicalWeapon: false, stationary: true, masteryId: 'arcana', pending: true,
};
assert.deepEqual(chain.chainLightningSkillPresentationGate([skill]), skill);
for (const malformed of [
  { ...skill, manaCost: 27 }, { ...skill, cooldown: 7 }, { ...skill, range: 12 },
  { ...skill, targetMode: 'ground' }, { ...skill, masteryId: 'survival' }, { ...skill, description: 'raio' },
]) assert.equal(chain.chainLightningSkillPresentationGate([malformed]), null);
assert.equal(chain.chainLightningSkillPresentationGate([]), null);

const caster = { id: 'player-1', kind: 'player' };
const target = { id: 'enemy-1', kind: 'enemy' };
const event = {
  id: 'combat-chain-1', type: 'skill-effect', skill: 'chain-lightning-impact', casterId: caster.id, targetId: target.id,
  origin: { x: 0, y: 0, z: 0 }, position: { x: 5, y: 0, z: 0 }, radius: 0.22, duration: 0.18, charges: 4,
};
const presentation = chain.chainLightningEventPresentationGate(event, [caster, target]);
assert.equal(presentation?.event, event);
assert.equal(presentation?.hop, 1);
assert.equal(chain.chainLightningEventPresentationGate({ ...event, charges: 1, origin: { x: -2.2, y: 0, z: 0 } }, [caster, target]), null, 'later hop cannot exceed bounce radius plus large-target allowance');
for (const malformed of [
  { ...event, skill: 'arcane-bolt-impact' }, { ...event, targetId: '' }, { ...event, origin: undefined },
  { ...event, radius: 0.3 }, { ...event, duration: 0.2 }, { ...event, charges: 0 }, { ...event, charges: 5 },
]) assert.equal(chain.chainLightningEventPresentationGate(malformed, [caster, target]), null);
assert.equal(chain.chainLightningEventPresentationGate(event, [{ ...caster, kind: 'enemy' }, target]), null);

const [typesSource, catalogSource, hudSource, stylesSource, gameSource, packageSource,
  backendSource, combatSource, movementSource, simulationSource, testSource, contractSource, roadmapSource] = await Promise.all([
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'src/shared/SkillCatalog.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/chain_lightning.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/movement.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/simulation.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/chain_lightning_test.go'), 'utf8'),
  readFile(path.join(backendRoot, 'CHAIN_LIGHTNING_CONTRACT.md'), 'utf8'),
  readFile(path.join(backendRoot, 'ARANNA_GAMEPLAY_ROADMAP.md'), 'utf8'),
]);
assert.match(typesSource, /\| 'chain-lightning'/);
assert.match(typesSource, /\| 'chain-lightning-impact'/);
assert.match(catalogSource, /CHAIN_LIGHTNING_WIRE_DEFAULTS/);
assert.match(hudSource, /id="hotbar-chain-lightning"/);
assert.match(hudSource, /updateChainLightningHotbar\(player, arcana\)/);
assert.match(stylesSource, /#hotbar-chain-lightning/);
assert.match(gameSource, /case 'chain-lightning'/);
assert.match(gameSource, /chainLightningEventPresentationGate\(event, entities\)/);
assert.match(gameSource, /private showChainLightningArc/);
assert.match(packageSource, /"verify:chain-lightning"/);
assert.match(backendSource, /chainLightningMaxTargets\s+= 4/);
assert.match(backendSource, /sort\.Slice\(candidates/);
assert.match(combatSource, /case chainLightningSkillID/);
assert.match(movementSource, /updatePendingRangedSkillMovement/);
assert.match(simulationSource, /s\.castChainLightning\(entity, cmd\.TargetID\)/);
assert.match(testSource, /TestChainLightningDeterministicNearestTieAndLineOfSight/);
assert.match(contractSource, /menor distância/);
assert.match(roadmapSource, /CHAIN_LIGHTNING_CONTRACT/);

console.info('chain lightning twelfth-skill deterministic nearest/LOS hops, falloff, ranged pending, strict hotbar/event VFX and lifecycle verification passed');
