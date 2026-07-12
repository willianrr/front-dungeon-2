import * as pc from 'playcanvas';

import { mulberry32 } from '../shared/rng';
import type { PcWorld, Vec3Like } from './PcWorld';

export type OreNodeKind = 'copper' | 'iron' | 'mithril';
export type OreNodeVisualState = 'active' | 'depleted';

/** Subconjunto de PcWorld necessario para montar o veio procedural. */
export type OreNodeVisualWorld = Pick<PcWorld, 'app' | 'exterior' | 'createPrimitive' | 'material'>;

export interface CreateOreNodeVisualOptions {
  kind: OreNodeKind;
  position: Vec3Like;
  parent?: pc.Entity;
  state?: OreNodeVisualState;
  /** Mesma seed produz a mesma silhueta, facilitando snapshots multiplayer. */
  seed?: number;
  name?: string;
  scale?: number;
  yawRadians?: number;
  /** Veios ricos recebem silhueta maior e uma coroa dourada inequívoca. */
  rich?: boolean;
}

export interface UpdateOreNodeVisualOptions {
  /** Tempo absoluto, em segundos. */
  time: number;
  state?: OreNodeVisualState;
  /** Intensidade do pulso quando selecionado/proximo (0..1). */
  emphasis?: number;
}

export interface OreNodeVisual {
  readonly root: pc.Entity;
  readonly activeRoot: pc.Entity;
  readonly depletedRoot: pc.Entity;
  readonly kind: OreNodeKind;
  readonly rich: boolean;
  state: OreNodeVisualState;
}

interface OrePalette {
  rock: number;
  rockAccent: number;
  ore: number;
  glow: number;
  spent: number;
  oreGloss: number;
  oreMetalness: number;
  emissiveIntensity: number;
}

interface AnimatedShard {
  entity: pc.Entity;
  position: Vec3Like;
  scale: Vec3Like;
  rotation: Vec3Like;
  phase: number;
}

interface AnimatedGlint {
  entity: pc.Entity;
  center: Vec3Like;
  scale: number;
  phase: number;
  orbit: number;
}

interface OreNodeRuntime {
  shards: AnimatedShard[];
  glints: AnimatedGlint[];
  phase: number;
}

const DEG = 180 / Math.PI;
const ORE_PALETTES: Record<OreNodeKind, OrePalette> = {
  copper: {
    rock: 0x34383a,
    rockAccent: 0x4b4039,
    ore: 0xb96b37,
    glow: 0xffb16b,
    spent: 0x4b3830,
    oreGloss: 0.58,
    oreMetalness: 0.72,
    emissiveIntensity: 0.44,
  },
  iron: {
    rock: 0x30343a,
    rockAccent: 0x424950,
    ore: 0x9ca9b0,
    glow: 0xe0f1f7,
    spent: 0x3f4143,
    oreGloss: 0.72,
    oreMetalness: 0.86,
    emissiveIntensity: 0.28,
  },
  mithril: {
    rock: 0x222c39,
    rockAccent: 0x30485a,
    ore: 0x52cada,
    glow: 0xa1f8ff,
    spent: 0x30434a,
    oreGloss: 0.84,
    oreMetalness: 0.68,
    emissiveIntensity: 1.15,
  },
};

const runtimes = new WeakMap<OreNodeVisual, OreNodeRuntime>();

function color(hex: number): pc.Color {
  return new pc.Color(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
  );
}

function positionSeed(kind: OreNodeKind, position: Vec3Like): number {
  const kindSeed = kind === 'copper' ? 0xc0a2 : kind === 'iron' ? 0x1f02 : 0x5174;
  return (
    kindSeed
    ^ Math.imul(Math.round(position.x * 100), 73_856_093)
    ^ Math.imul(Math.round(position.z * 100), 19_349_663)
  ) >>> 0;
}

