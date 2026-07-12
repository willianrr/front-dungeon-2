import * as pc from 'playcanvas';

import { TREASURE_LODE_PALETTE } from '../shared/TreasureLode';
import type { TreasureLodeState } from '../shared/types';
import { colorFromCss, type PcWorld } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

export interface TreasureLodeVisual {
  root: pc.Entity;
  dormantRoot: pc.Entity;
  dangerRoot: pc.Entity;
  rewardRoot: pc.Entity;
  cooldownRoot: pc.Entity;
  dangerRings: pc.Entity[];
  chest: pc.Entity;
  state: TreasureLodeState;
}

function group(world: VisualWorld, name: string, parent: pc.Entity): pc.Entity {
  const entity = new pc.Entity(name, world.app);
  parent.addChild(entity);
  return entity;
}

function glowMaterial(world: VisualWorld, key: string, color: string, intensity: number): pc.StandardMaterial {
  const value = colorFromCss(color);
  return world.material(`treasure-lode-${key}`, color, {
    emissive: value, emissiveIntensity: intensity, opacity: 0.58,
    additive: true, unlit: true, depthWrite: false,
  });
}

export function createTreasureLodeVisual(world: VisualWorld, state: TreasureLodeState, parent: pc.Entity): TreasureLodeVisual {
  const root = group(world, 'treasure-lode-ironwood', parent);
  root.setLocalPosition(state.center.x, state.center.y, state.center.z);
  const stone = world.material('treasure-lode-stone', 0x3b3430, { gloss: 0.15, metalness: 0.15 });
  const iron = world.material('treasure-lode-iron', 0x8f7560, { gloss: 0.62, metalness: 0.72 });
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * Math.PI * 2;
    const marker = world.createPrimitive(
      `treasure-lode-boundary-${index}`,
      index % 2 === 0 ? 'box' : 'cone',
      index % 2 === 0 ? stone : iron,
      { x: Math.sin(angle) * state.arenaRadius, y: 0.2, z: Math.cos(angle) * state.arenaRadius },
      { x: 0.22, y: index % 2 === 0 ? 0.42 : 0.65, z: 0.22 },
      root,
    );
    marker.setLocalEulerAngles(0, angle * 180 / Math.PI, index % 2 === 0 ? 8 : 0);
  }

  const dormantRoot = group(world, 'treasure-lode-dormant', root);
  const dormant = glowMaterial(world, 'dormant', TREASURE_LODE_PALETTE.dormant, 0.75);
  world.createPrimitive('treasure-lode-dormant-ring', 'torus', dormant, { x: 0, y: 0.08, z: 0 }, { x: 2.0, y: 0.025, z: 2.0 }, dormantRoot);

  const dangerRoot = group(world, 'treasure-lode-danger', root);
  const danger = glowMaterial(world, 'danger', TREASURE_LODE_PALETTE.danger, 1.5);
  const dangerRings = [0, 1].map((index) => world.createPrimitive(
    `treasure-lode-danger-ring-${index}`,
    'torus', danger, { x: 0, y: 0.09 + index * 0.035, z: 0 },
    { x: state.arenaRadius - index * 0.55, y: 0.035, z: state.arenaRadius - index * 0.55 }, dangerRoot,
  ));

  const rewardRoot = group(world, 'treasure-lode-reward', root);
  const reward = glowMaterial(world, 'reward', TREASURE_LODE_PALETTE.reward, 1.55);
  world.createPrimitive('treasure-lode-reward-ring', 'torus', reward, { x: 0, y: 0.1, z: 0 }, { x: 2.5, y: 0.035, z: 2.5 }, rewardRoot);
  const chest = group(world, 'treasure-lode-mineral-chest', rewardRoot);
  chest.setLocalPosition(
    state.chestPosition.x - state.center.x,
    state.chestPosition.y - state.center.y,
    state.chestPosition.z - state.center.z,
  );
  world.createPrimitive('mineral-chest-base', 'box', stone, { x: 0, y: 0.36, z: 0 }, { x: 1.25, y: 0.55, z: 0.78 }, chest);
  const lid = world.createPrimitive('mineral-chest-lid', 'box', iron, { x: 0, y: 0.72, z: -0.04 }, { x: 1.28, y: 0.28, z: 0.82 }, chest);
  lid.setLocalEulerAngles(-8, 0, 0);
  world.createPrimitive('mineral-chest-lock', 'box', reward, { x: 0, y: 0.48, z: 0.43 }, { x: 0.22, y: 0.28, z: 0.08 }, chest);

  const cooldownRoot = group(world, 'treasure-lode-cooldown', root);
  const cooldown = glowMaterial(world, 'cooldown', TREASURE_LODE_PALETTE.cooldown, 0.32);
  world.createPrimitive('treasure-lode-cooldown-ring', 'torus', cooldown, { x: 0, y: 0.06, z: 0 }, { x: 1.55, y: 0.02, z: 1.55 }, cooldownRoot);

  const visual = { root, dormantRoot, dangerRoot, rewardRoot, cooldownRoot, dangerRings, chest, state };
  updateTreasureLodeVisual(visual, state, 0);
  return visual;
}

export function updateTreasureLodeVisual(visual: TreasureLodeVisual, state: TreasureLodeState, time: number): void {
  visual.state = state;
  visual.dormantRoot.enabled = state.phase === 'dormant';
  visual.dangerRoot.enabled = state.phase === 'wave' || state.phase === 'intermission';
  visual.rewardRoot.enabled = state.phase === 'reward';
  visual.cooldownRoot.enabled = state.phase === 'cooldown';
  for (let index = 0; index < visual.dangerRings.length; index++) {
    const ring = visual.dangerRings[index];
    const base = state.arenaRadius - index * 0.55;
    const pulse = 1 + Math.sin(time * 5.2 + index * Math.PI) * 0.025;
    ring.setLocalScale(base * pulse, 0.035, base * pulse);
    ring.setLocalEulerAngles(0, time * (index === 0 ? 28 : -34), 0);
  }
  const chestPulse = 1 + Math.sin(time * 3.4) * 0.035;
  visual.chest.setLocalScale(chestPulse, chestPulse, chestPulse);
}

export function destroyTreasureLodeVisual(visual: TreasureLodeVisual): void {
  visual.root.destroy();
}
