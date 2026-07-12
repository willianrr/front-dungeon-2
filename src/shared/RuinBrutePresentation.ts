import type { CombatEvent, EntityState, StatusState } from './types';

export const RUIN_BRUTE_VARIANT = 'zombieRuinBrute' as const;
export const RUIN_CLEAVE_SKILL = 'ruin-cleave' as const;
export const RUIN_EXPOSED_STATUS = 'ruin-exposed' as const;
export const RUIN_CLEAVE_RADIUS = 5.4;
export const RUIN_CLEAVE_ARC_DEGREES = 80;
export const RUIN_CLEAVE_WARNING_DELAY = 1.05;
export const RUIN_EXPOSED_DURATION = 3;

interface RuinCleavePresentationBase {
  brute: EntityState;
  position: Readonly<{ x: number; y: number; z: number }>;
  rotationY: number;
  radius: number;
  arcDegrees: number;
}

export type RuinBrutePresentationEvent =
  | (RuinCleavePresentationBase & { type: 'warning'; delay: number })
  | (RuinCleavePresentationBase & { type: 'impact' })
  | {
      type: 'exposed';
      brute: EntityState;
      guarder: EntityState;
      position: Readonly<{ x: number; y: number; z: number }>;
      duration: number;
    };

export interface RuinExposedStatusPresentation {
  status: StatusState;
  source: EntityState | null;
}

function nonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function exactFinite(value: unknown, expected: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value === expected;
}

function finitePosition(value: unknown): value is Readonly<{ x: number; y: number; z: number }> {
  if (!value || typeof value !== 'object') return false;
  const position = value as Record<string, unknown>;
  return typeof position.x === 'number'
    && Number.isFinite(position.x)
    && typeof position.y === 'number'
    && Number.isFinite(position.y)
    && typeof position.z === 'number'
    && Number.isFinite(position.z);
}

function normalizedRotationY(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= -Math.PI
    && value <= Math.PI;
}

function hasDefinedField(wire: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.some((field) => wire[field] !== undefined);
}

function entityById(entities: readonly EntityState[], id: unknown): EntityState | null {
  if (!nonEmptyId(id)) return null;
  let match: EntityState | null = null;
  for (const entity of entities) {
    if (entity.id !== id) continue;
    if (match) return null;
    match = entity;
  }
  return match;
}

function exactBrute(entities: readonly EntityState[], id: unknown): EntityState | null {
  const brute = entityById(entities, id);
  if (!brute || brute.kind !== 'enemy' || brute.enemyVariant !== RUIN_BRUTE_VARIANT) return null;
  return brute;
}

function exactPlayer(entities: readonly EntityState[], id: unknown): EntityState | null {
  const player = entityById(entities, id);
  return player?.kind === 'player' && player.enemyVariant === undefined ? player : null;
}

/**
 * Gate fail-closed do wire do Bruto. O cliente valida e apresenta somente;
 * nunca descobre alvos nem recalcula cone, defesa, dano ou exposicao.
 */
export function ruinBruteEventPresentationGate(
  event: CombatEvent | unknown,
  entities: readonly EntityState[],
): RuinBrutePresentationEvent | null {
  if (!event || typeof event !== 'object') return null;
  const wire = event as Record<string, unknown>;
  if (!nonEmptyId(wire.id) || !nonEmptyId(wire.casterId)) return null;

  if (wire.type === 'enemy-brute-warning' || wire.type === 'enemy-brute-impact') {
    const brute = exactBrute(entities, wire.casterId);
    if (!brute || wire.skill !== RUIN_CLEAVE_SKILL) return null;
    if (!finitePosition(wire.position) || !normalizedRotationY(wire.rotationY)) return null;
    if (!exactFinite(wire.radius, RUIN_CLEAVE_RADIUS) || !exactFinite(wire.arcDegrees, RUIN_CLEAVE_ARC_DEGREES)) return null;
    if (hasDefinedField(wire, [
      'targetId',
      'amount',
      'damageKind',
      'critical',
      'variant',
      'sourceSkill',
      'damageEffect',
      'duration',
    ])) return null;
    if (wire.type === 'enemy-brute-warning') {
      if (!exactFinite(wire.delay, RUIN_CLEAVE_WARNING_DELAY)) return null;
      return {
        type: 'warning',
        brute,
        position: wire.position,
        rotationY: wire.rotationY,
        radius: wire.radius,
        arcDegrees: wire.arcDegrees,
        delay: wire.delay,
      };
    }
    if (wire.delay !== undefined) return null;
    return {
      type: 'impact',
      brute,
      position: wire.position,
      rotationY: wire.rotationY,
      radius: wire.radius,
      arcDegrees: wire.arcDegrees,
    };
  }

  if (wire.type === 'enemy-brute-exposed') {
    const guarder = exactPlayer(entities, wire.casterId);
    const brute = exactBrute(entities, wire.targetId);
    if (!guarder || !brute || wire.skill !== RUIN_EXPOSED_STATUS || wire.sourceSkill !== 'iron-guard') return null;
    if (!finitePosition(wire.position) || !exactFinite(wire.duration, RUIN_EXPOSED_DURATION)) return null;
    if (hasDefinedField(wire, [
      'amount',
      'damageKind',
      'critical',
      'variant',
      'damageEffect',
      'rotationY',
      'radius',
      'arcDegrees',
      'delay',
    ])) return null;
    return { type: 'exposed', brute, guarder, position: wire.position, duration: wire.duration };
  }

  return null;
}

/** Gate do overlay persistente; sourceId vazio e canonico quando a fonte ja saiu. */
export function ruinExposedStatusPresentationGate(
  target: EntityState,
  entities: readonly EntityState[],
): RuinExposedStatusPresentation | null {
  if (
    target.kind !== 'enemy'
    || target.enemyVariant !== RUIN_BRUTE_VARIANT
    || !target.alive
    || !Array.isArray(target.statuses)
  ) return null;
  const matches = target.statuses.filter((status) => status?.id === RUIN_EXPOSED_STATUS);
  if (matches.length !== 1) return null;
  const status = matches[0];
  if (
    status.sourceSkill !== 'iron-guard'
    || status.variant !== undefined
    || !exactFinite(status.duration, RUIN_EXPOSED_DURATION)
    || typeof status.remaining !== 'number'
    || !Number.isFinite(status.remaining)
    || status.remaining <= 0
    || status.remaining > RUIN_EXPOSED_DURATION
  ) return null;

  let source: EntityState | null = null;
  if (status.sourceId !== undefined && status.sourceId !== '') {
    if (!nonEmptyId(status.sourceId)) return null;
    source = exactPlayer(entities, status.sourceId);
    if (!source) return null;
  }
  return { status, source };
}
