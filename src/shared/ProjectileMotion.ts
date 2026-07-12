import type { V3 } from './mathx';
import type { ProjectileKind, ProjectileState } from './types';

export const PROJECTILE_MAX_EXTRAPOLATION_SECONDS = 0.2;
export const PROJECTILE_CORRECTION_RATE = 18;
export const PROJECTILE_SNAP_DISTANCE = 2.4;

export interface ProjectilePresentation {
  kind: ProjectileKind;
  coreColor: string;
  trailColor: string;
  lightColor: string;
  coreEmissive: number;
  trailEmissive: number;
  pulseSpeed: number;
}

export const PROJECTILE_PRESENTATIONS: Readonly<Record<ProjectileKind, ProjectilePresentation>> = {
  corruptedShard: {
    kind: 'corruptedShard',
    coreColor: '#f0dcff',
    trailColor: '#7936a8',
    lightColor: '#d99cff',
    coreEmissive: 2.3,
    trailEmissive: 1.75,
    pulseSpeed: 16,
  },
  arcaneBolt: {
    kind: 'arcaneBolt',
    coreColor: '#f5ffff',
    trailColor: '#69e9ff',
    lightColor: '#a9f7ff',
    coreEmissive: 3,
    trailEmissive: 2.25,
    pulseSpeed: 21,
  },
};

export function isSupportedProjectileKind(value: unknown): value is ProjectileKind {
  return value === 'corruptedShard' || value === 'arcaneBolt';
}

export function projectilePresentation(kind: ProjectileKind): ProjectilePresentation {
  return PROJECTILE_PRESENTATIONS[kind];
}

export interface ProjectileLifecyclePlan {
  create: string[];
  update: string[];
  remove: string[];
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function extrapolatedProjectilePosition(
  projectile: Pick<ProjectileState, 'position' | 'velocity'>,
  secondsSinceSnapshot: number,
  maxSeconds = PROJECTILE_MAX_EXTRAPOLATION_SECONDS,
): V3 {
  const dt = Math.max(0, Math.min(finite(secondsSinceSnapshot), Math.max(0, finite(maxSeconds))));
  return {
    x: finite(projectile.position.x) + finite(projectile.velocity.x) * dt,
    y: finite(projectile.position.y) + finite(projectile.velocity.y) * dt,
    z: finite(projectile.position.z) + finite(projectile.velocity.z) * dt,
  };
}

export function correctedProjectilePosition(
  current: V3,
  target: V3,
  frameSeconds: number,
  correctionRate = PROJECTILE_CORRECTION_RATE,
  snapDistance = PROJECTILE_SNAP_DISTANCE,
): V3 {
  const dx = finite(target.x) - finite(current.x);
  const dy = finite(target.y) - finite(current.y);
  const dz = finite(target.z) - finite(current.z);
  const distance = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(distance) || distance >= Math.max(0, finite(snapDistance))) {
    return { x: finite(target.x), y: finite(target.y), z: finite(target.z) };
  }
  const dt = Math.max(0, Math.min(finite(frameSeconds), 0.1));
  const alpha = 1 - Math.exp(-Math.max(0, finite(correctionRate)) * dt);
  return {
    x: finite(current.x) + dx * alpha,
    y: finite(current.y) + dy * alpha,
    z: finite(current.z) + dz * alpha,
  };
}

export function projectileLifecyclePlan(
  existingIds: Iterable<string>,
  incoming: readonly Pick<ProjectileState, 'id'>[],
): ProjectileLifecyclePlan {
  const existing = new Set([...existingIds].filter(Boolean));
  const incomingIds = new Set(incoming.map((projectile) => projectile.id).filter(Boolean));
  return {
    create: [...incomingIds].filter((id) => !existing.has(id)).sort(),
    update: [...incomingIds].filter((id) => existing.has(id)).sort(),
    remove: [...existing].filter((id) => !incomingIds.has(id)).sort(),
  };
}
