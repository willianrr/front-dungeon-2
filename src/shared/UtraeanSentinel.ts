import type { CombatEvent, EntityState, SkillId, UtraeanSentinelCombatEvent } from './types';

export const UTRAEAN_SENTINEL_VARIANT = 'utraeanSentinel' as const;
export const UTRAEAN_LANCE_SKILL = 'utraean-lance' as const;
export const UTRAEAN_LANCE_RANGE = 12 as const;
export const UTRAEAN_LANCE_HALF_WIDTH = 0.9 as const;
export const UTRAEAN_LANCE_WINDUP = 0.85 as const;
export const UTRAEAN_LANCE_INTERRUPTED_RECOVERY = 1.8 as const;

export const UTRAEAN_SENTINEL_PALETTE = {
  stone: '#3d5867',
  metal: '#87a4b1',
  rune: '#72e7ff',
  warning: '#f3cf6b',
  impact: '#8e8cff',
  interrupted: '#83ffd0',
  minimap: '#67cfe8',
  minimapRing: '#e9cf72',
} as const;

export const UTRAEAN_LANCE_INTERRUPT_SKILLS = [
  'heavy-strike', 'charge', 'steel-sweep', 'arcane-nova', 'arcane-bolt', 'chain-lightning',
] as const satisfies readonly SkillId[];

function position(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export type UtraeanSentinelEventPresentation =
  | { type: 'warning'; event: Extract<UtraeanSentinelCombatEvent, { type: 'utraean-lance-warning' }>; sentinel: EntityState }
  | { type: 'impact'; event: Extract<UtraeanSentinelCombatEvent, { type: 'utraean-lance-impact' }>; sentinel: EntityState }
  | { type: 'interrupted'; event: Extract<UtraeanSentinelCombatEvent, { type: 'utraean-lance-interrupted' }>; sentinel: EntityState; interrupter: EntityState };

export function utraeanSentinelEventPresentationGate(
  value: CombatEvent,
  entities: readonly EntityState[],
): UtraeanSentinelEventPresentation | null {
  if (value.type !== 'utraean-lance-warning' && value.type !== 'utraean-lance-impact' && value.type !== 'utraean-lance-interrupted') return null;
  if (value.skill !== UTRAEAN_LANCE_SKILL) return null;
  if (value.type === 'utraean-lance-interrupted') {
    const sentinel = entities.find((entity) => entity.id === value.targetId);
    const interrupter = entities.find((entity) => entity.id === value.casterId);
    if (!sentinel || sentinel.kind !== 'enemy' || sentinel.enemyVariant !== UTRAEAN_SENTINEL_VARIANT
      || !interrupter || interrupter.kind !== 'player' || value.duration !== UTRAEAN_LANCE_INTERRUPTED_RECOVERY
      || !UTRAEAN_LANCE_INTERRUPT_SKILLS.includes(value.sourceSkill as typeof UTRAEAN_LANCE_INTERRUPT_SKILLS[number])) return null;
    return { type: 'interrupted', event: value, sentinel, interrupter };
  }
  if (value.radius !== UTRAEAN_LANCE_HALF_WIDTH) return null;
  const sentinel = entities.find((entity) => entity.id === value.casterId);
  if (!sentinel || sentinel.kind !== 'enemy' || sentinel.enemyVariant !== UTRAEAN_SENTINEL_VARIANT
    || !position(value.origin) || !position(value.position)) return null;
  const length = Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z);
  if (Math.abs(length - UTRAEAN_LANCE_RANGE) > 0.03) return null;
  if (value.type === 'utraean-lance-warning') {
    if (value.delay !== UTRAEAN_LANCE_WINDUP) return null;
    return { type: 'warning', event: value, sentinel };
  }
  return { type: 'impact', event: value, sentinel };
}
