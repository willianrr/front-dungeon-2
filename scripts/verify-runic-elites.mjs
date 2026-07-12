import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const backendRoot = path.resolve(root, '../back-dungeon');
const outDir = path.join(tmpdir(), 'aranna-verify-runic-elites');
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

const runic = await compileShared('RunicElites');
assert.equal(runic.RUNIC_ELITE_VERSION, 1);
assert.equal(runic.RUNIC_ELITE_EVENT_RADIUS, 3.4);
assert.equal(runic.RUNIC_FURY_VISUAL_ATTACK_SPEED, 1.389);
assert.deepEqual(runic.RUNIC_ELITE_MODIFIERS.map(({ id, label }) => ({ id, label })), [
  { id: 'runic_aegis', label: 'Runa da Égide' },
  { id: 'runic_fury', label: 'Runa da Fúria' },
]);
assert.match(runic.RUNIC_ELITE_MODIFIERS[0].description, /28%.*Sangramento atravessa/);
assert.match(runic.RUNIC_ELITE_MODIFIERS[1].description, /50%.*acelera movimento e ataques futuros/);

const colors = Object.values(runic.RUNIC_ELITE_PALETTE);
assert.equal(new Set(colors).size, colors.length, 'runic palette must keep distinct semantic colors');
for (const color of colors) assert.match(color, /^#[0-9a-f]{6}$/i);

const modifiersFor = (phase) => runic.RUNIC_ELITE_MODIFIERS.map((modifier) => ({
  ...modifier,
  active: modifier.id === (phase === 'aegis' ? 'runic_aegis' : 'runic_fury'),
}));
const elite = (phase = 'aegis', alive = true) => ({
  id: 'enemy-runic-1',
  kind: 'enemy',
  enemyVariant: 'zombie',
  eliteVersion: 1,
  elitePhase: phase,
  eliteModifiers: modifiersFor(phase),
  hp: phase === 'aegis' ? 80 : 45,
  maxHp: 100,
  alive,
  position: { x: 3, y: 0, z: -2 },
  rotationY: 0,
  level: 3,
  action: alive ? 'idle' : 'dead',
  ...(phase === 'fury' ? { attackSpeed: 1.389 } : {}),
});

const aegis = elite('aegis');
const fury = elite('fury');
const gatedAegis = runic.runicElitePresentationGate(aegis);
assert.equal(gatedAegis?.phase, 'aegis');
assert.equal(gatedAegis?.activeModifier.id, 'runic_aegis');
assert.equal(gatedAegis?.targetName, 'Elite Rúnico');
assert.match(gatedAegis?.targetSubtitle ?? '', /Sangramento atravessa/);
const gatedFury = runic.runicElitePresentationGate(fury);
assert.equal(gatedFury?.phase, 'fury');
assert.equal(gatedFury?.activeModifier.id, 'runic_fury');
assert.match(gatedFury?.targetSubtitle ?? '', /Movimento e ataques acelerados/);

for (const malformed of [
  null,
  {},
  { ...aegis, id: '' },
  { ...aegis, kind: 'player' },
  { ...aegis, enemyVariant: 'zombieBoss' },
  { ...aegis, enemyVariant: 'zombieRuinBrute' },
  { ...aegis, eliteVersion: undefined },
  { ...aegis, eliteVersion: 2 },
  { ...aegis, elitePhase: undefined },
  { ...aegis, elitePhase: 'future' },
  { ...aegis, attackSpeed: 1 },
  { ...fury, attackSpeed: undefined },
  { ...fury, attackSpeed: 1.388 },
  { ...aegis, bossPhase: 1 },
  { ...aegis, hp: Number.NaN },
  { ...aegis, maxHp: 0 },
  { ...aegis, alive: 'yes' },
  { ...aegis, eliteModifiers: [] },
  { ...aegis, eliteModifiers: [aegis.eliteModifiers[1], aegis.eliteModifiers[0]] },
  { ...aegis, eliteModifiers: aegis.eliteModifiers.slice(0, 1) },
  { ...aegis, eliteModifiers: [...aegis.eliteModifiers, aegis.eliteModifiers[0]] },
  { ...aegis, eliteModifiers: [{ ...aegis.eliteModifiers[0], label: 'Égide' }, aegis.eliteModifiers[1]] },
  { ...aegis, eliteModifiers: [{ ...aegis.eliteModifiers[0], description: 'guess' }, aegis.eliteModifiers[1]] },
  { ...aegis, eliteModifiers: [{ ...aegis.eliteModifiers[0], active: false }, aegis.eliteModifiers[1]] },
  { ...fury, eliteModifiers: [{ ...fury.eliteModifiers[0], active: true }, fury.eliteModifiers[1]] },
]) {
  assert.equal(runic.runicElitePresentationGate(malformed), null);
}

const frozenPosition = { x: 12.5, y: 0.1, z: -7.25 };
const furyEvent = {
  id: 'combat-runic-fury-1',
  type: 'runic-elite-fury',
  casterId: fury.id,
  skill: 'runic-fury',
  modifierId: 'runic_fury',
  position: frozenPosition,
  radius: 3.4,
};
const defeatEvent = {
  id: 'combat-runic-defeat-1',
  type: 'runic-elite-defeated',
  casterId: fury.id,
  targetId: 'player-1',
  skill: 'runic-elite',
  position: frozenPosition,
  radius: 3.4,
};
const gatedFuryEvent = runic.runicEliteEventPresentationGate(furyEvent, [fury]);
assert.equal(gatedFuryEvent?.type, 'fury');
assert.equal(gatedFuryEvent?.position, frozenPosition, 'event must retain authoritative position object');
assert.equal(gatedFuryEvent?.historical, false);
const deadFury = elite('fury', false);
assert.equal(runic.runicEliteEventPresentationGate(furyEvent, [deadFury])?.historical, true);
assert.equal(runic.runicEliteEventPresentationGate(furyEvent, [])?.historical, true);
assert.equal(runic.runicEliteEventPresentationGate(defeatEvent, [deadFury])?.type, 'defeated');
assert.equal(runic.runicEliteEventPresentationGate(defeatEvent, [])?.historical, true);
assert.equal(runic.runicEliteEventPresentationGate(defeatEvent, [fury]), null, 'living identity cannot validate defeat');
assert.equal(runic.runicEliteEventPresentationGate(furyEvent, [aegis]), null, 'aegis identity cannot validate fury');
assert.equal(runic.runicEliteEventPresentationGate(furyEvent, [fury, { ...fury }]), null, 'duplicate identities close the gate');

for (const malformed of [
  null,
  {},
  { ...furyEvent, id: '' },
  { ...furyEvent, casterId: '' },
  { ...furyEvent, skill: 'runic-elite' },
  { ...furyEvent, modifierId: 'runic_aegis' },
  { ...furyEvent, position: undefined },
  { ...furyEvent, position: { x: Number.NaN, y: 0, z: 0 } },
  { ...furyEvent, radius: 3.39 },
  { ...furyEvent, radius: 3.41 },
  { ...furyEvent, targetId: 'player-1' },
  { ...furyEvent, amount: 0 },
  { ...furyEvent, damageKind: 'physical' },
  { ...furyEvent, duration: 1 },
  { ...furyEvent, rotationY: 0 },
  { ...defeatEvent, id: '' },
  { ...defeatEvent, skill: 'runic-fury' },
  { ...defeatEvent, modifierId: 'runic_fury' },
  { ...defeatEvent, targetId: '' },
  { ...defeatEvent, delay: 0 },
  { ...defeatEvent, encounterId: 'seal-chamber' },
]) {
  assert.equal(runic.runicEliteEventPresentationGate(malformed, malformed?.type === 'runic-elite-defeated' ? [deadFury] : [fury]), null);
}

const [gameSource, hudSource, stylesSource, typesSource, packageSource, readmeSource, backendSource, combatSource, aiSource, stateSource, contractSource] = await Promise.all([
  readFile(path.join(root, 'src/core/Game.ts'), 'utf8'),
  readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/shared/types.ts'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'README.md'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/runic_elites.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/combat.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/ai.go'), 'utf8'),
  readFile(path.join(backendRoot, 'sim/state.go'), 'utf8'),
  readFile(path.join(backendRoot, 'RUNIC_ELITES_CONTRACT.md'), 'utf8'),
]);

