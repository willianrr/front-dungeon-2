import type { BuffState, CombatEvent, DamageCombatEvent, EntityState, SkillState } from './types';

export const FERAL_FORM_ID = 'feral-form' as const;
export const FERAL_FORM_LABEL = 'Forma Feral' as const;
export const FERAL_FORM_DESCRIPTION = 'Assume uma forma bestial: +25% de movimento e cadência, +0,45 m de alcance e +15% de dano nos ataques básicos por 7 s.' as const;
export const FERAL_FORM_MANA_COST = 20;
export const FERAL_FORM_COOLDOWN = 20;
export const FERAL_FORM_DURATION = 7;
export const FERAL_FORM_CAST_RADIUS = 1.35;
export const FERAL_FORM_BLOCKED_REASON = 'Forma Feral permite apenas ataques básicos, Guarda de Ferro e Clamor do Baluarte.' as const;
export const FERAL_FORM_BLOCKED_SKILLS = [
  'arcane-nova', 'war-cry', 'charge', 'heavy-strike', 'steel-sweep', 'arcane-bolt', 'storm-orb', 'root-snare', 'chain-lightning', 'renewal-wave', 'phase-step', 'nature-spirit',
] as const;

export const FERAL_FORM_PALETTE = {
  hide: '#b7e27e',
  claw: '#f2d17a',
  shadow: '#31543a',
  eye: '#f6ffb0',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const source = record(value);
  return !!source && typeof source.x === 'number' && Number.isFinite(source.x)
    && typeof source.y === 'number' && Number.isFinite(source.y)
    && typeof source.z === 'number' && Number.isFinite(source.z);
}

export function feralFormSkillPresentationGate(skillsWire: unknown): SkillState | null {
  if (!Array.isArray(skillsWire)) return null;
  const matches = skillsWire.filter((candidate) => record(candidate)?.id === FERAL_FORM_ID);
  if (matches.length !== 1) return null;
  const skill = record(matches[0]);
  if (!skill || skill.label !== FERAL_FORM_LABEL || skill.description !== FERAL_FORM_DESCRIPTION
    || skill.discipline !== 'survival' || skill.targetMode !== 'self' || skill.stationary !== true
    || skill.requiresPhysicalWeapon !== false || skill.masteryId !== 'survival'
    || skill.manaCost !== FERAL_FORM_MANA_COST || skill.cooldown !== FERAL_FORM_COOLDOWN
    || typeof skill.cooldownRemaining !== 'number' || !Number.isFinite(skill.cooldownRemaining)
    || skill.cooldownRemaining < 0 || skill.cooldownRemaining > FERAL_FORM_COOLDOWN || skill.pending === true
    || skill.blocked === true || skill.blockedReason !== undefined) return null;
  return matches[0] as SkillState;
}

export interface FeralFormBuffPresentation {
  entity: EntityState;
  buff: BuffState;
}

export function feralFormBuffPresentationGate(value: unknown): FeralFormBuffPresentation | null {
  const entity = record(value) as EntityState | null;
  if (!entity || entity.kind !== 'player' || entity.alive !== true || !Array.isArray(entity.buffs)) return null;
  const matches = entity.buffs.filter((buff) => buff?.id === FERAL_FORM_ID);
  if (matches.length !== 1) return null;
  const buff = matches[0];
  if (buff.label !== FERAL_FORM_LABEL || buff.duration !== FERAL_FORM_DURATION
    || typeof buff.remaining !== 'number' || !Number.isFinite(buff.remaining) || buff.remaining <= 0
    || buff.remaining > FERAL_FORM_DURATION || buff.targetId !== undefined || buff.charges !== undefined) return null;
  return { entity, buff };
}

/** Confirma que o bloqueio temporário veio completo e apenas nas skills ofensivas. */
export function feralFormSkillLocksPresentationGate(skillsWire: unknown): readonly SkillState[] | null {
  if (!Array.isArray(skillsWire)) return null;
  const byId = new Map(skillsWire.map((candidate) => [record(candidate)?.id, record(candidate)]));
  for (const id of FERAL_FORM_BLOCKED_SKILLS) {
    const skill = byId.get(id);
    if (!skill || skill.blocked !== true || skill.blockedReason !== FERAL_FORM_BLOCKED_REASON) return null;
  }
  for (const id of ['iron-guard', 'bulwark-call', FERAL_FORM_ID]) {
    const skill = byId.get(id);
    if (!skill || skill.blocked === true || skill.blockedReason !== undefined) return null;
  }
  return skillsWire as SkillState[];
}

export type FeralFormEventPresentation =
  | { phase: 'cast'; event: Extract<CombatEvent, { type: 'skill-effect' }>; historical: boolean }
  | { phase: 'claw'; event: DamageCombatEvent; historical: boolean };

export function feralFormEventPresentationGate(
  value: unknown,
  entities: readonly EntityState[],
): FeralFormEventPresentation | null {
  const wire = record(value);
  if (!wire || typeof wire.id !== 'string' || !wire.id || !finitePosition(wire.position)
    || typeof wire.casterId !== 'string' || !wire.casterId) return null;
  const caster = entities.find((entity) => entity.id === wire.casterId);
  if (caster && caster.kind !== 'player') return null;
  if (wire.type === 'skill-effect') {
    if (wire.skill !== FERAL_FORM_ID || wire.radius !== FERAL_FORM_CAST_RADIUS || wire.duration !== FERAL_FORM_DURATION
      || wire.targetId !== undefined || wire.sourceSkill !== undefined || wire.variant !== undefined || wire.origin !== undefined) return null;
    const forbidden = ['amount', 'damageKind', 'critical', 'modifierId', 'charges', 'damageEffect', 'resourceId'];
    if (forbidden.some((key) => wire[key] !== undefined)) return null;
    return { phase: 'cast', event: value as Extract<CombatEvent, { type: 'skill-effect' }>, historical: !caster };
  }
  if (wire.type !== 'damage' || wire.sourceSkill !== FERAL_FORM_ID || wire.damageKind !== 'physical'
    || typeof wire.targetId !== 'string' || !wire.targetId || typeof wire.amount !== 'number'
    || !Number.isFinite(wire.amount) || wire.amount <= 0 || wire.variant !== undefined) return null;
  const target = entities.find((entity) => entity.id === wire.targetId);
  if (target && target.kind !== 'enemy') return null;
  return { phase: 'claw', event: value as DamageCombatEvent, historical: !caster || !target };
}
