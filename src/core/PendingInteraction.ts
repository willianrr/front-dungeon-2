export type PendingInteractionDecision = 'cancel' | 'wait' | 'trigger';
export type PendingInteractionRetryDecision = 'wait' | 'retry';

export interface PendingInteractionDecisionInput {
  playerReady: boolean;
  targetAvailable: boolean;
  distanceToTarget: number;
  range: number;
  distanceToApproachTarget?: number;
  approachRange?: number;
}

export interface PendingInteractionRetryInput {
  decision: PendingInteractionDecision;
  kind: 'loot' | 'chest' | 'npc';
  automoveActive: boolean;
  now: number;
  lastRetryAt?: number;
  retryInterval?: number;
  distanceToApproachTarget?: number;
  approachRange?: number;
}

export function pendingInteractionDecision(input: PendingInteractionDecisionInput): PendingInteractionDecision {
  if (!input.playerReady || !input.targetAvailable) return 'cancel';
  if (!Number.isFinite(input.distanceToTarget) || !Number.isFinite(input.range) || input.range < 0) return 'cancel';
  if (input.distanceToTarget > input.range) return 'wait';
  const approachGate = input.distanceToApproachTarget !== undefined || input.approachRange !== undefined;
  if (!approachGate) return 'trigger';
  const distanceToApproachTarget = input.distanceToApproachTarget;
  const approachRange = input.approachRange;
  if (
    distanceToApproachTarget === undefined
    || approachRange === undefined
    || !Number.isFinite(distanceToApproachTarget)
    || !Number.isFinite(approachRange)
    || approachRange < 0
  ) {
    return 'cancel';
  }
  return distanceToApproachTarget <= approachRange ? 'trigger' : 'wait';
}

export function pendingInteractionRetryDecision(input: PendingInteractionRetryInput): PendingInteractionRetryDecision {
  if (input.decision !== 'wait' || input.kind !== 'npc' || input.automoveActive) return 'wait';
  const retryInterval = input.retryInterval ?? 0.35;
  if (!Number.isFinite(input.now) || retryInterval < 0) return 'wait';
  if (input.lastRetryAt !== undefined && input.now - input.lastRetryAt < retryInterval) return 'wait';

  const distanceToApproachTarget = input.distanceToApproachTarget;
  const approachRange = input.approachRange;
  if (
    distanceToApproachTarget === undefined
    || approachRange === undefined
    || !Number.isFinite(distanceToApproachTarget)
    || !Number.isFinite(approachRange)
  ) {
    return 'wait';
  }

  return distanceToApproachTarget > approachRange ? 'retry' : 'wait';
}
