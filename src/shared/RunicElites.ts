import type {
  CombatEvent,
  EnemyModifierState,
  EntityState,
  RunicEliteDefeatedCombatEvent,
  RunicEliteFuryCombatEvent,
  RunicElitePhase,
} from './types';

export const RUNIC_ELITE_VERSION = 1 as const;
export const RUNIC_ELITE_EVENT_RADIUS = 3.4;
export const RUNIC_FURY_VISUAL_ATTACK_SPEED = 1.389;

export const RUNIC_ELITE_PALETTE = {
  aegis: '#63e6d2',
  aegisCore: '#d4fff7',
  fury: '#ff654f',
  furyCore: '#ffd08a',
  inactive: '#706b7a',
  minimap: '#f3c75f',
  minimapRing: '#6de8d4',
  minimapFuryRing: '#ff6a50',
} as const;

export const RUNIC_ELITE_MODIFIERS: readonly EnemyModifierState[] = [
  {
    id: 'runic_aegis',
    label: 'Runa da Égide',
    description: 'Acima de 50% de vida, reduz 28% do dano direto. Sangramento atravessa.',
    active: false,
  },
  {
    id: 'runic_fury',
    label: 'Runa da Fúria',
    description: 'Abaixo de 50% de vida, acelera movimento e ataques futuros.',
    active: false,
  },
] as const;

export interface RunicElitePresentation {
  entity: EntityState;
  phase: RunicElitePhase;
  modifiers: readonly EnemyModifierState[];
  activeModifier: EnemyModifierState;
  targetName: 'Elite Rúnico';
  targetSubtitle: string;
}

export type RunicEliteEventPresentation =
  | {
      type: 'fury';
      event: RunicEliteFuryCombatEvent;
      position: RunicEliteFuryCombatEvent['position'];
      radius: number;
      historical: boolean;
    }
  | {
      type: 'defeated';
      event: RunicEliteDefeatedCombatEvent;
      position: RunicEliteDefeatedCombatEvent['position'];
      radius: number;
      historical: boolean;
    };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && Number.isFinite(wire.x) && Number.isFinite(wire.y) && Number.isFinite(wire.z);
}

function exactModifier(value: unknown, index: number, phase: RunicElitePhase): value is EnemyModifierState {
  const wire = record(value);
  const expected = RUNIC_ELITE_MODIFIERS[index];
  if (!wire || !expected) return false;
  return wire.id === expected.id
    && wire.label === expected.label
    && wire.description === expected.description
    && wire.active === (phase === (index === 0 ? 'aegis' : 'fury'));
}

/** Gate fail-closed: nunca deriva fase, mitigação ou velocidade a partir do HP. */
export function runicElitePresentationGate(value: unknown): RunicElitePresentation | null {
  const wire = record(value);
  if (!wire || wire.kind !== 'enemy' || wire.enemyVariant !== 'zombie' || wire.eliteVersion !== RUNIC_ELITE_VERSION) return null;
  if (wire.bossPhase !== undefined) return null;
  if (wire.elitePhase !== 'aegis' && wire.elitePhase !== 'fury') return null;
  if (typeof wire.id !== 'string' || wire.id.length === 0 || typeof wire.alive !== 'boolean') return null;
  if (!Number.isFinite(wire.hp) || !Number.isFinite(wire.maxHp) || (wire.maxHp as number) <= 0) return null;
  if (wire.elitePhase === 'aegis' && wire.attackSpeed !== undefined) return null;
  if (wire.elitePhase === 'fury' && wire.attackSpeed !== RUNIC_FURY_VISUAL_ATTACK_SPEED) return null;
  if (!Array.isArray(wire.eliteModifiers) || wire.eliteModifiers.length !== RUNIC_ELITE_MODIFIERS.length) return null;
  const phase = wire.elitePhase;
  if (!wire.eliteModifiers.every((modifier, index) => exactModifier(modifier, index, phase))) return null;
  const entity = value as EntityState;
  const modifiers = entity.eliteModifiers!;
  const activeModifier = modifiers.find((modifier) => modifier.active);
  if (!activeModifier) return null;
  return {
    entity,
    phase,
    modifiers,
    activeModifier,
    targetName: 'Elite Rúnico',
    targetSubtitle: phase === 'aegis'
      ? 'Égide ativa • Sangramento atravessa'
      : 'Fúria ativa • Movimento e ataques acelerados',
  };
}

/** Eventos só alimentam apresentação; posição e raio vêm congelados do wire. */
export function runicEliteEventPresentationGate(
  value: CombatEvent | unknown,
  entities: readonly EntityState[],
): RunicEliteEventPresentation | null {
  const wire = record(value);
  if (!wire || typeof wire.id !== 'string' || wire.id.length === 0 || typeof wire.casterId !== 'string' || wire.casterId.length === 0) return null;
  if (!finitePosition(wire.position) || wire.radius !== RUNIC_ELITE_EVENT_RADIUS) return null;
  const identities = entities.filter((entity) => entity.id === wire.casterId);
  if (identities.length > 1) return null;
  const identity = identities[0];
  const elite = identity ? runicElitePresentationGate(identity) : null;

  const hasAny = (...keys: readonly string[]) => keys.some((key) => wire[key] !== undefined);

  if (wire.type === 'runic-elite-fury') {
    if (wire.skill !== 'runic-fury' || wire.modifierId !== 'runic_fury') return null;
    if (hasAny('targetId', 'amount', 'damageKind', 'critical', 'variant', 'sourceSkill', 'damageEffect',
      'duration', 'delay', 'innerRadius', 'rotationY', 'arcDegrees', 'encounterId', 'wave')) return null;
    if (identity && (!elite || elite.phase !== 'fury')) return null;
    return {
      type: 'fury',
      event: value as RunicEliteFuryCombatEvent,
      position: wire.position,
      radius: wire.radius,
      historical: !identity || !identity.alive,
    };
  }
  if (wire.type === 'runic-elite-defeated') {
    if (wire.skill !== 'runic-elite' || wire.modifierId !== undefined) return null;
    if (hasAny('amount', 'damageKind', 'critical', 'variant', 'sourceSkill', 'damageEffect',
      'duration', 'delay', 'innerRadius', 'rotationY', 'arcDegrees', 'encounterId', 'wave')) return null;
    if (wire.targetId !== undefined && (typeof wire.targetId !== 'string' || wire.targetId.length === 0)) return null;
    if (identity && (!elite || identity.alive)) return null;
    return {
      type: 'defeated',
      event: value as RunicEliteDefeatedCombatEvent,
      position: wire.position,
      radius: wire.radius,
      historical: !identity,
    };
  }
  return null;
}
