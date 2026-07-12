import type { TreasureLodeState } from './types';

export const TREASURE_LODE_ID = 'treasure-lode-ironwood' as const;
export const TREASURE_LODE_NODE_ID = 'ore-iron-3' as const;
export const TREASURE_LODE_LABEL = 'Jazida do Coração de Ferro' as const;
export const TREASURE_LODE_TOTAL_WAVES = 2 as const;
export const TREASURE_LODE_TRIGGER_RADIUS = 3.4 as const;
export const TREASURE_LODE_ARENA_RADIUS = 11 as const;
export const TREASURE_LODE_CHEST_RANGE = 4 as const;

export const TREASURE_LODE_PALETTE = {
  dormant: '#d9a867',
  danger: '#ff765f',
  intermission: '#ffd875',
  reward: '#78f0c4',
  cooldown: '#71828d',
  chest: '#fff0a6',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function position(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && ['x', 'y', 'z'].every((key) => typeof wire[key] === 'number' && Number.isFinite(wire[key]));
}

export function treasureLodeStatePresentationGate(value: unknown): TreasureLodeState | null {
  const wire = record(value);
  if (!wire || wire.id !== TREASURE_LODE_ID || wire.label !== TREASURE_LODE_LABEL || wire.nodeId !== TREASURE_LODE_NODE_ID
    || !['dormant', 'wave', 'intermission', 'reward', 'cooldown'].includes(String(wire.phase))
    || !position(wire.center) || !position(wire.chestPosition)
    || wire.triggerRadius !== TREASURE_LODE_TRIGGER_RADIUS || wire.arenaRadius !== TREASURE_LODE_ARENA_RADIUS
    || wire.totalWaves !== TREASURE_LODE_TOTAL_WAVES || wire.chestInteractRange !== TREASURE_LODE_CHEST_RANGE
    || !Number.isInteger(wire.wave) || !Number.isInteger(wire.remainingEnemies)
    || typeof wire.timer !== 'number' || !Number.isFinite(wire.timer) || wire.timer < 0
    || typeof wire.participant !== 'boolean' || typeof wire.rewardReady !== 'boolean' || typeof wire.canClaim !== 'boolean'
    || (wire.lockedReason !== undefined && typeof wire.lockedReason !== 'string')) return null;
  const center = wire.center as { x: number; y: number; z: number };
  const chest = wire.chestPosition as { x: number; y: number; z: number };
  if (chest.x !== center.x + 2.6 || chest.z !== center.z + 1.2) return null;

  const phase = wire.phase;
  const wave = wire.wave as number;
  const remaining = wire.remainingEnemies as number;
  const timer = wire.timer as number;
  const participant = wire.participant as boolean;
  const rewardReady = wire.rewardReady as boolean;
  const canClaim = wire.canClaim as boolean;
  const lockedReason = wire.lockedReason as string | undefined;
  if (canClaim && (!participant || !rewardReady || lockedReason)) return null;
  if (!canClaim && !lockedReason) return null;
  if (phase === 'dormant' && (wave !== 0 || remaining !== 0 || timer !== 0 || participant || rewardReady || canClaim)) return null;
  if (phase === 'wave' && ((wave !== 1 && wave !== 2) || remaining < 1 || remaining > (wave === 1 ? 3 : 4)
    || timer !== 0 || rewardReady || canClaim)) return null;
  if (phase === 'intermission' && (wave !== 1 || remaining !== 0 || timer <= 0 || timer > 1.5 || rewardReady || canClaim)) return null;
  if (phase === 'reward' && (wave !== 2 || remaining !== 0 || timer !== 0 || !rewardReady)) return null;
  if (phase === 'cooldown' && (wave !== 0 || remaining !== 0 || timer <= 0 || timer > 120 || participant || rewardReady || canClaim)) return null;
  return value as TreasureLodeState;
}

export function treasureLodePhaseLabel(state: TreasureLodeState): string {
  switch (state.phase) {
    case 'dormant': return 'Veio adormecido';
    case 'wave': return `Emboscada · Onda ${state.wave}/${state.totalWaves}`;
    case 'intermission': return 'Nova onda se aproxima';
    case 'reward': return 'Cofre mineral revelado';
    case 'cooldown': return 'Jazida em repouso';
  }
}

export function treasureLodeColor(state: TreasureLodeState): string {
  if (state.phase === 'wave') return TREASURE_LODE_PALETTE.danger;
  return TREASURE_LODE_PALETTE[state.phase];
}
