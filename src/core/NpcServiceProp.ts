import type { NpcKind } from '../shared/types';
import type { MovementBlocker } from './MovementCollision';

export type NpcServicePropPrimitive = 'box' | 'cone' | 'cylinder' | 'sphere' | 'torus';
export type NpcServicePropAmbient = 'bob' | 'spin' | 'pulse' | 'sway' | 'flicker';

export interface NpcServicePropPart {
  id: string;
  primitive: NpcServicePropPrimitive;
  color: number;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  opacity?: number;
  additive?: boolean;
  unlit?: boolean;
  blockerRadius?: number;
  ambient?: NpcServicePropAmbient;
  ambientPhase?: number;
}

export interface NpcServicePropBlockerInput {
  kind: NpcKind;
  x: number;
  z: number;
  rotationY: number;
}

export interface NpcServicePropVisualInput {
  active?: boolean;
  pending?: boolean;
  selected?: boolean;
  nearby?: boolean;
  time?: number;
}

export interface NpcServicePropVisualState {
  scale: number;
  lift: number;
}

export interface NpcServicePropPartVisualInput extends NpcServicePropVisualInput {
  part: NpcServicePropPart;
}

export interface NpcServicePropPartVisualState {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

const COMMON_WOOD = 0x6f4a2e;
const COMMON_GOLD = 0xffd874;
const COMMON_STONE = 0x6f7480;

const PROP_PARTS: Record<NpcKind, NpcServicePropPart[]> = {
  vendor: [
    { id: 'counter', primitive: 'box', color: COMMON_WOOD, position: { x: -1.05, y: 0.42, z: 0.64 }, scale: { x: 1.25, y: 0.32, z: 0.62 }, blockerRadius: 0.46 },
    { id: 'awning', primitive: 'box', color: 0xd29b43, position: { x: -1.05, y: 1.18, z: 0.64 }, scale: { x: 1.38, y: 0.12, z: 0.74 } },
    { id: 'coin-stack', primitive: 'sphere', color: COMMON_GOLD, position: { x: -0.56, y: 0.72, z: 0.44 }, scale: { x: 0.16, y: 0.08, z: 0.16 }, unlit: true, ambient: 'spin', ambientPhase: 0.4 },
  ],
  quest: [
    { id: 'plinth', primitive: 'cylinder', color: COMMON_STONE, position: { x: -0.98, y: 0.38, z: 0.54 }, scale: { x: 0.5, y: 0.76, z: 0.5 }, blockerRadius: 0.34 },
    { id: 'scroll', primitive: 'box', color: 0xe7d8aa, position: { x: -0.98, y: 0.83, z: 0.54 }, scale: { x: 0.62, y: 0.05, z: 0.38 }, rotation: { x: 0, y: 18, z: 0 } },
    { id: 'quest-spark', primitive: 'sphere', color: 0x8dffb2, position: { x: -0.98, y: 1.22, z: 0.54 }, scale: { x: 0.13, y: 0.13, z: 0.13 }, opacity: 0.72, additive: true, unlit: true, ambient: 'bob', ambientPhase: 1.1 },
  ],
  healer: [
    { id: 'altar', primitive: 'cylinder', color: 0x436a78, position: { x: -1.0, y: 0.32, z: 0.58 }, scale: { x: 0.52, y: 0.64, z: 0.52 }, blockerRadius: 0.36 },
    { id: 'cross-vertical', primitive: 'box', color: 0x76e2ff, position: { x: -1.0, y: 1.04, z: 0.58 }, scale: { x: 0.12, y: 0.5, z: 0.08 }, opacity: 0.86, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 0.2 },
    { id: 'cross-horizontal', primitive: 'box', color: 0x76e2ff, position: { x: -1.0, y: 1.04, z: 0.58 }, scale: { x: 0.42, y: 0.12, z: 0.08 }, opacity: 0.86, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 0.2 },
  ],
  blacksmith: [
    // Oficina completa atras do Borin. O eixo Z negativo e o fundo do NPC:
    // assim a fornalha ganha silhueta propria sem ocupar a area de abordagem.
    { id: 'forge-foundation', primitive: 'cylinder', color: 0x3b3531, position: { x: 0, y: 0.08, z: -2.38 }, scale: { x: 3.05, y: 0.16, z: 2.25 } },
    { id: 'forge-foundation-rim', primitive: 'torus', color: 0x8b6444, position: { x: 0, y: 0.18, z: -2.38 }, scale: { x: 2.72, y: 0.055, z: 1.92 } },

    // Corpo de pedra e ferro, com a boca voltada para o Borin/jogador.
    { id: 'forge-body', primitive: 'box', color: 0x433b38, position: { x: 0.52, y: 0.77, z: -2.55 }, scale: { x: 1.34, y: 1.34, z: 1.02 }, blockerRadius: 0.82 },
    { id: 'forge-left-pillar', primitive: 'box', color: 0x5b504a, position: { x: 0.03, y: 0.77, z: -1.99 }, scale: { x: 0.3, y: 1.16, z: 0.22 } },
    { id: 'forge-right-pillar', primitive: 'box', color: 0x5b504a, position: { x: 1.01, y: 0.77, z: -1.99 }, scale: { x: 0.3, y: 1.16, z: 0.22 } },
    { id: 'forge-lintel', primitive: 'box', color: 0x6d5c51, position: { x: 0.52, y: 1.38, z: -1.99 }, scale: { x: 1.28, y: 0.3, z: 0.24 } },
    { id: 'forge-iron-band', primitive: 'box', color: 0x68717a, position: { x: 0.52, y: 1.05, z: -3.08 }, scale: { x: 1.43, y: 0.13, z: 1.08 } },
    { id: 'forge-mouth', primitive: 'box', color: 0x130f0e, position: { x: 0.52, y: 0.72, z: -1.865 }, scale: { x: 0.72, y: 0.72, z: 0.065 } },
    { id: 'forge-inner-glow', primitive: 'box', color: 0xff672e, position: { x: 0.52, y: 0.7, z: -1.825 }, scale: { x: 0.56, y: 0.54, z: 0.035 }, opacity: 0.7, additive: true, unlit: true, ambient: 'flicker', ambientPhase: 0.7 },
    { id: 'forge-lip', primitive: 'box', color: 0x9a6542, position: { x: 0.52, y: 0.34, z: -1.78 }, scale: { x: 0.92, y: 0.16, z: 0.34 } },
    { id: 'forge-coals', primitive: 'sphere', color: 0xff4d22, position: { x: 0.52, y: 0.43, z: -1.65 }, scale: { x: 0.52, y: 0.12, z: 0.22 }, opacity: 0.82, additive: true, unlit: true, ambient: 'flicker', ambientPhase: 1.2 },
    { id: 'forge-flame-main', primitive: 'cone', color: 0xffbd52, position: { x: 0.52, y: 0.76, z: -1.61 }, scale: { x: 0.3, y: 0.7, z: 0.22 }, opacity: 0.9, additive: true, unlit: true, ambient: 'flicker', ambientPhase: 2.4 },
    { id: 'forge-flame-core', primitive: 'cone', color: 0xfff0a1, position: { x: 0.52, y: 0.68, z: -1.57 }, scale: { x: 0.13, y: 0.42, z: 0.11 }, opacity: 0.92, additive: true, unlit: true, ambient: 'flicker', ambientPhase: 4.1 },

    // Chamine alta: torna o servico reconhecivel mesmo com a camera afastada.
    { id: 'forge-chimney-base', primitive: 'cylinder', color: 0x3c4147, position: { x: 0.52, y: 1.82, z: -2.58 }, scale: { x: 0.4, y: 1.14, z: 0.4 } },
    { id: 'forge-chimney-top', primitive: 'cylinder', color: 0x505860, position: { x: 0.52, y: 2.5, z: -2.58 }, scale: { x: 0.3, y: 0.46, z: 0.3 } },
    { id: 'forge-chimney-cap', primitive: 'cylinder', color: 0x727b84, position: { x: 0.52, y: 2.77, z: -2.58 }, scale: { x: 0.5, y: 0.12, z: 0.5 } },

    // Estacao de trabalho: bigorna, martelo, tanque e amostra das tres barras.
    { id: 'anvil-base', primitive: 'box', color: 0x454d57, position: { x: -0.78, y: 0.38, z: -1.98 }, scale: { x: 0.68, y: 0.5, z: 0.55 }, blockerRadius: 0.46 },
    { id: 'anvil-top', primitive: 'box', color: 0x87929e, position: { x: -0.78, y: 0.71, z: -1.98 }, scale: { x: 1.08, y: 0.22, z: 0.5 } },
    { id: 'anvil-horn', primitive: 'cone', color: 0x87929e, position: { x: -1.38, y: 0.71, z: -1.98 }, scale: { x: 0.24, y: 0.62, z: 0.24 }, rotation: { x: 0, y: 0, z: 90 } },
    { id: 'quench-trough', primitive: 'box', color: 0x4d3527, position: { x: -1.22, y: 0.35, z: -2.88 }, scale: { x: 0.78, y: 0.54, z: 0.86 }, blockerRadius: 0.48 },
    { id: 'quench-water', primitive: 'box', color: 0x65c7dd, position: { x: -1.22, y: 0.64, z: -2.88 }, scale: { x: 0.66, y: 0.035, z: 0.72 }, opacity: 0.62, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 1.7 },
    { id: 'ingot-copper', primitive: 'box', color: 0xc87945, position: { x: -0.98, y: 0.88, z: -2.28 }, scale: { x: 0.42, y: 0.1, z: 0.18 }, rotation: { x: 0, y: -12, z: 0 } },
    { id: 'ingot-iron', primitive: 'box', color: 0xb9c4cb, position: { x: -0.56, y: 0.88, z: -2.3 }, scale: { x: 0.42, y: 0.1, z: 0.18 }, rotation: { x: 0, y: 4, z: 0 } },
    { id: 'ingot-mithril', primitive: 'box', color: 0x65dce9, position: { x: -0.13, y: 0.88, z: -2.29 }, scale: { x: 0.42, y: 0.1, z: 0.18 }, rotation: { x: 0, y: 15, z: 0 }, unlit: true, ambient: 'pulse', ambientPhase: 2.8 },

    { id: 'forge-spark-left', primitive: 'sphere', color: 0xffdf93, position: { x: 0.34, y: 1.13, z: -1.52 }, scale: { x: 0.05, y: 0.05, z: 0.05 }, opacity: 0.82, additive: true, unlit: true, ambient: 'bob', ambientPhase: 0.3 },
    { id: 'forge-spark-center', primitive: 'sphere', color: 0xffa45c, position: { x: 0.59, y: 1.28, z: -1.55 }, scale: { x: 0.04, y: 0.04, z: 0.04 }, opacity: 0.76, additive: true, unlit: true, ambient: 'bob', ambientPhase: 1.4 },
    { id: 'forge-spark-right', primitive: 'sphere', color: 0xffc36f, position: { x: 0.78, y: 1.05, z: -1.5 }, scale: { x: 0.045, y: 0.045, z: 0.045 }, opacity: 0.8, additive: true, unlit: true, ambient: 'bob', ambientPhase: 2.4 },
  ],
  trainer: [
    { id: 'banner-pole', primitive: 'cylinder', color: 0x6d5a3b, position: { x: -1.04, y: 0.78, z: 0.62 }, scale: { x: 0.08, y: 1.56, z: 0.08 } },
    { id: 'banner-cloth', primitive: 'box', color: 0xb8f27a, position: { x: -0.82, y: 1.34, z: 0.62 }, scale: { x: 0.46, y: 0.66, z: 0.06 }, ambient: 'sway', ambientPhase: 1.7 },
    { id: 'practice-post', primitive: 'cylinder', color: 0x8a6a44, position: { x: -1.42, y: 0.45, z: 0.46 }, scale: { x: 0.16, y: 0.9, z: 0.16 }, blockerRadius: 0.22 },
  ],
  travel: [
    { id: 'left-pillar', primitive: 'box', color: COMMON_STONE, position: { x: -1.2, y: 0.86, z: 0.68 }, scale: { x: 0.18, y: 1.45, z: 0.2 }, blockerRadius: 0.2 },
    { id: 'right-pillar', primitive: 'box', color: COMMON_STONE, position: { x: -0.56, y: 0.86, z: 0.68 }, scale: { x: 0.18, y: 1.45, z: 0.2 }, blockerRadius: 0.2 },
    { id: 'portal-glow', primitive: 'box', color: 0x9fddff, position: { x: -0.88, y: 0.88, z: 0.72 }, scale: { x: 0.48, y: 1.1, z: 0.04 }, opacity: 0.62, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 2.1 },
  ],
  jeweler: [
    { id: 'gem-stand', primitive: 'cylinder', color: 0x51405c, position: { x: -1.0, y: 0.32, z: 0.58 }, scale: { x: 0.42, y: 0.64, z: 0.42 }, blockerRadius: 0.32 },
    { id: 'gem', primitive: 'cone', color: 0xff9fd8, position: { x: -1.0, y: 0.82, z: 0.58 }, scale: { x: 0.32, y: 0.48, z: 0.32 }, rotation: { x: 180, y: 0, z: 0 }, unlit: true, ambient: 'spin', ambientPhase: 1.3 },
    { id: 'gem-glow', primitive: 'sphere', color: 0xff9fd8, position: { x: -1.0, y: 0.84, z: 0.58 }, scale: { x: 0.36, y: 0.18, z: 0.36 }, opacity: 0.28, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 1.3 },
  ],
  banker: [
    { id: 'vault-box', primitive: 'box', color: 0x4c3b71, position: { x: -1.02, y: 0.36, z: 0.58 }, scale: { x: 0.76, y: 0.46, z: 0.52 }, blockerRadius: 0.42 },
    { id: 'vault-lid', primitive: 'box', color: 0xd8c6ff, position: { x: -1.02, y: 0.68, z: 0.58 }, scale: { x: 0.82, y: 0.14, z: 0.56 } },
    { id: 'lock', primitive: 'box', color: COMMON_GOLD, position: { x: -1.02, y: 0.52, z: 0.28 }, scale: { x: 0.2, y: 0.18, z: 0.08 }, unlit: true, ambient: 'pulse', ambientPhase: 2.8 },
  ],
  guard: [
    { id: 'watch-post', primitive: 'cylinder', color: 0x6d5a3b, position: { x: -1.04, y: 0.64, z: 0.6 }, scale: { x: 0.12, y: 1.28, z: 0.12 }, blockerRadius: 0.18 },
    { id: 'shield', primitive: 'box', color: 0x40526b, position: { x: -1.04, y: 1.16, z: 0.42 }, scale: { x: 0.54, y: 0.42, z: 0.08 }, ambient: 'sway', ambientPhase: 0.9 },
    { id: 'beacon', primitive: 'sphere', color: 0xf0c36a, position: { x: -1.04, y: 1.52, z: 0.6 }, scale: { x: 0.16, y: 0.16, z: 0.16 }, opacity: 0.66, additive: true, unlit: true, ambient: 'pulse', ambientPhase: 1.6 },
  ],
};

export function npcServicePropParts(kind: NpcKind): readonly NpcServicePropPart[] {
  return PROP_PARTS[kind];
}

export function npcServicePropBlockers(input: NpcServicePropBlockerInput): MovementBlocker[] {
  const sin = Math.sin(input.rotationY);
  const cos = Math.cos(input.rotationY);
  return PROP_PARTS[input.kind]
    .filter((part) => part.blockerRadius !== undefined && part.blockerRadius > 0)
    .map((part) => ({
      x: input.x + part.position.x * cos + part.position.z * sin,
      z: input.z - part.position.x * sin + part.position.z * cos,
      radius: part.blockerRadius as number,
    }));
}

export function npcServicePropVisualState(input: NpcServicePropVisualInput): NpcServicePropVisualState {
  const emphasis = input.active || input.pending
    ? 1
    : input.selected
      ? 0.72
      : input.nearby
        ? 0.45
        : 0;
  if (emphasis <= 0) return { scale: 1, lift: 0 };

  const time = input.time ?? 0;
  const speed = input.active || input.pending ? 4.4 : 3.1;
  const pulse = (Math.sin(time * speed) + 1) * 0.5;
  return {
    scale: 1 + emphasis * 0.045 + pulse * emphasis * 0.018,
    lift: emphasis * 0.024 + pulse * emphasis * 0.018,
  };
}

function servicePropEmphasis(input: NpcServicePropVisualInput): number {
  if (input.active || input.pending) return 1;
  if (input.selected) return 0.72;
  if (input.nearby) return 0.45;
  return 0;
}

export function npcServicePropPartVisualState(input: NpcServicePropPartVisualInput): NpcServicePropPartVisualState {
  const part = input.part;
  const time = input.time ?? 0;
  const phase = part.ambientPhase ?? 0;
  const emphasis = servicePropEmphasis(input);
  const wave = Math.sin(time * 2.7 + phase);
  const pulse = (wave + 1) * 0.5;
  const position = { ...part.position };
  const scale = { ...part.scale };
  const rotation = {
    x: part.rotation?.x ?? 0,
    y: part.rotation?.y ?? 0,
    z: part.rotation?.z ?? 0,
  };

  if (part.ambient === 'bob') {
    position.y += (0.035 + emphasis * 0.025) * wave;
    const boost = 1 + (0.035 + emphasis * 0.025) * pulse;
    scale.x *= boost;
    scale.y *= boost;
    scale.z *= boost;
  } else if (part.ambient === 'spin') {
    rotation.y += time * (46 + emphasis * 34);
    position.y += Math.sin(time * 2.2 + phase) * (0.015 + emphasis * 0.012);
  } else if (part.ambient === 'pulse') {
    const boost = 1 + (0.045 + emphasis * 0.045) * pulse;
    scale.x *= boost;
    scale.y *= boost;
    scale.z *= boost;
  } else if (part.ambient === 'sway') {
    rotation.z += Math.sin(time * 1.7 + phase) * (3.5 + emphasis * 2.2);
  } else if (part.ambient === 'flicker') {
    const jitter = (Math.sin(time * 8.7 + phase) + Math.sin(time * 13.1 + phase * 0.7)) * 0.5;
    const boost = 1 + (0.07 + emphasis * 0.04) * Math.max(-0.45, jitter);
    position.y += (0.012 + emphasis * 0.012) * Math.max(0, jitter);
    scale.x *= boost;
    scale.y *= boost;
    scale.z *= boost;
  }

  return { position, scale, rotation };
}
