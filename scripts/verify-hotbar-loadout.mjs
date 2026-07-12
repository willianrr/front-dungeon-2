import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-hotbar-loadout');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

async function compile(name) {
  const sourcePath = path.join(root, 'src/shared', `${name}.ts`);
  const source = await readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: sourcePath,
  });
  const output = compiled.outputText.replaceAll("from './SkillCatalog'", "from './SkillCatalog.mjs'");
  await writeFile(path.join(outDir, `${name}.mjs`), output, 'utf8');
}

await compile('SkillCatalog');
await compile('HotbarLoadout');
const hotbar = await import(`${pathToFileURL(path.join(outDir, 'HotbarLoadout.mjs')).href}?t=${Date.now()}`);

const legacySkills = ['arcane-nova', 'war-cry', 'charge', 'heavy-strike', 'steel-sweep', 'iron-guard'];
const sevenSkills = [...legacySkills, 'arcane-bolt'];
const eightSkills = [...sevenSkills, 'bulwark-call'];
const nineSkills = [...eightSkills, 'storm-orb'];
const tenSkills = [...nineSkills, 'feral-form'];
const elevenSkills = [...tenSkills, 'root-snare'];
const twelveSkills = [...elevenSkills, 'chain-lightning'];
const thirteenSkills = [...twelveSkills, 'renewal-wave'];
const fourteenSkills = [...thirteenSkills, 'phase-step'];
const allSkills = [...fourteenSkills, 'nature-spirit'];
const defaultSlots = [
  'potion', 'arcane-nova', 'mana-potion', 'war-cry',
  'heavy-strike', 'charge', 'steel-sweep', 'iron-guard',
];
assert.deepEqual(hotbar.DEFAULT_HOTBAR_LOADOUT, defaultSlots);
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('arcane-bolt'), false, 'Dardo must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('bulwark-call'), false, 'Clamor must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('storm-orb'), false, 'Storm Orb must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('feral-form'), false, 'Feral Form must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('root-snare'), false, 'Root Snare must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('chain-lightning'), false, 'Chain Lightning must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('renewal-wave'), false, 'Renewal Wave must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('phase-step'), false, 'Phase Step must start outside the default hotbar');
assert.equal(hotbar.DEFAULT_HOTBAR_LOADOUT.includes('nature-spirit'), false, 'Nature Spirit must start outside the default hotbar');
assert.equal(hotbar.isValidHotbarLoadout(defaultSlots, allSkills), true);

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const customV1 = [
  'iron-guard', 'mana-potion', 'steel-sweep', 'charge',
  'potion', 'heavy-strike', 'war-cry', 'arcane-nova',
];
const migrationStorage = new MemoryStorage();
migrationStorage.setItem(hotbar.LEGACY_HOTBAR_LAYOUT_STORAGE_KEY, JSON.stringify(customV1));
const migrated = hotbar.loadHotbarLoadout(migrationStorage);
assert.equal(migrated.source, 'v1');
assert.equal(migrated.repaired, false);
assert.deepEqual(migrated.slots, customV1, 'valid v1 migration must preserve all eight indices exactly');
assert.deepEqual(
  JSON.parse(migrationStorage.getItem(hotbar.HOTBAR_LOADOUT_STORAGE_KEY)),
  { version: 2, slots: customV1 },
  'v1 migration must persist the versioned v2 envelope',
);

const historicalSix = ['mana-potion', 'charge', 'potion', 'arcane-nova', 'heavy-strike', 'war-cry'];
const historicalStorage = new MemoryStorage();
historicalStorage.setItem(hotbar.LEGACY_HOTBAR_LAYOUT_STORAGE_KEY, JSON.stringify(historicalSix));
const historicalMigration = hotbar.loadHotbarLoadout(historicalStorage);
assert.equal(historicalMigration.source, 'v1');
assert.equal(historicalMigration.repaired, false, 'published six-slot v1 is a valid migration source');
assert.deepEqual(historicalMigration.slots.slice(0, historicalSix.length), historicalSix, 'six historical indices and custom order must remain exact');
assert.deepEqual(historicalMigration.slots.slice(6), ['steel-sweep', 'iron-guard']);
assert.equal(hotbar.isValidHotbarLoadout(historicalMigration.slots, allSkills), true);
assert.deepEqual(
  JSON.parse(historicalStorage.getItem(hotbar.HOTBAR_LOADOUT_STORAGE_KEY)),
  { version: 2, slots: historicalMigration.slots },
);

