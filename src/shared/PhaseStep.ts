import { catalogSkill, type NormalizedSkillState } from './SkillCatalog';
import type { CombatEvent, EntityState, SkillEffectCombatEvent } from './types';

export const PHASE_STEP_ID = 'phase-step' as const;
export const PHASE_STEP_MANA_COST = 18 as const;
export const PHASE_STEP_COOLDOWN = 6 as const;
export const PHASE_STEP_RANGE = 6 as const;
export const PHASE_STEP_MIN_DISTANCE = 0.35 as const;
export const PHASE_STEP_EFFECT_RADIUS = 0.38 as const;
export const PHASE_STEP_EFFECT_DURATION = 0.28 as const;

export const PHASE_STEP_PALETTE = {
  origin: '#7868d9',
  trail: '#b59aff',
  core: '#eef0ff',
  arrival: '#7de8ff',
} as const;

function position(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export function phaseStepSkillPresentationGate(skills: unknown): NormalizedSkillState | null {
  const skill = catalogSkill(skills, PHASE_STEP_ID);
  if (!skill || skill.label !== 'Passo Espectral' || skill.discipline !== 'arcana' || skill.targetMode !== 'ground'
    || skill.stationary || skill.requiresPhysicalWeapon || skill.masteryId !== 'arcana'
    || skill.manaCost !== PHASE_STEP_MANA_COST || skill.cooldown !== PHASE_STEP_COOLDOWN
    || skill.range !== PHASE_STEP_RANGE || !skill.description?.includes('paredes')) return null;
  return skill;
}

export interface PhaseStepEventPresentation {
  event: SkillEffectCombatEvent & {
    skill: typeof PHASE_STEP_ID;
    sourceSkill: typeof PHASE_STEP_ID;
    origin: { x: number; y: number; z: number };
  };
  caster: EntityState;
}

export function phaseStepEventPresentationGate(
  value: CombatEvent,
  entities: readonly EntityState[],
): PhaseStepEventPresentation | null {
  if (value.type !== 'skill-effect' || value.skill !== PHASE_STEP_ID || value.sourceSkill !== PHASE_STEP_ID
    || !position(value.origin) || !position(value.position) || value.targetId !== undefined
    || value.radius !== PHASE_STEP_EFFECT_RADIUS || value.duration !== PHASE_STEP_EFFECT_DURATION) return null;
  const distance = Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z);
  if (distance < PHASE_STEP_MIN_DISTANCE || distance > PHASE_STEP_RANGE + 0.001) return null;
  const caster = entities.find((entity) => entity.id === value.casterId);
  if (!caster || caster.kind !== 'player') return null;
  return { event: value as PhaseStepEventPresentation['event'], caster };
}
