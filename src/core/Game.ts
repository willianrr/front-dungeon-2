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
  EquipmentState,
  EquippedWeaponVisualState,
  InventoryItem,
  ItemRarity,
  LootState,
  QuestState,
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
  /** Contorno fino aditivo com o formato da arma (shell interno). */
  weaponGlow?: pc.Entity;
  weaponGlowMaterial?: pc.StandardMaterial;
  /** Halo largo e suave em volta da arma (shell externo, niveis 7+). */
  weaponAura?: pc.Entity;
  weaponAuraMaterial?: pc.StandardMaterial;
  weaponLight?: pc.Entity;
  weaponAnchor?: pc.Entity;
  weaponAttachedToBone?: boolean;
  weaponGlowLength?: number;
  /** Efeito de fogo da arma (client-side, so quando element === 'fire'). */
  weaponFire?: pc.Entity;
  /** Todos os sistemas de particulas do glow (sparkles/plasma/feixes/fogo). */
  weaponFx?: pc.Entity[];
  /** Config do estagio Mu 99B derivada do nivel/raridade (dirige o pulso). */
  weaponStage?: WeaponGlowStage;
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

// Predicao local do click-to-move (espelha walkSpeed/runSpeed e o stopDistance
// de sim/entity.go + movement.go do backend). O heroi anda NA HORA em direcao ao
// ponto clicado, como ja acontece com o teclado; o servidor segue autoritativo e
// as correcoes usam as mesmas margens da predicao de teclado.
const CLICK_MOVE_WALK_SPEED = 4.2;
const CLICK_MOVE_RUN_SPEED = 7.8;
const CLICK_MOVE_STOP_DISTANCE = 0.35;
// Carencia (s) antes de aceitar um 'idle' do servidor como fim do trajeto — cobre
// o RTT do comando; sem isso o snapshot antigo (ainda idle) cancelaria o clique.
const CLICK_MOVE_SERVER_IDLE_GRACE = 0.6;
// Raio para interagir com loot/bau ao chegar (MENOR que o do servidor — 3.1 do
// collectLoot e 4.0 do openChest — para a predicao nunca disparar cedo demais).
const LOOT_INTERACT_RANGE = 2.6;
const CHEST_INTERACT_RANGE = 3.4;
// Espacamento minimo entre comandos 'move' (coalescing): spam de clique vira no
// maximo ~11 pacotes/s, sempre enviando o alvo MAIS RECENTE (trailing send).
const MOVE_COMMAND_MIN_INTERVAL = 0.09;

const MARKER_DURATION = 0.6;
const CLOSE_TARGET_RADIUS = 3.4;
// Cone (meia-abertura 60 graus) NA DIRECAO DO CLIQUE para converter clique de
// chao em ataque. Clicar atras do personagem = recuo, NUNCA vira ataque.
const CLOSE_ATTACK_CONE_COS = Math.cos(Math.PI / 3);
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
// Quantidade de decoracao do pacote nature (grama/flores/arbustos) por preset.
// Definida no boot (preload); trocar o preset depois nao re-espalha a decoracao.
// Valores altos sao viaveis porque a decoracao usa batching estatico (as malhas
// sao fundidas por material em poucos draw calls).
const NATURE_DECOR_COUNTS: Record<RenderQualityLevel, number> = {
  high: 1000,
  medium: 550,
  low: 220,
};

// Bloom + MSAA entram na alta/media (e o que faz o glow da arma "estourar" como
// nos renders do Mu Online); a baixa desliga o pos-processamento inteiro.
const RENDER_QUALITY_PRESETS: Record<RenderQualityLevel, RenderQualityPreset> = {
  high: { bloom: true, bloomStrength: 0.04, samples: 4, pixelRatioCap: 1, shadows: true, shadowMapSize: 2048 },
  medium: { bloom: true, bloomStrength: 0.028, samples: 1, pixelRatioCap: 0.85, shadows: true, shadowMapSize: 1024 },
  low: { bloom: false, bloomStrength: 0, samples: 1, pixelRatioCap: 0.65, shadows: false, shadowMapSize: 512 },
};

/**
 * Preview do glow via URL, so para o heroi local (teste visual rapido):
 *   `?weaponGlow`         -> espada +15
 *   `?weaponGlow=8`       -> espada +8 (qualquer nivel 0..15)
 *   `?weaponGlow=11,fire` -> espada +11 com elemento fogo
 */
