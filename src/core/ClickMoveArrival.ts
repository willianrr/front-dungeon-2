export interface ClickMoveArrivalStep {
  step: number;
  running: boolean;
}

const MAX_CLICK_MOVE_DT = 0.05;
const MIN_ARRIVAL_SPEED_SCALE = 0.38;

export function clickMoveArrivalStep(
  distance: number,
  speed: number,
  dt: number,
  stopDistance: number,
  finalSegment: boolean,
  run: boolean,
): ClickMoveArrivalStep {
  const safeDt = Math.min(Math.max(dt, 0), MAX_CLICK_MOVE_DT);
  const maxStep = Math.max(0, distance - stopDistance * 0.5);
  if (!finalSegment) {
    return {
      step: Math.min(speed * safeDt, maxStep),
      running: run,
    };
  }

  const slowdownRadius = run ? 2.25 : 1.45;
  const arrival = Math.max(0, Math.min(1, (distance - stopDistance) / Math.max(0.001, slowdownRadius - stopDistance)));
  const speedScale = Math.max(MIN_ARRIVAL_SPEED_SCALE, arrival);
  return {
    step: Math.min(speed * speedScale * safeDt, maxStep),
    running: run && arrival > 0.72,
  };
}
