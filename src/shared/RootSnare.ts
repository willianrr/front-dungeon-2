import type { CombatEvent, ControlZoneState, EntityState, SkillState, StatusState } from './types';

export const ROOT_SNARE_ID = 'root-snare' as const;
export const ROOT_SNARE_LABEL = 'Círculo de Raízes' as const;
export const ROOT_SNARE_DESCRIPTION = 'Cria por 4 s uma área de raízes que reduz movimento em 35% e atrasa a primeira ação de até oito inimigos.' as const;
export const ROOT_SNARE_MANA_COST = 24;
export const ROOT_SNARE_COOLDOWN = 9;
export const ROOT_SNARE_RANGE = 10;
export const ROOT_SNARE_RADIUS = 3.6;
export const ROOT_SNARE_DURATION = 4;
export const ROOT_SNARE_SLOW_MULTIPLIER = 0.65;
export const ROOT_SNARE_STATUS_GRACE = 0.35;

export const ROOT_SNARE_PALETTE = {
  root: '#83b84f',
  thorn: '#c9e87b',
  soil: '#4b3824',
  pulse: '#dcf69a',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finitePosition(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && ['x', 'y', 'z'].every((key) => typeof wire[key] === 'number' && Number.isFinite(wire[key]));
}

export function rootSnareSkillPresentationGate(skillsWire: unknown): SkillState | null {
  if (!Array.isArray(skillsWire)) return null;
  const matches = skillsWire.filter((candidate) => record(candidate)?.id === ROOT_SNARE_ID);
  if (matches.length !== 1) return null;
  const skill = record(matches[0]);
  if (!skill || skill.label !== ROOT_SNARE_LABEL || skill.description !== ROOT_SNARE_DESCRIPTION
    || skill.discipline !== 'survival' || skill.targetMode !== 'ground' || skill.stationary !== true
    || skill.requiresPhysicalWeapon !== false || skill.masteryId !== 'survival'
    || skill.manaCost !== ROOT_SNARE_MANA_COST || skill.cooldown !== ROOT_SNARE_COOLDOWN
    || skill.range !== ROOT_SNARE_RANGE || typeof skill.cooldownRemaining !== 'number'
    || !Number.isFinite(skill.cooldownRemaining) || skill.cooldownRemaining < 0
    || skill.cooldownRemaining > ROOT_SNARE_COOLDOWN || skill.pending === true) return null;
  if (skill.blocked === true) {
    if (typeof skill.blockedReason !== 'string' || !skill.blockedReason.trim()) return null;
  } else if (skill.blockedReason !== undefined) return null;
  return matches[0] as SkillState;
}

export function rootSnareZonePresentationGate(value: unknown): ControlZoneState | null {
  const wire = record(value);
  if (!wire || typeof wire.id !== 'string' || !wire.id.startsWith('root-snare-')
    || wire.kind !== ROOT_SNARE_ID || typeof wire.casterId !== 'string' || !wire.casterId
    || !finitePosition(wire.position) || wire.radius !== ROOT_SNARE_RADIUS
    || wire.duration !== ROOT_SNARE_DURATION || wire.slowMultiplier !== ROOT_SNARE_SLOW_MULTIPLIER
    || typeof wire.remaining !== 'number' || !Number.isFinite(wire.remaining)
    || wire.remaining <= 0 || wire.remaining > ROOT_SNARE_DURATION) return null;
  return value as ControlZoneState;
}

export function rootSnareZonesPresentationGate(value: unknown): ControlZoneState[] {
  if (!Array.isArray(value)) return [];
  const zones: ControlZoneState[] = [];
  const ids = new Set<string>();
  for (const candidate of value) {
    const zone = rootSnareZonePresentationGate(candidate);
    if (!zone || ids.has(zone.id)) continue;
    ids.add(zone.id);
    zones.push(zone);
  }
  return zones;
}

export function rootSnareStatusPresentationGate(
  entity: EntityState | unknown,
  entities: readonly EntityState[],
): { entity: EntityState; status: StatusState; caster?: EntityState } | null {
  const target = record(entity) as EntityState | null;
  if (!target || target.kind !== 'enemy' || target.alive !== true || !Array.isArray(target.statuses)) return null;
  const matches = target.statuses.filter((status) => status?.id === ROOT_SNARE_ID);
  if (matches.length !== 1) return null;
  const status = matches[0];
  if (status.sourceSkill !== ROOT_SNARE_ID || typeof status.sourceId !== 'string' || !status.sourceId
    || status.duration !== ROOT_SNARE_STATUS_GRACE || typeof status.remaining !== 'number'
    || !Number.isFinite(status.remaining) || status.remaining <= 0 || status.remaining > ROOT_SNARE_STATUS_GRACE
    || status.variant !== undefined) return null;
  const caster = entities.find((candidate) => candidate.id === status.sourceId);
  if (caster && caster.kind !== 'player') return null;
  return { entity: target, status, caster };
}

export function rootSnareEventPresentationGate(
  value: CombatEvent | unknown,
  entities: readonly EntityState[],
): { event: Extract<CombatEvent, { type: 'skill-effect' }>; historical: boolean } | null {
  const wire = record(value);
  if (!wire || wire.type !== 'skill-effect' || wire.skill !== ROOT_SNARE_ID
    || typeof wire.id !== 'string' || !wire.id || typeof wire.casterId !== 'string' || !wire.casterId
    || !finitePosition(wire.position) || wire.radius !== ROOT_SNARE_RADIUS || wire.duration !== ROOT_SNARE_DURATION
    || wire.targetId !== undefined || wire.sourceSkill !== undefined || wire.variant !== undefined) return null;
  const forbidden = ['amount', 'damageKind', 'critical', 'modifierId', 'charges', 'damageEffect', 'resourceId', 'origin'];
  if (forbidden.some((key) => wire[key] !== undefined)) return null;
  const caster = entities.find((entity) => entity.id === wire.casterId);
  if (caster && caster.kind !== 'player') return null;
  return { event: value as Extract<CombatEvent, { type: 'skill-effect' }>, historical: !caster };
}
