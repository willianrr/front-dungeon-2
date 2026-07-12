import type {
  BuffState,
  CombatEvent,
  EntityState,
  GuardianRetaliationCombatEvent,
  MasteryProgressState,
  SkillModifierState,
  SkillState,
} from './types';

export const GUARDIAN_RETALIATION_MODIFIER_ID = 'guardian_retaliation' as const;
export const GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID = 'guardian_retaliation_release' as const;
export const GUARDIAN_RETALIATION_BUFF_ID = 'guardian-retaliation' as const;
export const GUARDIAN_RETALIATION_REQUIRED_MASTERY_LEVEL = 5;
export const GUARDIAN_RETALIATION_DURATION = 4;
export const GUARDIAN_RETALIATION_READY_RADIUS = 1.6;
export const GUARDIAN_RETALIATION_RELEASE_RADIUS = 2.2;

export const GUARDIAN_RETALIATION_PALETTE = {
  guard: '#ffd36f',
  core: '#fff2bf',
  target: '#ff8959',
  release: '#80ddff',
} as const;

const GUARD_MODIFIER: SkillModifierState = {
  id: GUARDIAN_RETALIATION_MODIFIER_ID,
  label: 'Retaliação do Guardião',
  description: 'Maestria de Sobrevivência 5: Guarda perfeita efetiva marca o agressor por 4 s.',
};
const RELEASE_MODIFIER: SkillModifierState = {
  id: GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID,
  label: 'Golpe de Retaliação',
  description: 'Golpe Pesado no agressor marcado causa +40% de dano e atrasa sua próxima ação em 0,8 s.',
};

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const source = record(value);
  return !!source && typeof source.x === 'number' && Number.isFinite(source.x)
    && typeof source.y === 'number' && Number.isFinite(source.y)
    && typeof source.z === 'number' && Number.isFinite(source.z);
}

function exactModifier(value: unknown, expected: SkillModifierState): value is SkillModifierState {
  const source = record(value);
  return !!source && source.id === expected.id && source.label === expected.label
    && source.description === expected.description && Object.keys(source).every((key) => (
      key === 'id' || key === 'label' || key === 'description'
    ));
}

export function guardianRetaliationSkillPresentationGate(
  skillsWire: unknown,
  masteriesWire: unknown,
): { guard: SkillState; heavy: SkillState } | null {
  if (!Array.isArray(skillsWire) || !Array.isArray(masteriesWire)) return null;
  const survival = masteriesWire.filter((candidate) => record(candidate)?.id === 'survival');
  if (survival.length !== 1) return null;
  const mastery = survival[0] as MasteryProgressState;
  if (!Number.isInteger(mastery.level) || mastery.level < GUARDIAN_RETALIATION_REQUIRED_MASTERY_LEVEL) return null;
  const skill = (id: string): SkillState | null => {
    const matches = skillsWire.filter((candidate) => record(candidate)?.id === id);
    return matches.length === 1 ? matches[0] as SkillState : null;
  };
  const guard = skill('iron-guard');
  const heavy = skill('heavy-strike');
  if (!guard || !heavy || !Array.isArray(guard.modifiers) || !Array.isArray(heavy.modifiers)) return null;
  const guardMatches = guard.modifiers.filter((modifier) => modifier?.id === GUARDIAN_RETALIATION_MODIFIER_ID);
  const heavyMatches = heavy.modifiers.filter((modifier) => modifier?.id === GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID);
  if (guardMatches.length !== 1 || heavyMatches.length !== 1
    || !exactModifier(guardMatches[0], GUARD_MODIFIER) || !exactModifier(heavyMatches[0], RELEASE_MODIFIER)) return null;
  return { guard, heavy };
}

export function guardianRetaliationBuffPresentationGate(
  playerWire: unknown,
  entities: readonly EntityState[],
): { player: EntityState; buff: BuffState; target?: EntityState; historical: boolean } | null {
  const player = record(playerWire) as EntityState | null;
  if (!player || player.kind !== 'player' || player.alive !== true || !Array.isArray(player.buffs)) return null;
  const matches = player.buffs.filter((buff) => buff?.id === GUARDIAN_RETALIATION_BUFF_ID);
  if (matches.length !== 1) return null;
  const buff = matches[0];
  if (buff.label !== 'Retaliação Pronta' || buff.duration !== GUARDIAN_RETALIATION_DURATION
    || typeof buff.remaining !== 'number' || !Number.isFinite(buff.remaining) || buff.remaining <= 0
    || buff.remaining > GUARDIAN_RETALIATION_DURATION || typeof buff.targetId !== 'string' || !buff.targetId) return null;
  const targets = entities.filter((entity) => entity.id === buff.targetId);
  if (targets.length > 1 || (targets[0] && (targets[0].kind !== 'enemy' || !targets[0].alive))) return null;
  return { player, buff, ...(targets[0] ? { target: targets[0] } : {}), historical: targets.length === 0 };
}

export function guardianRetaliationEventPresentationGate(
  value: CombatEvent | unknown,
  entities: readonly EntityState[],
): { event: GuardianRetaliationCombatEvent; phase: 'ready' | 'release'; historical: boolean } | null {
  const wire = record(value);
  if (!wire || (wire.type !== 'guardian-retaliation-ready' && wire.type !== 'guardian-retaliation-release')
    || typeof wire.id !== 'string' || !wire.id || typeof wire.casterId !== 'string' || !wire.casterId
    || typeof wire.targetId !== 'string' || !wire.targetId || wire.skill !== 'guardian-retaliation'
    || wire.modifierId !== GUARDIAN_RETALIATION_MODIFIER_ID || !finitePosition(wire.position)) return null;
  const ready = wire.type === 'guardian-retaliation-ready';
  if (wire.variant !== (ready ? 'ready' : 'release')
    || wire.sourceSkill !== (ready ? 'iron-guard' : 'heavy-strike')
    || wire.radius !== (ready ? GUARDIAN_RETALIATION_READY_RADIUS : GUARDIAN_RETALIATION_RELEASE_RADIUS)
    || (ready ? wire.duration !== GUARDIAN_RETALIATION_DURATION : wire.duration !== undefined)) return null;
  const forbidden = ['amount', 'damageKind', 'critical', 'damageEffect', 'resourceId', 'encounterId', 'wave',
    'innerRadius', 'delay', 'rotationY', 'arcDegrees'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const casters = entities.filter((entity) => entity.id === wire.casterId);
  const targets = entities.filter((entity) => entity.id === wire.targetId);
  if (casters.length > 1 || targets.length > 1 || (casters[0] && casters[0].kind !== 'player')
    || (targets[0] && targets[0].kind !== 'enemy')) return null;
  return {
    event: value as GuardianRetaliationCombatEvent,
    phase: ready ? 'ready' : 'release',
    historical: casters.length === 0 || targets.length === 0,
  };
}

