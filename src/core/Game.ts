import * as pc from 'playcanvas';

import { Sfx } from '../audio/Sfx';
import type { NetworkClient } from '../net/NetworkClient';
import type { PlayerProfile } from '../shared/playerProfile';
import type { Terrain } from '../shared/Terrain';
import type { Blocker } from '../shared/worldgen';
import {
  GEM_DEFINITIONS,
  ITEM_ICON_URLS,
  RARITY_COLORS,
  RARITY_GLOW_SCALE,
  glowColorForGem,
  isTwoHandedKind,
  isWeaponKind,
  itemDisplayName,
  itemIconFor,
  lootModelUrlFor,
} from '../shared/itemMeta';
import type {
  ChestState,
  ChatMessageState,
  CombatEvent,
  CombatTextKind,
  DamageKind,
  EntityAction,
  EntityState,
  EquipmentState,
  EquippedWeaponVisualState,
  HotbarAction,
  InventoryItem,
  ItemKind,
  ItemRarity,
  LootState,
  NpcState,
  PartyEvent,
  PartyState,
  PlayerAttribute,
  QuestState,
  WeaponElement,
  WorldSnapshot,
  WorldZone,
} from '../shared/types';
import { HUD, HUD_SKILL_ICON_URLS, preloadHudIcons, type HudMinimapNpc, type HudNpcDestination, type HudNpcPrompt, type HudNpcTarget, type HudStashItem } from '../ui/HUD';
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
import { autorunMoveState } from './AutorunMove';
import { chatBubbleTextColor, chatBubbleToneFor, type ChatBubbleTone } from './ChatPresentation';
import { ClientMovementPredictor } from './ClientMovementPredictor';
import { canStartClickAutomove, canStartNpcDestinationAutomove } from './ClickAutomovePolicy';
import { clickMoveArrivalStep } from './ClickMoveArrival';
import { turnYawToward, yawTowardPoint } from './Facing';
import { npcActionLabel } from './NpcActionLabel';
import { npcApproachPreviewTargetId, shouldShowNpcApproachPreview } from './NpcApproachPreview';
import { chooseNpcApproachPoint, npcApproachTriggerRange } from './NpcApproachPoint';
import { npcFacingFocusTargetId } from './NpcFacingFocus';
import { npcGuideTargetNpcId } from './NpcGuideTarget';
import {
  findLocalPath,
  furthestClearPathIndex,
  resolveCircularCollisions,
  walkableGoalNear,
  type MovementBlocker,
  type MovementPoint,
} from './MovementCollision';
import { createNpcDefinitions, npcDefinitionsFromSnapshot, type NpcDefinition, type VendorShopItem } from './Npc';
import { npcNameplateModel, type NpcNameplateModel } from './NpcNameplate';
import { npcInteractionTargetDecision } from './NpcInteractionTarget';
import {
  npcServicePropBlockers,
  npcServicePropPartVisualState,
  npcServicePropParts,
  npcServicePropVisualState,
  type NpcServicePropPart,
} from './NpcServiceProp';
import { sortNpcServiceDestinations } from './NpcServiceDirectory';
import { npcServiceGlyph } from './NpcServiceIdentity';
import { npcServicePriorityScore } from './NpcServicePriority';
import { nextNpcSelectionId } from './NpcSelectionCycle';
import { npcQuestMarkerModel } from './NpcQuestMarker';
import { npcServiceStatusLabel as buildNpcServiceStatusLabel } from './NpcServiceStatus';
import { npcServiceAccentCss, npcServiceAccentHex } from './NpcServiceVisual';
import { npcTargetFrameModel, npcTargetFrameRenderKey } from './NpcTargetFrame';
import { npcTargetFrameInteractionDecision } from './NpcTargetFrameInteraction';
import { npcHoverFocusTargetId, npcInteractionRingState, npcVisualFocusState, shouldCloseNpcServicePanel } from './NpcVisualFocus';
import { samplePathGuidancePoints, type PathGuidancePoint } from './PathGuidance';
import { pendingInteractionDecision, pendingInteractionRetryDecision } from './PendingInteraction';
import { playerIntentCancelPlan } from './PlayerIntentCancel';
import { questDialogueActionDecision, questDialogueActionLabel as buildQuestDialogueActionLabel } from './QuestDialogueAction';
import { questNavigationHoverNpcId, questNavigationTargetNpcId } from './QuestNavigation';
import { questTrackerRouteLabel } from './QuestTrackerRoute';

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
  /** Gear extra no corpo: segunda arma (mao esquerda), elmo e peitoral. */
  offhandKey?: string | null;
  offhandAnchor?: pc.Entity;
  helmetKey?: string | null;
  helmetAnchor?: pc.Entity;
  armorKey?: string | null;
  armorAnchor?: pc.Entity;
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
  rarityAccentKey?: string;
  rarityRing?: pc.Entity;
  rarityRingMaterial?: pc.StandardMaterial;
  rarityLight?: pc.Entity;
  rarityGlowScale: number;
  baseY: number;
  phase: number;
}

interface ChestView {
  entity: pc.Entity;
  opened: boolean;
}

interface NpcView {
  definition: NpcDefinition;
  entity: pc.Entity;
  visual: pc.Entity;
  label: WorldLabel;
  markerLabel: WorldLabel;
  ring: pc.Entity;
  destinationRing: pc.Entity;
  /**
   * Ancora do cenario de servico no mundo, fixada na posicao/rotacao BASE do
   * NPC. Nao e filha da entidade do NPC de proposito: quando o NPC gira para
   * encarar o jogador, o cenario (balcao, bigorna, portal...) fica parado —
   * e continua batendo com os blockers de npcServicePropBlockers, que usam a
   * rotacao base.
   */
  servicePropsAnchor: pc.Entity;
  serviceProps: pc.Entity;
  servicePropParts: NpcServicePropEntity[];
  loading?: boolean;
  failed?: boolean;
  anim?: PcClipController;
  animTime?: number;
  nameplateKey?: string;
}

interface NpcServicePropEntity {
  entity: pc.Entity;
  part: NpcServicePropPart;
}

interface ClickMoveTarget {
  x: number;
  z: number;
  run: boolean;
  sentAt: number;
  path: MovementPoint[];
}

interface NpcServiceActionState {
  label: string;
  disabled: boolean;
  status?: string;
  item?: ItemKind;
}

interface VendorBuyPending {
  vendorId: string;
  itemId: string;
  price: number;
  beforeCoins: number;
  beforeStock?: number;
}

interface VendorSellPending {
  beforeCoins: number;
  beforeCount: number;
  beforeValue: number;
}

interface StashTransferPending {
  kind: ItemKind;
  itemId: string;
  stackable: boolean;
  action: 'deposit' | 'withdraw';
  beforeBagCount: number;
  beforeStashCount: number;
  beforeBagPresent: boolean;
  beforeStashPresent: boolean;
}

type RenderQualityLevel = 'high' | 'medium' | 'low';
type RenderQualityMode = RenderQualityLevel | 'auto';
type TargetMarkerKind = 'move' | 'interact';
type PathGuidanceKind = TargetMarkerKind | 'preview';

const HERO_MODEL_URL = '/models/warrior.glb';
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
  '/items/Sword_Golden.glb',
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
const LOCAL_PLAYER_COLLISION_RADIUS = 0.5;
// Raio para interagir com loot/bau ao chegar (MENOR que o do servidor — 3.1 do
// collectLoot e 4.0 do openChest — para a predicao nunca disparar cedo demais).
const LOOT_INTERACT_RANGE = 2.6;
const CHEST_INTERACT_RANGE = 3.4;
const NPC_APPROACH_ARRIVAL_RANGE = CLICK_MOVE_STOP_DISTANCE + 0.22;
const HEALER_SERVICE_COST = 18;
const BLACKSMITH_BLESS_MAX_LEVEL = 6;
const BLACKSMITH_MAX_LEVEL = 15;
const NPC_TURN_RATE = 8.5;
const NPC_INTERACTION_TURN_RATE = 12;
// Espacamento minimo entre comandos 'move' (coalescing): spam de clique vira no
// maximo ~11 pacotes/s, sempre enviando o alvo MAIS RECENTE (trailing send).
const MOVE_COMMAND_MIN_INTERVAL = 0.09;
const HELD_CLICK_MOVE_REFRESH_INTERVAL = 0.1;
const HELD_CLICK_MOVE_MIN_TARGET_DELTA = 0.55;

const MARKER_DURATION = 0.6;
const PATH_GUIDANCE_SPACING = 2.35;
const PATH_GUIDANCE_MAX_POINTS = 12;
const CHAT_BUBBLE_DURATION = 5;
const MAX_SPEECH_BUBBLES = 8;
const NPC_APPROACH_PREVIEW_MAX_POINTS = 8;
const CLOSE_TARGET_RADIUS = 3.4;
// Cone (meia-abertura 60 graus) NA DIRECAO DO CLIQUE para converter clique de
// chao em ataque. Clicar atras do personagem = recuo, NUNCA vira ataque.
const CLOSE_ATTACK_CONE_COS = Math.cos(Math.PI / 3);
const CLOSE_CLICK_RADIUS = 2.8;
// Raio de clique de loot reduzido (era 1.25): junto com a prioridade de
// inimigo sobre loot no handleClick, evita que drops "roubem" o ataque.
const LOOT_CLICK_RADIUS = 1.0;
const CHEST_CLICK_RADIUS = 1.45;
// Hold do botao esquerdo sobre inimigo: reenvia o attack no maximo a cada
// intervalo abaixo (o retarget para OUTRO inimigo e imediato).
const HELD_ATTACK_REFRESH_INTERVAL = 0.35;
// Layout da hotbar (slots 1-6) e persistido localmente; drag & drop troca as
// posicoes e a tecla passa a disparar o que estiver no slot.
const HOTBAR_LAYOUT_STORAGE_KEY = 'aranna.hotbar-layout.v1';
const DEFAULT_HOTBAR_LAYOUT: readonly HotbarAction[] = ['potion', 'arcane-nova', 'mana-potion', 'war-cry', 'heavy-strike', 'charge'];

function loadHotbarLayout(): HotbarAction[] {
  try {
    const raw = window.localStorage.getItem(HOTBAR_LAYOUT_STORAGE_KEY);
    if (!raw) return [...DEFAULT_HOTBAR_LAYOUT];
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_HOTBAR_LAYOUT.length &&
      DEFAULT_HOTBAR_LAYOUT.every((action) => parsed.includes(action))
    ) {
      return parsed as HotbarAction[];
    }
  } catch {
    // Preferencia opcional; layout padrao cobre falhas de storage/parse.
  }
  return [...DEFAULT_HOTBAR_LAYOUT];
}
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
    this.root.className = 'healthbar-overlay';
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

  setPartyMember(active: boolean): void {
    this.root.classList.toggle('party-healthbar', active);
    this.fill.style.background = active ? 'linear-gradient(90deg,#1fbfd1,#8fe6ff)' : 'linear-gradient(90deg,#d72f45,#ff7467)';
    this.label.style.color = active ? '#8fe6ff' : '#fff';
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
          : kind === 'critical'
            ? '#ffd874'
            : '#fff3b5';
    this.start = { ...position };
    this.label = new WorldLabel(layer, kind === 'critical' ? 'combat-text critical-text' : 'combat-text', String(amount), color);
    this.label.el.style.font = '800 18px/1 ui-sans-serif,system-ui,sans-serif';
    this.label.el.style.zIndex = '9';
  }

  update(dt: number, world: PcWorld): boolean {
    this.age += dt;
    const t = this.age / 0.82;
    this.label.setWorldPosition(this.start.x, this.start.y + t * 1.15, this.start.z);
    this.label.el.style.opacity = String(clamp01(1 - Math.max(0, t - 0.45) / 0.55));
    this.label.el.style.fontSize = this.kind === 'miss' ? '15px' : this.kind === 'critical' ? '24px' : '18px';
    this.label.update(world);
    if (t < 1) return false;
    this.dispose();
    return true;
  }

  dispose(): void {
    this.label.dispose();
  }
}

class SpeechBubble {
  private readonly label: WorldLabel;
  private age = 0;

  constructor(layer: HTMLElement, readonly entityId: string, text: string, tone: ChatBubbleTone) {
    this.label = new WorldLabel(layer, 'speech-bubble', text, chatBubbleTextColor(tone));
    this.label.el.dataset.channel = tone;
    this.label.el.classList.add(`speech-bubble-${tone}`);
    this.label.el.style.whiteSpace = 'normal';
    this.label.el.style.font = "800 12px/1.25 'Segoe UI', system-ui, sans-serif";
    this.label.el.style.zIndex = '10';
  }

