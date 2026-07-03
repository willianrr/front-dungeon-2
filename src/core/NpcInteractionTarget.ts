export interface NpcInteractionTargetInput {
  nearestPromptNpcId?: string | null;
  selectedNpcId?: string | null;
  selectedNpcAvailable?: boolean;
  questNpcId?: string | null;
  keyboardMovementActive?: boolean;
}

export interface NpcInteractionTargetDecision {
  npcId: string | null;
  allowAutomove: boolean;
  source: 'prompt' | 'selected' | 'quest' | null;
}

export function npcInteractionTargetDecision(input: NpcInteractionTargetInput): NpcInteractionTargetDecision {
  if (input.nearestPromptNpcId) {
    return {
      npcId: input.nearestPromptNpcId,
      allowAutomove: true,
      source: 'prompt',
    };
  }

  if (input.selectedNpcId && input.selectedNpcAvailable) {
    return {
      npcId: input.selectedNpcId,
      allowAutomove: !input.keyboardMovementActive,
      source: 'selected',
    };
  }

  if (input.questNpcId) {
    return {
      npcId: input.questNpcId,
      allowAutomove: !input.keyboardMovementActive,
      source: 'quest',
    };
  }

  return {
    npcId: null,
    allowAutomove: false,
    source: null,
  };
}
