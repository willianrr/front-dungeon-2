import * as pc from 'playcanvas';

import { mulberry32 } from '../shared/rng';
import type { Terrain } from '../shared/Terrain';
import type { PropInstance, PropKind, WorldData } from '../shared/worldgen';
import type { WorldZone } from '../shared/types';
import type { RenderStats } from '../ui/PerfOverlay';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface PointerNdc {
  x: number;
  y: number;
}

export interface RayHit {
  point: Vec3Like;
  distance: number;
}

export interface WorldRay {
  origin: pc.Vec3;
  direction: pc.Vec3;
}

export interface RenderQualityPreset {
  bloom: boolean;
  bloomStrength: number;
  /** MSAA do render target interno do CameraFrame (1 = sem). */
  samples: number;
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
}

export interface EntityBounds {
  center: Vec3Like;
  size: Vec3Like;
  minY: number;
  maxY: number;
  largest: number;
}

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const PORTAL_RADIUS = 4.2;
const DUNGEON_EXIT_RADIUS = 4;
// Luz ambiente por zona: fora mais clara; na dungeon bem mais escura para o
// clima de masmorra (tochas, cristais e o glow das armas passam a POP como no Mu).
// Nota: o glow da arma e unlit/emissivo — NAO e afetado por estes valores, entao
// da pra escurecer o mundo a vontade sem mexer no efeito.
const AMBIENT_OVERWORLD = 0x475467;
const AMBIENT_DUNGEON = 0x333c4e;
// Intensidades do sol e da luz de preenchimento no overworld (a dungeon reduz).
const SUN_INTENSITY = 1.75;
const FILL_INTENSITY = 0.26;
// Ceu/nevoa do overworld: tom mais escuro e dessaturado — o antigo 0xaac4d6
// (azul bem claro) "leiteava" a cena inteira com a camera afastada, porque a
// nevoa EXP2 mistura tudo em direcao a essa cor.
const SKY_OVERWORLD = 0x7b8fa4;
const FOG_DENSITY_OVERWORLD = 0.0052;

// ---------------------------------------------------------------------------
// Pacote de natureza (Quaternius, public/nature). As POSICOES dos props vem do
// worldgen COMPARTILHADO com o servidor (colisao/blockers!) — aqui trocamos
// apenas o VISUAL: tree -> Maple/Birch, rock -> Rock, ruin -> arvore morta.
// A decoracao extra (grama/flores/arbustos) e client-side, sem colisao,
// espalhada por seed. Se qualquer arquivo faltar, cai nos props primitivos.
// ---------------------------------------------------------------------------
const NATURE_TREE_URLS = [
  '/nature/glTF/MapleTree_1.gltf',
  '/nature/glTF/MapleTree_2.gltf',
  '/nature/glTF/MapleTree_5.gltf',
  '/nature/glTF/BirchTree_1.gltf',
  '/nature/glTF/BirchTree_4.gltf',
] as const;
const NATURE_RUIN_URLS = [
  '/nature/glTF/DeadTree_2.gltf',
  '/nature/glTF/DeadTree_5.gltf',
] as const;
// Convertida de OBJ (o pacote nao traz rocks em glTF); cinza chapado de proposito.
const NATURE_ROCK_URLS = ['/nature/glb/Rock_1.gltf'] as const;
// Decoracao sem colisao, colocada em MANCHAS (clusters) para dar a sensacao de
// campo gramado do pacote — pontos isolados somem no mapa de 200x200.
const NATURE_GRASS_URL = '/nature/glTF/Grass_Large_Extruded.gltf';
const NATURE_BUSH_URLS = ['/nature/glTF/Bush.gltf', '/nature/glTF/Bush_Flowers.gltf'] as const;
const NATURE_FLOWER_URLS = [
  '/nature/glTF/Flower_1_Clump.gltf',
  '/nature/glTF/Flower_2_Clump.gltf',
  '/nature/glTF/Flower_4_Clump.gltf',
] as const;
// Trilha de terra spawn -> portal (visual, sem gameplay): largura e afastamento
// que a decoracao respeita para o caminho ficar sempre limpo.
const NATURE_PATH_WIDTH = 2.4;
const NATURE_PATH_CLEARANCE = 2.8;
// Cinza levemente esverdeado e mais escuro para as pedras (o 0.64 chapado do
// OBJ estourava branco com ACES+bloom; a referencia do pacote e mais escura).
const NATURE_ROCK_TINT = { r: 0.52, g: 0.56, b: 0.52 };
// Alturas/tamanhos-alvo em unidades de mundo na escala 1 do prop (o worldgen
// multiplica por prop.scale 0.6..1.7). Espelham o volume dos primitivos antigos
// para a silhueta continuar proxima do blocker de colisao do servidor.
const NATURE_TREE_HEIGHT = 4.6;
const NATURE_RUIN_HEIGHT = 3.4;
const NATURE_ROCK_LARGEST = 2.1;

function hexColor(hex: number, alpha = 1): pc.Color {
  return new pc.Color(
    ((hex >> 16) & 255) / 255,
    ((hex >> 8) & 255) / 255,
    (hex & 255) / 255,
    alpha,
  );
}

export function colorFromCss(value: string, alpha = 1): pc.Color {
  const normalized = value.startsWith('#') ? value.slice(1) : value;
  const parsed = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized, 16);
  return Number.isFinite(parsed) ? hexColor(parsed, alpha) : new pc.Color(1, 1, 1, alpha);
}

export function createMaterial(
  color: pc.Color,
  options: {
    emissive?: pc.Color;
    emissiveIntensity?: number;
    opacity?: number;
    unlit?: boolean;
    additive?: boolean;
  } = {},
): pc.StandardMaterial {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.useLighting = !options.unlit;
  if (options.emissive) {
    material.emissive = options.emissive;
    material.emissiveIntensity = options.emissiveIntensity ?? 1;
  }
  if (options.opacity !== undefined && options.opacity < 1) {
    material.opacity = options.opacity;
    material.blendType = options.additive ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
    material.depthWrite = false;
  } else if (options.additive) {
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
  }
  material.update();
  return material;
}

export function makeEntity(name: string, app?: pc.AppBase): pc.Entity {
  return new pc.Entity(name, app);
}

function setTransform(entity: pc.Entity, position: Vec3Like, scale?: Vec3Like): void {
  entity.setLocalPosition(position.x, position.y, position.z);
  if (scale) entity.setLocalScale(scale.x, scale.y, scale.z);
}

export function setYaw(entity: pc.Entity, yawRadians: number): void {
  entity.setLocalEulerAngles(0, yawRadians * DEG, 0);
}

