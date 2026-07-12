import type {
  EquipmentSetId,
  EquipmentSetState,
  ForgeRecipeState,
  InventoryItem,
  ItemKind,
} from './types';

export const EQUIPMENT_SET_COLORS: Record<EquipmentSetId, string> = {
  'arhok-vanguard': '#f3b95f',
  'utraean-tempest': '#79d9ff',
  'stoneguard-oath': '#a8d28a',
};

export interface EquipmentSetPieceDefinition {
  id: string;
  label: string;
  kind: ItemKind;
}

export interface EquipmentSetDefinition {
  id: EquipmentSetId;
  label: string;
  pieces: readonly [EquipmentSetPieceDefinition, EquipmentSetPieceDefinition, EquipmentSetPieceDefinition];
  bonuses: readonly [
    { pieces: 2; label: string; description: string },
    { pieces: 3; label: string; description: string },
  ];
}

export const EQUIPMENT_SET_DEFINITIONS: readonly EquipmentSetDefinition[] = [
  {
    id: 'arhok-vanguard',
    label: 'Vanguarda de Arhok',
    pieces: [
      { id: 'arhok-greatblade', label: 'Montante de Arhok', kind: 'great_sword' },
      { id: 'arhok-visor', label: 'Viseira de Arhok', kind: 'helmet' },
      { id: 'arhok-gauntlets', label: 'Manoplas de Arhok', kind: 'gloves' },
    ],
    bonuses: [
      { pieces: 2, label: 'Precisão da Vanguarda', description: '+4 p.p. de chance de crítico.' },
      { pieces: 3, label: 'Marcha Implacável', description: 'Golpe Pesado efetivo reduz em 1,5 s a recarga de Investida.' },
    ],
  },
  {
    id: 'utraean-tempest',
    label: 'Tempestade Utraeana',
    pieces: [
      { id: 'utraean-signet', label: 'Sinete Utraeano', kind: 'ring' },
      { id: 'utraean-conduit', label: 'Condutor Utraeano', kind: 'necklace' },
      { id: 'utraean-wraps', label: 'Faixas Utraeanas', kind: 'gloves' },
    ],
    bonuses: [
      { pieces: 2, label: 'Reserva do Conclave', description: '+18 de mana máxima.' },
      { pieces: 3, label: 'Olho da Tempestade', description: 'Orbe da Tempestade nasce com 1 carga adicional.' },
    ],
  },
  {
    id: 'stoneguard-oath',
    label: 'Juramento do Guarda-Pedra',
    pieces: [
      { id: 'stoneguard-maul', label: 'Malho do Guarda-Pedra', kind: 'war_hammer' },
      { id: 'stoneguard-plate', label: 'Couraça do Guarda-Pedra', kind: 'armor' },
      { id: 'stoneguard-crown', label: 'Coroa do Guarda-Pedra', kind: 'helmet' },
    ],
    bonuses: [
      { pieces: 2, label: 'Muralha Viva', description: '+6 de armadura e +24 de vida máxima.' },
      { pieces: 3, label: 'Passo entre Golpes', description: 'Guarda Perfeita efetiva reduz em 1 s a recarga da Esquiva.' },
    ],
  },
];

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

export function equipmentSetDefinition(id: unknown): EquipmentSetDefinition | null {
  return EQUIPMENT_SET_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

export function equipmentSetPieceDefinition(
  setId: unknown,
  pieceId: unknown,
  kind?: unknown,
): EquipmentSetPieceDefinition | null {
  const definition = equipmentSetDefinition(setId);
  if (!definition || typeof pieceId !== 'string') return null;
  const piece = definition.pieces.find((candidate) => candidate.id === pieceId) ?? null;
  return piece && (kind === undefined || piece.kind === kind) ? piece : null;
}

/** Aceita uma peca somente quando set, peca e tipo formam o trio canonico. */
export function equipmentSetItemPresentation(item: unknown): {
  definition: EquipmentSetDefinition;
  piece: EquipmentSetPieceDefinition;
} | null {
  const wire = record(item);
  if (!wire || typeof wire.setId !== 'string' || typeof wire.setPieceId !== 'string') return null;
  const definition = equipmentSetDefinition(wire.setId);
  const piece = equipmentSetPieceDefinition(wire.setId, wire.setPieceId, wire.kind);
  return definition && piece ? { definition, piece } : null;
}

/** Gate do progresso autoritativo; não reconta os itens equipados no cliente. */
export function equipmentSetStatesPresentationGate(value: unknown): readonly EquipmentSetState[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<EquipmentSetId>();
  const states: EquipmentSetState[] = [];
  for (const candidate of value) {
    const wire = record(candidate);
    const definition = equipmentSetDefinition(wire?.id);
    if (!wire || !definition || seen.has(definition.id) || wire.label !== definition.label
      || !Number.isInteger(wire.piecesEquipped) || (wire.piecesEquipped as number) < 1
      || (wire.piecesEquipped as number) > 3 || wire.totalPieces !== 3 || !Array.isArray(wire.bonuses)
      || wire.bonuses.length !== 2) return null;
    for (let index = 0; index < definition.bonuses.length; index++) {
      const bonus = record(wire.bonuses[index]);
      const expected = definition.bonuses[index];
      if (!bonus || bonus.pieces !== expected.pieces || bonus.label !== expected.label
        || bonus.description !== expected.description || bonus.active !== ((wire.piecesEquipped as number) >= expected.pieces)) return null;
    }
    seen.add(definition.id);
    states.push(candidate as EquipmentSetState);
  }
  return states;
}

export function equipmentSetStateFor(
  states: readonly EquipmentSetState[],
  setId: EquipmentSetId,
): EquipmentSetState | null {
  return states.find((state) => state.id === setId) ?? null;
}

/** Valida a identidade de conjunto anunciada por uma receita de Borin. */
export function equipmentSetForgeOutputPresentation(recipe: ForgeRecipeState | unknown): {
  definition: EquipmentSetDefinition;
  piece: EquipmentSetPieceDefinition;
} | null {
  const wire = record(recipe);
  if (!wire || wire.recipeType !== 'equipment' || typeof wire.outputSetId !== 'string'
    || typeof wire.outputSetPieceId !== 'string') return null;
  const definition = equipmentSetDefinition(wire.outputSetId);
  const piece = equipmentSetPieceDefinition(wire.outputSetId, wire.outputSetPieceId, wire.outputKind);
  return definition && piece ? { definition, piece } : null;
}

export type EquipmentSetItem = InventoryItem & { setId: EquipmentSetId; setPieceId: string };
