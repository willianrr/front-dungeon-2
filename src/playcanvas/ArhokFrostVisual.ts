import * as pc from 'playcanvas';

import { ARHOK_FROST_PALETTE } from '../shared/ArhokFrostCoast';
import type { BiomeState } from '../shared/types';
import { colorFromCss, type PcWorld, type Vec3Like } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

interface HearthVisual {
  root: pc.Entity;
  flame: pc.Entity;
  light: pc.Entity;
  ring: pc.Entity;
}

export interface ArhokFrostVisual {
  root: pc.Entity;
  hearths: HearthVisual[];
  snowRoot: pc.Entity;
  motes: pc.Entity[];
  state: BiomeState;
}

function hash01(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function createArhokFrostVisual(world: VisualWorld, state: BiomeState, parent: pc.Entity): ArhokFrostVisual {
  const root = new pc.Entity('arhok-frost-coast-authoritative', world.app);
  parent.addChild(root);
  const stone = world.material('arhok-hearth-stone', 0x39434c, { gloss: 0.18, metalness: 0.1 });
  const ember = colorFromCss(ARHOK_FROST_PALETTE.flame);
  const flameMaterial = world.material('arhok-hearth-flame', ARHOK_FROST_PALETTE.flame, {
    emissive: ember, emissiveIntensity: 2.2, opacity: 0.86, additive: true, unlit: true, depthWrite: false,
  });
  const warmth = colorFromCss(ARHOK_FROST_PALETTE.warmth);
  const warmthMaterial = world.material('arhok-hearth-warmth', ARHOK_FROST_PALETTE.warmth, {
    emissive: warmth, emissiveIntensity: 1.05, opacity: 0.32, additive: true, unlit: true, depthWrite: false,
  });
  const hearths = state.warmthSources.map((source, sourceIndex) => {
    const hearthRoot = new pc.Entity(`arhok-hearth-${source.id}`, world.app);
    hearthRoot.setLocalPosition(source.position.x, source.position.y, source.position.z);
    root.addChild(hearthRoot);
    for (let index = 0; index < 7; index++) {
      const angle = index / 7 * Math.PI * 2;
      world.createPrimitive(
        `arhok-hearth-stone-${sourceIndex}-${index}`, 'box', stone,
        { x: Math.sin(angle) * 0.55, y: 0.16, z: Math.cos(angle) * 0.55 },
        { x: 0.38, y: 0.25, z: 0.28 }, hearthRoot,
      ).setLocalEulerAngles(0, angle * 180 / Math.PI, 0);
    }
    const flame = world.createPrimitive(
      `arhok-hearth-flame-${sourceIndex}`, 'cone', flameMaterial,
      { x: 0, y: 0.72, z: 0 }, { x: 0.48, y: 1.15, z: 0.48 }, hearthRoot,
    );
    const ring = world.createPrimitive(
      `arhok-hearth-radius-${sourceIndex}`, 'torus', warmthMaterial,
      { x: 0, y: 0.07, z: 0 }, { x: source.radius, y: 0.025, z: source.radius }, hearthRoot,
    );
    const light = new pc.Entity(`arhok-hearth-light-${sourceIndex}`, world.app);
    light.addComponent('light', {
      type: 'omni', color: warmth, intensity: 1.6, range: source.radius + 2,
      castShadows: false, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
    });
    light.setLocalPosition(0, 1.15, 0);
    hearthRoot.addChild(light);
    return { root: hearthRoot, flame, light, ring };
  });

  const snowRoot = new pc.Entity('arhok-frost-snow-field', world.app);
  root.addChild(snowRoot);
  const snow = colorFromCss(ARHOK_FROST_PALETTE.snow);
  const snowMaterial = world.material('arhok-frost-snow', ARHOK_FROST_PALETTE.snow, {
    emissive: snow, emissiveIntensity: 0.85, opacity: 0.68, additive: true, unlit: true, depthWrite: false,
  });
  const motes: pc.Entity[] = [];
  for (let index = 0; index < 28; index++) {
    const size = 0.025 + hash01(index, 3) * 0.045;
    const mote = world.createPrimitive(
      `arhok-snow-mote-${index}`, 'sphere', snowMaterial,
      { x: 0, y: 0, z: 0 }, { x: size, y: size, z: size }, snowRoot,
    );
    motes.push(mote);
  }
  const visual = { root, hearths, snowRoot, motes, state };
  updateArhokFrostVisual(visual, state, { x: 0, y: 0, z: 0 }, 0);
  return visual;
}

export function updateArhokFrostVisual(
  visual: ArhokFrostVisual,
  state: BiomeState,
  player: Vec3Like,
  time: number,
): void {
  visual.state = state;
  visual.root.enabled = true;
  visual.snowRoot.enabled = state.active;
  visual.snowRoot.setLocalPosition(player.x, player.y, player.z);
  for (let index = 0; index < visual.motes.length; index++) {
    const cycle = (time * (0.32 + hash01(index, 5) * 0.34) + hash01(index, 7)) % 1;
    const angle = hash01(index, 11) * Math.PI * 2 + time * 0.08;
    const radius = 2 + hash01(index, 13) * 8;
    visual.motes[index].setLocalPosition(
      Math.sin(angle) * radius,
      5.5 - cycle * 6,
      Math.cos(angle) * radius,
    );
  }
  for (let index = 0; index < visual.hearths.length; index++) {
    const hearth = visual.hearths[index];
    const pulse = 1 + Math.sin(time * 7.2 + index * 1.7) * 0.12;
    hearth.flame.setLocalScale(0.48 * pulse, 1.15 / pulse, 0.48 * pulse);
    hearth.ring.setLocalEulerAngles(0, time * (index % 2 === 0 ? 17 : -19), 0);
    if (hearth.light.light) hearth.light.light.intensity = 1.45 + pulse * 0.22;
  }
}

export function destroyArhokFrostVisual(visual: ArhokFrostVisual): void {
  visual.root.destroy();
}