const boltV2 = [
  'potion', 'arcane-bolt', 'mana-potion', 'war-cry',
  'heavy-strike', 'charge', 'steel-sweep', 'iron-guard',
];
const v2Storage = new MemoryStorage();
v2Storage.setItem(hotbar.HOTBAR_LOADOUT_STORAGE_KEY, JSON.stringify({ version: 2, slots: boltV2 }));
assert.deepEqual(
  hotbar.loadHotbarLoadout(v2Storage).slots,
  boltV2,
  'bootstrap before authoritative skills must preserve a saved Arcane Bolt',
);
const oldServerReconciled = hotbar.reconcileHotbarLoadout(boltV2, legacySkills);
assert.equal(oldServerReconciled.includes('arcane-bolt'), false, 'complete old-server catalog must remove unavailable Arcane Bolt');
assert.equal(hotbar.isValidHotbarLoadout(oldServerReconciled, legacySkills), true);
assert.deepEqual(oldServerReconciled, defaultSlots, 'downgrade must repair the unavailable skill in-place without shifting keybinds');

const corrupted = [
  'potion', 'potion', 'arcane-bolt', 'unknown',
  'mana-potion', 'war-cry', 'war-cry', 'heavy-strike',
];
const repaired = hotbar.repairHotbarLoadout(corrupted, allSkills);
assert.equal(hotbar.isValidHotbarLoadout(repaired, allSkills), true, 'corrupt/duplicate layouts must repair to all invariants');
assert.equal(repaired.filter((action) => action === 'potion').length, 1);
assert.equal(repaired.filter((action) => action === 'mana-potion').length, 1);
assert.equal(repaired.filter(hotbar.isHotbarSkillAction).length, 6);
assert.equal(new Set(repaired).size, 8);

for (const malformed of [undefined, null, {}, 'skills', [], [{ id: 'arcane-bolt' }]]) {
  assert.equal(
    hotbar.announcedSkillIdsFromWire(malformed),
    null,
    'absent/partial/malformed wire must not gain authority over persisted layout',
  );
}
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(boltV2, ['arcane-bolt']),
  boltV2,
  'partial catalogs must preserve the current layout until a complete authoritative catalog arrives',
);
assert.equal(
  hotbar.repairHotbarLoadout([], ['arcane-bolt']).some((action) => legacySkills.includes(action)),
  false,
  'even direct malformed repair must never invent an unannounced legacy skill',
);
const legacyWire = legacySkills.map((id) => ({ id }));
const fullWire = [...legacyWire, { id: 'arcane-bolt' }, { id: 'arcane-bolt' }, { id: 'bulwark-call' }, { id: 'storm-orb' }, { id: 'feral-form' }, { id: 'root-snare' }, { id: 'chain-lightning' }, { id: 'renewal-wave' }, { id: 'phase-step' }, { id: 'nature-spirit' }, { id: 'future' }];
assert.deepEqual(hotbar.announcedSkillIdsFromWire(legacyWire), legacySkills);
assert.deepEqual(hotbar.announcedSkillIdsFromWire(fullWire), allSkills, 'wire ids must remain unique and preserve server order');

const replaced = hotbar.replaceHotbarSkill(defaultSlots, 'arcane-bolt', 'heavy-strike', allSkills);
assert.ok(replaced);
assert.equal(replaced.indexOf('arcane-bolt'), defaultSlots.indexOf('heavy-strike'), 'Equipar must replace the chosen skill in the same numbered slot');
assert.equal(replaced.includes('heavy-strike'), false);
assert.equal(replaced.indexOf('potion'), defaultSlots.indexOf('potion'));
assert.equal(replaced.indexOf('mana-potion'), defaultSlots.indexOf('mana-potion'));
assert.equal(hotbar.replaceHotbarSkill(replaced, 'arcane-bolt', 'charge', allSkills), null, 'equipped skills cannot be duplicated');
assert.equal(hotbar.replaceHotbarSkill(defaultSlots, 'arcane-bolt', 'potion', allSkills), null, 'mandatory consumables cannot be replaced');
assert.equal(hotbar.replaceHotbarSkill(defaultSlots, 'arcane-bolt', 'heavy-strike', legacySkills), null, 'unannounced skills cannot be equipped');

const orbReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'storm-orb', 'war-cry', allSkills);
assert.ok(orbReplaced);
assert.equal(orbReplaced.indexOf('storm-orb'), defaultSlots.indexOf('war-cry'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(orbReplaced, eightSkills),
  defaultSlots,
  'a complete pre-orb server must repair only the unavailable ninth skill',
);

const formReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'feral-form', 'heavy-strike', allSkills);
assert.ok(formReplaced);
assert.equal(formReplaced.indexOf('feral-form'), defaultSlots.indexOf('heavy-strike'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(formReplaced, nineSkills),
  defaultSlots,
  'a complete pre-form server must repair only the unavailable tenth skill',
);

const rootReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'root-snare', 'iron-guard', allSkills);
assert.ok(rootReplaced);
assert.equal(rootReplaced.indexOf('root-snare'), defaultSlots.indexOf('iron-guard'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(rootReplaced, tenSkills),
  defaultSlots,
  'a complete pre-root server must repair only the unavailable eleventh skill',
);

const chainReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'chain-lightning', 'heavy-strike', allSkills);
assert.ok(chainReplaced);
assert.equal(chainReplaced.indexOf('chain-lightning'), defaultSlots.indexOf('heavy-strike'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(chainReplaced, elevenSkills),
  defaultSlots,
  'a complete pre-chain server must repair only the unavailable twelfth skill',
);

const renewalReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'renewal-wave', 'iron-guard', allSkills);
assert.ok(renewalReplaced);
assert.equal(renewalReplaced.indexOf('renewal-wave'), defaultSlots.indexOf('iron-guard'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(renewalReplaced, twelveSkills),
  defaultSlots,
  'a complete pre-renewal server must repair only the unavailable thirteenth skill',
);

const phaseReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'phase-step', 'arcane-nova', allSkills);
assert.ok(phaseReplaced);
assert.equal(phaseReplaced.indexOf('phase-step'), defaultSlots.indexOf('arcane-nova'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(phaseReplaced, thirteenSkills),
  defaultSlots,
  'a complete pre-phase server must repair only the unavailable fourteenth skill',
);

const spiritReplaced = hotbar.replaceHotbarSkill(defaultSlots, 'nature-spirit', 'heavy-strike', allSkills);
assert.ok(spiritReplaced);
assert.equal(spiritReplaced.indexOf('nature-spirit'), defaultSlots.indexOf('heavy-strike'));
assert.deepEqual(
  hotbar.reconcileHotbarLoadout(spiritReplaced, fourteenSkills),
  defaultSlots,
  'a complete pre-spirit server must repair only the unavailable fifteenth skill',
);

const swapped = hotbar.swapHotbarActions(defaultSlots, 'potion', 'iron-guard');
assert.ok(swapped);
assert.equal(swapped[0], 'iron-guard');
assert.equal(swapped[7], 'potion');
assert.equal(hotbar.isValidHotbarLoadout(swapped, allSkills), true, 'drag reorder must retain loadout invariants');

const hudSource = await readFile(path.join(root, 'src/ui/HUD.ts'), 'utf8');
assert.doesNotMatch(hudSource, /hotbar-number-slot/, '9/0 placeholder slots must be removed');
assert.match(hudSource, /slot\.hidden = !active/);
assert.match(hudSource, /Escolher habilidade a substituir/);
assert.match(hudSource, /this\.onHotbarEquip\(skill\.id, replace\)/);
assert.match(hudSource, /slot\.tabIndex = active \? 0 : -1/);
assert.match(hudSource, /id="skill-loadout-list" aria-live="polite"/);
assert.match(hudSource, /focusCard\?\.focus\(\{ preventScroll: true \}\)/, 'Equipar must restore focus inside the non-modal loadout panel');

console.info('hotbar loadout v2, migration, repair and 6-of-15 verification passed');
