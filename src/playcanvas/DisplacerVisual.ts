import * as pc from 'playcanvas';

import { DISPLACER_PALETTE } from '../shared/Displacers';
import type { DisplacerState } from '../shared/types';
import { colorFromCss, type PcWorld } from './PcWorld';

type DisplacerVisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

export interface DisplacerVisual {
  readonly root: pc.Entity;
  readonly activeRoot: pc.Entity;
  readonly lockedRoot: pc.Entity;
  readonly currentRoot: pc.Entity;
  readonly orbitRings: readonly pc.Entity[];
  state: DisplacerState;
  phase: number;
}

function group(world: DisplacerVisualWorld, name: string, parent: pc.Entity): pc.Entity {
  const entity = new pc.Entity(name, world.app);
  parent.addChild(entity);
  return entity;
}

function buildEnergyState(
  world: DisplacerVisualWorld,
  parent: pc.Entity,
  key: string,
  color: string,
  emissiveIntensity: number,
): pc.Entity[] {
  const glowColor = colorFromCss(color);
  const crystal = world.material(`displacer-${key}-crystal`, color, {
    gloss: 0.9,
    metalness: 0.18,
    emissive: glowColor,
    emissiveIntensity,
  });
  const halo = world.material(`displacer-${key}-halo`, color, {
    additive: true,
    opacity: 0.48,
    unlit: true,
    depthWrite: false,
    emissive: glowColor,
    emissiveIntensity: emissiveIntensity * 1.2,
  });
  world.createPrimitive(`${key}-core`, 'cone', crystal, { x: 0, y: 1.35, z: 0 }, { x: 0.46, y: 1.48, z: 0.46 }, parent);
  world.createPrimitive(`${key}-heart`, 'sphere', halo, { x: 0, y: 1.42, z: 0 }, { x: 0.3, y: 0.3, z: 0.3 }, parent);
  const rings: pc.Entity[] = [];
  for (let index = 0; index < 2; index++) {
    const ring = world.createPrimitive(
      `${key}-orbit-${index}`,
      'torus',
      halo,
      { x: 0, y: 1.18 + index * 0.54, z: 0 },
      { x: 0.72 + index * 0.15, y: 0.035, z: 0.72 + index * 0.15 },
      parent,
    );
    ring.setLocalEulerAngles(index === 0 ? 18 : -22, index === 0 ? 0 : 52, index === 0 ? 13 : -18);
    rings.push(ring);
  }
  return rings;
}

/** Totem inteiramente procedural: nao depende de download nem de asset externo. */
export function createDisplacerVisual(
  world: DisplacerVisualWorld,
  state: DisplacerState,
  parent: pc.Entity,
): DisplacerVisual {
  const root = group(world, `displacer-${state.id}`, parent);
  root.setLocalPosition(state.position.x, state.position.y, state.position.z);

  const stone = world.material('displacer-stone', 0x27323b, { gloss: 0.16, metalness: 0.12 });
  const metal = world.material('displacer-metal', 0x718596, { gloss: 0.68, metalness: 0.74 });
  world.createPrimitive('displacer-base', 'cylinder', stone, { x: 0, y: 0.12, z: 0 }, { x: 1.42, y: 0.24, z: 1.42 }, root);
  world.createPrimitive('displacer-plinth', 'cylinder', metal, { x: 0, y: 0.31, z: 0 }, { x: 1.02, y: 0.18, z: 1.02 }, root);
  for (let index = 0; index < 3; index++) {
    const angle = index / 3 * Math.PI * 2;
    const pillar = world.createPrimitive(
      `displacer-pillar-${index}`,
      'box',
      index % 2 === 0 ? stone : metal,
      { x: Math.sin(angle) * 0.68, y: 0.78, z: Math.cos(angle) * 0.68 },
      { x: 0.22, y: 1.02, z: 0.22 },
      root,
    );
    pillar.setLocalEulerAngles(-8, angle * 180 / Math.PI, index % 2 === 0 ? 6 : -6);
  }

  const lockedRoot = group(world, `${state.id}-locked`, root);
  const locked = world.material('displacer-locked-core', DISPLACER_PALETTE.locked, {
    gloss: 0.38,
    metalness: 0.28,
    emissive: colorFromCss(DISPLACER_PALETTE.locked),
    emissiveIntensity: 0.08,
  });
  world.createPrimitive('locked-core', 'cone', locked, { x: 0, y: 1.3, z: 0 }, { x: 0.4, y: 1.28, z: 0.4 }, lockedRoot);
  world.createPrimitive('locked-seal', 'torus', locked, { x: 0, y: 0.12, z: 0 }, { x: 1.1, y: 0.045, z: 1.1 }, lockedRoot);

  const activeRoot = group(world, `${state.id}-active`, root);
  const activeRings = buildEnergyState(
    world,
    activeRoot,
    'active',
    state.zone === 'dungeon' ? DISPLACER_PALETTE.dungeon : DISPLACER_PALETTE.active,
    1.15,
  );
  const currentRoot = group(world, `${state.id}-current`, root);
  const currentRings = buildEnergyState(world, currentRoot, 'current', DISPLACER_PALETTE.current, 1.4);
  const visual: DisplacerVisual = {
    root,
    activeRoot,
    lockedRoot,
    currentRoot,
    orbitRings: [...activeRings, ...currentRings],
    state,
    phase: [...state.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.013,
  };
  updateDisplacerVisual(visual, state, 0);
  return visual;
}

export function updateDisplacerVisual(visual: DisplacerVisual, state: DisplacerState, time: number): void {
  visual.state = state;
  visual.lockedRoot.enabled = !state.activated;
  visual.activeRoot.enabled = state.activated && !state.current;
  visual.currentRoot.enabled = state.current && state.activated;
  for (let index = 0; index < visual.orbitRings.length; index++) {
    const ring = visual.orbitRings[index];
    const direction = index % 2 === 0 ? 1 : -1;
    ring.setLocalEulerAngles(
      index % 2 === 0 ? 18 : -22,
      (time * (42 + index * 5) * direction + visual.phase * 57.3) % 360,
      index % 2 === 0 ? 13 : -18,
    );
  }
  const pulse = 1 + Math.sin(time * 2.8 + visual.phase) * (state.current ? 0.045 : 0.022);
  visual.root.setLocalScale(pulse, 1 + (pulse - 1) * 0.55, pulse);
}

export function destroyDisplacerVisual(visual: DisplacerVisual): void {
  visual.root.destroy();
}
