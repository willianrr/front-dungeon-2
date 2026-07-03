export interface ClickAutomovePolicyInput {
  keyboardMovementActive: boolean;
}

export function canStartClickAutomove(input: ClickAutomovePolicyInput): boolean {
  return !input.keyboardMovementActive;
}

export function canStartNpcDestinationAutomove(input: ClickAutomovePolicyInput): boolean {
  return canStartClickAutomove(input);
}
