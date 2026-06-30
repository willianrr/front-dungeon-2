import * as pc from 'playcanvas';
import { Sfx } from '../audio/Sfx';
import type { NetworkClient } from '../net/NetworkClient';
import type { PlayerProfile } from '../shared/playerProfile';
import type { Terrain } from '../shared/Terrain';
import {
  GEM_DEFINITIONS,
  ITEM_ICON_URLS,
  RARITY_COLORS,
  RARITY_GLOW_SCALE,
  glowColorForGem,
  itemDisplayName,
  itemIconFor,
  lootModelUrlFor,
} from '../shared/itemMeta';
import type {
  ChestState,
  CombatEvent,
  CombatTextKind,
  DamageKind,
  EntityAction,
  EntityState,
  EquippedWeaponVisualState,
  InventoryItem,
  ItemRarity,
  LootState,
  WeaponElement,
  WorldSnapshot,
  WorldZone,
} from '../shared/types';
import { HUD, HUD_SKILL_ICON_URLS, preloadHudIcons } from '../ui/HUD';
import { PerfOverlay } from '../ui/PerfOverlay';
import {
  PcWorld,
  colorFromCss,
  createMaterial,
  destroyEntity,
  distanceRayToPoint,
  entityPosition,
  entityYaw,
  fitEntityToLargest,
  fitWeaponToGrip,
  lerpEntityPosition,
  makeEntity,
  setEntityPosition,
  setEntityVisible,
  setYaw,
  type RenderQualityPreset,
  type Vec3Like,
  type WorldRay,
} from '../playcanvas/PcWorld';
import { Input, type PointerNdc } from './Input';
import { KeyboardMoveController } from './KeyboardMoveController';
import { ClientMovementPredictor } from './ClientMovementPredictor';

interface View {
  entity: pc.Entity;
  visual: pc.Entity;
  healthBar?: HealthBarOverlay;
  kind: 'player' | 'enemy';
  heroModelUrl?: string;
  heroLoading?: boolean;
  heroFailedUrl?: string;
  zombieLoading?: boolean;
  zombieFailed?: boolean;
  equippedWeaponKey?: string | null;
  weapon?: pc.Entity;
  weaponGlow?: pc.Entity;
  weaponGlowMaterial?: pc.StandardMaterial;
  weaponLight?: pc.Entity;
  weaponAnchor?: pc.Entity;
  weaponAttachedToBone?: boolean;
  weaponGlowLength?: number;
  /** Efeito de fogo da arma (client-side, so quando element === 'fire'). */
  weaponFire?: pc.Entity;
  /** Fator 0..1 de intensidade do brilho derivado do nivel/raridade da arma. */
  weaponGlowFactor?: number;
  /** Materiais clonados da arma com emissivo turbinado (para o item brilhar). */
  weaponBoostMaterials?: pc.StandardMaterial[];
  anim?: PcClipController;
  initialized?: boolean;
  jumpArc?: number;
  wasJumping?: boolean;
  animTime?: number;
}

interface LootView {
  entity: pc.Entity;
  label: WorldLabel;
  labelColor: string;
  labelText: string;
  baseY: number;
  phase: number;
}

interface ChestView {
  entity: pc.Entity;
  opened: boolean;
}

type RenderQualityLevel = 'high' | 'medium' | 'low';
type RenderQualityMode = RenderQualityLevel | 'auto';

const HERO_MODEL_URL = '/models/warrior.glb';
const EQUIPPED_SWORD_MODEL_URL = '/items/Sword_Golden.glb';
const HERO_VISUAL_SCALE = 1.0;
const ZOMBIE_VISUAL_SCALE = 0.0108;
const ZOMBIE_MODEL_URLS = [
  '/models/zombie/Meshy_AI_crie_um_zombie_3d_de__biped_Animation_Walking_withSkin.glb',
  '/models/zombie/Meshy_AI_crie_um_zombie_3d_de__biped_Animation_Running_withSkin.glb',
  '/models/zombie/Meshy_AI_crie_um_zombie_3d_de__biped_Animation_Zombie_Scream_withSkin.glb',
  '/models/zombie/Meshy_AI_crie_um_zombie_3d_de__biped_Animation_dying_backwards_withSkin.glb',
] as const;
const ZOMBIE_VISUAL_URL = ZOMBIE_MODEL_URLS[0];
const PRELOAD_LOOT_MODEL_URLS = [
  '/items/Coin.glb',
  '/items/Potion2_Filled.glb',
  '/items/Potion1_Filled.glb',
  EQUIPPED_SWORD_MODEL_URL,
  GEM_DEFINITIONS.jewel_bless.modelUrl,
  GEM_DEFINITIONS.jewel_soul.modelUrl,
] as const;
const CHEST_MODEL_URLS = {
  closed: '/items/Chest_Closed.glb',
  open: '/items/Chest_Open.glb',
} as const;

const MARKER_DURATION = 0.6;
const CLOSE_TARGET_RADIUS = 3.4;
const CLOSE_CLICK_RADIUS = 2.8;
const LOOT_CLICK_RADIUS = 1.25;
const CHEST_CLICK_RADIUS = 1.45;
const ENEMY_HEALTH_BAR_HEIGHT = 2.6;
// Culling de inimigos: dentro de NEAR sempre desenha; alem de FAR nunca; no meio,
// so desenha se estiver na tela. Inimigo desabilitado nao renderiza/anima/sombra.
const ENEMY_CULL_NEAR_KEEP = 8;
const ENEMY_CULL_FAR = 100;
const MAX_FLOATING_COMBAT_TEXTS = 36;
const JUMP_TIME = 0.5;
const JUMP_HEIGHT = 1.8;
const LOCAL_PLAYER_CORRECTION_RATE = 4;
const REMOTE_RECONCILE_RATE = 28;
const LOCAL_PLAYER_IGNORE_CORRECTION_DISTANCE = 0.85;
const LOCAL_PLAYER_SNAP_CORRECTION_DISTANCE = 3;
const RENDER_QUALITY_STORAGE_KEY = 'aranna:render-quality:v1:playcanvas';
const RENDER_QUALITY_MODES: readonly RenderQualityMode[] = ['auto', 'high', 'medium', 'low'];

const RENDER_QUALITY_PRESETS: Record<RenderQualityLevel, RenderQualityPreset> = {
  high: { bloom: false, bloomStrength: 0, pixelRatioCap: 1, shadows: true, shadowMapSize: 1024 },
  medium: { bloom: false, bloomStrength: 0, pixelRatioCap: 0.85, shadows: false, shadowMapSize: 1024 },
  low: { bloom: false, bloomStrength: 0, pixelRatioCap: 0.65, shadows: false, shadowMapSize: 512 },
};

function shouldForceWeaponGlowPreview(): boolean {
  return new URLSearchParams(window.location.search).has('weaponGlow');
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clearChildren(entity: pc.Entity): void {
  for (const child of [...entity.children]) {
    (child as pc.Entity).destroy();
  }
}

function rayPickBest<T>(
  ray: WorldRay,
  entries: Iterable<T>,
  center: (entry: T) => Vec3Like,
  radius: (entry: T) => number,
): T | null {
  let best: T | null = null;
  let bestT = Infinity;
  for (const entry of entries) {
    const r = radius(entry);
    const hit = distanceRayToPoint(ray, center(entry));
    if (hit.distanceSq <= r * r && hit.t < bestT) {
      best = entry;
      bestT = hit.t;
    }
  }
  return best;
}

class WorldLabel {
  readonly el: HTMLDivElement;
  private position: Vec3Like = { x: 0, y: 0, z: 0 };

  constructor(private readonly layer: HTMLElement, className: string, text: string, color: string) {
    this.el = document.createElement('div');
    this.el.className = className;
    this.el.textContent = text;
    this.el.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'transform:translate(-50%,-50%)',
      'pointer-events:none',
      'white-space:nowrap',
      'font:700 12px/1.1 ui-sans-serif,system-ui,sans-serif',
      'text-shadow:0 1px 4px rgba(0,0,0,.9)',
      `color:${color}`,
      'z-index:8',
    ].join(';');
    layer.append(this.el);
  }

  setText(text: string): void {
    this.el.textContent = text;
  }

  setWorldPosition(x: number, y: number, z: number): void {
    this.position = { x, y, z };
  }

  update(world: PcWorld): void {
    const p = world.project(this.position);
    this.el.style.display = p.visible ? 'block' : 'none';
    if (!p.visible) return;
    this.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  }

  dispose(): void {
    this.el.remove();
  }
}

class HealthBarOverlay {
  readonly root: HTMLDivElement;
  private readonly label: HTMLSpanElement;
  private readonly fill: HTMLDivElement;
  private position: Vec3Like = { x: 0, y: 0, z: 0 };

  constructor(layer: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'width:74px',
      'height:12px',
      'transform:translate(-50%,-50%)',
      'pointer-events:none',
      'z-index:7',
    ].join(';');
    const track = document.createElement('div');
    track.style.cssText = 'position:absolute;inset:5px 0 0 0;border:1px solid rgba(0,0,0,.8);background:rgba(30,9,12,.72);box-shadow:0 1px 4px rgba(0,0,0,.55)';
    this.fill = document.createElement('div');
    this.fill.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#d72f45,#ff7467)';
    this.label = document.createElement('span');
    this.label.style.cssText = 'position:absolute;left:50%;top:-7px;transform:translateX(-50%);font:700 9px/1 ui-sans-serif,system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000;white-space:nowrap';
    track.append(this.fill);
    this.root.append(track, this.label);
    layer.append(this.root);
  }

  setHealth(hp: number, maxHp: number, level: number, name?: string): void {
    const ratio = maxHp > 0 ? clamp01(hp / maxHp) : 0;
    this.fill.style.width = `${ratio * 100}%`;
    this.label.textContent = name ? `${name} ${level}` : `Nv ${level}`;
  }

  setWorldPosition(x: number, y: number, z: number): void {
    this.position = { x, y, z };
  }

  update(world: PcWorld, visible: boolean): void {
    if (!visible) {
      this.root.style.display = 'none';
      return;
    }
    const p = world.project(this.position);
    this.root.style.display = p.visible ? 'block' : 'none';
    if (p.visible) this.root.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  }

  dispose(): void {
    this.root.remove();
  }
}