function makeGroup(world: OreNodeVisualWorld, name: string, parent: pc.Entity): pc.Entity {
  const group = new pc.Entity(name, world.app);
  parent.addChild(group);
  return group;
}

function createActiveFormation(
  world: OreNodeVisualWorld,
  kind: OreNodeKind,
  root: pc.Entity,
  rand: () => number,
  rich: boolean,
): Pick<OreNodeRuntime, 'shards' | 'glints'> {
  const palette = ORE_PALETTES[kind];
  const rock = world.material(`ore-node-${kind}-rock`, palette.rock, { gloss: 0.1 });
  const rockAccent = world.material(`ore-node-${kind}-rock-accent`, palette.rockAccent, { gloss: 0.15 });
  const ore = world.material(`ore-node-${kind}-metal`, palette.ore, {
    gloss: palette.oreGloss,
    metalness: palette.oreMetalness,
    emissive: color(palette.glow),
    emissiveIntensity: palette.emissiveIntensity,
  });
  const glow = world.material(`ore-node-${kind}-glint`, palette.glow, {
    opacity: kind === 'mithril' ? 0.72 : 0.48,
    additive: true,
    unlit: true,
    depthWrite: false,
  });

  // A massa rochosa e irregular, mas permanece baixa para nao fingir um novo
  // obstaculo alem do collider autoritativo que a integracao escolher usar.
  const stoneCount = rich ? 4 : 3;
  for (let index = 0; index < stoneCount; index++) {
    const angle = index / stoneCount * Math.PI * 2 + (rand() - 0.5) * 0.55;
    const distance = index === 0 ? 0.12 : 0.3 + rand() * 0.34;
    const width = 0.72 + rand() * 0.42;
    const stone = world.createPrimitive(
      `ore-node-${kind}-stone-${index}`,
      'sphere',
      index % 3 === 0 ? rockAccent : rock,
      {
        x: Math.sin(angle) * distance,
        y: 0.2 + rand() * 0.13,
        z: Math.cos(angle) * distance,
      },
      { x: width, y: 0.42 + rand() * 0.2, z: width * (0.72 + rand() * 0.28) },
      root,
    );
    stone.setLocalEulerAngles((rand() - 0.5) * 18, rand() * 180, (rand() - 0.5) * 16);
  }

  const shards: AnimatedShard[] = [];
  const shardCount = (kind === 'mithril' ? 6 : 5) + (rich ? 3 : 0);
  const primitive = kind === 'copper' ? 'sphere' : kind === 'iron' ? 'box' : 'cone';
  for (let index = 0; index < shardCount; index++) {
    const angle = index / shardCount * Math.PI * 2 + (rand() - 0.5) * 0.72;
    const distance = 0.18 + rand() * 0.55;
    const height = kind === 'mithril' ? 0.52 + rand() * 0.48 : 0.2 + rand() * 0.22;
    const width = kind === 'mithril' ? 0.18 + rand() * 0.12 : 0.22 + rand() * 0.2;
    const position = {
      x: Math.sin(angle) * distance,
      y: kind === 'mithril' ? 0.35 + height * 0.42 : 0.4 + rand() * 0.16,
      z: Math.cos(angle) * distance,
    };
    const scale = kind === 'mithril'
      ? { x: width, y: height, z: width }
      : kind === 'iron'
        ? { x: width * 1.45, y: height, z: width * 0.62 }
        : { x: width * 1.12, y: height, z: width };
    const rotation = {
      x: kind === 'mithril' ? (rand() - 0.5) * 28 : (rand() - 0.5) * 40,
      y: rand() * 360,
      z: kind === 'mithril' ? (rand() - 0.5) * 28 : (rand() - 0.5) * 40,
    };
    const shard = world.createPrimitive(
      `ore-node-${kind}-vein-${index}`,
      primitive,
      ore,
      position,
      scale,
      root,
    );
    shard.setLocalEulerAngles(rotation.x, rotation.y, rotation.z);
    shards.push({ entity: shard, position, scale, rotation, phase: rand() * Math.PI * 2 });
  }

  const glints: AnimatedGlint[] = [];
  const glintCount = (kind === 'mithril' ? 3 : 2) + (rich ? 2 : 0);
  for (let index = 0; index < glintCount; index++) {
    const phase = index / glintCount * Math.PI * 2 + rand() * 0.8;
    const center = {
      x: Math.sin(phase) * (0.34 + rand() * 0.25),
      y: 0.58 + rand() * 0.3,
      z: Math.cos(phase) * (0.34 + rand() * 0.25),
    };
    const size = 0.045 + rand() * 0.04;
    const entity = world.createPrimitive(
      `ore-node-${kind}-glint-${index}`,
      'sphere',
      glow,
      center,
      { x: size, y: size, z: size },
      root,
    );
    glints.push({ entity, center, scale: size, phase, orbit: 0.025 + rand() * 0.035 });
  }

  if (rich) {
    const richGold = world.material('ore-node-rich-crown', 0xffd56a, {
      gloss: 0.82,
      metalness: 0.58,
      emissive: color(0xffe69a),
      emissiveIntensity: 0.8,
    });
    const crown = world.createPrimitive(
      `ore-node-${kind}-rich-crown`,
      'torus',
      richGold,
      { x: 0, y: 0.13, z: 0 },
      { x: 1.04, y: 0.055, z: 1.04 },
      root,
    );
    crown.setLocalEulerAngles(0, 0, 0);
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      const crest = world.createPrimitive(
        `ore-node-${kind}-rich-crest-${index}`,
        'cone',
        richGold,
        { x: Math.sin(angle) * 0.72, y: 0.7, z: Math.cos(angle) * 0.72 },
        { x: 0.12, y: 0.42, z: 0.12 },
        root,
      );
      crest.setLocalEulerAngles(0, angle * DEG, 0);
    }
  }

  return { shards, glints };
}