export function entityPosition(entity: pc.Entity): Vec3Like {
  const p = entity.getLocalPosition();
  return { x: p.x, y: p.y, z: p.z };
}

export function setEntityPosition(entity: pc.Entity, position: Vec3Like): void {
  entity.setLocalPosition(position.x, position.y, position.z);
}

export function lerpEntityPosition(entity: pc.Entity, target: Vec3Like, alpha: number): number {
  const p = entity.getLocalPosition();
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dz = target.z - p.z;
  entity.setLocalPosition(p.x + dx * alpha, p.y + dy * alpha, p.z + dz * alpha);
  return Math.hypot(dx, dy, dz);
}

export function entityYaw(entity: pc.Entity): number {
  return entity.getLocalEulerAngles().y * RAD;
}

export function setEntityVisible(entity: pc.Entity, visible: boolean): void {
  entity.enabled = visible;
}

export function destroyEntity(entity: pc.Entity | null | undefined): void {
  entity?.destroy();
}

export function computeEntityBounds(entity: pc.Entity): EntityBounds | null {
  entity.syncHierarchy();
  const renders = entity.findComponents('render') as unknown as Array<{
    meshInstances?: Array<{ aabb?: pc.BoundingBox }>;
  }>;
  let bounds: pc.BoundingBox | null = null;
  for (const render of renders) {
    for (const meshInstance of render.meshInstances ?? []) {
      if (!meshInstance.aabb) continue;
      if (!bounds) bounds = meshInstance.aabb.clone();
      else bounds.add(meshInstance.aabb);
    }
  }
  if (!bounds) return null;
  const min = bounds.getMin();
  const max = bounds.getMax();
  const size = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: max.z - min.z,
  };
  return {
    center: bounds.center,
    size,
    minY: min.y,
    maxY: max.y,
    largest: Math.max(size.x, size.y, size.z, 0.001),
  };
}

export function fitEntityToHeight(entity: pc.Entity, targetHeight: number, yOffset = 0): EntityBounds | null {
  const bounds = computeEntityBounds(entity);
  if (!bounds) return null;
  const scale = targetHeight / Math.max(bounds.size.y, 0.001);
  entity.setLocalScale(scale, scale, scale);
  entity.setLocalPosition(-bounds.center.x * scale, -bounds.minY * scale + yOffset, -bounds.center.z * scale);
  return bounds;
}

export function fitEntityToLargest(entity: pc.Entity, targetLargest: number, yOffset = 0): EntityBounds | null {
  const bounds = computeEntityBounds(entity);
  if (!bounds) return null;
  const scale = targetLargest / bounds.largest;
  entity.setLocalScale(scale, scale, scale);
  entity.setLocalPosition(-bounds.center.x * scale, -bounds.minY * scale + yOffset, -bounds.center.z * scale);
  return bounds;
}

export function fitWeaponToGrip(
  entity: pc.Entity,
  worldLength: number,
  gripFromBottomRatio: number,
  inheritedScale = 1,
): EntityBounds | null {
  const bounds = computeEntityBounds(entity);
  if (!bounds) return null;
  const scale = worldLength / bounds.largest / Math.max(0.0001, inheritedScale);
  const gripY = (bounds.minY + bounds.size.y * gripFromBottomRatio) * scale;
  entity.setLocalScale(scale, scale, scale);
  entity.setLocalPosition(-bounds.center.x * scale, -gripY, -bounds.center.z * scale);
  return bounds;
}

export function distanceRayToPoint(ray: WorldRay, point: Vec3Like): { distanceSq: number; t: number } {
  const vx = point.x - ray.origin.x;
  const vy = point.y - ray.origin.y;
  const vz = point.z - ray.origin.z;
  const t = Math.max(0, vx * ray.direction.x + vy * ray.direction.y + vz * ray.direction.z);
  const px = ray.origin.x + ray.direction.x * t;
  const py = ray.origin.y + ray.direction.y * t;
  const pz = ray.origin.z + ray.direction.z * t;
  return {
    t,
    distanceSq: (point.x - px) ** 2 + (point.y - py) ** 2 + (point.z - pz) ** 2,
  };
}

export class ModelCache {
  private readonly containers = new Map<string, Promise<pc.ContainerResource>>();

  constructor(private readonly app: pc.Application) {}

  preload(urls: readonly string[]): Promise<void> {
    return Promise.all(urls.map((url) => this.load(url).then(() => undefined))).then(() => undefined);
  }

  async animationTracks(url: string): Promise<pc.AnimTrack[]> {
    const container = await this.load(url) as pc.ContainerResource & { animations?: pc.Asset[] };
    return (container.animations ?? [])
      .map((asset) => asset.resource)
      .filter((resource): resource is pc.AnimTrack => resource instanceof pc.AnimTrack);
  }

  async instantiate(url: string, options: { castShadows?: boolean; receiveShadows?: boolean } = {}): Promise<pc.Entity> {
    const container = await this.load(url);
    const entity = container.instantiateRenderEntity({
      castShadows: options.castShadows ?? true,
      receiveShadows: options.receiveShadows ?? true,
    });
    entity.name = url.split('/').pop() ?? 'model';
    return entity;
  }

  private load(url: string): Promise<pc.ContainerResource> {
    let pending = this.containers.get(url);
    if (!pending) {
      pending = new Promise((resolve, reject) => {
        this.app.assets.loadFromUrl(url, 'container', (error, asset) => {
          if (error || !asset?.resource) {
            reject(error ?? new Error(`Asset sem resource: ${url}`));
            return;
          }
          resolve(asset.resource as pc.ContainerResource);
        });
      });
      this.containers.set(url, pending);
    }
    return pending;
  }
}

export class PcCameraRig {
  readonly entity: pc.Entity;

  private yaw = Math.PI * 0.25;
  private readonly pitch = 52 * RAD;
  private distance = 20;
  // Campo de visao estilo Diablo: zoom out capado (38 mostrava mundo demais e
  // exigia AOI maior no servidor). O raio do AOI (sim/entity.go) acompanha.
  private readonly minDist = 10;
  private readonly maxDist = 28;
  private readonly target = new pc.Vec3();
  private readonly desired = new pc.Vec3();
  private readonly shakeOffset = new pc.Vec3();
  private readonly tmpLook = new pc.Vec3();
  private initialized = false;
  private shake = 0;
  private shakeTime = 0;

  constructor(app: pc.Application, aspect: number) {
    this.entity = new pc.Entity('camera', app);
    this.entity.addComponent('camera', {
      fov: 50,
      nearClip: 0.1,
      farClip: 2000,
      clearColor: hexColor(SKY_OVERWORLD),
    });
    this.resize(aspect);
  }

