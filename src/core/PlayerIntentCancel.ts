export interface PlayerIntentCancelInput {
  automoveActive: boolean;
  autorunActive?: boolean;
  npcPanelOpen: boolean;
  enemySelected: boolean;
  npcSelected?: boolean;
}

export interface PlayerIntentCancelPlan {
  handled: boolean;
  clearAutomove: boolean;
  closeNpcPanels: boolean;
  clearAutorun: boolean;
  clearEnemy: boolean;
  clearNpcSelection: boolean;
}

export function playerIntentCancelPlan(input: PlayerIntentCancelInput): PlayerIntentCancelPlan {
  const handled = input.automoveActive || !!input.autorunActive || input.npcPanelOpen || input.enemySelected || !!input.npcSelected;
  return {
    handled,
    clearAutomove: input.automoveActive,
    closeNpcPanels: input.npcPanelOpen,
    clearAutorun: !!input.autorunActive,
    clearEnemy: input.enemySelected,
    clearNpcSelection: !!input.npcSelected || input.automoveActive || input.npcPanelOpen,
  };
}
