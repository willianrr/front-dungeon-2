import type { CombatEvent, EncounterPhase, EncounterState, WorldZone } from './types';

export const SEAL_CHAMBER_VERSION = 1 as const;
export const SEAL_CHAMBER_ID = 'seal-chamber' as const;
export const SEAL_CHAMBER_CENTER = Object.freeze({ x: 0, y: 0, z: 3 });
export const SEAL_CHAMBER_TRIGGER_RADIUS = 8.5;
export const SEAL_CHAMBER_BARRIER_RADIUS = 8;
export const SEAL_CHAMBER_TOTAL_WAVES = 3 as const;
export const SEAL_CHAMBER_ARMING_DURATION = 2;
export const SEAL_CHAMBER_INTERMISSION_DURATION = 1.5;
export const SEAL_CHAMBER_COMPLETE_DURATION = 3;
export const SEAL_CHAMBER_MAX_COOLDOWN = 10;

const PHASES: ReadonlySet<EncounterPhase> = new Set([
  'idle',
  'arming',
  'wave',
  'intermission',
  'complete',
  'cooldown',
]);

export type SealChamberPresentationEvent =
  | { type: 'arming'; position: EncounterState['center']; radius: number; delay: number }
  | { type: 'wave'; position: EncounterState['center']; radius: number; wave: number }
  | { type: 'complete'; position: EncounterState['center']; radius: number }
  | { type: 'reset'; position: EncounterState['center']; radius: number };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactFinite(value: unknown, expected: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value === expected;
}

function finiteRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

function exactInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function exactCenter(value: unknown): value is EncounterState['center'] {
  const center = record(value);
  return center !== null
    && exactFinite(center.x, SEAL_CHAMBER_CENTER.x)
    && exactFinite(center.y, SEAL_CHAMBER_CENTER.y)
    && exactFinite(center.z, SEAL_CHAMBER_CENTER.z);
}

function nonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function boolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function noneDefined(wire: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => wire[field] === undefined);
}

function phaseCombinationValid(wire: Record<string, unknown>, phase: EncounterPhase): boolean {
  const wave = wire.wave as number;
  const remaining = wire.remaining as number;
  const timer = wire.timer as number;
  const barrierActive = wire.barrierActive as boolean;

  if (phase === 'idle') return wave === 0 && remaining === 0 && timer === 0 && !barrierActive;
  if (phase === 'arming') {
    return wave === 0 && remaining === 0 && timer <= SEAL_CHAMBER_ARMING_DURATION && !barrierActive;
  }
  if (phase === 'wave') return wave >= 1 && wave <= 3 && remaining >= 0 && remaining <= 3 && barrierActive;
  if (phase === 'intermission') {
    return wave >= 1 && wave < 3
      && remaining === 0
      && timer <= SEAL_CHAMBER_INTERMISSION_DURATION
      && barrierActive;
  }
  if (phase === 'complete') {
    return wave === 3 && remaining === 0 && timer <= SEAL_CHAMBER_COMPLETE_DURATION && !barrierActive;
  }
  return wave >= 0 && wave <= 3 && remaining === 0 && timer <= SEAL_CHAMBER_MAX_COOLDOWN && !barrierActive;
}

/**
 * Gate fail-closed compartilhado por mundo, HUD e minimapa. Ele valida apenas
 * apresentacao; nunca calcula trigger, ondas, confinamento ou recompensa.
 */
export function sealChamberStatePresentationGate(
  value: unknown,
  zone: WorldZone,
): EncounterState | null {
  if (zone !== 'dungeon') return null;
  const wire = record(value);
  if (!wire) return null;
  if (wire.version !== SEAL_CHAMBER_VERSION || wire.id !== SEAL_CHAMBER_ID) return null;
  if (typeof wire.phase !== 'string' || !PHASES.has(wire.phase as EncounterPhase)) return null;
  if (!exactInteger(wire.wave, 0, 3) || !exactFinite(wire.totalWaves, SEAL_CHAMBER_TOTAL_WAVES)) return null;
  if (!exactInteger(wire.remaining, 0, 3) || !finiteRange(wire.timer, 0, SEAL_CHAMBER_MAX_COOLDOWN)) return null;
  if (!exactCenter(wire.center)) return null;
  if (!exactFinite(wire.triggerRadius, SEAL_CHAMBER_TRIGGER_RADIUS)) return null;
  if (!exactFinite(wire.barrierRadius, SEAL_CHAMBER_BARRIER_RADIUS)) return null;
  if (!boolean(wire.barrierActive) || !boolean(wire.participant) || !boolean(wire.rewardEligible) || !boolean(wire.completed)) return null;
  if (wire.rewardEligible && !wire.participant) return null;
  if (!phaseCombinationValid(wire, wire.phase as EncounterPhase)) return null;
  return wire as unknown as EncounterState;
}

/** Eventos historicos independem da presenca de entidades; o wire e a fonte. */
export function sealChamberEventPresentationGate(
  value: CombatEvent | unknown,
): SealChamberPresentationEvent | null {
  const wire = record(value);
  if (!wire || !nonEmptyId(wire.id) || wire.encounterId !== SEAL_CHAMBER_ID) return null;
  if (!exactCenter(wire.position) || !exactFinite(wire.radius, SEAL_CHAMBER_BARRIER_RADIUS)) return null;
  if (!noneDefined(wire, [
    'casterId',
    'targetId',
    'skill',
    'sourceSkill',
    'amount',
    'damageKind',
    'critical',
    'duration',
    'rotationY',
    'arcDegrees',
  ])) return null;

  if (wire.type === 'encounter-seal-arming') {
    if (!exactFinite(wire.delay, SEAL_CHAMBER_ARMING_DURATION) || wire.wave !== undefined) return null;
    return { type: 'arming', position: wire.position, radius: wire.radius, delay: wire.delay };
  }
  if (wire.type === 'encounter-seal-wave') {
    if (!exactInteger(wire.wave, 1, 3) || wire.delay !== undefined) return null;
    return { type: 'wave', position: wire.position, radius: wire.radius, wave: wire.wave };
  }
  if (wire.type === 'encounter-seal-complete' || wire.type === 'encounter-seal-reset') {
    if (wire.wave !== undefined || wire.delay !== undefined) return null;
    return {
      type: wire.type === 'encounter-seal-complete' ? 'complete' : 'reset',
      position: wire.position,
      radius: wire.radius,
    };
  }
  return null;
}