function weaponGlowPreviewFromUrl(): EquippedWeaponVisualState | null {
  const raw = new URLSearchParams(window.location.search).get('weaponGlow');
  if (raw === null) return null;
  const parts = raw.split(',').map((part) => part.trim().toLowerCase());
  const level = Number.parseInt(parts[0] ?? '', 10);
  return {
    kind: 'sword',
    rarity: 'lendario',
    upgradeLevel: Number.isFinite(level) ? Math.max(0, Math.min(15, level)) : 15,
    glowGem: 'soul',
    element: parts.includes('fire') ? 'fire' : undefined,
  };
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
// O servidor alterna attack -> idle (curto) -> attack entre golpes (actionTimer
// expira a ~90% do cooldown). A mira local segura o yaw por esta janela para o
// heroi NAO virar para o rotationY do servidor entre um golpe e outro.
const ATTACK_AIM_HOLD_SECONDS = 1.2;

// ---------------------------------------------------------------------------
// Glow estilo Mu Online 99B, dirigido pelo NIVEL da arma (+0..+15) como no
// classico — a gema aplicada NAO muda a cor. Rampa: prata -> rosa -> vermelho
// -> plasma -> fogo dourado, com camadas que vao ligando por estagio:
//   +1..+2   reflexo metalico sutil na lamina
//   +3..+4   lamina tingida de vermelho + contorno fino
//   +5..+7   brilho forte + estrelas cintilantes (sparkles)
//   +8..+10  aura de plasma envolvendo a lamina + feixes verticais de luz
//   +11..+15 nucleo branco-quente, halo largo e sparkles dourados densos
// ---------------------------------------------------------------------------

/** Cor por nivel (indice = nivel). Interpolada para niveis intermediarios. */
const MU_GLOW_RAMP = [
  '#aeb9c8', '#cdd9e8', '#f4c6c4', '#ff9184', '#ff6250', '#ff4a34', '#ff3d24',
  '#ff3626', '#ff3050', '#ff2e5e', '#ff5230', '#ff7526', '#ff8c30', '#ffa440',
  '#ffbe54', '#ffd66b',
] as const;

interface WeaponGlowStage {
  /** Cor principal do estagio (rampa Mu). */
  color: pc.Color;
  /** Emissivo da propria lamina (clareia para branco-quente nos niveis altos). */
  coreColor: pc.Color;
  /** Intensidade geral 0..1 — dirige pulso, luz e escala dos efeitos. */
  factor: number;
  /** Forca do emissivo somado ao material da arma. */
  boost: number;
  shellOpacity: number;
  auraOpacity: number;
  auraScale: number;
  /** Estrelas por segundo (0 = sem sparkles). */
  sparkleRate: number;
  /** 0..1 quanto os sparkles puxam para dourado (niveis 10+). */
  sparkleGold: number;
  /** Particulas da aura de plasma (0 = sem plasma). */
  wispCount: number;
  /** Feixes verticais por segundo (0 = sem feixes). */
  streakRate: number;
  lightIntensity: number;
  lightRange: number;
}

function mixColor(a: pc.Color, b: pc.Color, t: number): pc.Color {
  return new pc.Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function sampleGlowRamp(level: number): pc.Color {
  const t = Math.max(0, Math.min(MU_GLOW_RAMP.length - 1, level));
  const lo = Math.floor(t);
  const hi = Math.min(MU_GLOW_RAMP.length - 1, lo + 1);
  return mixColor(colorFromCss(MU_GLOW_RAMP[lo]), colorFromCss(MU_GLOW_RAMP[hi]), t - lo);
}

function weaponGlowStageFor(
  level: number,
  rarity: ItemRarity | undefined,
  element: WeaponElement | undefined,
): WeaponGlowStage | null {
  const isFire = element === 'fire';
  const lv = Math.max(0, Math.min(15, Math.floor(level)));
  if (lv <= 0 && !isFire) return null;
  // Arma de fogo brilha como um estagio medio mesmo em nivel baixo (paridade
  // com o antigo elementFactor, que garantia um brilho-base visivel).
  const ilv = isFire ? Math.max(lv, 6) : lv;
  const p = ilv / 15;
  const rarityScale = rarity ? RARITY_GLOW_SCALE[rarity] : 1;
  const rarityMul = 0.86 + (rarityScale - 0.92) * 0.45;

  let color = sampleGlowRamp(ilv);
  if (isFire) color = mixColor(color, colorFromCss(WEAPON_FIRE_COLOR), 0.45);
  const whiteHot = ilv >= 11 ? ((ilv - 11) / 4) * 0.55 : 0;
  const coreColor = mixColor(color, new pc.Color(1, 0.97, 0.9), 0.2 + whiteHot);

  return {
    color,
    coreColor,
    factor: clamp01(Math.pow(p, 1.15) * rarityMul),
    boost: 0.12 + Math.pow(p, 1.45) * 1.05 * rarityMul,
    shellOpacity: ilv >= 3 || isFire ? 0.1 + 0.4 * Math.pow(p, 1.2) : 0,
    auraOpacity: ilv >= 7 ? 0.05 + 0.17 * clamp01((ilv - 7) / 8) : 0,
    auraScale: 1.05 + 0.055 * clamp01((ilv - 7) / 8),
    sparkleRate: ilv >= 5 ? 2 + (ilv - 5) * 1.1 : 0,
    sparkleGold: ilv >= 10 ? clamp01((ilv - 10) / 5) : 0,
    wispCount: ilv >= 8 ? 8 + (ilv - 8) : 0,
    streakRate: ilv >= 8 ? 1.2 + (ilv - 8) * 0.5 : 0,
    lightIntensity: (isFire ? 0.5 : 0.22) + Math.pow(p, 1.35) * (isFire ? 2.3 : 2.0),
    lightRange: 2.2 + 2.2 * p,
  };
}

// Texturas procedurais dos VFX (estrela, brilho suave, feixe), geradas uma vez
// via canvas 2D — nenhum asset novo no bundle. Sao brancas de proposito: a cor
// final vem do colorGraph de cada sistema de particulas.

/** Lobulo radial esticado; base de todos os desenhos (estrela/brilho/feixe). */
function paintFlareLobe(ctx: CanvasRenderingContext2D, size: number, scaleX: number, scaleY: number, alpha: number): void {
  const half = size / 2;
  ctx.save();
  ctx.translate(half, half);
  ctx.scale(Math.max(scaleX, 0.0001), Math.max(scaleY, 0.0001));
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, half - 1);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.45})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(-half / scaleX, -half / scaleY, size / scaleX, size / scaleY);
  ctx.restore();
}

/** Estrela de 4 pontas (o "spark" classico dos renders do Mu). */
function paintSparkle(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.globalCompositeOperation = 'lighter';
  paintFlareLobe(ctx, size, 1, 0.16, 1);
  paintFlareLobe(ctx, size, 0.16, 1, 1);
  paintFlareLobe(ctx, size, 0.45, 0.45, 0.9);
}

/** Circulo suave (plasma/fumaca luminosa). */
function paintSoftGlow(ctx: CanvasRenderingContext2D, size: number): void {
  paintFlareLobe(ctx, size, 1, 1, 0.85);
}

