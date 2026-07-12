import type {
  CombatEvent,
  EntityState,
  MasteryProgressState,
  SkillId,
  SkillState,
  SteelSweepTechniqueChoiceState,
  SteelSweepVariant,
  TalentState,
} from './types';

export const STEEL_SWEEP_TECHNIQUE_VERSION = 1;
export const STEEL_SWEEP_FORM_CHOICE_GROUP = 'warrior_steel_sweep_form';
export const STEEL_SWEEP_FORM_REQUIRED_MASTERY_LEVEL = 5;
export const STEEL_SWEEP_ORBIT_RADIUS = 4.2;
export const STEEL_SWEEP_ORBIT_MAX_TARGETS = 7;
export const STEEL_SWEEP_ORBIT_DAMAGE_MULTIPLIER = 0.65;
export const STEEL_SWEEP_WEDGE_RADIUS = 5.2;
export const STEEL_SWEEP_WEDGE_ARC_DEGREES = 110;
export const STEEL_SWEEP_WEDGE_MAX_TARGETS = 3;
export const STEEL_SWEEP_WEDGE_DAMAGE_MULTIPLIER = 1.15;

export const STEEL_SWEEP_FORM_IDS = [
  'warrior_sweep_form_orbit',
  'warrior_sweep_form_wedge',
] as const;

export type SteelSweepFormId = typeof STEEL_SWEEP_FORM_IDS[number];

export const STEEL_SWEEP_FORM_PALETTE = {
  orbit: '#e7c66a',
  orbitCore: '#fff1b2',
  wedge: '#ef8c55',
  wedgeCore: '#ffe1b0',
} as const;

const CANONICAL_SKILL_IDS = [
  'arcane-nova',
  'war-cry',
  'charge',
  'heavy-strike',
  'steel-sweep',
  'iron-guard',
  'arcane-bolt',
  'bulwark-call',
] as const satisfies readonly SkillId[];

interface FormContract {
  radius: number;
  maxTargets: number;
  damageMultiplier: number;
  arcDegrees?: number;
}

