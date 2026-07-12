import * as pc from 'playcanvas';

import { COOPERATIVE_REVIVE_PALETTE, type ReviveChannelPresentation } from '../shared/CooperativeRevive';
import { colorFromCss, setYaw, type PcWorld } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

export interface CooperativeReviveVisual {
  root: pc.Entity;
  reviverRing: pc.Entity;
  targetRing: pc.Entity;
  tether: pc.Entity;
  presentation: ReviveChannelPresentation;
}

export function createCooperativeReviveVisual(
  world: VisualWorld,
  presentation: ReviveChannelPresentation,
  parent: pc.Entity,
): CooperativeReviveVisual {
  const root = new pc.Entity(`cooperative-revive-${presentation.reviver.id}`, world.app);
  parent.addChild(root);
  const channel = colorFromCss(COOPERATIVE_REVIVE_PALETTE.channel);
  const target = colorFromCss(COOPERATIVE_REVIVE_PALETTE.target);
  const channelMaterial = world.material('cooperative-revive-channel', COOPERATIVE_REVIVE_PALETTE.channel, {
    emissive: channel, emissiveIntensity: 1.35, opacity: 0.72, additive: true, unlit: true, depthWrite: false,
  });
  const targetMaterial = world.material('cooperative-revive-target', COOPERATIVE_REVIVE_PALETTE.target, {
    emissive: target, emissiveIntensity: 1.5, opacity: 0.78, additive: true, unlit: true, depthWrite: false,
  });
  const reviverRing = world.createPrimitive('cooperative-revive-reviver-ring', 'torus', channelMaterial, { x: 0, y: 0, z: 0 }, { x: 0.72, y: 0.028, z: 0.72 }, root);
  const targetRing = world.createPrimitive('cooperative-revive-target-ring', 'torus', targetMaterial, { x: 0, y: 0, z: 0 }, { x: 0.82, y: 0.035, z: 0.82 }, root);
  const tether = world.createPrimitive('cooperative-revive-tether', 'box', channelMaterial, { x: 0, y: 0, z: 0 }, { x: 0.04, y: 0.04, z: 1 }, root);
  const visual = { root, reviverRing, targetRing, tether, presentation };
  updateCooperativeReviveVisual(visual, presentation, 0);
  return visual;
}

export function updateCooperativeReviveVisual(
  visual: CooperativeReviveVisual,
  presentation: ReviveChannelPresentation,
  time: number,
): void {
  visual.presentation = presentation;
  const a = presentation.reviver.position;
  const b = presentation.target.position;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const distance = Math.max(0.001, Math.hypot(dx, dz));
  const pulse = 1 + Math.sin(time * 5.6) * 0.06;
  const progressScale = 0.72 + presentation.progress * 0.36;
  visual.reviverRing.setLocalPosition(a.x, a.y + 0.07, a.z);
  visual.reviverRing.setLocalScale(0.72 * pulse, 0.028, 0.72 * pulse);
  visual.reviverRing.setLocalEulerAngles(0, time * 42, 0);
  visual.targetRing.setLocalPosition(b.x, b.y + 0.07, b.z);
  visual.targetRing.setLocalScale(0.82 * progressScale, 0.035, 0.82 * progressScale);
  visual.targetRing.setLocalEulerAngles(0, -time * 54, 0);
  visual.tether.setLocalPosition((a.x + b.x) * 0.5, Math.max(a.y, b.y) + 0.6, (a.z + b.z) * 0.5);
  visual.tether.setLocalScale(0.04 * pulse, 0.04 * pulse, distance);
  setYaw(visual.tether, Math.atan2(dx, dz));
}

export function destroyCooperativeReviveVisual(visual: CooperativeReviveVisual): void {
  visual.root.destroy();
}
