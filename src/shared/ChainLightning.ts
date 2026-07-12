import { catalogSkill, type NormalizedSkillState } from './SkillCatalog';
import type { CombatEvent, EntityState, SkillEffectCombatEvent } from './types';

export const CHAIN_LIGHTNING_ID = 'chain-lightning' as const;
export const CHAIN_LIGHTNING_IMPACT_ID = 'chain-lightning-impact' as const;
export const CHAIN_LIGHTNING_MANA_COST = 28 as const;
export const CHAIN_LIGHTNING_COOLDOWN = 7.5 as const;
export const CHAIN_LIGHTNING_RANGE = 11 as const;
export const CHAIN_LIGHTNING_BOUNCE_RADIUS = 6 as const;
export const CHAIN_LIGHTNING_MAX_TARGETS = 4 as const;
export const CHAIN_LIGHTNING_FALLOFF = 0.78 as const;
export const CHAIN_LIGHTNING_BEAM_RADIUS = 0.22 as const;
export const CHAIN_LIGHTNING_BEAM_DURATION = 0.18 as const;

export const CHAIN_LIGHTNING_PALETTE = {
  core: '#f4ffff',
  bolt: '#72e7ff',
  branch: '#8e8cff',
  impact: '#d7fbff',
} as const;

function position(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  return ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export function chainLightningSkillPresentationGate(skills: unknown): NormalizedSkillState | null {
  const skill = catalogSkill(skills, CHAIN_LIGHTNING_ID);
  if (!skill || skill.id !== CHAIN_LIGHTNING_ID || skill.label !== 'Relâmpago Encadeado'
    || skill.discipline !== 'arcana' || skill.targetMode !== 'enemy' || !skill.stationary
    || skill.requiresPhysicalWeapon || skill.masteryId !== 'arcana'
    || skill.manaCost !== CHAIN_LIGHTNING_MANA_COST || skill.cooldown !== CHAIN_LIGHTNING_COOLDOWN
    || skill.range !== CHAIN_LIGHTNING_RANGE || !skill.description?.includes('quatro inimigos')) return null;
  return skill;
}

export interface ChainLightningEventPresentation {
  event: SkillEffectCombatEvent & {
    skill: typeof CHAIN_LIGHTNING_IMPACT_ID;
    targetId: string;
    origin: { x: number; y: number; z: number };
    charges: 1 | 2 | 3 | 4;
  };
  caster: EntityState;
  target: EntityState;
  hop: 1 | 2 | 3 | 4;
}

export function chainLightningEventPresentationGate(
  value: CombatEvent,
  entities: readonly EntityState[],
): ChainLightningEventPresentation | null {
  if (value.type !== 'skill-effect' || value.skill !== CHAIN_LIGHTNING_IMPACT_ID
    || !value.targetId || !position(value.origin)
    || value.radius !== CHAIN_LIGHTNING_BEAM_RADIUS || value.duration !== CHAIN_LIGHTNING_BEAM_DURATION
    || !Number.isInteger(value.charges) || (value.charges ?? 0) < 1 || (value.charges ?? 0) > CHAIN_LIGHTNING_MAX_TARGETS) return null;
  const caster = entities.find((entity) => entity.id === value.casterId);
  const target = entities.find((entity) => entity.id === value.targetId);
  if (!caster || caster.kind !== 'player' || !target || target.kind !== 'enemy') return null;
  const distance = Math.hypot(value.position.x - value.origin.x, value.position.z - value.origin.z);
  const charges = value.charges as 1 | 2 | 3 | 4;
  // O alcance autoritativo inclui o excesso de raio de inimigos grandes (boss 3x).
  if (distance > (charges === 4 ? CHAIN_LIGHTNING_RANGE + 1.1 : CHAIN_LIGHTNING_BOUNCE_RADIUS + 1.1)) return null;
  return {
    event: value as ChainLightningEventPresentation['event'], caster, target,
    hop: (CHAIN_LIGHTNING_MAX_TARGETS - charges + 1) as 1 | 2 | 3 | 4,
  };
}