  update(dt: number, world: PcWorld, position: Vec3Like): boolean {
    this.age += dt;
    const t = this.age / CHAT_BUBBLE_DURATION;
    this.label.setWorldPosition(position.x, position.y, position.z);
    this.label.el.style.opacity = String(clamp01(1 - Math.max(0, t - 0.72) / 0.28));
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

interface ChargeTrailSegment {
  entity: pc.Entity;
  material: pc.StandardMaterial;
  opacity: number;
  scale: Vec3Like;
}

class ChargeTrailEffect implements TimedEffect {
  private age = 0;

  constructor(
    private readonly segments: ChargeTrailSegment[],
    private readonly duration: number,
  ) {}

  update(dt: number): boolean {
    this.age += dt;
    const t = clamp01(this.age / this.duration);
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      // Divisor proporcional ao atraso do segmento: todos chegam a opacidade 0
      // exatamente em t=1 (antes o ultimo segmento sumia com ~9% -> "pop").
      const localT = clamp01((t - i * 0.055) / Math.max(0.2, 1 - i * 0.055));
      segment.material.opacity = segment.opacity * (1 - localT);
      segment.material.update();
      segment.entity.setLocalScale(
        segment.scale.x * (1 - localT * 0.24),
        segment.scale.y,
        segment.scale.z * (1 + localT * 0.7),
      );
    }
    if (t < 1) return false;
    this.dispose();
    return true;
  }

  dispose(): void {
    for (const segment of this.segments) {
      destroyEntity(segment.entity);
      segment.material.destroy();
    }
    this.segments.length = 0;
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
// Sockets para o gear extra no corpo (dual wield, elmo, peitoral).
const OFFHAND_SOCKET_BONE_NAMES = ['LeftHand', 'mixamorigLeftHand', 'mixamorig:LeftHand', 'Hand_L'] as const;
const HEAD_SOCKET_BONE_NAMES = ['mixamorigHead', 'mixamorig:Head', 'Head', 'head'] as const;
const CHEST_SOCKET_BONE_NAMES = ['mixamorigSpine2', 'mixamorig:Spine2', 'Spine2', 'mixamorigSpine1', 'mixamorig:Spine1', 'Spine1', 'Chest', 'mixamorigSpine', 'Spine'] as const;
// Tamanhos-alvo (em unidades de mundo) das pecas anexadas ao corpo.
const HELMET_WORLD_SIZE = 0.34;
const CHEST_ARMOR_WORLD_SIZE = 0.72;
// Armas 2H sao desenhadas maiores que as 1H.
const TWO_HANDED_LENGTH_MULTIPLIER = 1.32;
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
const CHARGE_TRAIL_SEGMENTS = 5;
const CHARGE_TRAIL_DURATION = 0.44;
const CHARGE_TRAIL_COLOR = '#ffb75f';

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
  return isRootAnimTarget(source);
}

function isRootAnimTarget(source: PcAnimPathLike): boolean {
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
    // Nao normalize localRotation da raiz/hips aqui: o warrior.glb ja traz a
    // compensacao de eixo no proprio rig; mexer nessa rotacao vira humanoides
    // de ponta cabeca.
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
  private readonly moveBound: number;
  private readonly worldBlockers: Blocker[];
  private readonly world: PcWorld;
  private readonly input: Input;
  private readonly hud: HUD;
  private npcs: NpcDefinition[];
  private npcCatalogKey = '';
  private readonly sfx = new Sfx();
  private readonly perf = new PerfOverlay();
  private readonly views = new Map<string, View>();
  private readonly npcViews = new Map<string, NpcView>();
  private readonly latestEntities = new Map<string, EntityState>();
  private readonly lootViews = new Map<string, LootView>();
  private readonly notableLootSoundIds = new Set<string>();
  private readonly chestViews = new Map<string, ChestView>();
  private readonly enemyHp = new Map<string, number>();
  private readonly damageTexts: FloatingText[] = [];
  private readonly speechBubbles: SpeechBubble[] = [];
  private readonly partyMemberIds = new Set<string>();
  private readonly partyBadges = new Map<string, WorldLabel>();
  private readonly effects: TimedEffect[] = [];
  private readonly seenCombatEvents = new Set<string>();
  private readonly seenPartyEvents = new Set<string>();
  private readonly seenChatMessages = new Set<string>();
  private readonly keyboardMove = new KeyboardMoveController();
  private readonly clientMovement = new ClientMovementPredictor();
  private autorunActive = false;
  private readonly targetMarker: pc.Entity;
  private readonly npcApproachPreviewMarker: pc.Entity;
  private readonly pathGuidanceMarkers: pc.Entity[] = [];
  private targetMarkerKind: TargetMarkerKind = 'move';
  private readonly weaponGlowPreview = weaponGlowPreviewFromUrl();
  private markerTimer = 0;
  private elapsed = 0;
  private zone: WorldZone = 'overworld';
  private zombieClipConfigs?: Promise<Partial<Record<VisualAnimState, ClipConfig>>>;
  private selectedEnemyId: string | null = null;
  private selectedNpcId: string | null = null;
  private hoveredNpcId: string | null = null;
  private serviceDirectoryHoveredNpcId: string | null = null;
  private targetFrameHoveredNpcId: string | null = null;
  private questTrackerHovered = false;
  private activeVendorId: string | null = null;
  private activeStashNpcId: string | null = null;
  private activeQuestNpcId: string | null = null;
  private trainingNpcId: string | null = null;
  private nearbyNpcPromptKey = '';
  private readonly vendorBuyLocks = new Map<string, VendorBuyPending>();
  private vendorSellPending: VendorSellPending | null = null;
  private readonly stashTransferLocks = new Map<string, StashTransferPending>();
  private questAcceptPending = false;
  private questRewardClaimPending = false;
  private healerServicePending = false;
  private blacksmithUpgradePending = false;
  private travelServicePending = false;
  private jewelerServicePending = false;
  private hudDirty = true;
  private npcTargetHudKey = '';
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
  private clickMoveTarget: ClickMoveTarget | null = null;
  private heldGroundMoveActive = false;
  private lastHeldGroundMoveAt = -Infinity;
  private lastHeldAttackCommandAt = -Infinity;
  private readonly hotbarLayout: HotbarAction[] = loadHotbarLayout();
  /** Ate quando (elapsed) a mira local e dona do yaw — cobre o vao entre golpes. */
  private localAimHoldUntil = 0;
  /** Interacao adiada (clique distante em loot/bau/npc): anda ate la e executa. */
  private pendingInteraction: {
    kind: 'loot' | 'chest' | 'npc';
    id: string;
    x: number;
    y: number;
    z: number;
    range: number;
    moveX?: number;
    moveY?: number;
    moveZ?: number;
    lastRetryAt?: number;
  } | null = null;
  /** Coalescing de comandos 'move' (ultimo alvo vence; ver MOVE_COMMAND_MIN_INTERVAL). */
  private lastMoveCommandAt = -Infinity;
  private queuedMoveCommand: { target: Vec3Like; run: boolean } | null = null;
  /** Cache do inventario: o servidor manda `null` quando nao muda (delta). */
  private cachedInventory: InventoryItem[] = [];
  private cachedStash: InventoryItem[] = [];
  /** Cache do catalogo de NPCs: snapshots delta podem trazer `npcs: null`. */
  private cachedNpcStates: NpcState[] = [];
  /**
   * Caches de quest e equipamento — mesmo padrao de delta do inventario.
   * Defaults SEGUROS (nunca null): o 1o snapshot completo pode ser substituido
   * no buffer por um delta durante o preload dos assets; o HUD nao pode quebrar
   * nesse vao (o reenvio periodico de ~2s preenche os dados reais).
   */
  private cachedQuest: QuestState = { title: '', objective: '', progress: 0, goal: 0, accepted: false, completed: false, rewardClaimed: false, rewardText: '' };
  private cachedVendorStock: Record<string, Record<string, number>> = {};
  private cachedEquipment: EquipmentState = {
    head: null, chest: null, hands: null, legs: null, feet: null, weapon: null, offhand: null, trinket: null, ring: null, ring2: null,
  };
  private cachedEquippedWeapon: EquippedWeaponVisualState | null = null;

  constructor(canvas: HTMLCanvasElement, private readonly uiLayer: HTMLElement, net: NetworkClient, profile: PlayerProfile) {
    this.net = net;
    const worldData = this.net.getWorld();
    this.terrain = worldData.terrain;
    this.moveBound = worldData.size / 2 - 2;
    this.worldBlockers = worldData.blockers;
    this.world = new PcWorld(canvas, worldData);
    this.input = new Input(canvas);
    const initialNpcStates = (this.net.getSnapshot().npcs as NpcState[] | null | undefined) ?? [];
    this.cachedNpcStates = initialNpcStates;
    const snapshotNpcs = npcDefinitionsFromSnapshot(initialNpcStates);
    this.npcs = snapshotNpcs.length > 0 ? snapshotNpcs : createNpcDefinitions(worldData);
    this.npcCatalogKey = this.npcDefinitionsKey(this.npcs);
    this.hud = new HUD(uiLayer, profile, worldData);
    if (import.meta.env.DEV) {
      (window as unknown as { __arannaGame?: Game }).__arannaGame = this;
    }
    this.targetMarker = this.world.createTargetMarker();
    this.npcApproachPreviewMarker = this.createNpcApproachPreviewMarker();
    this.applyRenderQuality();

    this.hud.onRespawn = () => this.net.send({ type: 'respawn', entityId: this.net.playerId });
    this.hud.onEquipItem = (itemId) => this.net.send({ type: 'equip-item', entityId: this.net.playerId, itemId });
    this.hud.onEquipItemToSlot = (itemId, slot) => this.net.send({ type: 'equip-item', entityId: this.net.playerId, itemId, slot });
    this.hud.onUseItem = (item) => this.net.send({ type: 'use-item', entityId: this.net.playerId, item });
    this.hud.onHotbarSwap = (from, to) => this.swapHotbarSlots(from, to);
    this.hud.onHotbarUse = (action) => this.triggerHotbarAction(action);
    this.hud.onDropItem = (item) => {
      // Arrastar item para fora da bag: empilhavel dropa 1 unidade por vez;
      // arma dropa a instancia exata (raridade/upgrade preservados).
      if (item.stackable) {
        this.net.send({ type: 'drop-item', entityId: this.net.playerId, item: item.kind });
      } else {
        this.net.send({ type: 'drop-item', entityId: this.net.playerId, itemId: item.id });
      }
      this.sfx.play('pickup');
    };
    this.hud.setHotbarLayout(this.hotbarLayout);
    this.hud.onUnequipSlot = (slot) => this.net.send({ type: 'unequip-slot', entityId: this.net.playerId, slot });
    this.hud.onAllocateAttribute = (attribute) => this.handleAllocateAttribute(attribute);
    this.hud.onVendorBuy = (vendorId, itemId) => this.handleVendorBuy(vendorId, itemId);
    this.hud.onVendorSellUnused = (vendorId) => this.handleVendorSellUnused(vendorId);
    this.hud.onVendorClose = () => {
      this.activeVendorId = null;
      this.vendorBuyLocks.clear();
      this.vendorSellPending = null;
      this.hudDirty = true;
    };
    this.hud.onStashDeposit = (npcId, item) => this.handleStashTransfer(npcId, item, 'deposit');
    this.hud.onStashWithdraw = (npcId, item) => this.handleStashTransfer(npcId, item, 'withdraw');
    this.hud.onStashClose = () => {
      this.activeStashNpcId = null;
      this.stashTransferLocks.clear();
      this.hudDirty = true;
    };
    this.hud.onNpcDestination = (npcId) => this.interactWithNpc(
      npcId,
      true,
      canStartNpcDestinationAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() }),
    );
    this.hud.onNpcTargetInteract = (npcId) => this.interactWithNpc(
      npcId,
      true,
      npcTargetFrameInteractionDecision({
        npcTargetId: npcId,
        keyboardMovementActive: this.isKeyboardMovementActive(),
      }).allowAutomove,
    );
    this.hud.onNpcTargetHover = (npcId) => {
      this.targetFrameHoveredNpcId = npcId;
      this.hudDirty = true;
    };
    this.hud.onQuestTracker = () => this.trackQuestObjective();
    this.hud.onNpcDestinationHover = (npcId) => {
      this.serviceDirectoryHoveredNpcId = npcId;
      this.hudDirty = true;
    };
    this.hud.onQuestTrackerHover = (hovered) => {
      this.questTrackerHovered = hovered;
      this.hudDirty = true;
    };
    this.hud.onNpcDialogueClose = () => {
      this.activeQuestNpcId = null;
      this.trainingNpcId = null;
      this.healerServicePending = false;
      this.blacksmithUpgradePending = false;
      this.travelServicePending = false;
      this.jewelerServicePending = false;
      this.hudDirty = true;
    };
    this.hud.onNpcDialogueAction = (npcId) => {
      this.sfx.play('ui');
      const activeNpc = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
      if (activeNpc?.definition.kind === 'healer') {
        this.handleHealerService(npcId);
        return;
      }
      if (activeNpc?.definition.kind === 'blacksmith') {
        this.handleBlacksmithUpgrade(npcId);
        return;
      }
      if (activeNpc?.definition.kind === 'trainer') {
        this.handleTrainerService();
        return;
      }
      if (activeNpc?.definition.kind === 'travel') {
        this.handleTravelService(npcId);
        return;
      }
      if (activeNpc?.definition.kind === 'jeweler') {
        this.handleJewelerService(npcId);
        return;
      }
      if (activeNpc?.definition.kind === 'guard') {
        const guideTarget = this.npcGuideTargetNpcId(activeNpc.definition.kind);
        if (guideTarget) {
          this.closeNpcDialogue();
          this.interactWithNpc(
            guideTarget,
            true,
            canStartNpcDestinationAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() }),
          );
          return;
        }
        this.closeNpcDialogue();
        return;
      }
      const questAction = questDialogueActionDecision(this.cachedQuest, this.questNavigationTargetNpcId());
      if (questAction.action === 'accept') {
        if (this.questAcceptPending) return;
        this.questAcceptPending = true;
        this.hud.setNpcDialogueActionPending(true);
        this.hud.setNpcDialogueStatus('Pedido de missao enviado ao servidor.');
        window.setTimeout(() => {
          this.questAcceptPending = false;
          this.hud.setNpcDialogueActionPending(false);
        }, 1200);
        this.net.send({ type: 'accept-quest', entityId: this.net.playerId, npcId });
        return;
      }
      if (questAction.action === 'claim') {
        if (this.questRewardClaimPending) return;
        this.questRewardClaimPending = true;
        this.hud.setNpcDialogueActionPending(true);
        this.hud.setNpcDialogueStatus('Recompensa enviada ao servidor.');
        window.setTimeout(() => {
          this.questRewardClaimPending = false;
          this.hud.setNpcDialogueActionPending(false);
        }, 1200);
        this.net.send({ type: 'claim-quest-reward', entityId: this.net.playerId, npcId });
        return;
      }
      if (questAction.action === 'track' && questAction.targetNpcId) {
        this.closeNpcDialogue();
        this.interactWithNpc(
          questAction.targetNpcId,
          true,
          canStartNpcDestinationAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() }),
        );
        return;
      }
      this.closeNpcDialogue();
    };
    this.hud.onPartyInviteSend = (targetPlayerId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_invite_send', entityId: this.net.playerId, targetPlayerId });
    };
    this.hud.onPartyInviteAccept = (inviteId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_invite_accept', entityId: this.net.playerId, inviteId });
    };
    this.hud.onPartyInviteDecline = (inviteId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_invite_decline', entityId: this.net.playerId, inviteId });
    };
    this.hud.onPartyLeave = () => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_leave', entityId: this.net.playerId });
    };
    this.hud.onPartyKick = (targetPlayerId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_kick', entityId: this.net.playerId, targetPlayerId });
    };
    this.hud.onPartyLeaderTransfer = (targetPlayerId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'party_leader_transfer', entityId: this.net.playerId, targetPlayerId });
    };
    this.hud.onFriendAdd = (targetPlayerId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'friend_add', entityId: this.net.playerId, targetPlayerId });
    };
    this.hud.onFriendRemove = (targetPlayerId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'friend_remove', entityId: this.net.playerId, targetPlayerId });
    };
    this.hud.onChatSend = (channel, message) => {
      this.sfx.play('ui');
      this.net.send({ type: 'chat_send', entityId: this.net.playerId, channel, message });
    };
    this.hud.onTalentLearn = (talentId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'talent_learn', entityId: this.net.playerId, talentId });
    };
    this.hud.onTalentReset = () => {
      this.sfx.play('ui');
      this.net.send({ type: 'talent_reset', entityId: this.net.playerId });
    };
    this.hud.setNpcMinimapMarkers(this.npcMinimapMarkers());
    this.updateNpcServiceDestinations();
    this.createNpcViews();

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
    const npcModelUrls = [...new Set(this.npcs.map((npc) => npc.modelUrl))];
    const batches = [
      this.world.models.preload([HERO_MODEL_URL, ...ZOMBIE_MODEL_URLS, ...npcModelUrls]),
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
    this.syncPartyEvents(snapshot.partyEvents);
    this.syncPartyPresentation(snapshot.party);
    this.syncChatMessages(snapshot.chatMessages);
    this.reconcileLoot(snapshot.loot);
    this.reconcileChests(snapshot.chests);
    this.updateLootViews();
    this.updateCameraAndMarker(0);
    this.updateNpcViews(0);
    this.updateViewVisuals(snapshot.entities, 0);
    this.updateEnemyCulling();
    this.updateOverlays();
    const selectedTarget = this.selectedEnemy(snapshot.entities);
    const npcTarget = selectedTarget ? undefined : this.npcTargetFrame();
    this.npcTargetHudKey = this.npcTargetFrameKey(selectedTarget, npcTarget);
    this.updateQuestTrackerTarget();
    this.hud.update(snapshot, playerState, selectedTarget, npcTarget);
    this.hudDirty = false;
  }

  private npcDefinitionsKey(npcs: readonly NpcDefinition[]): string {
    return npcs.map((npc) => [
      npc.id,
      npc.kind,
      npc.zone,
      npc.name,
      npc.title,
      npc.position.x.toFixed(2),
      npc.position.y.toFixed(2),
      npc.position.z.toFixed(2),
      npc.rotationY.toFixed(3),
      npc.interactRange.toFixed(2),
      npc.clickRadius.toFixed(2),
      npc.collisionRadius.toFixed(2),
      npc.modelUrl,
      ...(npc.shopItems ?? []).map((item) => [
        item.id,
        item.kind,
        item.price,
        item.rarity ?? '',
        item.stock ?? '',
      ].join('/')),
      npc.dialogue?.greeting ?? '',
      npc.dialogue?.actionLabel ?? '',
    ].join(':')).join('|');
  }

  private syncNpcDefinitions(npcs: readonly NpcState[] | null | undefined): void {
    if (npcs == null) return;
    const incoming = npcDefinitionsFromSnapshot(npcs);
    if (incoming.length === 0) return;
    const key = this.npcDefinitionsKey(incoming);
    if (key === this.npcCatalogKey) return;

    this.npcs = incoming;
    this.npcCatalogKey = key;
    // Interacao adiada guarda coordenadas do catalogo antigo; se um NPC mudou
    // de lugar, o retry de 'move' continuaria mandando o heroi para o ponto
    // velho. Cancela e deixa o jogador clicar de novo.
    if (this.pendingInteraction?.kind === 'npc') this.pendingInteraction = null;
    this.closeNpcPanels();
    this.clearNpcViews();
    this.createNpcViews();
    this.hud.setNpcMinimapMarkers(this.npcMinimapMarkers());
    this.updateNpcServiceDestinations();
  }

  private clearNpcViews(): void {
    for (const view of this.npcViews.values()) {
      view.label.dispose();
      view.markerLabel.dispose();
      destroyEntity(view.servicePropsAnchor);
      destroyEntity(view.entity);
    }
    this.npcViews.clear();
    this.nearbyNpcPromptKey = '';
    this.hud.hideNpcPrompt();
  }

  /**
   * Preenche os campos de PRESENTACAO (nome/icone/modelo) que o WebSocket nao
   * manda mais — derivados de kind/raridade/upgrade/etc. Idempotente: so preenche
   * o que falta, entao continua funcionando mesmo se o servidor ainda enviar.
   */
  private hydrateSnapshotPresentation(snapshot: WorldSnapshot): void {
    const incomingNpcs = snapshot.npcs as NpcState[] | null | undefined;
    if (incomingNpcs != null) {
      this.cachedNpcStates = incomingNpcs;
      this.syncNpcDefinitions(incomingNpcs);
    }
    snapshot.npcs = this.cachedNpcStates;
    snapshot.party = snapshot.party ?? null;
    snapshot.partyInvites = snapshot.partyInvites ?? [];
    snapshot.partyEvents = snapshot.partyEvents ?? [];
    snapshot.chatMessages = snapshot.chatMessages ?? [];
    snapshot.talents = snapshot.talents ?? { talentPoints: 0, spentPoints: 0, availablePoints: 0, talents: {} };

    // Inventario com DELTA: o servidor manda `null` quando NAO mudou — nesse caso
    // reaproveitamos o cache. Quando vem o array (mudou ou reenvio periodico),
    // hidratamos (nome/icone) e cacheamos. (`!= null` cobre null e campo ausente.)
    let vendorDataChanged = false;
    let stashDataChanged = false;
    const incoming = snapshot.inventory as InventoryItem[] | null | undefined;
    if (incoming != null) {
      for (const item of incoming) {
        if (!item.icon) item.icon = itemIconFor(item.kind, item.rarity);
        if (!item.name) item.name = itemDisplayName(item);
      }
      this.cachedInventory = incoming;
      if (this.activeVendorId) vendorDataChanged = true;
      if (this.activeStashNpcId) stashDataChanged = true;
      if (this.activeQuestNpcId) {
        const activeNpc = this.npcViews.get(this.activeQuestNpcId);
        if (activeNpc?.definition.kind === 'healer') this.refreshHealerDialogue();
        if (activeNpc?.definition.kind === 'blacksmith') this.refreshBlacksmithDialogue('Forja atualizada.');
        if (activeNpc?.definition.kind === 'jeweler') this.refreshJewelerDialogue('Joias atualizadas.');
      }
    }
    snapshot.inventory = this.cachedInventory;
    const incomingStash = snapshot.stash as InventoryItem[] | null | undefined;
    if (incomingStash != null) {
      for (const item of incomingStash) {
        if (!item.icon) item.icon = itemIconFor(item.kind, item.rarity);
        if (!item.name) item.name = itemDisplayName(item);
      }
      this.cachedStash = incomingStash;
      if (this.activeStashNpcId) stashDataChanged = true;
    }
    snapshot.stash = this.cachedStash;

    // Quest e equipamento com DELTA (null = nao mudou), mesmo padrao acima.
    // Equipment e equippedWeapon viajam juntos sob o mesmo rev no servidor:
    // `equipment != null` e o gate para atualizar o cache dos dois.
    const incomingQuest = snapshot.quest as QuestState | null | undefined;
    if (incomingQuest != null) {
      this.cachedQuest = incomingQuest;
      if (this.cachedQuest.accepted) this.questAcceptPending = false;
      if (this.cachedQuest.rewardClaimed) this.questRewardClaimPending = false;
      if (this.activeQuestNpcId) this.hud.updateNpcDialogueQuest(this.cachedQuest, this.activeQuestDialogueActionLabel());
      this.hud.setNpcMinimapMarkers(this.npcMinimapMarkers());
      this.updateNpcServiceDestinations();
    }
    snapshot.quest = this.cachedQuest;
    const incomingVendorStock = snapshot.vendorStock as Record<string, Record<string, number>> | null | undefined;
    if (incomingVendorStock != null) {
      this.cachedVendorStock = incomingVendorStock;
      if (this.activeVendorId) vendorDataChanged = true;
    }
    snapshot.vendorStock = this.cachedVendorStock;
    if (vendorDataChanged) this.refreshActiveVendorAfterSnapshot();
    if (stashDataChanged) this.refreshActiveStashAfterSnapshot();
    const incomingEquipment = snapshot.equipment as EquipmentState | null | undefined;
    if (incomingEquipment != null) {
      this.cachedEquipment = incomingEquipment;
      this.cachedEquippedWeapon = snapshot.equippedWeapon ?? null;
      if (this.activeQuestNpcId) {
        const activeNpc = this.npcViews.get(this.activeQuestNpcId);
        if (activeNpc?.definition.kind === 'blacksmith') this.refreshBlacksmithDialogue('Forja atualizada.');
      }
    }
    snapshot.equipment = this.cachedEquipment;
    snapshot.equippedWeapon = this.cachedEquippedWeapon;

    for (const loot of snapshot.loot) {
      if (!loot.icon) loot.icon = itemIconFor(loot.kind, loot.rarity);
      if (!loot.name) loot.name = itemDisplayName(loot);
      if (!loot.modelUrl) loot.modelUrl = lootModelUrlFor(loot.kind, loot.rarity);
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
      this.syncPartyEvents(snapshot.partyEvents);
      this.syncPartyPresentation(snapshot.party);
      this.syncChatMessages(snapshot.chatMessages);
      this.reconcileLoot(snapshot.loot);
      this.reconcileChests(snapshot.chests);
    }

    this.reconcile(snapshot.entities, dt, snapshotChanged);
    this.applyLocalPlayerMovement(dt);
    this.flushQueuedMoveCommand();
    this.updatePendingInteraction();
    this.updatePathGuidance();
    this.aimLocalPlayerDuringAttack(dt);
    this.aimLocalPlayerAtFocusedNpc(dt);
    this.updateLootViews();
    this.updateCameraAndMarker(dt);
    this.updateNpcViews(dt);
    this.updateNpcApproachPreview();
    this.updateNpcServiceDestinations();
    this.updateNpcMinimapMarkers();
    this.updateViewVisuals(snapshot.entities, dt);
    this.updateEnemyCulling();
    this.updateDamageTexts(dt);
    this.updateSpeechBubbles(dt);
    this.updateEffects(dt);
    this.updateOverlays();
    if (snapshotChanged) this.refreshActiveServiceDialogue(playerState);

    const selectedTarget = this.selectedEnemy(snapshot.entities);
    const npcTarget = selectedTarget ? undefined : this.npcTargetFrame();
    const npcTargetHudKey = this.npcTargetFrameKey(selectedTarget, npcTarget);
    if (npcTargetHudKey !== this.npcTargetHudKey) {
      this.npcTargetHudKey = npcTargetHudKey;
      this.hudDirty = true;
    }
    this.updateQuestTrackerTarget();

    if (snapshotChanged || this.hudDirty) {
      this.hud.update(snapshot, playerState, selectedTarget, npcTarget);
      this.hudDirty = false;
    }
    this.perf.update(frameMs, this.world.getRenderStats(), this.renderQualityMode === 'auto' ? `auto:${this.autoQualityLevel}` : this.renderQualityMode);
  }

  private processInput(dt: number): void {
    const menuRequested = this.input.takeInventoryToggle() || this.input.takeCharacterToggle();
    if (menuRequested) {
      this.trainingNpcId = null;
      this.hud.setCharacterTrainingContext(null);
      this.hudDirty = true;
      this.sfx.play('ui');
      this.hud.toggleMenu();
    }
    if (this.input.takeTalentsToggle()) {
      this.hudDirty = true;
      this.sfx.play('ui');
      this.hud.toggleTalents();
    }
    if (this.input.takeSfxMuteToggle()) this.sfx.toggleMuted();
    if (this.input.takeQualityToggle()) {
      this.sfx.play('ui');
      this.cycleRenderQualityMode();
    }
    if (this.input.takeCancel()) {
      this.cancelPlayerIntent();
      return;
    }

    const zoom = this.input.takeZoom();
    if (zoom !== 0) this.world.rig.zoom(zoom);

    if (this.input.takeJump()) {
      this.sfx.unlock();
      this.net.send({ type: 'jump', entityId: this.net.playerId });
    }
    for (const slot of this.input.takeHotbarPresses()) {
      this.triggerHotbarSlot(slot);
    }

    this.processKeyboardMove(dt);
    const npcCycleDirection = this.input.takeNpcCycle();
    if (npcCycleDirection !== 0) this.cycleSelectedNpc(npcCycleDirection);
    if (this.input.takeNpcInteract()) {
      const promptNpc = this.nearestPromptNpc();
      const target = npcInteractionTargetDecision({
        nearestPromptNpcId: promptNpc?.definition.id ?? null,
        selectedNpcId: this.selectedNpcId,
        selectedNpcAvailable: this.selectedNpcIsAvailable(),
        questNpcId: this.questNavigationTargetNpcId(),
        keyboardMovementActive: this.isKeyboardMovementActive(),
      });
      if (target.npcId) this.interactWithNpc(target.npcId, this.isMovementRunning(), target.allowAutomove);
    }
    for (const ndc of this.input.takeClicks()) this.handleClick(ndc);
    this.updateHeldGroundMove();
  }

  private processKeyboardMove(dt: number): void {
    const autorun = autorunMoveState({
      active: this.autorunActive,
      toggleQueued: this.input.takeAutorunToggle(),
      manualAxes: this.input.getMoveAxes(),
      movementChanged: this.input.takeMovementChanged(),
    });
    this.autorunActive = autorun.active;
    const axes = autorun.axes;
    const player = this.views.get(this.net.playerId)?.entity
      ? entityPosition(this.views.get(this.net.playerId)!.entity)
      : this.latestEntities.get(this.net.playerId)?.position;
    const direction = this.world.rig.getMoveDirection(axes.strafe, axes.forward);
    const decision = this.keyboardMove.update({
      dt,
      movementChanged: autorun.movementChanged,
      axes,
      running: this.isMovementRunning(),
      player,
      direction,
    });
    if (decision.type === 'none') return;
    // O teclado assumiu o controle do movimento: trajeto de clique e interacao
    // pendente morrem aqui.
    this.trainingNpcId = null;
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.sendMoveCommand(this.walkableMoveTarget(decision.target, player), decision.run);
  }

  private applyLocalPlayerMovement(dt: number): void {
    this.localPlayerMoving = false;
    this.localPlayerRunning = false;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (!view || (state && !state.alive)) {
      this.cancelAutomoveIntent();
      return;
    }

    const axes = this.effectiveMoveAxes();
    const direction = this.world.rig.getMoveDirection(axes.strafe, axes.forward);
    const currentPosition = entityPosition(view.entity);
    const prediction = this.clientMovement.predict({
      dt,
      axes,
      running: this.isMovementRunning(),
      direction,
      current: currentPosition,
      terrain: this.terrain,
      zone: this.zone,
    });
    if (prediction) {
      const position = this.resolveLocalCollision(prediction.position, direction, currentPosition);
      setEntityPosition(view.entity, position);
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
    const clearIndex = furthestClearPathIndex(
      { x: p.x, y: p.y, z: p.z },
      target.path,
      this.localNavigationBlockers(),
    );
    if (clearIndex > 0) target.path.splice(0, clearIndex);
    while (target.path.length > 1) {
      const next = target.path[0];
      if (Math.hypot(next.x - p.x, next.z - p.z) > CLICK_MOVE_STOP_DISTANCE) break;
      target.path.shift();
    }
    const waypoint = target.path[0] ?? { x: target.x, y: 0, z: target.z };
    const dx = waypoint.x - p.x;
    const dz = waypoint.z - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= CLICK_MOVE_STOP_DISTANCE) {
      if (target.path.length > 1) {
        target.path.shift();
      } else {
        this.clickMoveTarget = null;
      }
      return;
    }

    const speed = target.run ? CLICK_MOVE_RUN_SPEED : CLICK_MOVE_WALK_SPEED;
    const arrival = clickMoveArrivalStep(distance, speed, dt, CLICK_MOVE_STOP_DISTANCE, target.path.length <= 1, target.run);
    const step = arrival.step;
    const nx = Math.max(-this.terrain.half, Math.min(this.terrain.half, p.x + (dx / distance) * step));
    const nz = Math.max(-this.terrain.half, Math.min(this.terrain.half, p.z + (dz / distance) * step));
    const ny = this.zone === 'dungeon' ? this.terrain.heightAt(0, 0) : this.terrain.heightAt(nx, nz);
    const position = this.resolveLocalCollision({ x: nx, y: ny, z: nz }, { x: dx, z: dz }, p);
    setEntityPosition(view.entity, position);
    setYaw(view.entity, Math.atan2(dx, dz));
    this.localPlayerMoving = true;
    this.localPlayerRunning = arrival.running;
  }

  private localNavigationBlockers(): MovementBlocker[] {
    const zoneNpcs = this.npcs.filter((npc) => npc.zone === this.zone);
    const npcBlockers = zoneNpcs.map((npc) => ({
        x: npc.position.x,
        z: npc.position.z,
        radius: npc.collisionRadius,
      }));
    const servicePropBlockers = zoneNpcs.flatMap((npc) => npcServicePropBlockers({
      kind: npc.kind,
      x: npc.position.x,
      z: npc.position.z,
      rotationY: npc.rotationY,
    }));
    if (this.zone === 'overworld') return [...this.worldBlockers, ...npcBlockers, ...servicePropBlockers];
    return [...npcBlockers, ...servicePropBlockers];
  }

  private heightForMove(x: number, z: number): number {
    return this.zone === 'dungeon' ? this.terrain.heightAt(0, 0) : this.terrain.heightAt(x, z);
  }

  private resolveLocalCollision(
    position: Vec3Like,
    fallbackDirection?: { x: number; z: number },
    previousPosition?: Vec3Like,
  ): Vec3Like {
    return resolveCircularCollisions(
      { x: position.x, y: position.y, z: position.z },
      this.localNavigationBlockers(),
      this.moveBound,
      LOCAL_PLAYER_COLLISION_RADIUS,
      (x, z) => this.heightForMove(x, z),
      fallbackDirection,
      previousPosition ? { x: previousPosition.x, y: previousPosition.y, z: previousPosition.z } : undefined,
    );
  }

  private walkableMoveTarget(target: Vec3Like, start?: Pick<Vec3Like, 'x' | 'z'>): Vec3Like {
    const playerEntity = this.views.get(this.net.playerId)?.entity;
    const origin = start
      ?? (playerEntity ? entityPosition(playerEntity) : undefined)
      ?? this.latestEntities.get(this.net.playerId)?.position
      ?? target;
    const adjusted = walkableGoalNear(
      { x: origin.x, y: 0, z: origin.z },
      { x: target.x, y: target.y, z: target.z },
      this.localNavigationBlockers(),
      this.moveBound,
    );
    return { x: adjusted.x, y: this.heightForMove(adjusted.x, adjusted.z), z: adjusted.z };
  }

  private createClickMoveTarget(target: Vec3Like, run: boolean, start?: Pick<Vec3Like, 'x' | 'z'>): {
    commandTarget: Vec3Like;
    prediction: ClickMoveTarget;
  } {
    const playerEntity = this.views.get(this.net.playerId)?.entity;
    const origin = start
      ?? (playerEntity ? entityPosition(playerEntity) : undefined)
      ?? this.latestEntities.get(this.net.playerId)?.position
      ?? target;
    const blockers = this.localNavigationBlockers();
    const path = findLocalPath(
      { x: origin.x, y: 0, z: origin.z },
      { x: target.x, y: target.y, z: target.z },
      blockers,
      this.moveBound,
    ).map((point) => ({
      x: point.x,
      y: this.heightForMove(point.x, point.z),
      z: point.z,
    }));
    const last = path[path.length - 1] ?? this.walkableMoveTarget(target, origin);
    const commandTarget = { x: last.x, y: last.y, z: last.z };
    return {
      commandTarget,
      prediction: {
        x: commandTarget.x,
        z: commandTarget.z,
        run,
        sentAt: this.elapsed,
        path: path.length > 0 ? path : [commandTarget],
      },
    };
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

  private aimLocalPlayerAtFocusedNpc(dt: number): void {
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    const selectedNpc = this.selectedNpcId ? this.npcViews.get(this.selectedNpcId) : null;
    const npcId = npcFacingFocusTargetId({
      playerReady: !!view && (!state || state.alive),
      keyboardMovementActive: this.isKeyboardMovementActive(),
      automoveActive: !!this.clickMoveTarget,
      attackAimActive: !!state && (state.action === 'attack' || this.elapsed < this.localAimHoldUntil),
      activeNpcId: this.activeNpcId(),
      pendingNpcId: this.pendingInteraction?.kind === 'npc' ? this.pendingInteraction.id : null,
      selectedNpcId: this.selectedNpcId,
      selectedNpcNearby: !!selectedNpc && selectedNpc.definition.zone === this.zone && this.npcServiceIsNearby(selectedNpc.definition),
    });
    if (!view || !npcId) return;
    const npc = this.npcViews.get(npcId);
    if (!npc || npc.definition.zone !== this.zone) return;

    const playerPosition = entityPosition(view.entity);
    const npcPosition = entityPosition(npc.entity);
    const targetYaw = yawTowardPoint(playerPosition, npcPosition);
    if (targetYaw === null) return;
    setYaw(view.entity, turnYawToward(entityYaw(view.entity), targetYaw, dt, NPC_INTERACTION_TURN_RATE));
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

  private cancelAutomoveIntent(): void {
    this.clickMoveTarget = null;
    this.heldGroundMoveActive = false;
    this.pendingInteraction = null;
    this.queuedMoveCommand = null;
    this.hudDirty = true;
  }

  private cancelPlayerIntent(): void {
    const plan = playerIntentCancelPlan({
      automoveActive: !!this.clickMoveTarget || !!this.pendingInteraction || !!this.queuedMoveCommand,
      autorunActive: this.autorunActive,
      npcPanelOpen: !!this.activeNpcId() || !!this.trainingNpcId,
      enemySelected: !!this.selectedEnemyId,
      npcSelected: !!this.selectedNpcId,
    });
    if (!plan.handled) return;

    if (plan.clearAutomove) this.cancelAutomoveIntent();
    if (plan.clearAutorun) {
      this.autorunActive = false;
      const player = this.views.get(this.net.playerId)?.entity
        ? entityPosition(this.views.get(this.net.playerId)!.entity)
        : this.latestEntities.get(this.net.playerId)?.position;
      if (player) this.sendMoveCommand({ x: player.x, y: 0, z: player.z }, false);
    }
    if (plan.closeNpcPanels) this.closeNpcPanels();
    if (plan.clearEnemy) this.setSelectedEnemy(null);
    if (plan.clearNpcSelection) this.setSelectedNpc(null);
    this.localAimHoldUntil = 0;
    this.lastAttackAimPoint = null;
    this.hudDirty = true;
    this.sfx.play('ui');
  }

  /** Anda ate um loot/bau/npc distante e executa a interacao ao entrar no raio. */
  private beginPendingInteraction(interaction: NonNullable<Game['pendingInteraction']>, run = this.isMovementRunning()): void {
    this.pendingInteraction = interaction;
    this.hudDirty = true;
    if (interaction.kind === 'npc') this.setSelectedNpc(interaction.id);
    else this.setSelectedNpc(null);
    this.setSelectedEnemy(null);
    this.localAimHoldUntil = 0;
    const moveX = interaction.moveX ?? interaction.x;
    const moveY = interaction.moveY ?? interaction.y;
    const moveZ = interaction.moveZ ?? interaction.z;
    const { commandTarget, prediction } = this.createClickMoveTarget({ x: moveX, y: moveY, z: moveZ }, run);
    this.clickMoveTarget = prediction;
    this.sendMoveCommand(commandTarget, run);
    this.showMarker(commandTarget.x, commandTarget.y, commandTarget.z, 'interact');
  }

  /** Executa a interacao pendente quando o heroi chega perto do alvo. */
  private updatePendingInteraction(): void {
    const pending = this.pendingInteraction;
    if (!pending) return;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);

    let targetAvailable = true;
    // Alvo sumiu (loot coletado por outro / bau aberto)? Cancela em silencio.
    if (pending.kind === 'loot' && !this.lootViews.has(pending.id)) targetAvailable = false;
    if (pending.kind === 'chest') {
      const chest = this.chestViews.get(pending.id);
      if (!chest || chest.opened) targetAvailable = false;
    }
    if (pending.kind === 'npc') {
      const npc = this.npcViews.get(pending.id);
      if (!npc || npc.definition.zone !== this.zone) targetAvailable = false;
    }

    const p = view ? entityPosition(view.entity) : undefined;
    const distanceToApproachTarget = pending.kind === 'npc'
      && p
      && pending.moveX !== undefined
      && pending.moveZ !== undefined
      ? Math.hypot(pending.moveX - p.x, pending.moveZ - p.z)
      : undefined;
    const decision = pendingInteractionDecision({
      playerReady: !!view && (!state || state.alive),
      targetAvailable,
      distanceToTarget: p ? Math.hypot(pending.x - p.x, pending.z - p.z) : Infinity,
      range: pending.range,
      distanceToApproachTarget,
      approachRange: pending.kind === 'npc' ? NPC_APPROACH_ARRIVAL_RANGE : undefined,
    });
    if (decision === 'cancel') {
      this.cancelAutomoveIntent();
      return;
    }
    if (decision === 'wait') {
      if (pending.kind === 'npc' && pending.moveX !== undefined && pending.moveY !== undefined && pending.moveZ !== undefined) {
        const retry = pendingInteractionRetryDecision({
          decision,
          kind: pending.kind,
          automoveActive: !!this.clickMoveTarget || !!this.queuedMoveCommand,
          now: this.elapsed,
          lastRetryAt: pending.lastRetryAt,
          distanceToApproachTarget,
          approachRange: NPC_APPROACH_ARRIVAL_RANGE,
        });
        if (retry === 'retry') {
          pending.lastRetryAt = this.elapsed;
          const { commandTarget, prediction } = this.createClickMoveTarget(
            { x: pending.moveX, y: pending.moveY, z: pending.moveZ },
            this.isMovementRunning(),
            p,
          );
          this.clickMoveTarget = prediction;
          this.sendMoveCommand(commandTarget, prediction.run);
          this.showMarker(commandTarget.x, commandTarget.y, commandTarget.z, 'interact');
          this.hudDirty = true;
        }
      }
      return;
    }

    this.pendingInteraction = null;
    this.clickMoveTarget = null;
    this.queuedMoveCommand = null;
    this.hudDirty = true;
    if (p) this.sendMoveCommand({ x: p.x, y: 0, z: p.z }, false);
    if (pending.kind === 'npc') {
      this.openNpc(pending.id);
      return;
    }
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

  private npcApproachPoint(view: NpcView): Vec3Like {
    const npc = entityPosition(view.entity);
    const player = this.views.get(this.net.playerId)?.entity;
    const playerPos = player ? entityPosition(player) : undefined;
    const approach = chooseNpcApproachPoint({
      npc: { x: npc.x, y: npc.y, z: npc.z },
      player: playerPos ? { x: playerPos.x, z: playerPos.z } : undefined,
      rotationY: view.definition.rotationY,
      interactRange: view.definition.interactRange,
      blockers: this.localNavigationBlockers(),
      bound: this.moveBound,
      preferFacing: true,
    });
    return { x: approach.x, y: this.heightForMove(approach.x, approach.z), z: approach.z };
  }

  private hoverNpcUnderPointer(): string | null {
    const ray = this.world.screenRay(this.input.pointer);
    const npcPick = rayPickBest(
      ray,
      [...this.npcViews.entries()].filter(([, view]) => view.definition.zone === this.zone),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 1.2, z: p.z };
      },
      ([, view]) => view.definition.clickRadius * 1.08,
    );
    return npcPick?.[0] ?? null;
  }

  /** Posicao do alvo atual do ataque: inimigo selecionado vivo, senao o ultimo clique. */
  private currentAttackAimPoint(): Vec3Like | null {
    if (this.selectedEnemyId) {
      const enemy = this.latestEntities.get(this.selectedEnemyId);
      if (enemy && enemy.alive) return enemy.position;
    }
    return this.lastAttackAimPoint;
  }

  private issueGroundMove(point: Vec3Like, start?: Pick<Vec3Like, 'x' | 'z'>): void {
    const run = this.isMovementRunning();
    const { commandTarget, prediction } = this.createClickMoveTarget(point, run, start);
    this.clickMoveTarget = prediction;
    this.sendMoveCommand(commandTarget, run);
    this.showMarker(commandTarget.x, commandTarget.y, commandTarget.z, 'move');
    this.lastHeldGroundMoveAt = this.elapsed;
  }

  /** Pick de inimigo sob um ray (mesma geometria do clique). */
  private pickEnemyForRay(ray: WorldRay, onlyAlive: boolean) {
    return rayPickBest(
      ray,
      [...this.views.entries()].filter(
        ([id, view]) => view.kind === 'enemy' && (!onlyAlive || this.latestEntities.get(id)?.alive === true),
      ),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 1.2 * view.entity.getLocalScale().x, z: p.z };
      },
      ([, view]) => 1.25 * Math.max(1, view.entity.getLocalScale().x),
    );
  }

  /** Dispara a acao que ocupa o slot (1-6) no layout atual da hotbar. */
  private triggerHotbarSlot(slot: number): void {
    const action = this.hotbarLayout[slot - 1];
    if (!action) return;
    this.triggerHotbarAction(action);
  }

  /** Executa uma acao da hotbar (via tecla 1-6 ou clique no slot). */
  private triggerHotbarAction(action: HotbarAction): void {
    switch (action) {
      case 'potion':
        this.sfx.play('potion');
        this.net.send({ type: 'use-item', entityId: this.net.playerId, item: 'potion' });
        return;
      case 'mana-potion':
        this.sfx.play('potion');
        this.net.send({ type: 'use-item', entityId: this.net.playerId, item: 'mana_potion' });
        return;
      case 'arcane-nova':
        this.sfx.unlock();
        this.net.send({ type: 'cast-skill', entityId: this.net.playerId, skill: 'arcane-nova' });
        return;
      case 'war-cry':
        this.sfx.unlock();
        this.net.send({ type: 'cast-skill', entityId: this.net.playerId, skill: 'war-cry' });
        return;
      case 'heavy-strike':
        this.castTargetedSkill('heavy-strike', 'Selecione um inimigo para Golpe Pesado.');
        return;
      case 'charge':
        this.castTargetedSkill('charge', 'Selecione um inimigo para Investida.');
        return;
    }
  }

  private castTargetedSkill(skill: 'heavy-strike' | 'charge', missingTargetMessage: string): void {
    this.sfx.unlock();
    const targetId = this.selectedEnemyId;
    const target = targetId ? this.latestEntities.get(targetId) : undefined;
    if (targetId && target?.alive && target.kind === 'enemy') {
      this.lastAttackAimPoint = target.position;
      // Um move coalescido pendente cancelaria a skill armada 1 frame depois.
      this.queuedMoveCommand = null;
      this.net.send({ type: 'cast-skill', entityId: this.net.playerId, skill, targetId });
    } else {
      this.hud.pushSystemMessage(missingTargetMessage);
    }
  }

  /** Troca as posicoes de duas acoes da hotbar (drag & drop) e persiste. */
  private swapHotbarSlots(from: HotbarAction, to: HotbarAction): void {
    const a = this.hotbarLayout.indexOf(from);
    const b = this.hotbarLayout.indexOf(to);
    if (a < 0 || b < 0 || a === b) return;
    [this.hotbarLayout[a], this.hotbarLayout[b]] = [this.hotbarLayout[b], this.hotbarLayout[a]];
    try {
      window.localStorage.setItem(HOTBAR_LAYOUT_STORAGE_KEY, JSON.stringify(this.hotbarLayout));
    } catch {
      // Persistencia opcional.
    }
    this.hud.setHotbarLayout(this.hotbarLayout);
    this.sfx.play('ui');
  }

  private updateHeldGroundMove(): void {
    if (!this.input.isPrimaryActionDown()) {
      this.heldGroundMoveActive = false;
      return;
    }
    if (!this.heldGroundMoveActive) return;
    if (this.isKeyboardMovementActive() || this.pendingInteraction) {
      this.heldGroundMoveActive = false;
      return;
    }
    const state = this.latestEntities.get(this.net.playerId);
    if (state && (!state.alive || state.jumping)) return;

    const ray = this.world.screenRay(this.input.pointer);
    // ARPG classico: segurar o botao com o cursor sobre um inimigo ATACA o
    // inimigo (retarget imediato; reenvio throttled), em vez de andar por baixo.
    const enemyPick = this.pickEnemyForRay(ray, true);
    if (enemyPick) {
      const [id, enemyView] = enemyPick;
      const ep = entityPosition(enemyView.entity);
      this.lastAttackAimPoint = { x: ep.x, y: ep.y, z: ep.z };
      const retarget = this.selectedEnemyId !== id;
      if (retarget || this.elapsed - this.lastHeldAttackCommandAt >= HELD_ATTACK_REFRESH_INTERVAL) {
        if (retarget) {
          this.setSelectedEnemy(id);
          this.closeNpcPanels();
          this.clickMoveTarget = null;
          // Um move coalescido pendente (janela de 90ms) flusharia logo apos o
          // attack e cancelaria alvo/skill armada no servidor.
          this.queuedMoveCommand = null;
        }
        this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: id });
        this.lastHeldAttackCommandAt = this.elapsed;
      }
      return;
    }

    if (this.elapsed - this.lastHeldGroundMoveAt < HELD_CLICK_MOVE_REFRESH_INTERVAL) return;
    const ground = this.world.pickGround(ray);
    if (!ground) return;
    if (this.clickMoveTarget) {
      const movedTarget = Math.hypot(ground.point.x - this.clickMoveTarget.x, ground.point.z - this.clickMoveTarget.z);
      if (movedTarget < HELD_CLICK_MOVE_MIN_TARGET_DELTA) return;
    }

    const player = this.views.get(this.net.playerId)?.entity;
    const playerPos = player ? entityPosition(player) : undefined;
    this.localAimHoldUntil = 0;
    this.issueGroundMove(ground.point, playerPos);
  }

  private handleClick(ndc: PointerNdc): void {
    this.heldGroundMoveActive = false;
    this.hud.hidePlayerContextMenu();
    this.sfx.unlock();
    const ray = this.world.screenRay(ndc);
    const allowClickAutomove = canStartClickAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() });
    const portal = this.world.pickPortal(ray);
    if (portal) {
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.cancelAutomoveIntent();
      this.closeNpcPanels();
      this.sfx.play('arcane-nova');
      this.net.send({ type: portal, entityId: this.net.playerId });
      return;
    }

    const npcPick = rayPickBest(
      ray,
      [...this.npcViews.entries()].filter(([, view]) => view.definition.zone === this.zone),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 1.2, z: p.z };
      },
      ([, view]) => view.definition.clickRadius,
    );
    if (npcPick) {
      const [id] = npcPick;
      this.interactWithNpc(id, this.isMovementRunning(), allowClickAutomove);
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
      const chestPos = entityPosition(chestView.entity);
      // Longe do bau: anda ate ele e abre ao chegar (o servidor ignora alem de 4.0).
      if (this.localPlayerDistanceTo(chestPos.x, chestPos.z) > CHEST_INTERACT_RANGE) {
        if (!allowClickAutomove) {
          this.setSelectedNpc(null);
          return;
        }
        this.setSelectedNpc(null);
        this.setSelectedEnemy(null);
        this.closeNpcPanels();
        this.beginPendingInteraction({ kind: 'chest', id, x: chestPos.x, y: chestPos.y, z: chestPos.z, range: CHEST_INTERACT_RANGE });
        return;
      }
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.closeNpcPanels();
      this.pendingInteraction = null;
      this.sfx.play('chest');
      this.net.send({ type: 'open-chest', entityId: this.net.playerId, chestId: id });
      return;
    }

    // Inimigo ANTES de loot: em combate o clique de ataque nao pode ser
    // "roubado" por itens no chao ao redor do alvo (cata-se o loot depois).
    // Apenas inimigos VIVOS: um cadaver (1.1s ate sumir) em cima do proprio
    // drop nao pode engolir o clique de coleta.
    const enemyPick = this.pickEnemyForRay(ray, true);
    if (enemyPick) {
      const [id, enemyView] = enemyPick;
      this.setSelectedEnemy(id);
      this.cancelAutomoveIntent();
      this.closeNpcPanels();
      const ep = entityPosition(enemyView.entity);
      this.lastAttackAimPoint = { x: ep.x, y: ep.y, z: ep.z };
      this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: id });
      // Depois do cancelAutomoveIntent: segurar o botao mantem o modo hold
      // (continua atacando sob o cursor, ou anda se o cursor sair do inimigo).
      this.heldGroundMoveActive = this.input.isPrimaryActionDown();
      this.lastHeldAttackCommandAt = this.elapsed;
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
      const lootPos = entityPosition(lootView.entity);
      // Longe do item: anda ate ele e coleta ao chegar (o servidor ignora alem de 3.1).
      if (this.localPlayerDistanceTo(lootPos.x, lootPos.z) > LOOT_INTERACT_RANGE) {
        if (!allowClickAutomove) {
          this.setSelectedNpc(null);
          return;
        }
        this.setSelectedNpc(null);
        this.setSelectedEnemy(null);
        this.closeNpcPanels();
        this.beginPendingInteraction({ kind: 'loot', id, x: lootPos.x, y: lootPos.y, z: lootPos.z, range: LOOT_INTERACT_RANGE });
        return;
      }
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.closeNpcPanels();
      this.pendingInteraction = null;
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: id });
      return;
    }

    const playerPick = rayPickBest(
      ray,
      [...this.views.entries()].filter(([id, view]) => id !== this.net.playerId && view.kind === 'player'),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y + 1.2, z: p.z };
      },
      () => 1.15,
    );
    if (playerPick) {
      const [id, playerView] = playerPick;
      const state = this.latestEntities.get(id);
      if (!state || !state.alive) return;
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.cancelAutomoveIntent();
      this.closeNpcPanels();
      const p = entityPosition(playerView.entity);
      const screen = this.world.project({ x: p.x, y: p.y + 1.8, z: p.z });
      this.hud.showPlayerContextMenu({
        id,
        name: state.name ?? id,
        level: state.level,
        hp: state.hp,
        maxHp: state.maxHp,
        x: screen.visible ? screen.x + 14 : window.innerWidth * 0.5,
        y: screen.visible ? screen.y : window.innerHeight * 0.5,
      });
      this.sfx.play('ui');
      return;
    }

    const ground = this.world.pickGround(ray);
    if (!ground) return;
    const closeLoot = this.findLootNear(ground.point);
    if (closeLoot) {
      const lootView = this.lootViews.get(closeLoot);
      const lootPos = lootView ? entityPosition(lootView.entity) : ground.point;
      if (this.localPlayerDistanceTo(lootPos.x, lootPos.z) > LOOT_INTERACT_RANGE) {
        if (!allowClickAutomove) {
          this.setSelectedNpc(null);
          return;
        }
        this.setSelectedNpc(null);
        this.setSelectedEnemy(null);
        this.closeNpcPanels();
        this.beginPendingInteraction({ kind: 'loot', id: closeLoot, x: lootPos.x, y: lootPos.y, z: lootPos.z, range: LOOT_INTERACT_RANGE });
        return;
      }
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.closeNpcPanels();
      this.pendingInteraction = null;
      this.sfx.play('pickup');
      this.net.send({ type: 'collect', entityId: this.net.playerId, lootId: closeLoot });
      return;
    }
    const closeNpc = this.findNpcNear(ground.point);
    if (closeNpc) {
      this.interactWithNpc(closeNpc, this.isMovementRunning(), allowClickAutomove);
      return;
    }
    const closeTarget = this.findCloseEnemyToward(ground.point);
    const player = this.views.get(this.net.playerId)?.entity;
    const playerPos = player ? entityPosition(player) : undefined;
    if (closeTarget && playerPos && Math.hypot(ground.point.x - playerPos.x, ground.point.z - playerPos.z) <= CLOSE_CLICK_RADIUS) {
      this.setSelectedEnemy(closeTarget);
      this.cancelAutomoveIntent();
      this.closeNpcPanels();
      const targetPos = this.latestEntities.get(closeTarget)?.position ?? ground.point;
      this.lastAttackAimPoint = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
      this.net.send({ type: 'attack', entityId: this.net.playerId, targetId: closeTarget });
      this.heldGroundMoveActive = this.input.isPrimaryActionDown();
      this.lastHeldAttackCommandAt = this.elapsed;
      return;
    }

    if (!allowClickAutomove) {
      this.setSelectedNpc(null);
      return;
    }
    this.setSelectedNpc(null);
    this.setSelectedEnemy(null);
    this.localAimHoldUntil = 0;
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    // Predicao local: o heroi comeca a andar JA NESTE frame; o servidor confirma
    // e corrige pelo reconcile (mesmas margens da predicao de teclado).
    this.heldGroundMoveActive = this.input.isPrimaryActionDown();
    this.issueGroundMove(ground.point, playerPos);
  }

  private reconcile(entities: EntityState[], dt: number, snapshotChanged = true): void {
    const seen = new Set<string>();
    const availablePlayerContextIds = new Set<string>();
    this.latestEntities.clear();

    for (const e of entities) {
      seen.add(e.id);
      this.latestEntities.set(e.id, e);
      if (e.kind === 'player' && e.id !== this.net.playerId && e.alive) {
        availablePlayerContextIds.add(e.id);
      }
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
      if (e.kind === 'player') this.syncViewGearExtras(view, e);
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.healthBar?.dispose();
      destroyEntity(view.entity);
      this.views.delete(id);
      this.enemyHp.delete(id);
    }
    this.hud.syncPlayerContextTargets(availablePlayerContextIds);
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

  private createNpcViews(): void {
    for (const definition of this.npcs) {
      const entity = makeEntity(definition.id, this.world.app);
      const visual = makeEntity(`${definition.id}-visual`, this.world.app);
      entity.addChild(visual);
      setEntityPosition(entity, definition.position);
      setYaw(entity, definition.rotationY);
      const fallback = this.world.createFallbackCharacter('npc-vendor-fallback', 0xa66a2c, 0xf2c79b);
      visual.addChild(fallback);
      const color = this.npcAccentColor(definition);
      const ring = this.world.createPrimitive(
        'npc-interact-ring',
        'torus',
        this.world.material(`npc-ring-${definition.kind}`, color, { opacity: 0.62, additive: true, unlit: true }),
        { x: 0, y: 0.06, z: 0 },
        { x: 1.42, y: 0.025, z: 1.42 },
        entity,
      );
      const destinationRing = this.world.createPrimitive(
        'npc-destination-ring',
        'torus',
        this.world.material('npc-destination-ring', 0xffd874, { opacity: 0.86, additive: true, unlit: true }),
        { x: 0, y: 0.08, z: 0 },
        { x: 2.05, y: 0.03, z: 2.05 },
        entity,
      );
      destinationRing.enabled = false;
      const serviceProps = this.createNpcServiceProps(definition);
      const servicePropsAnchor = makeEntity(`${definition.id}-service-props-anchor`, this.world.app);
      setEntityPosition(servicePropsAnchor, definition.position);
      setYaw(servicePropsAnchor, definition.rotationY);
      servicePropsAnchor.addChild(serviceProps.root);
      this.world.root.addChild(servicePropsAnchor);
      this.world.root.addChild(entity);
      const label = new WorldLabel(this.uiLayer, 'npc-label', definition.name, color);
      this.configureNpcNameplate(label, color);
      const markerLabel = new WorldLabel(this.uiLayer, 'npc-marker', this.npcMarkerText(definition), color);
      markerLabel.el.style.font = '900 22px/1 ui-sans-serif,system-ui,sans-serif';
      markerLabel.el.style.textShadow = '0 1px 4px rgba(0,0,0,.95), 0 0 10px currentColor';
      markerLabel.el.style.zIndex = '10';
      const view: NpcView = {
        definition,
        entity,
        visual,
        label,
        markerLabel,
        ring,
        destinationRing,
        servicePropsAnchor,
        serviceProps: serviceProps.root,
        servicePropParts: serviceProps.parts,
      };
      this.npcViews.set(definition.id, view);
      this.ensureNpcModel(view);
    }
  }

  private createNpcServiceProps(definition: NpcDefinition): { root: pc.Entity; parts: NpcServicePropEntity[] } {
    const root = makeEntity(`${definition.id}-service-props`, this.world.app);
    const parts: NpcServicePropEntity[] = [];
    for (const part of npcServicePropParts(definition.kind)) {
      const entity = this.createNpcServicePropPart(root, definition.kind, part);
      parts.push({ entity, part });
    }
    return { root, parts };
  }

  private createNpcServicePropPart(parent: pc.Entity, kind: NpcDefinition['kind'], part: NpcServicePropPart): pc.Entity {
    const materialOptions: { opacity?: number; additive?: boolean; unlit?: boolean } = {};
    if (part.opacity !== undefined) materialOptions.opacity = part.opacity;
    if (part.additive) materialOptions.additive = true;
    if (part.unlit) materialOptions.unlit = true;
    const material = this.world.material(
      `npc-prop-${kind}-${part.id}`,
      part.color,
      materialOptions,
    );
    const entity = this.world.createPrimitive(
      `npc-prop-${kind}-${part.id}`,
      part.primitive,
      material,
      part.position,
      part.scale,
      parent,
    );
    if (part.rotation) {
      entity.setLocalEulerAngles(part.rotation.x, part.rotation.y, part.rotation.z);
    }
    return entity;
  }

  private ensureNpcModel(view: NpcView): void {
    if (view.loading || view.failed) return;
    view.loading = true;
    void Promise.all([
      this.world.models.instantiate(view.definition.modelUrl),
      this.world.models.animationTracks(view.definition.modelUrl),
    ]).then(([model, tracks]) => {
      if (!view.entity.parent) {
        destroyEntity(model);
        return;
      }
      clearChildren(view.visual);
      keepSingleSkinnedRigRoot(model, HERO_RIG_ROOT_NAME);
      configureImportedModel(model);
      setVisualAssetTransform(model, HERO_VISUAL_SCALE);
      view.visual.addChild(model);
      view.anim = new PcClipController(model, buildHeroClipConfigs(tracks));
      view.loading = false;
    }).catch((error) => {
      view.loading = false;
      view.failed = true;
      console.warn('[Game] falha ao carregar NPC PlayCanvas:', error);
    });
  }

  private configureNpcNameplate(label: WorldLabel, color: string): void {
    label.el.classList.add('npc-nameplate');
    label.el.style.font = '';
    label.el.style.textShadow = '';
    label.el.style.whiteSpace = '';
    label.el.style.color = '';
    label.el.style.zIndex = '9';
    label.el.style.setProperty('--npc-color', color);
  }

  private updateNpcNameplate(
    view: NpcView,
    focus: ReturnType<typeof npcVisualFocusState>,
    distanceToPlayer: number,
    marker: string,
  ): NpcNameplateModel {
    const model = npcNameplateModel({
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      marker,
      distance: distanceToPlayer,
      distanceLabel: this.npcDistanceLabel(view.definition, distanceToPlayer),
      serviceLabel: this.npcServiceStatusLabel(view.definition),
      actionLabel: this.npcNameplateActionLabel(view.definition, focus),
      active: focus.active,
      selected: focus.selected,
      pending: focus.pending,
      objective: focus.objective,
      hovered: focus.hovered,
      nearby: focus.nearby,
      focused: focus.focused,
      quest: this.cachedQuest,
    });

    view.label.el.dataset.kind = view.definition.kind;
    view.label.el.dataset.tone = model.tone;
    view.label.el.classList.toggle('focused', model.focused);
    view.label.el.classList.toggle('compact', model.compact);
    view.label.el.style.visibility = model.visible ? 'visible' : 'hidden';
    view.label.el.style.opacity = model.focused ? '1' : '0.84';

    const key = `${model.marker}:${model.name}:${model.detail}:${model.state}:${model.tone}:${model.focused ? 1 : 0}:${model.visible ? 1 : 0}:${model.compact ? 1 : 0}`;
    if (key !== view.nameplateKey) {
      view.nameplateKey = key;
      this.renderNpcNameplate(view.label.el, model);
    }
    return model;
  }

  private renderNpcNameplate(root: HTMLElement, model: NpcNameplateModel): void {
    const state = document.createElement('span');
    state.className = 'npc-nameplate-state';
    const marker = document.createElement('b');
    marker.textContent = model.marker;
    const stateText = document.createElement('em');
    stateText.textContent = model.state;
    state.append(marker, stateText);

    const name = document.createElement('strong');
    name.textContent = model.name;
    const detail = document.createElement('small');
    detail.textContent = model.detail;
    root.replaceChildren(state, name, detail);
  }

  private updateNpcViews(dt: number): void {
    let promptView: NpcView | null = null;
    let promptDistance = Infinity;
    const playerEntity = this.views.get(this.net.playerId)?.entity;
    const playerPosition = playerEntity ? entityPosition(playerEntity) : undefined;
    this.hoveredNpcId = npcHoverFocusTargetId({
      pointerNpcId: this.hoverNpcUnderPointer(),
      serviceNpcId: this.serviceDirectoryHoveredNpcId
        ?? questNavigationHoverNpcId(this.questNavigationTargetNpcId(), this.questTrackerHovered),
      targetFrameNpcId: this.targetFrameHoveredNpcId,
    });
    const questRouteNpcId = this.questNavigationTargetNpcId();

    for (const view of this.npcViews.values()) {
      const visible = view.definition.zone === this.zone;
      view.entity.enabled = visible;
      view.servicePropsAnchor.enabled = visible;
      if (!visible) {
        view.label.el.style.display = 'none';
        view.markerLabel.el.style.display = 'none';
        if (this.activeVendorId === view.definition.id) this.closeVendor();
        if (this.activeStashNpcId === view.definition.id) this.closeStash();
        if (this.activeQuestNpcId === view.definition.id) this.closeNpcDialogue();
        continue;
      }

      const distanceToPlayer = playerPosition
        ? Math.hypot(view.definition.position.x - playerPosition.x, view.definition.position.z - playerPosition.z)
        : Infinity;
      if (this.activeVendorId === view.definition.id
        && shouldCloseNpcServicePanel(distanceToPlayer, view.definition.interactRange)) {
        this.closeVendor();
      }
      if (this.activeStashNpcId === view.definition.id
        && shouldCloseNpcServicePanel(distanceToPlayer, view.definition.interactRange)) {
        this.closeStash();
      }
      if (this.activeQuestNpcId === view.definition.id
        && shouldCloseNpcServicePanel(distanceToPlayer, view.definition.interactRange)) {
        this.closeNpcDialogue();
      }

      const focus = npcVisualFocusState({
        npcId: view.definition.id,
        selectedNpcId: this.selectedNpcId,
        pendingNpcId: this.pendingInteraction?.kind === 'npc' ? this.pendingInteraction.id : null,
        activeNpcId: this.activeNpcId(),
        hoveredNpcId: this.hoveredNpcId,
        objectiveNpcId: questRouteNpcId,
        distanceToPlayer,
        interactRange: view.definition.interactRange,
      });
      if (!this.activeNpcId()) {
        if (focus.pending) {
          promptDistance = -1;
          promptView = view;
        } else if (focus.nearby && distanceToPlayer < promptDistance) {
          promptDistance = distanceToPlayer;
          promptView = view;
        }
      }

      view.animTime = (view.animTime ?? 0) + dt;
      view.visual.setLocalPosition(0, Math.sin((view.animTime ?? 0) * 1.8) * 0.025, 0);
      const ringPulse = 1 + Math.sin((view.animTime ?? 0) * 2.2) * 0.035;
      const ring = npcInteractionRingState({
        distanceToPlayer,
        interactRange: view.definition.interactRange,
        nearby: focus.nearby,
        hovered: focus.hovered,
        objective: focus.objective,
        destination: focus.destination,
      });
      view.ring.enabled = ring.visible;
      view.ring.setLocalPosition(0, ring.lift, 0);
      view.ring.setLocalScale(ring.scale * ringPulse, 0.025, ring.scale * ringPulse);
      this.updateNpcServiceProps(view, focus);
      this.updateNpcDestinationRing(view, focus.destination);
      this.updateNpcFacing(view, focus.focused, playerPosition, dt);
      view.anim?.setState('idle');
      view.anim?.setPlaybackSpeed(1);
      const p = entityPosition(view.entity);
      const markerText = this.npcMarkerText(view.definition);
      if (view.markerLabel.el.textContent !== markerText) view.markerLabel.setText(markerText);
      const nameplate = this.updateNpcNameplate(view, focus, distanceToPlayer, markerText);
      view.markerLabel.el.dataset.kind = view.definition.kind;
      view.markerLabel.el.dataset.tone = nameplate.tone;
      view.markerLabel.el.classList.toggle('destination', focus.destination);
      view.markerLabel.el.classList.toggle('nearby', focus.nearby);
      view.markerLabel.el.classList.toggle('objective', focus.objective);
      view.markerLabel.el.classList.toggle('hovered', focus.hovered);
      view.markerLabel.el.style.visibility = nameplate.visible || focus.destination ? 'visible' : 'hidden';
      view.markerLabel.el.style.opacity = focus.destination ? '1' : focus.focused ? '0.94' : '0.88';
      view.label.setWorldPosition(p.x, p.y + 2.7, p.z);
      view.label.update(this.world);
      view.markerLabel.setWorldPosition(p.x, p.y + (focus.destination ? 3.34 : 3.18) + Math.sin((view.animTime ?? 0) * 2.8) * 0.08, p.z);
      view.markerLabel.update(this.world);
    }

    this.updateNpcPrompt(promptView);
  }

  private updateNpcDestinationRing(view: NpcView, destination: boolean): void {
    view.destinationRing.enabled = destination;
    if (!destination) return;
    const t = view.animTime ?? 0;
    const pulse = 1 + Math.sin(t * 4.6) * 0.11;
    view.destinationRing.setLocalPosition(0, 0.08 + Math.sin(t * 5.8) * 0.012, 0);
    view.destinationRing.setLocalScale(2.05 * pulse, 0.03, 2.05 * pulse);
  }

  private updateNpcServiceProps(view: NpcView, focus: ReturnType<typeof npcVisualFocusState>): void {
    const time = view.animTime ?? 0;
    const state = npcServicePropVisualState({
      active: focus.active,
      pending: focus.pending,
      selected: focus.selected,
      nearby: focus.nearby,
      time,
    });
    view.serviceProps.setLocalPosition(0, state.lift, 0);
    view.serviceProps.setLocalScale(state.scale, state.scale, state.scale);
    for (const prop of view.servicePropParts) {
      const partState = npcServicePropPartVisualState({
        part: prop.part,
        active: focus.active,
        pending: focus.pending,
        selected: focus.selected,
        nearby: focus.nearby,
        time,
      });
      prop.entity.setLocalPosition(partState.position.x, partState.position.y, partState.position.z);
      prop.entity.setLocalScale(partState.scale.x, partState.scale.y, partState.scale.z);
      prop.entity.setLocalEulerAngles(partState.rotation.x, partState.rotation.y, partState.rotation.z);
    }
  }

  private updateNpcFacing(view: NpcView, focused: boolean, playerPosition: Vec3Like | undefined, dt: number): void {
    const p = entityPosition(view.entity);
    let targetYaw = view.definition.rotationY;
    if (focused && playerPosition) {
      const dx = playerPosition.x - p.x;
      const dz = playerPosition.z - p.z;
      if (dx * dx + dz * dz > 0.0001) targetYaw = Math.atan2(dx, dz);
    }
    const current = entityYaw(view.entity);
    const delta = Math.atan2(Math.sin(targetYaw - current), Math.cos(targetYaw - current));
    if (Math.abs(delta) < 0.002) return;
    const alpha = dt > 0 ? 1 - Math.exp(-NPC_TURN_RATE * dt) : 1;
    setYaw(view.entity, current + delta * alpha);
  }

  private npcMarkerText(definition: NpcDefinition): string {
    return definition.kind === 'quest'
      ? npcQuestMarkerModel(this.cachedQuest).marker
      : npcServiceGlyph(definition.kind);
  }

  private npcAccentColor(definition: Pick<NpcDefinition, 'kind'>): string {
    return npcServiceAccentCss(definition.kind);
  }

  private npcMinimapMarkers(): HudMinimapNpc[] {
    const questRouteNpcId = this.questNavigationTargetNpcId();
    return this.npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      zone: npc.zone,
      position: { x: npc.position.x, z: npc.position.z },
      kind: npc.kind,
      marker: this.npcMarkerText(npc),
      active: this.activeNpcId() === npc.id,
      selected: this.selectedNpcId === npc.id,
      pending: this.pendingInteraction?.kind === 'npc' && this.pendingInteraction.id === npc.id,
      objective: questRouteNpcId === npc.id,
      hovered: this.hoveredNpcId === npc.id,
    }));
  }

  private npcServiceDestinations(): HudNpcDestination[] {
    const activeNpcId = this.activeNpcId();
    const questRouteNpcId = this.questNavigationTargetNpcId();
    return sortNpcServiceDestinations(this.npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      title: npc.title,
      zone: npc.zone,
      kind: npc.kind,
      marker: this.npcMarkerText(npc),
      statusLabel: this.npcServiceStatusLabel(npc),
      priority: this.npcServicePriority(npc, questRouteNpcId),
      distance: this.npcServiceDistance(npc),
      distanceLabel: this.npcServiceDistanceLabel(npc),
      active: activeNpcId === npc.id,
      selected: this.selectedNpcId === npc.id,
      nearby: this.npcServiceIsNearby(npc),
      pending: this.pendingInteraction?.kind === 'npc' && this.pendingInteraction.id === npc.id,
      hovered: this.hoveredNpcId === npc.id,
      objective: questRouteNpcId === npc.id,
    })));
  }

  private npcServicePriority(npc: NpcDefinition, questRouteNpcId = this.questNavigationTargetNpcId()): number {
    if (npc.kind === 'vendor') {
      const availability = this.vendorAvailability(npc);
      return npcServicePriorityScore({
        kind: npc.kind,
        vendorAvailableItems: availability.available,
        vendorAffordableItems: availability.affordable,
      });
    }

    if (npc.kind === 'healer') {
      const player = this.latestEntities.get(this.net.playerId);
      const mana = player?.mana ?? 0;
      const maxMana = player?.maxMana ?? 0;
      const needsService = !!player && (player.hp < player.maxHp - 0.5 || mana < maxMana - 0.5);
      return npcServicePriorityScore({
        kind: npc.kind,
        healer: {
          needsService,
          canPay: this.currentCoinCount() >= HEALER_SERVICE_COST,
        },
      });
    }

    if (npc.kind === 'blacksmith') {
      return npcServicePriorityScore({ kind: npc.kind, blacksmith: this.blacksmithActionState() });
    }

    if (npc.kind === 'trainer') {
      const player = this.latestEntities.get(this.net.playerId);
      return npcServicePriorityScore({
        kind: npc.kind,
        trainer: { unspentPoints: player?.attributes?.unspentPoints ?? 0 },
      });
    }

    if (npc.kind === 'jeweler') {
      return npcServicePriorityScore({
        kind: npc.kind,
        jeweler: { blessCount: this.stackCount('jewel_bless'), requiredBless: 3 },
      });
    }

    if (npc.kind === 'banker') {
      return npcServicePriorityScore({
        kind: npc.kind,
        banker: { stashItems: this.stashStoredItemCount() },
      });
    }

    if (npc.kind === 'guard') {
      return npcServicePriorityScore({
        kind: npc.kind,
        guideTargetAvailable: !!this.npcGuideTargetNpcId(npc.kind),
      });
    }

    return npcServicePriorityScore({
      kind: npc.kind,
      quest: this.cachedQuest,
      questRouteTarget: questRouteNpcId === npc.id,
    });
  }

  private npcTargetFrame(): HudNpcTarget | undefined {
    const pendingNpcId = this.pendingInteraction?.kind === 'npc' ? this.pendingInteraction.id : null;
    const activeNpcId = this.activeNpcId();
    const id = activeNpcId ?? pendingNpcId ?? this.selectedNpcId ?? this.hoveredNpcId;
    if (!id) return undefined;
    const view = this.npcViews.get(id);
    if (!view || view.definition.zone !== this.zone) return undefined;
    const nearby = this.npcServiceIsNearby(view.definition);
    const selected = this.selectedNpcId === id;
    const hovered = this.hoveredNpcId === id;
    const distance = this.npcServiceDistance(view.definition);
    const model = npcTargetFrameModel({
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      marker: this.npcMarkerText(view.definition),
      distanceLabel: this.npcDistanceLabel(view.definition, distance ?? Infinity),
      serviceLabel: this.npcServiceStatusLabel(view.definition),
      actionLabel: this.npcTargetActionLabel(view.definition, {
        selected,
        hovered,
        nearby,
      }),
      active: activeNpcId === id,
      pending: pendingNpcId === id,
      selected,
      hovered,
      nearby,
      quest: this.cachedQuest,
    });
    return {
      id,
      kind: view.definition.kind,
      name: model.name,
      marker: model.marker,
      subtitle: model.subtitle,
      status: model.status,
      tone: model.tone,
    };
  }

  private npcTargetFrameKey(selectedTarget?: EntityState, npcTarget?: HudNpcTarget): string {
    if (selectedTarget && selectedTarget.kind === 'enemy' && selectedTarget.alive) {
      return `enemy:${selectedTarget.id}`;
    }
    if (!npcTarget) return '';
    return npcTargetFrameRenderKey(npcTarget.id, npcTarget);
  }

  private npcTargetActionLabel(npc: NpcDefinition, state: { selected: boolean; hovered?: boolean; nearby: boolean }): string | undefined {
    if (!state.selected && !state.hovered) return undefined;
    if (state.nearby) return this.npcPromptActionLabel(npc);
    return state.selected ? 'R Aproximar' : 'Clique Aproximar';
  }

  private npcNameplateActionLabel(npc: NpcDefinition, focus: ReturnType<typeof npcVisualFocusState>): string | undefined {
    if (focus.pending) return undefined;
    if (focus.nearby) return this.npcPromptActionLabel(npc);
    if (focus.selected) return 'R Aproximar';
    if (focus.hovered) return 'Clique Aproximar';
    return undefined;
  }

  private npcServiceDistance(npc: NpcDefinition): number | undefined {
    if (npc.zone !== this.zone) return undefined;
    const distance = this.localPlayerDistanceTo(npc.position.x, npc.position.z);
    if (!Number.isFinite(distance)) return undefined;
    return distance;
  }

  private npcServiceDistanceLabel(npc: NpcDefinition): string | undefined {
    const distance = this.npcServiceDistance(npc);
    if (distance === undefined) return undefined;
    return this.npcDistanceLabel(npc, distance);
  }

  private npcDistanceLabel(npc: Pick<NpcDefinition, 'interactRange'>, distance: number): string | undefined {
    if (!Number.isFinite(distance)) return undefined;
    if (distance <= npc.interactRange + 0.35) return 'Perto';
    return `${Math.max(1, Math.round(distance))}m`;
  }

  private npcServiceIsNearby(npc: NpcDefinition): boolean {
    const distance = this.npcServiceDistance(npc);
    return distance !== undefined && distance <= npc.interactRange + 0.35;
  }

  private npcServiceStatusLabel(npc: NpcDefinition): string | undefined {
    if (npc.kind === 'vendor') {
      const availability = this.vendorAvailability(npc);
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        vendorAvailableItems: availability.available,
        vendorAffordableItems: availability.affordable,
      });
    }

    if (npc.kind === 'healer') {
      const player = this.latestEntities.get(this.net.playerId);
      if (!player) return undefined;
      const mana = player.mana ?? 0;
      const maxMana = player.maxMana ?? 0;
      const needsService = player.hp < player.maxHp - 0.5 || mana < maxMana - 0.5;
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        healer: {
          needsService,
          canPay: this.currentCoinCount() >= HEALER_SERVICE_COST,
          cost: HEALER_SERVICE_COST,
        },
      });
    }

    if (npc.kind === 'blacksmith') {
      const action = this.blacksmithActionState();
      return buildNpcServiceStatusLabel({ kind: npc.kind, blacksmith: action });
    }

    if (npc.kind === 'trainer') {
      const player = this.latestEntities.get(this.net.playerId);
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        trainer: { unspentPoints: player?.attributes?.unspentPoints ?? 0 },
      });
    }

    if (npc.kind === 'travel') {
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        travel: { destination: npc.zone === 'dungeon' ? 'acampamento' : 'dungeon' },
      });
    }

    if (npc.kind === 'jeweler') {
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        jeweler: { blessCount: this.stackCount('jewel_bless'), requiredBless: 3 },
      });
    }

    if (npc.kind === 'banker') {
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        banker: { stashItems: this.stashStoredItemCount() },
      });
    }

    if (npc.kind === 'guard') {
      return buildNpcServiceStatusLabel({ kind: npc.kind });
    }

    return buildNpcServiceStatusLabel({ kind: npc.kind, quest: this.cachedQuest });
  }

  private vendorAvailability(npc: NpcDefinition): { available: number; affordable: number } {
    const stock = this.cachedVendorStock[npc.id];
    const coins = this.currentCoinCount();
    let available = 0;
    let affordable = 0;
    for (const item of npc.shopItems ?? []) {
      const remaining = stock && Object.prototype.hasOwnProperty.call(stock, item.id)
        ? Math.max(0, stock[item.id] ?? 0)
        : item.stock;
      if (remaining !== undefined && remaining <= 0) continue;
      available += 1;
      if (coins >= item.price) affordable += 1;
    }
    return { available, affordable };
  }

  private stashStoredItemCount(): number {
    return this.stashItemsFrom(this.cachedStash).reduce((total, item) => (
      total + (item.stackable ? item.count : 1)
    ), 0);
  }

  private updateNpcServiceDestinations(): void {
    this.hud.setNpcServiceDestinations(this.npcServiceDestinations(), this.zone);
  }

  private updateNpcMinimapMarkers(): void {
    this.hud.setNpcMinimapMarkers(this.npcMinimapMarkers());
  }

  private updateNpcPrompt(view: NpcView | null): void {
    if (!view) {
      if (!this.nearbyNpcPromptKey) return;
      this.nearbyNpcPromptKey = '';
      this.hud.hideNpcPrompt();
      return;
    }
    const pendingNpc = this.pendingInteraction?.kind === 'npc' && this.pendingInteraction.id === view.definition.id;
    const actionLabel = this.npcPromptActionLabel(view.definition, pendingNpc);
    const promptKey = `${view.definition.id}:${actionLabel}`;
    if (promptKey === this.nearbyNpcPromptKey) return;
    this.nearbyNpcPromptKey = promptKey;
    const prompt: HudNpcPrompt = {
      id: view.definition.id,
      name: view.definition.name,
      title: view.definition.title,
      kind: view.definition.kind,
      actionLabel,
    };
    this.hud.showNpcPrompt(prompt);
  }

  private npcPromptActionLabel(definition: NpcDefinition, pending = false): string {
    return npcActionLabel({
      kind: definition.kind,
      zone: definition.zone,
      quest: this.cachedQuest,
      pending,
    });
  }

  private nearestPromptNpc(): NpcView | null {
    let nearest: NpcView | null = null;
    let nearestDistance = Infinity;
    for (const view of this.npcViews.values()) {
      if (view.definition.zone !== this.zone) continue;
      const distance = this.localPlayerDistanceTo(view.definition.position.x, view.definition.position.z);
      if (distance > view.definition.interactRange + 0.55 || distance >= nearestDistance) continue;
      nearest = view;
      nearestDistance = distance;
    }
    return nearest;
  }

  private activeNpcId(): string | null {
    return this.activeVendorId ?? this.activeStashNpcId ?? this.activeQuestNpcId;
  }

  private activeNpcView(): NpcView | null {
    const id = this.activeNpcId();
    return id ? this.npcViews.get(id) ?? null : null;
  }

  private selectedNpcIsAvailable(): boolean {
    if (!this.selectedNpcId) return false;
    const view = this.npcViews.get(this.selectedNpcId);
    const available = !!view && view.definition.zone === this.zone;
    if (!available) this.setSelectedNpc(null);
    return available;
  }

  private cycleSelectedNpc(direction: number): void {
    const id = nextNpcSelectionId(this.npcServiceDestinations(), this.selectedNpcId, this.zone, direction);
    if (!id || id === this.selectedNpcId) return;
    this.setSelectedEnemy(null);
    this.setSelectedNpc(id);
    this.localAimHoldUntil = 0;
    this.lastAttackAimPoint = null;
    this.hudDirty = true;
    this.sfx.play('ui');
  }

  private questNavigationTargetNpcId(): string | null {
    return questNavigationTargetNpcId({
      quest: this.cachedQuest,
      zone: this.zone,
      npcs: this.npcs,
    });
  }

  private npcGuideTargetNpcId(sourceKind: NpcDefinition['kind']): string | null {
    return npcGuideTargetNpcId({
      sourceKind,
      zone: this.zone,
      npcs: this.npcs,
    });
  }

  private npcGuideActionLabel(view: NpcView): string {
    return this.npcGuideTargetNpcId(view.definition.kind)
      ? view.definition.dialogue?.actionLabel ?? 'Mostrar caminho'
      : 'Fechar';
  }

  private updateQuestTrackerTarget(): void {
    const targetNpcId = this.questNavigationTargetNpcId();
    const targetNpc = targetNpcId ? this.npcs.find((npc) => npc.id === targetNpcId) : null;
    this.hud.setQuestTrackerRoute(questTrackerRouteLabel(targetNpc));
    this.hud.setQuestTrackerActionable(!!targetNpcId);
  }

  private trackQuestObjective(): void {
    const id = this.questNavigationTargetNpcId();
    if (!id) return;
    this.interactWithNpc(
      id,
      true,
      canStartNpcDestinationAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() }),
    );
  }

  private interactWithNpc(id: string, runToNpc = this.isMovementRunning(), allowAutomove = true): void {
    const view = this.npcViews.get(id);
    if (!view || view.definition.zone !== this.zone) return;
    this.setSelectedNpc(id);
    const p = entityPosition(view.entity);
    this.setSelectedEnemy(null);
    this.localAimHoldUntil = 0;
    this.lastAttackAimPoint = null;
    if (this.localPlayerDistanceTo(p.x, p.z) > view.definition.interactRange) {
      if (!allowAutomove) return;
      this.closeNpcPanels();
      const approach = this.npcApproachPoint(view);
      const triggerRange = npcApproachTriggerRange({
        npc: { x: p.x, z: p.z },
        approach: { x: approach.x, z: approach.z },
        interactRange: view.definition.interactRange,
      });
      this.beginPendingInteraction({
        kind: 'npc',
        id,
        x: p.x,
        y: p.y,
        z: p.z,
        range: triggerRange,
        moveX: approach.x,
        moveY: approach.y,
        moveZ: approach.z,
      }, runToNpc);
      return;
    }
    this.cancelAutomoveIntent();
    this.openNpc(id);
  }

  private openNpc(id: string): void {
    const view = this.npcViews.get(id);
    if (!view) return;
    if (view.definition.kind === 'vendor') {
      this.openVendorNpc(view);
      return;
    }
    if (view.definition.kind === 'banker') {
      this.openBankerNpc(view);
      return;
    }
    if (view.definition.kind === 'quest') {
      this.openQuestNpc(view);
      return;
    }
    if (view.definition.kind === 'blacksmith') {
      this.openBlacksmithNpc(view);
      return;
    }
    if (view.definition.kind === 'trainer') {
      this.openTrainerNpc(view);
      return;
    }
    if (view.definition.kind === 'travel') {
      this.openTravelNpc(view);
      return;
    }
    if (view.definition.kind === 'jeweler') {
      this.openJewelerNpc(view);
      return;
    }
    if (view.definition.kind === 'guard') {
      this.openGuardNpc(view);
      return;
    }
    this.openHealerNpc(view);
  }

  private openVendorNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeNpcDialogue();
    this.closeStash();
    this.activeVendorId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    this.showVendorPanel(view);
  }

  private openBankerNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeNpcDialogue();
    this.activeStashNpcId = view.definition.id;
    this.stashTransferLocks.clear();
    this.hudDirty = true;
    this.sfx.play('ui');
    this.showStashPanel(view);
  }

  private showStashPanel(view: NpcView, status = ''): void {
    this.hud.showStash({
      id: view.definition.id,
      name: view.definition.name,
      title: view.definition.title,
      bagItems: this.stashItemsFrom(this.cachedInventory),
      stashItems: this.stashItemsFrom(this.cachedStash),
    });
    if (status) this.hud.setStashStatus(status);
  }

  private updateActiveStashPanel(status = ''): void {
    if (!this.activeStashNpcId) return;
    const view = this.npcViews.get(this.activeStashNpcId);
    if (!view) return;
    this.hud.updateStash({
      id: view.definition.id,
      name: view.definition.name,
      title: view.definition.title,
      bagItems: this.stashItemsFrom(this.cachedInventory),
      stashItems: this.stashItemsFrom(this.cachedStash),
    });
    if (status) this.hud.setStashStatus(status);
  }

  private refreshActiveStashAfterSnapshot(): void {
    if (!this.activeStashNpcId) return;
    let status = '';
    for (const [key, pending] of this.stashTransferLocks) {
      if (!this.stashTransferConfirmed(pending)) continue;
      this.stashTransferLocks.delete(key);
      this.hud.setStashItemPending(pending.itemId, pending.action, false);
      status = pending.action === 'deposit' ? 'Item guardado no banco.' : 'Item retirado do banco.';
    }
    this.updateActiveStashPanel(status);
  }

  private showVendorPanel(view: NpcView, status = ''): void {
    const sellOffer = this.unusedGearSellOffer();
    this.vendorBuyLocks.clear();
    this.vendorSellPending = null;
    this.hud.showVendor({
      id: view.definition.id,
      name: view.definition.name,
      title: view.definition.title,
      coins: this.currentCoinCount(),
      items: this.vendorShopItemsFor(view),
      sellUnusedCount: sellOffer.count,
      sellUnusedValue: sellOffer.value,
    });
    if (status) this.hud.setVendorStatus(status);
  }

  private refreshActiveVendorPanel(status = ''): void {
    if (!this.activeVendorId) return;
    const view = this.npcViews.get(this.activeVendorId);
    if (view) this.showVendorPanel(view, status);
  }

  private refreshActiveVendorAfterSnapshot(): void {
    if (!this.activeVendorId) return;
    if (this.vendorSellPending) {
      if (!this.vendorSellConfirmed()) return;
      this.refreshActiveVendorPanel('Venda concluida.');
      return;
    }
    if (this.vendorBuyLocks.size > 0) {
      if (!this.vendorBuyConfirmed()) return;
      this.refreshActiveVendorPanel('Compra concluida.');
      return;
    }
    this.refreshActiveVendorPanel();
  }

  private vendorBuyConfirmed(): boolean {
    const coins = this.currentCoinCount();
    for (const pending of this.vendorBuyLocks.values()) {
      if (coins <= pending.beforeCoins - pending.price) return true;
      const stock = this.vendorStockCount(pending.vendorId, pending.itemId);
      if (pending.beforeStock !== undefined && stock !== undefined && stock < pending.beforeStock) return true;
    }
    return false;
  }

  private vendorSellConfirmed(): boolean {
    const pending = this.vendorSellPending;
    if (!pending) return false;
    const offer = this.unusedGearSellOffer();
    return this.currentCoinCount() > pending.beforeCoins
      || offer.count < pending.beforeCount
      || offer.value < pending.beforeValue;
  }

  private vendorStockCount(vendorId: string, itemId: string): number | undefined {
    const stock = this.cachedVendorStock[vendorId];
    return stock && Object.prototype.hasOwnProperty.call(stock, itemId) ? stock[itemId] : undefined;
  }

  private vendorShopItemsFor(view: NpcView): VendorShopItem[] {
    const stock = this.cachedVendorStock[view.definition.id];
    return (view.definition.shopItems ?? []).map((item) => (
      stock && Object.prototype.hasOwnProperty.call(stock, item.id)
        ? { ...item, stock: Math.max(0, stock[item.id] ?? 0) }
        : item
    ));
  }

  private isStashableItem(item: Pick<InventoryItem, 'kind' | 'stackable' | 'equipped'>): boolean {
    if (item.kind === 'coin') return false;
    if (item.stackable) return item.kind !== 'sword';
    return item.kind === 'sword' && !item.equipped;
  }

  private stashItemsFrom(items: readonly InventoryItem[]): HudStashItem[] {
    return items
      .filter((item) => item.count > 0 && this.isStashableItem(item))
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name || itemDisplayName(item),
        icon: item.icon || itemIconFor(item.kind, item.rarity),
        count: item.count,
        stackable: item.stackable,
        rarity: item.rarity,
        upgradeLevel: item.upgradeLevel,
        damageMin: item.damageMin,
        damageMax: item.damageMax,
      }));
  }

  private stashCount(kind: ItemKind): number {
    return this.cachedStash.find((item) => item.kind === kind && item.stackable)?.count ?? 0;
  }

  private bagHasItem(itemId: string): boolean {
    return this.cachedInventory.some((item) => item.id === itemId);
  }

  private stashHasItem(itemId: string): boolean {
    return this.cachedStash.some((item) => item.id === itemId);
  }

  private stashTransferKey(itemId: string, action: 'deposit' | 'withdraw'): string {
    return `${action}:${itemId}`;
  }

  private stashTransferConfirmed(pending: StashTransferPending): boolean {
    if (!pending.stackable) {
      const bagPresent = this.bagHasItem(pending.itemId);
      const stashPresent = this.stashHasItem(pending.itemId);
      if (pending.action === 'deposit') {
        return (!bagPresent && pending.beforeBagPresent) || (stashPresent && !pending.beforeStashPresent);
      }
      return (bagPresent && !pending.beforeBagPresent) || (!stashPresent && pending.beforeStashPresent);
    }
    const bagCount = this.stackCount(pending.kind);
    const stashCount = this.stashCount(pending.kind);
    if (pending.action === 'deposit') {
      return bagCount < pending.beforeBagCount || stashCount > pending.beforeStashCount;
    }
    return bagCount > pending.beforeBagCount || stashCount < pending.beforeStashCount;
  }

  private openQuestNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: this.questDialogueActionLabel(view.definition.dialogue?.actionLabel ?? 'Acompanhar'),
      quest: this.cachedQuest,
    });
  }

  private questDialogueActionLabel(fallback: string): string {
    return buildQuestDialogueActionLabel(this.cachedQuest, this.questNavigationTargetNpcId(), fallback);
  }

  private activeQuestDialogueActionLabel(): string {
    const activeNpc = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
    const fallback = activeNpc?.definition.kind === 'quest'
      ? activeNpc.definition.dialogue?.actionLabel ?? 'Acompanhar'
      : 'Acompanhar';
    return this.questDialogueActionLabel(fallback);
  }

  private openHealerNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    const action = this.healerActionState();
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: action.label,
      actionDisabled: action.disabled,
    });
    if (action.status) this.hud.setNpcDialogueStatus(action.status);
  }

  private openBlacksmithNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    const action = this.blacksmithActionState();
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: action.label,
      actionDisabled: action.disabled,
    });
    if (action.status) this.hud.setNpcDialogueStatus(action.status);
  }

  private openTrainerNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: 'Abrir atributos',
    });
  }

  private openTravelNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: view.definition.zone === 'dungeon' ? 'Retornar ao acampamento' : 'Entrar na dungeon',
    });
  }

  private openJewelerNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    const action = this.jewelerActionState();
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: action.label,
      actionDisabled: action.disabled,
    });
    if (action.status) this.hud.setNpcDialogueStatus(action.status);
  }

  private openGuardNpc(view: NpcView): void {
    this.faceLocalPlayerAndNpc(view);
    this.closeVendor();
    this.closeStash();
    this.activeQuestNpcId = view.definition.id;
    this.hudDirty = true;
    this.sfx.play('ui');
    this.hud.showNpcDialogue({
      id: view.definition.id,
      kind: view.definition.kind,
      name: view.definition.name,
      title: view.definition.title,
      greeting: view.definition.dialogue?.greeting ?? '',
      actionLabel: this.npcGuideActionLabel(view),
    });
  }

  private closeNpcPanels(): void {
    this.trainingNpcId = null;
    this.hud.setCharacterTrainingContext(null);
    this.hudDirty = true;
    this.closeVendor();
    this.closeStash();
    this.closeNpcDialogue();
  }

  private closeVendor(): void {
    if (!this.activeVendorId) return;
    this.activeVendorId = null;
    this.vendorBuyLocks.clear();
    this.vendorSellPending = null;
    this.hudDirty = true;
    this.hud.hideVendor();
  }

  private closeStash(): void {
    if (!this.activeStashNpcId) return;
    this.activeStashNpcId = null;
    this.stashTransferLocks.clear();
    this.hudDirty = true;
    this.hud.hideStash();
  }

  private closeNpcDialogue(): void {
    if (!this.activeQuestNpcId) return;
    this.activeQuestNpcId = null;
    this.healerServicePending = false;
    this.blacksmithUpgradePending = false;
    this.travelServicePending = false;
    this.jewelerServicePending = false;
    this.hudDirty = true;
    this.hud.hideNpcDialogue();
  }

  private refreshActiveServiceDialogue(player?: EntityState): void {
    if (!this.activeQuestNpcId) return;
    const activeNpc = this.npcViews.get(this.activeQuestNpcId);
    if (activeNpc?.definition.kind === 'healer') this.refreshHealerDialogue(undefined, player);
  }

  private healerActionState(player = this.latestEntities.get(this.net.playerId)): NpcServiceActionState {
    const label = `Curar (${HEALER_SERVICE_COST} moedas)`;
    if (!player) return { label, disabled: true, status: 'Aguardando estado do personagem.' };
    const mana = player.mana ?? 0;
    const maxMana = player.maxMana ?? 0;
    const needsService = player.hp < player.maxHp - 0.5 || mana < maxMana - 0.5;
    if (!needsService) return { label: 'Vida cheia', disabled: true, status: 'Vida e mana ja estao cheias.' };
    if (this.currentCoinCount() < HEALER_SERVICE_COST) return { label, disabled: true, status: 'Moedas insuficientes.' };
    return { label, disabled: false, status: `Custo: ${HEALER_SERVICE_COST} moedas.` };
  }

  private refreshHealerDialogue(status?: string, player?: EntityState): void {
    const action = this.healerActionState(player);
    if (this.healerServicePending && !status) {
      if (action.disabled && action.label === 'Vida cheia') {
        this.healerServicePending = false;
        this.hud.setNpcDialogueActionPending(false);
        this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
        this.hud.setNpcDialogueStatus('Cura aplicada.');
      }
      return;
    }
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    this.hud.setNpcDialogueStatus(status ?? action.status ?? '');
  }

  private handleHealerService(npcId: string): void {
    if (this.healerServicePending) return;
    const action = this.healerActionState();
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    if (action.disabled) {
      this.hud.setNpcDialogueStatus(action.status ?? '');
      return;
    }

    this.healerServicePending = true;
    this.hud.setNpcDialogueActionPending(true);
    this.hud.setNpcDialogueStatus('Cura enviada ao servidor.');
    window.setTimeout(() => {
      if (!this.healerServicePending) return;
      this.healerServicePending = false;
      this.hud.setNpcDialogueActionPending(false);
      this.refreshHealerDialogue();
    }, 1200);
    this.net.send({ type: 'heal-at-npc', entityId: this.net.playerId, npcId });
  }

  private blacksmithGemKindForEquippedWeapon(): ItemKind | null {
    const weapon = this.cachedEquippedWeapon;
    if (!weapon || weapon.kind !== 'sword') return null;
    if (weapon.upgradeLevel < BLACKSMITH_BLESS_MAX_LEVEL) return 'jewel_bless';
    if (weapon.upgradeLevel < BLACKSMITH_MAX_LEVEL) return 'jewel_soul';
    return null;
  }

  private gemShortName(gem: ItemKind): string {
    return gem === 'jewel_soul' ? 'Soul' : 'Bless';
  }

  private gemFullName(gem: ItemKind): string {
    return gem === 'jewel_soul' ? 'Jewel of Soul' : 'Jewel of Bless';
  }

  private blacksmithActionState(): NpcServiceActionState {
    const weapon = this.cachedEquippedWeapon;
    if (!weapon || weapon.kind !== 'sword') {
      return { label: 'Equipe espada', disabled: true, status: 'Equipe uma espada para forjar.' };
    }
    const gem = this.blacksmithGemKindForEquippedWeapon();
    if (!gem) return { label: 'Arma no maximo', disabled: true, status: 'Esta arma ja esta no limite.' };
    const shortName = this.gemShortName(gem);
    if (this.stackCount(gem) <= 0) {
      return { label: `Precisa ${shortName}`, disabled: true, status: `Preciso de uma ${this.gemFullName(gem)}.` };
    }
    return {
      label: `Forjar com ${shortName}`,
      disabled: false,
      status: `Consome 1 ${this.gemFullName(gem)}.`,
      item: gem,
    };
  }

  private refreshBlacksmithDialogue(status?: string): void {
    const action = this.blacksmithActionState();
    this.blacksmithUpgradePending = false;
    this.hud.setNpcDialogueActionPending(false);
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    this.hud.setNpcDialogueStatus(status ?? action.status ?? '');
  }

  private handleTrainerService(): void {
    this.trainingNpcId = this.activeQuestNpcId;
    const trainer = this.trainingNpcId ? this.npcViews.get(this.trainingNpcId) : null;
    this.closeNpcDialogue();
    this.hud.setCharacterTrainingContext(trainer ? `Treino com ${trainer.definition.name}` : null);
    this.hudDirty = true;
    this.hud.showCharacterMenu();
  }

  private handleAllocateAttribute(attribute: PlayerAttribute): void {
    const trainer = this.trainingNpcId ? this.npcViews.get(this.trainingNpcId) : null;
    if (trainer && trainer.definition.zone === this.zone) {
      const p = entityPosition(trainer.entity);
      const inRange = this.localPlayerDistanceTo(p.x, p.z) <= trainer.definition.interactRange + 0.75;
      if (inRange) {
        this.net.send({
          type: 'train-attribute-at-npc',
          entityId: this.net.playerId,
          npcId: trainer.definition.id,
          attribute,
        });
        return;
      }
    }
    this.trainingNpcId = null;
    this.hud.setCharacterTrainingContext(null);
    this.hudDirty = true;
    this.net.send({
      type: 'allocate-attribute',
      entityId: this.net.playerId,
      attribute,
    });
  }

  private handleTravelService(npcId: string): void {
    if (this.travelServicePending) return;
    this.travelServicePending = true;
    this.hud.setNpcDialogueActionPending(true);
    const view = this.npcViews.get(npcId);
    this.hud.setNpcDialogueStatus(view?.definition.zone === 'dungeon' ? 'Retorno enviado ao servidor.' : 'Passagem enviada ao servidor.');
    window.setTimeout(() => {
      this.travelServicePending = false;
      this.hud.setNpcDialogueActionPending(false);
    }, 1200);
    this.net.send({ type: 'travel-at-npc', entityId: this.net.playerId, npcId });
  }

  private jewelerActionState(): NpcServiceActionState {
    const blessCount = this.stackCount('jewel_bless');
    if (blessCount < 3) {
      return { label: 'Precisa 3 Bless', disabled: true, status: `Bless na mochila: ${blessCount}/3.` };
    }
    return { label: 'Transmutar 3 Bless', disabled: false, status: 'Converte 3 Bless em 1 Soul.' };
  }

  private refreshJewelerDialogue(status?: string): void {
    const action = this.jewelerActionState();
    this.jewelerServicePending = false;
    this.hud.setNpcDialogueActionPending(false);
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    this.hud.setNpcDialogueStatus(status ?? action.status ?? '');
  }

  private handleJewelerService(npcId: string): void {
    if (this.jewelerServicePending) return;
    const action = this.jewelerActionState();
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    if (action.disabled) {
      this.hud.setNpcDialogueStatus(action.status ?? '');
      return;
    }
    this.jewelerServicePending = true;
    this.hud.setNpcDialogueActionPending(true);
    this.hud.setNpcDialogueStatus('Lapidacao enviada ao servidor.');
    window.setTimeout(() => {
      if (!this.jewelerServicePending) return;
      this.jewelerServicePending = false;
      this.hud.setNpcDialogueActionPending(false);
      this.refreshJewelerDialogue();
    }, 1200);
    this.net.send({ type: 'transmute-at-npc', entityId: this.net.playerId, npcId });
  }

  private stackCount(kind: ItemKind): number {
    return this.cachedInventory.find((item) => item.kind === kind && item.stackable)?.count ?? 0;
  }

  private handleBlacksmithUpgrade(npcId: string): void {
    if (this.blacksmithUpgradePending) return;
    const action = this.blacksmithActionState();
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    if (action.disabled || !action.item) {
      this.hud.setNpcDialogueStatus(action.status ?? '');
      return;
    }

    this.blacksmithUpgradePending = true;
    this.hud.setNpcDialogueActionPending(true);
    this.hud.setNpcDialogueStatus('Forja enviada ao servidor.');
    window.setTimeout(() => {
      if (!this.blacksmithUpgradePending) return;
      this.blacksmithUpgradePending = false;
      this.hud.setNpcDialogueActionPending(false);
      this.refreshBlacksmithDialogue();
    }, 1200);
    this.net.send({ type: 'upgrade-at-npc', entityId: this.net.playerId, npcId, item: action.item });
  }

  private handleVendorBuy(vendorId: string, itemId: string): void {
    if (vendorId !== this.activeVendorId) return;
    const view = this.npcViews.get(vendorId);
    const item = view?.definition.shopItems?.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const buyKey = `${vendorId}:${itemId}`;
    if (this.vendorBuyLocks.has(buyKey)) return;
    if (this.currentCoinCount() < item.price) {
      this.sfx.play('ui');
      this.hud.setVendorStatus('Moedas insuficientes.');
      return;
    }
    this.sfx.play('ui');
    this.vendorBuyLocks.set(buyKey, {
      vendorId,
      itemId,
      price: item.price,
      beforeCoins: this.currentCoinCount(),
      beforeStock: item.stock,
    });
    this.hud.setVendorItemPending(itemId, true);
    window.setTimeout(() => {
      const stillAwaitingServer = this.vendorBuyLocks.has(buyKey);
      this.vendorBuyLocks.delete(buyKey);
      this.hud.setVendorItemPending(itemId, false);
      if (stillAwaitingServer && this.activeVendorId === vendorId) {
        this.hud.setVendorStatus('Sem confirmacao do servidor. Aproxime-se do vendedor e tente novamente.');
      }
    }, 1200);
    this.net.send({ type: 'buy-vendor-item', entityId: this.net.playerId, vendorId, itemId });
    if (item.stock !== undefined) {
      this.hud.setVendorStatus('Compra enviada. Aguardando estoque do servidor.');
    } else {
      this.hud.setVendorStatus('Compra enviada ao servidor.');
    }
  }

  private unusedGearSellOffer(): { count: number; value: number } {
    let count = 0;
    let value = 0;
    for (const item of this.cachedInventory) {
      if (item.kind !== 'sword' || item.stackable || item.equipped) continue;
      count++;
      value += this.weaponSellValue(item);
    }
    return { count, value };
  }

  private weaponSellValue(item: InventoryItem): number {
    const baseByRarity: Record<string, number> = {
      comum: 18,
      incomum: 34,
      raro: 58,
      epico: 95,
      lendario: 150,
    };
    const base = baseByRarity[item.rarity ?? 'comum'] ?? 18;
    const upgrade = (item.upgradeLevel ?? 0) * 6;
    const magic = (item.magicDamageMax ?? 0) * 2;
    const spread = item.damageMax !== undefined && item.damageMin !== undefined
      ? Math.max(0, Math.floor((item.damageMax - item.damageMin) / 2))
      : 0;
    return Math.max(1, base + upgrade + magic + spread);
  }

  private handleVendorSellUnused(vendorId: string): void {
    if (vendorId !== this.activeVendorId) return;
    const offer = this.unusedGearSellOffer();
    if (offer.count <= 0 || offer.value <= 0) {
      this.sfx.play('ui');
      this.hud.setVendorStatus('Nenhum equipamento sobrando para vender.');
      return;
    }
    this.sfx.play('ui');
    this.vendorSellPending = {
      beforeCoins: this.currentCoinCount(),
      beforeCount: offer.count,
      beforeValue: offer.value,
    };
    this.hud.setVendorSellPending(true);
    this.hud.setVendorStatus('Venda enviada ao servidor.');
    window.setTimeout(() => {
      if (this.activeVendorId === vendorId && this.vendorSellPending) {
        this.vendorSellPending = null;
        this.hud.setVendorSellPending(false);
        this.hud.setVendorStatus('Sem confirmacao do servidor. Aproxime-se do vendedor e tente novamente.');
      }
    }, 1200);
    this.net.send({ type: 'sell-unused-gear-at-vendor', entityId: this.net.playerId, vendorId });
  }

  private handleStashTransfer(npcId: string, item: HudStashItem, action: 'deposit' | 'withdraw'): void {
    if (npcId !== this.activeStashNpcId || !this.isStashableItem(item)) return;
    const available = item.stackable
      ? (action === 'deposit' ? this.stackCount(item.kind) : this.stashCount(item.kind)) > 0
      : (action === 'deposit' ? this.bagHasItem(item.id) : this.stashHasItem(item.id));
    if (!available) {
      this.sfx.play('ui');
      this.hud.setStashStatus(action === 'deposit' ? 'Nada desse item na mochila.' : 'Nada desse item no banco.');
      return;
    }
    const key = this.stashTransferKey(item.id, action);
    if (this.stashTransferLocks.has(key)) return;
    this.sfx.play('ui');
    this.stashTransferLocks.set(key, {
      kind: item.kind,
      itemId: item.id,
      stackable: item.stackable,
      action,
      beforeBagCount: this.stackCount(item.kind),
      beforeStashCount: this.stashCount(item.kind),
      beforeBagPresent: this.bagHasItem(item.id),
      beforeStashPresent: this.stashHasItem(item.id),
    });
    this.hud.setStashItemPending(item.id, action, true);
    this.hud.setStashStatus(action === 'deposit' ? 'Deposito enviado ao servidor.' : 'Retirada enviada ao servidor.');
    window.setTimeout(() => {
      const pending = this.stashTransferLocks.get(key);
      if (!pending) return;
      this.stashTransferLocks.delete(key);
      this.hud.setStashItemPending(item.id, action, false);
      if (this.activeStashNpcId === npcId) {
        this.hud.setStashStatus('Sem confirmacao do servidor. Aproxime-se da banqueira e tente novamente.');
      }
    }, 1200);
    if (action === 'deposit') {
      if (item.stackable) {
        this.net.send({ type: 'deposit-stash-item', entityId: this.net.playerId, npcId, item: item.kind });
      } else {
        this.net.send({ type: 'deposit-stash-item', entityId: this.net.playerId, npcId, itemId: item.id });
      }
    } else if (item.stackable) {
      this.net.send({ type: 'withdraw-stash-item', entityId: this.net.playerId, npcId, item: item.kind });
    } else {
      this.net.send({ type: 'withdraw-stash-item', entityId: this.net.playerId, npcId, itemId: item.id });
    }
  }

  private currentCoinCount(): number {
    return this.cachedInventory.find((item) => item.kind === 'coin' && item.stackable)?.count ?? 0;
  }

  private faceLocalPlayerAndNpc(npc: NpcView): void {
    const player = this.views.get(this.net.playerId);
    if (!player) return;
    const pp = entityPosition(player.entity);
    const np = entityPosition(npc.entity);
    const playerYaw = yawTowardPoint(pp, np);
    if (playerYaw !== null) setYaw(player.entity, playerYaw);
    const npcYaw = yawTowardPoint(np, pp);
    if (npcYaw !== null) setYaw(npc.entity, npcYaw);
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
    view.offhandKey = undefined;
    view.offhandAnchor = undefined;
    view.helmetKey = undefined;
    view.helmetAnchor = undefined;
    view.armorKey = undefined;
    view.armorAnchor = undefined;
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
      view.offhandKey = undefined;
      view.helmetKey = undefined;
      view.armorKey = undefined;
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

    if (!weapon || !isWeaponKind(weapon.kind)) return;
    // Armas 2H (espadao/machado duplo/martelo) sao desenhadas maiores.
    const worldLength = isTwoHandedKind(weapon.kind) ? WEAPON_WORLD_LENGTH * TWO_HANDED_LENGTH_MULTIPLIER : WEAPON_WORLD_LENGTH;
    const socketParent = findDescendantEntity(view.visual, WEAPON_SOCKET_BONE_NAMES);
    const attachToBone = !!socketParent;
    const inheritedScale = attachToBone ? maxWorldScale(socketParent) : 1;
    const localWeaponLength = worldLength / inheritedScale;
    const anchor = makeEntity('weapon-anchor', this.world.app);
    (socketParent ?? view.visual).addChild(anchor);
    if (attachToBone) {
      anchor.setLocalPosition(0, 0, 0);
      anchor.setLocalEulerAngles(0, 0, -90);
    }
    view.weaponAnchor = anchor;
    view.weaponAttachedToBone = attachToBone;
    view.weaponGlowLength = localWeaponLength;
    void this.world.models.instantiate(lootModelUrlFor(weapon.kind, weapon.rarity)).then((model) => {
      if (view.equippedWeaponKey !== key || !view.entity.parent || view.weaponAnchor !== anchor || !anchor.parent) {
        destroyEntity(model);
        return;
      }
      model.name = 'equipped-weapon';
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      fitWeaponToGrip(model, worldLength, WEAPON_GRIP_FROM_BOTTOM, inheritedScale);
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

  /**
   * Gear extra no CORPO: segunda arma na mao esquerda (dual wield), elmo na
   * cabeca e peitoral no tronco. Sem estagios de glow (a arma principal cobre
   * o show) — as pecas sao anexadas ao osso com escala compensada.
   */
  private syncViewGearExtras(view: View, entity: EntityState): void {
    this.syncBodyAttachment(view, 'offhand', entity.offhandWeapon ?? null);
    this.syncBodyAttachment(view, 'helmet', entity.helmetVisual ?? null);
    this.syncBodyAttachment(view, 'armor', entity.armorVisual ?? null);
  }

  private syncBodyAttachment(view: View, slot: 'offhand' | 'helmet' | 'armor', visual: EquippedWeaponVisualState | null): void {
    const key = this.equippedWeaponKeyFor(visual);
    const currentKey = slot === 'offhand' ? view.offhandKey : slot === 'helmet' ? view.helmetKey : view.armorKey;
    if (key === currentKey) return;
    const anchorField = slot === 'offhand' ? 'offhandAnchor' : slot === 'helmet' ? 'helmetAnchor' : 'armorAnchor';
    destroyEntity(view[anchorField]);
    view[anchorField] = undefined;
    if (slot === 'offhand') view.offhandKey = key;
    else if (slot === 'helmet') view.helmetKey = key;
    else view.armorKey = key;
    if (!visual) return;

    const boneNames = slot === 'offhand' ? OFFHAND_SOCKET_BONE_NAMES : slot === 'helmet' ? HEAD_SOCKET_BONE_NAMES : CHEST_SOCKET_BONE_NAMES;
    const socketParent = findDescendantEntity(view.visual, boneNames);
    if (!socketParent) {
      // Rig sem o osso correspondente: pula silenciosamente (sem fallback no
      // chao dos pes — melhor nao desenhar do que desenhar errado).
      return;
    }
    const inheritedScale = maxWorldScale(socketParent);
    const anchor = makeEntity(`gear-${slot}-anchor`, this.world.app);
    socketParent.addChild(anchor);
    anchor.setLocalPosition(0, 0, 0);
    if (slot === 'offhand') {
      // Espelha o anchor da mao direita (que usa -90).
      anchor.setLocalEulerAngles(0, 0, 90);
    }
    view[anchorField] = anchor;

    void this.world.models.instantiate(lootModelUrlFor(visual.kind, visual.rarity)).then((model) => {
      const stillCurrent = (slot === 'offhand' ? view.offhandKey : slot === 'helmet' ? view.helmetKey : view.armorKey) === key;
      if (!stillCurrent || view[anchorField] !== anchor || !anchor.parent) {
        destroyEntity(model);
        return;
      }
      model.name = `gear-${slot}`;
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      if (slot === 'offhand') {
        fitWeaponToGrip(model, WEAPON_WORLD_LENGTH, WEAPON_GRIP_FROM_BOTTOM, inheritedScale);
      } else {
        const safeScale = Math.max(inheritedScale, 0.0001);
        const target = (slot === 'helmet' ? HELMET_WORLD_SIZE : CHEST_ARMOR_WORLD_SIZE) / safeScale;
        const bounds = fitEntityToLargest(model, target);
        if (bounds && slot === 'armor') {
          // Centraliza o peitoral verticalmente no osso do tronco.
          const scale = target / bounds.largest;
          model.setLocalPosition(-bounds.center.x * scale, -bounds.center.y * scale, -bounds.center.z * scale);
        }
      }
      anchor.addChild(model);
    }).catch((error) => {
      console.warn(`[Game] falha ao anexar gear (${slot}):`, error);
    });
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
        // Labels menores: com varios drops no chao durante combate, o texto
        // grande poluia a cena e "escondia" os inimigos atras.
        label.el.style.font = "700 10.5px/1.1 ui-sans-serif,system-ui,sans-serif";
        label.el.style.opacity = '0.92';
        view = {
          entity,
          label,
          labelColor,
          labelText: item.name,
          rarityGlowScale: 1,
          baseY: item.position.y,
          phase: this.lootViews.size * 0.9,
        };
        this.lootViews.set(item.id, view);
        this.playNotableLootSound(item);
        void this.replaceLootModel(entity, item.modelUrl);
      }
      view.baseY = item.position.y;
      view.labelText = item.name;
      this.syncLootRarityVisual(view, item);
      setEntityPosition(view.entity, { x: item.position.x, y: item.position.y, z: item.position.z });
    }

    for (const [id, view] of this.lootViews) {
      if (seen.has(id)) continue;
      view.label.dispose();
      this.disposeLootRarityVisual(view);
      destroyEntity(view.entity);
      this.lootViews.delete(id);
      this.notableLootSoundIds.delete(id);
    }
  }

  private playNotableLootSound(item: LootState): void {
    if (!this.lootAccentColor(item)) return;
    if (this.notableLootSoundIds.has(item.id)) return;
    this.notableLootSoundIds.add(item.id);
    this.sfx.play('rare-loot');
  }

  private syncLootRarityVisual(view: LootView, item: LootState): void {
    const accentColor = this.lootAccentColor(item);
    const key = accentColor ? `${accentColor}:${item.rarity ?? ''}:${item.glowGem ?? ''}:${item.element ?? ''}` : '';
    if (view.rarityAccentKey === key) return;
    this.disposeLootRarityVisual(view);
    view.rarityAccentKey = key;
    view.rarityGlowScale = item.rarity ? RARITY_GLOW_SCALE[item.rarity] : item.glowGem ? 1.12 : 1;
    if (!accentColor) return;

    const color = colorFromCss(accentColor);
    const ringMaterial = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 0.95,
      opacity: item.rarity === 'lendario' ? 0.48 : item.rarity === 'epico' ? 0.4 : 0.32,
      additive: true,
      unlit: true,
    });
    const ringScale = 0.78 * view.rarityGlowScale;
    view.rarityRing = this.world.createPrimitive('loot-rarity-ring', 'torus', ringMaterial, { x: 0, y: 0.06, z: 0 }, { x: ringScale, y: 0.018, z: ringScale });
    this.world.root.addChild(view.rarityRing);
    view.rarityRingMaterial = ringMaterial;

    if (item.rarity === 'epico' || item.rarity === 'lendario' || item.glowGem) {
      const light = makeEntity('loot-rarity-light', this.world.app);
      light.addComponent('light', {
        type: 'omni',
        color,
        intensity: item.rarity === 'lendario' ? 0.85 : 0.56,
        range: item.rarity === 'lendario' ? 3.4 : 2.6,
        falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
      });
      this.world.root.addChild(light);
      view.rarityLight = light;
    }
  }

  private disposeLootRarityVisual(view: LootView): void {
    destroyEntity(view.rarityRing);
    destroyEntity(view.rarityLight);
    view.rarityRingMaterial?.destroy();
    view.rarityRing = undefined;
    view.rarityLight = undefined;
    view.rarityRingMaterial = undefined;
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
      if (view.rarityRing) {
        const pulse = 1 + (Math.sin(this.elapsed * 3.2 + view.phase) + 1) * 0.045;
        const ringScale = 0.78 * view.rarityGlowScale * pulse;
        view.rarityRing.setLocalPosition(p.x, view.baseY + 0.08, p.z);
        view.rarityRing.setLocalScale(ringScale, 0.018, ringScale);
      }
      if (view.rarityLight) view.rarityLight.setLocalPosition(p.x, view.baseY + 0.7, p.z);
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

  private lootAccentColor(item: LootState): string | null {
    if (item.element === 'fire') return '#ff7a2f';
    if (item.glowGem) return glowColorForGem(item.glowGem);
    if (!item.rarity || item.rarity === 'comum') return null;
    return RARITY_COLORS[item.rarity];
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
        if (event.skill === 'charge') {
          this.sfx.play('hit-physical');
          this.showChargeTrail(event.position, event.casterId, event.radius);
          this.showHitImpact(event.position, 'physical');
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
      this.showDamageText(event.amount, event.position, event.critical ? 'critical' : event.damageKind);
      this.showHitImpact(event.position, event.damageKind);
    }
    if (this.seenCombatEvents.size > 256) {
      const keep = new Set(events.map((event) => event.id));
      for (const id of this.seenCombatEvents) if (!keep.has(id)) this.seenCombatEvents.delete(id);
    }
  }

  private syncPartyEvents(events: readonly PartyEvent[]): void {
    for (const event of events) {
      if (this.seenPartyEvents.has(event.id)) continue;
      this.seenPartyEvents.add(event.id);
      if (event.message) this.hud.pushSystemMessage(event.message);
    }
    if (this.seenPartyEvents.size > 128) {
      const keep = new Set(events.map((event) => event.id));
      for (const id of this.seenPartyEvents) if (!keep.has(id)) this.seenPartyEvents.delete(id);
    }
  }

  private syncPartyPresentation(party: PartyState | null | undefined): void {
    const next = new Set<string>();
    for (const member of party?.members ?? []) {
      if (member.id === this.net.playerId || !member.online) continue;
      next.add(member.id);
    }

    this.partyMemberIds.clear();
    for (const id of next) this.partyMemberIds.add(id);

    for (const id of next) {
      if (this.partyBadges.has(id)) continue;
      const badge = new WorldLabel(this.uiLayer, 'party-badge', 'Grupo', '#8fe6ff');
      badge.el.style.font = "900 10px/1 'Segoe UI', system-ui, sans-serif";
      badge.el.style.zIndex = '11';
      this.partyBadges.set(id, badge);
    }
    for (const [id, badge] of this.partyBadges) {
      if (next.has(id)) continue;
      badge.dispose();
      this.partyBadges.delete(id);
    }
  }

  private syncChatMessages(messages: readonly ChatMessageState[]): void {
    for (const message of messages) {
      if (this.seenChatMessages.has(message.id)) continue;
      this.seenChatMessages.add(message.id);
      this.hud.pushChatMessage(message, this.net.playerId);
      this.showSpeechBubble(message);
    }
    if (this.seenChatMessages.size > 160) {
      const keep = new Set(messages.map((message) => message.id));
      for (const id of this.seenChatMessages) if (!keep.has(id)) this.seenChatMessages.delete(id);
    }
  }

  private showSpeechBubble(message: ChatMessageState): void {
    const tone = chatBubbleToneFor(message.channel);
    if (!tone) return;
    for (let i = this.speechBubbles.length - 1; i >= 0; i--) {
      if (this.speechBubbles[i].entityId !== message.senderId) continue;
      this.speechBubbles[i].dispose();
      this.speechBubbles.splice(i, 1);
    }
    if (this.speechBubbles.length >= MAX_SPEECH_BUBBLES) this.speechBubbles.shift()?.dispose();
    this.speechBubbles.push(new SpeechBubble(this.uiLayer, message.senderId, message.message, tone));
  }

  private updateSpeechBubbles(dt: number): void {
    for (let i = this.speechBubbles.length - 1; i >= 0; i--) {
      const bubble = this.speechBubbles[i];
      const anchor = this.speechBubbleAnchor(bubble.entityId);
      if (!anchor || bubble.update(dt, this.world, anchor)) {
        if (!anchor) bubble.dispose();
        this.speechBubbles.splice(i, 1);
      }
    }
  }

  private speechBubbleAnchor(entityId: string): Vec3Like | null {
    const view = this.views.get(entityId);
    if (view) {
      const p = entityPosition(view.entity);
      const scale = view.entity.getLocalScale().x || 1;
      return { x: p.x, y: p.y + 2.45 * scale, z: p.z };
    }
    const state = this.latestEntities.get(entityId);
    if (!state) return null;
    return { x: state.position.x, y: state.position.y + 2.45, z: state.position.z };
  }

  private showDamageText(amount: number, position: Vec3Like, damageKind: DamageKind | 'critical'): void {
    // Numero de dano flutuante (apresentacao; client-side). O backend manda
    // valores com fracao (Round2, ex.: 14.85) — arredonda para leitura.
    this.showCombatText(Math.round(amount), position, damageKind);
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

  private showChargeTrail(position: Vec3Like, casterId: string, radius: number): void {
    const casterView = this.views.get(casterId);
    const casterState = this.latestEntities.get(casterId);
    // Direcao real do dash: o evento chega no mesmo snapshot que teleporta o
    // caster e syncCombatEvents roda ANTES do reconcile, entao a view ainda
    // esta na posicao de origem. O vetor origem->pouso da a direcao exata;
    // o yaw da view seria o do frame anterior (errado p/ alvo lateral/atras).
    let yaw = casterView ? entityYaw(casterView.entity) : casterState?.rotationY ?? 0;
    // Rastro cobre o trajeto REAL do dash (origem -> pouso): com o range maior
    // da Investida um comprimento fixo ficava invisivel em dashes longos.
    let dashLength = 0;
    if (casterView) {
      const from = casterView.entity.getPosition();
      const dx = position.x - from.x;
      const dz = position.z - from.z;
      const lengthSq = dx * dx + dz * dz;
      if (lengthSq > 0.04) {
        yaw = Math.atan2(dx, dz);
        dashLength = Math.sqrt(lengthSq);
      }
    }
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const sideX = Math.cos(yaw);
    const sideZ = -Math.sin(yaw);
    const color = colorFromCss(CHARGE_TRAIL_COLOR);
    const segments: ChargeTrailSegment[] = [];

    const span = Math.max(2.3, Math.min(dashLength * 0.92, 13.5));
    const count = Math.max(CHARGE_TRAIL_SEGMENTS, Math.min(14, Math.round(span / 0.62)));
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0;
      const offset = 0.36 + t * (span - 0.36);
      const side = (i % 2 === 0 ? 1 : -1) * (0.05 + t * 0.26);
      const opacity = Math.max(0.14, 0.44 - t * 0.28);
      const scale = {
        x: 0.16 + t * 0.13,
        y: 0.028,
        z: 0.52 + t * 0.85,
      };
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.25,
        opacity,
        additive: true,
        unlit: true,
      });
      const entity = this.world.createPrimitive(
        'charge-trail',
        'box',
        material,
        {
          x: position.x - dirX * offset + sideX * side,
          y: position.y + 0.11 + i * 0.008,
          z: position.z - dirZ * offset + sideZ * side,
        },
        scale,
      );
      setYaw(entity, yaw);
      segments.push({ entity, material, opacity, scale });
    }

    this.effects.push(new ChargeTrailEffect(segments, CHARGE_TRAIL_DURATION));

    const ringColor = colorFromCss('#ffe09a');
    const ringMaterial = createMaterial(ringColor, {
      emissive: ringColor,
      emissiveIntensity: 1.45,
      opacity: 0.48,
      additive: true,
      unlit: true,
    });
    const startRadius = Math.max(0.48, radius * 0.34);
    const endRadius = Math.max(1.1, radius * 0.92);
    const ring = this.world.createPrimitive(
      'charge-impact-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.075, z: position.z },
      { x: startRadius, y: 0.024, z: startRadius },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.34, startRadius, endRadius, 0.024));
    // Shake so quando a Investida e do proprio jogador: sem o filtro, cada
    // charge de outros players proximos sacudia a camera de todo mundo.
    if (casterId === this.net.playerId) this.world.rig.addShake(0.18);
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
    for (const [id, view] of this.views) {
      if (view.healthBar) {
        view.healthBar.setPartyMember(this.partyMemberIds.has(id));
        const p = entityPosition(view.entity);
        view.healthBar.setWorldPosition(p.x, p.y + ENEMY_HEALTH_BAR_HEIGHT * view.entity.getLocalScale().x, p.z);
        view.healthBar.update(this.world, view.entity.enabled);
      }
    }
    for (const [id, badge] of this.partyBadges) {
      const view = this.views.get(id);
      if (!view || !view.entity.enabled) {
        badge.el.style.display = 'none';
        continue;
      }
      const p = entityPosition(view.entity);
      const scale = view.entity.getLocalScale().x || 1;
      badge.setWorldPosition(p.x, p.y + 3.05 * scale, p.z);
      badge.update(this.world);
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

  private findNpcNear(point: Vec3Like): string | null {
    let id: string | null = null;
    let best = 1.8;
    for (const [npcId, view] of this.npcViews) {
      if (view.definition.zone !== this.zone) continue;
      const p = entityPosition(view.entity);
      const distance = Math.hypot(p.x - point.x, p.z - point.z);
      if (distance < best) {
        best = distance;
        id = npcId;
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
    if (id) this.setSelectedNpc(null);
    if (id === this.selectedEnemyId) return;
    this.selectedEnemyId = id;
    this.hudDirty = true;
  }

  private setSelectedNpc(id: string | null): void {
    if (id === this.selectedNpcId) return;
    this.selectedNpcId = id;
    this.hudDirty = true;
  }

  private isKeyboardMovementActive(): boolean {
    const axes = this.effectiveMoveAxes();
    return axes.strafe !== 0 || axes.forward !== 0;
  }

  private effectiveMoveAxes(): { strafe: number; forward: number } {
    const manualAxes = this.input.getMoveAxes();
    return {
      strafe: manualAxes.strafe,
      forward: this.autorunActive && manualAxes.forward === 0 ? 1 : manualAxes.forward,
    };
  }

  private isMovementRunning(): boolean {
    return this.input.running || this.autorunActive;
  }

  private createNpcApproachPreviewMarker(): pc.Entity {
    const marker = this.world.createPrimitive(
      'npc-approach-preview-marker',
      'torus',
      this.npcApproachPreviewMaterial(false, 'vendor'),
      { x: 0, y: 0, z: 0 },
      { x: 0.52, y: 0.018, z: 0.52 },
    );
    marker.enabled = false;
    return marker;
  }

  private npcApproachPreviewMaterial(selected: boolean, kind: NpcDefinition['kind']): pc.StandardMaterial {
    return this.world.material(
      `npc-approach-preview-${selected ? 'selected' : 'hovered'}-${kind}`,
      npcServiceAccentHex(kind),
      { opacity: selected ? 0.72 : 0.52, additive: true, unlit: true },
    );
  }

  private updateNpcApproachPreview(): void {
    const pendingNpcId = this.pendingInteraction?.kind === 'npc' ? this.pendingInteraction.id : null;
    const id = npcApproachPreviewTargetId({
      hoveredNpcId: this.hoveredNpcId,
      selectedNpcId: this.selectedNpcId,
      pendingNpcId,
      activeNpcId: this.activeNpcId(),
      automoveActive: !!this.clickMoveTarget,
    });
    if (!id) {
      this.npcApproachPreviewMarker.enabled = false;
      return;
    }

    const view = this.npcViews.get(id);
    const available = !!view && view.definition.zone === this.zone;
    const distanceToNpc = view ? this.localPlayerDistanceTo(view.definition.position.x, view.definition.position.z) : Infinity;
    if (!view || !shouldShowNpcApproachPreview({
      targetAvailable: available,
      distanceToNpc,
      interactRange: view.definition.interactRange,
    })) {
      this.npcApproachPreviewMarker.enabled = false;
      return;
    }

    const approach = this.npcApproachPoint(view);
    const player = this.views.get(this.net.playerId)?.entity;
    const selected = this.selectedNpcId === id;
    const pulse = 1 + (Math.sin(this.elapsed * 4.8) + 1) * (selected ? 0.075 : 0.055);
    const baseScale = selected ? 0.66 : 0.54;
    this.npcApproachPreviewMarker.enabled = true;
    if (this.npcApproachPreviewMarker.render) {
      this.npcApproachPreviewMarker.render.material = this.npcApproachPreviewMaterial(selected, view.definition.kind);
    }
    this.npcApproachPreviewMarker.setLocalPosition(approach.x, approach.y + 0.09, approach.z);
    this.npcApproachPreviewMarker.setLocalScale(baseScale * pulse, 0.018, baseScale * pulse);
    if (!player) return;

    const playerPosition = entityPosition(player);
    const path = findLocalPath(
      { x: playerPosition.x, y: 0, z: playerPosition.z },
      { x: approach.x, y: approach.y, z: approach.z },
      this.localNavigationBlockers(),
      this.moveBound,
    ).map((point) => ({
      x: point.x,
      y: this.heightForMove(point.x, point.z),
      z: point.z,
    }));
    const samples = samplePathGuidancePoints(
      { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
      path.length > 0 ? path : [approach],
      PATH_GUIDANCE_SPACING,
      NPC_APPROACH_PREVIEW_MAX_POINTS,
    );
    this.renderPathGuidanceSamples(samples, 'preview', view.definition.kind);
  }

  private updatePathGuidance(): void {
    const target = this.clickMoveTarget;
    const player = this.views.get(this.net.playerId);
    if (!target || !player) {
      this.hidePathGuidance();
      return;
    }

    const playerPosition = entityPosition(player.entity);
    const samples = samplePathGuidancePoints(
      { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
      target.path,
      PATH_GUIDANCE_SPACING,
      PATH_GUIDANCE_MAX_POINTS,
    );
    if (samples.length === 0) {
      this.hidePathGuidance();
      return;
    }

    const kind: PathGuidanceKind = this.pendingInteraction ? 'interact' : 'move';
    const npcKind = this.pendingInteraction?.kind === 'npc'
      ? this.npcViews.get(this.pendingInteraction.id)?.definition.kind
      : undefined;
    this.renderPathGuidanceSamples(samples, kind, npcKind);
  }

  private renderPathGuidanceSamples(
    samples: readonly PathGuidancePoint[],
    kind: PathGuidanceKind,
    npcKind?: NpcDefinition['kind'],
  ): void {
    const material = this.pathGuidanceMaterial(kind, npcKind);
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const marker = this.ensurePathGuidanceMarker(i);
      marker.enabled = true;
      if (marker.render) marker.render.material = material;
      const wave = (Math.sin(this.elapsed * 5.2 + i * 0.72) + 1) * 0.5;
      const baseScale = sample.terminal
        ? kind === 'interact' ? 0.48 : kind === 'preview' ? 0.32 : 0.4
        : (kind === 'preview' ? 0.13 : 0.18) + Math.min(i, 5) * (kind === 'preview' ? 0.018 : 0.025);
      const scale = baseScale * (1 + wave * (kind === 'preview' ? 0.16 : 0.22));
      marker.setLocalPosition(sample.x, sample.y + (sample.terminal ? 0.085 : 0.065), sample.z);
      marker.setLocalScale(scale, 0.018, scale);
    }

    for (let i = samples.length; i < this.pathGuidanceMarkers.length; i++) {
      this.pathGuidanceMarkers[i].enabled = false;
    }
  }

  private ensurePathGuidanceMarker(index: number): pc.Entity {
    let marker = this.pathGuidanceMarkers[index];
    if (!marker) {
      marker = this.world.createPrimitive(
        'path-guidance-marker',
        'torus',
        this.pathGuidanceMaterial('move'),
        { x: 0, y: 0, z: 0 },
        { x: 0.2, y: 0.018, z: 0.2 },
      );
      marker.enabled = false;
      this.pathGuidanceMarkers[index] = marker;
    }
    return marker;
  }

  private pathGuidanceMaterial(kind: PathGuidanceKind, npcKind?: NpcDefinition['kind']): pc.StandardMaterial {
    if (kind === 'interact') {
      return this.world.material(
        `path-guidance-interact-${npcKind ?? 'generic'}`,
        npcKind ? npcServiceAccentHex(npcKind) : 0xffd874,
        { opacity: 0.78, additive: true, unlit: true },
      );
    }
    if (kind === 'preview') {
      return this.world.material(
        `path-guidance-preview-${npcKind ?? 'generic'}`,
        npcKind ? npcServiceAccentHex(npcKind) : 0xd7e3ef,
        { opacity: 0.44, additive: true, unlit: true },
      );
    }
    return this.world.material('path-guidance-move', 0x6cff8a, { opacity: 0.66, additive: true, unlit: true });
  }

  private hidePathGuidance(): void {
    for (const marker of this.pathGuidanceMarkers) marker.enabled = false;
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
      const baseScale = this.targetMarkerKind === 'interact' ? 0.72 : 0.58;
      const pulse = this.targetMarkerKind === 'interact' ? 1.08 : 0.8;
      const scale = baseScale * (1 + (1 - t) * pulse);
      this.targetMarker.setLocalScale(scale, 0.025, scale);
    } else {
      this.targetMarker.enabled = false;
    }
  }

  private setTargetMarkerKind(kind: TargetMarkerKind): void {
    if (kind === this.targetMarkerKind) return;
    this.targetMarkerKind = kind;
    const material = kind === 'interact'
      ? this.world.material('target-marker-interact', 0xffd874, { opacity: 0.9, additive: true, unlit: true })
      : this.world.material('target-marker-move', 0x6cff8a, { opacity: 0.86, additive: true, unlit: true });
    if (this.targetMarker.render) this.targetMarker.render.material = material;
  }

  private showMarker(x: number, y: number, z: number, kind: TargetMarkerKind): void {
    this.setTargetMarkerKind(kind);
    this.targetMarker.setLocalPosition(x, y + 0.05, z);
    this.markerTimer = MARKER_DURATION;
  }

  private syncZone(zone: WorldZone): void {
    if (zone === this.zone) return;
    this.zone = zone;
    // Trocar de zona teleporta o jogador: trajeto de clique, interacao pendente
    // e comando de move enfileirado morrem aqui.
    this.autorunActive = false;
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    // Overworld e dungeon compartilham coordenadas: um efeito/texto ainda vivo
    // da zona anterior apareceria flutuando na zona nova. Descarta tudo.
    for (const effect of this.effects) effect.dispose();
    this.effects.length = 0;
    for (const text of this.damageTexts) text.dispose();
    this.damageTexts.length = 0;
    this.world.setZone(zone);
    this.hud.showZoneBanner(zone);
    this.updateNpcServiceDestinations();
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
    for (const view of this.views.values()) {
      view.equippedWeaponKey = undefined;
      view.offhandKey = undefined;
      view.helmetKey = undefined;
      view.armorKey = undefined;
    }
  }

  private resize(): void {
    this.world.resize(window.innerWidth, window.innerHeight);
  }
}
