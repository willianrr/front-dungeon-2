import {
  clampMovePoint,
  isMovementSegmentClear,
  isMoveTargetBlocked,
  walkableGoalNear,
  type MovementBlocker,
  type MovementPoint,
} from './MovementCollision';

export interface NpcApproachPointInput {
  npc: MovementPoint;
  player?: Pick<MovementPoint, 'x' | 'z'>;
  rotationY: number;
  interactRange: number;
  blockers: readonly MovementBlocker[];
  bound: number;
  preferFacing?: boolean;
}

export interface NpcApproachTriggerRangeInput {
  npc: Pick<MovementPoint, 'x' | 'z'>;
  approach: Pick<MovementPoint, 'x' | 'z'>;
  interactRange: number;
}

function normalizedVector(dx: number, dz: number, fallbackAngle: number): { x: number; z: number } {
  let length = Math.hypot(dx, dz);
  if (length < 0.001) {
    dx = Math.sin(fallbackAngle);
    dz = Math.cos(fallbackAngle);
    length = Math.hypot(dx, dz);
  }
  if (length < 0.001) return { x: 0, z: 1 };
  return { x: dx / length, z: dz / length };
}

function approachRadii(interactRange: number): number[] {
  const outer = Math.max(0.55, interactRange - 0.32);
  const preferred = Math.max(1.15, Math.min(interactRange - 0.45, 1.85));
  const inner = Math.max(0.85, Math.min(preferred - 0.28, outer));
  return Array.from(new Set([
    Math.min(preferred, outer),
    outer,
    inner,
  ])).filter((radius) => radius > 0.1 && radius <= outer + 0.001);
}

function candidateOffsets(): number[] {
  const quarter = Math.PI / 4;
  const eighth = Math.PI / 8;
  return [0, -eighth, eighth, -quarter, quarter, -quarter - eighth, quarter + eighth, -Math.PI / 2, Math.PI / 2, Math.PI];
}

function distanceXZ(a: Pick<MovementPoint, 'x' | 'z'>, b: Pick<MovementPoint, 'x' | 'z'>): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function angleDistance(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function candidateBaseAngles(input: NpcApproachPointInput): number[] {
  const facingAngle = input.rotationY;
  const playerDirection = input.player
    ? normalizedVector(input.player.x - input.npc.x, input.player.z - input.npc.z, facingAngle)
    : undefined;
  const playerAngle = playerDirection ? Math.atan2(playerDirection.x, playerDirection.z) : undefined;
  const ordered = input.preferFacing
    ? [facingAngle, playerAngle]
    : [playerAngle, facingAngle];
  const angles: number[] = [];
  for (const angle of ordered) {
    if (angle === undefined || !Number.isFinite(angle)) continue;
    if (angles.some((existing) => angleDistance(existing, angle) < 0.01)) continue;
    angles.push(angle);
  }
  return angles.length > 0 ? angles : [0];
}

export function chooseNpcApproachPoint(input: NpcApproachPointInput): MovementPoint {
  const baseAngles = candidateBaseAngles(input);
  const start = input.player
    ? { x: input.player.x, y: input.npc.y, z: input.player.z }
    : input.npc;
  const clearCandidates: MovementPoint[] = [];
  const directCandidates: MovementPoint[] = [];

  for (const radius of approachRadii(input.interactRange)) {
    for (const baseAngle of baseAngles) {
      for (const offset of candidateOffsets()) {
        const angle = baseAngle + offset;
        const candidate = clampMovePoint({
          x: input.npc.x + Math.sin(angle) * radius,
          y: input.npc.y,
          z: input.npc.z + Math.cos(angle) * radius,
        }, input.bound);
        if (distanceXZ(candidate, input.npc) > input.interactRange - 0.05) continue;
        if (isMoveTargetBlocked(candidate.x, candidate.z, input.blockers, input.bound)) continue;
        clearCandidates.push(candidate);
        if (isMovementSegmentClear(start, candidate, input.blockers)) directCandidates.push(candidate);
      }
    }
  }

  if (input.preferFacing && clearCandidates.length > 0) return clearCandidates[0];
  if (directCandidates.length > 0) return directCandidates[0];
  if (clearCandidates.length > 0) return clearCandidates[0];

  const fallbackRadius = approachRadii(input.interactRange)[0] ?? Math.max(0.55, input.interactRange - 0.45);
  const fallbackAngle = baseAngles[0] ?? input.rotationY;
  const direction = normalizedVector(Math.sin(fallbackAngle), Math.cos(fallbackAngle), input.rotationY);
  const fallback = walkableGoalNear(start, {
    x: input.npc.x + direction.x * fallbackRadius,
    y: input.npc.y,
    z: input.npc.z + direction.z * fallbackRadius,
  }, input.blockers, input.bound);
  return distanceXZ(fallback, input.npc) <= input.interactRange
    ? fallback
    : {
      x: input.npc.x + direction.x * Math.max(0.45, input.interactRange - 0.35),
      y: input.npc.y,
      z: input.npc.z + direction.z * Math.max(0.45, input.interactRange - 0.35),
    };
}

export function npcApproachTriggerRange(input: NpcApproachTriggerRangeInput): number {
  if (!Number.isFinite(input.interactRange) || input.interactRange <= 0) return 0;
  const approachDistance = distanceXZ(input.npc, input.approach);
  if (!Number.isFinite(approachDistance)) return input.interactRange;
  return Math.min(input.interactRange, Math.max(1.25, approachDistance + 0.25));
}
