import type {
  ArcaneResonanceRuptureCombatEvent,
  CombatEvent,
  EntityState,
  MasteryProgressState,
  SkillId,
  SkillModifierState,
  SkillState,
  StatusState,
} from './types';

export const ARCANE_RESONANCE_MODIFIER_ID = 'arcane_resonance' as const;
export const ARCANE_RESONANCE_STATUS_ID = 'arcane-resonance' as const;
export const ARCANE_RESONANCE_REQUIRED_MASTERY_LEVEL = 5;
export const ARCANE_RESONANCE_DURATION = 4.5;
export const ARCANE_RESONANCE_RUPTURE_RADIUS = 2.8;
export const ARCANE_RESONANCE_MANA_REFUND = 6;

export const ARCANE_RESONANCE_PALETTE = {
  mark: '#a66cff',
  core: '#e9d7ff',
  rupture: '#67e8ff',
  mana: '#78a8ff',
} as const;

const MODIFIERS: Readonly<Record<'arcane-bolt' | 'arcane-nova', SkillModifierState>> = {
  'arcane-bolt': {
    id: ARCANE_RESONANCE_MODIFIER_ID,
    label: 'Ressonância Arcana',
    description: 'Maestria Arcana 5: impacto efetivo aplica uma Marca de Ressonância por 4,5 s.',
  },
  'arcane-nova': {
    id: ARCANE_RESONANCE_MODIFIER_ID,
    label: 'Ruptura Arcana',
    description: 'Consome sua Marca: +30% no alvo, pulso de 45% em até 3 adjacentes e +6 de mana.',
  },
};

export interface ArcaneResonanceSkillPresentation {
  bolt: SkillState;
  nova: SkillState;
  modifiers: Readonly<typeof MODIFIERS>;
}

export interface ArcaneResonanceStatusPresentation {
  target: EntityState;
  status: StatusState;
  sourceId?: string;
  orphaned: boolean;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const source = record(value);
  return !!source && typeof source.x === 'number' && Number.isFinite(source.x)
    && typeof source.y === 'number' && Number.isFinite(source.y)
    && typeof source.z === 'number' && Number.isFinite(source.z);
}

function exactModifier(value: unknown, skill: keyof typeof MODIFIERS): value is SkillModifierState {
  const source = record(value);
  const expected = MODIFIERS[skill];
  return !!source && source.id === expected.id && source.label === expected.label
    && source.description === expected.description && Object.keys(source).every((key) => (
      key === 'id' || key === 'label' || key === 'description'
    ));
}

/** Exige Maestria 5 e os dois lados completos do combo; wire parcial falha fechado. */
export function arcaneResonanceSkillPresentationGate(
  skillsWire: unknown,
  masteriesWire: unknown,
): ArcaneResonanceSkillPresentation | null {
  if (!Array.isArray(skillsWire) || !Array.isArray(masteriesWire)) return null;
  const arcana = masteriesWire.filter((candidate) => record(candidate)?.id === 'arcana');
  if (arcana.length !== 1) return null;
  const mastery = arcana[0] as MasteryProgressState;
  if (!Number.isInteger(mastery.level) || mastery.level < ARCANE_RESONANCE_REQUIRED_MASTERY_LEVEL) return null;

  const skillFor = (id: SkillId): SkillState | null => {
    const matches = skillsWire.filter((candidate) => record(candidate)?.id === id);
    return matches.length === 1 ? matches[0] as SkillState : null;
  };
  const bolt = skillFor('arcane-bolt');
  const nova = skillFor('arcane-nova');
  if (!bolt || !nova || !Array.isArray(bolt.modifiers) || !Array.isArray(nova.modifiers)) return null;
  const boltModifiers = bolt.modifiers.filter((modifier) => modifier?.id === ARCANE_RESONANCE_MODIFIER_ID);
  const novaModifiers = nova.modifiers.filter((modifier) => modifier?.id === ARCANE_RESONANCE_MODIFIER_ID);
  if (boltModifiers.length !== 1 || novaModifiers.length !== 1
    || !exactModifier(boltModifiers[0], 'arcane-bolt') || !exactModifier(novaModifiers[0], 'arcane-nova')) return null;
  return { bolt, nova, modifiers: MODIFIERS };
}

/** Valida a marca persistente diretamente no StatusState autoritativo. */
export function arcaneResonanceStatusPresentationGate(
  targetWire: unknown,
  entities: readonly EntityState[],
): ArcaneResonanceStatusPresentation | null {
  const target = record(targetWire) as EntityState | null;
  if (!target || target.kind !== 'enemy' || target.alive !== true || !Array.isArray(target.statuses)) return null;
  const matches = target.statuses.filter((status) => status?.id === ARCANE_RESONANCE_STATUS_ID);
  if (matches.length !== 1) return null;
  const status = matches[0];
  if (status.duration !== ARCANE_RESONANCE_DURATION || typeof status.remaining !== 'number'
    || !Number.isFinite(status.remaining) || status.remaining <= 0 || status.remaining > ARCANE_RESONANCE_DURATION
    || status.sourceSkill !== 'arcane-bolt' || status.variant !== undefined) return null;
  const sourceId = typeof status.sourceId === 'string' && status.sourceId ? status.sourceId : undefined;
  if (status.sourceId !== undefined && sourceId === undefined) return null;
  const sources = sourceId ? entities.filter((entity) => entity.id === sourceId) : [];
  if (sources.length > 1 || (sources[0] && (sources[0].kind !== 'player' || !sources[0].alive))) return null;
  return { target, status, ...(sourceId ? { sourceId } : {}), orphaned: sourceId === undefined };
}

export function arcaneResonanceEventPresentationGate(
  value: CombatEvent | unknown,
  entities: readonly EntityState[],
): { event: ArcaneResonanceRuptureCombatEvent; historical: boolean } | null {
  const wire = record(value);
  if (!wire || wire.type !== 'arcane-resonance-rupture' || typeof wire.id !== 'string' || !wire.id
    || typeof wire.casterId !== 'string' || !wire.casterId || typeof wire.targetId !== 'string' || !wire.targetId
    || wire.amount !== ARCANE_RESONANCE_MANA_REFUND || wire.skill !== 'arcane-resonance'
    || wire.variant !== 'rupture' || wire.sourceSkill !== 'arcane-nova'
    || wire.modifierId !== ARCANE_RESONANCE_MODIFIER_ID || wire.radius !== ARCANE_RESONANCE_RUPTURE_RADIUS
    || !finitePosition(wire.position)) return null;
  const forbidden = ['damageKind', 'critical', 'damageEffect', 'resourceId', 'encounterId', 'wave',
    'innerRadius', 'delay', 'duration', 'rotationY', 'arcDegrees'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const casters = entities.filter((entity) => entity.id === wire.casterId);
  const targets = entities.filter((entity) => entity.id === wire.targetId);
  if (casters.length > 1 || targets.length > 1 || (casters[0] && casters[0].kind !== 'player')
    || (targets[0] && targets[0].kind !== 'enemy')) return null;
  return {
    event: value as ArcaneResonanceRuptureCombatEvent,
    historical: casters.length === 0 || targets.length === 0,
  };
}

