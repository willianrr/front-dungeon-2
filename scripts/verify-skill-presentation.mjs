import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(tmpdir(), 'aranna-verify-skill-presentation');
const sourcePath = path.join(root, 'src/shared/SteelSweepPresentation.ts');
const outputPath = path.join(outDir, 'SteelSweepPresentation.mjs');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

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

const {
  GENERIC_STEEL_SWEEP_PRESENTATION,
  STEEL_SWEEP_PRESENTATIONS,
  normalizeSteelSweepVariant,
  resolveSteelSweepVariant,
  steelSweepPresentationForVariant,
  steelSweepTooltip,
  steelSweepVariantForEquipment,
  steelSweepVariantForWeaponKind,
} = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);

const weaponCases = [
  ['sword', 'sword'],
  ['great_sword', 'sword'],
  ['axe', 'axe'],
  ['great_axe', 'axe'],
  ['war_hammer', 'hammer'],
];
for (const [kind, expected] of weaponCases) {
  assert.equal(steelSweepVariantForWeaponKind(kind), expected, `${kind} must map to ${expected}`);
}

assert.equal(steelSweepVariantForWeaponKind('armor'), null, 'non-weapons must not create a sweep variant');
assert.equal(normalizeSteelSweepVariant('hammer'), 'hammer', 'known server variants must survive normalization');
assert.equal(normalizeSteelSweepVariant('unknown'), null, 'unknown server variants must use the legacy fallback');

const inventory = [
  { id: 'main-sword', kind: 'sword' },
  { id: 'off-axe', kind: 'great_axe' },
  { id: 'hammer', kind: 'war_hammer' },
];
assert.equal(
  steelSweepVariantForEquipment({ weapon: 'main-sword', offhand: 'off-axe' }, inventory),
  'sword',
  'main hand must win when two weapon families are equipped',
);
assert.equal(
  steelSweepVariantForEquipment({ weapon: null, offhand: 'off-axe' }, inventory),
  'axe',
  'offhand must be used when no main-hand weapon exists',
);
assert.equal(
  steelSweepVariantForEquipment({ weapon: 'missing', offhand: 'hammer' }, inventory),
  'hammer',
  'an unresolved main-hand delta must fall back to the resolved offhand',
);
assert.equal(
  resolveSteelSweepVariant('hammer', { weapon: 'main-sword', offhand: 'off-axe' }, inventory),
  'hammer',
  'authoritative skill state must win over local equipment fallback',
);
assert.equal(
  resolveSteelSweepVariant(undefined, { weapon: 'main-sword', offhand: 'off-axe' }, inventory),
  'sword',
  'legacy skill state must derive the local main-hand variant',
);
assert.equal(
  resolveSteelSweepVariant('invalid', { weapon: 'main-sword', offhand: 'off-axe' }, inventory),
  'sword',
  'invalid runtime variants must fall back to local equipment safely',
);

const paletteColors = new Set(Object.values(STEEL_SWEEP_PRESENTATIONS).map((entry) => entry.ringColor));
assert.equal(paletteColors.size, 3, 'sword, axe and hammer need distinct ring palettes');
assert.deepEqual(
  Object.values(STEEL_SWEEP_PRESENTATIONS).map((entry) => entry.badge),
  ['CRIT', 'SANG', 'ABALO'],
  'each weapon family needs a compact, readable hotbar badge',
);
assert.equal(
  steelSweepPresentationForVariant('invalid'),
  GENERIC_STEEL_SWEEP_PRESENTATION,
  'invalid or absent event variants must preserve the generic VFX',
);

const authoritativeTooltip = steelSweepTooltip({
  label: 'Varredura de Aço',
  description: 'Descrição autoritativa da espada.',
  cooldown: 4.25,
}, 'sword', true);
assert.match(authoritativeTooltip, /Descrição autoritativa da espada\./, 'server description must win in the tooltip');
assert.match(authoritativeTooltip, /Recarga 4,3 s\./, 'tooltip cooldown must use the live skill duration');
assert.doesNotMatch(authoritativeTooltip, /Requer arma/, 'equipped variants must not show the weapon warning');

const noWeaponTooltip = steelSweepTooltip(undefined, null, false);
assert.match(noWeaponTooltip, /A arma equipada define o efeito adicional/, 'legacy fallback must explain variant selection');
assert.match(noWeaponTooltip, /Requer arma física equipada\./, 'unarmed state must remain explicit');

const authoritativeUnarmedTooltip = steelSweepTooltip({
  label: 'Varredura de Aço',
  description: 'Requer uma arma física equipada.',
  cooldown: 5.5,
}, null, false);
assert.equal(
  [...authoritativeUnarmedTooltip.matchAll(/Requer (?:uma )?arma física equipada\./g)].length,
  1,
  'the real unarmed server payload must not duplicate its weapon requirement',
);
assert.match(authoritativeUnarmedTooltip, /Recarga 5,5 s\./, 'unarmed authoritative payload must keep cooldown context');

console.info('Steel Sweep presentation verification passed.');
