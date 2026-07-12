import * as pc from 'playcanvas';

import type { WorldZone } from '../shared/types';
import type { PropInstance, WorldData } from '../shared/worldgen';

export interface MapMaterialOptions {
  emissive?: pc.Color;
  emissiveIntensity?: number;
  opacity?: number;
  unlit?: boolean;
  additive?: boolean;
  gloss?: number;
  metalness?: number;
  diffuseVertexColor?: boolean;
  twoSided?: boolean;
  depthWrite?: boolean;
  useFog?: boolean;
}

interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

type PrimitiveType = 'box' | 'capsule' | 'cone' | 'cylinder' | 'plane' | 'sphere' | 'torus';

export interface MapArtContext {
  app: pc.Application;
  world: WorldData;
  exterior: pc.Entity;
  dungeon: pc.Entity;
  createPrimitive(
    name: string,
    type: PrimitiveType,
    material: pc.Material,
    position: Vec3Like,
    scale: Vec3Like,
    parent?: pc.Entity,
  ): pc.Entity;
  material(key: string, color: number | string, options?: MapMaterialOptions): pc.StandardMaterial;
  instantiateSizedModel(
    url: string,
    size: { height?: number; largest?: number },
    castShadows: boolean,
  ): Promise<pc.Entity | null>;
}

interface BoxSpec {
  position: Vec3Like;
  size: Vec3Like;
  yaw?: number;
  color?: readonly [number, number, number, number?];
}

interface Mote {
  entity: pc.Entity;
  zone: WorldZone;
  base: Vec3Like;
  phase: number;
  radius: number;
  lift: number;
}

interface PulseLight {
  entity: pc.Entity;
  glow: pc.Entity;
  zone: WorldZone;
  intensity: number;
  phase: number;
  baseScale: number;
}

interface ModelDetail {
  url: string;
  zone: WorldZone;
  x: number;
  z: number;
  size: number;
  yaw: number;
}

const DEG = 180 / Math.PI;
const SCENIC_LANDMARK_TARGETS = [
  { kind: 'rock', x: 68, z: 22 },
  { kind: 'rock', x: -45, z: -35 },
] as const;

function closestWorldProp(
  world: WorldData,
  kind: PropInstance['kind'],
  targetX: number,
  targetZ: number,
): PropInstance | undefined {
  let closest: PropInstance | undefined;
  let closestDistance = Infinity;
  for (const prop of world.props) {
    if (prop.kind !== kind) continue;
    const distance = Math.hypot(prop.x - targetX, prop.z - targetZ);
    if (distance >= closestDistance) continue;
    closest = prop;
    closestDistance = distance;
  }
  return closest;
}

function hexColor(hex: number, alpha = 1): pc.Color {
  return new pc.Color(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
    alpha,
  );
}

/**
 * Composicao visual client-side do mapa. Tudo aqui e baixo/atravessavel ou fica
 * sobre blockers ja existentes e nas bordas; nenhum contrato autoritativo muda.
 */
export class MapArt {
  private readonly motes: Mote[] = [];
  private readonly pulseLights: PulseLight[] = [];
  private readonly scenicAnchors: readonly (PropInstance | undefined)[];
  private modelDetailsBuilt = false;

  constructor(private readonly ctx: MapArtContext, private readonly dungeonFloorY: number) {
    this.scenicAnchors = SCENIC_LANDMARK_TARGETS.map((target) => (
      closestWorldProp(ctx.world, target.kind, target.x, target.z)
    ));
  }

  /** O collider permanece; somente o rochedo GLB e substituido pelo landmark. */
  usesPropAsScenicAnchor(prop: PropInstance): boolean {
    return this.scenicAnchors.includes(prop);
  }

  buildOverworld(pathPoints: readonly { x: number; z: number }[], portalPosition: Vec3Like): void {
    this.buildCampSanctuary();
    this.buildRoadDetails(pathPoints);
    this.buildScenicLandmarks();
    this.buildPortalSanctum(portalPosition);
  }

  buildDungeon(exitPosition: Vec3Like): void {
    this.buildDungeonTiles();
    this.buildDungeonRituals();
    this.buildDungeonEdges();
    this.buildDungeonExit(exitPosition);
    this.buildDungeonLights();
  }

  /** Uma ruina compacta que cabe no blocker de PropKind=ruin. */
  buildRuinProp(group: pc.Entity, scale: number, variant: number): void {
    const stone = this.ctx.material('world-ruin-stone', 0x696a64, { gloss: 0.08 });
    const dark = this.ctx.material('world-ruin-dark', 0x434a46, { gloss: 0.05 });
    const rune = this.ctx.material('world-ruin-rune', 0x6bd0bd, {
      emissive: hexColor(0x163f42),
      emissiveIntensity: 1.15,
      opacity: 0.72,
      additive: true,
      unlit: true,
    });
    const height = (1.35 + (variant % 3) * 0.22) * scale;
    const monolith = this.ctx.createPrimitive(
      'ancient-monolith',
      'box',
      stone,
      { x: 0, y: height * 0.5, z: 0 },
      { x: 0.62 * scale, y: height, z: 0.48 * scale },
      group,
    );
    monolith.setLocalEulerAngles((variant % 2 ? 5 : -4), 0, (variant % 3 - 1) * 5);
    this.ctx.createPrimitive(
      'monolith-base',
      'cylinder',
      dark,
      { x: 0, y: 0.11 * scale, z: 0 },
      { x: 1.45 * scale, y: 0.22 * scale, z: 1.45 * scale },
      group,
    );
    this.ctx.createPrimitive(
      'monolith-rune',
      'box',
      rune,
      { x: 0, y: height * 0.58, z: 0.252 * scale },
      { x: 0.13 * scale, y: 0.48 * scale, z: 0.025 * scale },
      group,
    );
    for (const side of [-1, 1]) {
      const shardHeight = (0.45 + ((variant + side + 4) % 3) * 0.12) * scale;
      const shard = this.ctx.createPrimitive(
        'broken-monolith-shard',
        'box',
        dark,
        { x: side * 0.58 * scale, y: shardHeight * 0.5, z: 0.12 * scale },
        { x: 0.3 * scale, y: shardHeight, z: 0.3 * scale },
        group,
      );
      shard.setLocalEulerAngles(side * 7, side * 18, side * -9);
    }
  }

