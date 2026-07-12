import type {
  CombatDoctrineChoiceState,
  MasteryId,
  MasteryProgressState,
  SkillId,
  SkillState,
  TalentState,
} from './types';

export const COMBAT_DOCTRINE_VERSION = 1;
export const COMBAT_DOCTRINE_CHOICE_GROUP = 'warrior_combat_doctrine';

export const COMBAT_DOCTRINE_IDS = [
  'warrior_doctrine_vanguard',
  'warrior_doctrine_arcane_convergence',
  'warrior_doctrine_guardian_cadence',
] as const;

export type CombatDoctrineId = typeof COMBAT_DOCTRINE_IDS[number];

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

interface DoctrineContract {
  requiredMasteryId: MasteryId;
  requiredMasteryLevel: 3;
  modifiesSkills: readonly [SkillId, SkillId];
}

export const COMBAT_DOCTRINE_CONTRACTS: Readonly<Record<CombatDoctrineId, DoctrineContract>> = {
  warrior_doctrine_vanguard: {
    requiredMasteryId: 'martial',
    requiredMasteryLevel: 3,
    modifiesSkills: ['charge', 'steel-sweep'],
  },
  warrior_doctrine_arcane_convergence: {
    requiredMasteryId: 'arcana',
    requiredMasteryLevel: 3,
    modifiesSkills: ['arcane-bolt', 'arcane-nova'],
  },
  warrior_doctrine_guardian_cadence: {
    requiredMasteryId: 'survival',
    requiredMasteryLevel: 3,
    modifiesSkills: ['iron-guard', 'bulwark-call'],
  },
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function isDoctrineId(value: unknown): value is CombatDoctrineId {
  return typeof value === 'string' && (COMBAT_DOCTRINE_IDS as readonly string[]).includes(value);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 500;
}

function hasExpectedSkillPair(value: unknown, expected: readonly [SkillId, SkillId]): value is SkillId[] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  if (!value.every((skill): skill is SkillId => typeof skill === 'string')) return false;
  const unique = new Set(value);
  return unique.size === 2 && expected.every((skill) => unique.has(skill));
}

/**
 * Gate de compatibilidade fechado: qualquer versao/campo/entrada inesperada
 * esconde toda a apresentacao, mantendo os talentos legados intactos.
 */
export function normalizeCombatDoctrineChoices(state: unknown): CombatDoctrineChoiceState[] | null {
  const source = objectValue(state);
  if (source?.signatureVersion !== COMBAT_DOCTRINE_VERSION) return null;
  if (!Array.isArray(source.signatureChoices) || source.signatureChoices.length !== COMBAT_DOCTRINE_IDS.length) return null;

  const choices = new Map<CombatDoctrineId, CombatDoctrineChoiceState>();
  for (const rawChoice of source.signatureChoices) {
    const choice = objectValue(rawChoice);
    if (!choice || !isDoctrineId(choice.id) || choices.has(choice.id)) return null;
    const contract = COMBAT_DOCTRINE_CONTRACTS[choice.id];
    if (!nonEmptyText(choice.label) || !nonEmptyText(choice.description)) return null;
    if (choice.choiceGroup !== COMBAT_DOCTRINE_CHOICE_GROUP) return null;
    if (choice.cost !== 1) return null;
    if (choice.requiredMasteryId !== contract.requiredMasteryId) return null;
    if (choice.requiredMasteryLevel !== contract.requiredMasteryLevel) return null;
    if (!hasExpectedSkillPair(choice.modifiesSkills, contract.modifiesSkills)) return null;
    choices.set(choice.id, {
      id: choice.id,
      label: choice.label.trim(),
      description: choice.description.trim(),
      choiceGroup: COMBAT_DOCTRINE_CHOICE_GROUP,
      cost: choice.cost as number,
      requiredMasteryId: contract.requiredMasteryId,
      requiredMasteryLevel: contract.requiredMasteryLevel,
      modifiesSkills: [...contract.modifiesSkills],
    });
  }

  if (choices.size !== COMBAT_DOCTRINE_IDS.length) return null;
  return COMBAT_DOCTRINE_IDS.map((id) => choices.get(id)!);
}

export function activeCombatDoctrineId(
  state: Pick<TalentState, 'talents'>,
  choices: readonly CombatDoctrineChoiceState[],
): CombatDoctrineId | null {
  const selection = combatDoctrineSelection(state, choices);
  return selection.valid ? selection.activeId : null;
}

export interface CombatDoctrineSelection {
  valid: boolean;
  activeId: CombatDoctrineId | null;
}