/** Feixe vertical de luz. */
function paintStreak(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.globalCompositeOperation = 'lighter';
  paintFlareLobe(ctx, size, 0.14, 1, 0.95);
}

function createFxTexture(
  app: pc.Application,
  name: string,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): pc.Texture | null {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  paint(ctx, size);
  const texture = new pc.Texture(app.graphicsDevice, {
    name,
    width: size,
    height: size,
    // SRGBA8: cores de canvas 2D sao sRGB; sem isso o engine avisa e o blend
    // aditivo das particulas sai levemente errado.
    format: pc.PIXELFORMAT_SRGBA8,
    mipmaps: true,
    minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });
  texture.setSource(canvas);
  return texture;
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
  private readonly weaponGlowPreview = weaponGlowPreviewFromUrl();
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
  /** Texturas procedurais do glow Mu (estrela/brilho/feixe), criadas sob demanda. */
  private weaponSparkleTexture: pc.Texture | null = null;
  private weaponSoftTexture: pc.Texture | null = null;
  private weaponStreakTexture: pc.Texture | null = null;
  /** Ultimo alvo/direcao de ataque, usado para mirar o heroi no inimigo. */
  private lastAttackAimPoint: Vec3Like | null = null;
  /**
   * Alvo do click-to-move para PREDICAO local (espelha o comando enviado).
   * Enquanto ativo, o heroi anda client-side ate o ponto, igual ao teclado —
   * mesmo que os snapshots atrasem, ele nunca fica "andando parado".
   */
  private clickMoveTarget: { x: number; z: number; run: boolean; sentAt: number } | null = null;
  /** Ate quando (elapsed) a mira local e dona do yaw — cobre o vao entre golpes. */
  private localAimHoldUntil = 0;
  /** Interacao adiada (clique distante em loot/bau): anda ate la e executa. */
  private pendingInteraction: { kind: 'loot' | 'chest'; id: string; x: number; y: number; z: number; range: number } | null = null;
  /** Coalescing de comandos 'move' (ultimo alvo vence; ver MOVE_COMMAND_MIN_INTERVAL). */
  private lastMoveCommandAt = -Infinity;
  private queuedMoveCommand: { target: Vec3Like; run: boolean } | null = null;
  /** Cache do inventario: o servidor manda `null` quando nao muda (delta). */
  private cachedInventory: InventoryItem[] = [];
  /**
   * Caches de quest e equipamento — mesmo padrao de delta do inventario.
   * Defaults SEGUROS (nunca null): o 1o snapshot completo pode ser substituido
   * no buffer por um delta durante o preload dos assets; o HUD nao pode quebrar
   * nesse vao (o reenvio periodico de ~2s preenche os dados reais).
   */
  private cachedQuest: QuestState = { title: '', objective: '', progress: 0, goal: 0, completed: false };
  private cachedEquipment: EquipmentState = {
    head: null, chest: null, hands: null, legs: null, feet: null, weapon: null, offhand: null, trinket: null,
  };
  private cachedEquippedWeapon: EquippedWeaponVisualState | null = null;

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
      // Mundo com o pacote de natureza (Quaternius): quantidade de decoracao
      // (grama/flores/arbustos, sem colisao) escala com o preset de qualidade.
      this.world.preloadEnvironment(NATURE_DECOR_COUNTS[this.effectiveRenderQualityLevel()]),
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

    // Quest e equipamento com DELTA (null = nao mudou), mesmo padrao acima.
    // Equipment e equippedWeapon viajam juntos sob o mesmo rev no servidor:
    // `equipment != null` e o gate para atualizar o cache dos dois.
    const incomingQuest = snapshot.quest as QuestState | null | undefined;
    if (incomingQuest != null) this.cachedQuest = incomingQuest;
    snapshot.quest = this.cachedQuest;
    const incomingEquipment = snapshot.equipment as EquipmentState | null | undefined;
    if (incomingEquipment != null) {
      this.cachedEquipment = incomingEquipment;
      this.cachedEquippedWeapon = snapshot.equippedWeapon ?? null;
    }
    snapshot.equipment = this.cachedEquipment;
    snapshot.equippedWeapon = this.cachedEquippedWeapon;

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
    this.flushQueuedMoveCommand();
    this.updatePendingInteraction();
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
    // O teclado assumiu o controle do movimento: trajeto de clique e interacao
    // pendente morrem aqui.
    this.clickMoveTarget = null;
    this.pendingInteraction = null;
    this.sendMoveCommand(decision.target, decision.run);
  }

  private applyLocalPlayerMovement(dt: number): void {
    this.localPlayerMoving = false;
    this.localPlayerRunning = false;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (!view || (state && !state.alive)) {
      this.clickMoveTarget = null;
      this.pendingInteraction = null;
      return;
    }

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
    if (prediction) {
      setEntityPosition(view.entity, prediction.position);
      setYaw(view.entity, prediction.rotationY);
      this.localPlayerMoving = true;
      this.localPlayerRunning = prediction.running;
      return;
    }

    this.applyClickMovePrediction(view, state, dt);
  }

  /**
   * Predicao local do click-to-move: anda em linha reta ate o ponto clicado na
   * mesma velocidade do servidor, ajustando a altura pelo terreno. Igual ao
   * teclado, o servidor continua autoritativo: as correcoes do reconcile (rate
   * suave, ignore curto, snap longo) puxam para a rota real (ex.: desvios do
   * pathfinding). Sem isso, o heroi dependia 100% dos snapshots e ficava
   * "andando parado" quando eles atrasavam.
   */
  private applyClickMovePrediction(view: View, state: EntityState | undefined, dt: number): void {
    const target = this.clickMoveTarget;
    if (!target) return;
    if (state?.jumping) return;

    const p = entityPosition(view.entity);
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= CLICK_MOVE_STOP_DISTANCE) {
      this.clickMoveTarget = null;
      return;
    }

    const speed = target.run ? CLICK_MOVE_RUN_SPEED : CLICK_MOVE_WALK_SPEED;
    const step = Math.min(speed * Math.min(Math.max(dt, 0), 0.05), distance - CLICK_MOVE_STOP_DISTANCE * 0.5);
    const nx = Math.max(-this.terrain.half, Math.min(this.terrain.half, p.x + (dx / distance) * step));
    const nz = Math.max(-this.terrain.half, Math.min(this.terrain.half, p.z + (dz / distance) * step));
    const ny = this.zone === 'dungeon' ? this.terrain.heightAt(0, 0) : this.terrain.heightAt(nx, nz);
    setEntityPosition(view.entity, { x: nx, y: ny, z: nz });
    setYaw(view.entity, Math.atan2(dx, dz));
    this.localPlayerMoving = true;
    this.localPlayerRunning = !!target.run;
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
    if (!view || !state || !state.alive) return;
    // Mira ativa durante o attack E na janela de retencao (idle curto entre
    // golpes) — sem a janela, o heroi virava para o rotationY velho do servidor
    // entre um golpe e outro e parecia atacar "de lado".
    if (state.action !== 'attack' && this.elapsed >= this.localAimHoldUntil) return;
    if (this.isKeyboardMovementActive()) return;
    if (this.clickMoveTarget) return;

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

  /**
   * Envia 'move' com coalescing: garante espacamento minimo entre pacotes e, se
   * o jogador spammar clique, guarda apenas o alvo MAIS RECENTE para enviar
   * quando a janela abrir (trailing). Reduz trafego sem perder responsividade —
   * a predicao local ja faz o heroi reagir no mesmo frame.
   */
  private sendMoveCommand(target: Vec3Like, run: boolean): void {
    if (this.elapsed - this.lastMoveCommandAt >= MOVE_COMMAND_MIN_INTERVAL) {
      this.lastMoveCommandAt = this.elapsed;
      this.queuedMoveCommand = null;
      this.net.send({ type: 'move', entityId: this.net.playerId, target, run });
      return;
    }
    this.queuedMoveCommand = { target, run };
  }

  private flushQueuedMoveCommand(): void {
    if (!this.queuedMoveCommand) return;
    if (this.elapsed - this.lastMoveCommandAt < MOVE_COMMAND_MIN_INTERVAL) return;
    // Durante o pulo o servidor descarta 'move'; espera aterrissar para nao perder o alvo.
    if (this.latestEntities.get(this.net.playerId)?.jumping) return;
    this.lastMoveCommandAt = this.elapsed;
    const { target, run } = this.queuedMoveCommand;
    this.queuedMoveCommand = null;
    this.net.send({ type: 'move', entityId: this.net.playerId, target, run });
  }

  /** Anda ate um loot/bau distante e executa a interacao ao entrar no raio. */
  private beginPendingInteraction(interaction: NonNullable<Game['pendingInteraction']>): void {
    this.pendingInteraction = interaction;
    this.setSelectedEnemy(null);
    this.localAimHoldUntil = 0;
    this.clickMoveTarget = { x: interaction.x, z: interaction.z, run: this.input.running, sentAt: this.elapsed };
    this.sendMoveCommand({ x: interaction.x, y: 0, z: interaction.z }, this.input.running);
    this.showMarker(interaction.x, interaction.y, interaction.z);
  }

  /** Executa a interacao pendente quando o heroi chega perto do alvo. */
  private updatePendingInteraction(): void {
    const pending = this.pendingInteraction;
    if (!pending) return;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (!view || (state && !state.alive)) {
      this.pendingInteraction = null;
      return;
    }
    // Alvo sumiu (loot coletado por outro / bau aberto)? Cancela em silencio.
    if (pending.kind === 'loot' && !this.lootViews.has(pending.id)) {
      this.pendingInteraction = null;
      return;
    }
    if (pending.kind === 'chest') {
      const chest = this.chestViews.get(pending.id);
      if (!chest || chest.opened) {
        this.pendingInteraction = null;
        return;
      }
    }
    const p = entityPosition(view.entity);
    if (Math.hypot(pending.x - p.x, pending.z - p.z) > pending.range) return;
    this.pendingInteraction = null;
    if (pending.kind === 'loot') {
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: pending.id });
    } else {
      this.sfx.play('chest');
      this.net.send({ type: 'open-chest', entityId: this.net.playerId, chestId: pending.id });
    }
  }

  /** Distancia XZ do heroi local a um ponto (Infinity sem view). */
  private localPlayerDistanceTo(x: number, z: number): number {
    const view = this.views.get(this.net.playerId);
    if (!view) return Infinity;
    const p = entityPosition(view.entity);
    return Math.hypot(x - p.x, z - p.z);
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
      this.clickMoveTarget = null;
      this.pendingInteraction = null;
      this.queuedMoveCommand = null;
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
      const [id, chestView] = chestPick;
      this.setSelectedEnemy(null);
      const chestPos = entityPosition(chestView.entity);
      // Longe do bau: anda ate ele e abre ao chegar (o servidor ignora alem de 4.0).
      if (this.localPlayerDistanceTo(chestPos.x, chestPos.z) > CHEST_INTERACT_RANGE) {
        this.beginPendingInteraction({ kind: 'chest', id, x: chestPos.x, y: chestPos.y, z: chestPos.z, range: CHEST_INTERACT_RANGE });
        return;
      }
      this.pendingInteraction = null;
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
      const [id, lootView] = lootPick;
      this.setSelectedEnemy(null);
      const lootPos = entityPosition(lootView.entity);
      // Longe do item: anda ate ele e coleta ao chegar (o servidor ignora alem de 3.1).
      if (this.localPlayerDistanceTo(lootPos.x, lootPos.z) > LOOT_INTERACT_RANGE) {
        this.beginPendingInteraction({ kind: 'loot', id, x: lootPos.x, y: lootPos.y, z: lootPos.z, range: LOOT_INTERACT_RANGE });
        return;
      }
      this.pendingInteraction = null;
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
      this.clickMoveTarget = null;
      this.pendingInteraction = null;
      this.queuedMoveCommand = null;
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
      const lootView = this.lootViews.get(closeLoot);
      const lootPos = lootView ? entityPosition(lootView.entity) : ground.point;
      if (this.localPlayerDistanceTo(lootPos.x, lootPos.z) > LOOT_INTERACT_RANGE) {
        this.beginPendingInteraction({ kind: 'loot', id: closeLoot, x: lootPos.x, y: lootPos.y, z: lootPos.z, range: LOOT_INTERACT_RANGE });
        return;
      }
      this.pendingInteraction = null;
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: closeLoot });
      return;
    }
    const closeTarget = this.findCloseEnemyToward(ground.point);
    const player = this.views.get(this.net.playerId)?.entity;
    const playerPos = player ? entityPosition(player) : undefined;
    if (closeTarget && playerPos && Math.hypot(ground.point.x - playerPos.x, ground.point.z - playerPos.z) <= CLOSE_CLICK_RADIUS) {
      this.setSelectedEnemy(closeTarget);
      this.clickMoveTarget = null;
      this.pendingInteraction = null;
      this.queuedMoveCommand = null;
      const targetPos = this.latestEntities.get(closeTarget)?.position ?? ground.point;
      this.lastAttackAimPoint = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
      this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: closeTarget });
      return;
    }

    this.setSelectedEnemy(null);
    this.localAimHoldUntil = 0;
    this.pendingInteraction = null;
    // Predicao local: o heroi comeca a andar JA NESTE frame; o servidor confirma
    // e corrige pelo reconcile (mesmas margens da predicao de teclado).
    this.clickMoveTarget = { x: ground.point.x, z: ground.point.z, run: this.input.running, sentAt: this.elapsed };
    this.sendMoveCommand({ x: ground.point.x, y: 0, z: ground.point.z }, this.input.running);
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
      // Enquanto o servidor reporta attack, renova a janela em que a MIRA LOCAL
      // e dona do yaw (cobre o idle curto entre golpes; ver ATTACK_AIM_HOLD_SECONDS).
      // Andar/correr (inclusive a perseguicao ate o alvo) encerra a janela: nesses
      // estados o rotationY do servidor ja aponta certo e deve mandar no yaw.
      if (isLocalPlayer && e.alive && e.action === 'attack') {
        this.localAimHoldUntil = this.elapsed + ATTACK_AIM_HOLD_SECONDS;
      } else if (isLocalPlayer && (e.action === 'walk' || e.action === 'run')) {
        this.localAimHoldUntil = 0;
      }
      // Fim do trajeto de clique pelo lado autoritativo: se o servidor ja esta
      // idle/dead depois da carencia de RTT, ele chegou (ou o anti-stuck parou) —
      // encerra a predicao e deixa a correcao normal convergir para a posicao real.
      if (isLocalPlayer && snapshotChanged && this.clickMoveTarget
        && (e.action === 'idle' || e.action === 'dead' || !e.alive)
        && this.elapsed - this.clickMoveTarget.sentAt > CLICK_MOVE_SERVER_IDLE_GRACE) {
        this.clickMoveTarget = null;
      }
      if (!view.initialized || dt === 0) {
        setEntityPosition(view.entity, e.position);
        setYaw(view.entity, e.rotationY);
        view.initialized = true;
      } else if (isLocalPlayer && !snapshotChanged) {
        // A previsao local do frame anterior continua valendo ate chegar snapshot novo.
      } else {
        const current = entityPosition(view.entity);
        const correctionDistance = Math.hypot(e.position.x - current.x, e.position.y - current.y, e.position.z - current.z);
        // Predicao local ativa (teclado OU click-to-move): correcoes suaves, com
        // zona morta curta para nao "tremer" e snap quando divergir demais.
        const localPredictionActive = isLocalPlayer && (this.isKeyboardMovementActive() || this.clickMoveTarget != null);
        const rate = localPredictionActive ? LOCAL_PLAYER_CORRECTION_RATE : REMOTE_RECONCILE_RATE;
        const alpha = 1 - Math.exp(-rate * dt);
        if (isLocalPlayer && correctionDistance > LOCAL_PLAYER_SNAP_CORRECTION_DISTANCE) {
          setEntityPosition(view.entity, e.position);
        } else if (localPredictionActive && correctionDistance <= LOCAL_PLAYER_IGNORE_CORRECTION_DISTANCE) {
          // Mantem a pose prevista para evitar tremidinha.
        } else {
          lerpEntityPosition(view.entity, e.position, alpha);
        }
        // Yaw do servidor NAO se aplica ao player local quando: (1) predicao de
        // movimento ativa (a predicao dita a direcao) ou (2) em engajamento de
        // ataque (inclui o idle curto entre golpes) — quem gira e o
        // aimLocalPlayerDuringAttack, senao os dois brigam e o heroi ataca "de lado".
        const localAimOwnsYaw = isLocalPlayer && e.alive
          && (e.action === 'attack' || this.elapsed < this.localAimHoldUntil);
        if (!localPredictionActive && !localAimOwnsYaw) {
          // Anti-moonwalk: para entidades REMOTAS andando/correndo, o heading vem
          // do DESLOCAMENTO REAL na tela (para onde o corpo foi neste frame), nao
          // do rotationY do snapshot — rotacao velha/latente nunca mais deixa o
          // personagem andar de costas. Parado/atacando, vale o yaw do servidor.
          let targetYaw = e.rotationY;
          if (!isLocalPlayer && e.alive && (e.action === 'walk' || e.action === 'run')) {
            const after = entityPosition(view.entity);
            const movedX = after.x - current.x;
            const movedZ = after.z - current.z;
            const moved = Math.hypot(movedX, movedZ);
            if (moved > Math.max(0.6 * dt, 0.004)) targetYaw = Math.atan2(movedX, movedZ);
          }
          const delta = Math.atan2(Math.sin(targetYaw - entityYaw(view.entity)), Math.cos(targetYaw - entityYaw(view.entity)));
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
    view.weaponAuraMaterial?.destroy();
    view.weaponAuraMaterial = undefined;
    for (const material of view.weaponBoostMaterials ?? []) material.destroy();
    view.weaponBoostMaterials = undefined;
    clearChildren(view.visual);
    view.weapon = undefined;
    view.weaponGlow = undefined;
    view.weaponAura = undefined;
    view.weaponLight = undefined;
    view.weaponFire = undefined;
    view.weaponFx = undefined;
    view.weaponStage = undefined;
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

    const stage = view.weaponStage;
    if (view.weaponGlowMaterial && stage) {
      // Pulso do contorno: respiracao rapida escalada pelo estagio do nivel.
      const pulse = 0.85 + Math.sin(time * 5.4) * 0.15 + (attacking ? 0.18 : 0);
      view.weaponGlowMaterial.opacity = Math.min(0.85, stage.shellOpacity * pulse);
      view.weaponGlowMaterial.emissiveIntensity = (0.7 + stage.factor * 1.6) * (0.82 + pulse * 0.28);
      view.weaponGlowMaterial.update();
    }
    if (view.weaponAuraMaterial && stage) {
      // Halo externo respira mais devagar e em contrafase — energia "viva".
      const breathe = 0.9 + Math.sin(time * 3.2 + 1.9) * 0.24 + (attacking ? 0.2 : 0);
      view.weaponAuraMaterial.opacity = Math.min(0.6, stage.auraOpacity * breathe);
      view.weaponAuraMaterial.update();
    }
    if (view.weaponLight?.light && stage) {
      const isFire = view.weaponFire != null;
      const flicker = 0.8 + Math.max(0, Math.sin(time * (isFire ? 13 : 9.5))) * 0.3;
      view.weaponLight.light.intensity = stage.lightIntensity * flicker + (attacking ? 0.35 : 0);
    }

    // Luz e particulas vivem no view.visual (escala 1) para ficarem CONTIDAS — sob
    // o osso (escala ~0.01) o range/tamanho estouravam. Aqui sincronizamos a
    // POSICAO DE MUNDO delas com o centro da lamina, entao os efeitos seguem a
    // arma como um buff, sem herdar a escala do osso.
    if (view.weaponAnchor && (view.weaponLight || view.weaponFx?.length)) {
      // Centro da lamina = punho (posicao do anchor) + direcao da lamina
      // (anchor.up) * distancia. Os emissores seguem a rotacao do anchor (+Y ao
      // longo da lamina), para os efeitos cobrirem a espada inteira.
      const anchor = view.weaponAnchor;
      const hand = anchor.getPosition();
      const dir = anchor.up;
      const cx = hand.x + dir.x * WEAPON_BLADE_CENTER;
      const cy = hand.y + dir.y * WEAPON_BLADE_CENTER;
      const cz = hand.z + dir.z * WEAPON_BLADE_CENTER;
      view.weaponLight?.setPosition(cx, cy, cz);
      const rotation = anchor.getRotation();
      for (const fx of view.weaponFx ?? []) {
        fx.setPosition(cx, cy, cz);
        fx.setRotation(rotation);
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

  /** Garante as texturas procedurais dos VFX do glow (criadas uma unica vez). */
  private ensureWeaponFxTextures(): void {
    if (!this.weaponSparkleTexture) this.weaponSparkleTexture = createFxTexture(this.world.app, 'weapon-sparkle', paintSparkle);
    if (!this.weaponSoftTexture) this.weaponSoftTexture = createFxTexture(this.world.app, 'weapon-soft-glow', paintSoftGlow);
    if (!this.weaponStreakTexture) this.weaponStreakTexture = createFxTexture(this.world.app, 'weapon-streak', paintStreak);
  }

  /**
   * Estrelas cintilantes (o "spark" classico do Mu): pontos em forma de estrela
   * de 4 pontas que piscam ao longo da lamina. Nos niveis 10+ puxam pro dourado.
   */
  private createWeaponSparkles(parent: pc.Entity, stage: WeaponGlowStage): pc.Entity | null {
    if (!this.weaponSparkleTexture || stage.sparkleRate <= 0) return null;
    const sparkles = makeEntity('weapon-sparkles', this.world.app);
    const tip = mixColor(stage.color, new pc.Color(1, 0.86, 0.55), stage.sparkleGold);
    const colorGraph = new pc.CurveSet([
      [0, 1, 1, tip.r],
      [0, 1, 1, tip.g],
      [0, 0.95, 1, tip.b],
    ]);
    const alphaGraph = new pc.Curve([0, 0, 0.15, 1, 0.55, 0.85, 1, 0]);
    const scaleGraph = new pc.Curve([0, 0.015, 0.3, 0.085 + stage.factor * 0.05, 1, 0.01]);
    sparkles.addComponent('particlesystem', {
      numParticles: Math.min(14, 4 + Math.ceil(stage.sparkleRate * 0.6)),
      lifetime: 0.5,
      rate: 1 / stage.sparkleRate,
      rate2: 1.6 / stage.sparkleRate,
      startAngle: 0,
      startAngle2: 360,
      loop: true,
      preWarm: true,
      emitterShape: pc.EMITTERSHAPE_BOX,
      emitterExtents: new pc.Vec3(0.08, 0.6, 0.08),
      colorMap: this.weaponSparkleTexture,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      intensity: 1.5,
      colorGraph,
      alphaGraph,
      scaleGraph,
    });
    parent.addChild(sparkles);
    return sparkles;
  }

  /**
   * Aura de plasma (niveis 8+): fumaca luminosa lenta que envolve a lamina e
   * sobe, como nos renders de arma +8/+9 do Mu.
   */
  private createWeaponWisps(parent: pc.Entity, stage: WeaponGlowStage): pc.Entity | null {
    if (!this.weaponSoftTexture || stage.wispCount <= 0) return null;
    const wisps = makeEntity('weapon-wisps', this.world.app);
    const deep = new pc.Color(stage.color.r * 0.9, stage.color.g * 0.35, stage.color.b * 0.55);
    const colorGraph = new pc.CurveSet([
      [0, stage.color.r, 1, deep.r],
      [0, stage.color.g, 1, deep.g],
      [0, stage.color.b, 1, deep.b],
    ]);
    const alphaGraph = new pc.Curve([0, 0, 0.25, 0.38, 0.7, 0.26, 1, 0]);
    const scaleGraph = new pc.Curve([0, 0.05, 0.4, 0.15 + stage.factor * 0.09, 1, 0.03]);
    // Deriva suave: um pouco ao longo da lamina (local) + subida no mundo, para o
    // plasma escorrer da arma como fumaca de energia.
    const localVelocityGraph = new pc.CurveSet([[0, 0, 1, 0], [0, 0.12, 1, 0.3], [0, 0, 1, 0]]);
    const velocityGraph = new pc.CurveSet([[0, 0, 1, 0], [0, 0.16, 1, 0.3], [0, 0, 1, 0]]);
    wisps.addComponent('particlesystem', {
      numParticles: Math.min(16, stage.wispCount),
      lifetime: 1.05,
      rate: 0.85 / stage.wispCount,
      rate2: 1.3 / stage.wispCount,
      startAngle: 0,
      startAngle2: 360,
      loop: true,
      preWarm: true,
      emitterShape: pc.EMITTERSHAPE_BOX,
      emitterExtents: new pc.Vec3(0.16, 0.62, 0.16),
      colorMap: this.weaponSoftTexture,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      intensity: 0.55,
      colorGraph,
      alphaGraph,
      scaleGraph,
      localVelocityGraph,
      velocityGraph,
    });
    parent.addChild(wisps);
    return wisps;
  }

  /**
   * Feixes verticais de luz (niveis 8+): flashes finos e altos que aparecem e
   * somem na lamina, como os raios de luz dos renders +8..+11 do Mu.
   */
  private createWeaponStreaks(parent: pc.Entity, stage: WeaponGlowStage): pc.Entity | null {
    if (!this.weaponStreakTexture || stage.streakRate <= 0) return null;
    const streaks = makeEntity('weapon-streaks', this.world.app);
    const colorGraph = new pc.CurveSet([
      [0, 1, 1, stage.color.r],
      [0, 0.98, 1, stage.color.g],
      [0, 0.92, 1, stage.color.b],
    ]);
    const alphaGraph = new pc.Curve([0, 0, 0.2, 0.5 + stage.factor * 0.2, 1, 0]);
    const scaleGraph = new pc.Curve([0, 0.1, 0.35, 0.34 + stage.factor * 0.18, 1, 0.06]);
    streaks.addComponent('particlesystem', {
      numParticles: 6,
      lifetime: 0.7,
      rate: 1 / stage.streakRate,
      rate2: 1.8 / stage.streakRate,
      // Sem rotacao: o feixe fica SEMPRE vertical na tela, como no Mu.
      startAngle: 0,
      startAngle2: 0,
      loop: true,
      preWarm: true,
      emitterShape: pc.EMITTERSHAPE_BOX,
      emitterExtents: new pc.Vec3(0.06, 0.62, 0.06),
      colorMap: this.weaponStreakTexture,
      blendType: pc.BLEND_ADDITIVE,
      depthWrite: false,
      lighting: false,
      intensity: 1.2,
      colorGraph,
      alphaGraph,
      scaleGraph,
    });
    parent.addChild(streaks);
    return streaks;
  }

  private visibleWeaponFor(entity: EntityState): EquippedWeaponVisualState | null {
    if (entity.id !== this.net.playerId) return entity.equippedWeapon ?? null;
    return this.weaponGlowPreview ?? entity.equippedWeapon ?? null;
  }

  private syncViewEquipment(view: View, weapon: EquippedWeaponVisualState | null): void {
    const key = this.equippedWeaponKeyFor(weapon);
    if (key === view.equippedWeaponKey) return;
    view.equippedWeaponKey = key;
    view.weaponGlowMaterial?.destroy();
    view.weaponAuraMaterial?.destroy();
    for (const material of view.weaponBoostMaterials ?? []) material.destroy();
    view.weaponBoostMaterials = undefined;
    destroyEntity(view.weaponAnchor);
    destroyEntity(view.weaponLight);
    for (const fx of view.weaponFx ?? []) destroyEntity(fx);
    view.weapon = undefined;
    view.weaponGlow = undefined;
    view.weaponGlowMaterial = undefined;
    view.weaponAura = undefined;
    view.weaponAuraMaterial = undefined;
    view.weaponLight = undefined;
    view.weaponFire = undefined;
    view.weaponFx = undefined;
    view.weaponStage = undefined;
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
      const stage = weaponGlowStageFor(weapon.upgradeLevel, weapon.rarity, weapon.element);
      if (stage) {
        const isFire = weapon.element === 'fire';
        this.ensureWeaponFxTextures();
        // Particulas sao puladas na qualidade baixa para poupar GPU (o contorno,
        // o emissivo da lamina e a luz ficam — o glow nunca some por completo).
        const quality = this.effectiveRenderQualityLevel();
        view.weaponStage = stage;
        // (1) A PROPRIA lamina brilha: clona os materiais e soma emissivo na cor
        // do ESTAGIO (rampa Mu 99B por nivel; nos niveis 11+ o nucleo clareia
        // para branco-quente). E o que faz o glow FUNDIR com a textura da arma.
        view.weaponBoostMaterials = this.boostWeaponEmissive(model, stage.coreColor, stage.boost);
        // (2) Contorno estilo Mu: clone levemente maior, faces de tras, aditivo —
        // um contorno FINO que segue o formato exato da arma.
        if (stage.shellOpacity > 0) {
          const material = createMaterial(stage.color, {
            emissive: stage.color,
            emissiveIntensity: 0.7 + stage.factor * 1.6,
            opacity: stage.shellOpacity,
            additive: true,
            unlit: true,
          });
          material.cull = pc.CULLFACE_FRONT;
          material.update();
          view.weaponGlow = this.createWeaponShell(model, material, 1.02 + stage.factor * 0.025, anchor);
          view.weaponGlowMaterial = material;
        }
        // (3) Halo externo (niveis 7+): segundo shell maior e bem mais suave — a
        // "aura de energia" larga dos renders do Mu, que o bloom transforma em halo.
        if (stage.auraOpacity > 0) {
          const auraMaterial = createMaterial(stage.color, {
            emissive: mixColor(stage.color, new pc.Color(1, 1, 1), 0.15),
            emissiveIntensity: 0.5 + stage.factor * 1.1,
            opacity: stage.auraOpacity,
            additive: true,
            unlit: true,
          });
          auraMaterial.cull = pc.CULLFACE_FRONT;
          auraMaterial.update();
          view.weaponAura = this.createWeaponShell(model, auraMaterial, stage.auraScale, anchor);
          view.weaponAuraMaterial = auraMaterial;
        }
        // (4) Luz da arma fica no view.visual (escala 1) para o range ficar em
        // unidades de mundo CONTIDAS — sob o osso (escala ~0.01) o alcance
        // estourava na tela. A posicao de mundo e sincronizada com a lamina a
        // cada frame (updateWeaponPose), entao a luz acompanha a arma.
        const light = makeEntity('weapon-light', this.world.app);
        light.addComponent('light', {
          type: 'omni',
          color: isFire ? colorFromCss('#ff6a1a') : stage.color,
          intensity: stage.lightIntensity,
          range: stage.lightRange,
          falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
        });
        view.visual.addChild(light);
        view.weaponLight = light;

        // (5) Particulas por estagio: estrelas (+5), plasma e feixes (+8). Vivem
        // no view.visual e sao sincronizadas com a lamina a cada frame.
        const fx: pc.Entity[] = [];
        if (quality !== 'low') {
          const sparkles = this.createWeaponSparkles(view.visual, stage);
          if (sparkles) fx.push(sparkles);
          const wisps = this.createWeaponWisps(view.visual, stage);
          if (wisps) fx.push(wisps);
          const streaks = this.createWeaponStreaks(view.visual, stage);
          if (streaks) fx.push(streaks);
        }
        // Fogo da lamina: VFX client-side, so para armas de elemento fogo.
        // Nunca depende do WebSocket.
        if (isFire && this.weaponFireTexture) {
          const fire = this.createWeaponFire(view.visual);
          view.weaponFire = fire;
          fx.push(fire);
        }
        view.weaponFx = fx;
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

  /**
   * Inimigo proximo NA DIRECAO do clique (cone de +-60 graus a partir do
   * heroi). Antes era 360: clicar ATRAS do personagem atacava o inimigo da
   * FRENTE. Agora o clique so vira ataque se apontar para o inimigo; clique
   * para tras e ordem de movimento (recuo). Clique colado nos pes (sem direcao
   * clara) mantem o comportamento antigo de atacar o mais proximo.
   */
  private findCloseEnemyToward(point: Vec3Like): string | null {
    const player = this.views.get(this.net.playerId);
    if (!player) return null;
    const playerPos = entityPosition(player.entity);
    const clickX = point.x - playerPos.x;
    const clickZ = point.z - playerPos.z;
    const clickDistance = Math.hypot(clickX, clickZ);
    let id: string | null = null;
    let best = CLOSE_TARGET_RADIUS;
    for (const entity of this.latestEntities.values()) {
      if (entity.kind !== 'enemy' || !entity.alive) continue;
      const enemyX = entity.position.x - playerPos.x;
      const enemyZ = entity.position.z - playerPos.z;
      const distance = Math.hypot(enemyX, enemyZ);
      if (distance >= best) continue;
      if (clickDistance > 0.35 && distance > 0.001) {
        const dot = (clickX * enemyX + clickZ * enemyZ) / (clickDistance * distance);
        if (dot < CLOSE_ATTACK_CONE_COS) continue;
      }
      best = distance;
      id = entity.id;
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
    // Trocar de zona teleporta o jogador: trajeto de clique, interacao pendente
    // e comando de move enfileirado morrem aqui.
    this.clickMoveTarget = null;
    this.pendingInteraction = null;
    this.queuedMoveCommand = null;
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
    // Forca o reequip visual das armas no proximo frame: as particulas do glow
    // sao puladas na qualidade baixa, entao trocar de preset exige rebuild.
    for (const view of this.views.values()) view.equippedWeaponKey = undefined;
  }

  private resize(): void {
    this.world.resize(window.innerWidth, window.innerHeight);
  }
}
