export interface MovementBlocker {
  x: number;
  z: number;
  radius: number;
}

export interface MovementPoint {
  x: number;
  y: number;
  z: number;
}

export interface MovementDirection {
  x: number;
  z: number;
}

const NAV_CLEARANCE = 0.75;
const NAV_CELL = 2.4;
const NAV_GOAL_PAD = 0.08;
const NAV_MAX_VISITED = 5000;

interface LocalNavNode {
  x: number;
  z: number;
  g: number;
  f: number;
  parent?: LocalNavNode;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampMovePoint(point: MovementPoint, bound: number): MovementPoint {
  const edge = Math.max(0, bound - NAV_GOAL_PAD);
  return {
    x: clamp(point.x, -edge, edge),
    y: point.y,
    z: clamp(point.z, -edge, edge),
  };
}

export function isMoveTargetBlocked(
  x: number,
  z: number,
  blockers: readonly MovementBlocker[],
  bound: number,
): boolean {
  if (x <= -bound || x >= bound || z <= -bound || z >= bound) return true;
  return blockers.some((blocker) => Math.hypot(blocker.x - x, blocker.z - z) < blocker.radius + NAV_CLEARANCE);
}

function navKey(x: number, z: number): string {
  return `${x},${z}`;
}

function distancePointToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function isMovementSegmentClear(a: MovementPoint, b: MovementPoint, blockers: readonly MovementBlocker[]): boolean {
  return blockers.every((blocker) => (
    distancePointToSegment(blocker.x, blocker.z, a.x, a.z, b.x, b.z) >= blocker.radius + NAV_CLEARANCE
  ));
}

export function furthestClearPathIndex(
  current: MovementPoint,
  path: readonly MovementPoint[],
  blockers: readonly MovementBlocker[],
): number {
  for (let i = path.length - 1; i > 0; i--) {
    if (isMovementSegmentClear(current, path[i], blockers)) return i;
  }
  return 0;
}

function actorPositionClear(
  x: number,
  z: number,
  blockers: readonly MovementBlocker[],
  bound: number,
  actorRadius: number,
): boolean {
  if (x < -bound || x > bound || z < -bound || z > bound) return false;
  return blockers.every((blocker) => Math.hypot(blocker.x - x, blocker.z - z) >= blocker.radius + actorRadius - 0.0001);
}

export function resolveCircularCollisions(
  point: MovementPoint,
  blockers: readonly MovementBlocker[],
  bound: number,
  actorRadius: number,
  heightAt: (x: number, z: number) => number,
  fallbackDirection?: MovementDirection,
  previous?: MovementPoint,
): MovementPoint {
  let x = point.x;
  let z = point.z;

  for (const blocker of blockers) {
    let dx = x - blocker.x;
    let dz = z - blocker.z;
    const min = blocker.radius + actorRadius;
    const distSq = dx * dx + dz * dz;
    if (distSq >= min * min) continue;

    let distance = Math.sqrt(distSq);
    if (distance < 0.0001) {
      dx = fallbackDirection?.x ?? 1;
      dz = fallbackDirection?.z ?? 0;
      distance = Math.hypot(dx, dz) || 1;
    }

    if (previous) {
      let nx = previous.x - blocker.x;
      let nz = previous.z - blocker.z;
      let normalLength = Math.hypot(nx, nz);
      if (normalLength < 0.0001) {
        nx = dx;
        nz = dz;
        normalLength = distance || 1;
      }
      nx /= normalLength;
      nz /= normalLength;
      const tx = -nz;
      const tz = nx;
      const moveX = x - previous.x;
      const moveZ = z - previous.z;
      const tangentStep = moveX * tx + moveZ * tz;
      const slideX = previous.x + tx * tangentStep;
      const slideZ = previous.z + tz * tangentStep;
      if (Math.abs(tangentStep) > 0.0001 && actorPositionClear(slideX, slideZ, blockers, bound, actorRadius)) {
        x = slideX;
        z = slideZ;
        continue;
      }
    }

    x = blocker.x + (dx / distance) * min;
    z = blocker.z + (dz / distance) * min;
  }

  x = clamp(x, -bound, bound);
  z = clamp(z, -bound, bound);
  return { x, y: heightAt(x, z), z };
}

export function walkableGoalNear(
  start: MovementPoint,
  target: MovementPoint,
  blockers: readonly MovementBlocker[],
  bound: number,
): MovementPoint {
  const goal = clampMovePoint(target, bound);
  if (!isMoveTargetBlocked(goal.x, goal.z, blockers, bound)) return goal;

  let pushed = goal;
  for (let i = 0; i < 6; i++) {
    let moved = false;
    for (const blocker of blockers) {
      const min = blocker.radius + NAV_CLEARANCE + NAV_GOAL_PAD;
      let dx = pushed.x - blocker.x;
      let dz = pushed.z - blocker.z;
      let distance = Math.hypot(dx, dz);
      if (distance >= min) continue;

      if (distance < 0.0001) {
        dx = start.x - blocker.x;
        dz = start.z - blocker.z;
        distance = Math.hypot(dx, dz);
        if (distance < 0.0001) {
          dx = 1;
          dz = 0;
          distance = 1;
        }
      }
      pushed = clampMovePoint({
        x: blocker.x + (dx / distance) * min,
        y: pushed.y,
        z: blocker.z + (dz / distance) * min,
      }, bound);
      moved = true;
    }
    if (!moved && !isMoveTargetBlocked(pushed.x, pushed.z, blockers, bound)) return pushed;
  }
  if (!isMoveTargetBlocked(pushed.x, pushed.z, blockers, bound)) return pushed;

  const base = Math.atan2(start.x - goal.x, start.z - goal.z);
  for (let radius = 0.55; radius <= 2.4 * 4; radius += 0.35) {
    const samples = 18;
    for (let i = 0; i < samples; i++) {
      let offset = 0;
      if (i > 0) {
        const step = Math.floor((i + 1) / 2);
        offset = (i % 2 === 0 ? -1 : 1) * (step * Math.PI * 2 / samples);
      }
      const angle = base + offset;
      const candidate = clampMovePoint({
        x: goal.x + Math.sin(angle) * radius,
        y: goal.y,
        z: goal.z + Math.cos(angle) * radius,
      }, bound);
      if (!isMoveTargetBlocked(candidate.x, candidate.z, blockers, bound)) return candidate;
    }
  }

  return goal;
}

export function findLocalPath(
  start: MovementPoint,
  target: MovementPoint,
  blockers: readonly MovementBlocker[],
  bound: number,
): MovementPoint[] {
  const goal = walkableGoalNear(start, target, blockers, bound);
  if (isMovementSegmentClear(start, goal, blockers)) return [goal];

  const toCell = (value: number) => Math.round(value / NAV_CELL);
  const sx = toCell(start.x);
  const sz = toCell(start.z);
  let gx = toCell(goal.x);
  let gz = toCell(goal.z);

  if (isMoveTargetBlocked(gx * NAV_CELL, gz * NAV_CELL, blockers, bound)) {
    let found = false;
    for (let r = 1; r <= 4 && !found; r++) {
      for (let dz = -r; dz <= r && !found; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          if (!isMoveTargetBlocked((gx + dx) * NAV_CELL, (gz + dz) * NAV_CELL, blockers, bound)) {
            gx += dx;
            gz += dz;
            found = true;
            break;
          }
        }
      }
    }
  }

