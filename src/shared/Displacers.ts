import type { DisplacerState, WorldZone } from './types';

export const DISPLACER_INTERACT_RANGE = 3 as const;

export interface DisplacerDefinition {
  id: string;
  label: string;
  zone: WorldZone;
  x: number;
  z: number;
  requiredLevel: number;
  defaultActive: boolean;
}

export const DISPLACER_DEFINITIONS: readonly DisplacerDefinition[] = [
  { id: 'displacer-camp', label: 'Acampamento de Aranna', zone: 'overworld', x: 0, z: 3.2, requiredLevel: 1, defaultActive: true },
  { id: 'displacer-northwatch', label: 'Vigília Norte', zone: 'overworld', x: 0, z: 48, requiredLevel: 2, defaultActive: false },
  { id: 'displacer-ironwood', label: 'Bosque de Ferro', zone: 'overworld', x: -48, z: -28, requiredLevel: 3, defaultActive: false },
  { id: 'displacer-seal-gate', label: 'Portal da Câmara', zone: 'dungeon', x: 0, z: 10, requiredLevel: 1, defaultActive: false },
  { id: 'displacer-deep-vault', label: 'Profundezas', zone: 'dungeon', x: 12, z: -10, requiredLevel: 5, defaultActive: false },
] as const;

export const DISPLACER_PALETTE = {
  active: '#66e9ff',
  current: '#fff0a6',
  locked: '#74808d',
  core: '#e9fdff',
  dungeon: '#d99bff',
} as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Aceita a rede somente como um contrato completo e canonico. Desse modo um
 * wire parcial ou misturado entre versoes nao cria um destino clicavel que o
 * servidor jamais permitiria usar.
 */
export function displacerStatesPresentationGate(
  value: unknown,
  playerZone?: WorldZone,
): readonly DisplacerState[] | null {
  if (!Array.isArray(value) || value.length !== DISPLACER_DEFINITIONS.length) return null;
  let currentCount = 0;
  let actionableTravelCount = 0;
  const states: DisplacerState[] = [];

  for (let index = 0; index < DISPLACER_DEFINITIONS.length; index++) {
    const expected = DISPLACER_DEFINITIONS[index];
    const wire = record(value[index]);
    const position = record(wire?.position);
    if (!wire || !position || wire.id !== expected.id || wire.label !== expected.label
      || wire.zone !== expected.zone || wire.interactRange !== DISPLACER_INTERACT_RANGE
      || wire.requiredLevel !== expected.requiredLevel
      || position.x !== expected.x || position.z !== expected.z || !finiteNumber(position.y)
      || typeof wire.activated !== 'boolean' || typeof wire.current !== 'boolean'
      || typeof wire.canActivate !== 'boolean' || typeof wire.canTravel !== 'boolean'
      || (wire.lockedReason !== undefined && typeof wire.lockedReason !== 'string')) return null;

    const activated = wire.activated as boolean;
    const current = wire.current as boolean;
    const canActivate = wire.canActivate as boolean;
    const canTravel = wire.canTravel as boolean;
    const lockedReason = wire.lockedReason as string | undefined;
    if (expected.defaultActive && !activated) return null;
    if (current && playerZone !== undefined && wire.zone !== playerZone) return null;
    if (current) currentCount++;
    if (canTravel) actionableTravelCount++;
    if (canActivate && (activated || !current)) return null;
    if (canTravel && (!activated || current)) return null;
    if ((canActivate || canTravel) && lockedReason) return null;
    if (!canActivate && !canTravel && !lockedReason) return null;
    states.push(value[index] as DisplacerState);
  }

  if (currentCount > 1 || (actionableTravelCount > 0 && currentCount !== 1)) return null;
  return states;
}

export function displacerDefinition(id: unknown): DisplacerDefinition | null {
  return DISPLACER_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

export function displacerColor(state: Pick<DisplacerState, 'activated' | 'current' | 'zone'>): string {
  if (state.current) return DISPLACER_PALETTE.current;
  if (!state.activated) return DISPLACER_PALETTE.locked;
  return state.zone === 'dungeon' ? DISPLACER_PALETTE.dungeon : DISPLACER_PALETTE.active;
}
