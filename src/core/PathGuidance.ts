import type { MovementPoint } from './MovementCollision';

export interface PathGuidancePoint extends MovementPoint {
  terminal: boolean;
}

interface PathSegment {
  from: MovementPoint;
  to: MovementPoint;
  length: number;
}

const MIN_GUIDANCE_SPACING = 0.4;
const MIN_SEGMENT_LENGTH = 0.001;

function interpolate(a: MovementPoint, b: MovementPoint, t: number, terminal: boolean): PathGuidancePoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    terminal,
  };
}

function pointAtDistance(segments: readonly PathSegment[], distance: number): PathGuidancePoint {
  let remaining = distance;
  for (const segment of segments) {
    if (remaining <= segment.length) {
      return interpolate(segment.from, segment.to, segment.length > 0 ? remaining / segment.length : 1, false);
    }
    remaining -= segment.length;
  }
  const last = segments[segments.length - 1];
  return interpolate(last.to, last.to, 1, false);
}

export function samplePathGuidancePoints(
  start: MovementPoint,
  path: readonly MovementPoint[],
  spacing = 2.4,
  maxPoints = 12,
): PathGuidancePoint[] {
  const limit = Math.max(0, Math.floor(maxPoints));
  if (path.length === 0 || limit <= 0) return [];

  const points = [start, ...path];
  const segments: PathSegment[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (length <= MIN_SEGMENT_LENGTH) continue;
    segments.push({ from, to, length });
    totalLength += length;
  }

  const finalPoint = path[path.length - 1];
  if (segments.length === 0 || totalLength <= MIN_SEGMENT_LENGTH || limit === 1) {
    return [{ ...finalPoint, terminal: true }];
  }

  const samples: PathGuidancePoint[] = [];
  const step = Number.isFinite(spacing) ? Math.max(MIN_GUIDANCE_SPACING, spacing) : 2.4;
  for (let distance = step; distance < totalLength && samples.length < limit - 1; distance += step) {
    samples.push(pointAtDistance(segments, distance));
  }
  samples.push({ ...finalPoint, terminal: true });
  return samples;
}
