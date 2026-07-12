export interface BagInventoryCandidate {
  kind: string;
  equipped?: boolean;
}

/** Moeda pertence ao saldo do snapshot, nao a um slot fisico da mochila. */
export function bagInventoryItems<T extends BagInventoryCandidate>(inventory: readonly T[]): T[] {
  return inventory.filter((item) => !item.equipped && item.kind !== 'coin');
}
