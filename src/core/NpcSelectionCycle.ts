import type { WorldZone } from '../shared/types';
import { sortNpcServiceDestinations, type NpcServiceDestinationLike } from './NpcServiceDirectory';

export interface NpcSelectionCycleCandidate extends NpcServiceDestinationLike {
  zone: WorldZone;
}

export function nextNpcSelectionId(
  candidates: readonly NpcSelectionCycleCandidate[],
  currentId: string | null | undefined,
  zone: WorldZone,
  direction = 1,
): string | null {
  const visible = sortNpcServiceDestinations(
    candidates
      .filter((candidate) => candidate.zone === zone)
      .map((candidate) => ({ ...candidate, selected: false })),
  );
  if (visible.length === 0) return null;
  const currentIndex = currentId ? visible.findIndex((candidate) => candidate.id === currentId) : -1;
  if (currentIndex < 0) return visible[0].id;
  const step = direction < 0 ? -1 : 1;
  return visible[(currentIndex + step + visible.length) % visible.length].id;
}
