export type NpcMinimapMarkerTone = 'active' | 'pending' | 'selected' | 'objective' | 'hovered' | 'normal';

export interface NpcMinimapMarkerInput {
  active?: boolean;
  pending?: boolean;
  selected?: boolean;
  objective?: boolean;
  hovered?: boolean;
}

export interface NpcMinimapMarkerVisualState {
  tone: NpcMinimapMarkerTone;
  sizeMultiplier: number;
  haloRadius: number;
  haloColor: string;
}

export function npcMinimapMarkerVisualState(input: NpcMinimapMarkerInput): NpcMinimapMarkerVisualState {
  if (input.active) {
    return {
      tone: 'active',
      sizeMultiplier: 1.34,
      haloRadius: 6.2,
      haloColor: 'rgba(118, 226, 255, 0.28)',
    };
  }
  if (input.pending) {
    return {
      tone: 'pending',
      sizeMultiplier: 1.26,
      haloRadius: 5.6,
      haloColor: 'rgba(255, 216, 116, 0.3)',
    };
  }
  if (input.selected) {
    return {
      tone: 'selected',
      sizeMultiplier: 1.16,
      haloRadius: 4.8,
      haloColor: 'rgba(255, 216, 116, 0.22)',
    };
  }
  if (input.objective) {
    return {
      tone: 'objective',
      sizeMultiplier: 1.13,
      haloRadius: 4.7,
      haloColor: 'rgba(141, 255, 178, 0.22)',
    };
  }
  if (input.hovered) {
    return {
      tone: 'hovered',
      sizeMultiplier: 1.1,
      haloRadius: 4.2,
      haloColor: 'rgba(255, 255, 255, 0.16)',
    };
  }
  return {
    tone: 'normal',
    sizeMultiplier: 1,
    haloRadius: 0,
    haloColor: 'rgba(255, 255, 255, 0)',
  };
}
