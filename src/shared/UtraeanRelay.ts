import type { UtraeanRelayState, UtraeanRuneState } from './types';

export const UTRAEAN_RELAY_ID = 'utraean-rune-relay' as const;
export const UTRAEAN_RELAY_LABEL = 'Circuito Rúnico Utraeano' as const;
export const UTRAEAN_RELAY_DURATION = 30 as const;
export const UTRAEAN_RELAY_REWARD_DURATION = 20 as const;
export const UTRAEAN_RELAY_COOLDOWN = 90 as const;
export const UTRAEAN_RELAY_CONSOLE_RANGE = 3.4 as const;
export const UTRAEAN_RELAY_RUNE_RANGE = 3.2 as const;
export const UTRAEAN_RELAY_CHEST_RANGE = 3.6 as const;

export const UTRAEAN_RELAY_RUNES = [
  { id: 'utraean-rune-sun', label: 'Runa do Sol', x: 44, z: -38 },
  { id: 'utraean-rune-tide', label: 'Runa da Maré', x: 50, z: -44 },
  { id: 'utraean-rune-star', label: 'Runa da Estrela', x: 56, z: -37 },
] as const satisfies readonly { id: UtraeanRuneState['id']; label: UtraeanRuneState['label']; x: number; z: number }[];

export const UTRAEAN_RELAY_PALETTE = {
  dormant: '#768997',
  active: '#77d8ff',
  current: '#fff08a',
  activated: '#83ffd0',
  reward: '#efc76e',
  cooldown: '#58636f',
  stone: '#263744',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function position(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && ['x', 'y', 'z'].every((key) => typeof wire[key] === 'number' && Number.isFinite(wire[key]));
}

function runeState(value: unknown): value is UtraeanRuneState {
  const wire = record(value);
  const canonical = UTRAEAN_RELAY_RUNES.find((rune) => rune.id === wire?.id);
  return !!wire && !!canonical && wire.label === canonical.label && position(wire.position)
    && (wire.position as { x: number; z: number }).x === canonical.x
    && (wire.position as { x: number; z: number }).z === canonical.z
    && Number.isInteger(wire.sequenceStep) && (wire.sequenceStep as number) >= -1 && (wire.sequenceStep as number) <= 2
    && typeof wire.activated === 'boolean' && typeof wire.current === 'boolean';
}

function uniqueCanonicalSequence(sequence: unknown[]): sequence is UtraeanRuneState['id'][] {
  if (sequence.length !== 3 || new Set(sequence).size !== 3) return false;
  return sequence.every((id) => UTRAEAN_RELAY_RUNES.some((rune) => rune.id === id));
}

export function utraeanRelayStatePresentationGate(value: unknown): UtraeanRelayState | null {
  const wire = record(value);
  if (!wire || wire.id !== UTRAEAN_RELAY_ID || wire.label !== UTRAEAN_RELAY_LABEL
    || !['dormant', 'active', 'reward', 'cooldown'].includes(String(wire.phase))
    || !position(wire.center) || wire.center.x !== 50 || wire.center.z !== -38
    || !position(wire.chestPosition) || wire.chestPosition.x !== 52 || wire.chestPosition.z !== -38
    || wire.consoleInteractRange !== UTRAEAN_RELAY_CONSOLE_RANGE || wire.chestInteractRange !== UTRAEAN_RELAY_CHEST_RANGE
    || !Array.isArray(wire.runes) || wire.runes.length !== 3 || !wire.runes.every(runeState)
    || !Array.isArray(wire.sequence) || !Number.isInteger(wire.progress)
    || typeof wire.timer !== 'number' || !Number.isFinite(wire.timer) || wire.timer < 0
    || typeof wire.participant !== 'boolean' || typeof wire.claimed !== 'boolean' || typeof wire.canClaim !== 'boolean'
    || typeof wire.guardianActive !== 'boolean' || (wire.guardianId !== undefined && typeof wire.guardianId !== 'string')
    || (wire.lockedReason !== undefined && typeof wire.lockedReason !== 'string')) return null;

  const runes = wire.runes as UtraeanRuneState[];
  if (new Set(runes.map((rune) => rune.id)).size !== 3) return null;
  const phase = wire.phase;
  const sequence = wire.sequence;
  const progress = wire.progress as number;
  const timer = wire.timer as number;
  const participant = wire.participant as boolean;
  const claimed = wire.claimed as boolean;
  const canClaim = wire.canClaim as boolean;
  const guardianActive = wire.guardianActive as boolean;
  const guardianId = wire.guardianId as string | undefined;
  const lockedReason = wire.lockedReason as string | undefined;
  const sequenceActive = phase === 'active' || phase === 'reward';
  if (sequenceActive ? !uniqueCanonicalSequence(sequence) : sequence.length !== 0) return null;
  if (!sequenceActive && runes.some((rune) => rune.sequenceStep !== -1 || rune.activated || rune.current)) return null;
  if (sequenceActive) {
    for (const rune of runes) {
      const step = sequence.indexOf(rune.id);
      if (rune.sequenceStep !== step || rune.activated !== (step < progress)
        || rune.current !== (phase === 'active' && step === progress)) return null;
    }
  }
  if (canClaim && (phase !== 'reward' || !participant || claimed || !!lockedReason)) return null;
  if (guardianActive !== (phase === 'active' && !!guardianId)) return null;
  if (guardianActive && canClaim) return null;
  if (!guardianActive && guardianId) return null;
  if (!canClaim && !lockedReason) return null;
  if (phase === 'dormant' && (progress !== 0 || timer !== 0 || participant || claimed || canClaim)) return null;
  if (phase === 'active' && (progress < 0 || progress > 2 || timer <= 0 || timer > UTRAEAN_RELAY_DURATION || claimed || canClaim)) return null;
  if (phase === 'reward' && (progress !== 3 || timer <= 0 || timer > UTRAEAN_RELAY_REWARD_DURATION)) return null;
  if (phase === 'cooldown' && (progress !== 0 || timer <= 0 || timer > UTRAEAN_RELAY_COOLDOWN || participant || claimed || canClaim)) return null;
  return value as UtraeanRelayState;
}

export function utraeanRelayPhaseLabel(state: UtraeanRelayState): string {
  switch (state.phase) {
    case 'dormant': return 'Circuito adormecido';
    case 'active': return 'Sequência em curso';
    case 'reward': return 'Cofre reconhecido';
    case 'cooldown': return 'Runas se recompondo';
  }
}

export function utraeanRelayColor(state: UtraeanRelayState): string {
  return UTRAEAN_RELAY_PALETTE[state.phase];
}

export function utraeanRuneById(id: UtraeanRuneState['id']): UtraeanRuneState['label'] {
  return UTRAEAN_RELAY_RUNES.find((rune) => rune.id === id)!.label;
}
