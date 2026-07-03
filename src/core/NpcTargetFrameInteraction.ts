export interface NpcTargetFrameInteractionInput {
  npcTargetId?: string | null;
  keyboardMovementActive?: boolean;
}

export interface NpcTargetFrameInteractionDecision {
  npcId: string | null;
  allowAutomove: boolean;
}

export function npcTargetFrameInteractionDecision(
  input: NpcTargetFrameInteractionInput,
): NpcTargetFrameInteractionDecision {
  if (!input.npcTargetId) return { npcId: null, allowAutomove: false };
  return {
    npcId: input.npcTargetId,
    allowAutomove: !input.keyboardMovementActive,
  };
}