class FloatingText {
  private readonly label: WorldLabel;
  private age = 0;
  private readonly start: Vec3Like;

  constructor(layer: HTMLElement, amount: number | string, position: Vec3Like, private readonly kind: CombatTextKind) {
    const color = kind === 'magic'
      ? '#74d8ff'
      : kind === 'incoming'
        ? '#ff8f7a'
        : kind === 'miss'
          ? '#d7e3ef'
          : '#fff3b5';
    this.start = { ...position };
    this.label = new WorldLabel(layer, 'combat-text', String(amount), color);
    this.label.el.style.font = '800 18px/1 ui-sans-serif,system-ui,sans-serif';
    this.label.el.style.zIndex = '9';
  }

  update(dt: number, world: PcWorld): boolean {
    this.age += dt;
    const t = this.age / 0.82;
    this.label.setWorldPosition(this.start.x, this.start.y + t * 1.15, this.start.z);
    this.label.el.style.opacity = String(clamp01(1 - Math.max(0, t - 0.45) / 0.55));
    this.label.el.style.fontSize = this.kind === 'miss' ? '15px' : '18px';
    this.label.update(world);
    if (t < 1) return false;
    this.dispose();
    return true;
  }

  dispose(): void {
    this.label.dispose();
  }
}

interface TimedEffect {
  update(dt: number): boolean;
  dispose(): void;
}

class PulseEffect implements TimedEffect {
  private age = 0;

  constructor(
    private readonly entity: pc.Entity,
    private readonly material: pc.StandardMaterial,
    private readonly duration: number,
    private readonly fromScale: number,
    private readonly toScale: number,
    private readonly baseY = 0.04,
  ) {}

  update(dt: number): boolean {
    this.age += dt;
    const t = clamp01(this.age / this.duration);
    const scale = this.fromScale + (this.toScale - this.fromScale) * t;
    this.entity.setLocalScale(scale, this.baseY, scale);
    this.material.opacity = (1 - t) * 0.72;
    this.material.update();
    if (t < 1) return false;
    this.dispose();
    return true;
  }

  dispose(): void {
    destroyEntity(this.entity);
    this.material.destroy();
  }
}

type VisualAnimState = EntityAction | 'jump';

interface ClipConfig {
  track: pc.AnimTrack;
  speed?: number;
  loop?: boolean;
}

const ONE_SHOT_STATES = new Set<VisualAnimState>(['attack', 'dead', 'jump']);
const WEAPON_WORLD_LENGTH = 1.55;
const WEAPON_GRIP_FROM_BOTTOM = 0.16;
// Distancia (mundo) do punho ate o centro da lamina — referencia p/ luz/fogo.
const WEAPON_BLADE_CENTER = WEAPON_WORLD_LENGTH * (0.5 - WEAPON_GRIP_FROM_BOTTOM);
const WEAPON_SOCKET_BONE_NAMES = ['mixamorigWeapon', 'mixamorig:Weapon', 'RightHand', 'mixamorigRightHand', 'mixamorig:RightHand', 'Hand_R'] as const;
const HERO_RIG_ROOT_NAME = 'ANDANDO';
const HERO_DUPLICATE_RIG_ROOTS = new Set(['ANDANDO', 'PARADO', 'ATACANDO']);
// Cor das chamas (mesma do Three.js: flameColor 0xff4f12).
const WEAPON_FIRE_COLOR = '#ff4f12';
const WEAPON_FIRE_TEXTURE_URL = '/particle/unity-fire/fire-mask.png';
// Suaviza a rotacao de mira do heroi durante o ataque (rad/s aproximados).
const ATTACK_AIM_TURN_RATE = 18;

// Converte nivel de melhoria + raridade num fator 0..1 controlado. Espelha a
// progressao do Three.js (WeaponGlow.enhancementFactor): brilho discreto em
// niveis baixos, crescendo de forma suave ate o maximo, sem estourar.
function weaponGlowFactor(level: number, rarity: ItemRarity | undefined, element: WeaponElement | undefined): number {
  const rarityScale = rarity ? RARITY_GLOW_SCALE[rarity] : 1;
  const progress = clamp01(level / 15);
  let factor = Math.pow(progress, 1.35) * (0.9 + (rarityScale - 0.92) * 0.55);
  // Armas de fogo tem um brilho-base visivel mesmo sem upgrade (como o
  // elementFactor do Three.js, que garante min ~0.72 quando ha flameColor).
  if (element === 'fire') factor = Math.max(factor, 0.5);
  return clamp01(factor);
}

function normalizedName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
}

function chooseTrack(
  tracks: readonly pc.AnimTrack[],
  needles: readonly string[],
  prefer: 'first' | 'longest' | 'shortest' = 'first',
): pc.AnimTrack | undefined {
  const normalizedNeedles = needles.map(normalizedName);
  const candidates = tracks.filter((track) => {
    const name = normalizedName(track.name);
    return normalizedNeedles.some((needle) => name.includes(needle));
  });
  if (candidates.length === 0) return undefined;
  if (prefer === 'longest') return candidates.reduce((best, track) => (track.duration > best.duration ? track : best));
  if (prefer === 'shortest') return candidates.reduce((best, track) => (track.duration < best.duration ? track : best));
  return candidates[0];
}

interface PcAnimPathLike {
  entityPath?: string[];
  propertyPath?: string[];
  component?: string;
}

function cloneAnimPath(path: unknown, retargetRootName?: string): unknown {
  if (!path || typeof path !== 'object') return path;
  const source = path as PcAnimPathLike;
  const entityPath = source.entityPath ? [...source.entityPath] : undefined;
  if (entityPath && retargetRootName && entityPath.length > 0 && HERO_DUPLICATE_RIG_ROOTS.has(entityPath[0])) {
    entityPath[0] = retargetRootName;
  }
  return {
    ...source,
    entityPath,
    propertyPath: source.propertyPath ? [...source.propertyPath] : undefined,
  };
}

function isRootPositionAnimPath(path: unknown): boolean {
  if (!path || typeof path !== 'object') return false;
  const source = path as PcAnimPathLike;
  if (source.propertyPath?.[0] !== 'localPosition') return false;
  const target = source.entityPath?.[source.entityPath.length - 1];
  if (!target) return false;
  const normalized = normalizedName(target);
  return normalized === 'hips'
    || /^hips\d*$/.test(normalized)
    || normalized === 'mixamorighips'
    || /^mixamorighips\d*$/.test(normalized)
    || normalized === 'armature'
    || /^armature\d*$/.test(normalized);
}

function cloneRootMotionOutput(output: pc.AnimData): pc.AnimData {
  const source = output.data;
  const values = source instanceof Float32Array ? new Float32Array(source) : [...source];
  const components = output.components;
  if (components >= 3 && values.length >= components) {
    const base = Array.from(values.slice(0, components));
    for (let i = 0; i < values.length; i += components) {
      values[i] = base[0] ?? 0;
      values[i + 1] = base[1] ?? 0;
      values[i + 2] = base[2] ?? 0;
    }
  }
  return new pc.AnimData(components, values);
}

function prepareGameplayTrack(track: pc.AnimTrack, retargetRootName?: string): pc.AnimTrack {
  const inputs = [...track.inputs];
  const outputs = [...track.outputs];
  const clonedOutputs = new Map<number, number>();
  const curves = track.curves.map((curve) => {
    const paths = curve.paths.map((path) => cloneAnimPath(path, retargetRootName));
    let output = curve.output;
    if (paths.some(isRootPositionAnimPath)) {
      const existing = clonedOutputs.get(output);
      if (existing !== undefined) {
        output = existing;
      } else {
        outputs.push(cloneRootMotionOutput(outputs[output]));
        const next = outputs.length - 1;
        clonedOutputs.set(output, next);
        output = next;
      }
    }
    return new pc.AnimCurve(paths as unknown as string[], curve.input, output, curve.interpolation);
  });
  return new pc.AnimTrack(track.name, track.duration, inputs, outputs, curves);
}

function buildHeroClipConfigs(tracks: readonly pc.AnimTrack[]): Partial<Record<VisualAnimState, ClipConfig>> {
  const gameplayTracks = tracks.map((track) => prepareGameplayTrack(track, HERO_RIG_ROOT_NAME));
  const idle = chooseTrack(gameplayTracks, ['PARADO', 'Idle'], 'longest');
  const walk = chooseTrack(gameplayTracks, ['ANDANDO', 'Walking', 'Walk']);
  const run = chooseTrack(gameplayTracks, ['Running', 'Run']) ?? walk;
  const attack = chooseTrack(gameplayTracks, ['ATACANDO', 'Attack'], 'shortest');
  const jump = chooseTrack(gameplayTracks, ['Jump']);
  const dead = chooseTrack(gameplayTracks, ['Dead', 'Death']);
  const fallback = idle ?? walk ?? gameplayTracks[0];
  const configs: Partial<Record<VisualAnimState, ClipConfig>> = {};
  if (fallback) configs.idle = { track: idle ?? fallback, speed: idle ? 1 : 0, loop: true };
  if (walk) configs.walk = { track: walk, speed: 1, loop: true };
  if (run) configs.run = { track: run, speed: run === walk ? 1.24 : 1, loop: true };
  if (attack) configs.attack = { track: attack, speed: 2.8, loop: false };
  if (jump) configs.jump = { track: jump, speed: 1, loop: false };
  if (dead) configs.dead = { track: dead, speed: 1, loop: false };
  return configs;
}