  setTarget(x: number, y: number, z: number): void {
    this.desired.set(x, y + 1, z);
  }

  zoom(delta: number): void {
    this.distance = Math.max(this.minDist, Math.min(this.maxDist, this.distance + delta * 2));
  }

  rotate(dir: number, dt: number): void {
    this.yaw += dir * dt * 1.6;
  }

  addShake(intensity: number): void {
    this.shake = Math.max(this.shake, Math.max(0, Math.min(1, intensity)));
  }

  getMoveDirection(strafe: number, forward: number): { x: number; z: number } {
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const x = rightX * strafe + forwardX * forward;
    const z = rightZ * strafe + forwardZ * forward;
    const length = Math.hypot(x, z);
    return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
  }

  update(dt: number): void {
    this.shakeTime += dt;
    if (!this.initialized) {
      this.target.copy(this.desired);
      this.initialized = true;
    }

    const alpha = 1 - Math.pow(0.0015, dt);
    this.target.lerp(this.target, this.desired, alpha);

    const horiz = Math.cos(this.pitch) * this.distance;
    const height = Math.sin(this.pitch) * this.distance;
    this.entity.setPosition(
      this.target.x + Math.sin(this.yaw) * horiz,
      this.target.y + height,
      this.target.z + Math.cos(this.yaw) * horiz,
    );

    if (this.shake > 0.001) {
      const strength = this.shake * this.shake;
      this.shakeOffset.set(
        Math.sin(this.shakeTime * 71) * 0.18 * strength,
        Math.sin(this.shakeTime * 97) * 0.08 * strength,
        Math.cos(this.shakeTime * 83) * 0.18 * strength,
      );
      const p = this.entity.getPosition();
      this.entity.setPosition(p.x + this.shakeOffset.x, p.y + this.shakeOffset.y, p.z + this.shakeOffset.z);
      this.tmpLook.copy(this.target).add(this.shakeOffset.clone().mulScalar(0.32));
      this.entity.lookAt(this.tmpLook);
      this.shake = Math.max(0, this.shake - dt * 2.8);
      return;
    }

    this.entity.lookAt(this.target);
  }

  resize(aspect: number): void {
    const camera = this.entity.camera;
    if (camera) camera.aspectRatio = aspect;
  }
}

export class PcWorld {
  readonly app: pc.Application;
  readonly root: pc.Entity;
  readonly exterior: pc.Entity;
  readonly dungeon: pc.Entity;
  readonly rig: PcCameraRig;
  readonly models: ModelCache;

  private readonly materials = new Map<string, pc.StandardMaterial>();
  /** Bounds cacheados por URL dos modelos do pacote nature (normalizacao). */
  private readonly natureBounds = new Map<string, EntityBounds>();
  /** Pontos (XZ) da trilha spawn -> portal; decoracao mantem distancia deles. */
  private naturePathPoints: Array<{ x: number; z: number }> = [];
  /** Grupo de batching estatico da decoracao (grama/flores/arbustos). */
  private decorBatchGroupId: number | null = null;
  private rockTintApplied = false;
  private readonly sun: pc.Entity;
  private readonly fill: pc.Entity;
  private readonly sunDir = new pc.Vec3();
  /** Pos-processamento (bloom + tonemapping). null se a criacao falhar. */
  private frame: pc.CameraFrame | null = null;
  private zone: WorldZone = 'overworld';
  private width = window.innerWidth;
  private height = window.innerHeight;
  private pixelRatioCap = 1;
  private shadowsEnabled = true;
  private readonly portalPosition: Vec3Like;
  private readonly dungeonExitPosition: Vec3Like;
  private readonly dungeonFloorY: number;

  constructor(private readonly canvas: HTMLCanvasElement, readonly world: WorldData) {
    this.app = new pc.Application(canvas, {
      graphicsDeviceOptions: {
        antialias: false,
        powerPreference: 'high-performance',
      },
    });
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.scene.ambientLight = hexColor(AMBIENT_OVERWORLD);
    // Compensa o tonemapping ACES (escurece os meios-tons) mantendo o nivel geral.
    this.app.scene.exposure = 1.18;
    this.app.scene.fog.type = pc.FOG_EXP2;
    this.app.scene.fog.color = hexColor(SKY_OVERWORLD);
    this.app.scene.fog.density = FOG_DENSITY_OVERWORLD;

    this.root = new pc.Entity('world-root', this.app);
    this.exterior = new pc.Entity('overworld', this.app);
    this.dungeon = new pc.Entity('dungeon', this.app);
    this.sun = new pc.Entity('sun', this.app);
    this.fill = new pc.Entity('fill-light', this.app);
    this.models = new ModelCache(this.app);
    this.rig = new PcCameraRig(this.app, window.innerWidth / window.innerHeight);
    this.app.root.addChild(this.root);
    this.root.addChild(this.rig.entity);
    this.root.addChild(this.exterior);
    this.root.addChild(this.dungeon);

    this.sun.addComponent('light', {
      type: 'directional',
      color: hexColor(0xfff1d6),
      intensity: SUN_INTENSITY,
      castShadows: true,
      shadowResolution: 1024,
      // PCF5 = sombra com bordas suaves (a PCF3 padrao fica serrilhada/"crua").
      shadowType: pc.SHADOW_PCF5_32F,
      shadowDistance: 62,
      shadowIntensity: 0.9,
      normalOffsetBias: 0.05,
    });
    this.root.addChild(this.sun);

    // Luz de preenchimento fria vinda do lado oposto ao sol, sem sombras: tira o
    // aspecto chapado/"cru" dos lados nao iluminados sem custo relevante de GPU.
    this.fill.addComponent('light', {
      type: 'directional',
      color: hexColor(0x8fa5c8),
      intensity: FILL_INTENSITY,
      castShadows: false,
    });
    this.fill.setPosition(-40, 46, -52);
    this.fill.lookAt(0, 0, 0);
    this.root.addChild(this.fill);

    // Pipeline de pos-processamento: tonemapping filmico + bloom (o bloom e o que
    // faz o brilho da arma "estourar" como no Mu Online). Intensidade/MSAA vem do
    // preset de qualidade em setRenderQuality; na qualidade baixa fica desligado.
    const cameraComponent = this.rig.entity.camera;
    if (cameraComponent) {
      cameraComponent.toneMapping = pc.TONEMAP_ACES;
      try {
        this.frame = new pc.CameraFrame(this.app, cameraComponent);
        this.frame.rendering.toneMapping = pc.TONEMAP_ACES;
        this.frame.rendering.samples = 1;
        this.frame.bloom.intensity = 0;
        this.frame.update();
      } catch (error) {
        this.frame = null;
        console.warn('[PcWorld] CameraFrame indisponivel; seguindo sem bloom:', error);
      }
    }

    const elevation = 28 * RAD;
    const azimuth = 155 * RAD;
    this.sunDir.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    );