  async buildModelDetails(): Promise<void> {
    if (this.modelDetailsBuilt) return;
    this.modelDetailsBuilt = true;
    const details: readonly ModelDetail[] = [
      { url: '/items/Potion1_Filled.glb', zone: 'overworld', x: -7.2, z: -8.1, size: 0.48, yaw: -0.2 },
      { url: '/items/Potion2_Filled.glb', zone: 'overworld', x: -7.65, z: -7.9, size: 0.42, yaw: 0.4 },
      { url: '/items/Crystal1.glb', zone: 'overworld', x: -9.1, z: 5.35, size: 0.72, yaw: 0.1 },
      { url: '/items/Crystal5.glb', zone: 'overworld', x: -8.65, z: 5.9, size: 0.58, yaw: -0.3 },
      { url: '/items/Hammer_Double.glb', zone: 'overworld', x: 10.12, z: 5.12, size: 1.05, yaw: -0.85 },
      { url: '/items/Sword_big.glb', zone: 'overworld', x: 4.15, z: 10.15, size: 1.2, yaw: 0.3 },
      { url: '/items/Coin.glb', zone: 'overworld', x: 10.65, z: -1.2, size: 0.38, yaw: 0 },
      { url: '/items/Crown.glb', zone: 'overworld', x: 8.1, z: -7.1, size: 0.54, yaw: 0.5 },
      { url: '/items/Axe_Double.glb', zone: 'dungeon', x: -19.2, z: 5.4, size: 1.18, yaw: 0.8 },
      { url: '/items/Sword_big_Golden.glb', zone: 'dungeon', x: 19.1, z: -5.7, size: 1.22, yaw: -0.7 },
      { url: '/items/Crystal1.glb', zone: 'dungeon', x: -18.2, z: -15.7, size: 0.9, yaw: 0.2 },
      { url: '/items/Crystal5.glb', zone: 'dungeon', x: 18.1, z: -15.4, size: 0.82, yaw: -0.35 },
    ];

    await Promise.all(details.map(async (detail) => {
      try {
        const model = await this.ctx.instantiateSizedModel(detail.url, { largest: detail.size }, false);
        if (!model) return;
        const root = new pc.Entity('map-model-detail', this.ctx.app);
        const y = detail.zone === 'dungeon'
          ? this.dungeonFloorY + 0.045
          : this.ctx.world.terrain.heightAt(detail.x, detail.z);
        root.setLocalPosition(detail.x, y, detail.z);
        root.setLocalEulerAngles(0, detail.yaw * DEG, 0);
        root.addChild(model);
        (detail.zone === 'dungeon' ? this.ctx.dungeon : this.ctx.exterior).addChild(root);
      } catch (error) {
        console.warn(`[MapArt] detalhe opcional indisponivel: ${detail.url}`, error);
      }
    }));
  }

  update(zone: WorldZone, time: number): void {
    for (const mote of this.motes) {
      if (mote.zone !== zone) continue;
      const orbit = time * 0.48 + mote.phase;
      mote.entity.setLocalPosition(
        mote.base.x + Math.sin(orbit) * mote.radius,
        mote.base.y + Math.sin(time * 1.35 + mote.phase) * mote.lift,
        mote.base.z + Math.cos(orbit * 0.83) * mote.radius,
      );
      const pulse = 0.82 + (Math.sin(time * 2.4 + mote.phase) + 1) * 0.12;
      const scale = 0.075 * pulse;
      mote.entity.setLocalScale(scale, scale, scale);
    }
    for (const light of this.pulseLights) {
      if (light.zone !== zone) continue;
      const pulse = 0.9 + Math.sin(time * 3.8 + light.phase) * 0.1;
      if (light.entity.light) light.entity.light.intensity = light.intensity * pulse;
      const glowScale = light.baseScale * (0.9 + pulse * 0.12);
      light.glow.setLocalScale(glowScale, glowScale * 1.15, glowScale);
    }
  }

