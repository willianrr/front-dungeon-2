export interface XzPoint {
  x: number;
  z: number;
}

export function yawTowardPoint(from: XzPoint, to: XzPoint): number | null {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (dx * dx + dz * dz < 0.0001) return null;
  return Math.atan2(dx, dz);
}

export function turnYawToward(current: number, target: number, dt: number, rate: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  const alpha = dt > 0 ? 1 - Math.exp(-Math.max(0, rate) * dt) : 1;
  return current + delta * alpha;
}
