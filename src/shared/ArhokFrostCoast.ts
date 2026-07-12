import type { BiomeState, WarmthSourceState } from './types';

export const ARHOK_FROST_BIOME_ID = 'arhok-frost-coast' as const;
export const ARHOK_FROST_BIOME_LABEL = 'Costa Fria de Arhok' as const;
export const ARHOK_FROST_MAX_EXPOSURE = 100 as const;
export const ARHOK_FROST_BOUNDS = { minX: -38, maxX: 38, minZ: 32, maxZ: 94 } as const;
export const ARHOK_FROST_CHILLED_THRESHOLD = 35;
export const ARHOK_FROST_SEVERE_THRESHOLD = 70;

export const ARHOK_FROST_PALETTE = {
  clear: '#b9e8f2',
  chilled: '#82cce2',
  frostbitten: '#9aabff',
  warmth: '#ffb45f',
  flame: '#fff0a6',
  snow: '#ecfbff',
} as const;

const SOURCE_CONTRACTS = [
  { id: 'arhok-hearth-northwatch', label: 'Braseiro da Vigília', x: 0, z: 48, radius: 5.5 },
  { id: 'arhok-hearth-west', label: 'Fogueira dos Batedores', x: -19, z: 41, radius: 4.5 },
  { id: 'arhok-hearth-east', label: 'Fogo do Penhasco', x: 20, z: 58, radius: 4.5 },
] as const;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function position(value: unknown): value is { x: number; y: number; z: number } {
  const wire = record(value);
  return !!wire && finite(wire.x) && finite(wire.y) && finite(wire.z);
}

function warmthSourceGate(value: unknown, index: number): WarmthSourceState | null {
  const wire = record(value);
  const contract = SOURCE_CONTRACTS[index];
  if (!wire || !contract || wire.id !== contract.id || wire.label !== contract.label || !position(wire.position)
    || wire.radius !== contract.radius) return null;
  const point = wire.position as { x: number; y: number; z: number };
  if (point.x !== contract.x || point.z !== contract.z) return null;
  return value as WarmthSourceState;
}

export function arhokFrostBiomePresentationGate(value: unknown): BiomeState | null {
  const wire = record(value);
  if (!wire || wire.version !== 1 || wire.id !== ARHOK_FROST_BIOME_ID || wire.label !== ARHOK_FROST_BIOME_LABEL
    || typeof wire.active !== 'boolean' || typeof wire.warmth !== 'boolean'
    || !finite(wire.exposure) || wire.exposure < 0 || wire.exposure > ARHOK_FROST_MAX_EXPOSURE
    || wire.maxExposure !== ARHOK_FROST_MAX_EXPOSURE || !['clear', 'chilled', 'frostbitten'].includes(String(wire.stage))
    || ![1, 0.9, 0.78].includes(Number(wire.moveSpeedMultiplier)) || !Array.isArray(wire.warmthSources)
    || wire.warmthSources.length !== SOURCE_CONTRACTS.length) return null;
  const bounds = record(wire.bounds);
  if (!bounds || bounds.minX !== ARHOK_FROST_BOUNDS.minX || bounds.maxX !== ARHOK_FROST_BOUNDS.maxX
    || bounds.minZ !== ARHOK_FROST_BOUNDS.minZ || bounds.maxZ !== ARHOK_FROST_BOUNDS.maxZ) return null;
  const sources = wire.warmthSources.map((source, index) => warmthSourceGate(source, index));
  if (sources.some((source) => source === null)) return null;
  const exposure = wire.exposure as number;
  const expectedStage = exposure >= ARHOK_FROST_SEVERE_THRESHOLD
    ? 'frostbitten'
    : exposure >= ARHOK_FROST_CHILLED_THRESHOLD ? 'chilled' : 'clear';
  const expectedMove = expectedStage === 'frostbitten' ? 0.78 : expectedStage === 'chilled' ? 0.9 : 1;
  if (wire.stage !== expectedStage || wire.moveSpeedMultiplier !== expectedMove || (wire.warmth === true && wire.active !== true)) return null;
  return value as BiomeState;
}

export function arhokFrostStageLabel(state: BiomeState): string {
  if (state.warmth) return 'Aquecendo';
  if (state.stage === 'frostbitten') return 'Congelamento severo';
  if (state.stage === 'chilled') return 'Frio crescente';
  return state.active ? 'Exposição ao frio' : 'Temperatura estável';
}

export function arhokFrostColor(state: BiomeState): string {
  return state.warmth ? ARHOK_FROST_PALETTE.warmth : ARHOK_FROST_PALETTE[state.stage];
}
