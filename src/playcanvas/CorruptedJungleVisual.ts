import * as pc from 'playcanvas';

import { CORRUPTED_JUNGLE_PALETTE } from '../shared/CorruptedJungle';
import type { CorruptedJungleState, SporePodState } from '../shared/types';
import { colorFromCss, type PcWorld } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

interface SporePodVisual {
  root: pc.Entity;
  cap: pc.Entity;
  ring: pc.Entity;
  motes: pc.Entity[];
  state: SporePodState;
}

export interface CorruptedJungleVisual {
  root: pc.Entity;
  pods: Map<string, SporePodVisual>;
  state: CorruptedJungleState;
  materials: Record<'dormant' | 'warning' | 'active', pc.Material>;
}

export function createCorruptedJungleVisual(world: VisualWorld, state: CorruptedJungleState, parent: pc.Entity): CorruptedJungleVisual {
  const root = new pc.Entity('corrupted-jungle-authoritative-flora', world.app);
  parent.addChild(root);
  const stem = world.material('corrupted-spore-stem', 0x35452f, { gloss: 0.18 });
  const cap = world.material('corrupted-spore-cap', 0x75518b, { gloss: 0.42, emissive: colorFromCss(CORRUPTED_JUNGLE_PALETTE.active), emissiveIntensity: 0.32 });
  const ringMaterials = {
    dormant: world.material('corrupted-spore-ring-dormant', CORRUPTED_JUNGLE_PALETTE.dormant, { opacity: 0.22, unlit: true, depthWrite: false }),
    warning: world.material('corrupted-spore-ring-warning', CORRUPTED_JUNGLE_PALETTE.warning, { emissive: colorFromCss(CORRUPTED_JUNGLE_PALETTE.warning), emissiveIntensity: 1.2, opacity: 0.62, additive: true, unlit: true, depthWrite: false }),
    active: world.material('corrupted-spore-ring-active', CORRUPTED_JUNGLE_PALETTE.active, { emissive: colorFromCss(CORRUPTED_JUNGLE_PALETTE.active), emissiveIntensity: 1.7, opacity: 0.72, additive: true, unlit: true, depthWrite: false }),
  };
  const core = world.material('corrupted-spore-mote', CORRUPTED_JUNGLE_PALETTE.core, { emissive: colorFromCss(CORRUPTED_JUNGLE_PALETTE.core), emissiveIntensity: 1.8, opacity: 0.72, additive: true, unlit: true, depthWrite: false });
  const pods = new Map<string, SporePodVisual>();
  for (const statePod of state.pods) {
    const podRoot = new pc.Entity(`corrupted-spore-${statePod.id}`, world.app);
    podRoot.setLocalPosition(statePod.position.x, statePod.position.y, statePod.position.z);
    root.addChild(podRoot);
    world.createPrimitive(`corrupted-spore-stem-${statePod.id}`, 'cone', stem, { x: 0, y: 0.65, z: 0 }, { x: 0.48, y: 1.3, z: 0.48 }, podRoot);
    const capEntity = world.createPrimitive(`corrupted-spore-cap-${statePod.id}`, 'sphere', cap, { x: 0, y: 1.42, z: 0 }, { x: 1.0, y: 0.48, z: 1.0 }, podRoot);
    const ring = world.createPrimitive(`corrupted-spore-ring-${statePod.id}`, 'torus', ringMaterials[statePod.phase], { x: 0, y: 0.07, z: 0 }, { x: statePod.radius, y: 0.03, z: statePod.radius }, podRoot);
    const motes: pc.Entity[] = [];
    for (let index = 0; index < 8; index++) {
      motes.push(world.createPrimitive(`corrupted-spore-mote-${statePod.id}-${index}`, 'sphere', core, { x: 0, y: 0, z: 0 }, { x: 0.07, y: 0.07, z: 0.07 }, podRoot));
    }
    pods.set(statePod.id, { root: podRoot, cap: capEntity, ring, motes, state: statePod });
  }
  const visual = { root, pods, state, materials: ringMaterials };
  updateCorruptedJungleVisual(visual, state, 0);
  return visual;
}

export function updateCorruptedJungleVisual(
  visual: CorruptedJungleVisual,
  state: CorruptedJungleState,
  time: number,
): void {
  visual.state = state;
  for (const podState of state.pods) {
    const pod = visual.pods.get(podState.id);
    if (!pod) continue;
    pod.state = podState;
    if (pod.ring.render) pod.ring.render.material = visual.materials[podState.phase];
    pod.root.enabled = true;
    const urgency = podState.phase === 'active' ? 1 : podState.phase === 'warning' ? 0.65 : 0.2;
    const pulse = 1 + Math.sin(time * (3.2 + urgency * 5.2) + podState.position.x) * (0.04 + urgency * 0.12);
    pod.cap.setLocalScale(1.0 * pulse, 0.48 / pulse, 1.0 * pulse);
    pod.ring.setLocalScale(podState.radius * pulse, 0.03, podState.radius * pulse);
    pod.ring.setLocalEulerAngles(0, time * (podState.phase === 'active' ? 48 : 20), 0);
    for (let index = 0; index < pod.motes.length; index++) {
      const mote = pod.motes[index];
      mote.enabled = podState.phase !== 'dormant';
      const angle = time * (0.8 + urgency) + index / pod.motes.length * Math.PI * 2;
      const radius = 0.8 + (index % 3) * 0.45 + urgency * 0.35;
      mote.setLocalPosition(Math.sin(angle) * radius, 0.55 + ((time * 0.7 + index * 0.17) % 1) * 1.8, Math.cos(angle) * radius);
    }
  }
}

export function destroyCorruptedJungleVisual(visual: CorruptedJungleVisual): void {
  visual.root.destroy();
}