/** Zero ou uma escolha de rank 1 e coerente; estados impossiveis fecham o gate. */
export function combatDoctrineSelection(
  state: Pick<TalentState, 'talents'>,
  choices: readonly CombatDoctrineChoiceState[],
): CombatDoctrineSelection {
  if (!state.talents || typeof state.talents !== 'object') return { valid: false, activeId: null };
  for (const [id, rank] of Object.entries(state.talents)) {
    if (!id.startsWith('warrior_doctrine_') || isDoctrineId(id)) continue;
    if (rank !== 0) return { valid: false, activeId: null };
  }
  let activeId: CombatDoctrineId | null = null;
  for (const choice of choices) {
    if (!isDoctrineId(choice.id)) return { valid: false, activeId: null };
    const rawRank = state.talents[choice.id];
    if (rawRank === undefined || rawRank === 0) continue;
    if (rawRank !== 1 || activeId !== null) return { valid: false, activeId: null };
    activeId = choice.id;
  }
  return { valid: true, activeId };
}

/** Exige os dois modifiers da escolha e nenhum modifier ativo fora do par. */
export function combatDoctrineModifiersAreCoherent(
  skills: readonly SkillState[],
  choice: CombatDoctrineChoiceState,
): boolean {
  const expected = new Set(choice.modifiesSkills);
  let matchedSkills = 0;
  for (const skill of skills) {
    if (skill.modifiers !== undefined && !Array.isArray(skill.modifiers)) return false;
    const doctrineModifiers = (skill.modifiers ?? []).filter((modifier) => (
      typeof modifier?.id === 'string' && modifier.id.startsWith('warrior_doctrine_')
    ));
    if (!expected.has(skill.id)) {
      if (doctrineModifiers.length > 0) return false;
      continue;
    }
    if (doctrineModifiers.length !== 1 || doctrineModifiers[0].id !== choice.id) return false;
    if (!nonEmptyText(doctrineModifiers[0].label) || !nonEmptyText(doctrineModifiers[0].description)) return false;
    matchedSkills++;
  }
  return matchedSkills === expected.size;
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

function hasAnyDoctrineModifier(skills: readonly SkillState[]): boolean {
  for (const skill of skills) {
    if (skill.modifiers !== undefined && !Array.isArray(skill.modifiers)) return true;
    for (const modifier of skill.modifiers ?? []) {
      if (typeof modifier?.id === 'string' && modifier.id.startsWith('warrior_doctrine_')) return true;
    }
  }
  return false;
}

export interface CombatDoctrinePresentationGate {
  choices: CombatDoctrineChoiceState[];
  activeId: CombatDoctrineId | null;
  skills: SkillState[];
}

/** Gate unico usado por secao, tooltips, badges, buffs e VFX. */
export function combatDoctrinePresentationGate(
  state: unknown,
  skillsWire: unknown,
): CombatDoctrinePresentationGate | null {
  const choices = normalizeCombatDoctrineChoices(state);
  const source = objectValue(state);
  const talents = objectValue(source?.talents);
  const skills = canonicalSkillWire(skillsWire);
  if (!choices || !talents || !skills) return null;
  const selection = combatDoctrineSelection({ talents: talents as Record<string, number> }, choices);
  if (!selection.valid) return null;
  if (selection.activeId === null) {
    if (hasAnyDoctrineModifier(skills)) return null;
    return { choices, activeId: null, skills };
  }
  const activeChoice = choices.find((choice) => choice.id === selection.activeId);
  if (!activeChoice || !combatDoctrineModifiersAreCoherent(skills, activeChoice)) return null;
  return { choices, activeId: selection.activeId, skills };
}

export function combatDoctrineCanLearn(
  state: Pick<TalentState, 'availablePoints' | 'talents'>,
  choice: CombatDoctrineChoiceState,
  masteries: readonly MasteryProgressState[],
  choices: readonly CombatDoctrineChoiceState[],
): boolean {
  if (!isDoctrineId(choice.id) || state.talents?.[choice.id] > 0) return false;
  if (!Number.isFinite(state.availablePoints) || state.availablePoints < choice.cost) return false;
  const selection = combatDoctrineSelection(state, choices);
  if (!selection.valid || selection.activeId !== null) return false;
  const mastery = masteries.find((candidate) => candidate.id === choice.requiredMasteryId);
  return Number.isFinite(mastery?.level) && (mastery?.level ?? 0) >= choice.requiredMasteryLevel;
}
