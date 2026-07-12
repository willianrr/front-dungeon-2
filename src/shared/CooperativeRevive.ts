import type { BuffState, EntityState, ReviveChannelState } from './types';

export const COOPERATIVE_REVIVE_DURATION = 3 as const;
export const COOPERATIVE_REVIVE_RANGE = 3.2 as const;
export const REVIVE_PROTECTION_ID = 'revive-protection' as const;
export const REVIVE_PROTECTION_LABEL = 'Proteção da Aurora' as const;
export const REVIVE_PROTECTION_DURATION = 1.5 as const;

export const COOPERATIVE_REVIVE_PALETTE = {
  channel: '#78f0c4',
  target: '#fff0a6',
  protection: '#9df7ff',
  interruption: '#ff8b72',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

export interface ReviveChannelPresentation {
  reviver: EntityState;
  target: EntityState;
  state: ReviveChannelState;
  progress: number;
}

export function reviveChannelPresentationGate(
  entity: EntityState | unknown,
  entities: readonly EntityState[],
): ReviveChannelPresentation | null {
  const reviver = record(entity) as EntityState | null;
  const state = record(reviver?.revive);
  if (!reviver || reviver.kind !== 'player' || reviver.alive !== true || !state
    || typeof state.targetId !== 'string' || !state.targetId || state.targetId === reviver.id
    || state.duration !== COOPERATIVE_REVIVE_DURATION || state.range !== COOPERATIVE_REVIVE_RANGE
    || typeof state.remaining !== 'number' || !Number.isFinite(state.remaining)
    || state.remaining <= 0 || state.remaining > COOPERATIVE_REVIVE_DURATION) return null;
  const target = entities.find((candidate) => candidate.id === state.targetId);
  if (!target || target.kind !== 'player' || target.alive !== false) return null;
  const progress = 1 - (state.remaining as number) / COOPERATIVE_REVIVE_DURATION;
  return { reviver, target, state: reviver.revive!, progress };
}

export function reviveChannelPresentations(entities: readonly EntityState[]): ReviveChannelPresentation[] {
  const results: ReviveChannelPresentation[] = [];
  const targets = new Set<string>();
  for (const entity of entities) {
    const presentation = reviveChannelPresentationGate(entity, entities);
    if (!presentation || targets.has(presentation.target.id)) continue;
    targets.add(presentation.target.id);
    results.push(presentation);
  }
  return results;
}

export function reviveProtectionBuffPresentationGate(entity: EntityState | unknown): BuffState | null {
  const player = record(entity) as EntityState | null;
  if (!player || player.kind !== 'player' || player.alive !== true || !Array.isArray(player.buffs)) return null;
  const matches = player.buffs.filter((buff) => buff?.id === REVIVE_PROTECTION_ID);
  if (matches.length !== 1) return null;
  const buff = matches[0];
  if (buff.label !== REVIVE_PROTECTION_LABEL || buff.duration !== REVIVE_PROTECTION_DURATION
    || typeof buff.remaining !== 'number' || !Number.isFinite(buff.remaining)
    || buff.remaining <= 0 || buff.remaining > REVIVE_PROTECTION_DURATION
    || buff.targetId !== undefined || buff.charges !== undefined) return null;
  return buff;
}

export function partyMemberCanRequestRevive(
  member: unknown,
  localMember: unknown,
): boolean {
  const target = record(member);
  const local = record(localMember);
  return !!target && !!local && typeof target.id === 'string' && target.id !== local.id
    && target.online === true && target.alive === false && target.hp === 0
    && local.online === true && local.alive === true;
}