export const STEEL_SWEEP_FORM_CONTRACTS: Readonly<Record<SteelSweepFormId, FormContract>> = {
  warrior_sweep_form_orbit: {
    radius: STEEL_SWEEP_ORBIT_RADIUS,
    maxTargets: STEEL_SWEEP_ORBIT_MAX_TARGETS,
    damageMultiplier: STEEL_SWEEP_ORBIT_DAMAGE_MULTIPLIER,
  },
  warrior_sweep_form_wedge: {
    radius: STEEL_SWEEP_WEDGE_RADIUS,
    arcDegrees: STEEL_SWEEP_WEDGE_ARC_DEGREES,
    maxTargets: STEEL_SWEEP_WEDGE_MAX_TARGETS,
    damageMultiplier: STEEL_SWEEP_WEDGE_DAMAGE_MULTIPLIER,
  },
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function isFormId(value: unknown): value is SteelSweepFormId {
  return typeof value === 'string' && (STEEL_SWEEP_FORM_IDS as readonly string[]).includes(value);
}

function isSteelSweepVariant(value: unknown): value is SteelSweepVariant {
  return value === 'sword' || value === 'axe' || value === 'hammer';
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 500;
}

function canonicalSkillWire(value: unknown): SkillState[] | null {
  if (!Array.isArray(value) || value.length !== CANONICAL_SKILL_IDS.length) return null;
  const expected = new Set<string>(CANONICAL_SKILL_IDS);
  const seen = new Set<string>();
  const skills: SkillState[] = [];
  for (const candidate of value) {
    const source = objectValue(candidate);
    if (!source || typeof source.id !== 'string' || !expected.has(source.id) || seen.has(source.id)) return null;
    seen.add(source.id);
    skills.push(candidate as SkillState);
  }
  return seen.size === expected.size ? skills : null;
}

export function normalizeSteelSweepTechniqueChoices(state: unknown): SteelSweepTechniqueChoiceState[] | null {
  const source = objectValue(state);
  if (source?.techniqueVersion !== STEEL_SWEEP_TECHNIQUE_VERSION) return null;
  if (!Array.isArray(source.techniqueChoices) || source.techniqueChoices.length !== STEEL_SWEEP_FORM_IDS.length) return null;
  const result: SteelSweepTechniqueChoiceState[] = [];
  for (let index = 0; index < STEEL_SWEEP_FORM_IDS.length; index++) {
    const choice = objectValue(source.techniqueChoices[index]);
    const expectedId = STEEL_SWEEP_FORM_IDS[index];
    if (!choice || choice.id !== expectedId || !nonEmptyText(choice.label) || !nonEmptyText(choice.description)) return null;
    if (choice.choiceGroup !== STEEL_SWEEP_FORM_CHOICE_GROUP || choice.cost !== 1) return null;
    if (choice.requiredMasteryId !== 'martial' || choice.requiredMasteryLevel !== STEEL_SWEEP_FORM_REQUIRED_MASTERY_LEVEL) return null;
    if (!Array.isArray(choice.modifiesSkills) || choice.modifiesSkills.length !== 1 || choice.modifiesSkills[0] !== 'steel-sweep') return null;
    result.push({
      id: expectedId,
      label: choice.label.trim(),
      description: choice.description.trim(),
      choiceGroup: STEEL_SWEEP_FORM_CHOICE_GROUP,
      cost: 1,
      requiredMasteryId: 'martial',
      requiredMasteryLevel: STEEL_SWEEP_FORM_REQUIRED_MASTERY_LEVEL,
      modifiesSkills: ['steel-sweep'],
    });
  }
  return result;
}

export interface SteelSweepFormSelection {
  valid: boolean;
  activeId: SteelSweepFormId | null;
}

export function steelSweepFormSelection(
  state: Pick<TalentState, 'talents'>,
  choices: readonly SteelSweepTechniqueChoiceState[],
): SteelSweepFormSelection {
  if (!state.talents || typeof state.talents !== 'object') return { valid: false, activeId: null };
  for (const [id, rank] of Object.entries(state.talents)) {
    if (!id.startsWith('warrior_sweep_form_') || isFormId(id)) continue;
    if (rank !== 0) return { valid: false, activeId: null };
  }
  let activeId: SteelSweepFormId | null = null;
  for (const choice of choices) {
    if (!isFormId(choice.id)) return { valid: false, activeId: null };
    const rank = state.talents[choice.id];
    if (rank === undefined || rank === 0) continue;
    if (rank !== 1 || activeId !== null) return { valid: false, activeId: null };
    activeId = choice.id;
  }
  return { valid: true, activeId };
}

function modifiersAreCoherent(skills: readonly SkillState[], activeId: SteelSweepFormId | null): boolean {
  for (const skill of skills) {
    if (skill.modifiers !== undefined && !Array.isArray(skill.modifiers)) return false;
    const modifiers = skill.modifiers ?? [];
    const formModifiers = modifiers.filter((modifier) => (
      typeof modifier?.id === 'string' && modifier.id.startsWith('warrior_sweep_form_')
    ));
    if (skill.id !== 'steel-sweep') {
      if (formModifiers.length > 0) return false;
      continue;
    }
    if (activeId === null) {
      if (formModifiers.length > 0) return false;
      continue;
    }
    if (formModifiers.length !== 1 || formModifiers[0].id !== activeId ||
      !nonEmptyText(formModifiers[0].label) || !nonEmptyText(formModifiers[0].description)) return false;
    const formIndex = modifiers.indexOf(formModifiers[0]);
    let lastDoctrineIndex = -1;
    for (let index = 0; index < modifiers.length; index++) {
      if (typeof modifiers[index]?.id === 'string' && modifiers[index].id.startsWith('warrior_doctrine_')) {
        lastDoctrineIndex = index;
      }
    }
    if (lastDoctrineIndex > formIndex) return false;
  }
  return skills.some((skill) => skill.id === 'steel-sweep');
}

export interface SteelSweepFormPresentationGate {
  choices: SteelSweepTechniqueChoiceState[];
  activeId: SteelSweepFormId | null;
  skills: SkillState[];
}

export function steelSweepFormPresentationGate(
  state: unknown,
  skillsWire: unknown,
): SteelSweepFormPresentationGate | null {
  const choices = normalizeSteelSweepTechniqueChoices(state);
  const source = objectValue(state);
  const talents = objectValue(source?.talents);
  const skills = canonicalSkillWire(skillsWire);
  if (!choices || !talents || !skills) return null;
  const selection = steelSweepFormSelection({ talents: talents as Record<string, number> }, choices);
  if (!selection.valid || !modifiersAreCoherent(skills, selection.activeId)) return null;
  return { choices, activeId: selection.activeId, skills };
}

export function steelSweepFormCanLearn(
  state: Pick<TalentState, 'availablePoints' | 'talents'>,
  choice: SteelSweepTechniqueChoiceState,
  masteries: readonly MasteryProgressState[],
  choices: readonly SteelSweepTechniqueChoiceState[],
): boolean {
  if (!isFormId(choice.id) || state.talents?.[choice.id] > 0) return false;
  if (!Number.isFinite(state.availablePoints) || state.availablePoints < choice.cost) return false;
  const selection = steelSweepFormSelection(state, choices);
  if (!selection.valid || selection.activeId !== null) return false;
  const martial = masteries.find((candidate) => candidate.id === 'martial');
  return Number.isFinite(martial?.level) && (martial?.level ?? 0) >= STEEL_SWEEP_FORM_REQUIRED_MASTERY_LEVEL;
}

export interface SteelSweepFormEventPresentation {
  formId: SteelSweepFormId;
  caster: EntityState | null;
  historical: boolean;
  variant: SteelSweepVariant;
  position: Readonly<{ x: number; y: number; z: number }>;
  radius: number;
  rotationY?: number;
  arcDegrees?: number;
}

function finitePosition(value: unknown): value is Readonly<{ x: number; y: number; z: number }> {
  const source = objectValue(value);
  return Boolean(source) &&
    typeof source!.x === 'number' && Number.isFinite(source!.x) &&
    typeof source!.y === 'number' && Number.isFinite(source!.y) &&
    typeof source!.z === 'number' && Number.isFinite(source!.z);
}

function finiteExact(value: unknown, expected: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value === expected;
}

function nonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function steelSweepFormEventPresentationGate(
  event: CombatEvent | unknown,
  entities: readonly EntityState[],
): SteelSweepFormEventPresentation | null {
  const wire = objectValue(event);
  if (!wire || wire.type !== 'steel-sweep-effect' || wire.skill !== 'steel-sweep' ||
    !nonEmptyId(wire.id) || !nonEmptyId(wire.casterId) || !isFormId(wire.modifierId) ||
    !finitePosition(wire.position) || !isSteelSweepVariant(wire.variant)) return null;
  for (const field of [
    'targetId', 'amount', 'damageKind', 'critical', 'sourceSkill', 'damageEffect',
    'innerRadius', 'delay', 'duration', 'encounterId', 'wave',
  ]) {
    if (wire[field] !== undefined) return null;
  }
  const matches = entities.filter((entity) => entity.id === wire.casterId);
  if (matches.length > 1) return null;
  const caster = matches[0] ?? null;
  if (caster && (caster.kind !== 'player' || typeof caster.alive !== 'boolean')) return null;
  const contract = STEEL_SWEEP_FORM_CONTRACTS[wire.modifierId];
  if (!finiteExact(wire.radius, contract.radius)) return null;
  if (wire.modifierId === 'warrior_sweep_form_orbit') {
    if (wire.rotationY !== undefined || wire.arcDegrees !== undefined) return null;
  } else if (!finiteExact(wire.arcDegrees, STEEL_SWEEP_WEDGE_ARC_DEGREES) ||
    typeof wire.rotationY !== 'number' || !Number.isFinite(wire.rotationY)) {
    return null;
  }
  return {
    formId: wire.modifierId,
    caster,
    historical: caster === null || !caster.alive,
    variant: wire.variant,
    position: wire.position,
    radius: wire.radius,
    ...(wire.modifierId === 'warrior_sweep_form_wedge'
      ? { rotationY: wire.rotationY as number, arcDegrees: wire.arcDegrees as number }
      : {}),
  };
}
