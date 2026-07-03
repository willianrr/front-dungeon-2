export interface NpcFacingFocusInput {
  playerReady: boolean;
  keyboardMovementActive?: boolean;
  automoveActive?: boolean;
  attackAimActive?: boolean;
  activeNpcId?: string | null;
  pendingNpcId?: string | null;
  selectedNpcId?: string | null;
  selectedNpcNearby?: boolean;
}

export function npcFacingFocusTargetId(input: NpcFacingFocusInput): string | null {
  if (!input.playerReady || input.keyboardMovementActive || input.automoveActive || input.attackAimActive) {
    return null;
  }
  if (input.activeNpcId) return input.activeNpcId;
  if (input.pendingNpcId) return input.pendingNpcId;
  if (input.selectedNpcId && input.selectedNpcNearby) return input.selectedNpcId;
  return null;
}
