import * as pc from 'playcanvas';

import { UTRAEAN_RELAY_PALETTE } from '../shared/UtraeanRelay';
import type { UtraeanRelayState, UtraeanRuneState } from '../shared/types';
import { colorFromCss, type PcWorld } from './PcWorld';

type VisualWorld = Pick<PcWorld, 'app' | 'createPrimitive' | 'material'>;

interface RuneVisual {
  root: pc.Entity;
  crown: pc.Entity;
  halo: pc.Entity;
  beam: pc.Entity;
}

export interface UtraeanRelayVisual {
  root: pc.Entity;
  console: pc.Entity;
  consoleHalo: pc.Entity;
  runes: Map<UtraeanRuneState['id'], RuneVisual>;
  chestRoot: pc.Entity;
  chest: pc.Entity;
  state: UtraeanRelayState;
}

function group(world: VisualWorld, name: string, parent: pc.Entity): pc.Entity {
  const entity = new pc.Entity(name, world.app);
  parent.addChild(entity);
  return entity;
}

function glowMaterial(world: VisualWorld, key: string, color: string, intensity: number): pc.StandardMaterial {
  const value = colorFromCss(color);
  return world.material(`utraean-relay-${key}`, color, {
    emissive: value, emissiveIntensity: intensity, opacity: 0.68,
    additive: true, unlit: true, depthWrite: false,
  });
}

export function createUtraeanRelayVisual(world: VisualWorld, state: UtraeanRelayState, parent: pc.Entity): UtraeanRelayVisual {
  const root = group(world, 'utraean-rune-relay', parent);
  const stone = world.material('utraean-relay-stone', UTRAEAN_RELAY_PALETTE.stone, { gloss: 0.24, metalness: 0.25 });
  const metal = world.material('utraean-relay-metal', 0x7b8f99, { gloss: 0.72, metalness: 0.82 });
  const dormant = glowMaterial(world, 'dormant', UTRAEAN_RELAY_PALETTE.dormant, 0.55);
  const active = glowMaterial(world, 'active', UTRAEAN_RELAY_PALETTE.active, 1.2);
  const current = glowMaterial(world, 'current', UTRAEAN_RELAY_PALETTE.current, 1.8);
  const activated = glowMaterial(world, 'activated', UTRAEAN_RELAY_PALETTE.activated, 1.35);
  const reward = glowMaterial(world, 'reward', UTRAEAN_RELAY_PALETTE.reward, 1.55);

  const console = group(world, 'utraean-console', root);
  console.setLocalPosition(state.center.x, state.center.y, state.center.z);
  world.createPrimitive('utraean-console-plinth', 'cylinder', stone, { x: 0, y: 0.25, z: 0 }, { x: 1.8, y: 0.45, z: 1.8 }, console);
  world.createPrimitive('utraean-console-dial', 'cylinder', metal, { x: 0, y: 0.56, z: 0 }, { x: 1.15, y: 0.12, z: 1.15 }, console);
  const consoleHalo = world.createPrimitive('utraean-console-halo', 'torus', active, { x: 0, y: 0.72, z: 0 }, { x: 0.78, y: 0.045, z: 0.78 }, console);
  for (let index = 0; index < 3; index++) {
    const angle = index / 3 * Math.PI * 2;
    const shard = world.createPrimitive(
      `utraean-console-shard-${index}`, 'cone', current,
      { x: Math.sin(angle) * 0.58, y: 0.9, z: Math.cos(angle) * 0.58 },
      { x: 0.16, y: 0.38, z: 0.16 }, console,
    );
    shard.setLocalEulerAngles(0, angle * 180 / Math.PI, 180);
  }

  const runes = new Map<UtraeanRuneState['id'], RuneVisual>();
  for (const rune of state.runes) {
    const runeRoot = group(world, rune.id, root);
    runeRoot.setLocalPosition(rune.position.x, rune.position.y, rune.position.z);
    world.createPrimitive(`${rune.id}-base`, 'cylinder', stone, { x: 0, y: 0.22, z: 0 }, { x: 1.5, y: 0.38, z: 1.5 }, runeRoot);
    world.createPrimitive(`${rune.id}-pillar`, 'cylinder', metal, { x: 0, y: 1.0, z: 0 }, { x: 0.52, y: 1.25, z: 0.52 }, runeRoot);
    const crown = world.createPrimitive(`${rune.id}-crown`, 'sphere', current, { x: 0, y: 2.05, z: 0 }, { x: 0.56, y: 0.72, z: 0.56 }, runeRoot);
    const halo = world.createPrimitive(`${rune.id}-halo`, 'torus', dormant, { x: 0, y: 0.12, z: 0 }, { x: 1.25, y: 0.04, z: 1.25 }, runeRoot);
    const beam = world.createPrimitive(`${rune.id}-beam`, 'cylinder', activated, { x: 0, y: 3.8, z: 0 }, { x: 0.09, y: 3.3, z: 0.09 }, runeRoot);
    runes.set(rune.id, { root: runeRoot, crown, halo, beam });
  }

  const chestRoot = group(world, 'utraean-reward-root', root);
  chestRoot.setLocalPosition(state.chestPosition.x, state.chestPosition.y, state.chestPosition.z);
  const chest = group(world, 'utraean-reward-chest', chestRoot);
  world.createPrimitive('utraean-chest-base', 'box', stone, { x: 0, y: 0.42, z: 0 }, { x: 1.35, y: 0.62, z: 0.9 }, chest);
  const lid = world.createPrimitive('utraean-chest-lid', 'box', metal, { x: 0, y: 0.82, z: -0.05 }, { x: 1.38, y: 0.3, z: 0.94 }, chest);
  lid.setLocalEulerAngles(-7, 0, 0);
  world.createPrimitive('utraean-chest-seal', 'sphere', reward, { x: 0, y: 0.55, z: 0.5 }, { x: 0.22, y: 0.28, z: 0.12 }, chest);
  world.createPrimitive('utraean-chest-ring', 'torus', reward, { x: 0, y: 0.1, z: 0 }, { x: 1.5, y: 0.04, z: 1.5 }, chestRoot);

  const visual = { root, console, consoleHalo, runes, chestRoot, chest, state };
  updateUtraeanRelayVisual(visual, state, 0);
  return visual;
}

