export interface NpcServiceDestinationLike {
  id: string;
  name: string;
  active?: boolean;
  pending?: boolean;
  selected?: boolean;
  nearby?: boolean;
  hovered?: boolean;
  objective?: boolean;
  distance?: number;
  priority?: number;
}

export interface NpcServiceDestinationSubtitleLike {
  title: string;
  statusLabel?: string;
  distanceLabel?: string;
  active?: boolean;
  pending?: boolean;
  selected?: boolean;
  objective?: boolean;
}

export function sortNpcServiceDestinations<T extends NpcServiceDestinationLike>(destinations: readonly T[]): T[] {
  return [...destinations].sort((a, b) => {
    const active = Number(!!b.active) - Number(!!a.active);
    if (active !== 0) return active;

    const pending = Number(!!b.pending) - Number(!!a.pending);
    if (pending !== 0) return pending;

    const selected = Number(!!b.selected) - Number(!!a.selected);
    if (selected !== 0) return selected;

    const nearby = Number(!!b.nearby) - Number(!!a.nearby);
    if (nearby !== 0) return nearby;

    const priority = (b.priority ?? 0) - (a.priority ?? 0);
    if (priority !== 0) return priority;

    const distanceA = Number.isFinite(a.distance) ? (a.distance as number) : Number.POSITIVE_INFINITY;
    const distanceB = Number.isFinite(b.distance) ? (b.distance as number) : Number.POSITIVE_INFINITY;
    if (distanceA !== distanceB) return distanceA - distanceB;

    const name = a.name.localeCompare(b.name);
    if (name !== 0) return name;
    return a.id.localeCompare(b.id);
  });
}

export function npcServiceDestinationSubtitle(destination: NpcServiceDestinationSubtitleLike): string {
  const parts = [destination.title];
  if (destination.statusLabel) parts.push(destination.statusLabel);
  if (destination.distanceLabel) parts.push(destination.distanceLabel);
  const suffix = parts.join(' - ');
  if (destination.active) return `Aberto - ${suffix}`;
  if (destination.selected) return `Alvo - ${suffix}`;
  if (destination.pending) return `Indo - ${suffix}`;
  return destination.objective ? `Objetivo - ${suffix}` : suffix;
}