function hasSkinnedRender(entity: pc.Entity): boolean {
  const renders = entity.findComponents('render') as unknown as Array<{
    meshInstances?: Array<{ skinInstance?: unknown }>;
  }>;
  return renders.some((render) => (render.meshInstances ?? []).some((meshInstance) => !!meshInstance.skinInstance));
}

function configureImportedModel(entity: pc.Entity): void {
  const renders = entity.findComponents('render') as unknown as Array<{
    meshInstances?: Array<{ cull?: boolean; castShadow?: boolean; visible?: boolean }>;
  }>;
  for (const render of renders) {
    for (const meshInstance of render.meshInstances ?? []) {
      meshInstance.cull = false;
      meshInstance.castShadow = true;
      meshInstance.visible = true;
    }
  }
}

function keepSingleSkinnedRigRoot(model: pc.Entity, preferredRootName: string): pc.Entity {
  const children = model.children.filter((child): child is pc.Entity => child instanceof pc.Entity);
  const preferred = children.find((child) => child.name === preferredRootName);
  if (preferred) {
    for (const child of children) {
      if (child !== preferred && (hasSkinnedRender(child) || HERO_DUPLICATE_RIG_ROOTS.has(child.name))) {
        child.destroy();
      }
    }
    return preferred;
  }

  const roots = children.filter((child) => hasSkinnedRender(child));
  if (roots.length === 0) return model;
  const primary = roots.find((child) => child.name === preferredRootName) ?? roots[0];
  for (const child of roots) {
    if (child !== primary) child.destroy();
  }
  return primary;
}

function setVisualAssetTransform(entity: pc.Entity, scale: number): void {
  entity.setLocalPosition(0, 0, 0);
  entity.setLocalEulerAngles(0, 0, 0);
  entity.setLocalScale(scale, scale, scale);
}

function findDescendantEntity(root: pc.Entity, names: readonly string[]): pc.Entity | undefined {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (names.includes(current.name)) return current;
    for (const child of current.children) {
      if (child instanceof pc.Entity) stack.push(child);
    }
  }
  return undefined;
}

function maxWorldScale(entity: pc.Entity): number {
  const scale = entity.getScale();
  return Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z), 0.0001);
}

class PcClipController {
  private readonly states = new Set<VisualAnimState>();
  private readonly anim?: pc.AnimComponent;
  private current?: VisualAnimState;

  constructor(private readonly entity: pc.Entity, configs: Partial<Record<VisualAnimState, ClipConfig>>) {
    const entries = Object.entries(configs) as [VisualAnimState, ClipConfig][];
    if (entries.length === 0) return;
    entity.addComponent('anim', { activate: false, rootBone: entity, speed: 1 });
    this.anim = entity.anim ?? undefined;
    if (!this.anim) return;
    for (const [state, config] of entries) {
      this.anim.assignAnimation(state, config.track, undefined, config.speed ?? 1, config.loop ?? !ONE_SHOT_STATES.has(state));
      this.states.add(state);
    }
    const initial = this.pick('idle');
    this.anim.playing = true;
    this.anim.baseLayer?.play(initial);
    this.current = initial;
  }

  setState(state: VisualAnimState): void {
    if (!this.anim) return;
    const next = this.pick(state);
    if (next === this.current) return;
    this.anim.baseLayer?.transition(next, ONE_SHOT_STATES.has(next) ? 0.08 : 0.14, ONE_SHOT_STATES.has(next) ? 0 : undefined);
    this.current = next;
  }

  setPlaybackSpeed(speed: number): void {
    if (this.anim) this.anim.speed = Math.max(0.2, Math.min(3, speed));
  }

  private pick(state: VisualAnimState): VisualAnimState {
    if (this.states.has(state)) return state;
    if (state === 'jump' && this.states.has('run')) return 'run';
    if (state === 'run' && this.states.has('walk')) return 'walk';
    if ((state === 'attack' || state === 'dead') && this.states.has('idle')) return 'idle';
    if (this.states.has('idle')) return 'idle';
    return [...this.states][0] ?? state;
  }
}

export class Game {
  private readonly net: NetworkClient;
  private readonly terrain: Terrain;
  private readonly world: PcWorld;
  private readonly input: Input;
  private readonly hud: HUD;
  private readonly sfx = new Sfx();
  private readonly perf = new PerfOverlay();
  private readonly views = new Map<string, View>();
  private readonly latestEntities = new Map<string, EntityState>();
  private readonly lootViews = new Map<string, LootView>();
  private readonly chestViews = new Map<string, ChestView>();
  private readonly enemyHp = new Map<string, number>();
  private readonly damageTexts: FloatingText[] = [];
  private readonly effects: TimedEffect[] = [];
  private readonly seenCombatEvents = new Set<string>();
  private readonly keyboardMove = new KeyboardMoveController();
  private readonly clientMovement = new ClientMovementPredictor();
  private readonly targetMarker: pc.Entity;
  private readonly forceWeaponGlowPreview = shouldForceWeaponGlowPreview();
  private markerTimer = 0;
  private elapsed = 0;
  private zone: WorldZone = 'overworld';
  private zombieClipConfigs?: Promise<Partial<Record<VisualAnimState, ClipConfig>>>;
  private selectedEnemyId: string | null = null;
  private hudDirty = true;
  private lastSnapshotTick = -1;
  private localPlayerMoving = false;
  private localPlayerRunning = false;
  private renderQualityMode: RenderQualityMode = this.readRenderQualityMode();
  private autoQualityLevel: RenderQualityLevel = 'high';
  private lastFrameNow = performance.now();
  /** Textura compartilhada das chamas (carregada uma vez, client-side). */
  private weaponFireTexture: pc.Texture | null = null;
  /** Ultimo alvo/direcao de ataque, usado para mirar o heroi no inimigo. */
  private lastAttackAimPoint: Vec3Like | null = null;
  /** Cache do inventario: o servidor manda `null` quando nao muda (delta). */
  private cachedInventory: InventoryItem[] = [];