export function updateUtraeanRelayVisual(visual: UtraeanRelayVisual, state: UtraeanRelayState, time: number): void {
  visual.state = state;
  visual.chestRoot.enabled = state.phase === 'reward' && !state.claimed;
  const consolePulse = 1 + Math.sin(time * (state.guardianActive ? 8.2 : state.phase === 'active' ? 4.8 : 2.1)) * (state.guardianActive ? 0.09 : 0.045);
  visual.consoleHalo.setLocalScale(0.78 * consolePulse, 0.045, 0.78 * consolePulse);
  visual.consoleHalo.setLocalEulerAngles(0, time * (state.phase === 'active' ? 55 : 18), 0);
  for (const rune of state.runes) {
    const view = visual.runes.get(rune.id);
    if (!view) continue;
    view.beam.enabled = state.phase === 'active' && rune.activated;
    const pulseRate = state.guardianActive ? 9.5 : rune.current ? 7.2 : rune.activated ? 3.8 : 1.8;
    const pulse = 1 + Math.sin(time * pulseRate + Math.max(0, rune.sequenceStep)) * (rune.current ? 0.13 : 0.045);
    view.crown.setLocalScale(0.56 * pulse, 0.72 * pulse, 0.56 * pulse);
    view.crown.setLocalEulerAngles(time * (rune.current ? 62 : 22), time * (rune.current ? 95 : 35), 0);
    const haloScale = rune.current ? 1.42 : rune.activated ? 1.25 : 1.05;
    view.halo.setLocalScale(haloScale * pulse, 0.04, haloScale * pulse);
    view.halo.setLocalEulerAngles(0, time * (rune.current ? 70 : 24), 0);
    view.root.enabled = true;
  }
  const chestPulse = 1 + Math.sin(time * 4.1) * 0.045;
  visual.chest.setLocalScale(chestPulse, chestPulse, chestPulse);
}

export function destroyUtraeanRelayVisual(visual: UtraeanRelayVisual): void {
  visual.root.destroy();
}