assert.match(typesSource, /eliteVersion\?: 1/);
assert.match(typesSource, /eliteModifiers\?: EnemyModifierState\[\]/);
assert.match(typesSource, /elitePhase\?: RunicElitePhase/);
assert.match(typesSource, /type: 'runic-elite-fury'/);
assert.match(typesSource, /type: 'runic-elite-defeated'/);
assert.match(gameSource, /runicEliteEventPresentationGate\(event, entities\)/, 'all event visuals must cross the strict gate');
assert.match(gameSource, /syncRunicEliteVisual\(view, e\)/, 'persistent aura must reconcile from wire');
assert.match(gameSource, /clearRunicEliteVisual\(view\)/, 'persistent aura needs explicit cleanup');
assert.match(gameSource, /runic-elite-\$\{runic\.phase\}-ring/, 'aegis/fury must have distinct persistent rings');
assert.match(gameSource, /runic-elite-\$\{phase\}-event-ring/, 'transition and defeat must use frozen event geometry');
assert.match(hudSource, /runicElitePresentationGate\(target\)/, 'target frame must share entity gate');
assert.match(hudSource, /modifier\.id === 'runic_aegis' \? 'Égide' : 'Fúria'/, 'both modifiers must remain visible');
assert.match(hudSource, /RUNIC_ELITE_PALETTE\.minimapFuryRing/, 'minimap must communicate fury phase');
assert.match(stylesSource, /data-runic-phase='aegis'/);
assert.match(stylesSource, /data-runic-phase='fury'/);

