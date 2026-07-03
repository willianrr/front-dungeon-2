export interface NpcVisualFocusInput {
  npcId: string;
  selectedNpcId?: string | null;
  pendingNpcId?: string | null;
  activeNpcId?: string | null;
  hoveredNpcId?: string | null;
  objectiveNpcId?: string | null;
  distanceToPlayer: number;
  interactRange: number;
  promptPadding?: number;
}

export interface NpcHoverFocusInput {
  pointerNpcId?: string | null;
  serviceNpcId?: string | null;
  targetFrameNpcId?: string | null;
}

export interface NpcVisualFocusState {
  selected: boolean;
  pending: boolean;
  active: boolean;
  hovered: boolean;
  objective: boolean;
  nearby: boolean;
  focused: boolean;
  destination: boolean;
}

export interface NpcInteractionRingInput {
  distanceToPlayer: number;
  interactRange: number;
  nearby: boolean;
  hovered?: boolean;
  objective?: boolean;
  destination: boolean;
  revealDistance?: number;
}

export interface NpcInteractionRingState {
  visible: boolean;
  scale: number;
  lift: number;
}

export function shouldCloseNpcServicePanel(
  distanceToPlayer: number,
  interactRange: number,
  closePadding = 2.4,
): boolean {
  return !Number.isFinite(distanceToPlayer) || distanceToPlayer > interactRange + closePadding;
}

export function npcHoverFocusTargetId(input: NpcHoverFocusInput): string | null {
  return input.serviceNpcId ?? input.targetFrameNpcId ?? input.pointerNpcId ?? null;
}

export function npcVisualFocusState(input: NpcVisualFocusInput): NpcVisualFocusState {
  const selected = input.selectedNpcId === input.npcId;
  const pending = input.pendingNpcId === input.npcId;
  const active = input.activeNpcId === input.npcId;
  const hovered = input.hoveredNpcId === input.npcId;
  const objective = input.objectiveNpcId === input.npcId;
  const promptPadding = input.promptPadding ?? 0.55;
  const nearby = Number.isFinite(input.distanceToPlayer)
    && input.distanceToPlayer <= input.interactRange + promptPadding;
  const destination = pending || active;
  return {
    selected,
    pending,
    active,
    hovered,
    objective,
    nearby,
    focused: destination || nearby || selected || hovered || objective,
    destination,
  };
}

export function npcInteractionRingState(input: NpcInteractionRingInput): NpcInteractionRingState {
  const revealDistance = input.revealDistance ?? 18;
  const closeEnoughToReveal = Number.isFinite(input.distanceToPlayer)
    && input.distanceToPlayer <= Math.max(revealDistance, input.interactRange + 2.5);
  const visible = input.destination || input.nearby || !!input.hovered || !!input.objective || closeEnoughToReveal;
  const baseScale = Math.max(1.28, input.interactRange * 0.58);
  const scale = input.destination
    ? Math.max(baseScale, input.interactRange * 0.82)
    : input.nearby
      ? Math.max(baseScale, input.interactRange * 0.72)
      : input.hovered
        ? Math.max(baseScale, input.interactRange * 0.66)
        : input.objective
          ? Math.max(baseScale, input.interactRange * 0.68)
          : baseScale;
  return {
    visible,
    scale,
    lift: input.destination ? 0.075 : input.nearby ? 0.065 : input.hovered || input.objective ? 0.06 : 0.055,
  };
}
