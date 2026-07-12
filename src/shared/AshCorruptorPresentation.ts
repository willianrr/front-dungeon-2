import type {
  AshVeilInterruptSkill,
  CombatEvent,
  EntityState,
  StatusState,
} from './types';

export const ASH_CORRUPTOR_VARIANT = 'zombieAshCorruptor' as const;
export const ASH_VEIL_SKILL = 'ash-veil' as const;
export const ASH_VEIL_RADIUS = 10;
export const ASH_VEIL_DELAY = 1.15;
export const ASH_VEIL_DURATION = 5;

export const ASH_VEIL_INTERRUPT_SKILLS: ReadonlySet<AshVeilInterruptSkill> = new Set([
  'heavy-strike',
  'charge',
  'steel-sweep',
  'arcane-nova',
  'arcane-bolt',
]);

export type AshSupportPresentationEvent =
  | {
      type: 'warning';
      caster: EntityState;
      target: EntityState;
      radius: number;
      delay: number;
    }
  | {
      type: 'apply';
      caster: EntityState;
      target: EntityState;
      duration: number;
    }
  | {
      type: 'interrupted';
      caster: EntityState;
      interrupter: EntityState;
      sourceSkill: AshVeilInterruptSkill;
    };

export interface AshVeilStatusPresentation {
  status: StatusState;
  source: EntityState;
}

function finitePositive(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maximum;
}

function exactFinite(value: unknown, expected: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value === expected;
}

function nonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function entityById(entities: readonly EntityState[], id: unknown): EntityState | null {
  if (!nonEmptyId(id)) return null;
  return entities.find((entity) => entity.id === id) ?? null;
}

function exactAshCorruptor(entities: readonly EntityState[], id: unknown): EntityState | null {
  const caster = entityById(entities, id);
  if (!caster || caster.kind !== 'enemy' || caster.enemyVariant !== ASH_CORRUPTOR_VARIANT) return null;
  return caster;
}

function supportTarget(entities: readonly EntityState[], id: unknown, casterId: string): EntityState | null {
  const target = entityById(entities, id);
  if (!target || target.id === casterId || target.kind !== 'enemy' || !target.alive) return null;
  if (
    target.enemyVariant !== 'zombie'
    && target.enemyVariant !== 'zombieShardcaster'
    && target.enemyVariant !== 'zombieRuinBrute'
  ) return null;
  return target;
}

/**
 * Fail-closed gate para os tres eventos de suporte. Ele apenas correlaciona o
 * wire com entidades presentes; nunca escolhe alvos, calcula alcance ou simula
 * o canal do Corruptor no cliente.
 */
export function ashSupportEventPresentationGate(
  event: CombatEvent | unknown,
  entities: readonly EntityState[],
): AshSupportPresentationEvent | null {
  if (!event || typeof event !== 'object') return null;
  const wire = event as Record<string, unknown>;
  if (!nonEmptyId(wire.id) || wire.skill !== ASH_VEIL_SKILL) return null;
  const caster = exactAshCorruptor(entities, wire.casterId);
  if (!caster) return null;

  if (wire.type === 'enemy-support-warning') {
    const target = supportTarget(entities, wire.targetId, caster.id);
    if (!caster.alive || !target || !exactFinite(wire.radius, ASH_VEIL_RADIUS) || !exactFinite(wire.delay, ASH_VEIL_DELAY)) return null;
    if (wire.sourceSkill !== undefined || wire.duration !== undefined) return null;
    return { type: 'warning', caster, target, radius: wire.radius, delay: wire.delay };
  }

  if (wire.type === 'enemy-support-apply') {
    const target = supportTarget(entities, wire.targetId, caster.id);
    if (!caster.alive || !target || !exactFinite(wire.duration, ASH_VEIL_DURATION)) return null;
    if (wire.sourceSkill !== undefined || wire.radius !== undefined || wire.delay !== undefined) return null;
    return { type: 'apply', caster, target, duration: wire.duration };
  }

  if (wire.type === 'enemy-support-interrupted') {
    const interrupter = entityById(entities, wire.targetId);
    if (!interrupter || interrupter.kind !== 'player') return null;
    if (!ASH_VEIL_INTERRUPT_SKILLS.has(wire.sourceSkill as AshVeilInterruptSkill)) return null;
    if (wire.radius !== undefined || wire.delay !== undefined || wire.duration !== undefined) return null;
    return {
      type: 'interrupted',
      caster,
      interrupter,
      sourceSkill: wire.sourceSkill as AshVeilInterruptSkill,
    };
  }

  return null;
}

/** Aceita o overlay somente quando todo o encadeamento autoritativo esta vivo e coerente. */
export function ashVeilStatusPresentationGate(
  target: EntityState,
  entities: readonly EntityState[],
): AshVeilStatusPresentation | null {
  if (target.kind !== 'enemy' || !target.alive || !Array.isArray(target.statuses)) return null;
  if (
    target.enemyVariant !== 'zombie'
    && target.enemyVariant !== 'zombieShardcaster'
    && target.enemyVariant !== 'zombieRuinBrute'
  ) return null;
  const matches = target.statuses.filter((status) => status?.id === ASH_VEIL_SKILL);
  if (matches.length !== 1) return null;
  const status = matches[0];
  if (status.sourceSkill !== ASH_VEIL_SKILL) return null;
  if (!exactFinite(status.duration, ASH_VEIL_DURATION) || !finitePositive(status.remaining, ASH_VEIL_DURATION)) return null;
  const source = exactAshCorruptor(entities, status.sourceId);
  if (!source || !source.alive || source.id === target.id) return null;
  return { status, source };
}
