import { catalogSkill, type NormalizedSkillState } from './SkillCatalog';
import type { CombatEvent, EntityState, NatureSpiritState, SkillEffectCombatEvent } from './types';

export const NATURE_SPIRIT_ID = 'nature-spirit' as const;
export const NATURE_SPIRIT_SUMMON_EFFECT_ID = 'nature-spirit-summon' as const;
export const NATURE_SPIRIT_BOLT_EFFECT_ID = 'nature-spirit-bolt' as const;
export const NATURE_SPIRIT_MANA_COST = 32 as const;
export const NATURE_SPIRIT_COOLDOWN = 24 as const;
export const NATURE_SPIRIT_DURATION = 18 as const;
export const NATURE_SPIRIT_ATTACK_RANGE = 8 as const;
export const NATURE_SPIRIT_ATTACK_INTERVAL = 1.6 as const;
export const NATURE_SPIRIT_CAST_RADIUS = 0.45 as const;
export const NATURE_SPIRIT_CAST_DURATION = 0.55 as const;
export const NATURE_SPIRIT_BOLT_RADIUS = 0.18 as const;
export const NATURE_SPIRIT_BOLT_DURATION = 0.32 as const;

export const NATURE_SPIRIT_PALETTE = {
  leaf: '#7de093',
  soul: '#d9ffd0',
  halo: '#8af4d2',
  bolt: '#b9ff8a',
} as const;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function position(value: unknown): value is { x: number; y: number; z: number } {
  const source = objectValue(value);
  return source !== null && ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export function natureSpiritSkillPresentationGate(skills: unknown): NormalizedSkillState | null {
  const skill = catalogSkill(skills, NATURE_SPIRIT_ID);
  if (!skill || skill.label !== 'Espírito de Aranna' || skill.discipline !== 'survival' || skill.targetMode !== 'self'
    || !skill.stationary || skill.requiresPhysicalWeapon || skill.masteryId !== 'survival'
    || skill.manaCost !== NATURE_SPIRIT_MANA_COST || skill.cooldown !== NATURE_SPIRIT_COOLDOWN
    || skill.range !== NATURE_SPIRIT_ATTACK_RANGE || !skill.description?.includes('inimigo visível mais próximo')) return null;
  return skill;
}

export function natureSpiritStatesPresentationGate(
  value: unknown,
  entities: readonly EntityState[],
): NatureSpiritState[] {
  if (!Array.isArray(value)) return [];
  const states: NatureSpiritState[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const state = objectValue(candidate);
    if (!state || state.version !== 1 || typeof state.id !== 'string' || typeof state.ownerId !== 'string'
      || state.id !== `nature-spirit-${state.ownerId}` || seen.has(state.id) || !position(state.position)
      || typeof state.remaining !== 'number' || !Number.isFinite(state.remaining) || state.remaining <= 0 || state.remaining > NATURE_SPIRIT_DURATION
      || state.duration !== NATURE_SPIRIT_DURATION || typeof state.attackCooldown !== 'number'
      || !Number.isFinite(state.attackCooldown) || state.attackCooldown < 0 || state.attackCooldown > NATURE_SPIRIT_ATTACK_INTERVAL
      || (state.targetId !== undefined && (typeof state.targetId !== 'string' || !state.targetId))) continue;
    const owner = entities.find((entity) => entity.id === state.ownerId);
    if (!owner || owner.kind !== 'player' || !owner.alive) continue;
    seen.add(state.id);
    states.push(candidate as NatureSpiritState);
  }
  return states;
}

export type NatureSpiritEventPresentation =
  | { phase: 'summon'; event: SkillEffectCombatEvent & { skill: typeof NATURE_SPIRIT_SUMMON_EFFECT_ID; sourceSkill: typeof NATURE_SPIRIT_ID; origin: NonNullable<SkillEffectCombatEvent['origin']> } }
  | { phase: 'bolt'; event: SkillEffectCombatEvent & { skill: typeof NATURE_SPIRIT_BOLT_EFFECT_ID; sourceSkill: typeof NATURE_SPIRIT_ID; targetId: string; origin: NonNullable<SkillEffectCombatEvent['origin']> } };

export function natureSpiritEventPresentationGate(
  value: CombatEvent,
  entities: readonly EntityState[],
): NatureSpiritEventPresentation | null {
  if (value.type !== 'skill-effect' || value.sourceSkill !== NATURE_SPIRIT_ID || !position(value.origin) || !position(value.position)) return null;
  const caster = entities.find((entity) => entity.id === value.casterId);
  if (!caster || caster.kind !== 'player') return null;
  if (value.skill === NATURE_SPIRIT_SUMMON_EFFECT_ID) {
    if (value.targetId !== undefined || value.radius !== NATURE_SPIRIT_CAST_RADIUS || value.duration !== NATURE_SPIRIT_CAST_DURATION
      || Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z) > 1.46) return null;
    return { phase: 'summon', event: value as Extract<NatureSpiritEventPresentation, { phase: 'summon' }>['event'] };
  }
  if (value.skill === NATURE_SPIRIT_BOLT_EFFECT_ID) {
    if (!value.targetId || value.radius !== NATURE_SPIRIT_BOLT_RADIUS || value.duration !== NATURE_SPIRIT_BOLT_DURATION
      || Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z) > NATURE_SPIRIT_ATTACK_RANGE + 0.001) return null;
    const target = entities.find((entity) => entity.id === value.targetId);
    if (!target || target.kind !== 'enemy') return null;
    return { phase: 'bolt', event: value as Extract<NatureSpiritEventPresentation, { phase: 'bolt' }>['event'] };
  }
  return null;
}
