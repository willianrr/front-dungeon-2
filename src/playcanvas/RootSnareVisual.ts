import * as pc from 'playcanvas';

import { ROOT_SNARE_PALETTE } from '../shared/RootSnare';
import type { ControlZoneState } from '../shared/types';
import { colorFromCss, type PcWorld } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

export interface RootSnareVisual {
  root: pc.Entity;
  rings: pc.Entity[];
  vines: pc.Entity[];
  thorns: pc.Entity[];
  state: ControlZoneState;
  phase: number;
}

function hashPhase(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 6283) / 1000;
}

export function createRootSnareVisual(world: VisualWorld, state: ControlZoneState, parent: pc.Entity): RootSnareVisual {
  const root = new pc.Entity(`root-snare-zone-${state.id}`, world.app);
  root.setLocalPosition(state.position.x, state.position.y + 0.025, state.position.z);
  parent.addChild(root);
  const earth = world.material('root-snare-earth', ROOT_SNARE_PALETTE.soil, { opacity: 0.56, depthWrite: false });
  const green = colorFromCss(ROOT_SNARE_PALETTE.root);
  const vine = world.material('root-snare-vine', ROOT_SNARE_PALETTE.root, {
    emissive: green, emissiveIntensity: 0.55, opacity: 0.84, unlit: true, depthWrite: false,
  });
  const thornColor = colorFromCss(ROOT_SNARE_PALETTE.thorn);
  const thorn = world.material('root-snare-thorn', ROOT_SNARE_PALETTE.thorn, {
    emissive: thornColor, emissiveIntensity: 1.05, opacity: 0.9, additive: true, unlit: true, depthWrite: false,
  });
  const rings = [
    world.createPrimitive('root-snare-earth-ring', 'torus', earth, { x: 0, y: 0, z: 0 }, { x: state.radius, y: 0.045, z: state.radius }, root),
    world.createPrimitive('root-snare-vine-ring', 'torus', vine, { x: 0, y: 0.025, z: 0 }, { x: state.radius * 0.73, y: 0.035, z: state.radius * 0.73 }, root),
  ];
  const vines: pc.Entity[] = [];
  const thorns: pc.Entity[] = [];
  for (let index = 0; index < 12; index++) {
    const angle = index / 12 * Math.PI * 2 + (index % 3) * 0.11;
    const distance = state.radius * (0.28 + (index % 4) * 0.18);
    const height = 0.34 + (index % 3) * 0.16;
    const branch = world.createPrimitive(
      `root-snare-vine-${index}`, 'box', vine,
      { x: Math.sin(angle) * distance, y: height * 0.48, z: Math.cos(angle) * distance },
      { x: 0.09, y: height, z: 0.09 }, root,
    );
    branch.setLocalEulerAngles(Math.sin(angle) * 18, angle * 180 / Math.PI, Math.cos(angle) * 22);
    vines.push(branch);
    const spike = world.createPrimitive(
      `root-snare-thorn-${index}`, 'cone', thorn,
      { x: Math.sin(angle) * distance, y: height + 0.06, z: Math.cos(angle) * distance },
      { x: 0.1, y: 0.3, z: 0.1 }, root,
    );
    thorns.push(spike);
  }
  const visual = { root, rings, vines, thorns, state, phase: hashPhase(state.id) };
  updateRootSnareVisual(visual, state, 0);
  return visual;
}

export function updateRootSnareVisual(visual: RootSnareVisual, state: ControlZoneState, time: number): void {
  visual.state = state;
  const life = Math.max(0, Math.min(1, state.remaining / state.duration));
  const appear = Math.min(1, (state.duration - state.remaining + 0.12) / 0.32);
  const fade = Math.min(1, state.remaining / 0.4);
  const scale = Math.max(0.01, appear * fade);
  visual.root.setLocalPosition(state.position.x, state.position.y + 0.025, state.position.z);
  visual.root.setLocalScale(scale, scale, scale);
  visual.rings[0]?.setLocalEulerAngles(0, time * 22 + visual.phase * 10, 0);
  visual.rings[1]?.setLocalEulerAngles(0, -time * 31 - visual.phase * 13, 0);
  for (let index = 0; index < visual.vines.length; index++) {
    const pulse = 0.88 + Math.sin(time * 5.4 + visual.phase + index * 0.7) * 0.12;
    visual.vines[index].setLocalScale(0.09 * pulse, (0.34 + (index % 3) * 0.16) * Math.max(0.45, life), 0.09 * pulse);
    visual.thorns[index]?.setLocalEulerAngles(0, time * (index % 2 === 0 ? 24 : -28) + index * 30, 0);
  }
}

export function destroyRootSnareVisual(visual: RootSnareVisual): void {
  visual.root.destroy();
}