function createDepletedFormation(
  world: OreNodeVisualWorld,
  kind: OreNodeKind,
  root: pc.Entity,
  rand: () => number,
): void {
  const palette = ORE_PALETTES[kind];
  const pit = world.material(`ore-node-${kind}-depleted-pit`, 0x181b1e, { gloss: 0.04 });
  const rubble = world.material(`ore-node-${kind}-depleted-rock`, 0x303337, { gloss: 0.06 });
  const trace = world.material(`ore-node-${kind}-depleted-trace`, palette.spent, {
    gloss: 0.2,
    metalness: 0.2,
  });

  world.createPrimitive(
    `ore-node-${kind}-empty-pit`,
    'cylinder',
    pit,
    { x: 0, y: 0.025, z: 0 },
    { x: 1.45, y: 0.05, z: 1.18 },
    root,
  );

  for (let index = 0; index < 5; index++) {
    const angle = index / 5 * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const distance = 0.48 + rand() * 0.38;
    const size = 0.24 + rand() * 0.2;
    const stone = world.createPrimitive(
      `ore-node-${kind}-rubble-${index}`,
      'sphere',
      index === 1 || index === 3 ? trace : rubble,
      {
        x: Math.sin(angle) * distance,
        y: 0.1 + rand() * 0.06,
        z: Math.cos(angle) * distance,
      },
      { x: size * 1.3, y: size * 0.55, z: size },
      root,
    );
    stone.setLocalEulerAngles(rand() * 24, rand() * 180, rand() * 24);
  }

  // Marcas cruzadas de picareta tornam o estado esgotado legivel mesmo sem cor.
  for (let index = 0; index < 2; index++) {
    const scar = world.createPrimitive(
      `ore-node-${kind}-pick-scar-${index}`,
      'box',
      trace,
      { x: 0, y: 0.062, z: 0 },
      { x: 0.75, y: 0.025, z: 0.055 },
      root,
    );
    scar.setLocalEulerAngles(0, index === 0 ? 38 : -38, 0);
  }
}