  private buildCampSanctuary(): void {
    const parent = this.ctx.exterior;
    const y = this.ctx.world.terrain.heightAt(this.ctx.world.spawn.x, this.ctx.world.spawn.z);
    const plaza = this.ctx.material('camp-plaza', 0x183a24, { gloss: 0.07 });
    const medallion = this.ctx.material('camp-medallion', 0x10291d, { gloss: 0.1 });
    const bronze = this.ctx.material('camp-bronze-inlay', 0x845c27, {
      emissive: hexColor(0x39250b),
      emissiveIntensity: 0.55,
      gloss: 0.32,
      metalness: 0.2,
    });
    this.ctx.createPrimitive(
      'camp-sanctuary-foundation',
      'cylinder',
      plaza,
      { x: 0, y: y - 0.012, z: 0 },
      { x: 23.2, y: 0.085, z: 23.2 },
      parent,
    );
    this.createRadialMosaic('camp-plaza-mosaic', 3.78, 11.48, 3, 45, y + 0.034, parent);
    this.ctx.createPrimitive(
      'camp-center-medallion',
      'cylinder',
      medallion,
      { x: 0, y: y + 0.035, z: 0 },
      { x: 7.45, y: 0.045, z: 7.45 },
      parent,
    );
    this.createFlatRing('camp-outer-inlay', 0, 0, 9.72, 0.12, y + 0.058, bronze, parent);
    this.createFlatRing('camp-inner-inlay', 0, 0, 3.62, 0.09, y + 0.062, bronze, parent);
    const band = this.ctx.material('camp-band-inlay', 0x455044, { gloss: 0.08 });
    this.createFlatRing('camp-middle-band-a', 0, 0, 5.82, 0.055, y + 0.054, band, parent);
    this.createFlatRing('camp-middle-band-b', 0, 0, 8.08, 0.055, y + 0.054, band, parent);

    const serviceDirections = [
      [9.46, -0.83], [-3.18, 8.74], [-5.79, -6.89], [8.14, 4.7], [3.15, 8.65],
      [-9.45, -1.67], [6.74, -5.66], [-7.79, 4.5], [0, -9.5],
    ] as const;
    const spokes: BoxSpec[] = serviceDirections.map(([x, z], index) => {
      const length = Math.hypot(x, z);
      const dx = x / length;
      const dz = z / length;
      return {
        position: { x: dx * 6.45, y: y + 0.048, z: dz * 6.45 },
        size: { x: 0.74, y: 0.035, z: 4.35 },
        yaw: Math.atan2(dx, dz),
        color: index % 2 ? [96, 67, 30, 255] : [78, 58, 30, 255],
      };
    });
    const perimeter: BoxSpec[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      perimeter.push({
        position: { x: Math.sin(angle) * 10.75, y: y + 0.045, z: Math.cos(angle) * 10.75 },
        size: { x: 1.18, y: 0.1 + (i % 3) * 0.018, z: 0.58 },
        yaw: angle,
        color: i % 3 === 0 ? [66, 69, 63, 255] : [50, 56, 50, 255],
      });
    }
    const stoneVertex = this.ctx.material('camp-stone', 0x3a443c, { gloss: 0.06 });
    const bronzeVertex = this.ctx.material('camp-bronze-paths', 0x68491e, {
      gloss: 0.22,
      metalness: 0.18,
    });
    this.createBoxCluster('camp-service-spokes', spokes, bronzeVertex, parent, false);
    this.createBoxCluster('camp-perimeter-cobbles', perimeter, stoneVertex, parent, false);

    const sigilBars: BoxSpec[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      sigilBars.push({
        position: { x: Math.sin(angle) * 1.55, y: y + 0.064, z: Math.cos(angle) * 1.55 },
        size: { x: 0.16, y: 0.025, z: 2.3 },
        yaw: angle,
        color: [112, 78, 34, 255],
      });
    }
    this.createBoxCluster('camp-center-sigil', sigilBars, bronzeVertex, parent, false);

    // Quatro luzes baixas marcam o centro sem ocupar o ponto de spawn.
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI * 0.25 + i * Math.PI * 0.5;
      this.addBeacon(
        parent,
        'overworld',
        { x: Math.sin(angle) * 4.55, y: y + 0.28, z: Math.cos(angle) * 4.55 },
        0xe7bd78,
        0.08,
        2.5,
        i * 1.7,
        0.12,
      );
    }
  }

  private buildRoadDetails(pathPoints: readonly { x: number; z: number }[]): void {
    if (pathPoints.length < 4) return;
    const stones: BoxSpec[] = [];
    for (let i = 5; i < pathPoints.length - 5; i += 4) {
      const point = pathPoints[i];
      if (Math.hypot(point.x, point.z) < 13) continue;
      if (Math.hypot(point.x - this.ctx.world.dungeon.x, point.z - this.ctx.world.dungeon.z) < 10.5) continue;
      const previous = pathPoints[i - 1];
      const next = pathPoints[i + 1];
      const tx = next.x - previous.x;
      const tz = next.z - previous.z;
      const length = Math.hypot(tx, tz) || 1;
      const nx = -tz / length;
      const nz = tx / length;
      const yaw = Math.atan2(tx / length, tz / length);
      for (const side of [-1, 1]) {
        const x = point.x + nx * side * 1.72;
        const z = point.z + nz * side * 1.72;
        stones.push({
          position: { x, y: this.ctx.world.terrain.heightAt(x, z) + 0.055, z },
          size: { x: 0.38 + (i % 3) * 0.08, y: 0.1, z: 0.72 },
          yaw: yaw + (side * 0.08),
          color: side > 0 ? [111, 103, 82, 255] : [92, 91, 78, 255],
        });
      }
    }
    const material = this.ctx.material('road-edge-stone', 0x424941, { gloss: 0.05 });
    this.createBoxCluster('road-edge-stones', stones, material, this.ctx.exterior, false);

    for (const [markerIndex, fraction] of [0.27, 0.53, 0.77].entries()) {
      const index = Math.max(2, Math.min(pathPoints.length - 3, Math.round(fraction * (pathPoints.length - 1))));
      const point = pathPoints[index];
      const previous = pathPoints[index - 1];
      const next = pathPoints[index + 1];
      const tx = next.x - previous.x;
      const tz = next.z - previous.z;
      const length = Math.hypot(tx, tz) || 1;
      const side = markerIndex % 2 === 0 ? 1 : -1;
      const x = point.x + (-tz / length) * side * 3.65;
      const z = point.z + (tx / length) * side * 3.65;
      const blocked = this.ctx.world.blockers.some((blocker) => (
        Math.hypot(blocker.x - x, blocker.z - z) < blocker.radius + 0.8
      ));
      if (blocked) continue;
      const y = this.ctx.world.terrain.heightAt(x, z);
      const root = new pc.Entity('road-waystone', this.ctx.app);
      root.setLocalPosition(x, y, z);
      root.setLocalEulerAngles(0, Math.atan2(tx, tz) * DEG, 0);
      this.ctx.exterior.addChild(root);
      const stone = this.ctx.material('road-waystone-stone', 0x62675f, { gloss: 0.06 });
      this.ctx.createPrimitive('waystone-base', 'cylinder', stone, { x: 0, y: 0.12, z: 0 }, { x: 0.85, y: 0.24, z: 0.85 }, root);
      this.ctx.createPrimitive('waystone-pillar', 'box', stone, { x: 0, y: 0.68, z: 0 }, { x: 0.36, y: 1.12, z: 0.32 }, root);
      this.addBeacon(root, 'overworld', { x: 0, y: 1.34, z: 0 }, 0x80d8c8, 3.4, 7, markerIndex * 1.9, 0.14);
    }
  }

  private buildPortalSanctum(portalPosition: Vec3Like): void {
    const root = new pc.Entity('dungeon-entrance', this.ctx.app);
    const groundY = this.ctx.world.terrain.heightAt(this.ctx.world.dungeon.x, this.ctx.world.dungeon.z);
    root.setLocalPosition(portalPosition.x, groundY, portalPosition.z);
    const towardSpawnX = this.ctx.world.spawn.x - this.ctx.world.dungeon.x;
    const towardSpawnZ = this.ctx.world.spawn.z - this.ctx.world.dungeon.z;
    root.setLocalEulerAngles(0, Math.atan2(towardSpawnX, towardSpawnZ) * DEG, 0);
    this.ctx.exterior.addChild(root);

    const basalt = this.ctx.material('portal-basalt', 0x464750, { gloss: 0.08 });
    const edge = this.ctx.material('portal-edge', 0x74757c, { gloss: 0.12 });
    const portal = this.ctx.material('portal-void', 0x10172b, {
      emissive: hexColor(0x193a78),
      emissiveIntensity: 1.8,
      opacity: 0.9,
      unlit: true,
    });
    const veil = this.ctx.material('portal-veil', 0x72b8ff, {
      emissive: hexColor(0x326fd1),
      emissiveIntensity: 2.2,
      opacity: 0.34,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    this.ctx.createPrimitive('portal-dais', 'cylinder', basalt, { x: 0, y: 0.035, z: 0 }, { x: 14.2, y: 0.14, z: 14.2 }, root);
    this.createFlatRing('portal-dais-ring', 0, 0, 6.05, 0.16, 0.12, edge, root);

    const stairs: BoxSpec[] = [];
    for (let i = 0; i < 4; i++) {
      stairs.push({
        position: { x: 0, y: 0.11 + i * 0.055, z: 3.45 + i * 1.04 },
        size: { x: 6.8 - i * 0.6, y: 0.2, z: 0.92 },
        color: i % 2 ? [74, 75, 84, 255] : [89, 90, 97, 255],
      });
    }
    const archBlocks: BoxSpec[] = [
      { position: { x: -2.35, y: 0.35, z: 0 }, size: { x: 1.35, y: 0.7, z: 1.65 } },
      { position: { x: 2.35, y: 0.35, z: 0 }, size: { x: 1.35, y: 0.7, z: 1.65 } },
      { position: { x: -2.35, y: 1.55, z: 0 }, size: { x: 0.92, y: 1.8, z: 1.05 } },
      { position: { x: 2.35, y: 1.55, z: 0 }, size: { x: 0.92, y: 1.8, z: 1.05 } },
      { position: { x: -2.35, y: 3.28, z: 0 }, size: { x: 1.02, y: 1.55, z: 1.12 } },
      { position: { x: 2.35, y: 3.28, z: 0 }, size: { x: 1.02, y: 1.55, z: 1.12 } },
      { position: { x: 0, y: 4.45, z: 0 }, size: { x: 5.65, y: 0.9, z: 1.22 } },
      { position: { x: 0, y: 5.08, z: 0 }, size: { x: 2.2, y: 0.42, z: 0.92 } },
    ];
    const vertexStone = this.ctx.material('portal-stair-stone', 0x373b46, { gloss: 0.08 });
    this.createBoxCluster('portal-stairs', stairs, vertexStone, root, true);
    this.createBoxCluster('portal-arch', archBlocks, basalt, root, true);
    this.ctx.createPrimitive('portal-surface', 'box', portal, { x: 0, y: 2.25, z: 0.35 }, { x: 3.65, y: 4.0, z: 0.1 }, root);
    this.ctx.createPrimitive('portal-inner-veil', 'box', veil, { x: 0, y: 2.22, z: 0.43 }, { x: 2.95, y: 3.35, z: 0.04 }, root);
    const halo = this.ctx.createPrimitive('portal-halo', 'torus', veil, { x: 0, y: 2.25, z: 0.49 }, { x: 4.45, y: 0.085, z: 4.45 }, root);
    halo.setLocalEulerAngles(90, 0, 0);

    const crystal = this.ctx.material('portal-crystal', 0x6c8dff, {
      emissive: hexColor(0x253c99),
      emissiveIntensity: 1.4,
      gloss: 0.5,
    });
    for (const [index, spec] of [[-4.25, 0.9, 1.25], [4.25, 0.9, 1.1], [-3.55, -2.2, 0.78], [3.5, -2.3, 0.88]].entries()) {
      const [x, z, size] = spec;
      const shard = this.ctx.createPrimitive('portal-crystal', 'cone', crystal, { x, y: size * 0.78, z }, { x: size * 0.68, y: size * 1.55, z: size * 0.68 }, root);
      shard.setLocalEulerAngles((index % 2 ? -8 : 8), index * 47, (index % 2 ? 5 : -5));
    }
    this.addBeacon(root, 'overworld', { x: -2.65, y: 3.15, z: 0.8 }, 0x708cff, 3.0, 9.5, 0.2, 0.2);
    this.addBeacon(root, 'overworld', { x: 2.65, y: 3.15, z: 0.8 }, 0x708cff, 3.0, 9.5, 2.1, 0.2);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.addMote(root, 'overworld', {
        x: Math.sin(angle) * (1.8 + (i % 3) * 0.55),
        y: 0.8 + (i % 5) * 0.73,
        z: 0.55 + Math.cos(angle) * 0.65,
      }, 0x8cb4ff, i * 0.91, 0.13, 0.12);
    }
  }

  /** Dois landmarks distantes apoiados em blockers que ja existem no mundo. */
  private buildScenicLandmarks(): void {
    const [quarry, spring] = this.scenicAnchors;
    if (quarry) {
      const root = new pc.Entity('landmark-abandoned-quarry', this.ctx.app);
      root.setLocalPosition(quarry.x, quarry.y, quarry.z);
      root.setLocalEulerAngles(0, quarry.rotationY * DEG, 0);
      this.ctx.exterior.addChild(root);
      const stone = this.ctx.material('landmark-quarry-ring', 0x4d5858, { gloss: 0.08 });
      const spentOre = this.ctx.material('landmark-quarry-spent-ore', 0x39484a, {
        emissive: hexColor(0x0c191b),
        emissiveIntensity: 0.22,
        gloss: 0.2,
      });
      const timber = this.ctx.material('landmark-quarry-timber', 0x68452c, { gloss: 0.08 });
      const iron = this.ctx.material('landmark-quarry-iron', 0x4f5961, { gloss: 0.36, metalness: 0.42 });
      const lantern = this.ctx.material('landmark-quarry-lantern', 0xffb45d, {
        emissive: hexColor(0xff6a2d),
        emissiveIntensity: 0.9,
        opacity: 0.76,
        additive: true,
        unlit: true,
      });
      this.createFlatRing('quarry-rune-ring', 0, 0, 0.82 * quarry.scale, 0.08, 0.05, stone, root, 48);
      // Restos opacos deixam claro que este e um marco cenico esgotado; os
      // cristais ciano brilhantes ficam reservados ao veio de mithril dinamico.
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI * 0.5 + 0.32;
        const size = (0.24 + (i % 2) * 0.1) * quarry.scale;
        const shard = this.ctx.createPrimitive(
          'quarry-spent-shard',
          'cone',
          spentOre,
          { x: Math.sin(angle) * 0.5 * quarry.scale, y: size * 0.28, z: Math.cos(angle) * 0.5 * quarry.scale },
          { x: size * 0.7, y: size * 0.58, z: size * 0.7 },
          root,
        );
        shard.setLocalEulerAngles(i % 2 ? 62 : -58, i * 71, i % 2 ? 18 : -20);
      }
      const gantryScale = quarry.scale * 0.74;
      this.ctx.createPrimitive('quarry-post-left', 'cylinder', timber, { x: -0.72 * gantryScale, y: 0.7 * gantryScale, z: 0.08 }, { x: 0.1 * gantryScale, y: 1.4 * gantryScale, z: 0.1 * gantryScale }, root);
      this.ctx.createPrimitive('quarry-post-right', 'cylinder', timber, { x: 0.72 * gantryScale, y: 0.7 * gantryScale, z: 0.08 }, { x: 0.1 * gantryScale, y: 1.4 * gantryScale, z: 0.1 * gantryScale }, root);
      this.ctx.createPrimitive('quarry-crossbeam', 'box', timber, { x: 0, y: 1.36 * gantryScale, z: 0.08 }, { x: 1.72 * gantryScale, y: 0.13 * gantryScale, z: 0.13 * gantryScale }, root);
      this.ctx.createPrimitive('quarry-hook-rope', 'cylinder', iron, { x: 0, y: 0.96 * gantryScale, z: 0.08 }, { x: 0.035 * gantryScale, y: 0.68 * gantryScale, z: 0.035 * gantryScale }, root);
      const lamp = this.ctx.createPrimitive('quarry-lantern', 'sphere', lantern, { x: 0, y: 0.65 * gantryScale, z: 0.08 }, { x: 0.13 * gantryScale, y: 0.16 * gantryScale, z: 0.13 * gantryScale }, root);
      this.addMote(lamp, 'overworld', { x: 0, y: 0.08, z: 0 }, 0xffbe6d, 0.8, 0.05, 0.05);
    }

    if (spring) {
      const root = new pc.Entity('landmark-moonwell', this.ctx.app);
      root.setLocalPosition(spring.x, spring.y + 0.08, spring.z);
      this.ctx.exterior.addChild(root);
      const water = this.ctx.material('moonwell-water', 0x3d8ba0, {
        emissive: hexColor(0x164452),
        emissiveIntensity: 0.65,
        opacity: 0.74,
        gloss: 0.72,
      });
      const rim = this.ctx.material('moonwell-rim', 0x59655f, { gloss: 0.09 });
      this.ctx.createPrimitive(
        'moonwell-basin',
        'cylinder',
        rim,
        { x: 0, y: 0.035, z: 0 },
        { x: 1.76 * spring.scale, y: 0.14, z: 1.76 * spring.scale },
        root,
      );
      this.ctx.createPrimitive(
        'moonwell-pool',
        'cylinder',
        water,
        { x: 0, y: 0.115, z: 0 },
        { x: 1.55 * spring.scale, y: 0.035, z: 1.55 * spring.scale },
        root,
      );
      this.createFlatRing('moonwell-rim', 0, 0, 0.82 * spring.scale, 0.1, 0.14, rim, root, 48);
      const basinStones: BoxSpec[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        basinStones.push({
          position: {
            x: Math.sin(angle) * 0.7 * spring.scale,
            y: 0.13,
            z: Math.cos(angle) * 0.7 * spring.scale,
          },
          size: { x: 0.3 * spring.scale, y: 0.13, z: 0.2 * spring.scale },
          yaw: angle,
        });
      }
      this.createBoxCluster('moonwell-basin-stones', basinStones, rim, root, false);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        this.addMote(root, 'overworld', { x: Math.sin(angle) * 0.72, y: 0.28 + (i % 2) * 0.18, z: Math.cos(angle) * 0.72 }, 0x8beeff, i * 0.93, 0.1, 0.08);
      }
    }
  }

  private buildDungeonTiles(): void {
    const tiles: BoxSpec[] = [];
    for (let z = -4; z <= 4; z++) {
      for (let x = -4; x <= 4; x++) {
        const variation = Math.abs((x * 17 + z * 31) % 4);
        tiles.push({
          position: { x: x * 4.65, y: this.dungeonFloorY + 0.018 + variation * 0.001, z: z * 4.65 },
          size: { x: 4.36, y: 0.045, z: 4.36 },
          yaw: ((x + z) % 3) * 0.006,
          color: variation === 0 ? [53, 60, 70, 255] : variation === 1 ? [47, 54, 64, 255] : [42, 49, 59, 255],
        });
      }
    }
    const material = this.ctx.material('dungeon-tile-vertex', 0xffffff, {
      diffuseVertexColor: true,
      gloss: 0.1,
    });
    this.createBoxCluster('dungeon-floor-tiles', tiles, material, this.ctx.dungeon, false);
  }

  private buildDungeonRituals(): void {
    const red = this.ctx.material('dungeon-boss-rune', 0x9f3146, {
      emissive: hexColor(0x571321),
      emissiveIntensity: 1.65,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const blue = this.ctx.material('dungeon-sanctuary-rune', 0x6f91dd, {
      emissive: hexColor(0x253a88),
      emissiveIntensity: 1.35,
      opacity: 0.48,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const gold = this.ctx.material('dungeon-treasure-rune', 0xc39b56, {
      emissive: hexColor(0x5a3513),
      emissiveIntensity: 0.9,
      opacity: 0.42,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    for (const [radius, width, y] of [[5.35, 0.14, 0.065], [3.68, 0.1, 0.071], [1.92, 0.08, 0.077]] as const) {
      this.createFlatRing('boss-ritual-ring', 0, -8, radius, width, this.dungeonFloorY + y, red, this.ctx.dungeon);
    }
    const rays: BoxSpec[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      rays.push({
        position: { x: Math.sin(angle) * 3.25, y: this.dungeonFloorY + 0.067, z: -8 + Math.cos(angle) * 3.25 },
        size: { x: 0.13, y: 0.024, z: 2.35 },
        yaw: angle,
      });
    }
    this.createBoxCluster('boss-ritual-rays', rays, red, this.ctx.dungeon, false);
    this.createFlatRing('dungeon-entry-ring', 0, 12, 3.18, 0.12, this.dungeonFloorY + 0.07, blue, this.ctx.dungeon);
    for (const [x, z] of [[-14, 13], [14, 13], [0, -16]] as const) {
      this.createFlatRing('treasure-alcove-ring', x, z, 2.38, 0.1, this.dungeonFloorY + 0.072, gold, this.ctx.dungeon);
    }
  }

  private buildDungeonEdges(): void {
    const buttresses: BoxSpec[] = [];
    for (const z of [-18, -9, 0, 9, 18]) {
      buttresses.push({ position: { x: -21.55, y: this.dungeonFloorY + 2.05, z }, size: { x: 1.6, y: 4.1, z: 1.2 } });
      buttresses.push({ position: { x: 21.55, y: this.dungeonFloorY + 2.05, z }, size: { x: 1.6, y: 4.1, z: 1.2 } });
    }
    for (const x of [-16, -8, 8, 16]) {
      buttresses.push({ position: { x, y: this.dungeonFloorY + 2.05, z: -21.55 }, size: { x: 1.2, y: 4.1, z: 1.6 } });
      buttresses.push({ position: { x, y: this.dungeonFloorY + 2.05, z: 21.55 }, size: { x: 1.2, y: 4.1, z: 1.6 } });
    }
    const wallStone = this.ctx.material('dungeon-buttress', 0x484d58, { gloss: 0.07 });
    this.createBoxCluster('dungeon-buttresses', buttresses, wallStone, this.ctx.dungeon, true);

    const rubble: BoxSpec[] = [];
    for (let i = 0; i < 34; i++) {
      const side = i % 4;
      const along = -19 + ((i * 7.13) % 38);
      const inset = 19.6 + (i % 3) * 0.45;
      const x = side === 0 ? -inset : side === 1 ? inset : along;
      const z = side === 2 ? -inset : side === 3 ? inset : along;
      const size = 0.32 + (i % 5) * 0.075;
      rubble.push({
        position: { x, y: this.dungeonFloorY + size * 0.24, z },
        size: { x: size * 1.4, y: size * 0.48, z: size },
        yaw: i * 0.73,
        color: i % 2 ? [57, 59, 66, 255] : [68, 68, 73, 255],
      });
    }
    const rubbleMaterial = this.ctx.material('dungeon-rubble-vertex', 0xffffff, { diffuseVertexColor: true, gloss: 0.04 });
    this.createBoxCluster('dungeon-edge-rubble', rubble, rubbleMaterial, this.ctx.dungeon, true);

    const crystal = this.ctx.material('dungeon-edge-crystal', 0x718bda, {
      emissive: hexColor(0x263a91),
      emissiveIntensity: 1.15,
      gloss: 0.5,
    });
    const crystals = [[-19, -16, 1.0], [19, -16, 0.9], [-19, 15, 0.76], [19, 15, 0.82], [-12, -20, 0.68], [12, -20, 0.72]] as const;
    crystals.forEach(([x, z, size], index) => {
      const shard = this.ctx.createPrimitive('dungeon-edge-crystal', 'cone', crystal, { x, y: this.dungeonFloorY + size * 0.72, z }, { x: size * 0.72, y: size * 1.45, z: size * 0.72 }, this.ctx.dungeon);
      shard.setLocalEulerAngles(index % 2 ? -7 : 8, index * 53, index % 2 ? 5 : -5);
    });
  }

  private buildDungeonExit(exitPosition: Vec3Like): void {
    const root = new pc.Entity('dungeon-exit', this.ctx.app);
    root.setLocalPosition(exitPosition.x, this.dungeonFloorY, exitPosition.z);
    this.ctx.dungeon.addChild(root);
    const arch = this.ctx.material('dungeon-exit-arch', 0x656c7c, { gloss: 0.13 });
    const portal = this.ctx.material('dungeon-exit-portal', 0x5278d4, {
      emissive: hexColor(0x2547a5),
      emissiveIntensity: 1.8,
      opacity: 0.72,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const blocks: BoxSpec[] = [
      { position: { x: -1.95, y: 0.38, z: 0 }, size: { x: 1.05, y: 0.76, z: 1.1 } },
      { position: { x: 1.95, y: 0.38, z: 0 }, size: { x: 1.05, y: 0.76, z: 1.1 } },
      { position: { x: -1.95, y: 2.05, z: 0 }, size: { x: 0.72, y: 3.05, z: 0.82 } },
      { position: { x: 1.95, y: 2.05, z: 0 }, size: { x: 0.72, y: 3.05, z: 0.82 } },
      { position: { x: 0, y: 3.95, z: 0 }, size: { x: 4.55, y: 0.72, z: 0.92 } },
      { position: { x: 0, y: 4.48, z: 0 }, size: { x: 2.0, y: 0.34, z: 0.7 } },
    ];
    this.createBoxCluster('dungeon-exit-arch', blocks, arch, root, true);
    this.ctx.createPrimitive('dungeon-exit-veil', 'box', portal, { x: 0, y: 2.05, z: 0.33 }, { x: 3.2, y: 3.35, z: 0.055 }, root);
    const halo = this.ctx.createPrimitive('dungeon-exit-halo', 'torus', portal, { x: 0, y: 2.05, z: 0.39 }, { x: 3.85, y: 0.07, z: 3.85 }, root);
    halo.setLocalEulerAngles(90, 0, 0);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      this.addMote(root, 'dungeon', { x: Math.sin(angle) * 1.45, y: 0.9 + (i % 4) * 0.72, z: 0.55 }, 0x86a6ff, i * 0.87, 0.11, 0.12);
    }
  }

  private buildDungeonLights(): void {
    const lights = [
      [-17, -17, 0xff8a48], [17, -17, 0xff8a48], [-17, 17, 0xff9b55], [17, 17, 0xff9b55],
      [-20, 0, 0x638cff], [20, 0, 0x638cff],
    ] as const;
    lights.forEach(([x, z, color], index) => {
      this.addBeacon(this.ctx.dungeon, 'dungeon', { x, y: this.dungeonFloorY + 3.35, z }, color, index < 4 ? 17 : 10, index < 4 ? 16 : 13, index * 0.91, 0.19);
    });
    for (let i = 0; i < 14; i++) {
      const x = -17 + ((i * 7.7) % 34);
      const z = -16 + ((i * 11.3) % 32);
      this.addMote(this.ctx.dungeon, 'dungeon', { x, y: this.dungeonFloorY + 0.65 + (i % 5) * 0.42, z }, i % 3 ? 0xff9c62 : 0x7797ff, i * 0.73, 0.12, 0.08);
    }
  }

  private addBeacon(
    parent: pc.Entity,
    zone: WorldZone,
    position: Vec3Like,
    color: number,
    intensity: number,
    range: number,
    phase: number,
    glowScale: number,
  ): void {
    const light = new pc.Entity('map-beacon-light', this.ctx.app);
    light.setLocalPosition(position.x, position.y, position.z);
    light.addComponent('light', {
      type: 'omni',
      color: hexColor(color),
      intensity,
      range,
      castShadows: false,
    });
    parent.addChild(light);
    const glow = this.ctx.createPrimitive(
      'map-beacon-glow',
      'sphere',
      this.ctx.material(`map-beacon-${color.toString(16)}`, color, {
        emissive: hexColor(color),
        emissiveIntensity: 1.7,
        opacity: 0.84,
        additive: true,
        unlit: true,
        depthWrite: false,
      }),
      position,
      { x: glowScale, y: glowScale * 1.15, z: glowScale },
      parent,
    );
    this.pulseLights.push({ entity: light, glow, zone, intensity, phase, baseScale: glowScale });
  }

  private addMote(
    parent: pc.Entity,
    zone: WorldZone,
    position: Vec3Like,
    color: number,
    phase: number,
    radius: number,
    lift: number,
  ): void {
    const entity = this.ctx.createPrimitive(
      'map-mote',
      'sphere',
      this.ctx.material(`map-mote-${color.toString(16)}`, color, {
        emissive: hexColor(color),
        emissiveIntensity: 1.4,
        opacity: 0.72,
        additive: true,
        unlit: true,
        depthWrite: false,
      }),
      position,
      { x: 0.075, y: 0.075, z: 0.075 },
      parent,
    );
    this.motes.push({ entity, zone, base: { ...position }, phase, radius, lift });
  }

  /** Anel horizontal realmente fino; o torus padrao vira um disco em escalas grandes. */
  private createFlatRing(
    name: string,
    centerX: number,
    centerZ: number,
    radius: number,
    width: number,
    y: number,
    material: pc.Material,
    parent: pc.Entity,
    segments = 72,
  ): pc.Entity {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const inner = Math.max(0, radius - width * 0.5);
    const outer = radius + width * 0.5;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      positions.push(
        centerX + sin * inner, y, centerZ + cos * inner,
        centerX + sin * outer, y, centerZ + cos * outer,
      );
      normals.push(0, 1, 0, 0, 1, 0);
      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 1, base + 3, base, base + 3, base + 2);
      }
    }
    const mesh = pc.createMesh(this.ctx.app.graphicsDevice, positions, { indices, normals });
    const entity = new pc.Entity(name, this.ctx.app);
    entity.addComponent('render', {
      meshInstances: [new pc.MeshInstance(mesh, material)],
      castShadows: false,
      receiveShadows: true,
    });
    parent.addChild(entity);
    return entity;
  }

  /** Mosaico radial da praca: muitos setores, mas uma unica draw call. */
  private createRadialMosaic(
    name: string,
    innerRadius: number,
    outerRadius: number,
    bands: number,
    segments: number,
    y: number,
    parent: pc.Entity,
  ): pc.Entity {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const palette = [
      [25, 48, 30, 255],
      [31, 55, 34, 255],
      [38, 60, 38, 255],
      [34, 51, 35, 255],
      [43, 61, 40, 255],
    ] as const;
    for (let band = 0; band < bands; band++) {
      const r0 = innerRadius + (outerRadius - innerRadius) * (band / bands);
      const r1 = innerRadius + (outerRadius - innerRadius) * ((band + 1) / bands);
      for (let segment = 0; segment < segments; segment++) {
        const a0 = (segment / segments) * Math.PI * 2;
        const a1 = ((segment + 1) / segments) * Math.PI * 2;
        const base = positions.length / 3;
        positions.push(
          Math.sin(a0) * r0, y, Math.cos(a0) * r0,
          Math.sin(a0) * r1, y, Math.cos(a0) * r1,
          Math.sin(a1) * r1, y, Math.cos(a1) * r1,
          Math.sin(a1) * r0, y, Math.cos(a1) * r0,
        );
        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
        const color = palette[(segment + band * 2) % palette.length];
        for (let i = 0; i < 4; i++) colors.push(...color);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const mesh = pc.createMesh(this.ctx.app.graphicsDevice, positions, { indices, normals, colors });
    // A divisao geometrica cria juntas sutis; a cor uniforme evita que alguns
    // drivers tratem COLOR8 do leque radial como uma camada superexposta.
    const material = this.ctx.material('camp-mosaic-surface', 0x214b2c, { gloss: 0.06 });
    const entity = new pc.Entity(name, this.ctx.app);
    entity.addComponent('render', {
      meshInstances: [new pc.MeshInstance(mesh, material)],
      castShadows: false,
      receiveShadows: true,
    });
    parent.addChild(entity);
    return entity;
  }

  /** Junta dezenas de caixas do mesmo material em uma unica malha/draw call. */
  private createBoxCluster(
    name: string,
    boxes: readonly BoxSpec[],
    material: pc.Material,
    parent: pc.Entity,
    castShadows: boolean,
  ): pc.Entity | null {
    if (boxes.length === 0) return null;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const faces = [
      { n: [0, 0, 1], c: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
      { n: [0, 0, -1], c: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
      { n: [1, 0, 0], c: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
      { n: [-1, 0, 0], c: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
      { n: [0, 1, 0], c: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
      { n: [0, -1, 0], c: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
    ] as const;

    for (const box of boxes) {
      const yaw = box.yaw ?? 0;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      const color = box.color ?? [255, 255, 255, 255];
      for (const face of faces) {
        const base = positions.length / 3;
        const normalX = face.n[0] * cos + face.n[2] * sin;
        const normalZ = -face.n[0] * sin + face.n[2] * cos;
        for (const corner of face.c) {
          const localX = corner[0] * box.size.x;
          const localY = corner[1] * box.size.y;
          const localZ = corner[2] * box.size.z;
          positions.push(
            box.position.x + localX * cos + localZ * sin,
            box.position.y + localY,
            box.position.z - localX * sin + localZ * cos,
          );
          normals.push(normalX, face.n[1], normalZ);
          colors.push(color[0], color[1], color[2], color[3] ?? 255);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }

    const mesh = pc.createMesh(this.ctx.app.graphicsDevice, positions, { indices, normals, colors });
    const meshInstance = new pc.MeshInstance(mesh, material);
    meshInstance.castShadow = castShadows;
    const entity = new pc.Entity(name, this.ctx.app);
    entity.addComponent('render', {
      meshInstances: [meshInstance],
      castShadows,
      receiveShadows: true,
    });
    parent.addChild(entity);
    return entity;
  }
}
