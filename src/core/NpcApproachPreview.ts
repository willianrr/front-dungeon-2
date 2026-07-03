export interface NpcApproachPreviewTargetInput {
  hoveredNpcId?: string | null;
  selectedNpcId?: string | null;
  pendingNpcId?: string | null;
  activeNpcId?: string | null;
  automoveActive?: boolean;
}

export interface NpcApproachPreviewVisibilityInput {
  targetAvailable: boolean;
  distanceToNpc: number;
  interactRange: number;
  padding?: number;
}

export function npcApproachPreviewTargetId(input: NpcApproachPreviewTargetInput): string | null {
  if (input.automoveActive || input.pendingNpcId || input.activeNpcId) return null;
  return input.selectedNpcId ?? input.hoveredNpcId ?? null;
}

export function shouldShowNpcApproachPreview(input: NpcApproachPreviewVisibilityInput): boolean {
  if (!input.targetAvailable) return false;
  if (!Number.isFinite(input.distanceToNpc) || !Number.isFinite(input.interactRange)) return false;
  return input.distanceToNpc > input.interactRange + (input.padding ?? 0.35);
}
