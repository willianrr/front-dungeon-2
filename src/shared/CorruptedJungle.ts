import type { CorruptedJungleState, SporePodState } from './types';

export const CORRUPTED_JUNGLE_ID = 'ironwood-corrupted-jungle' as const;
export const CORRUPTED_JUNGLE_LABEL = 'Selva Corrompida de Ironwood' as const;
export const CORRUPTED_JUNGLE_BOUNDS = { minX: -94, maxX: -32, minZ: -58, maxZ: 12 } as const;
export const CORRUPTED_SPORE_RADIUS = 3.4 as const;
export const CORRUPTED_SPORE_WARNING_DURATION = 2;
export const CORRUPTED_SPORE_ACTIVE_DURATION = 1.5;

export const CORRUPTED_JUNGLE_PALETTE = {
  dormant: '#617659',
  warning: '#d7de6f',
  active: '#b56bda',
  sickness: '#8fbf69',
  core: '#f2d7ff',
} as const;

const PODS = [
  { id: 'spore-pod-gate', label: 'Sino Corrompido', x: -36, z: -12 },
  { id: 'spore-pod-hollow', label: 'Cálice Oco', x: -70, z: -35 },
  { id: 'spore-pod-mire', label: 'Broto do Lodo', x: -44, z: -48 },
  { id: 'spore-pod-ruin', label: 'Orquídea da Ruína', x: -82, z: -8 },
  { id: 'spore-pod-thorn', label: 'Flor Espinhosa', x: -58, z: -18 },
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

function podGate(value: unknown, index: number): SporePodState | null {
  const wire = record(value);
  const contract = PODS[index];
  if (!wire || !contract || wire.id !== contract.id || wire.label !== contract.label || !position(wire.position)
    || wire.radius !== CORRUPTED_SPORE_RADIUS || !['dormant', 'warning', 'active'].includes(String(wire.phase))
    || !finite(wire.timer) || wire.timer <= 0) return null;
  const point = wire.position as { x: number; y: number; z: number };
  if (point.x !== contract.x || point.z !== contract.z) return null;
  const maxTimer = wire.phase === 'active' ? CORRUPTED_SPORE_ACTIVE_DURATION
    : wire.phase === 'warning' ? CORRUPTED_SPORE_WARNING_DURATION : 4.5;
  if ((wire.timer as number) > maxTimer) return null;
  return value as SporePodState;
}

export function corruptedJunglePresentationGate(value: unknown): CorruptedJungleState | null {
  const wire = record(value);
  if (!wire || wire.version !== 1 || wire.id !== CORRUPTED_JUNGLE_ID || wire.label !== CORRUPTED_JUNGLE_LABEL
    || typeof wire.active !== 'boolean' || !Array.isArray(wire.pods) || wire.pods.length !== PODS.length) return null;
  const bounds = record(wire.bounds);
  if (!bounds || bounds.minX !== CORRUPTED_JUNGLE_BOUNDS.minX || bounds.maxX !== CORRUPTED_JUNGLE_BOUNDS.maxX
    || bounds.minZ !== CORRUPTED_JUNGLE_BOUNDS.minZ || bounds.maxZ !== CORRUPTED_JUNGLE_BOUNDS.maxZ) return null;
  if (wire.pods.some((pod, index) => podGate(pod, index) === null)) return null;
  return value as CorruptedJungleState;
}

export function nearestThreateningSporePod(state: CorruptedJungleState, position: { x: number; z: number }): SporePodState | null {
  const threatening = state.pods.filter((pod) => pod.phase !== 'dormant');
  threatening.sort((a, b) => {
    const da = Math.hypot(a.position.x - position.x, a.position.z - position.z);
    const db = Math.hypot(b.position.x - position.x, b.position.z - position.z);
    return da - db || a.id.localeCompare(b.id);
  });
  return threatening[0] ?? null;
}
