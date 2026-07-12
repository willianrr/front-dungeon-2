export interface StationarySkillMovementIntent {
  clickMoveActive: boolean;
  pendingInteractionActive: boolean;
  heldGroundMoveActive: boolean;
  queuedMoveActive: boolean;
  autorunActive: boolean;
}

export interface StationarySkillMovementPlan {
  clearClickMove: boolean;
  clearPendingInteraction: boolean;
  clearHeldGroundMove: boolean;
  clearQueuedMove: boolean;
  clearAutorun: boolean;
  suppressMovementForFrame: true;
}

/**
 * Plano aplicado antes de uma skill que exige postura parada. O bloqueio de
 * frame impede que um input ja coletado no mesmo tick desfaça a postura logo
 * depois do comando de cast; o frame seguinte volta a aceitar movimento.
 */
export function stationarySkillMovementPlan(input: StationarySkillMovementIntent): StationarySkillMovementPlan {
  return {
    clearClickMove: input.clickMoveActive,
    clearPendingInteraction: input.pendingInteractionActive,
    clearHeldGroundMove: input.heldGroundMoveActive,
    clearQueuedMove: input.queuedMoveActive,
    clearAutorun: input.autorunActive,
    suppressMovementForFrame: true,
  };
}