    this.portalPosition = {
      x: world.dungeon.x,
      y: world.terrain.heightAt(world.dungeon.x, world.dungeon.z) + 2,
      z: world.dungeon.z,
    };
    this.dungeonFloorY = world.terrain.heightAt(0, 0) + 0.04;
    this.dungeonExitPosition = { x: 0, y: this.dungeonFloorY + 1.8, z: -18 };

    this.buildOverworld();
    this.buildDungeon();
    this.setZone('overworld');
    this.resize(window.innerWidth, window.innerHeight);
  }

  start(onUpdate: (dt: number) => void): void {
    this.app.on('update', onUpdate);
    this.app.start();
  }

  setRenderQuality(preset: RenderQualityPreset): void {
    this.pixelRatioCap = preset.pixelRatioCap;
    this.shadowsEnabled = preset.shadows;
    const light = this.sun.light;
    if (light) {
      light.castShadows = preset.shadows;
      light.shadowResolution = preset.shadowMapSize;
    }
    if (this.frame) {
      const bloomOn = preset.bloom && preset.bloomStrength > 0;
      // Sem bloom e sem MSAA nao ha motivo para pagar o custo do render pass:
      // desliga o CameraFrame inteiro (o tonemapping ACES continua via camera).
      const frameOn = bloomOn || preset.samples > 1;
      this.frame.enabled = frameOn;
      if (frameOn) {
        this.frame.bloom.intensity = bloomOn ? preset.bloomStrength : 0;
        this.frame.rendering.samples = Math.max(1, preset.samples);
        this.frame.update();
      }
    }
    this.resize(this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const dpr = Math.max(0.65, Math.min(window.devicePixelRatio || 1, this.pixelRatioCap));
    const gd = this.app.graphicsDevice as unknown as { maxPixelRatio?: number };
    gd.maxPixelRatio = dpr;
    this.app.resizeCanvas(width, height);
    this.rig.resize(width / Math.max(1, height));
  }

  setZone(zone: WorldZone): void {
    if (zone === this.zone && this.exterior.enabled !== this.dungeon.enabled) return;
    this.zone = zone;
    const outside = zone === 'overworld';
    this.exterior.enabled = outside;
    this.dungeon.enabled = !outside;
    this.app.scene.ambientLight = hexColor(outside ? AMBIENT_OVERWORLD : AMBIENT_DUNGEON);
    // Na dungeon o sol nao entra e a luz fria de preenchimento cai pra nao lavar
    // a escuridao (o clima passa a vir das tochas/cristais, como no Mu).
    if (this.sun.light) this.sun.light.intensity = outside ? SUN_INTENSITY : 0.35;
    if (this.fill.light) this.fill.light.intensity = outside ? FILL_INTENSITY : 0.18;
    this.app.scene.fog.color = hexColor(outside ? SKY_OVERWORLD : 0x0b1016);
    this.app.scene.fog.density = outside ? FOG_DENSITY_OVERWORLD : 0.045;
    if (this.rig.entity.camera) this.rig.entity.camera.clearColor = hexColor(outside ? SKY_OVERWORLD : 0x05070b);
  }

  updateSun(x: number, y: number, z: number): void {
    if (this.zone !== 'overworld') return;
    this.sun.setPosition(x + this.sunDir.x * 70, y + this.sunDir.y * 70 + 20, z + this.sunDir.z * 70);
    this.sun.lookAt(x, y, z);
  }

  screenRay(ndc: PointerNdc): WorldRay {
    const sx = ((ndc.x + 1) / 2) * this.canvas.clientWidth;
    const sy = ((1 - ndc.y) / 2) * this.canvas.clientHeight;
    const camera = this.rig.entity.camera!;
    const origin = camera.screenToWorld(sx, sy, camera.nearClip);
    const end = camera.screenToWorld(sx, sy, camera.farClip);
    const direction = end.clone().sub(origin).normalize();
    return { origin, direction };
  }

  pickPortal(ray: WorldRay): 'enter-dungeon' | 'leave-dungeon' | null {
    if (this.zone === 'overworld') {
      const hit = distanceRayToPoint(ray, this.portalPosition);
      return hit.t < 180 && hit.distanceSq <= PORTAL_RADIUS * PORTAL_RADIUS ? 'enter-dungeon' : null;
    }
    const hit = distanceRayToPoint(ray, this.dungeonExitPosition);
    return hit.t < 90 && hit.distanceSq <= DUNGEON_EXIT_RADIUS * DUNGEON_EXIT_RADIUS ? 'leave-dungeon' : null;
  }

  pickGround(ray: WorldRay): RayHit | null {
    return this.zone === 'dungeon'
      ? this.pickDungeonFloor(ray)
      : this.pickTerrain(ray);
  }

  project(point: Vec3Like): { x: number; y: number; visible: boolean } {
    const camera = this.rig.entity.camera;
    if (!camera) return { x: 0, y: 0, visible: false };
    const screen = camera.worldToScreen(new pc.Vec3(point.x, point.y, point.z));
    return {
      x: screen.x,
      y: screen.y,
      visible: screen.z > 0 && screen.x >= -80 && screen.y >= -80
        && screen.x <= this.canvas.clientWidth + 80
        && screen.y <= this.canvas.clientHeight + 80,
    };
  }

  createPrimitive(
    name: string,
    type: 'box' | 'capsule' | 'cone' | 'cylinder' | 'plane' | 'sphere' | 'torus',
    material: pc.Material,
    position: Vec3Like,
    scale: Vec3Like,
    parent: pc.Entity = this.root,
  ): pc.Entity {
    const entity = new pc.Entity(name, this.app);
    setTransform(entity, position, scale);
    entity.addComponent('render', {
      type,
      material,
      castShadows: this.shadowsEnabled,
      receiveShadows: true,
    });
    parent.addChild(entity);
    return entity;
  }

  material(key: string, color: number | string, options: Parameters<typeof createMaterial>[1] = {}): pc.StandardMaterial {
    const cacheKey = `${key}:${typeof color === 'string' ? color : color.toString(16)}:${options.opacity ?? 1}:${options.additive ? 1 : 0}:${options.unlit ? 1 : 0}`;
    let material = this.materials.get(cacheKey);
    if (!material) {
      material = createMaterial(typeof color === 'string' ? colorFromCss(color) : hexColor(color), options);
      this.materials.set(cacheKey, material);
    }
    return material;
  }

  createFallbackCharacter(name: string, bodyColor: number, headColor: number): pc.Entity {
    const root = new pc.Entity(name, this.app);
    this.createPrimitive('body', 'cylinder', this.material(`body-${bodyColor}`, bodyColor), { x: 0, y: 0.95, z: 0 }, { x: 0.95, y: 1.5, z: 0.95 }, root);
    this.createPrimitive('head', 'sphere', this.material(`head-${headColor}`, headColor), { x: 0, y: 2.0, z: 0 }, { x: 0.84, y: 0.84, z: 0.84 }, root);
    this.createPrimitive('front', 'box', this.material('front', 0xf2e2b0), { x: 0, y: 1.1, z: 0.55 }, { x: 0.22, y: 0.22, z: 0.6 }, root);
    return root;
  }

  createTargetMarker(): pc.Entity {
    const marker = this.createPrimitive(
      'target-marker',
      'torus',
      this.material('target-marker', 0x6cff8a, { opacity: 0.86, additive: true, unlit: true }),
      { x: 0, y: 0, z: 0 },
      { x: 0.58, y: 0.025, z: 0.58 },
    );
    marker.enabled = false;
    return marker;
  }

  getRenderStats(): RenderStats {
    const gd = this.app.graphicsDevice as unknown as {
      _drawCallsPerFrame?: number;
      _vram?: { tex?: number; vb?: number; ib?: number };
      textures?: Set<unknown>;
    };
    const sceneStats = this.app.stats as unknown as {
      frame?: { drawCalls?: number };
      drawCalls?: { total?: number };
      vram?: { tex?: number; vb?: number; ib?: number };
    };
    const vram = sceneStats.vram ?? gd._vram;
    const vramBytes = (vram?.tex ?? 0) + (vram?.vb ?? 0) + (vram?.ib ?? 0);
    return {
      drawCalls: sceneStats.frame?.drawCalls ?? sceneStats.drawCalls?.total ?? gd._drawCallsPerFrame ?? 0,
      triangles: 0,
      textures: gd.textures?.size ?? 0,
      vramMb: vramBytes > 0 ? vramBytes / 1024 / 1024 : undefined,
    };
  }

  private buildOverworld(): void {
    this.exterior.addChild(this.createTerrainEntity(this.world.terrain));
    this.createPrimitive(
      'water',
      'box',
      this.material('water', 0x2b5d78, { opacity: 0.72 }),
      { x: 0, y: this.world.waterLevel - 0.03, z: 0 },
      { x: this.world.size, y: 0.06, z: this.world.size },
      this.exterior,
    );
    // Props (arvores/pedras/ruinas) entram via preloadEnvironment(): modelos do
    // pacote nature carregados no loading; primitivos so como fallback.
    this.buildNaturePath();
    this.buildDungeonEntrance();
  }

  /**
   * Trilha de terra do spawn ate o portal da dungeon: uma fita de malha drapejada
   * no terreno, com ondulacao suave e DESVIO dos blockers (arvores/pedras tem
   * colisao no servidor — a trilha contorna em vez de atravessar). Puramente
   * visual; a decoracao respeita o corredor (NATURE_PATH_CLEARANCE).
   */
  private buildNaturePath(): void {
    const spawn = this.world.spawn;
    const portal = this.world.dungeon;
    const dx = portal.x - spawn.x;
    const dz = portal.z - spawn.z;
    const length = Math.hypot(dx, dz);
    if (length < 1) return;
    const lateralX = -dz / length;
    const lateralZ = dx / length;

    // 1) Pontos-base com ondulacao (zero nas pontas) + repulsao dos blockers.
    const segments = 72;
    const points: Array<{ x: number; z: number }> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const wobble = Math.sin(t * Math.PI * 2.3) * 3.4 * Math.sin(t * Math.PI);
      let x = spawn.x + dx * t + lateralX * wobble;
      let z = spawn.z + dz * t + lateralZ * wobble;
      for (let iteration = 0; iteration < 3; iteration++) {
        for (const blocker of this.world.blockers) {
          const bx = x - blocker.x;
          const bz = z - blocker.z;
          const min = blocker.radius + NATURE_PATH_WIDTH * 0.5 + 0.6;
          const distSq = bx * bx + bz * bz;
          if (distSq >= min * min || distSq === 0) continue;
          const dist = Math.sqrt(distSq);
          x = blocker.x + (bx / dist) * min;
          z = blocker.z + (bz / dist) * min;
        }
      }
      points.push({ x, z });
    }
    // 2) Suaviza as quinas deixadas pela repulsao (media movel, pontas fixas).
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < points.length - 1; i++) {
        points[i] = {
          x: points[i - 1].x * 0.25 + points[i].x * 0.5 + points[i + 1].x * 0.25,
          z: points[i - 1].z * 0.25 + points[i].z * 0.5 + points[i + 1].z * 0.25,
        };
      }
    }
    this.naturePathPoints = points;

    // 3) Fita: dois vertices por ponto, largura levemente variavel, colada no
    // terreno (+0.05 contra z-fighting). Normais para cima (estilo low-poly).
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const previous = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      let tx = next.x - previous.x;
      let tz = next.z - previous.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const halfWidth = (NATURE_PATH_WIDTH / 2) * (0.85 + 0.3 * Math.abs(Math.sin(i * 0.7)));
      const leftX = points[i].x - tz * halfWidth;
      const leftZ = points[i].z + tx * halfWidth;
      const rightX = points[i].x + tz * halfWidth;
      const rightZ = points[i].z - tx * halfWidth;
      positions.push(leftX, this.world.terrain.heightAt(leftX, leftZ) + 0.05, leftZ);
      positions.push(rightX, this.world.terrain.heightAt(rightX, rightZ) + 0.05, rightZ);
      normals.push(0, 1, 0, 0, 1, 0);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const mesh = pc.createMesh(this.app.graphicsDevice, positions, { indices, normals });
    const material = this.material('nature-path', 0x8a6a44);
    const meshInstance = new pc.MeshInstance(mesh, material);
    meshInstance.castShadow = false;
    const entity = new pc.Entity('nature-path', this.app);
    entity.addComponent('render', { meshInstances: [meshInstance], receiveShadows: true, castShadows: false });
    this.exterior.addChild(entity);
  }

  /** Distancia (XZ) de um ponto ate a trilha (aproximada pelos pontos amostrados). */
  private distanceToPath(x: number, z: number): number {
    let best = Infinity;
    for (const point of this.naturePathPoints) {
      const d = Math.hypot(point.x - x, point.z - z);
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * Carrega o pacote de natureza e monta o mundo: substitui os primitivos pelos
   * modelos (mesmas posicoes/escalas do worldgen — colisao do servidor intacta)
   * e espalha decoracao sem colisao por seed. `decorCount` vem do preset de
   * qualidade. Se algo falhar (arquivo faltando), volta aos props primitivos.
   */
  async preloadEnvironment(decorCount: number): Promise<void> {
    try {
      const urls = [
        ...NATURE_TREE_URLS,
        ...NATURE_RUIN_URLS,
        ...NATURE_ROCK_URLS,
        NATURE_GRASS_URL,
        ...NATURE_BUSH_URLS,
        ...NATURE_FLOWER_URLS,
      ];
      await this.models.preload(urls);
      await this.buildNatureProps();
      await this.scatterNatureDecor(decorCount);
    } catch (error) {
      console.warn('[PcWorld] pacote nature indisponivel; usando props primitivos:', error);
      this.buildProps();
    }
  }

  /**
   * Instancia um modelo do pacote normalizado: escala para o tamanho-alvo e
   * alinha a base (minY) no y=0 local, centrado em XZ. O chamador poe num grupo
   * com a posicao/rotacao/escala do prop.
   */
  private async instantiateNature(
    url: string,
    target: { height?: number; largest?: number },
    castShadows: boolean,
  ): Promise<pc.Entity | null> {
    const model = await this.models.instantiate(url, { castShadows, receiveShadows: true });
    let bounds = this.natureBounds.get(url) ?? null;
    if (!bounds) {
      bounds = computeEntityBounds(model);
      if (!bounds) {
        destroyEntity(model);
        return null;
      }
      this.natureBounds.set(url, bounds);
    }
    const scale = target.height !== undefined
      ? target.height / Math.max(bounds.size.y, 0.001)
      : (target.largest ?? 1) / bounds.largest;
    model.setLocalScale(scale, scale, scale);
    model.setLocalPosition(-bounds.center.x * scale, -bounds.minY * scale, -bounds.center.z * scale);
    return model;
  }

  private async buildNatureProps(): Promise<void> {
    // Sorteios visuais (variante/squash) deterministicos por seed — todo mundo
    // que entra no mesmo mundo ve as mesmas arvores.
    const rand = mulberry32(this.world.seed ^ 0x5eed);
    for (const prop of this.world.props) {
      const group = new pc.Entity(`nature-${prop.kind}`, this.app);
      group.setLocalPosition(prop.x, prop.y, prop.z);
      group.setLocalEulerAngles(0, prop.rotationY * DEG, 0);

      let model: pc.Entity | null = null;
      if (prop.kind === 'tree') {
        const url = NATURE_TREE_URLS[Math.floor(rand() * NATURE_TREE_URLS.length)];
        model = await this.instantiateNature(url, { height: NATURE_TREE_HEIGHT * prop.scale }, true);
      } else if (prop.kind === 'ruin') {
        const url = NATURE_RUIN_URLS[Math.floor(rand() * NATURE_RUIN_URLS.length)];
        model = await this.instantiateNature(url, { height: NATURE_RUIN_HEIGHT * prop.scale }, true);
      } else {
        const url = NATURE_ROCK_URLS[Math.floor(rand() * NATURE_ROCK_URLS.length)];
        model = await this.instantiateNature(url, { largest: NATURE_ROCK_LARGEST * prop.scale }, true);
        // So temos 1 malha de pedra: squash nao-uniforme + rotacao dao a variedade
        // (os primitivos antigos tambem eram uma unica esfera achatada).
        group.setLocalScale(0.85 + rand() * 0.5, 0.55 + rand() * 0.6, 0.85 + rand() * 0.45);
        if (model) this.tintRockMaterials(model);
      }
      if (!model) {
        destroyEntity(group);
        continue;
      }
      group.addChild(model);
      // Pedras semi-enterradas assentam melhor no terreno inclinado.
      if (prop.kind === 'rock') model.translateLocal(0, -0.08 * NATURE_ROCK_LARGEST * prop.scale, 0);
      this.exterior.addChild(group);
    }
  }

  /** Escurece o material da pedra (compartilhado por todas as instancias). */
  private tintRockMaterials(model: pc.Entity): void {
    if (this.rockTintApplied) return;
    this.rockTintApplied = true;
    const renders = model.findComponents('render') as unknown as Array<{
      meshInstances?: Array<{ material: pc.Material }>;
    }>;
    for (const render of renders) {
      for (const meshInstance of render.meshInstances ?? []) {
        const material = meshInstance.material;
        if (!(material instanceof pc.StandardMaterial)) continue;
        material.diffuse = new pc.Color(NATURE_ROCK_TINT.r, NATURE_ROCK_TINT.g, NATURE_ROCK_TINT.b);
        material.update();
      }
    }
  }

  /** Marca todos os renders da entidade para o batching estatico da decoracao. */
  private assignDecorBatchGroup(entity: pc.Entity): void {
    if (this.decorBatchGroupId === null) return;
    const renders = entity.findComponents('render') as unknown as Array<{ batchGroupId: number }>;
    for (const render of renders) render.batchGroupId = this.decorBatchGroupId;
  }

  /**
   * Decoracao pura (sem colisao): grama, flores e arbustos em MANCHAS por seed.
   * Tudo entra num grupo de batching estatico — o PlayCanvas funde as malhas por
   * material, entao ~1000 tufos de grama viram poucos draw calls. A trilha e a
   * entrada da dungeon ficam limpas.
   */
  private async scatterNatureDecor(count: number): Promise<void> {
    if (count <= 0) return;
    const batcher = (this.app as unknown as { batcher?: pc.BatchManager }).batcher;
    if (batcher && this.decorBatchGroupId === null) {
      this.decorBatchGroupId = batcher.addGroup('nature-decor', false, 64).id;
    }
    const rand = mulberry32(this.world.seed ^ 0xdec0);
    const half = this.world.terrain.half - 8;
    let placed = 0;
    let guard = 0;

    const canPlace = (x: number, z: number): boolean => {
      if (Math.abs(x) > half || Math.abs(z) > half) return false;
      if (Math.hypot(x - this.world.dungeon.x, z - this.world.dungeon.z) < 11) return false;
      if (this.distanceToPath(x, z) < NATURE_PATH_CLEARANCE) return false;
      if (this.world.terrain.heightAt(x, z) < this.world.waterLevel + 0.5) return false;
      return this.world.terrain.slopeAt(x, z) <= 0.85;
    };

    while (placed < count && guard++ < count * 6) {
      const cx = (rand() * 2 - 1) * half;
      const cz = (rand() * 2 - 1) * half;
      if (!canPlace(cx, cz)) continue;

      // Tipo da mancha: grama domina; flores e arbustos pontuam o campo.
      const roll = rand();
      let urls: readonly string[];
      let clusterSize: number;
      let spread: number;
      let sizeMin: number;
      let sizeMax: number;
      if (roll < 0.62) {
        urls = [NATURE_GRASS_URL];
        clusterSize = 4 + Math.floor(rand() * 5);
        spread = 2.7;
        sizeMin = 1.15;
        sizeMax = 1.8;
      } else if (roll < 0.84) {
        urls = NATURE_FLOWER_URLS;
        clusterSize = 3 + Math.floor(rand() * 3);
        spread = 1.9;
        sizeMin = 0.7;
        sizeMax = 1.1;
      } else {
        urls = NATURE_BUSH_URLS;
        clusterSize = 1 + Math.floor(rand() * 2);
        spread = 1.7;
        sizeMin = 1.1;
        sizeMax = 1.7;
      }

      for (let i = 0; i < clusterSize && placed < count; i++) {
        const x = cx + (rand() * 2 - 1) * spread;
        const z = cz + (rand() * 2 - 1) * spread;
        if (!canPlace(x, z)) continue;
        const url = urls[Math.floor(rand() * urls.length)];
        const size = sizeMin + rand() * (sizeMax - sizeMin);
        const model = await this.instantiateNature(url, { largest: size }, false);
        if (!model) continue;
        const group = new pc.Entity('nature-decor', this.app);
        group.setLocalPosition(x, this.world.terrain.heightAt(x, z), z);
        group.setLocalEulerAngles(0, rand() * 360, 0);
        group.addChild(model);
        this.exterior.addChild(group);
        this.assignDecorBatchGroup(group);
        placed++;
      }
    }
    if (batcher && this.decorBatchGroupId !== null) batcher.generate([this.decorBatchGroupId]);
  }

  private createTerrainEntity(terrain: Terrain): pc.Entity {
    const segments = 128;
    const half = terrain.size / 2;
    const step = terrain.size / segments;
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const wx = -half + x * step;
        const wz = -half + z * step;
        positions.push(wx, terrain.heightAt(wx, wz), wz);
        normals.push(0, 0, 0);
      }
    }
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const a = z * (segments + 1) + x;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;
      const ax = positions[ia];
      const ay = positions[ia + 1];
      const az = positions[ia + 2];
      const bx = positions[ib];
      const by = positions[ib + 1];
      const bz = positions[ib + 2];
      const cx = positions[ic];
      const cy = positions[ic + 1];
      const cz = positions[ic + 2];
      const abx = bx - ax;
      const aby = by - ay;
      const abz = bz - az;
      const acx = cx - ax;
      const acy = cy - ay;
      const acz = cz - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      normals[ia] += nx;
      normals[ia + 1] += ny;
      normals[ia + 2] += nz;
      normals[ib] += nx;
      normals[ib + 1] += ny;
      normals[ib + 2] += nz;
      normals[ic] += nx;
      normals[ic + 1] += ny;
      normals[ic + 2] += nz;
    }
    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }

    const mesh = pc.createMesh(this.app.graphicsDevice, positions, { indices, normals });
    // Verde mais escuro e rico (o antigo 0x4a6a39 ficava pastel com ACES+bloom).
    const material = this.material('terrain', 0x3a5a2c);
    const meshInstance = new pc.MeshInstance(mesh, material);
    meshInstance.castShadow = false;
    const entity = new pc.Entity('ground', this.app);
    entity.addComponent('render', {
      meshInstances: [meshInstance],
      receiveShadows: true,
    });
    return entity;
  }

  private buildProps(): void {
    const byKind: Record<PropKind, PropInstance[]> = { tree: [], rock: [], ruin: [] };
    for (const prop of this.world.props) byKind[prop.kind].push(prop);

    for (const prop of byKind.tree) {
      const root = new pc.Entity('tree', this.app);
      root.setLocalPosition(prop.x, prop.y, prop.z);
      root.setLocalEulerAngles(0, prop.rotationY * DEG, 0);
      root.setLocalScale(prop.scale, prop.scale, prop.scale);
      this.createPrimitive('trunk', 'cylinder', this.material('trunk', 0x5a3d24), { x: 0, y: 0.8, z: 0 }, { x: 0.34, y: 1.6, z: 0.34 }, root);
      this.createPrimitive('foliage', 'cone', this.material('foliage', 0x315f2b), { x: 0, y: 2.8, z: 0 }, { x: 1.9, y: 2.8, z: 1.9 }, root);
      this.exterior.addChild(root);
    }
    for (const prop of byKind.rock) {
      const rock = this.createPrimitive(
        'rock',
        'sphere',
        this.material('rock', 0x5a5a58),
        { x: prop.x, y: prop.y + 0.28 * prop.scale, z: prop.z },
        { x: prop.scale * 1.2, y: prop.scale * 0.62, z: prop.scale },
        this.exterior,
      );
      rock.setLocalEulerAngles(prop.rotationY * DEG, prop.rotationY * 1.3 * DEG, prop.rotationY * 0.7 * DEG);
    }
    for (const [i, prop] of byKind.ruin.entries()) {
      const ruin = this.createPrimitive(
        'ruin',
        'box',
        this.material('ruin', 0x8a8275),
        { x: prop.x, y: prop.y + prop.scale, z: prop.z },
        { x: 0.6 * prop.scale, y: 2.2 * prop.scale * (0.45 + (i % 3) * 0.28), z: 0.6 * prop.scale },
        this.exterior,
      );
      ruin.setLocalEulerAngles(Math.sin(i) * 7, prop.rotationY * DEG, Math.cos(i) * 7);
    }
  }

  private buildDungeonEntrance(): void {
    const group = new pc.Entity('dungeon-entrance', this.app);
    group.setLocalPosition(this.portalPosition.x, this.portalPosition.y - 2, this.portalPosition.z);
    const stone = this.material('portal-stone', 0x6d6b66);
    this.createPrimitive('left-pillar', 'box', stone, { x: -2, y: 2, z: 0 }, { x: 0.9, y: 4, z: 0.9 }, group);
    this.createPrimitive('right-pillar', 'box', stone, { x: 2, y: 2, z: 0 }, { x: 0.9, y: 4, z: 0.9 }, group);
    this.createPrimitive('lintel', 'box', stone, { x: 0, y: 4.4, z: 0 }, { x: 5.2, y: 0.9, z: 1.1 }, group);
    this.createPrimitive('portal', 'box', this.material('portal-dark', 0x05060a, { unlit: true }), { x: 0, y: 2, z: 0.45 }, { x: 3.4, y: 3.9, z: 0.08 }, group);
    for (const sx of [-2.2, 2.2]) {
      const torch = new pc.Entity('portal-torch', this.app);
      torch.setLocalPosition(sx, 3.2, 0.7);
      torch.addComponent('light', { type: 'omni', color: hexColor(0xff7a33), intensity: 8, range: 14 });
      group.addChild(torch);
      this.createPrimitive('flame', 'sphere', this.material('flame', 0xffb060, { emissive: hexColor(0xff7a33), emissiveIntensity: 1.4, unlit: true }), { x: sx, y: 3.2, z: 0.7 }, { x: 0.22, y: 0.22, z: 0.22 }, group);
    }
    this.exterior.addChild(group);
  }

  private buildDungeon(): void {
    this.dungeon.enabled = false;
    this.createPrimitive('dungeon-ground', 'box', this.material('dungeon-floor', 0x252a32), { x: 0, y: this.dungeonFloorY - 0.05, z: 0 }, { x: 46, y: 0.1, z: 46 }, this.dungeon);
    const wall = this.material('dungeon-wall', 0x45454a);
    this.createPrimitive('wall-north', 'box', wall, { x: 0, y: this.dungeonFloorY + 2.7, z: -23 }, { x: 46, y: 5.4, z: 1.2 }, this.dungeon);
    this.createPrimitive('wall-south', 'box', wall, { x: 0, y: this.dungeonFloorY + 2.7, z: 23 }, { x: 46, y: 5.4, z: 1.2 }, this.dungeon);
    this.createPrimitive('wall-west', 'box', wall, { x: -23, y: this.dungeonFloorY + 2.7, z: 0 }, { x: 1.2, y: 5.4, z: 46 }, this.dungeon);
    this.createPrimitive('wall-east', 'box', wall, { x: 23, y: this.dungeonFloorY + 2.7, z: 0 }, { x: 1.2, y: 5.4, z: 46 }, this.dungeon);

    const exit = new pc.Entity('dungeon-exit', this.app);
    exit.setLocalPosition(this.dungeonExitPosition.x, this.dungeonFloorY, this.dungeonExitPosition.z);
    const arch = this.material('dungeon-exit-arch', 0x5c6070);
    this.createPrimitive('exit-left', 'box', arch, { x: -1.7, y: 1.9, z: 0 }, { x: 0.7, y: 3.8, z: 0.7 }, exit);
    this.createPrimitive('exit-right', 'box', arch, { x: 1.7, y: 1.9, z: 0 }, { x: 0.7, y: 3.8, z: 0.7 }, exit);
    this.createPrimitive('exit-lintel', 'box', arch, { x: 0, y: 4, z: 0 }, { x: 4.2, y: 0.7, z: 0.8 }, exit);
    this.createPrimitive('exit-portal', 'box', this.material('exit-blue', 0x3955a8, { opacity: 0.78, unlit: true }), { x: 0, y: 1.8, z: 0.38 }, { x: 2.7, y: 3.3, z: 0.08 }, exit);
    this.dungeon.addChild(exit);

    const crystal = this.material('dungeon-crystal', 0x7d9dff, { emissive: hexColor(0x223c99), emissiveIntensity: 1.1 });
    for (const [x, z, scale] of [[-15, -15, 1.15], [7.5, -19, 0.92], [14, 18, 1], [20, 0, 0.68]] as const) {
      this.createPrimitive('dungeon-crystal', 'cone', crystal, { x, y: this.dungeonFloorY + 0.72 * scale, z }, { x: 0.8 * scale, y: 1.45 * scale, z: 0.8 * scale }, this.dungeon);
    }
    for (const [x, z] of [[-17, -17], [17, -17], [-17, 17], [17, 17]] as const) {
      const light = new pc.Entity('lantern-light', this.app);
      light.setLocalPosition(x, this.dungeonFloorY + 3.3, z);
      light.addComponent('light', { type: 'omni', color: hexColor(0xff7a33), intensity: 22, range: 20 });
      this.dungeon.addChild(light);
      this.createPrimitive('lantern-flame', 'sphere', this.material('lantern-flame', 0xff9c4a, { emissive: hexColor(0xff7a33), emissiveIntensity: 1.6, unlit: true }), { x, y: this.dungeonFloorY + 3.3, z }, { x: 0.26, y: 0.26, z: 0.26 }, this.dungeon);
    }
  }

  private pickDungeonFloor(ray: WorldRay): RayHit | null {
    if (Math.abs(ray.direction.y) < 0.0001) return null;
    const t = (this.dungeonFloorY - ray.origin.y) / ray.direction.y;
    if (t < 0) return null;
    const point = {
      x: ray.origin.x + ray.direction.x * t,
      y: this.dungeonFloorY,
      z: ray.origin.z + ray.direction.z * t,
    };
    if (Math.abs(point.x) > 23 || Math.abs(point.z) > 23) return null;
    return { point, distance: t };
  }

  private pickTerrain(ray: WorldRay): RayHit | null {
    let previousT = 0;
    let previousDelta = ray.origin.y - this.world.terrain.heightAt(ray.origin.x, ray.origin.z);
    const maxT = 280;
    const step = 2;
    for (let t = step; t <= maxT; t += step) {
      const x = ray.origin.x + ray.direction.x * t;
      const y = ray.origin.y + ray.direction.y * t;
      const z = ray.origin.z + ray.direction.z * t;
      if (Math.abs(x) > this.world.terrain.half || Math.abs(z) > this.world.terrain.half) continue;
      const delta = y - this.world.terrain.heightAt(x, z);
      if (delta <= 0 && previousDelta >= 0) {
        let lo = previousT;
        let hi = t;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          const mx = ray.origin.x + ray.direction.x * mid;
          const my = ray.origin.y + ray.direction.y * mid;
          const mz = ray.origin.z + ray.direction.z * mid;
          const md = my - this.world.terrain.heightAt(mx, mz);
          if (md > 0) lo = mid;
          else hi = mid;
        }
        const hitT = (lo + hi) / 2;
        const hx = ray.origin.x + ray.direction.x * hitT;
        const hz = ray.origin.z + ray.direction.z * hitT;
        return {
          distance: hitT,
          point: { x: hx, y: this.world.terrain.heightAt(hx, hz), z: hz },
        };
      }
      previousT = t;
      previousDelta = delta;
    }
    return null;
  }
}