const visualMethod = gameSource.slice(
  gameSource.indexOf('private showRunicElitePulse'),
  gameSource.indexOf('private updateDamageTexts'),
);
assert.doesNotMatch(visualMethod, /this\.net\.send|latestEntities|this\.views|entities\.(?:find|filter)|damage|collision|hp|maxHp/i,
  'event VFX cannot query or simulate gameplay');
const commandSection = typesSource.slice(typesSource.indexOf('export type Command ='));
assert.doesNotMatch(commandSection, /runic|eliteVersion|elitePhase/, 'elite mechanics add no client command');

assert.match(backendSource, /runicAegisDirectDamageMultiplier\s*= 0\.72/);
assert.match(backendSource, /runicFuryMoveMultiplier\s*= 1\.28/);
assert.match(backendSource, /runicFuryAttackCooldownMultiplier\s*= 0\.72/);
assert.match(backendSource, /runicFuryAttackWindupMultiplier\s*= 0\.82/);
assert.match(backendSource, /runicEliteXPRewardMultiplier\s*= 1\.75/);
assert.doesNotMatch(
  backendSource.slice(backendSource.indexOf('func (s *Simulation) maybeEnterRunicFury'), backendSource.indexOf('func runicEliteModifierStates')),
  /attackTimer\s*=|attackImpactTimer\s*=|attackImpactTargetId\s*=|attackDamage\s*=/,
  'fury must not rewrite committed action or damage',
);
assert.match(combatSource, /applyEnemyDirectDamageModifiers/);
assert.match(combatSource, /runicEliteXPReward/);
assert.match(combatSource, /runicEliteBonusDrops/);
assert.match(aiSource, /livingRunicElites < runicElitePopulationCap/);
assert.match(stateSource, /json:"eliteModifiers,omitempty"/);
assert.match(contractSource, /Sangramento\/DoT não chama a cadeia/);
assert.match(contractSource, /14\.\.20/);
assert.match(packageSource, /"verify:runic-elites"/);
assert.match(readmeSource, /Elites Rúnicos/);

console.info('runic elite entity/event gates, two-phase presentation, rewards and authoritative integration verification passed');
