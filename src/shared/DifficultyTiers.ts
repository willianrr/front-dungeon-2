import type { DifficultyId, DifficultyState, EnemyModifierState, EntityState } from './types';

export interface DifficultyDefinition {
  id: DifficultyId;
  label: string;
  description: string;
  rank: 0 | 1 | 2;
  requiredLevel: number;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  xpMultiplier: number;
  coinMultiplier: number;
  lootChanceBonus: number;
  itemPowerBonus: number;
  rarePlusChance: number;
  affixesPerEnemy: number;
}

export const DIFFICULTY_DEFINITIONS: readonly DifficultyDefinition[] = [
  {
    id: 'normal', label: 'Normal', description: 'A jornada base de Aranna.', rank: 0, requiredLevel: 1,
    enemyHpMultiplier: 1, enemyDamageMultiplier: 1, enemySpeedMultiplier: 1,
    xpMultiplier: 1, coinMultiplier: 1, lootChanceBonus: 0, itemPowerBonus: 0, rarePlusChance: 0.24, affixesPerEnemy: 0,
  },
  {
    id: 'veteran', label: 'Veterano', description: 'Inimigos mais fortes, um afixo e recompensas ampliadas.', rank: 1, requiredLevel: 3,
    enemyHpMultiplier: 1.35, enemyDamageMultiplier: 1.18, enemySpeedMultiplier: 1.05,
    xpMultiplier: 1.25, coinMultiplier: 1.25, lootChanceBonus: 0.08, itemPowerBonus: 2, rarePlusChance: 0.40, affixesPerEnemy: 1,
  },
  {
    id: 'elite', label: 'Elite', description: 'Dois afixos por inimigo, risco extremo e o melhor loot.', rank: 2, requiredLevel: 5,
    enemyHpMultiplier: 1.75, enemyDamageMultiplier: 1.40, enemySpeedMultiplier: 1.10,
    xpMultiplier: 1.50, coinMultiplier: 1.55, lootChanceBonus: 0.16, itemPowerBonus: 4, rarePlusChance: 0.58, affixesPerEnemy: 2,
  },
] as const;

export const DIFFICULTY_PALETTE: Record<DifficultyId, string> = {
  normal: '#86d9a2',
  veteran: '#ffbd67',
  elite: '#ef72ff',
};

export const DIFFICULTY_AFFIXES: Record<string, Omit<EnemyModifierState, 'active'>> = {
  difficulty_fortified: { id: 'difficulty_fortified', label: 'Fortificado', description: '+20% de vida máxima.' },
  difficulty_vicious: { id: 'difficulty_vicious', label: 'Cruel', description: '+15% de dano.' },
  difficulty_relentless: { id: 'difficulty_relentless', label: 'Implacável', description: '+12% de movimento e ataques mais rápidos.' },
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

export function difficultyDefinition(id: unknown): DifficultyDefinition | null {
  return DIFFICULTY_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

export function difficultyStatePresentationGate(value: unknown): DifficultyState | null {
  const wire = record(value);
  const definition = difficultyDefinition(wire?.id);
  if (!wire || !definition || wire.label !== definition.label || wire.rank !== definition.rank
    || wire.enemyHpMultiplier !== definition.enemyHpMultiplier
    || wire.enemyDamageMultiplier !== definition.enemyDamageMultiplier
    || wire.enemySpeedMultiplier !== definition.enemySpeedMultiplier
    || wire.xpMultiplier !== definition.xpMultiplier || wire.coinMultiplier !== definition.coinMultiplier
    || wire.lootChanceBonus !== definition.lootChanceBonus || wire.itemPowerBonus !== definition.itemPowerBonus
    || wire.rarePlusChance !== definition.rarePlusChance || wire.affixesPerEnemy !== definition.affixesPerEnemy
    || (wire.leaderId !== undefined && (typeof wire.leaderId !== 'string' || !wire.leaderId))
    || typeof wire.canChange !== 'boolean'
    || (wire.lockedReason !== undefined && typeof wire.lockedReason !== 'string')
    || !Array.isArray(wire.options) || wire.options.length !== DIFFICULTY_DEFINITIONS.length) return null;
  if ((wire.canChange && wire.lockedReason) || (!wire.canChange && !wire.lockedReason)) return null;

  let selectedCount = 0;
  for (let index = 0; index < DIFFICULTY_DEFINITIONS.length; index++) {
    const expected = DIFFICULTY_DEFINITIONS[index];
    const option = record(wire.options[index]);
    if (!option || option.id !== expected.id || option.label !== expected.label || option.description !== expected.description
      || option.requiredLevel !== expected.requiredLevel || typeof option.selected !== 'boolean'
      || typeof option.canSelect !== 'boolean'
      || (option.lockedReason !== undefined && typeof option.lockedReason !== 'string')) return null;
    if (option.selected) selectedCount++;
    if (option.selected !== (option.id === wire.id) || (option.selected && option.canSelect)) return null;
    if (option.canSelect && (!wire.canChange || option.lockedReason)) return null;
    if (!option.canSelect && !option.lockedReason) return null;
  }
  return selectedCount === 1 ? value as DifficultyState : null;
}

/** Fallback explicito para servidor antigo; nunca habilita uma escolha local. */
export function legacyNormalDifficultyState(): DifficultyState {
  const normal = DIFFICULTY_DEFINITIONS[0];
  const unavailable = 'Seleção indisponível neste servidor.';
  return {
    id: normal.id, label: normal.label, rank: normal.rank,
    enemyHpMultiplier: normal.enemyHpMultiplier, enemyDamageMultiplier: normal.enemyDamageMultiplier,
    enemySpeedMultiplier: normal.enemySpeedMultiplier, xpMultiplier: normal.xpMultiplier,
    coinMultiplier: normal.coinMultiplier, lootChanceBonus: normal.lootChanceBonus,
    itemPowerBonus: normal.itemPowerBonus, rarePlusChance: normal.rarePlusChance,
    affixesPerEnemy: normal.affixesPerEnemy, canChange: false, lockedReason: unavailable,
    options: DIFFICULTY_DEFINITIONS.map((option) => ({
      id: option.id, label: option.label, description: option.description, requiredLevel: option.requiredLevel,
      selected: option.id === 'normal', canSelect: false,
      lockedReason: option.id === 'normal' ? 'Dificuldade atual.' : unavailable,
    })),
  };
}

export function difficultyModifiersPresentationGate(
  entity: unknown,
  difficulty: DifficultyState,
): readonly EnemyModifierState[] | null {
  const wire = record(entity) as EntityState | null;
  if (!wire || wire.kind !== 'enemy') return null;
  const modifiers = wire.difficultyModifiers;
  if (difficulty.affixesPerEnemy === 0) return modifiers === undefined || modifiers.length === 0 ? [] : null;
  if (!Array.isArray(modifiers) || modifiers.length !== difficulty.affixesPerEnemy) return null;
  const seen = new Set<string>();
  for (const modifier of modifiers) {
    const candidate = record(modifier);
    const expected = candidate && typeof candidate.id === 'string' ? DIFFICULTY_AFFIXES[candidate.id] : undefined;
    if (!candidate || !expected || seen.has(expected.id) || candidate.label !== expected.label
      || candidate.description !== expected.description || candidate.active !== true) return null;
    seen.add(expected.id);
  }
  return modifiers;
}
