import type { CombatEvent, EntityState } from './types';

export const BOSS_SEAL_VARIANT = 'zombieBoss' as const;
export const BOSS_SEAL_RUPTURE_SKILL = 'seal-rupture' as const;
export const BOSS_SEAL_PULSE_SKILL = 'seal-pulse' as const;
export const BOSS_SEAL_RADIUS = 8;
export const BOSS_SEAL_RUPTURE_DURATION = 1.4;
export const BOSS_SEAL_PULSE_INNER_RADIUS = 2.4;
export const BOSS_SEAL_PULSE_DELAY = 1.2;

export const BOSS_SEAL_PALETTE = {
  rupture: '#ef5d68',
  ruptureCore: '#ffd0aa',
  seal: '#b878ff',
  sealCore: '#f0ddff',
  danger: '#df4e62',
  safe: '#72e5d0',
  safeCore: '#d9fff7',
  minimapRing: '#f0b4ff',
} as const;

export type BossPhasePresentation =
  | { applies: false }
  | { applies: true; phase: 1 | 2; legacy: boolean };

interface BossSealEventBase {
  boss: EntityState | null;
  historical: boolean;
  position: Readonly<{ x: number; y: number; z: number }>;
  radius: number;
}

export type BossSealEventPresentation =
  | (BossSealEventBase & { type: 'rupture'; duration: number })
  | (BossSealEventBase & { type: 'pulse-warning'; innerRadius: number; delay: number })
  | (BossSealEventBase & { type: 'pulse-impact'; innerRadius: number });

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

function hasDefinedField(wire: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.some((field) => wire[field] !== undefined);
}

/**
 * Valida a extensao de fase sem contaminar entidades legadas. Ausencia equivale
 * a fase I somente para um Boss Zumbi; qualquer outra variante com phase fecha.
 */
export function bossPhasePresentationGate(entity: EntityState | unknown): BossPhasePresentation | null {
  if (!entity || typeof entity !== 'object') return null;
  const wire = entity as Record<string, unknown>;
  if (!nonEmptyId(wire.id) || typeof wire.alive !== 'boolean') return null;
  if (wire.kind !== 'player' && wire.kind !== 'enemy') return null;
  const isBoss = wire.kind === 'enemy' && wire.enemyVariant === BOSS_SEAL_VARIANT;
  if (!isBoss) {
    if (wire.enemyVariant === BOSS_SEAL_VARIANT) return null;
    if (wire.bossPhase !== undefined) return null;
    return { applies: false };
  }
  if (wire.bossPhase === undefined) return { applies: true, phase: 1, legacy: true };
  if (wire.bossPhase !== 1 && wire.bossPhase !== 2) return null;
  return { applies: true, phase: wire.bossPhase, legacy: false };
}

type BossIdentityResult =
  | { valid: false; boss: null; historical: false }
  | { valid: true; boss: EntityState | null; historical: boolean };

function optionalBossIdentity(entities: readonly EntityState[], casterId: string): BossIdentityResult {
  let identity: EntityState | null = null;
  for (const entity of entities) {
    if (entity.id !== casterId) continue;
    if (identity) return { valid: false, boss: null, historical: false };
    identity = entity;
  }
  // O snapshot pode remover o boss antes de o cliente consumir o evento. Nesse
  // caso o wire congelado continua sendo a unica fonte segura de geometria.
  if (!identity) return { valid: true, boss: null, historical: true };
  if (typeof identity.alive !== 'boolean') return { valid: false, boss: null, historical: false };
  const phase = bossPhasePresentationGate(identity);
  if (!phase?.applies) return { valid: false, boss: null, historical: false };
  if (phase.phase !== 2) return { valid: false, boss: null, historical: false };
  return { valid: true, boss: identity, historical: !identity.alive };
}

/** Gate fail-closed; nunca usa posicao atual do boss nem procura alvos. */
export function bossSealEventPresentationGate(
  event: CombatEvent | unknown,
  entities: readonly EntityState[],
): BossSealEventPresentation | null {
  if (!event || typeof event !== 'object') return null;
  const wire = event as Record<string, unknown>;
  if (!nonEmptyId(wire.id) || !nonEmptyId(wire.casterId) || !finitePosition(wire.position)) return null;
  const identity = optionalBossIdentity(entities, wire.casterId);
  if (!identity.valid) return null;

  const commonIncompatible = [
    'targetId',
    'amount',
    'damageKind',
    'critical',
    'variant',
    'sourceSkill',
    'damageEffect',
    'rotationY',
    'arcDegrees',
    'encounterId',
    'wave',
  ] as const;
  if (hasDefinedField(wire, commonIncompatible)) return null;

  if (wire.type === 'boss-seal-rupture') {
    if (wire.skill !== BOSS_SEAL_RUPTURE_SKILL) return null;
    if (!exactFinite(wire.radius, BOSS_SEAL_RADIUS) || !exactFinite(wire.duration, BOSS_SEAL_RUPTURE_DURATION)) return null;
    if (wire.innerRadius !== undefined || wire.delay !== undefined) return null;
    return {
      type: 'rupture',
      boss: identity.boss,
      historical: identity.historical,
      position: wire.position,
      radius: wire.radius,
      duration: wire.duration,
    };
  }

  if (wire.type === 'boss-seal-pulse-warning' || wire.type === 'boss-seal-pulse-impact') {
    if (wire.skill !== BOSS_SEAL_PULSE_SKILL) return null;
    if (!exactFinite(wire.innerRadius, BOSS_SEAL_PULSE_INNER_RADIUS) || !exactFinite(wire.radius, BOSS_SEAL_RADIUS)) return null;
    if (wire.duration !== undefined) return null;
    if (wire.type === 'boss-seal-pulse-warning') {
      if (!exactFinite(wire.delay, BOSS_SEAL_PULSE_DELAY)) return null;
      return {
        type: 'pulse-warning',
        boss: identity.boss,
        historical: identity.historical,
        position: wire.position,
        innerRadius: wire.innerRadius,
        radius: wire.radius,
        delay: wire.delay,
      };
    }
    if (wire.delay !== undefined) return null;
    return {
      type: 'pulse-impact',
      boss: identity.boss,
      historical: identity.historical,
      position: wire.position,
      innerRadius: wire.innerRadius,
      radius: wire.radius,
    };
  }

  return null;
}