/** Cria um veio visual deterministico com representacoes ativa e esgotada. */
export function createOreNodeVisual(
  world: OreNodeVisualWorld,
  options: CreateOreNodeVisualOptions,
): OreNodeVisual {
  const state = options.state ?? 'active';
  const rich = options.rich === true;
  const seed = options.seed ?? positionSeed(options.kind, options.position);
  const rand = mulberry32(seed);
  const root = new pc.Entity(options.name ?? `ore-node-${options.kind}`, world.app);
  root.setLocalPosition(options.position.x, options.position.y, options.position.z);
  root.setLocalEulerAngles(0, (options.yawRadians ?? rand() * Math.PI * 2) * DEG, 0);
  const scale = Math.max(0.25, options.scale ?? 1);
  root.setLocalScale(scale, scale, scale);
  (options.parent ?? world.exterior).addChild(root);

  const activeRoot = makeGroup(world, `${root.name}-active`, root);
  const depletedRoot = makeGroup(world, `${root.name}-depleted`, root);
  const activeParts = createActiveFormation(world, options.kind, activeRoot, rand, rich);
  createDepletedFormation(world, options.kind, depletedRoot, rand);

  const visual: OreNodeVisual = {
    root,
    activeRoot,
    depletedRoot,
    kind: options.kind,
    rich,
    state,
  };
  runtimes.set(visual, { ...activeParts, phase: rand() * Math.PI * 2 });
  setOreNodeVisualState(visual, state);
  return visual;
}

/** Alterna o veio sem recriar materiais ou entidades. */
export function setOreNodeVisualState(visual: OreNodeVisual, state: OreNodeVisualState): void {
  visual.state = state;
  visual.activeRoot.enabled = state === 'active';
  visual.depletedRoot.enabled = state === 'depleted';
}

/** Atualiza somente o pulso mineral e os pequenos brilhos orbitais. */
export function updateOreNodeVisual(
  visual: OreNodeVisual,
  options: UpdateOreNodeVisualOptions,
): void {
  if (options.state && options.state !== visual.state) setOreNodeVisualState(visual, options.state);
  if (visual.state !== 'active') return;
  const runtime = runtimes.get(visual);
  if (!runtime) return;

  const emphasis = Math.max(0, Math.min(1, options.emphasis ?? 0));
  const time = options.time;
  for (const shard of runtime.shards) {
    const wave = Math.sin(time * 1.65 + shard.phase + runtime.phase);
    const pulse = 1 + wave * (0.014 + emphasis * 0.022);
    shard.entity.setLocalPosition(
      shard.position.x,
      shard.position.y + wave * (0.006 + emphasis * 0.008),
      shard.position.z,
    );
    shard.entity.setLocalScale(
      shard.scale.x * pulse,
      shard.scale.y * (1 + wave * (0.022 + emphasis * 0.025)),
      shard.scale.z * pulse,
    );
    shard.entity.setLocalEulerAngles(
      shard.rotation.x,
      shard.rotation.y + wave * (0.7 + emphasis * 0.8),
      shard.rotation.z,
    );
  }

  for (const glint of runtime.glints) {
    const angle = time * 0.72 + glint.phase + runtime.phase;
    const wave = (Math.sin(time * 3.4 + glint.phase) + 1) * 0.5;
    glint.entity.setLocalPosition(
      glint.center.x + Math.sin(angle) * glint.orbit,
      glint.center.y + Math.sin(angle * 1.7) * (0.035 + emphasis * 0.02),
      glint.center.z + Math.cos(angle) * glint.orbit,
    );
    const scale = glint.scale * (0.72 + wave * (0.62 + emphasis * 0.38));
    glint.entity.setLocalScale(scale, scale, scale);
  }
}

export function destroyOreNodeVisual(visual: OreNodeVisual): void {
  runtimes.delete(visual);
  visual.root.destroy();
}
