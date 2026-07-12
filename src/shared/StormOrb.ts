import type {
  BuffState,
  CombatEvent,
  EntityState,
  SkillState,
  StormOrbDischargeCombatEvent,
} from './types';

export const STORM_ORB_ID = 'storm-orb' as const;
export const STORM_ORB_LABEL = 'Orbe da Tempestade' as const;
export const STORM_ORB_DESCRIPTION = 'Invoca um orbe de quatro cargas que ataca autonomamente inimigos visíveis próximos.' as const;
export const STORM_ORB_MANA_COST = 22;
export const STORM_ORB_COOLDOWN = 12;
export const STORM_ORB_DURATION = 8;
/** Teto anunciado: quatro cargas base + uma do conjunto Tempestade Utraeana. */
export const STORM_ORB_MAX_CHARGES = 5;
export const STORM_ORB_RANGE = 9;
export const STORM_ORB_CAST_RADIUS = 1.4;
export const STORM_ORB_DISCHARGE_RADIUS = 0.9;
export const STORM_ORB_DISCHARGE_MODIFIER_ID = 'storm_orb_autonomous' as const;

export const STORM_ORB_PALETTE = {
  shell: '#77d8ff',
  core: '#f0fdff',
  storm: '#9a8cff',
  bolt: '#d9f7ff',
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

export function stormOrbSkillPresentationGate(skillsWire: unknown): SkillState | null {
  if (!Array.isArray(skillsWire)) return null;
  const matches = skillsWire.filter((candidate) => record(candidate)?.id === STORM_ORB_ID);
  if (matches.length !== 1) return null;
  const skill = record(matches[0]);
  if (!skill || skill.label !== STORM_ORB_LABEL || skill.description !== STORM_ORB_DESCRIPTION
    || skill.discipline !== 'arcana' || skill.targetMode !== 'self' || skill.stationary !== true
    || skill.requiresPhysicalWeapon !== false || skill.masteryId !== 'arcana'
    || skill.manaCost !== STORM_ORB_MANA_COST || skill.cooldown !== STORM_ORB_COOLDOWN
    || skill.range !== STORM_ORB_RANGE || typeof skill.cooldownRemaining !== 'number'
    || !Number.isFinite(skill.cooldownRemaining) || skill.cooldownRemaining < 0
    || skill.cooldownRemaining > STORM_ORB_COOLDOWN || skill.pending === true) return null;
  return matches[0] as SkillState;
}

export interface StormOrbBuffPresentation {
  entity: EntityState;
  buff: BuffState;
}

export function stormOrbBuffPresentationGate(value: unknown): StormOrbBuffPresentation | null {
  const entity = record(value) as EntityState | null;
  if (!entity || entity.kind !== 'player' || entity.alive !== true || !Array.isArray(entity.buffs)) return null;
  const matches = entity.buffs.filter((buff) => buff?.id === STORM_ORB_ID);
  if (matches.length !== 1) return null;
  const buff = matches[0];
  if (buff.label !== STORM_ORB_LABEL || buff.duration !== STORM_ORB_DURATION
    || typeof buff.remaining !== 'number' || !Number.isFinite(buff.remaining) || buff.remaining < 0
    || buff.remaining > STORM_ORB_DURATION || !Number.isInteger(buff.charges)
    || (buff.charges ?? 0) < 1 || (buff.charges ?? 0) > STORM_ORB_MAX_CHARGES || buff.targetId !== undefined) return null;
  return { entity, buff };
}

export type StormOrbEventPresentation =
  | { phase: 'cast'; event: Extract<CombatEvent, { type: 'skill-effect' }>; historical: boolean }
  | { phase: 'discharge'; event: StormOrbDischargeCombatEvent; historical: boolean };

export function stormOrbEventPresentationGate(
  value: unknown,
  entities: readonly EntityState[],
): StormOrbEventPresentation | null {
  const wire = record(value);
  if (!wire || typeof wire.id !== 'string' || !wire.id || typeof wire.casterId !== 'string' || !wire.casterId
    || !finitePosition(wire.position)) return null;
  const casters = entities.filter((entity) => entity.id === wire.casterId);
  if (casters.length > 1 || (casters[0] && casters[0].kind !== 'player')) return null;

  if (wire.type === 'skill-effect') {
    if (wire.skill !== STORM_ORB_ID || wire.radius !== STORM_ORB_CAST_RADIUS || wire.duration !== STORM_ORB_DURATION
      || wire.targetId !== undefined || wire.sourceSkill !== undefined || wire.variant !== undefined || wire.origin !== undefined) return null;
    const forbidden = ['amount', 'damageKind', 'critical', 'modifierId', 'charges', 'damageEffect', 'resourceId',
      'encounterId', 'wave', 'innerRadius', 'delay', 'rotationY', 'arcDegrees'];
    if (forbidden.some((key) => wire[key] !== undefined)) return null;
    return {
      phase: 'cast',
      event: value as Extract<CombatEvent, { type: 'skill-effect' }>,
      historical: casters.length === 0,
    };
  }

  if (wire.type !== 'storm-orb-discharge' || wire.skill !== STORM_ORB_ID || wire.variant !== 'discharge'
    || wire.modifierId !== STORM_ORB_DISCHARGE_MODIFIER_ID || wire.radius !== STORM_ORB_DISCHARGE_RADIUS
    || typeof wire.targetId !== 'string' || !wire.targetId || !finitePosition(wire.origin)
    || !Number.isInteger(wire.charges) || (wire.charges as number) < 0 || (wire.charges as number) >= STORM_ORB_MAX_CHARGES) return null;
  const forbidden = ['amount', 'damageKind', 'critical', 'sourceSkill', 'damageEffect', 'resourceId',
    'encounterId', 'wave', 'innerRadius', 'delay', 'duration', 'rotationY', 'arcDegrees'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const targets = entities.filter((entity) => entity.id === wire.targetId);
  if (targets.length > 1 || (targets[0] && targets[0].kind !== 'enemy')) return null;
  return {
    phase: 'discharge',
    event: value as StormOrbDischargeCombatEvent,
    historical: casters.length === 0 || targets.length === 0,
  };
}
