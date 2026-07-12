import type { ExpeditionCargoState, ItemKind, PartyState } from './types';

export const EXPEDITION_CARGO_CAPACITY = 12 as const;
export const EXPEDITION_CARGO_INTERACT_RANGE = 4.5 as const;
export const EXPEDITION_CARGO_KINDS = [
  'potion', 'mana_potion',
  'copper_ore', 'iron_ore', 'mithril_ore',
  'copper_bar', 'iron_bar', 'mithril_bar',
] as const satisfies readonly ItemKind[];

export const EXPEDITION_CARGO_PALETTE = {
  hide: '#7a5432',
  harness: '#d1a75d',
  pack: '#536b45',
  rune: '#8fe6ff',
} as const;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function position(value: unknown): value is { x: number; y: number; z: number } {
  const source = objectValue(value);
  return source !== null && ['x', 'y', 'z'].every((key) => typeof source[key] === 'number' && Number.isFinite(source[key]));
}

export function expeditionCargoPresentationGate(party: PartyState | null | undefined): ExpeditionCargoState | null {
  const cargo = objectValue(party?.cargo);
  if (!party || !cargo || cargo.version !== 1 || cargo.id !== `expedition-cargo-${party.id}`
    || cargo.partyId !== party.id || cargo.leaderId !== party.leaderId || !position(cargo.position)
    || cargo.capacity !== EXPEDITION_CARGO_CAPACITY || cargo.interactRange !== EXPEDITION_CARGO_INTERACT_RANGE
    || !Array.isArray(cargo.items) || typeof cargo.used !== 'number' || !Number.isInteger(cargo.used)
    || cargo.used < 0 || cargo.used > EXPEDITION_CARGO_CAPACITY) return null;
  const seen = new Set<string>();
  let used = 0;
  for (const candidate of cargo.items) {
    const item = objectValue(candidate);
    if (!item || typeof item.kind !== 'string' || !(EXPEDITION_CARGO_KINDS as readonly string[]).includes(item.kind)
      || seen.has(item.kind) || typeof item.count !== 'number' || !Number.isInteger(item.count) || item.count <= 0) return null;
    seen.add(item.kind);
    used += item.count;
  }
  if (used !== cargo.used) return null;
  return party.cargo as ExpeditionCargoState;
}

export function expeditionCargoCount(cargo: ExpeditionCargoState, kind: ItemKind): number {
  return cargo.items.find((item) => item.kind === kind)?.count ?? 0;
}
