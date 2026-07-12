import { catalogSkill, type NormalizedSkillState } from './SkillCatalog';
import type { CombatEvent, EntityState, SkillEffectCombatEvent } from './types';

export const RENEWAL_WAVE_ID = 'renewal-wave' as const;
export const RENEWAL_WAVE_HEAL_ID = 'renewal-wave-heal' as const;
export const RENEWAL_WAVE_MANA_COST = 26 as const;
export const RENEWAL_WAVE_COOLDOWN = 11 as const;
export const RENEWAL_WAVE_BOUNCE_RANGE = 7 as const;
export const RENEWAL_WAVE_MAX_ALLIES = 3 as const;
export const RENEWAL_WAVE_FALLOFF = 0.85 as const;
export const RENEWAL_WAVE_EFFECT_RADIUS = 0.32 as const;
export const RENEWAL_WAVE_EFFECT_DURATION = 0.42 as const;

export const RENEWAL_WAVE_PALETTE = {
  leaf: '#83d96b',
  core: '#eaffb4',
  tether: '#82f0c3',
  bloom: '#d7ff9a',
} as const;

function position(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export function renewalWaveSkillPresentationGate(skills: unknown): NormalizedSkillState | null {
  const skill = catalogSkill(skills, RENEWAL_WAVE_ID);
  if (!skill || skill.label !== 'Onda de Renovação' || skill.discipline !== 'survival' || skill.targetMode !== 'self'
    || !skill.stationary || skill.requiresPhysicalWeapon || skill.masteryId !== 'survival'
    || skill.manaCost !== RENEWAL_WAVE_MANA_COST || skill.cooldown !== RENEWAL_WAVE_COOLDOWN
    || skill.range !== RENEWAL_WAVE_BOUNCE_RANGE || !skill.description?.includes('três aliados')) return null;
  return skill;
}

export interface RenewalWaveEventPresentation {
  event: SkillEffectCombatEvent & {
    skill: typeof RENEWAL_WAVE_HEAL_ID;
    sourceSkill: typeof RENEWAL_WAVE_ID;
    targetId: string;
    origin: { x: number; y: number; z: number };
    amount: number;
    charges: 1 | 2 | 3 | 4;
  };
  caster: EntityState;
  target: EntityState;
  hop: 1 | 2 | 3 | 4;
}

export function renewalWaveEventPresentationGate(
  value: CombatEvent,
  entities: readonly EntityState[],
): RenewalWaveEventPresentation | null {
  if (value.type !== 'skill-effect' || value.skill !== RENEWAL_WAVE_HEAL_ID || value.sourceSkill !== RENEWAL_WAVE_ID
    || !value.targetId || !position(value.origin) || !position(value.position) || value.radius !== RENEWAL_WAVE_EFFECT_RADIUS
    || value.duration !== RENEWAL_WAVE_EFFECT_DURATION || typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0
    || !Number.isInteger(value.charges) || (value.charges ?? 0) < 1 || (value.charges ?? 0) > 4) return null;
  const caster = entities.find((entity) => entity.id === value.casterId);
  const target = entities.find((entity) => entity.id === value.targetId);
  if (!caster || caster.kind !== 'player' || !target || target.kind !== 'player' || value.amount > target.maxHp) return null;
  if (Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z) > RENEWAL_WAVE_BOUNCE_RANGE + 0.03) return null;
  const charges = value.charges as 1 | 2 | 3 | 4;
  return {
    event: value as RenewalWaveEventPresentation['event'], caster, target,
    hop: (5 - charges) as 1 | 2 | 3 | 4,
  };
}
