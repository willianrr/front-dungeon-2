import type {
  ActiveEvasionCombatEvent,
  EntityState,
  EvadeState,
} from './types';

export const ACTIVE_EVASION_MODIFIER_ID = 'targeted_evasion' as const;
export const ACTIVE_EVASION_COOLDOWN = 3 as const;
export const ACTIVE_EVASION_DURATION = 0.32 as const;
export const ACTIVE_EVASION_MAX_DISTANCE = 3.2;
export const ACTIVE_EVASION_MIN_DISTANCE = 0.6;
export const ACTIVE_EVASION_AVOID_RADIUS = 1.2 as const;

export const ACTIVE_EVASION_PALETTE = {
  trail: '#63e6ff',
  core: '#ecfdff',
  avoid: '#9bffcf',
  shadow: '#187c9c',
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

function exactEvadeState(value: unknown): value is EvadeState {
  const source = record(value);
  if (!source || source.cooldown !== ACTIVE_EVASION_COOLDOWN || source.duration !== ACTIVE_EVASION_DURATION
    || typeof source.cooldownRemaining !== 'number' || !Number.isFinite(source.cooldownRemaining)
    || source.cooldownRemaining < 0 || source.cooldownRemaining > ACTIVE_EVASION_COOLDOWN
    || typeof source.remaining !== 'number' || !Number.isFinite(source.remaining)
    || source.remaining < 0 || source.remaining > ACTIVE_EVASION_DURATION) return false;
  return Object.keys(source).every((key) => (
    key === 'cooldown' || key === 'cooldownRemaining' || key === 'duration' || key === 'remaining'
  ));
}

export interface ActiveEvasionStatePresentation {
  entity: EntityState;
  state: EvadeState;
  evading: boolean;
  ready: boolean;
  cooldownRatio: number;
}

/** Ausência ou wire malformado ocultam toda apresentação em clientes novos. */
export function activeEvasionStatePresentationGate(value: unknown): ActiveEvasionStatePresentation | null {
  const entity = record(value) as EntityState | null;
  if (!entity || entity.kind !== 'player' || typeof entity.alive !== 'boolean' || !exactEvadeState(entity.evade)) return null;
  if (entity.evading !== undefined && typeof entity.evading !== 'boolean') return null;
  const evading = entity.evading === true;
  if (!evading && entity.evade.remaining > 0) return null;
  return {
    entity,
    state: entity.evade,
    evading,
    ready: entity.alive && !evading && entity.evade.cooldownRemaining === 0,
    cooldownRatio: entity.evade.cooldownRemaining / ACTIVE_EVASION_COOLDOWN,
  };
}

export type ActiveEvasionEventPresentation =
  | { event: Extract<ActiveEvasionCombatEvent, { type: 'evade-start' }>; phase: 'start'; historical: boolean }
  | { event: Extract<ActiveEvasionCombatEvent, { type: 'evade-avoid' }>; phase: 'avoid'; historical: boolean };

export function activeEvasionEventPresentationGate(
  value: unknown,
  entities: readonly EntityState[],
): ActiveEvasionEventPresentation | null {
  const wire = record(value);
  if (!wire || (wire.type !== 'evade-start' && wire.type !== 'evade-avoid')
    || typeof wire.id !== 'string' || !wire.id || typeof wire.casterId !== 'string' || !wire.casterId
    || wire.skill !== 'evade' || wire.modifierId !== ACTIVE_EVASION_MODIFIER_ID
    || !finitePosition(wire.position) || wire.duration !== ACTIVE_EVASION_DURATION) return null;

  const start = wire.type === 'evade-start';
  if (wire.variant !== (start ? 'start' : 'avoid')) return null;
  if (start) {
    if (!finitePosition(wire.origin) || typeof wire.radius !== 'number' || !Number.isFinite(wire.radius)
      || wire.radius < ACTIVE_EVASION_MIN_DISTANCE || wire.radius > ACTIVE_EVASION_MAX_DISTANCE + 0.000001
      || wire.targetId !== undefined) return null;
  } else if (wire.radius !== ACTIVE_EVASION_AVOID_RADIUS || typeof wire.targetId !== 'string' || !wire.targetId
    || wire.origin !== undefined) return null;

  const forbidden = ['amount', 'damageKind', 'critical', 'sourceSkill', 'damageEffect', 'resourceId', 'encounterId',
    'wave', 'innerRadius', 'delay', 'rotationY', 'arcDegrees'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const casters = entities.filter((entity) => entity.id === wire.casterId);
  if (casters.length > 1 || (casters[0] && casters[0].kind !== 'player')) return null;
  if (start) {
    return {
      event: value as Extract<ActiveEvasionCombatEvent, { type: 'evade-start' }>,
      phase: 'start',
      historical: casters.length === 0,
    };
  }
  const targets = entities.filter((entity) => entity.id === wire.targetId);
  if (targets.length > 1 || (targets[0] && targets[0].kind !== 'enemy')) return null;
  return {
    event: value as Extract<ActiveEvasionCombatEvent, { type: 'evade-avoid' }>,
    phase: 'avoid',
    historical: casters.length === 0 || targets.length === 0,
  };
}