  const heuristic = (x: number, z: number) => Math.hypot(gx - x, gz - z);
  const open: LocalNavNode[] = [{ x: sx, z: sz, g: 0, f: heuristic(sx, sz) }];
  const best = new Map<string, LocalNavNode>([[navKey(sx, sz), open[0]]]);
  const closed = new Set<string>();
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ] as const;

  let end: LocalNavNode | undefined;
  for (let visited = 0; open.length > 0 && visited < NAV_MAX_VISITED; visited++) {
    open.sort((a, b) => b.f - a.f);
    const current = open.pop()!;
    const currentKey = navKey(current.x, current.z);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (current.x === gx && current.z === gz) {
      end = current;
      break;
    }

    for (const [dx, dz] of directions) {
      const nx = current.x + dx;
      const nz = current.z + dz;
      const nextKey = navKey(nx, nz);
      if (closed.has(nextKey) || isMoveTargetBlocked(nx * NAV_CELL, nz * NAV_CELL, blockers, bound)) continue;
      const step = dx === 0 || dz === 0 ? 1 : Math.SQRT2;
      const g = current.g + step;
      const previous = best.get(nextKey);
      if (previous && previous.g <= g) continue;
      const node: LocalNavNode = { x: nx, z: nz, g, f: g + heuristic(nx, nz), parent: current };
      best.set(nextKey, node);
      open.push(node);
    }
  }

  if (!end) return [goal];

  const reverse: MovementPoint[] = [goal];
  for (let node: LocalNavNode | undefined = end; node?.parent; node = node.parent) {
    reverse.push({ x: node.x * NAV_CELL, y: goal.y, z: node.z * NAV_CELL });
  }
  reverse.push({ x: start.x, y: goal.y, z: start.z });
  reverse.reverse();

  const result: MovementPoint[] = [];
  let from = reverse[0];
  for (let i = 1; i < reverse.length; i++) {
    const next = reverse[i];
    if (i + 1 < reverse.length && isMovementSegmentClear(from, reverse[i + 1], blockers)) continue;
    result.push(next);
    from = next;
  }
  return result.length > 0 ? result : [goal];
}
