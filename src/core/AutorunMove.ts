export interface AutorunMoveAxes {
  strafe: number;
  forward: number;
}

export interface AutorunMoveInput {
  active: boolean;
  toggleQueued: boolean;
  manualAxes: AutorunMoveAxes;
  movementChanged: boolean;
}

export interface AutorunMoveState {
  active: boolean;
  axes: AutorunMoveAxes;
  movementChanged: boolean;
}

export function autorunMoveState(input: AutorunMoveInput): AutorunMoveState {
  let active = input.active;
  let movementChanged = input.movementChanged;
  if (input.toggleQueued) {
    active = !active;
    movementChanged = true;
  }

  if (active && input.manualAxes.forward !== 0) {
    active = false;
    movementChanged = true;
  }

  return {
    active,
    axes: {
      strafe: input.manualAxes.strafe,
      forward: active ? 1 : input.manualAxes.forward,
    },
    movementChanged,
  };
}