  constructor(canvas: HTMLCanvasElement, private readonly uiLayer: HTMLElement, net: NetworkClient, profile: PlayerProfile) {
    this.net = net;
    const worldData = this.net.getWorld();
    this.terrain = worldData.terrain;
    this.world = new PcWorld(canvas, worldData);
    this.input = new Input(canvas);
    this.hud = new HUD(uiLayer, profile, worldData);
    if (import.meta.env.DEV) {
      (window as unknown as { __arannaGame?: Game }).__arannaGame = this;
    }
    this.targetMarker = this.world.createTargetMarker();
    this.applyRenderQuality();

    this.hud.onRespawn = () => this.net.send({ type: 'respawn', entityId: this.net.playerId });
    this.hud.onEquipItem = (itemId) => this.net.send({ type: 'equip-item', entityId: this.net.playerId, itemId });
    this.hud.onUseItem = (item) => this.net.send({ type: 'use-item', entityId: this.net.playerId, item });
    this.hud.onUnequipSlot = (slot) => this.net.send({ type: 'unequip-slot', entityId: this.net.playerId, slot });
    this.hud.onAllocateAttribute = (attribute) => this.net.send({
      type: 'allocate-attribute',
      entityId: this.net.playerId,
      attribute,
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async run(): Promise<void> {
    const loading = document.getElementById('loading');
    const bar = document.getElementById('loading-bar');
    const pct = document.getElementById('loading-pct');
    const setProgress = (value: number) => {
      const rounded = Math.round(value);
      if (bar) bar.style.width = `${rounded}%`;
      if (pct) pct.textContent = `${rounded}%`;
    };

    setProgress(8);
    await this.preloadGameplayAssets((progress) => setProgress(8 + progress * 82));
    setProgress(96);
    this.renderOnce();
    setProgress(100);
    if (loading) loading.classList.add('hidden');

    this.lastFrameNow = performance.now();
    this.world.start((dt) => this.frame(dt));
  }

  private async preloadGameplayAssets(onProgress: (value: number) => void): Promise<void> {
    const batches = [
      this.world.models.preload([HERO_MODEL_URL, ...ZOMBIE_MODEL_URLS]),
      this.world.models.preload([...PRELOAD_LOOT_MODEL_URLS, CHEST_MODEL_URLS.closed, CHEST_MODEL_URLS.open]),
      preloadHudIcons([...Object.values(ITEM_ICON_URLS), ...Object.values(HUD_SKILL_ICON_URLS)]),
      this.loadWeaponFireTexture(),
    ];
    let done = 0;
    await Promise.all(batches.map((promise) => promise.finally(() => {
      done++;
      onProgress(done / batches.length);
    })));
  }

  /**
   * Carrega (uma vez) a textura das chamas. E puramente client-side: o fogo da
   * arma e apresentacao e nunca trafega pelo WebSocket. Tolerante a falha — se
   * a textura nao carregar, o brilho da arma continua funcionando sem o fogo.
   */
  private loadWeaponFireTexture(): Promise<void> {
    return new Promise((resolve) => {
      this.world.app.assets.loadFromUrl(WEAPON_FIRE_TEXTURE_URL, 'texture', (error, asset) => {
        const resource = asset?.resource as pc.Texture | undefined;
        if (!error && resource) this.weaponFireTexture = resource;
        else if (import.meta.env.DEV) console.warn('[Game] textura de fogo da arma indisponivel:', error);
        resolve();
      });
    });
  }

  private renderOnce(): void {
    this.net.update(0);
    const snapshot = this.net.getSnapshot();
    this.hydrateSnapshotPresentation(snapshot);
    const playerState = snapshot.entities.find((e) => e.id === this.net.playerId);
    this.lastSnapshotTick = snapshot.tick;
    this.syncZone(snapshot.zone);
    this.reconcile(snapshot.entities, 0, true);
    this.syncCombatEvents(snapshot.combatEvents);
    this.reconcileLoot(snapshot.loot);
    this.reconcileChests(snapshot.chests);
    this.updateLootViews();
    this.updateCameraAndMarker(0);
    this.updateViewVisuals(snapshot.entities, 0);
    this.updateEnemyCulling();
    this.updateOverlays();
    this.hud.update(snapshot, playerState, this.selectedEnemy(snapshot.entities));
    this.hudDirty = false;
  }

  /**
   * Preenche os campos de PRESENTACAO (nome/icone/modelo) que o WebSocket nao
   * manda mais — derivados de kind/raridade/upgrade/etc. Idempotente: so preenche
   * o que falta, entao continua funcionando mesmo se o servidor ainda enviar.
   */
  private hydrateSnapshotPresentation(snapshot: WorldSnapshot): void {
    // Inventario com DELTA: o servidor manda `null` quando NAO mudou — nesse caso
    // reaproveitamos o cache. Quando vem o array (mudou ou reenvio periodico),
    // hidratamos (nome/icone) e cacheamos. (`!= null` cobre null e campo ausente.)
    const incoming = snapshot.inventory as InventoryItem[] | null | undefined;
    if (incoming != null) {
      for (const item of incoming) {
        if (!item.icon) item.icon = itemIconFor(item.kind);
        if (!item.name) item.name = itemDisplayName(item);
      }
      this.cachedInventory = incoming;
    }
    snapshot.inventory = this.cachedInventory;

    for (const loot of snapshot.loot) {
      if (!loot.icon) loot.icon = itemIconFor(loot.kind);
      if (!loot.name) loot.name = itemDisplayName(loot);
      if (!loot.modelUrl) loot.modelUrl = lootModelUrlFor(loot.kind);
    }
  }

  private frame(dtRaw: number): void {
    const now = performance.now();
    const frameMs = now - this.lastFrameNow;
    this.lastFrameNow = now;
    const dt = Math.min(Math.max(dtRaw, 0), 0.05);
    this.elapsed += dt;

    this.processInput(dt);
    this.net.update(dt);
    const snapshot = this.net.getSnapshot();
    const playerState = snapshot.entities.find((e) => e.id === this.net.playerId);
    const snapshotChanged = snapshot.tick !== this.lastSnapshotTick;

    if (snapshotChanged) {
      this.lastSnapshotTick = snapshot.tick;
      this.hydrateSnapshotPresentation(snapshot);
      this.syncZone(snapshot.zone);
      this.syncCombatEvents(snapshot.combatEvents);
      this.reconcileLoot(snapshot.loot);
      this.reconcileChests(snapshot.chests);
    }

    this.reconcile(snapshot.entities, dt, snapshotChanged);
    this.applyLocalPlayerMovement(dt);
    this.aimLocalPlayerDuringAttack(dt);
    this.updateLootViews();
    this.updateCameraAndMarker(dt);
    this.updateViewVisuals(snapshot.entities, dt);
    this.updateEnemyCulling();
    this.updateDamageTexts(dt);
    this.updateEffects(dt);
    this.updateOverlays();

    if (snapshotChanged || this.hudDirty) {
      this.hud.update(snapshot, playerState, this.selectedEnemy(snapshot.entities));
      this.hudDirty = false;
    }
    this.perf.update(frameMs, this.world.getRenderStats(), this.renderQualityMode === 'auto' ? `auto:${this.autoQualityLevel}` : this.renderQualityMode);
  }

  private processInput(dt: number): void {
    const menuRequested = this.input.takeInventoryToggle() || this.input.takeCharacterToggle();
    if (menuRequested) {
      this.sfx.play('ui');
      this.hud.toggleMenu();
    }
    if (this.input.takeSfxMuteToggle()) this.sfx.toggleMuted();
    if (this.input.takeQualityToggle()) {
      this.sfx.play('ui');
      this.cycleRenderQualityMode();
    }

    const zoom = this.input.takeZoom();
    if (zoom !== 0) this.world.rig.zoom(zoom);

    if (this.input.takeJump()) {
      this.sfx.unlock();
      this.net.send({ type: 'jump', entityId: this.net.playerId });
    }
    if (this.input.takeUsePotion()) {
      this.sfx.play('potion');
      this.net.send({ type: 'use-item', entityId: this.net.playerId, item: 'potion' });
    }
    if (this.input.takeUseManaPotion()) {
      this.sfx.play('potion');
      this.net.send({ type: 'use-item', entityId: this.net.playerId, item: 'mana_potion' });
    }
    if (this.input.takeArcaneNova()) {
      this.sfx.unlock();
      this.net.send({ type: 'cast-skill', entityId: this.net.playerId, skill: 'arcane-nova' });
    }

    this.processKeyboardMove(dt);
    for (const ndc of this.input.takeClicks()) this.handleClick(ndc);
  }

  private processKeyboardMove(dt: number): void {
    const movementChanged = this.input.takeMovementChanged();
    const axes = this.input.getMoveAxes();
    const player = this.views.get(this.net.playerId)?.entity
      ? entityPosition(this.views.get(this.net.playerId)!.entity)
      : this.latestEntities.get(this.net.playerId)?.position;
    const direction = this.world.rig.getMoveDirection(axes.strafe, axes.forward);
    const decision = this.keyboardMove.update({
      dt,
      movementChanged,
      axes,
      running: this.input.running,
      player,
      direction,
    });
    if (decision.type === 'none') return;
    this.net.send({ type: 'move', entityId: this.net.playerId, target: decision.target, run: decision.run });
  }

  private applyLocalPlayerMovement(dt: number): void {
    this.localPlayerMoving = false;
    this.localPlayerRunning = false;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (!view || (state && !state.alive)) return;

    const axes = this.input.getMoveAxes();
    const direction = this.world.rig.getMoveDirection(axes.strafe, axes.forward);
    const prediction = this.clientMovement.predict({
      dt,
      axes,
      running: this.input.running,
      direction,
      current: entityPosition(view.entity),
      terrain: this.terrain,
      zone: this.zone,
    });
    if (!prediction) return;

    setEntityPosition(view.entity, prediction.position);
    setYaw(view.entity, prediction.rotationY);
    this.localPlayerMoving = true;
    this.localPlayerRunning = prediction.running;
  }

  /**
   * Durante o ataque, gira o heroi local para encarar o alvo/mouse. O servidor
   * ja manda rotationY, mas client-side garantimos que o personagem nunca fique
   * de costas para o inimigo (independe da latencia/ordem dos snapshots). E
   * apresentacao pura: nao envia nada pelo WebSocket. Quando o jogador anda pelo
   * teclado, o movimento dita a direcao e a mira nao interfere.
   */
  private aimLocalPlayerDuringAttack(dt: number): void {
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (!view || !state || !state.alive || state.action !== 'attack') return;
    if (this.isKeyboardMovementActive()) return;

    const aim = this.currentAttackAimPoint();
    if (!aim) return;
    const p = entityPosition(view.entity);
    const dx = aim.x - p.x;
    const dz = aim.z - p.z;
    if (dx * dx + dz * dz < 1e-6) return;

    const desired = Math.atan2(dx, dz);
    const current = entityYaw(view.entity);
    const delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
    const alpha = dt > 0 ? 1 - Math.exp(-ATTACK_AIM_TURN_RATE * dt) : 1;
    setYaw(view.entity, current + delta * alpha);
  }

  /** Posicao do alvo atual do ataque: inimigo selecionado vivo, senao o ultimo clique. */
  private currentAttackAimPoint(): Vec3Like | null {
    if (this.selectedEnemyId) {
      const enemy = this.latestEntities.get(this.selectedEnemyId);
      if (enemy && enemy.alive) return enemy.position;
    }
    return this.lastAttackAimPoint;
  }

  private handleClick(ndc: PointerNdc): void {
    this.sfx.unlock();
    const ray = this.world.screenRay(ndc);
    const portal = this.world.pickPortal(ray);
    if (portal) {
      this.setSelectedEnemy(null);
      this.sfx.play('arcane-nova');
      this.net.send({ type: portal, entityId: this.net.playerId });
      return;
    }

    const chestPick = rayPickBest(
      ray,
      [...this.chestViews.entries()].filter(([, view]) => !view.opened),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 0.74, z: p.z };
      },
      () => CHEST_CLICK_RADIUS,
    );
    if (chestPick) {
      const [id] = chestPick;
      this.setSelectedEnemy(null);
      this.sfx.play('chest');
      this.net.send({ type: 'open-chest', entityId: this.net.playerId, chestId: id });
      return;
    }

    const lootPick = rayPickBest(
      ray,
      this.lootViews.entries(),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 0.44, z: p.z };
      },
      () => LOOT_CLICK_RADIUS,
    );
    if (lootPick) {
      const [id] = lootPick;
      this.setSelectedEnemy(null);
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: id });
      return;
    }

    const enemyPick = rayPickBest(
      ray,
      [...this.views.entries()].filter(([, view]) => view.kind === 'enemy'),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 1.2 * view.entity.getLocalScale().x, z: p.z };
      },
      ([, view]) => 1.25 * Math.max(1, view.entity.getLocalScale().x),
    );
    if (enemyPick) {
      const [id, enemyView] = enemyPick;
      this.setSelectedEnemy(id);
      const ep = entityPosition(enemyView.entity);
      this.lastAttackAimPoint = { x: ep.x, y: ep.y, z: ep.z };
      this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: id });
      return;
    }

    const ground = this.world.pickGround(ray);
    if (!ground) return;
    const closeLoot = this.findLootNear(ground.point);
    if (closeLoot) {
      this.setSelectedEnemy(null);
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: closeLoot });
      return;
    }
    const closeTarget = this.findCloseEnemy();
    const player = this.views.get(this.net.playerId)?.entity;
    const playerPos = player ? entityPosition(player) : undefined;
    if (closeTarget && playerPos && Math.hypot(ground.point.x - playerPos.x, ground.point.z - playerPos.z) <= CLOSE_CLICK_RADIUS) {
      this.setSelectedEnemy(closeTarget);
      const targetPos = this.latestEntities.get(closeTarget)?.position ?? ground.point;
      this.lastAttackAimPoint = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
      this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: closeTarget });
      return;
    }

    this.setSelectedEnemy(null);
    this.net.send({
      type: 'move',
      entityId: this.net.playerId,
      target: { x: ground.point.x, y: 0, z: ground.point.z },
      run: this.input.running,
    });
    this.showMarker(ground.point.x, ground.point.y, ground.point.z);
  }

  private reconcile(entities: EntityState[], dt: number, snapshotChanged = true): void {
    const seen = new Set<string>();
    this.latestEntities.clear();

    for (const e of entities) {
      seen.add(e.id);
      this.latestEntities.set(e.id, e);
      const view = this.views.get(e.id) ?? this.createView(e);
      const visualScale = e.kind === 'enemy' ? e.scale ?? 1 : 1;
      view.entity.setLocalScale(visualScale, visualScale, visualScale);
      if (e.kind === 'enemy') this.enemyHp.set(e.id, e.hp);
      setEntityVisible(view.entity, e.kind === 'player' ? e.alive : e.alive || e.action === 'dead');

      const isLocalPlayer = e.id === this.net.playerId;
      if (!view.initialized || dt === 0) {
        setEntityPosition(view.entity, e.position);
        setYaw(view.entity, e.rotationY);
        view.initialized = true;
      } else if (isLocalPlayer && !snapshotChanged) {
        // A previsao local do frame anterior continua valendo ate chegar snapshot novo.
      } else {
        const current = entityPosition(view.entity);
        const correctionDistance = Math.hypot(e.position.x - current.x, e.position.y - current.y, e.position.z - current.z);
        const localKeyboardActive = isLocalPlayer && this.isKeyboardMovementActive();
        const rate = localKeyboardActive ? LOCAL_PLAYER_CORRECTION_RATE : REMOTE_RECONCILE_RATE;
        const alpha = 1 - Math.exp(-rate * dt);
        if (isLocalPlayer && correctionDistance > LOCAL_PLAYER_SNAP_CORRECTION_DISTANCE) {
          setEntityPosition(view.entity, e.position);
        } else if (localKeyboardActive && correctionDistance <= LOCAL_PLAYER_IGNORE_CORRECTION_DISTANCE) {
          // Mantem a pose prevista para evitar tremidinha.
        } else {
          lerpEntityPosition(view.entity, e.position, alpha);
        }
        if (!localKeyboardActive) {
          const delta = Math.atan2(Math.sin(e.rotationY - entityYaw(view.entity)), Math.cos(e.rotationY - entityYaw(view.entity)));
          setYaw(view.entity, entityYaw(view.entity) + delta * alpha);
        }
      }

      if (view.healthBar) {
        const p = entityPosition(view.entity);
        view.healthBar.setHealth(e.hp, e.maxHp, e.level, e.kind === 'player' ? e.name : '');
        view.healthBar.setWorldPosition(p.x, p.y + ENEMY_HEALTH_BAR_HEIGHT * visualScale, p.z);
        view.healthBar.update(this.world, e.alive);
      }

      if (e.kind === 'player') this.ensureHero(view, e);
      else this.ensureZombie(view);
      this.syncViewEquipment(view, this.visibleWeaponFor(e));
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.healthBar?.dispose();
      destroyEntity(view.entity);
      this.views.delete(id);
      this.enemyHp.delete(id);
    }
  }

  private createView(e: EntityState): View {
    const entity = makeEntity(e.id, this.world.app);
    const visual = makeEntity(`${e.id}-visual`, this.world.app);
    entity.addChild(visual);
    const local = e.id === this.net.playerId;
    const fallback = e.kind === 'player'
      ? this.world.createFallbackCharacter('player-fallback', local ? 0x3b82f6 : 0x2f9f68, 0xf2c79b)
      : this.world.createFallbackCharacter('enemy-fallback', 0xb33a3a, 0x7a2222);
    visual.addChild(fallback);
    this.world.root.addChild(entity);
    const healthBar = e.kind === 'player' && local ? undefined : new HealthBarOverlay(this.uiLayer);
    const view: View = { entity, visual, healthBar, kind: e.kind };
    this.views.set(e.id, view);
    return view;
  }

  private clearViewVisual(view: View): void {
    view.weaponGlowMaterial?.destroy();
    view.weaponGlowMaterial = undefined;
    for (const material of view.weaponBoostMaterials ?? []) material.destroy();
    view.weaponBoostMaterials = undefined;
    clearChildren(view.visual);
    view.weapon = undefined;
    view.weaponGlow = undefined;
    view.weaponLight = undefined;
    view.weaponFire = undefined;
    view.weaponGlowFactor = undefined;
    view.weaponAnchor = undefined;
    view.weaponAttachedToBone = undefined;
    view.weaponGlowLength = undefined;
    view.anim = undefined;
    view.equippedWeaponKey = undefined;
  }

  private getZombieClipConfigs(): Promise<Partial<Record<VisualAnimState, ClipConfig>>> {
    if (!this.zombieClipConfigs) {
      this.zombieClipConfigs = Promise.all(ZOMBIE_MODEL_URLS.map((url) => this.world.models.animationTracks(url)))
        .then(([walkTracks, runTracks, attackTracks, deadTracks]) => {
          const walk = walkTracks[0] ? prepareGameplayTrack(walkTracks[0]) : undefined;
          const run = runTracks[0] ? prepareGameplayTrack(runTracks[0]) : walk;
          const attack = attackTracks[0] ? prepareGameplayTrack(attackTracks[0]) : walk;
          const dead = deadTracks[0] ? prepareGameplayTrack(deadTracks[0]) : walk;
          const configs: Partial<Record<VisualAnimState, ClipConfig>> = {};
          if (walk) {
            configs.idle = { track: walk, speed: 0, loop: true };
            configs.walk = { track: walk, speed: 1, loop: true };
          }
          if (run) configs.run = { track: run, speed: 1, loop: true };
          if (attack) configs.attack = { track: attack, speed: 1.2, loop: false };
          if (dead) configs.dead = { track: dead, speed: 1, loop: false };
          return configs;
        });
    }
    return this.zombieClipConfigs;
  }

  private ensureHero(view: View, entity: EntityState): void {
    if (view.kind !== 'player') return;
    const modelUrl = entity.modelUrl || HERO_MODEL_URL;
    if (view.heroModelUrl === modelUrl || view.heroLoading || view.heroFailedUrl === modelUrl) return;
    view.heroLoading = true;
    view.heroModelUrl = modelUrl;
    void Promise.all([
      this.world.models.instantiate(modelUrl),
      this.world.models.animationTracks(modelUrl),
    ]).then(([model, tracks]) => {
      if (view.heroModelUrl !== modelUrl || !view.entity.parent) {
        destroyEntity(model);
        return;
      }
      this.clearViewVisual(view);
      keepSingleSkinnedRigRoot(model, HERO_RIG_ROOT_NAME);
      configureImportedModel(model);
      setVisualAssetTransform(model, HERO_VISUAL_SCALE);
      view.visual.addChild(model);
      view.anim = new PcClipController(model, buildHeroClipConfigs(tracks));
      view.heroLoading = false;
      view.equippedWeaponKey = undefined;
    }).catch((error) => {
      view.heroLoading = false;
      view.heroFailedUrl = modelUrl;
      console.warn('[Game] falha ao carregar heroi PlayCanvas:', error);
    });
  }

  private ensureZombie(view: View): void {
    if (view.kind !== 'enemy' || view.zombieLoading || view.zombieFailed || view.heroModelUrl === ZOMBIE_VISUAL_URL) return;
    view.zombieLoading = true;
    view.heroModelUrl = ZOMBIE_VISUAL_URL;
    void Promise.all([
      this.world.models.instantiate(ZOMBIE_VISUAL_URL),
      this.getZombieClipConfigs(),
    ]).then(([model, clipConfigs]) => {
      if (!view.entity.parent) {
        destroyEntity(model);
        return;
      }
      this.clearViewVisual(view);
      configureImportedModel(model);
      setVisualAssetTransform(model, ZOMBIE_VISUAL_SCALE);
      view.visual.addChild(model);
      view.anim = new PcClipController(model, clipConfigs);
      view.zombieLoading = false;
    }).catch((error) => {
      view.zombieLoading = false;
      view.zombieFailed = true;
      console.warn('[Game] falha ao carregar zumbi PlayCanvas:', error);
    });
  }

  private updateViewVisuals(entities: readonly EntityState[], dt: number): void {
    for (const entity of entities) {
      const view = this.views.get(entity.id);
      if (!view) continue;
      view.animTime = (view.animTime ?? 0) + dt;
      const jumping = !!entity.jumping;
      if (jumping && !view.wasJumping) view.jumpArc = 0;
      if (jumping) view.jumpArc = Math.min((view.jumpArc ?? 0) + dt, JUMP_TIME);
      view.wasJumping = jumping;
      const jumpArc = view.jumpArc ?? 0;
      const yOffset = jumping ? Math.sin(Math.PI * (jumpArc / JUMP_TIME)) * JUMP_HEIGHT : 0;
      const bob = entity.alive && entity.action !== 'idle'
        ? Math.sin((view.animTime ?? 0) * (entity.action === 'run' ? 13 : 9)) * 0.035
        : 0;
      view.visual.setLocalPosition(0, yOffset + bob, 0);
      const predictedAction = entity.id === this.net.playerId && this.localPlayerMoving
        ? (this.localPlayerRunning ? 'run' : 'walk')
        : entity.action;
      const animState = jumping ? 'jump' : predictedAction;
      view.anim?.setState(animState);
      view.anim?.setPlaybackSpeed(animState === 'attack' ? entity.attackSpeed ?? 1 : 1);
      this.updateWeaponPose(view, animState, entity.alive);
    }
  }

  /**
   * Culling por entidade dos inimigos: desabilita (entity.enabled=false) zumbis fora
   * da tela ou muito longe — assim param de RENDERIZAR, ANIMAR e projetar SOMBRA
   * (o PlayCanvas pula entidades desabilitadas). E o maior ganho de FPS em horda.
   * Um raio proximo fica sempre visivel para nao cortar inimigos em combate.
   */
  private updateEnemyCulling(): void {
    const player = this.views.get(this.net.playerId);
    if (!player) return;
    const pp = entityPosition(player.entity);
    for (const [id, view] of this.views) {
      if (view.kind !== 'enemy') continue;
      const state = this.latestEntities.get(id);
      let visible = !!state && (state.alive || state.action === 'dead');
      if (visible) {
        const p = entityPosition(view.entity);
        const dist = Math.hypot(p.x - pp.x, p.z - pp.z);
        if (dist > ENEMY_CULL_NEAR_KEEP) {
          visible = dist <= ENEMY_CULL_FAR && this.world.project({ x: p.x, y: p.y + 1.2, z: p.z }).visible;
        }
      }
      if (view.entity.enabled !== visible) view.entity.enabled = visible;
    }
  }

  private updateWeaponPose(view: View, action: VisualAnimState, alive: boolean): void {
    if (!view.weaponAnchor) return;
    const time = view.animTime ?? 0;
    const moving = alive && (action === 'walk' || action === 'run');
    const attacking = alive && action === 'attack';
    const speed = action === 'run' ? 11.5 : 8.5;
    const stride = moving ? Math.sin(time * speed) : 0;
    const attackSwing = attacking ? Math.sin(time * 18) : 0;
    if (!view.weaponAttachedToBone) {
      const breath = alive ? Math.sin(time * 2.6) : 0;
      const x = 0.48 + stride * 0.035 + attackSwing * 0.08;
      const y = 1.12 + Math.abs(stride) * 0.045 + breath * 0.018;
      const z = 0.26 + Math.max(0, stride) * 0.05 + attackSwing * 0.18;
      view.weaponAnchor.setLocalPosition(x, y, z);
      view.weaponAnchor.setLocalEulerAngles(
        58 + Math.abs(stride) * 5 - attackSwing * 22,
        -8 + attackSwing * 14,
        -42 - stride * 8 - attackSwing * 18,
      );
    }

    if (view.weaponGlowMaterial) {
      // Pulso suave do halo (aura) por cima da base escalada pelo nivel.
      const factor = view.weaponGlowFactor ?? 0.5;
      const isFire = view.weaponFire != null;
      const pulse = 0.8 + Math.sin(time * 6) * 0.15 + (attacking ? 0.15 : 0);
      view.weaponGlowMaterial.opacity = Math.min(0.72, ((isFire ? 0.22 : 0.18) + factor * 0.32) * pulse);
      view.weaponGlowMaterial.emissiveIntensity = (0.5 + factor * 1.3) * (0.8 + pulse * 0.3);
      view.weaponGlowMaterial.update();
    }
    if (view.weaponLight?.light) {
      const factor = view.weaponGlowFactor ?? 0.5;
      const isFire = view.weaponFire != null;
      const flicker = 0.78 + Math.max(0, Math.sin(time * (isFire ? 13 : 10))) * 0.32;
      view.weaponLight.light.intensity = ((isFire ? 0.35 : 0.12) + factor * (isFire ? 1.2 : 1.0)) * flicker + (attacking ? 0.3 : 0);
    }

    // Luz e fogo vivem no view.visual (escala 1) para ficarem CONTIDOS — sob o osso
    // (escala ~0.01) o range/tamanho estouravam. Aqui sincronizamos a POSICAO DE
    // MUNDO deles com o centro da lamina (o cilindro de brilho acompanha a espada),
    // entao o efeito segue a arma como um buff, sem herdar a escala do osso.
    if (view.weaponAnchor && (view.weaponLight || view.weaponFire)) {
      // Centro da lamina = punho (posicao do anchor) + direcao da lamina (anchor.up)
      // * distancia. A orientacao do fogo segue o anchor (seu +Y aponta na lamina),
      // para as chamas cobrirem a espada inteira, nao um ponto.
      const anchor = view.weaponAnchor;
      const hand = anchor.getPosition();
      const dir = anchor.up;
      const cx = hand.x + dir.x * WEAPON_BLADE_CENTER;
      const cy = hand.y + dir.y * WEAPON_BLADE_CENTER;
      const cz = hand.z + dir.z * WEAPON_BLADE_CENTER;
      view.weaponLight?.setPosition(cx, cy, cz);
      if (view.weaponFire) {
        view.weaponFire.setPosition(cx, cy, cz);
        view.weaponFire.setRotation(anchor.getRotation());
      }
    }
  }

  /**
   * Cria o fogo da lamina com o sistema de particulas do PlayCanvas (GPU,
   * leve). Emite ao longo da lamina, sobe e esmaece — recriando o
   * BladeFireParticles do Three.js. Puramente client-side / apresentacao.
   * O `s = 1/inheritedScale` compensa a escala do osso da mao (igual ao glow).
   */
  /**
   * Faz o PROPRIO item brilhar: clona os materiais da arma (para nao afetar outras
   * instancias) e soma um emissivo na cor da gema. O glow passa a sair de DENTRO da
   * arma, fundindo com a textura. Retorna os clones para destruir no unequip.
   */
  private boostWeaponEmissive(weapon: pc.Entity, color: pc.Color, intensity: number): pc.StandardMaterial[] {
    const cloned: pc.StandardMaterial[] = [];
    const renders = weapon.findComponents('render') as unknown as Array<{
      meshInstances?: Array<{ material: pc.Material }>;
    }>;
    for (const render of renders) {
      for (const meshInstance of render.meshInstances ?? []) {
        const mat = meshInstance.material;
        if (!(mat instanceof pc.StandardMaterial)) continue;
        const copy = mat.clone();
        copy.emissive = new pc.Color(
          Math.min(1, copy.emissive.r + color.r * intensity),
          Math.min(1, copy.emissive.g + color.g * intensity),
          Math.min(1, copy.emissive.b + color.b * intensity),
        );
        copy.emissiveIntensity = (copy.emissiveIntensity || 1) + intensity * 0.8;
        copy.update();
        meshInstance.material = copy;
        cloned.push(copy);
      }
    }
    return cloned;
  }

  /**
   * Aura estilo Mu Online: clona a malha da arma, aplica o material aditivo do
   * halo (cull front => faces de tras) e amplia levemente. Resultado: um contorno
   * brilhante que segue o formato exato da arma. Acompanha a lamina (fica no anchor).
   */
  private createWeaponShell(weapon: pc.Entity, material: pc.Material, scaleMul: number, parent: pc.Entity): pc.Entity {
    const shell = weapon.clone() as pc.Entity;
    shell.name = 'weapon-shell';
    const renders = shell.findComponents('render') as unknown as Array<{
      meshInstances?: Array<{ material: pc.Material }>;
      castShadows?: boolean;
    }>;
    for (const render of renders) {
      render.castShadows = false;
      for (const meshInstance of render.meshInstances ?? []) meshInstance.material = material;
    }
    const s = weapon.getLocalScale();
    shell.setLocalScale(s.x * scaleMul, s.y * scaleMul, s.z * scaleMul);
    const p = weapon.getLocalPosition();
    shell.setLocalPosition(p.x, p.y, p.z);
    shell.setLocalRotation(weapon.getLocalRotation());
    parent.addChild(shell);
    return shell;
  }

  private createWeaponFire(parent: pc.Entity): pc.Entity {
    // Fogo da arma. Fica no view.visual (escala 1) => TODOS os valores em unidades
    // de mundo, pequenos e CONTIDOS (sob o osso, escala ~0.01, estourava). A
    // posicao de mundo e sincronizada com a lamina a cada frame (updateWeaponPose),
    // entao as chamas sobem a partir da espada como um buff.
    const fire = makeEntity('weapon-fire', this.world.app);

    const colorGraph = new pc.CurveSet([
      [0, 1.0, 0.5, 1.0, 1, 0.85],
      [0, 0.55, 0.5, 0.30, 1, 0.10],
      [0, 0.16, 0.5, 0.07, 1, 0.02],
    ]);
    const alphaGraph = new pc.Curve([0, 0.0, 0.18, 0.7, 0.7, 0.45, 1, 0.0]);
    const scaleGraph = new pc.Curve([0, 0.045, 0.4, 0.08, 1, 0.0]);
    // Emissor JA orientado ao longo da lamina (setRotation no updateWeaponPose):
    // o +Y aponta para a ponta. Velocidade suave => as chamas correm pela lamina.
    const localVelocityGraph = new pc.CurveSet([
      [0, 0, 1, 0],
      [0, 0.45, 1, 0.9],
      [0, 0, 1, 0],
    ]);

    fire.addComponent('particlesystem', {
      numParticles: 24,
      lifetime: 0.45,
      rate: 0.015,
      rate2: 0.03,
      startAngle: 0,
      startAngle2: 360,
      loop: true,
      preWarm: true,
      emitterShape: pc.EMITTERSHAPE_BOX,
      // Coluna FINA ao longo da lamina (extents Y ~= metade do comprimento; X/Z bem
      // finos) => o fogo abraca a espada em vez de inchar e ficar maior que ela.
      emitterExtents: new pc.Vec3(0.025, 0.55, 0.025),
      colorMap: this.weaponFireTexture ?? undefined,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      halfLambert: false,
      intensity: 0.6,
      colorGraph,
      alphaGraph,
      scaleGraph,
      localVelocityGraph,
    });
    parent.addChild(fire);
    return fire;
  }

  private visibleWeaponFor(entity: EntityState): EquippedWeaponVisualState | null {
    if (entity.id !== this.net.playerId) return entity.equippedWeapon ?? null;
    return this.forceWeaponGlowPreview
      ? { kind: 'sword', rarity: 'lendario', upgradeLevel: 15, glowGem: 'soul', element: 'fire' }
      : entity.equippedWeapon ?? null;
  }

  private syncViewEquipment(view: View, weapon: EquippedWeaponVisualState | null): void {
    const key = this.equippedWeaponKeyFor(weapon);
    if (key === view.equippedWeaponKey) return;
    view.equippedWeaponKey = key;
    view.weaponGlowMaterial?.destroy();
    for (const material of view.weaponBoostMaterials ?? []) material.destroy();
    view.weaponBoostMaterials = undefined;
    destroyEntity(view.weaponAnchor);
    destroyEntity(view.weaponLight);
    destroyEntity(view.weaponFire);
    view.weapon = undefined;
    view.weaponGlow = undefined;
    view.weaponGlowMaterial = undefined;
    view.weaponLight = undefined;
    view.weaponFire = undefined;
    view.weaponGlowFactor = undefined;
    view.weaponAnchor = undefined;
    view.weaponAttachedToBone = undefined;
    view.weaponGlowLength = undefined;

    if (weapon?.kind !== 'sword') return;
    const socketParent = findDescendantEntity(view.visual, WEAPON_SOCKET_BONE_NAMES);
    const attachToBone = !!socketParent;
    const inheritedScale = attachToBone ? maxWorldScale(socketParent) : 1;
    const localWeaponLength = WEAPON_WORLD_LENGTH / inheritedScale;
    const anchor = makeEntity('weapon-anchor', this.world.app);
    (socketParent ?? view.visual).addChild(anchor);
    if (attachToBone) {
      anchor.setLocalPosition(0, 0, 0);
      anchor.setLocalEulerAngles(0, 0, -90);
    }
    view.weaponAnchor = anchor;
    view.weaponAttachedToBone = attachToBone;
    view.weaponGlowLength = localWeaponLength;
    void this.world.models.instantiate(EQUIPPED_SWORD_MODEL_URL).then((model) => {
      if (view.equippedWeaponKey !== key || !view.entity.parent || view.weaponAnchor !== anchor || !anchor.parent) {
        destroyEntity(model);
        return;
      }
      model.name = 'equipped-sword';
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      fitWeaponToGrip(model, WEAPON_WORLD_LENGTH, WEAPON_GRIP_FROM_BOTTOM, inheritedScale);
      anchor.addChild(model);
      view.weapon = model;
      if (weapon.upgradeLevel > 0 || weapon.element === 'fire') {
        const isFire = weapon.element === 'fire';
        // Brilho escalado pelo nivel/raridade: discreto em niveis baixos, sem
        // estourar no maximo (espelha a progressao por estagios do Three.js).
        const factor = weaponGlowFactor(weapon.upgradeLevel, weapon.rarity, weapon.element);
        view.weaponGlowFactor = factor;
        const glowColor = colorFromCss(glowColorForGem(weapon.glowGem));
        // (1) O PROPRIO item brilha: clona os materiais da arma e turbina o emissivo
        // na cor da gema. E isso que faz o glow FUNDIR com a textura, em vez de uma
        // cor chapada por cima. (espelha o cloneAndGlowWeaponMaterials do Three.js)
        view.weaponBoostMaterials = this.boostWeaponEmissive(model, glowColor, 0.12 + factor * 0.5);
        // (2) Aura estilo Mu: shell = contorno FINO (clone levemente maior, faces de
        // tras, aditivo). Fino de proposito (~1.02-1.04) — a 1.12 virava um bloco
        // gordo maior que a arma.
        const material = createMaterial(glowColor, {
          emissive: glowColor,
          emissiveIntensity: 0.4 + factor * 0.9,
          opacity: (isFire ? 0.12 : 0.1) + factor * 0.16,
          additive: true,
          unlit: true,
        });
        material.cull = pc.CULLFACE_FRONT;
        material.update();
        const glow = this.createWeaponShell(model, material, 1.02 + factor * 0.02, anchor);
        // Luz da arma fica no view.visual (escala 1) para o range ficar em unidades
        // de mundo CONTIDAS — sob o osso (escala ~0.01) o alcance estourava na tela.
        // A posicao de mundo e sincronizada com a lamina a cada frame
        // (updateWeaponPose), entao a luz acompanha a arma como um buff.
        const light = makeEntity('weapon-light', this.world.app);
        const lightColor = isFire ? colorFromCss('#ff6a1a') : glowColor;
        light.addComponent('light', {
          type: 'omni',
          color: lightColor,
          intensity: (isFire ? 0.55 : 0.22) + factor * (isFire ? 1.4 : 1.0),
          range: 2.2 + factor * 1.2,
          falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
        });
        view.visual.addChild(light);
        view.weaponGlow = glow;
        view.weaponGlowMaterial = material;
        view.weaponLight = light;

        // Fogo da lamina: VFX client-side (PlayCanvas particles), so para armas
        // de elemento fogo. Nunca depende do WebSocket.
        if (isFire && this.weaponFireTexture) {
          view.weaponFire = this.createWeaponFire(view.visual);
        }
      }
    }).catch((error) => {
      console.warn('[Game] falha ao equipar espada PlayCanvas:', error);
    });
  }

  private equippedWeaponKeyFor(weapon: EquippedWeaponVisualState | null | undefined): string | null {
    return weapon
      ? `${weapon.kind}:${weapon.rarity}:${weapon.upgradeLevel}:${weapon.glowGem ?? ''}:${weapon.element ?? ''}`
      : null;
  }

  private reconcileLoot(loot: LootState[]): void {
    const seen = new Set<string>();
    for (const item of loot) {
      seen.add(item.id);
      let view = this.lootViews.get(item.id);
      if (!view) {
        const entity = makeEntity(`loot-${item.id}`, this.world.app);
        const fallbackColor = item.kind === 'sword'
          ? 0xf0c64b
          : item.kind === 'mana_potion'
            ? 0x4b9bff
            : item.kind === 'potion'
              ? 0xd74b57
              : item.glowGem
                ? glowColorForGem(item.glowGem)
                : 0xf7dc69;
        const material = typeof fallbackColor === 'string'
          ? createMaterial(colorFromCss(fallbackColor), { emissive: colorFromCss(fallbackColor), emissiveIntensity: 0.25 })
          : this.world.material(`loot-${item.kind}`, fallbackColor);
        this.world.createPrimitive('loot-fallback', 'sphere', material, { x: 0, y: 0.34, z: 0 }, { x: 0.42, y: 0.42, z: 0.42 }, entity);
        this.world.root.addChild(entity);
        const labelColor = this.lootLabelColor(item);
        const label = new WorldLabel(this.uiLayer, 'loot-label', item.name, labelColor);
        view = {
          entity,
          label,
          labelColor,
          labelText: item.name,
          baseY: item.position.y,
          phase: this.lootViews.size * 0.9,
        };
        this.lootViews.set(item.id, view);
        void this.replaceLootModel(entity, item.modelUrl);
      }
      view.baseY = item.position.y;
      view.labelText = item.name;
      setEntityPosition(view.entity, { x: item.position.x, y: item.position.y, z: item.position.z });
    }

    for (const [id, view] of this.lootViews) {
      if (seen.has(id)) continue;
      view.label.dispose();
      destroyEntity(view.entity);
      this.lootViews.delete(id);
    }
  }

  private async replaceLootModel(container: pc.Entity, url: string): Promise<void> {
    try {
      const model = await this.world.models.instantiate(url);
      if (!container.parent) {
        destroyEntity(model);
        return;
      }
      clearChildren(container);
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      fitEntityToLargest(model, 0.72, 0.08);
      container.addChild(model);
    } catch (error) {
      console.warn(`[Game] falha ao carregar loot ${url}:`, error);
    }
  }

  private updateLootViews(): void {
    for (const view of this.lootViews.values()) {
      const p = entityPosition(view.entity);
      view.entity.setLocalPosition(p.x, view.baseY + 0.16 + Math.sin(this.elapsed * 3 + view.phase) * 0.1, p.z);
      setYaw(view.entity, this.elapsed * 1.7 + view.phase);
      const current = entityPosition(view.entity);
      view.label.setWorldPosition(current.x, current.y + 0.98, current.z);
      view.label.update(this.world);
    }
  }

  private reconcileChests(chests: ChestState[]): void {
    const seen = new Set<string>();
    for (const chest of chests) {
      seen.add(chest.id);
      let view = this.chestViews.get(chest.id);
      if (!view) {
        const entity = makeEntity(`chest-${chest.id}`, this.world.app);
        this.world.createPrimitive('chest-fallback', 'box', this.world.material('chest-fallback', 0x7a4b24), { x: 0, y: 0.43, z: 0 }, { x: 1.35, y: 0.86, z: 0.92 }, entity);
        this.world.root.addChild(entity);
        view = { entity, opened: chest.opened };
        this.chestViews.set(chest.id, view);
        void this.replaceChestModel(entity, chest.opened);
      } else if (view.opened !== chest.opened) {
        view.opened = chest.opened;
        void this.replaceChestModel(view.entity, chest.opened);
      }
      setEntityPosition(view.entity, chest.position);
      setYaw(view.entity, chest.id.endsWith('east')
        ? -Math.PI * 0.72
        : chest.id.endsWith('west')
          ? Math.PI * 0.72
          : 0);
      view.entity.setLocalScale(chest.opened ? 1.03 : 1, chest.opened ? 1.03 : 1, chest.opened ? 1.03 : 1);
    }

    for (const [id, view] of this.chestViews) {
      if (seen.has(id)) continue;
      destroyEntity(view.entity);
      this.chestViews.delete(id);
    }
  }

  private async replaceChestModel(container: pc.Entity, opened: boolean): Promise<void> {
    const url = opened ? CHEST_MODEL_URLS.open : CHEST_MODEL_URLS.closed;
    try {
      const model = await this.world.models.instantiate(url);
      if (!container.parent) {
        destroyEntity(model);
        return;
      }
      clearChildren(container);
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      fitEntityToLargest(model, 1.35);
      container.addChild(model);
    } catch (error) {
      console.warn('[Game] falha ao carregar bau PlayCanvas:', error);
    }
  }

  private lootLabelColor(item: LootState): string {
    if (item.rarity) return RARITY_COLORS[item.rarity];
    if (item.glowGem) return glowColorForGem(item.glowGem);
    return '#f0dfb2';
  }

  private syncCombatEvents(events: readonly CombatEvent[]): void {
    for (const event of events) {
      if (this.seenCombatEvents.has(event.id)) continue;
      this.seenCombatEvents.add(event.id);
      if (event.type === 'skill-effect') {
        if (event.skill === 'arcane-nova') {
          this.sfx.play('arcane-nova');
          this.showArcaneNova(event.position, event.radius);
        }
        continue;
      }
      if (event.type === 'boss-slam-warning') {
        this.showBossSlamWarning(event.position, event.radius, event.delay);
        continue;
      }
      if (event.type === 'boss-slam-impact') {
        this.sfx.play('boss-slam');
        this.showBossSlamImpact(event.position, event.radius);
        continue;
      }
      if (event.type === 'miss') {
        this.sfx.play('miss');
        this.showCombatText('MISS', event.position, 'miss');
        continue;
      }
      this.sfx.play(event.damageKind === 'magic' ? 'hit-magic' : 'hit-physical');
      this.showDamageText(event.amount, event.position, event.damageKind);
      this.showHitImpact(event.position, event.damageKind);
    }
    if (this.seenCombatEvents.size > 256) {
      const keep = new Set(events.map((event) => event.id));
      for (const id of this.seenCombatEvents) if (!keep.has(id)) this.seenCombatEvents.delete(id);
    }
  }

  private showDamageText(amount: number, position: Vec3Like, damageKind: DamageKind): void {
    // Numero de dano flutuante (apresentacao; client-side).
    this.showCombatText(amount, position, damageKind);
  }

  private showCombatText(text: number | string, position: Vec3Like, textKind: CombatTextKind): void {
    if (typeof text === 'number' && text <= 0) return;
    if (this.damageTexts.length >= MAX_FLOATING_COMBAT_TEXTS) this.damageTexts.shift()?.dispose();
    const verticalOffset = textKind === 'magic' ? 3.18 : textKind === 'miss' ? 2.95 : textKind === 'incoming' ? 3.05 : 2.75;
    this.damageTexts.push(new FloatingText(this.uiLayer, text, { x: position.x, y: position.y + verticalOffset, z: position.z }, textKind));
  }

  private showHitImpact(position: Vec3Like, damageKind: DamageKind): void {
    const color = damageKind === 'magic' ? colorFromCss('#74d8ff') : colorFromCss('#ffd38a');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.4, opacity: 0.66, additive: true, unlit: true });
    const entity = this.world.createPrimitive('hit-impact', 'sphere', material, { x: position.x, y: position.y + 1.1, z: position.z }, { x: 0.22, y: 0.22, z: 0.22 });
    this.effects.push(new PulseEffect(entity, material, 0.34, 0.18, 1.8, 1));
  }

  private showArcaneNova(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#7be7ff');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.8, opacity: 0.5, additive: true, unlit: true });
    const entity = this.world.createPrimitive('arcane-nova', 'torus', material, { x: position.x, y: position.y + 0.08, z: position.z }, { x: 0.8, y: 0.04, z: 0.8 });
    this.effects.push(new PulseEffect(entity, material, 0.58, 0.6, radius * 2, 0.035));
  }

  private showBossSlamWarning(position: Vec3Like, radius: number, delay: number): void {
    const color = colorFromCss('#ff5b4f');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.2, opacity: 0.38, additive: true, unlit: true });
    const entity = this.world.createPrimitive('boss-slam-warning', 'torus', material, { x: position.x, y: position.y + 0.06, z: position.z }, { x: radius * 2, y: 0.035, z: radius * 2 });
    this.effects.push(new PulseEffect(entity, material, Math.max(0.2, delay), radius * 1.8, radius * 2.08, 0.035));
  }

  private showBossSlamImpact(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#ff8a52');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.5, opacity: 0.5, additive: true, unlit: true });
    const entity = this.world.createPrimitive('boss-slam-impact', 'sphere', material, { x: position.x, y: position.y + 0.3, z: position.z }, { x: 1, y: 0.1, z: 1 });
    this.effects.push(new PulseEffect(entity, material, 0.46, 0.8, radius * 2, 0.08));
    this.world.rig.addShake(0.72);
    this.showHitImpact(position, 'physical');
  }

  private updateDamageTexts(dt: number): void {
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      if (!this.damageTexts[i].update(dt, this.world)) continue;
      this.damageTexts.splice(i, 1);
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i].update(dt)) continue;
      this.effects.splice(i, 1);
    }
  }

  private updateOverlays(): void {
    for (const view of this.views.values()) {
      if (view.healthBar) {
        const p = entityPosition(view.entity);
        view.healthBar.setWorldPosition(p.x, p.y + ENEMY_HEALTH_BAR_HEIGHT * view.entity.getLocalScale().x, p.z);
        view.healthBar.update(this.world, view.entity.enabled);
      }
    }
    for (const view of this.lootViews.values()) view.label.update(this.world);
  }

  private findCloseEnemy(): string | null {
    const player = this.views.get(this.net.playerId);
    if (!player) return null;
    const playerPos = entityPosition(player.entity);
    let id: string | null = null;
    let best = CLOSE_TARGET_RADIUS;
    for (const entity of this.latestEntities.values()) {
      if (entity.kind !== 'enemy' || !entity.alive) continue;
      const distance = Math.hypot(entity.position.x - playerPos.x, entity.position.z - playerPos.z);
      if (distance < best) {
        best = distance;
        id = entity.id;
      }
    }
    return id;
  }

  private findLootNear(point: Vec3Like): string | null {
    let id: string | null = null;
    let best = LOOT_CLICK_RADIUS;
    for (const [lootId, view] of this.lootViews) {
      const p = entityPosition(view.entity);
      const distance = Math.hypot(p.x - point.x, p.z - point.z);
      if (distance < best) {
        best = distance;
        id = lootId;
      }
    }
    return id;
  }

  private selectedEnemy(entities: readonly EntityState[]): EntityState | undefined {
    if (!this.selectedEnemyId) return undefined;
    const enemy = entities.find((entity) => entity.id === this.selectedEnemyId && entity.kind === 'enemy' && entity.alive);
    if (!enemy) this.setSelectedEnemy(null);
    return enemy;
  }

  private setSelectedEnemy(id: string | null): void {
    if (id === this.selectedEnemyId) return;
    this.selectedEnemyId = id;
    this.hudDirty = true;
  }

  private isKeyboardMovementActive(): boolean {
    const axes = this.input.getMoveAxes();
    return axes.strafe !== 0 || axes.forward !== 0;
  }

  private updateCameraAndMarker(dt: number): void {
    const player = this.views.get(this.net.playerId);
    if (player) {
      const p = entityPosition(player.entity);
      this.world.rig.setTarget(p.x, p.y, p.z);
      this.world.updateSun(p.x, p.y, p.z);
    }
    this.world.rig.rotate(this.input.rotateDir, dt);
    this.world.rig.update(dt);

    if (this.markerTimer > 0) {
      this.markerTimer -= dt;
      const t = Math.max(this.markerTimer / MARKER_DURATION, 0);
      this.targetMarker.enabled = true;
      const scale = 0.58 * (1 + (1 - t) * 0.8);
      this.targetMarker.setLocalScale(scale, 0.025, scale);
    } else {
      this.targetMarker.enabled = false;
    }
  }

  private showMarker(x: number, y: number, z: number): void {
    this.targetMarker.setLocalPosition(x, y + 0.05, z);
    this.markerTimer = MARKER_DURATION;
  }

  private syncZone(zone: WorldZone): void {
    if (zone === this.zone) return;
    this.zone = zone;
    this.world.setZone(zone);
  }

  private readRenderQualityMode(): RenderQualityMode {
    try {
      const value = window.localStorage.getItem(RENDER_QUALITY_STORAGE_KEY);
      return this.isRenderQualityMode(value) ? value : 'auto';
    } catch {
      return 'auto';
    }
  }

  private isRenderQualityMode(value: unknown): value is RenderQualityMode {
    return typeof value === 'string' && (RENDER_QUALITY_MODES as readonly string[]).includes(value);
  }

  private cycleRenderQualityMode(): void {
    const index = RENDER_QUALITY_MODES.indexOf(this.renderQualityMode);
    this.renderQualityMode = RENDER_QUALITY_MODES[(index + 1) % RENDER_QUALITY_MODES.length];
    try {
      window.localStorage.setItem(RENDER_QUALITY_STORAGE_KEY, this.renderQualityMode);
    } catch {
      // Preferencia opcional.
    }
    this.applyRenderQuality();
  }

  private effectiveRenderQualityLevel(): RenderQualityLevel {
    return this.renderQualityMode === 'auto' ? this.autoQualityLevel : this.renderQualityMode;
  }

  private applyRenderQuality(): void {
    const level = this.effectiveRenderQualityLevel();
    this.world.setRenderQuality(RENDER_QUALITY_PRESETS[level]);
    this.hud.setRenderQuality(this.renderQualityMode, level);
  }

  private resize(): void {
    this.world.resize(window.innerWidth, window.innerHeight);
  }
}
