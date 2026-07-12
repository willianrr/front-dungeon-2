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
import {
  EQUIPMENT_SET_COLORS,
  equipmentSetForgeOutputPresentation,
  equipmentSetItemPresentation,
} from '../shared/EquipmentSets';
import { steelSweepPresentationForVariant } from '../shared/SteelSweepPresentation';
import {
  STEEL_SWEEP_FORM_PALETTE,
  steelSweepFormEventPresentationGate,
} from '../shared/SteelSweepForms';
import {
  catalogSkill,
  normalizeMasteries,
  skillCastPlan,
} from '../shared/SkillCatalog';
import {
  combatDoctrinePresentationGate,
  type CombatDoctrineId,
} from '../shared/CombatDoctrines';
import {
  announcedSkillIdsFromWire,
  loadHotbarLoadout,
  persistHotbarLoadout,
  reconcileHotbarLoadout,
  replaceHotbarSkill,
  swapHotbarActions,
} from '../shared/HotbarLoadout';
import {
  ASH_CORRUPTOR_PALETTE,
  RUIN_BRUTE_PALETTE,
  SHARDCASTER_PALETTE,
  enemyPresentationForVariant,
  isAshCorruptorVariant,
  isRuinBruteVariant,
  isShardcasterVariant,
  isUtraeanSentinelVariant,
} from '../shared/RangedEnemyPresentation';
import {
  UTRAEAN_SENTINEL_PALETTE,
  utraeanSentinelEventPresentationGate,
} from '../shared/UtraeanSentinel';
import {
  ashSupportEventPresentationGate,
  ashVeilStatusPresentationGate,
} from '../shared/AshCorruptorPresentation';
import {
  ruinBruteEventPresentationGate,
  ruinExposedStatusPresentationGate,
} from '../shared/RuinBrutePresentation';
import {
  BOSS_SEAL_PALETTE,
  bossPhasePresentationGate,
  bossSealEventPresentationGate,
} from '../shared/BossSealRupturePresentation';
import {
  sealChamberEventPresentationGate,
  sealChamberStatePresentationGate,
} from '../shared/SealChamberPresentation';
import {
  RUNIC_ELITE_PALETTE,
  runicEliteEventPresentationGate,
  runicElitePresentationGate,
} from '../shared/RunicElites';
import {
  ADVANCED_MINING_PALETTE,
  miningPerfectStrikeEventGate,
  miningToolForTier,
  miningToolRecipeGate,
  normalizeMiningState,
  oreNodePresentationGate,
  type NormalizedMiningState,
} from '../shared/AdvancedMining';
import {
  ARCANE_RESONANCE_PALETTE,
  arcaneResonanceEventPresentationGate,
  arcaneResonanceStatusPresentationGate,
} from '../shared/ArcaneResonance';
import {
  GUARDIAN_RETALIATION_PALETTE,
  guardianRetaliationBuffPresentationGate,
  guardianRetaliationEventPresentationGate,
} from '../shared/GuardianRetaliation';
import {
  ACTIVE_EVASION_MAX_DISTANCE,
  ACTIVE_EVASION_PALETTE,
  activeEvasionEventPresentationGate,
  activeEvasionStatePresentationGate,
} from '../shared/ActiveEvasion';
import {
  STORM_ORB_PALETTE,
  stormOrbBuffPresentationGate,
  stormOrbEventPresentationGate,
} from '../shared/StormOrb';
import {
  FERAL_FORM_PALETTE,
  feralFormBuffPresentationGate,
  feralFormEventPresentationGate,
} from '../shared/FeralForm';
import {
  ROOT_SNARE_PALETTE,
  rootSnareEventPresentationGate,
  rootSnareZonesPresentationGate,
} from '../shared/RootSnare';
import {
  COOPERATIVE_REVIVE_RANGE,
  COOPERATIVE_REVIVE_PALETTE,
  reviveChannelPresentations,
  reviveProtectionBuffPresentationGate,
  type ReviveChannelPresentation,
} from '../shared/CooperativeRevive';
import {
  displacerColor,
  displacerStatesPresentationGate,
} from '../shared/Displacers';
import {
  DIFFICULTY_PALETTE,
  difficultyModifiersPresentationGate,
  difficultyStatePresentationGate,
  legacyNormalDifficultyState,
} from '../shared/DifficultyTiers';
import {
  treasureLodeStatePresentationGate,
} from '../shared/TreasureLode';
import { utraeanRelayStatePresentationGate } from '../shared/UtraeanRelay';
import { arhokFrostBiomePresentationGate } from '../shared/ArhokFrostCoast';
import { corruptedJunglePresentationGate } from '../shared/CorruptedJungle';
import {
  CHAIN_LIGHTNING_PALETTE,
  chainLightningEventPresentationGate,
} from '../shared/ChainLightning';
import {
  RENEWAL_WAVE_PALETTE,
  renewalWaveEventPresentationGate,
} from '../shared/RenewalWave';
import {
  PHASE_STEP_PALETTE,
  phaseStepEventPresentationGate,
} from '../shared/PhaseStep';
import {
  NATURE_SPIRIT_PALETTE,
  natureSpiritEventPresentationGate,
  natureSpiritStatesPresentationGate,
} from '../shared/NatureSpirit';
import { EXPEDITION_CARGO_PALETTE, expeditionCargoPresentationGate } from '../shared/ExpeditionCargo';
import {
  correctedProjectilePosition,
  extrapolatedProjectilePosition,
  isSupportedProjectileKind,
  projectilePresentation,
  projectileLifecyclePlan,
} from '../shared/ProjectileMotion';
import type {
  ChestState,
  BiomeState,
  CorruptedJungleState,
  ChatMessageState,
  CombatEvent,
  CombatTextKind,
  ControlZoneState,
  DamageKind,
  DisplacerState,
  DifficultyState,
  EntityAction,
  EntityState,
  EnemyVariant,
  EncounterState,
  ExpeditionCargoState,
  EquipmentState,
  EquippedWeaponVisualState,
  ForgeRecipeState,
  HotbarAction,
  InventoryItem,
  ItemKind,
  ItemRarity,
  LootState,
  NpcState,
  NatureSpiritState,
  OreNodeState,
  PartyEvent,
  PartyState,
  PlayerAttribute,
  ProfessionContractState,
  ProfessionProgressState,
  ProfessionsState,
  ProjectileState,
  QuestState,
  SkillId,
  TreasureLodeState,
  UtraeanRelayState,
  UtraeanRuneState,
  WeaponElement,
  WorldSnapshot,
  WorldZone,
} from '../shared/types';
import { HUD, HUD_SKILL_ICON_URLS, preloadHudIcons, type HudForgeRecipe, type HudMinimapNpc, type HudNpcDestination, type HudNpcPrompt, type HudNpcTarget, type HudStashItem } from '../ui/HUD';
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
import {
  createOreNodeVisual,
  destroyOreNodeVisual,
  updateOreNodeVisual,
  type OreNodeVisual,
} from '../playcanvas/OreNodeVisual';
import {
  createDisplacerVisual,
  destroyDisplacerVisual,
  updateDisplacerVisual,
  type DisplacerVisual,
} from '../playcanvas/DisplacerVisual';
import {
  createTreasureLodeVisual,
  destroyTreasureLodeVisual,
  updateTreasureLodeVisual,
  type TreasureLodeVisual,
} from '../playcanvas/TreasureLodeVisual';
import {
  createUtraeanRelayVisual,
  destroyUtraeanRelayVisual,
  updateUtraeanRelayVisual,
  type UtraeanRelayVisual,
} from '../playcanvas/UtraeanRelayVisual';
import {
  createRootSnareVisual,
  destroyRootSnareVisual,
  updateRootSnareVisual,
  type RootSnareVisual,
} from '../playcanvas/RootSnareVisual';
import {
  createCooperativeReviveVisual,
  destroyCooperativeReviveVisual,
  updateCooperativeReviveVisual,
  type CooperativeReviveVisual,
} from '../playcanvas/CooperativeReviveVisual';
import {
  createArhokFrostVisual,
  destroyArhokFrostVisual,
  updateArhokFrostVisual,
  type ArhokFrostVisual,
} from '../playcanvas/ArhokFrostVisual';
import {
  createCorruptedJungleVisual,
  destroyCorruptedJungleVisual,
  updateCorruptedJungleVisual,
  type CorruptedJungleVisual,
} from '../playcanvas/CorruptedJungleVisual';
import { Input, type EvadeInput, type PointerNdc } from './Input';
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
import { stationarySkillMovementPlan } from './StationarySkillCast';
import { questDialogueActionDecision, questDialogueActionLabel as buildQuestDialogueActionLabel } from './QuestDialogueAction';
import { questNavigationHoverNpcId, questNavigationTargetNpcId } from './QuestNavigation';
import { questTrackerRouteLabel } from './QuestTrackerRoute';

interface GripPoseBone {
  entity: pc.Entity;
  delta: pc.Quat;
}

interface WeaponGripPose {
  right: GripPoseBone[];
  left: GripPoseBone[];
}

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
  /** Pose aditiva que fecha os dedos em volta do cabo quando ha arma. */
  weaponGripPose?: WeaponGripPose;
  enemyVariant?: EnemyVariant;
  shardcasterRoot?: pc.Entity;
  shardcasterOrb?: pc.Entity;
  shardcasterLight?: pc.Entity;
  shardcasterCrystals?: pc.Entity[];
  shardcasterMaterials?: pc.StandardMaterial[];
  ashCorruptorRoot?: pc.Entity;
  ashCorruptorOrb?: pc.Entity;
  ashCorruptorCrown?: pc.Entity;
  ashCorruptorLight?: pc.Entity;
  ashCorruptorMaterials?: pc.StandardMaterial[];
  ashVeilRoot?: pc.Entity;
  ashVeilRing?: pc.Entity;
  ashVeilSigil?: pc.Entity;
  ashVeilMaterials?: pc.StandardMaterial[];
  ruinBruteRoot?: pc.Entity;
  ruinBruteShoulders?: pc.Entity[];
  ruinBrutePlate?: pc.Entity;
  ruinBruteMaul?: pc.Entity;
  ruinBruteMaterials?: pc.StandardMaterial[];
  utraeanSentinelRoot?: pc.Entity;
  utraeanSentinelCore?: pc.Entity;
  utraeanSentinelCrown?: pc.Entity;
  utraeanSentinelSpear?: pc.Entity;
  utraeanSentinelMaterials?: pc.StandardMaterial[];
  ruinExposedRoot?: pc.Entity;
  ruinExposedRing?: pc.Entity;
  ruinExposedPlates?: pc.Entity[];
  ruinExposedMaterials?: pc.StandardMaterial[];
  bossSealPhaseRoot?: pc.Entity;
  bossSealPhaseAura?: pc.Entity;
  bossSealPhaseCrown?: pc.Entity;
  bossSealPhaseCracks?: pc.Entity[];
  bossSealPhaseMaterials?: pc.StandardMaterial[];
  runicEliteRoot?: pc.Entity;
  runicEliteCore?: pc.Entity;
  runicEliteRings?: pc.Entity[];
  runicEliteRunes?: pc.Entity[];
  runicEliteMaterials?: pc.StandardMaterial[];
  runicElitePhase?: 'aegis' | 'fury';
  difficultyAffixRoot?: pc.Entity;
  difficultyAffixRings?: pc.Entity[];
  difficultyAffixMotes?: pc.Entity[];
  difficultyAffixMaterials?: pc.StandardMaterial[];
  difficultyAffixKey?: string;
  arcaneResonanceRoot?: pc.Entity;
  arcaneResonanceRings?: pc.Entity[];
  arcaneResonanceMotes?: pc.Entity[];
  arcaneResonanceMaterials?: pc.StandardMaterial[];
  guardianRetaliationRoot?: pc.Entity;
  guardianRetaliationRings?: pc.Entity[];
  guardianRetaliationChevrons?: pc.Entity[];
  guardianRetaliationMaterials?: pc.StandardMaterial[];
  stormOrbRoot?: pc.Entity;
  stormOrbRing?: pc.Entity;
  stormOrbCores?: pc.Entity[];
  stormOrbMaterials?: pc.StandardMaterial[];
  stormOrbCharges?: number;
  feralFormRoot?: pc.Entity;
  feralFormRing?: pc.Entity;
  feralFormParts?: pc.Entity[];
  feralFormMaterials?: pc.StandardMaterial[];
  reviveProtectionRoot?: pc.Entity;
  reviveProtectionRings?: pc.Entity[];
  reviveProtectionMaterials?: pc.StandardMaterial[];
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

interface OreNodeView {
  visual: OreNodeVisual;
  state: OreNodeState;
  label: WorldLabel;
}

interface DisplacerView {
  visual: DisplacerVisual;
  state: DisplacerState;
  label: WorldLabel;
}

interface ProjectileView {
  root: pc.Entity;
  core: pc.Entity;
  trail: pc.Entity;
  light: pc.Entity;
  materials: pc.StandardMaterial[];
  state: ProjectileState;
  snapshotAt: number;
  phase: number;
}

interface NatureSpiritView {
  root: pc.Entity;
  core: pc.Entity;
  halo: pc.Entity;
  motes: pc.Entity[];
  light: pc.Entity;
  materials: pc.StandardMaterial[];
  state: NatureSpiritState;
  phase: number;
}

interface ExpeditionCargoView {
  root: pc.Entity;
  body: pc.Entity;
  legs: pc.Entity[];
  rune: pc.Entity;
  light: pc.Entity;
  materials: pc.StandardMaterial[];
  state: ExpeditionCargoState;
  phase: number;
}

interface ControlZoneView {
  visual: RootSnareVisual;
  state: ControlZoneState;
}

interface CooperativeReviveView {
  visual: CooperativeReviveVisual;
  presentation: ReviveChannelPresentation;
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

interface ForgeRecipePending {
  npcId: string;
  recipeId: string;
  recipeType: ForgeRecipeState['recipeType'];
  outputKind: ForgeRecipeState['outputKind'];
  outputSetId?: ForgeRecipeState['outputSetId'];
  outputSetPieceId?: string;
  beforeOutput: number;
  expectedOutput: number;
}

interface ProfessionContractPending {
  npcId: string;
  contractId: string;
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
// Parede visual centrada em +/-23, com 1.2 de espessura: a face interna fica
// em 22.4. O centro do heroi (raio 0.5) para em 21.9, sem atravessar a malha.
const DUNGEON_MOVE_BOUND = 21.9;
// O A* usa a mesma margem autoritativa de 0.75 do backend para nunca pedir um
// destino colado na parede que o servidor precisaria corrigir depois.
const DUNGEON_NAVIGATION_BOUND = 21.65;
// Raio para interagir com loot/bau ao chegar (MENOR que o do servidor — 3.1 do
// collectLoot e 4.0 do openChest — para a predicao nunca disparar cedo demais).
const LOOT_INTERACT_RANGE = 2.6;
const CHEST_INTERACT_RANGE = 3.4;
const ORE_INTERACT_SAFETY_MARGIN = 0.8;
const ORE_NODE_NAMES: Record<OreNodeState['kind'], string> = {
  copper: 'Veio de Cobre',
  iron: 'Veio de Ferro',
  mithril: 'Veio de Mithril',
};
const ORE_NODE_COLORS: Record<OreNodeState['kind'], string> = {
  copper: '#f0a067',
  iron: '#d9e5ea',
  mithril: '#8cecff',
};
const ORE_REQUIRED_LEVEL: Record<OreNodeState['kind'], number> = {
  copper: 1,
  iron: 2,
  mithril: 3,
};
const BAR_LOOT_COLORS: Partial<Record<ItemKind, number>> = {
  copper_bar: 0xc87945,
  iron_bar: 0xb9c4cb,
  mithril_bar: 0x65dce9,
};
const NPC_APPROACH_ARRIVAL_RANGE = CLICK_MOVE_STOP_DISTANCE + 0.22;
const HEALER_SERVICE_COST = 18;
const BLACKSMITH_BLESS_MAX_LEVEL = 6;
const BLACKSMITH_MAX_LEVEL = 15;
const BLACKSMITH_SERVICE_SAFE_RANGE = 3.05;
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
const ORE_CLICK_RADIUS = 1.42;
// Hold do botao esquerdo sobre inimigo: reenvia o attack no maximo a cada
// intervalo abaixo (o retarget para OUTRO inimigo e imediato).
const HELD_ATTACK_REFRESH_INTERVAL = 0.35;
function normalizedProfession(
  value: Partial<ProfessionProgressState> | null | undefined,
  id: ProfessionProgressState['id'],
  label: string,
): ProfessionProgressState {
  const maxLevel = Math.max(1, Math.floor(value?.maxLevel ?? 10));
  const level = Math.max(1, Math.min(maxLevel, Math.floor(value?.level ?? 1)));
  const xpToNext = level >= maxLevel ? 0 : Math.max(1, Math.floor(value?.xpToNext ?? 30));
  return {
    id,
    label: value?.label?.trim() || label,
    level,
    xp: Math.max(0, Math.floor(value?.xp ?? 0)),
    xpIntoLevel: level >= maxLevel ? 0 : Math.max(0, Math.min(xpToNext, Math.floor(value?.xpIntoLevel ?? 0))),
    xpToNext,
    maxLevel,
    ...(id === 'mining'
      ? { bonusYieldChance: Math.max(0, Math.min(1, value?.bonusYieldChance ?? 0)) }
      : {}),
  };
}

function normalizedProfessionContracts(value: unknown): ProfessionContractState[] {
  if (!Array.isArray(value)) return [];
  const contracts: ProfessionContractState[] = [];
  const seenContracts = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<ProfessionContractState>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    if (!id || seenContracts.has(id)) continue;
    seenContracts.add(id);

    const objectives: ProfessionContractState['objectives'] = [];
    const seenObjectives = new Set<string>();
    if (Array.isArray(candidate.objectives)) {
      for (const rawObjective of candidate.objectives) {
        if (!rawObjective || typeof rawObjective !== 'object') continue;
        const objectiveId = typeof rawObjective.id === 'string' ? rawObjective.id.trim() : '';
        if (!objectiveId || seenObjectives.has(objectiveId)) continue;
        seenObjectives.add(objectiveId);
        const current = Number.isFinite(rawObjective.current)
          ? Math.max(0, Math.floor(rawObjective.current))
          : 0;
        const goal = Number.isFinite(rawObjective.goal)
          ? Math.max(0, Math.floor(rawObjective.goal))
          : 0;
        objectives.push({
          id: objectiveId,
          label: typeof rawObjective.label === 'string' && rawObjective.label.trim()
            ? rawObjective.label.trim()
            : objectiveId,
          current,
          goal,
          completed: rawObjective.completed === true,
        });
      }
    }
    const claimed = candidate.claimed === true;
    contracts.push({
      id,
      title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim() : id,
      description: typeof candidate.description === 'string' ? candidate.description.trim() : '',
      objectives,
      completed: claimed || candidate.completed === true,
      claimable: !claimed && candidate.claimable === true,
      claimed,
      rewardText: typeof candidate.rewardText === 'string' ? candidate.rewardText.trim() : '',
    });
  }
  return contracts;
}

function normalizedProfessions(value: Partial<ProfessionsState> | null | undefined): ProfessionsState {
  return {
    mining: normalizedProfession(value?.mining, 'mining', 'Mineração'),
    smithing: normalizedProfession(value?.smithing, 'smithing', 'Ferraria'),
    contracts: normalizedProfessionContracts(value?.contracts),
  };
}

function professionsRenderKey(professions: ProfessionsState): string {
  const { mining, smithing } = professions;
  return [
    mining.level, mining.xp, mining.xpIntoLevel, mining.xpToNext, mining.maxLevel, mining.bonusYieldChance ?? 0,
    smithing.level, smithing.xp, smithing.xpIntoLevel, smithing.xpToNext, smithing.maxLevel,
    JSON.stringify(professions.contracts),
  ].join(':');
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
 *   `?weaponGlow`                  -> espada +15
 *   `?weaponGlow=8`                -> espada +8 (qualquer nivel 0..15)
 *   `?weaponGlow=11,fire`          -> espada +11 com elemento fogo
 *   `?weaponGlow=15,great_axe,fire` -> arma especifica para validar socket
 */
function weaponPreviewFromUrlParam(paramName: string): EquippedWeaponVisualState | null {
  const raw = new URLSearchParams(window.location.search).get(paramName);
  if (raw === null) return null;
  const parts = raw.split(',').map((part) => part.trim().toLowerCase());
  const level = Number.parseInt(parts[0] ?? '', 10);
  const kind = parts.find((part): part is ItemKind => isWeaponKind(part as ItemKind)) ?? 'sword';
  return {
    kind,
    rarity: 'lendario',
    upgradeLevel: Number.isFinite(level) ? Math.max(0, Math.min(15, level)) : 15,
    glowGem: 'soul',
    element: parts.includes('fire') ? 'fire' : undefined,
  };
}

function weaponGlowPreviewFromUrl(): EquippedWeaponVisualState | null {
  return weaponPreviewFromUrlParam('weaponGlow');
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
            : kind === 'bleed'
              ? '#ff6b68'
              : kind === 'stagger'
                ? '#c8f1ff'
                : '#fff3b5';
    this.start = { ...position };
    const emphasisClass = kind === 'critical'
      ? ' critical-text'
      : kind === 'bleed'
        ? ' bleed-text'
        : kind === 'stagger'
          ? ' stagger-text'
          : '';
    this.label = new WorldLabel(layer, `combat-text${emphasisClass}`, String(amount), color);
    this.label.el.style.font = '800 18px/1 ui-sans-serif,system-ui,sans-serif';
    this.label.el.style.zIndex = '9';
  }

  update(dt: number, world: PcWorld): boolean {
    this.age += dt;
    const t = this.age / 0.82;
    this.label.setWorldPosition(this.start.x, this.start.y + t * 1.15, this.start.z);
    this.label.el.style.opacity = String(clamp01(1 - Math.max(0, t - 0.45) / 0.55));
    this.label.el.style.fontSize = this.kind === 'critical'
      ? '24px'
      : this.kind === 'bleed' || this.kind === 'miss'
        ? '15px'
        : this.kind === 'stagger'
          ? '16px'
          : '18px';
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

interface SealChamberVisual {
  root: pc.Entity;
  marker: pc.Entity;
  sigil: pc.Entity;
  barrierRoot: pc.Entity;
  markerMaterial: pc.StandardMaterial;
  coreMaterial: pc.StandardMaterial;
  barrierMaterial: pc.StandardMaterial;
  state: EncounterState;
  age: number;
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

class FadingEntityEffect implements TimedEffect {
  private age = 0;

  constructor(
    private readonly entity: pc.Entity,
    private readonly material: pc.StandardMaterial,
    private readonly duration: number,
    private readonly baseOpacity: number,
  ) {}

  update(dt: number): boolean {
    this.age += dt;
    const t = clamp01(this.age / Math.max(0.001, this.duration));
    const tailFade = 1 - clamp01((t - 0.72) / 0.28);
    const pulse = 0.78 + (Math.sin(this.age * 18) + 1) * 0.11;
    this.material.opacity = this.baseOpacity * pulse * tailFade;
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
const RIGHT_HAND_BONE_NAMES = ['RightHand', 'mixamorigRightHand', 'mixamorig:RightHand', 'Hand_R'] as const;
// Sockets para o gear extra no corpo (dual wield, elmo, peitoral).
const OFFHAND_SOCKET_BONE_NAMES = ['LeftHand', 'mixamorigLeftHand', 'mixamorig:LeftHand', 'Hand_L'] as const;
const HEAD_SOCKET_BONE_NAMES = ['mixamorigHead', 'mixamorig:Head', 'Head', 'head'] as const;
const CHEST_SOCKET_BONE_NAMES = ['mixamorigSpine2', 'mixamorig:Spine2', 'Spine2', 'mixamorigSpine1', 'mixamorig:Spine1', 'Spine1', 'Chest', 'mixamorigSpine', 'Spine'] as const;
// Socket virtual para rigs Mixamo sem Weapon. Posicoes estao em unidades de
// mundo nos eixos locais do osso e sao compensadas pela escala herdada (0,01
// no guerreiro atual). A mao esquerda espelha o socket direito do GLB.
const RIGHT_HAND_SOCKET_POSITION = [-0.01544723, 0.11410033, 0.05113452] as const;
const LEFT_HAND_SOCKET_POSITION = [0.01544723, 0.11410033, 0.05113452] as const;
// Pose tipo WoW da referencia: laminas quase paralelas ao chao, projetadas para
// a frente do personagem. As maos espelhadas exigem sinais opostos em Z.
const PRIMARY_WEAPON_SOCKET_EULER = [0, 0, -105] as const;
const OFFHAND_WEAPON_SOCKET_EULER = [0, 0, 105] as const;
// Tamanhos-alvo (em unidades de mundo) das pecas anexadas ao corpo.
const HELMET_WORLD_SIZE = 0.34;
const CHEST_ARMOR_WORLD_SIZE = 0.72;
// Head nasce na base do cranio; Spine2 nasce no centro do peito. Estes offsets
// assentam os props rigidos sobre a geometria em vez de deixa-los no pivot.
const HELMET_SOCKET_POSITION = [0, 0.14, 0.03] as const;
const CHEST_SOCKET_POSITION = [0, 0.025, 0.065] as const;
// Pontos de pegada nos GLBs (coordenadas locais do asset). Uma AABB generica
// desloca o cabo de armas assimetricas, especialmente Axe_small.
const WEAPON_GRIP_POINT_BY_KIND: Partial<Record<ItemKind, readonly [number, number, number]>> = {
  // Espadas sao seguradas logo abaixo da guarda, nao no meio do cabo longo do
  // asset. Isso traz a guarda para junto dos dedos em vez de deixa-la "voando".
  sword: [0, 0.21, 0],
  axe: [0.044, -0.404, 0],
  great_sword: [0, 0.5, 0],
  great_axe: [0.05, -0.32, 0],
  war_hammer: [0.009, -0.422, 0],
};
// Os peitorais Metal/Golden/Black sao mais achatados em Z que o torso do
// guerreiro. Expandir apenas a profundidade evita que a peca suma dentro do
// corpo sem deixar ombros/largura gigantes. Leather ja tem profundidade boa.
const ARMOR_DEPTH_SCALE_BY_RARITY: Record<ItemRarity, number> = {
  comum: 1,
  incomum: 1.24,
  raro: 1.32,
  epico: 1.32,
  lendario: 1.32,
};
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
  // A ordem de `names` e semantica: sockets dedicados devem ganhar de ossos de
  // fallback que sao seus ancestrais (Weapon > RightHand, Spine2 > Spine1).
  for (const name of names) {
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.name === name) return current;
      for (const child of current.children) {
        if (child instanceof pc.Entity) stack.push(child);
      }
    }
  }
  return undefined;
}

function maxWorldScale(entity: pc.Entity): number {
  const scale = entity.getScale();
  return Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z), 0.0001);
}

function setScaledSocketPosition(
  entity: pc.Entity,
  position: readonly [number, number, number],
  inheritedScale: number,
): void {
  const safeScale = Math.max(inheritedScale, 0.0001);
  entity.setLocalPosition(position[0] / safeScale, position[1] / safeScale, position[2] / safeScale);
}

function setHandWeaponSocket(
  entity: pc.Entity,
  position: readonly [number, number, number],
  euler: readonly [number, number, number],
  inheritedScale: number,
): void {
  setScaledSocketPosition(entity, position, inheritedScale);
  entity.setLocalEulerAngles(...euler);
}

function fitEquippedWeaponToGrip(
  entity: pc.Entity,
  kind: ItemKind,
  worldLength: number,
  inheritedScale: number,
): void {
  const bounds = fitWeaponToGrip(entity, worldLength, WEAPON_GRIP_FROM_BOTTOM, inheritedScale);
  const grip = WEAPON_GRIP_POINT_BY_KIND[kind];
  if (!bounds || !grip) return;
  const scale = worldLength / bounds.largest / Math.max(inheritedScale, 0.0001);
  entity.setLocalPosition(-grip[0] * scale, -grip[1] * scale, -grip[2] * scale);
}

function gripBoneNames(side: 'Left' | 'Right', finger: string, segment: number): readonly string[] {
  const suffix = `${side}Hand${finger}${segment}`;
  return [`mixamorig:${suffix}`, `mixamorig${suffix}`, suffix];
}

function createWeaponGripPose(root: pc.Entity): WeaponGripPose {
  const createHand = (side: 'Left' | 'Right'): GripPoseBone[] => {
    const bones: GripPoseBone[] = [];
    const add = (finger: string, segment: number, x: number, y: number, z: number) => {
      const entity = findDescendantEntity(root, gripBoneNames(side, finger, segment));
      if (!entity) return;
      bones.push({ entity, delta: new pc.Quat().setFromEulerAngles(x, y, z) });
    };

    // Peso visual ~0,8 da pose de punho fechado: preserva parte da silhueta da
    // animacao, mas faz os dedos realmente envolverem o cabo.
    for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
      add(finger, 1, 28, 0, 0);
      add(finger, 2, 52, 0, 0);
      add(finger, 3, 40, 0, 0);
    }
    add('Thumb', 1, 0, 0, side === 'Right' ? 36 : -36);
    add('Thumb', 2, 24, 0, 0);
    add('Thumb', 3, 32, 0, 0);
    return bones;
  };

  return { right: createHand('Right'), left: createHand('Left') };
}

function applyGripBones(bones: readonly GripPoseBone[]): void {
  for (const bone of bones) {
    const rotation = bone.entity.getLocalRotation().clone().mul(bone.delta);
    bone.entity.setLocalRotation(rotation);
  }
}

function applyWeaponGripPose(view: View): void {
  if (!view.weaponGripPose) return;
  if (view.equippedWeaponKey) applyGripBones(view.weaponGripPose.right);
  if (view.offhandKey) applyGripBones(view.weaponGripPose.left);
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
  private readonly oreNodeViews = new Map<string, OreNodeView>();
  private readonly displacerViews = new Map<string, DisplacerView>();
  private displacerStates: readonly DisplacerState[] = [];
  private difficultyState: DifficultyState = legacyNormalDifficultyState();
  private treasureLodeState: TreasureLodeState | null = null;
  private treasureLodeVisual: TreasureLodeVisual | null = null;
  private utraeanRelayState: UtraeanRelayState | null = null;
  private utraeanRelayVisual: UtraeanRelayVisual | null = null;
  private biomeState: BiomeState | null = null;
  private arhokFrostVisual: ArhokFrostVisual | null = null;
  private corruptedJungleState: CorruptedJungleState | null = null;
  private corruptedJungleVisual: CorruptedJungleVisual | null = null;
  private readonly projectileViews = new Map<string, ProjectileView>();
  private readonly natureSpiritViews = new Map<string, NatureSpiritView>();
  private expeditionCargoView: ExpeditionCargoView | null = null;
  private readonly controlZoneViews = new Map<string, ControlZoneView>();
  private readonly cooperativeReviveViews = new Map<string, CooperativeReviveView>();
  private readonly enemyHp = new Map<string, number>();
  private readonly damageTexts: FloatingText[] = [];
  private readonly speechBubbles: SpeechBubble[] = [];
  private readonly partyMemberIds = new Set<string>();
  private readonly partyBadges = new Map<string, WorldLabel>();
  private readonly effects: TimedEffect[] = [];
  private sealChamberVisual: SealChamberVisual | null = null;
  private readonly seenCombatEvents = new Set<string>();
  private readonly activeBulwarkTaunts = new Map<string, number>();
  private doctrinePresentationEnabled = false;
  private activeDoctrinePresentationId: CombatDoctrineId | null = null;
  private readonly seenPartyEvents = new Set<string>();
  private readonly seenChatMessages = new Set<string>();
  private readonly keyboardMove = new KeyboardMoveController();
  private readonly clientMovement = new ClientMovementPredictor();
  private readonly worldUpdateHandler = (dt: number) => this.frame(dt);
  private readonly resizeHandler = () => this.resize();
  private readonly pageHideHandler = (event: PageTransitionEvent) => {
    // Uma pagina guardada no back-forward cache volta com a mesma instancia de
    // Game. Desmonta-la aqui deixaria `disposed=true` e o loop permanentemente
    // parado ao navegar de volta. No descarte real, a limpeza continua imediata.
    if (!event.persisted) this.dispose();
  };
  private disposed = false;
  private autorunActive = false;
  /** Bloqueia qualquer movimento que tenha sido coletado no mesmo frame da Guarda de Ferro. */
  private movementSuppressedForFrame = false;
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
  private forgeRecipePending: ForgeRecipePending | null = null;
  private professionContractPending: ProfessionContractPending | null = null;
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
  /** Bootstrap preserva v2 sem assumir o catalogo do emptySnapshot. */
  private hotbarLayout: HotbarAction[] = loadHotbarLoadout(window.localStorage).slots;
  private announcedSkillIds: SkillId[] | null = null;
  /** Ate quando (elapsed) a mira local e dona do yaw — cobre o vao entre golpes. */
  private localAimHoldUntil = 0;
  /** Interacao adiada (clique distante em loot/bau/npc): anda ate la e executa. */
  private pendingInteraction: {
    kind: 'loot' | 'chest' | 'npc' | 'ore' | 'displacer' | 'treasure' | 'revive'
      | 'utraean-console' | 'utraean-rune' | 'utraean-chest';
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
  private miningState: NormalizedMiningState = normalizeMiningState(undefined);
  private professions: ProfessionsState = normalizedProfessions(undefined);
  private professionsKey = professionsRenderKey(this.professions);

  constructor(private readonly canvas: HTMLCanvasElement, private readonly uiLayer: HTMLElement, net: NetworkClient, profile: PlayerProfile) {
    this.net = net;
    const worldData = this.net.getWorld();
    this.terrain = worldData.terrain;
    this.moveBound = worldData.size / 2 - 2;
    this.worldBlockers = worldData.blockers;
    this.world = new PcWorld(this.canvas, worldData);
    this.input = new Input(this.canvas);
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
    this.hud.onHotbarEquip = (skill, replace) => this.equipHotbarSkill(skill, replace);
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
    this.hud.onDisplacerTravel = (nodeId) => {
      this.hud.hideDisplacerNetwork();
      this.sfx.play('arcane-nova');
      this.net.send({ type: 'travel-displacer', entityId: this.net.playerId, nodeId });
    };
    this.hud.onDisplacerClose = () => {
      this.hudDirty = true;
    };
    this.hud.onDifficultySelect = (difficultyId) => {
      this.sfx.play('ui');
      this.net.send({ type: 'set-world-difficulty', entityId: this.net.playerId, difficultyId });
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
      this.travelServicePending = false;
      this.jewelerServicePending = false;
      this.hudDirty = true;
    };
    this.hud.onForgeRecipe = (npcId, recipeId, count) => this.handleForgeRecipe(npcId, recipeId, count);
    this.hud.onProfessionContractClaim = (npcId, contractId) => this.handleProfessionContractClaim(npcId, contractId);
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
    this.hud.onPartyRevive = (targetPlayerId) => {
      this.sfx.play('ui');
      this.requestCooperativeRevive(targetPlayerId);
    };
    this.hud.onCargoDeposit = (kind) => {
      this.sfx.play('ui');
      this.net.send({ type: 'expedition-cargo-deposit', entityId: this.net.playerId, item: kind, count: 1 });
    };
    this.hud.onCargoWithdraw = (kind) => {
      this.sfx.play('ui');
      this.net.send({ type: 'expedition-cargo-withdraw', entityId: this.net.playerId, item: kind, count: 1 });
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
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('pagehide', this.pageHideHandler);
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
    this.world.start(this.worldUpdateHandler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.app.off('update', this.worldUpdateHandler);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('pagehide', this.pageHideHandler);
    this.clearProjectileViews();
    this.clearNatureSpiritViews();
    this.clearExpeditionCargoView();
    this.clearControlZoneViews();
    this.clearCooperativeReviveViews();
    this.clearSealChamberPresentation();
    this.clearTreasureLodePresentation();
    this.clearUtraeanRelayPresentation();
    this.clearArhokFrostPresentation();
    this.clearCorruptedJunglePresentation();
    for (const view of this.displacerViews.values()) {
      view.label.dispose();
      destroyDisplacerVisual(view.visual);
    }
    this.displacerViews.clear();
    for (const effect of this.effects) effect.dispose();
    this.effects.length = 0;
    for (const view of this.views.values()) {
      this.clearEnemySpecialVisuals(view);
      this.clearAshVeilVisual(view);
      this.clearRuinExposedVisual(view);
      this.clearBossSealPhaseVisual(view);
      this.clearArcaneResonanceVisual(view);
      this.clearStormOrbVisual(view);
      this.clearReviveProtectionVisual(view);
      this.clearGuardianRetaliationVisual(view);
    }
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
    this.syncSealChamberPresentation(snapshot.encounter, snapshot.zone);
    this.syncTreasureLodePresentation(snapshot.treasureLode, snapshot.zone);
    this.syncUtraeanRelayPresentation(snapshot.utraeanRelay, snapshot.zone);
    this.syncArhokFrostPresentation(snapshot.biome, snapshot.zone);
    this.syncCorruptedJunglePresentation(snapshot.jungle, snapshot.zone);
    this.reconcileProjectiles(snapshot.projectiles);
    this.reconcileNatureSpirits(snapshot.natureSpirits);
    this.reconcileControlZones(snapshot.controlZones);
    this.reconcile(snapshot.entities, 0, true);
    this.reconcileCooperativeRevives(snapshot.entities);
    this.syncCombatEvents(
      snapshot.combatEvents,
      snapshot.entities,
      snapshot.oreNodes,
      this.doctrinePresentationEnabled,
      this.activeDoctrinePresentationId,
    );
    this.syncBulwarkTauntStatuses(snapshot.entities);
    this.syncPartyEvents(snapshot.partyEvents);
    this.syncPartyPresentation(snapshot.party);
    this.reconcileExpeditionCargo(snapshot.party);
    this.syncChatMessages(snapshot.chatMessages);
    this.reconcileLoot(snapshot.loot);
    this.reconcileChests(snapshot.chests);
    this.reconcileOreNodes(snapshot.oreNodes);
    this.reconcileDisplacers(snapshot.displacers);
    this.updateLootViews();
    this.updateOreNodeViews();
    this.updateDisplacerViews();
    this.updateTreasureLodePresentation();
    this.updateUtraeanRelayPresentation();
    this.updateArhokFrostPresentation();
    this.updateCorruptedJunglePresentation();
    this.updateProjectileViews(0);
    this.updateNatureSpiritViews(0);
    this.updateExpeditionCargoView(0);
    this.updateControlZoneViews();
    this.updateCooperativeReviveViews();
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
    this.updateLootTooltip(snapshot);
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
      ...(npc.forgeRecipes ?? []).map((recipe) => [
        recipe.id,
        recipe.label,
        recipe.recipeType,
        ...recipe.ingredients.map((ingredient) => `${ingredient.kind}/${ingredient.count}`),
        recipe.inputKind,
        recipe.inputCount,
        recipe.outputKind,
        recipe.outputCount,
        recipe.outputRarity ?? '',
        recipe.outputSetId ?? '',
        recipe.outputSetPieceId ?? '',
        recipe.itemLevelBonus ?? 0,
        recipe.requiredLevel,
        recipe.xpReward,
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
    const localPlayerWire = snapshot.entities?.find((entity) => entity.id === this.net.playerId);
    const doctrineGate = combatDoctrinePresentationGate(
      snapshot.talents,
      localPlayerWire?.skills,
    );
    this.doctrinePresentationEnabled = doctrineGate !== null;
    this.activeDoctrinePresentationId = doctrineGate?.activeId ?? null;
    snapshot.masteries = normalizeMasteries(snapshot.masteries, localPlayerWire?.skills);
    this.reconcileHotbarFromSkillCatalog(localPlayerWire?.skills);
    snapshot.oreNodes = (snapshot.oreNodes ?? []).flatMap((node) => {
      const presentation = oreNodePresentationGate(node);
      if (!presentation) return [];
      return [{
        ...node,
        rich: presentation.rich,
        baseYield: presentation.baseYield,
        requiredToolTier: presentation.requiredToolTier,
      }];
    });
    const displacers = displacerStatesPresentationGate(snapshot.displacers, snapshot.zone) ?? [];
    snapshot.displacers = [...displacers];
    this.displacerStates = displacers;
    const difficulty = difficultyStatePresentationGate(snapshot.difficulty) ?? legacyNormalDifficultyState();
    snapshot.difficulty = difficulty;
    this.difficultyState = difficulty;
    this.hud.updateDisplacerNetwork(displacers, difficulty);
    const treasureLode = treasureLodeStatePresentationGate(snapshot.treasureLode);
    snapshot.treasureLode = treasureLode ?? undefined;
    this.treasureLodeState = treasureLode;
    const utraeanRelay = utraeanRelayStatePresentationGate(snapshot.utraeanRelay);
    snapshot.utraeanRelay = utraeanRelay ?? undefined;
    this.utraeanRelayState = utraeanRelay;
    this.biomeState = arhokFrostBiomePresentationGate(snapshot.biome);
    this.corruptedJungleState = corruptedJunglePresentationGate(snapshot.jungle);
    // Projeteis nao usam delta: cada snapshot substitui integralmente a lista.
    snapshot.projectiles = Array.isArray(snapshot.projectiles) ? snapshot.projectiles : [];
    snapshot.natureSpirits = natureSpiritStatesPresentationGate(snapshot.natureSpirits, snapshot.entities);
    snapshot.controlZones = rootSnareZonesPresentationGate(snapshot.controlZones);
    const normalizedMining = normalizeMiningState(snapshot.mining);
    snapshot.mining = normalizedMining;
    this.miningState = normalizedMining;
    const nextProfessions = normalizedProfessions(snapshot.professions);
    const nextProfessionsKey = professionsRenderKey(nextProfessions);
    const professionsChanged = nextProfessionsKey !== this.professionsKey;
    this.professions = nextProfessions;
    this.professionsKey = nextProfessionsKey;
    snapshot.professions = this.professions;
    const professionContractStatus = this.resolveProfessionContractPendingFromSnapshot(nextProfessions);

    // Inventario com DELTA: o servidor manda `null` quando NAO mudou — nesse caso
    // reaproveitamos o cache. Quando vem o array (mudou ou reenvio periodico),
    // hidratamos (nome/icone) e cacheamos. (`!= null` cobre null e campo ausente.)
    let vendorDataChanged = false;
    let stashDataChanged = false;
    let forgeStatus: string | undefined;
    const incoming = snapshot.inventory as InventoryItem[] | null | undefined;
    if (incoming != null) {
      for (const item of incoming) {
        if (!item.icon) item.icon = itemIconFor(item.kind, item.rarity);
        if (!item.name) item.name = itemDisplayName(item);
      }
      forgeStatus = this.resolveForgeRecipePending(incoming);
      this.cachedInventory = incoming;
      if (this.activeVendorId) vendorDataChanged = true;
      if (this.activeStashNpcId) stashDataChanged = true;
      if (this.activeQuestNpcId) {
        const activeNpc = this.npcViews.get(this.activeQuestNpcId);
        if (activeNpc?.definition.kind === 'healer') this.refreshHealerDialogue();
        if (activeNpc?.definition.kind === 'blacksmith') {
          this.refreshBlacksmithDialogue(forgeStatus ?? professionContractStatus ?? 'Forja atualizada.');
        }
        if (activeNpc?.definition.kind === 'jeweler') this.refreshJewelerDialogue('Joias atualizadas.');
      }
    }
    if (professionsChanged && incoming == null && this.activeQuestNpcId) {
      const activeNpc = this.npcViews.get(this.activeQuestNpcId);
      if (activeNpc?.definition.kind === 'blacksmith') {
        this.refreshBlacksmithDialogue(professionContractStatus ?? 'Progresso dos ofícios atualizado.');
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
      const upgradeConfirmed = this.blacksmithUpgradePending;
      this.blacksmithUpgradePending = false;
      if (upgradeConfirmed && this.activeQuestNpcId) {
        const activeNpc = this.npcViews.get(this.activeQuestNpcId);
        if (activeNpc?.definition.kind === 'blacksmith') {
          this.refreshBlacksmithDialogue('Aprimoramento atualizado.');
        }
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
    if (this.disposed) return;
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
      this.syncSealChamberPresentation(snapshot.encounter, snapshot.zone);
      this.syncTreasureLodePresentation(snapshot.treasureLode, snapshot.zone);
      this.syncUtraeanRelayPresentation(snapshot.utraeanRelay, snapshot.zone);
      this.syncArhokFrostPresentation(snapshot.biome, snapshot.zone);
      this.syncCorruptedJunglePresentation(snapshot.jungle, snapshot.zone);
      this.syncCombatEvents(
        snapshot.combatEvents,
        snapshot.entities,
        snapshot.oreNodes,
        this.doctrinePresentationEnabled,
        this.activeDoctrinePresentationId,
      );
      this.syncBulwarkTauntStatuses(snapshot.entities);
      this.reconcileProjectiles(snapshot.projectiles);
      this.reconcileNatureSpirits(snapshot.natureSpirits);
      this.reconcileControlZones(snapshot.controlZones);
      this.syncPartyEvents(snapshot.partyEvents);
      this.syncPartyPresentation(snapshot.party);
      this.reconcileExpeditionCargo(snapshot.party);
      this.syncChatMessages(snapshot.chatMessages);
      this.reconcileLoot(snapshot.loot);
      this.reconcileChests(snapshot.chests);
      this.reconcileOreNodes(snapshot.oreNodes);
      this.reconcileDisplacers(snapshot.displacers);
    }

    this.reconcile(snapshot.entities, dt, snapshotChanged);
    this.reconcileCooperativeRevives(snapshot.entities);
    this.applyLocalPlayerMovement(dt);
    this.flushQueuedMoveCommand();
    this.updatePendingInteraction();
    this.updatePathGuidance();
    this.aimLocalPlayerDuringAttack(dt);
    this.aimLocalPlayerAtFocusedNpc(dt);
    this.updateLootViews();
    this.updateOreNodeViews(dt);
    this.updateDisplacerViews();
    this.updateTreasureLodePresentation();
    this.updateUtraeanRelayPresentation();
    this.updateArhokFrostPresentation();
    this.updateCorruptedJunglePresentation();
    this.updateProjectileViews(dt);
    this.updateNatureSpiritViews(dt);
    this.updateExpeditionCargoView(dt);
    this.updateControlZoneViews();
    this.updateCooperativeReviveViews();
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
    this.updateSealChamberPresentation(dt);
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
    this.updateLootTooltip(snapshot);
    this.perf.update(frameMs, this.world.getRenderStats(), this.renderQualityMode === 'auto' ? `auto:${this.autoQualityLevel}` : this.renderQualityMode);
    // Um cast feito via HUD entre frames tambem fica protegido durante o frame
    // seguinte; depois disso, uma nova intencao de movimento pode cancelar a guarda.
    this.movementSuppressedForFrame = false;
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
      if (this.hud.closeTalentPanel()) {
        this.hudDirty = true;
        return;
      }
      if (this.hud.isDisplacerNetworkOpen()) {
        this.hud.hideDisplacerNetwork();
        this.hudDirty = true;
        return;
      }
      this.cancelPlayerIntent();
      return;
    }

    const zoom = this.input.takeZoom();
    if (zoom !== 0) this.world.rig.zoom(zoom);

    let evadeSent = false;
    for (const request of this.input.takeEvades()) {
      if (this.processActiveEvasionInput(request)) {
        evadeSent = true;
        break;
      }
    }
    const localEvasion = activeEvasionStatePresentationGate(this.latestEntities.get(this.net.playerId));
    if (evadeSent || localEvasion?.evading) {
      // O servidor trava estas intenções; drená-las também impede predição ou
      // execução atrasada assim que a janela de 0,32 s terminar.
      this.input.takeJump();
      this.input.takeHotbarPresses();
      this.input.takeClicks();
      this.input.takeNpcInteract();
      this.input.takeNpcCycle();
      this.input.takeAutorunToggle();
      this.input.takeMovementChanged();
      return;
    }

    if (this.input.takeJump()) {
      this.sfx.unlock();
      this.net.send({ type: 'jump', entityId: this.net.playerId });
    }
    for (const slot of this.input.takeHotbarPresses()) {
      this.triggerHotbarSlot(slot);
    }
    if (this.movementSuppressedForFrame) {
      // Nao reaproveita no frame seguinte um clique de chao capturado junto do cast.
      this.input.takeClicks();
      return;
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
      if (target.npcId && target.source !== 'quest') {
        this.interactWithNpc(target.npcId, this.isMovementRunning(), target.allowAutomove);
      } else {
        const nearbyOre = this.nearestMineableOre();
        if (nearbyOre) this.interactWithOreNode(nearbyOre, false);
        else if (target.npcId) this.interactWithNpc(target.npcId, this.isMovementRunning(), target.allowAutomove);
      }
    }
    for (const ndc of this.input.takeClicks()) this.handleClick(ndc);
    this.updateHeldGroundMove();
  }

  private processActiveEvasionInput(request: EvadeInput): boolean {
    const state = this.latestEntities.get(this.net.playerId);
    const presentation = activeEvasionStatePresentationGate(state);
    if (!state || !presentation?.ready) return false;

    let target: Vec3Like | null = null;
    if (request.kind === 'pointer') {
      target = this.world.pickGround(this.world.screenRay(request.ndc))?.point ?? null;
    } else {
      const axes = this.input.getMoveAxes();
      let direction = this.world.rig.getMoveDirection(axes.strafe, axes.forward);
      if (Math.hypot(direction.x, direction.z) <= 0.0001) {
        direction = { x: Math.sin(state.rotationY), z: Math.cos(state.rotationY) };
      }
      target = {
        x: state.position.x + direction.x * ACTIVE_EVASION_MAX_DISTANCE,
        y: this.heightForMove(
          state.position.x + direction.x * ACTIVE_EVASION_MAX_DISTANCE,
          state.position.z + direction.z * ACTIVE_EVASION_MAX_DISTANCE,
        ),
        z: state.position.z + direction.z * ACTIVE_EVASION_MAX_DISTANCE,
      };
    }
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.z)) return false;

    this.sfx.unlock();
    this.cancelAutomoveIntent();
    this.autorunActive = false;
    this.closeNpcPanels();
    this.localAimHoldUntil = 0;
    this.lastAttackAimPoint = null;
    this.movementSuppressedForFrame = true;
    this.net.send({ type: 'evade', entityId: this.net.playerId, target });
    this.hudDirty = true;
    return true;
  }

  private processKeyboardMove(dt: number): void {
    if (this.movementSuppressedForFrame) return;
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
    if (this.movementSuppressedForFrame) return;
    const view = this.views.get(this.net.playerId);
    const state = this.latestEntities.get(this.net.playerId);
    if (activeEvasionStatePresentationGate(state)?.evading) {
      this.cancelAutomoveIntent();
      return;
    }
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
    const bound = this.activeMoveBound();
    const nx = Math.max(-bound, Math.min(bound, p.x + (dx / distance) * step));
    const nz = Math.max(-bound, Math.min(bound, p.z + (dz / distance) * step));
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

  private activeMoveBound(): number {
    return this.zone === 'dungeon' ? DUNGEON_MOVE_BOUND : this.moveBound;
  }

  private activeNavigationBound(): number {
    return this.zone === 'dungeon' ? DUNGEON_NAVIGATION_BOUND : this.moveBound;
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
      this.activeMoveBound(),
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
      this.activeNavigationBound(),
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
      this.activeNavigationBound(),
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
    if (this.movementSuppressedForFrame) return;
    if (this.elapsed - this.lastMoveCommandAt >= MOVE_COMMAND_MIN_INTERVAL) {
      this.lastMoveCommandAt = this.elapsed;
      this.queuedMoveCommand = null;
      this.net.send({ type: 'move', entityId: this.net.playerId, target, run });
      return;
    }
    this.queuedMoveCommand = { target, run };
  }

  private flushQueuedMoveCommand(): void {
    if (this.movementSuppressedForFrame) return;
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
    if (pending.kind === 'ore') {
      const ore = this.oreNodeViews.get(pending.id);
      if (!ore || ore.state.depleted) targetAvailable = false;
    }
    if (pending.kind === 'displacer') {
      const displacer = this.displacerViews.get(pending.id);
      if (!displacer || displacer.state.zone !== this.zone) targetAvailable = false;
    }
    if (pending.kind === 'treasure') {
      const treasure = this.treasureLodeState;
      if (!treasure || !treasure.rewardReady || !treasure.canClaim) targetAvailable = false;
    }
    if (pending.kind === 'utraean-console') {
      if (this.utraeanRelayState?.phase !== 'dormant') targetAvailable = false;
    }
    if (pending.kind === 'utraean-rune') {
      const relay = this.utraeanRelayState;
      if (!relay || relay.phase !== 'active' || relay.guardianActive || !relay.participant || !relay.runes.some((rune) => rune.id === pending.id)) {
        targetAvailable = false;
      }
    }
    if (pending.kind === 'utraean-chest') {
      const relay = this.utraeanRelayState;
      if (!relay || relay.phase !== 'reward' || !relay.canClaim) targetAvailable = false;
    }
    if (pending.kind === 'revive') {
      const target = this.latestEntities.get(pending.id);
      if (!target || target.kind !== 'player' || target.alive) targetAvailable = false;
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

    if (pending.kind === 'ore' && this.miningState.cooldownRemaining > 0.06) {
      const wasMoving = !!this.clickMoveTarget || !!this.queuedMoveCommand;
      this.clickMoveTarget = null;
      this.queuedMoveCommand = null;
      if (wasMoving && p) this.sendMoveCommand({ x: p.x, y: 0, z: p.z }, false);
      return;
    }

    if (pending.kind === 'displacer') {
      const displacer = this.displacerViews.get(pending.id);
      // A permissao e autoritativa. Ao chegar por predicao local, aguarda o
      // primeiro snapshot que marque esta ancora como a atual.
      if (displacer && !displacer.state.current) return;
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
    } else if (pending.kind === 'ore') {
      this.mineOreNode(pending.id);
    } else if (pending.kind === 'displacer') {
      this.activateOrOpenDisplacer(pending.id);
    } else if (pending.kind === 'treasure') {
      this.claimTreasureLode();
    } else if (pending.kind === 'utraean-console') {
      this.activateUtraeanConsole();
    } else if (pending.kind === 'utraean-rune') {
      const rune = this.utraeanRelayState?.runes.find((candidate) => candidate.id === pending.id);
      if (rune) this.activateUtraeanRune(rune);
    } else if (pending.kind === 'utraean-chest') {
      this.claimUtraeanRelay();
    } else if (pending.kind === 'revive') {
      this.prepareStationarySkillCast();
      this.net.send({ type: 'revive-player', entityId: this.net.playerId, targetPlayerId: pending.id });
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

  private requestCooperativeRevive(targetPlayerId: string): void {
    const target = this.latestEntities.get(targetPlayerId);
    const local = this.latestEntities.get(this.net.playerId);
    if (!target || target.kind !== 'player' || target.alive || local?.alive !== true) {
      this.hud.pushSystemMessage('Este aliado não está disponível para reanimação.');
      return;
    }
    const range = COOPERATIVE_REVIVE_RANGE - 0.35;
    if (this.localPlayerDistanceTo(target.position.x, target.position.z) > range) {
      this.beginPendingInteraction({
        kind: 'revive', id: target.id,
        x: target.position.x, y: target.position.y, z: target.position.z,
        range,
      });
      return;
    }
    this.prepareStationarySkillCast();
    this.net.send({ type: 'revive-player', entityId: this.net.playerId, targetPlayerId });
  }

  private interactWithOreNode(nodeId: string, allowClickAutomove: boolean): void {
    const view = this.oreNodeViews.get(nodeId);
    if (!view || view.state.depleted || this.zone !== 'overworld') return;
    if (!this.canMineOreNode(view.state, true)) return;
    const target = view.state.position;
    const interactionRange = Math.max(0.75, view.state.interactRange - ORE_INTERACT_SAFETY_MARGIN);
    if (this.localPlayerDistanceTo(target.x, target.z) > interactionRange) {
      if (!allowClickAutomove) {
        this.setSelectedNpc(null);
        return;
      }
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.closeNpcPanels();
      this.beginPendingInteraction({
        kind: 'ore',
        id: nodeId,
        x: target.x,
        y: target.y,
        z: target.z,
        range: interactionRange,
      });
      return;
    }
    this.setSelectedNpc(null);
    this.setSelectedEnemy(null);
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.mineOreNode(nodeId);
  }

  private interactWithDisplacer(nodeId: string, allowClickAutomove: boolean): void {
    const view = this.displacerViews.get(nodeId);
    if (!view || view.state.zone !== this.zone) return;
    const state = view.state;
    const range = Math.max(0.75, state.interactRange - 0.15);
    if (this.localPlayerDistanceTo(state.position.x, state.position.z) > range || !state.current) {
      if (!allowClickAutomove) {
        this.setSelectedNpc(null);
        return;
      }
      this.closeNpcPanels();
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.beginPendingInteraction({
        kind: 'displacer',
        id: state.id,
        x: state.position.x,
        y: state.position.y,
        z: state.position.z,
        range,
      });
      return;
    }
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.activateOrOpenDisplacer(nodeId);
  }

  private activateOrOpenDisplacer(nodeId: string): void {
    const state = this.displacerViews.get(nodeId)?.state;
    if (!state || state.zone !== this.zone || !state.current) return;
    if (state.canActivate) {
      this.sfx.play('arcane-nova');
      this.net.send({ type: 'activate-displacer', entityId: this.net.playerId, nodeId });
      return;
    }
    if (state.activated) {
      this.sfx.play('ui');
      this.hud.showDisplacerNetwork(this.displacerStates, state.id, this.difficultyState);
      this.hudDirty = true;
      return;
    }
    this.hud.pushSystemMessage(state.lockedReason || `Nível ${state.requiredLevel} necessário para estabilizar esta âncora.`);
  }

  private interactWithTreasureLode(allowClickAutomove: boolean): void {
    const state = this.treasureLodeState;
    if (!state || !state.rewardReady) return;
    if (!state.canClaim) {
      this.hud.pushSystemMessage(state.lockedReason || 'O cofre está reservado aos defensores da jazida.');
      return;
    }
    const range = Math.max(0.75, state.chestInteractRange - 0.15);
    if (this.localPlayerDistanceTo(state.chestPosition.x, state.chestPosition.z) > range) {
      if (!allowClickAutomove) return;
      this.closeNpcPanels();
      this.setSelectedNpc(null);
      this.setSelectedEnemy(null);
      this.beginPendingInteraction({
        kind: 'treasure', id: state.id,
        x: state.chestPosition.x, y: state.chestPosition.y, z: state.chestPosition.z, range,
      });
      return;
    }
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.claimTreasureLode();
  }

  private claimTreasureLode(): void {
    const state = this.treasureLodeState;
    if (!state?.canClaim || !state.rewardReady) return;
    this.sfx.play('chest');
    this.net.send({ type: 'claim-treasure-lode', entityId: this.net.playerId });
  }

  private interactWithUtraeanConsole(allowClickAutomove: boolean): void {
    const state = this.utraeanRelayState;
    if (!state) return;
    if (state.phase !== 'dormant') {
      this.hud.pushSystemMessage(state.lockedReason || 'O circuito não pode ser ativado agora.');
      return;
    }
    const range = Math.max(0.75, state.consoleInteractRange - 0.15);
    if (this.localPlayerDistanceTo(state.center.x, state.center.z) > range) {
      if (!allowClickAutomove) return;
      this.closeNpcPanels();
      this.beginPendingInteraction({
        kind: 'utraean-console', id: state.id,
        x: state.center.x, y: state.center.y, z: state.center.z, range,
      });
      return;
    }
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.activateUtraeanConsole();
  }

  private activateUtraeanConsole(): void {
    if (this.utraeanRelayState?.phase !== 'dormant') return;
    this.sfx.play('arcane-nova');
    this.net.send({ type: 'start-utraean-relay', entityId: this.net.playerId });
  }

  private interactWithUtraeanRune(rune: UtraeanRuneState, allowClickAutomove: boolean): void {
    const state = this.utraeanRelayState;
    if (!state || state.phase !== 'active') return;
    if (state.guardianActive) {
      this.hud.pushSystemMessage(state.lockedReason || 'Derrote o Sentinela para liberar as runas.');
      return;
    }
    if (!state.participant) {
      this.hud.pushSystemMessage(state.lockedReason || 'A tentativa atual pertence ao grupo que ativou o console.');
      return;
    }
    const range = 3.05;
    if (this.localPlayerDistanceTo(rune.position.x, rune.position.z) > range) {
      if (!allowClickAutomove) return;
      this.closeNpcPanels();
      this.beginPendingInteraction({
        kind: 'utraean-rune', id: rune.id,
        x: rune.position.x, y: rune.position.y, z: rune.position.z, range,
      });
      return;
    }
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.activateUtraeanRune(rune);
  }

  private activateUtraeanRune(rune: UtraeanRuneState): void {
    if (this.utraeanRelayState?.phase !== 'active' || !this.utraeanRelayState.participant) return;
    this.sfx.play(rune.current ? 'arcane-nova' : 'ui');
    this.net.send({ type: 'activate-utraean-rune', entityId: this.net.playerId, nodeId: rune.id });
  }

  private interactWithUtraeanChest(allowClickAutomove: boolean): void {
    const state = this.utraeanRelayState;
    if (!state || state.phase !== 'reward') return;
    if (!state.canClaim) {
      this.hud.pushSystemMessage(state.lockedReason || 'O cofre não reconhece este personagem.');
      return;
    }
    const range = Math.max(0.75, state.chestInteractRange - 0.15);
    if (this.localPlayerDistanceTo(state.chestPosition.x, state.chestPosition.z) > range) {
      if (!allowClickAutomove) return;
      this.closeNpcPanels();
      this.beginPendingInteraction({
        kind: 'utraean-chest', id: state.id,
        x: state.chestPosition.x, y: state.chestPosition.y, z: state.chestPosition.z, range,
      });
      return;
    }
    this.cancelAutomoveIntent();
    this.closeNpcPanels();
    this.claimUtraeanRelay();
  }

  private claimUtraeanRelay(): void {
    if (this.utraeanRelayState?.phase !== 'reward' || !this.utraeanRelayState.canClaim) return;
    this.sfx.play('chest');
    this.net.send({ type: 'claim-utraean-relay', entityId: this.net.playerId });
  }

  private mineOreNode(nodeId: string): void {
    const view = this.oreNodeViews.get(nodeId);
    if (!view || view.state.depleted) return;
    if (!this.canMineOreNode(view.state, true)) {
      if (this.pendingInteraction?.kind === 'ore' && this.pendingInteraction.id === nodeId) {
        this.pendingInteraction = null;
      }
      return;
    }
    if (this.miningState.cooldownRemaining > 0.06) {
      const node = view.state;
      this.pendingInteraction = {
        kind: 'ore',
        id: nodeId,
        x: node.position.x,
        y: node.position.y,
        z: node.position.z,
        range: Math.max(0.75, node.interactRange - ORE_INTERACT_SAFETY_MARGIN),
      };
      this.hudDirty = true;
      return;
    }
    this.lastAttackAimPoint = { ...view.state.position };
    this.localAimHoldUntil = Math.max(this.localAimHoldUntil, this.elapsed + this.miningState.cooldown);
    this.sfx.play('hit-physical');
    const triggersTreasureLode = this.treasureLodeState?.nodeId === nodeId
      && this.treasureLodeState.phase === 'dormant';
    if (!triggersTreasureLode) {
      this.miningState = {
        ...this.miningState,
        cooldownRemaining: this.miningState.cooldown,
        lastNodeId: nodeId,
      };
    }
    this.net.send({ type: 'mine-ore', entityId: this.net.playerId, nodeId });
  }

  private canMineOreNode(node: OreNodeState, showFeedback = false): boolean {
    const requiredLevel = Math.max(1, node.requiredLevel || ORE_REQUIRED_LEVEL[node.kind]);
    const currentLevel = this.professions.mining.level;
    if (currentLevel < requiredLevel) {
      if (showFeedback) {
        this.sfx.play('ui');
        this.hud.pushSystemMessage(
          `${ORE_NODE_NAMES[node.kind]} requer Mineração Nv ${requiredLevel}. Seu nível atual é ${currentLevel}.`,
        );
      }
      return false;
    }
    const requiredToolTier = Math.max(0, node.requiredToolTier ?? 0);
    if (this.miningState.tool.tier < requiredToolTier) {
      if (showFeedback) {
        this.sfx.play('ui');
        this.hud.pushSystemMessage(
          `${node.rich ? 'Veio Rico' : ORE_NODE_NAMES[node.kind]} requer ${miningToolForTier(requiredToolTier).label}. `
          + `Equipe-a permanentemente forjando com Borin.`,
        );
      }
      return false;
    }
    const treasure = this.treasureLodeState;
    if (treasure?.nodeId === node.id && (treasure.phase === 'wave' || treasure.phase === 'intermission')) {
      if (showFeedback) {
        this.sfx.play('ui');
        this.hud.pushSystemMessage(treasure.lockedReason || 'Derrote a emboscada antes de minerar a jazida.');
      }
      return false;
    }
    return true;
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
      bound: this.activeNavigationBound(),
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

  /** Dispara a acao que ocupa o slot (1-8) no layout atual da hotbar. */
  private triggerHotbarSlot(slot: number): void {
    const action = this.hotbarLayout[slot - 1];
    if (!action) return;
    this.triggerHotbarAction(action);
  }

  /** Executa uma acao da hotbar (via tecla 1-8 ou clique no slot). */
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
        this.castCatalogSkill('arcane-nova');
        return;
      case 'arcane-bolt':
        this.sfx.unlock();
        this.castCatalogSkill('arcane-bolt', 'Selecione um inimigo para Dardo Arcano.');
        return;
      case 'bulwark-call':
        this.sfx.unlock();
        this.castCatalogSkill('bulwark-call');
        return;
      case 'storm-orb':
        this.sfx.unlock();
        this.castCatalogSkill('storm-orb');
        return;
      case 'feral-form':
        this.sfx.unlock();
        this.castCatalogSkill('feral-form');
        return;
      case 'root-snare':
        this.sfx.unlock();
        this.castCatalogSkill('root-snare');
        return;
      case 'chain-lightning':
        this.sfx.unlock();
        this.castCatalogSkill('chain-lightning', 'Selecione um inimigo para Relâmpago Encadeado.');
        return;
      case 'renewal-wave':
        this.sfx.unlock();
        this.castCatalogSkill('renewal-wave');
        return;
      case 'phase-step':
        this.sfx.unlock();
        this.castCatalogSkill('phase-step');
        return;
      case 'nature-spirit':
        this.sfx.unlock();
        this.castCatalogSkill('nature-spirit');
        return;
      case 'war-cry':
        this.sfx.unlock();
        this.castCatalogSkill('war-cry');
        return;
      case 'heavy-strike':
        this.sfx.unlock();
        this.castCatalogSkill('heavy-strike', 'Selecione um inimigo para Golpe Pesado.');
        return;
      case 'charge':
        this.sfx.unlock();
        this.castCatalogSkill('charge', 'Selecione um inimigo para Investida.');
        return;
      case 'steel-sweep':
        this.sfx.unlock();
        this.castCatalogSkill('steel-sweep');
        return;
      case 'iron-guard':
        this.sfx.unlock();
        this.castCatalogSkill('iron-guard');
        return;
    }
  }

  /** Espelha o requisito do servidor para dar feedback imediato ao jogador. */
  private hasEquippedPhysicalWeapon(): boolean {
    return (['weapon', 'offhand'] as const).some((slot) => {
      const itemId = this.cachedEquipment[slot];
      const item = itemId ? this.cachedInventory.find((candidate) => candidate.id === itemId) : undefined;
      return item ? isWeaponKind(item.kind) : false;
    });
  }

  /**
   * Guarda de Ferro precisa nascer parada. Limpa rotas e coalescing antes do
   * envio do cast e fecha somente o frame atual para predicao/comandos move.
   */
  private prepareStationarySkillCast(): void {
    const plan = stationarySkillMovementPlan({
      clickMoveActive: this.clickMoveTarget !== null,
      pendingInteractionActive: this.pendingInteraction !== null,
      heldGroundMoveActive: this.heldGroundMoveActive,
      queuedMoveActive: this.queuedMoveCommand !== null,
      autorunActive: this.autorunActive,
    });
    if (plan.clearClickMove) this.clickMoveTarget = null;
    if (plan.clearPendingInteraction) this.pendingInteraction = null;
    if (plan.clearHeldGroundMove) this.heldGroundMoveActive = false;
    if (plan.clearQueuedMove) this.queuedMoveCommand = null;
    if (plan.clearAutorun) this.autorunActive = false;
    this.keyboardMove.reset();
    this.movementSuppressedForFrame = plan.suppressMovementForFrame;
    this.hudDirty = true;
  }

  /**
   * Usa os metadados normalizados do wire apenas para UX de alvo/movimento.
   * Mana, cooldown, alcance, acerto e ganho de maestria permanecem autoritativos.
   */
  private castCatalogSkill(skillId: SkillId, missingTargetMessage?: string): void {
    const player = this.latestEntities.get(this.net.playerId);
    const skill = catalogSkill(player?.skills, skillId);
    if (!skill) {
      this.hud.pushSystemMessage('Essa habilidade não foi anunciada pelo servidor.');
      return;
    }
    const targetId = this.selectedEnemyId;
    const target = targetId ? this.latestEntities.get(targetId) : undefined;
    const groundTarget = skill.targetMode === 'ground'
      ? this.world.pickGround(this.world.screenRay(this.input.pointer))?.point ?? null
      : null;
    const plan = skillCastPlan(skill, {
      selectedTargetId: targetId,
      selectedTargetIsAliveEnemy: target?.alive === true && target.kind === 'enemy',
      groundTargetAvailable: groundTarget !== null,
      hasPhysicalWeapon: this.hasEquippedPhysicalWeapon(),
      movementInterruptionPlausible: player?.alive === true
        && player?.jumping !== true
        && skill.cooldownRemaining <= 0.05
        && (player?.mana ?? 0) >= skill.manaCost,
    });
    if (!plan.allowed) {
      const message = plan.failure === 'temporarily-blocked'
        ? plan.failureReason ?? `${skill.label} está bloqueada temporariamente.`
        : plan.failure === 'physical-weapon-required'
        ? `Equipe uma arma física para usar ${skill.label}.`
        : plan.failure === 'ground-target-required'
          ? `Aponte para o chão para usar ${skill.label}.`
        : missingTargetMessage ?? `Selecione um inimigo para usar ${skill.label}.`;
      this.hud.pushSystemMessage(message);
      return;
    }
    if (plan.clearMovement) this.prepareStationarySkillCast();
    if (plan.targetId && target) {
      this.lastAttackAimPoint = target.position;
      // Um move coalescido pendente cancelaria a skill armada 1 frame depois.
      this.queuedMoveCommand = null;
    }
    if (groundTarget) {
      this.lastAttackAimPoint = groundTarget;
      this.queuedMoveCommand = null;
      this.showMarker(groundTarget.x, groundTarget.y, groundTarget.z, 'interact');
    }
    const sweepAim = plan.skill === 'steel-sweep'
      ? target?.alive === true && target.kind === 'enemy'
        ? target.position
        : this.lastAttackAimPoint
      : null;
    this.net.send({
      type: 'cast-skill',
      entityId: this.net.playerId,
      skill: plan.skill,
      ...(plan.targetId ? { targetId: plan.targetId } : {}),
      ...(sweepAim && Number.isFinite(sweepAim.x) && Number.isFinite(sweepAim.y) && Number.isFinite(sweepAim.z)
        ? { target: { x: sweepAim.x, y: sweepAim.y, z: sweepAim.z } }
        : {}),
      ...(groundTarget && Number.isFinite(groundTarget.x) && Number.isFinite(groundTarget.y) && Number.isFinite(groundTarget.z)
        ? { target: { x: groundTarget.x, y: groundTarget.y, z: groundTarget.z } }
        : {}),
    });
  }

  /** Troca as posicoes de duas acoes da hotbar (drag & drop) e persiste. */
  private swapHotbarSlots(from: HotbarAction, to: HotbarAction): void {
    const next = swapHotbarActions(this.hotbarLayout, from, to);
    if (!next) return;
    this.hotbarLayout = next;
    persistHotbarLoadout(window.localStorage, this.hotbarLayout);
    this.hud.setHotbarLayout(this.hotbarLayout);
    this.sfx.play('ui');
  }

  /** Somente um catalogo wire completo pode retirar uma skill persistida. */
  private reconcileHotbarFromSkillCatalog(skills: unknown): void {
    const announced = announcedSkillIdsFromWire(skills);
    if (!announced) return;
    const next = reconcileHotbarLoadout(this.hotbarLayout, announced);
    const changed = next.some((action, index) => action !== this.hotbarLayout[index]);
    this.announcedSkillIds = announced;
    if (!changed) return;
    this.hotbarLayout = next;
    persistHotbarLoadout(window.localStorage, next);
    this.hud.setHotbarLayout(next);
    this.hudDirty = true;
  }

  private equipHotbarSkill(skill: SkillId, replace: SkillId): void {
    if (!this.announcedSkillIds) return;
    const next = replaceHotbarSkill(this.hotbarLayout, skill, replace, this.announcedSkillIds);
    if (!next) return;
    this.hotbarLayout = next;
    persistHotbarLoadout(window.localStorage, next);
    this.hud.setHotbarLayout(next);
    this.hudDirty = true;
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

  private updateLootTooltip(snapshot: WorldSnapshot): void {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = rect.left+(this.input.pointer.x+1)*0.5*rect.width;
    const clientY = rect.top+(1-this.input.pointer.y)*0.5*rect.height;
    const topElement = document.elementFromPoint(clientX, clientY);
    if (!this.canvas.matches(':hover') || topElement !== this.canvas) {
      this.hud.hideWorldItemTooltip();
      return;
    }

    const ray = this.world.screenRay(this.input.pointer);
    // Mantem a mesma prioridade do clique: um inimigo vivo em cima do drop
    // continua sendo o foco de combate, nao abre um tooltip concorrente.
    if (this.pickEnemyForRay(ray, true)) {
      this.hud.hideWorldItemTooltip();
      return;
    }
    const lootPick = rayPickBest(
      ray,
      this.lootViews.entries(),
      ([, view]) => {
        const p = entityPosition(view.entity);
        return { x: p.x, y: p.y+0.44, z: p.z };
      },
      () => LOOT_CLICK_RADIUS,
    );
    const item = lootPick ? snapshot.loot.find((candidate) => candidate.id === lootPick[0]) : undefined;
    if (!item) {
      this.hud.hideWorldItemTooltip();
      return;
    }
    this.hud.showWorldItemTooltip(item, clientX, clientY);
  }

  private handleClick(ndc: PointerNdc): void {
    this.heldGroundMoveActive = false;
    this.hud.hidePlayerContextMenu();
    this.sfx.unlock();
    const ray = this.world.screenRay(ndc);
    const allowClickAutomove = canStartClickAutomove({ keyboardMovementActive: this.isKeyboardMovementActive() });
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

    const relay = this.utraeanRelayState;
    if (relay?.phase === 'reward') {
      const hit = distanceRayToPoint(ray, {
        x: relay.chestPosition.x,
        y: relay.chestPosition.y + 0.62,
        z: relay.chestPosition.z,
      });
      if (hit.distanceSq <= 1.2 * 1.2) {
        this.interactWithUtraeanChest(allowClickAutomove);
        return;
      }
    } else if (relay?.phase === 'dormant') {
      const hit = distanceRayToPoint(ray, { x: relay.center.x, y: relay.center.y + 0.72, z: relay.center.z });
      if (hit.distanceSq <= 1.35 * 1.35) {
        this.interactWithUtraeanConsole(allowClickAutomove);
        return;
      }
    } else if (relay?.phase === 'active') {
      let runePick: { rune: UtraeanRuneState; t: number } | null = null;
      for (const rune of relay.runes) {
        const hit = distanceRayToPoint(ray, { x: rune.position.x, y: rune.position.y + 1.25, z: rune.position.z });
        if (hit.distanceSq <= 1.25 * 1.25 && (!runePick || hit.t < runePick.t)) runePick = { rune, t: hit.t };
      }
      if (runePick) {
        this.interactWithUtraeanRune(runePick.rune, allowClickAutomove);
        return;
      }
    }

    const treasure = this.treasureLodeState;
    if (treasure?.rewardReady) {
      const hit = distanceRayToPoint(ray, {
        x: treasure.chestPosition.x,
        y: treasure.chestPosition.y + 0.58,
        z: treasure.chestPosition.z,
      });
      if (hit.distanceSq <= 1.15 * 1.15) {
        this.interactWithTreasureLode(allowClickAutomove);
        return;
      }
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

    const displacerPick = rayPickBest(
      ray,
      [...this.displacerViews.entries()].filter(([, view]) => view.state.zone === this.zone),
      ([, view]) => {
        const p = view.state.position;
        return { x: p.x, y: p.y + 1.15, z: p.z };
      },
      () => 1.25,
    );
    if (displacerPick) {
      this.interactWithDisplacer(displacerPick[0], allowClickAutomove);
      return;
    }

    // NPCs e baus ganham do portal: Riven e o bau profundo ficam perto da
    // saida e nao podem ter seu clique capturado pelo grande volume do veu.
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

    const orePick = rayPickBest(
      ray,
      [...this.oreNodeViews.entries()].filter(([, view]) => !view.state.depleted),
      ([, view]) => {
        const p = entityPosition(view.visual.root);
        return { x: p.x, y: p.y + 0.56, z: p.z };
      },
      () => ORE_CLICK_RADIUS,
    );
    if (orePick) {
      this.interactWithOreNode(orePick[0], allowClickAutomove);
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

    const closeOre = this.findOreNear(ground.point);
    if (closeOre) {
      this.interactWithOreNode(closeOre, allowClickAutomove);
      return;
    }

    const closeDisplacer = this.findDisplacerNear(ground.point);
    if (closeDisplacer) {
      this.interactWithDisplacer(closeDisplacer, allowClickAutomove);
      return;
    }

    if (this.treasureLodeState?.rewardReady && Math.hypot(
      ground.point.x - this.treasureLodeState.chestPosition.x,
      ground.point.z - this.treasureLodeState.chestPosition.z,
    ) < 1.7) {
      this.interactWithTreasureLode(allowClickAutomove);
      return;
    }

    if (this.utraeanRelayState) {
      const state = this.utraeanRelayState;
      if (state.phase === 'reward' && Math.hypot(
        ground.point.x - state.chestPosition.x,
        ground.point.z - state.chestPosition.z,
      ) < 1.7) {
        this.interactWithUtraeanChest(allowClickAutomove);
        return;
      }
      if (state.phase === 'dormant' && Math.hypot(
        ground.point.x - state.center.x,
        ground.point.z - state.center.z,
      ) < 1.7) {
        this.interactWithUtraeanConsole(allowClickAutomove);
        return;
      }
      if (state.phase === 'active') {
        const rune = state.runes.find((candidate) => Math.hypot(
          ground.point.x - candidate.position.x,
          ground.point.z - candidate.position.z,
        ) < 1.7);
        if (rune) {
          this.interactWithUtraeanRune(rune, allowClickAutomove);
          return;
        }
      }
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
        const runicElite = e.kind === 'enemy' ? runicElitePresentationGate(e) : null;
        const difficultyModifiers = e.kind === 'enemy'
          ? difficultyModifiersPresentationGate(e, this.difficultyState) ?? []
          : [];
        const enemyName = difficultyModifiers.length > 0
          ? `${runicElite?.targetName ?? enemyPresentationForVariant(e.enemyVariant).targetName} · ${this.difficultyState.label}`
          : runicElite?.targetName ?? '';
        view.healthBar.setHealth(e.hp, e.maxHp, e.level, e.kind === 'player' ? e.name : enemyName);
        view.healthBar.setWorldPosition(p.x, p.y + ENEMY_HEALTH_BAR_HEIGHT * visualScale, p.z);
        view.healthBar.update(this.world, e.alive);
      }

      if (e.kind === 'player') {
        this.ensureHero(view, e);
      } else {
        view.enemyVariant = enemyPresentationForVariant(e.enemyVariant).variant;
        this.ensureZombie(view);
        this.syncEnemyPresentation(view, view.enemyVariant);
      }
      this.syncRunicEliteVisual(view, e);
      this.syncDifficultyAffixVisual(view, e);
      this.syncAshVeilStatus(view, e, entities);
      this.syncRuinExposedStatus(view, e, entities);
      this.syncBossSealPhaseVisual(view, e);
      this.syncArcaneResonanceStatus(view, e, entities);
      this.syncStormOrbVisual(view, e);
      this.syncFeralFormVisual(view, e);
      this.syncReviveProtectionVisual(view, e);
      this.syncViewEquipment(view, this.visibleWeaponFor(e));
      if (e.kind === 'player') this.syncViewGearExtras(view, e);
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.healthBar?.dispose();
      this.clearEnemySpecialVisuals(view);
      this.clearAshVeilVisual(view);
      this.clearRuinExposedVisual(view);
      this.clearBossSealPhaseVisual(view);
      this.clearRunicEliteVisual(view);
      this.clearDifficultyAffixVisual(view);
      this.clearArcaneResonanceVisual(view);
      this.clearStormOrbVisual(view);
      this.clearFeralFormVisual(view);
      this.clearReviveProtectionVisual(view);
      this.clearGuardianRetaliationVisual(view);
      destroyEntity(view.entity);
      this.views.delete(id);
      this.enemyHp.delete(id);
    }
    this.hud.syncPlayerContextTargets(availablePlayerContextIds);
    this.syncGuardianRetaliationTargetVisuals(entities);
  }

  private createView(e: EntityState): View {
    const entity = makeEntity(e.id, this.world.app);
    const visual = makeEntity(`${e.id}-visual`, this.world.app);
    entity.addChild(visual);
    const local = e.id === this.net.playerId;
    const fallback = e.kind === 'player'
      ? this.world.createFallbackCharacter('player-fallback', local ? 0x3b82f6 : 0x2f9f68, 0xf2c79b)
      : isAshCorruptorVariant(e.enemyVariant)
        ? this.world.createFallbackCharacter('enemy-ash-corruptor-fallback', 0x59624d, 0xd29c46)
      : isRuinBruteVariant(e.enemyVariant)
          ? this.world.createFallbackCharacter('enemy-ruin-brute-fallback', 0x713529, 0x767d80)
        : isUtraeanSentinelVariant(e.enemyVariant)
          ? this.world.createFallbackCharacter('enemy-utraean-sentinel-fallback', 0x385c6c, 0x8baab5)
        : isShardcasterVariant(e.enemyVariant)
        ? this.world.createFallbackCharacter('enemy-shardcaster-fallback', 0x57306f, 0xc28ae8)
        : this.world.createFallbackCharacter('enemy-fallback', 0xb33a3a, 0x7a2222);
    visual.addChild(fallback);
    this.world.root.addChild(entity);
    const healthBar = e.kind === 'player' && local ? undefined : new HealthBarOverlay(this.uiLayer);
    const view: View = {
      entity,
      visual,
      healthBar,
      kind: e.kind,
      enemyVariant: e.kind === 'enemy' ? enemyPresentationForVariant(e.enemyVariant).variant : undefined,
    };
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
    // A oficina do Borin possui blockers autoritativos; sua estrutura nao pode
    // "respirar" para fora deles. Somente fogo/faíscas/barras animam por peça.
    if (view.definition.kind === 'blacksmith') {
      view.serviceProps.setLocalPosition(0, 0, 0);
      view.serviceProps.setLocalScale(1, 1, 1);
    } else {
      view.serviceProps.setLocalPosition(0, state.lift, 0);
      view.serviceProps.setLocalScale(state.scale, state.scale, state.scale);
    }
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
      return npcServicePriorityScore({
        kind: npc.kind,
        blacksmith: {
          ...this.blacksmithActionState(),
          forgeableBatches: this.blacksmithForgeableBatches(npc),
        },
      });
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
      return buildNpcServiceStatusLabel({
        kind: npc.kind,
        blacksmith: {
          ...action,
          forgeableBatches: this.blacksmithForgeableBatches(npc),
        },
      });
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

  private isStashableItem(item: Pick<InventoryItem, 'kind' | 'stackable' | 'equipped' | 'equipSlot'>): boolean {
    if (item.kind === 'coin') return false;
    if (item.stackable) return true;
    return !!item.equipSlot && !item.equipped;
  }

  private stashItemsFrom(items: readonly InventoryItem[]): HudStashItem[] {
    return items
      .filter((item) => item.count > 0 && this.isStashableItem(item))
      .map((item) => ({
        ...item,
        name: item.name || itemDisplayName(item),
        icon: item.icon || itemIconFor(item.kind, item.rarity),
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
      forgeRecipes: this.forgeRecipesFor(view.definition.forgeRecipes ?? []),
      professions: this.professions,
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
    this.hud.hideDisplacerNetwork();
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
    if (!weapon || !isWeaponKind(weapon.kind)) return null;
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
    if (!weapon || !isWeaponKind(weapon.kind)) {
      return { label: 'Aprimorar arma', disabled: true, status: 'Equipe uma arma para aprimorá-la.' };
    }
    const gem = this.blacksmithGemKindForEquippedWeapon();
    if (!gem) return { label: 'Arma no maximo', disabled: true, status: 'Esta arma ja esta no limite.' };
    const shortName = this.gemShortName(gem);
    if (this.stackCount(gem) <= 0) {
      return { label: `Precisa ${shortName}`, disabled: true, status: `Preciso de uma ${this.gemFullName(gem)}.` };
    }
    return {
      label: `Aprimorar com ${shortName}`,
      disabled: false,
      status: `Consome 1 ${this.gemFullName(gem)}.`,
      item: gem,
    };
  }

  private blacksmithForgeableBatches(npc: NpcDefinition): number {
    return (npc.forgeRecipes ?? []).reduce((total, recipe) => {
      if (this.professions.smithing.level < recipe.requiredLevel) return total;
      const ingredients = this.forgeIngredientsFor(recipe);
      const available = ingredients.length > 0 && ingredients.every((ingredient) => (
        ingredient.count > 0 && this.stackCount(ingredient.kind) >= ingredient.count
      ));
      return total + (available ? 1 : 0);
    }, 0);
  }

  private refreshBlacksmithDialogue(status?: string): void {
    const action = this.blacksmithActionState();
    this.hud.updateNpcDialogueActionLabel(
      action.label,
      action.disabled || this.forgeRecipePending !== null || this.blacksmithUpgradePending,
    );
    this.hud.setNpcDialogueActionPending(this.blacksmithUpgradePending);
    const active = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
    if (active?.definition.kind === 'blacksmith') {
      this.hud.updateNpcDialogueProfessions(this.professions);
      this.hud.updateForgeRecipes(this.forgeRecipesFor(active.definition.forgeRecipes ?? []));
    }
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
    return this.stackCountIn(this.cachedInventory, kind);
  }

  private stackCountIn(inventory: readonly InventoryItem[], kind: ItemKind): number {
    return inventory.reduce((total, item) => (
      item.kind === kind && item.stackable ? total + item.count : total
    ), 0);
  }

  /** Conta tanto pilhas quanto instancias unicas, necessario para saidas de gear. */
  private inventoryKindCount(kind: ItemKind): number {
    return this.inventoryKindCountIn(this.cachedInventory, kind);
  }

  private inventoryKindCountIn(inventory: readonly InventoryItem[], kind: ItemKind): number {
    return inventory.reduce((total, item) => {
      if (item.kind !== kind) return total;
      return total + (item.stackable ? item.count : 1);
    }, 0);
  }

  private inventoryRecipeOutputCountIn(
    inventory: readonly InventoryItem[],
    kind: ItemKind,
    setId?: ForgeRecipeState['outputSetId'],
    setPieceId?: string,
  ): number {
    if (!setId || !setPieceId) return this.inventoryKindCountIn(inventory, kind);
    return inventory.reduce((total, item) => (
      item.kind === kind && item.setId === setId && item.setPieceId === setPieceId ? total + 1 : total
    ), 0);
  }

  private forgeIngredientsFor(recipe: ForgeRecipeState): ForgeRecipeState['ingredients'] {
    const ingredients = recipe.ingredients?.filter((ingredient) => ingredient.count > 0) ?? [];
    if (ingredients.length > 0) return ingredients;
    return recipe.inputKind && recipe.inputCount > 0
      ? [{ kind: recipe.inputKind, count: recipe.inputCount }]
      : [];
  }

  private forgeRecipesFor(recipes: readonly ForgeRecipeState[]): HudForgeRecipe[] {
    const lockAll = this.forgeRecipePending !== null || this.blacksmithUpgradePending;
    return recipes.map((recipe) => {
      const pending = this.forgeRecipePending?.recipeId === recipe.id;
      const requiredLevel = Math.max(1, recipe.requiredLevel || 1);
      const professionLocked = this.professions.smithing.level < requiredLevel;
      const toolRecipe = recipe.recipeType === 'tool' ? miningToolRecipeGate(recipe) : null;
      const invalidToolRecipe = recipe.recipeType === 'tool' && toolRecipe === null;
      const hasSetOutputFields = recipe.outputSetId !== undefined || recipe.outputSetPieceId !== undefined;
      const setOutput = equipmentSetForgeOutputPresentation(recipe);
      const invalidSetRecipe = hasSetOutputFields && setOutput === null;
      const toolTier = toolRecipe?.toolTier ?? 0;
      const requiredToolTier = toolRecipe?.requiredToolTier ?? 0;
      const currentToolTier = this.miningState.tool.tier;
      const toolOwned = recipe.recipeType === 'tool' && toolTier > 0 && currentToolTier >= toolTier;
      const toolLocked = recipe.recipeType === 'tool' && !toolOwned && currentToolTier !== requiredToolTier;
      const masteryItemLevelBonus = recipe.recipeType === 'equipment'
        ? Math.floor(Math.max(0, this.professions.smithing.level - requiredLevel) / 2)
        : 0;
      const ingredients = this.forgeIngredientsFor(recipe).map((ingredient) => ({
        ...ingredient,
        owned: this.stackCount(ingredient.kind),
      }));
      return {
        ...recipe,
        ingredients,
        outputOwned: recipe.recipeType === 'tool'
          ? (toolOwned ? 1 : 0)
          : this.inventoryRecipeOutputCountIn(
            this.cachedInventory,
            recipe.outputKind,
            setOutput?.definition.id,
            setOutput?.piece.id,
          ),
        professionLocked,
        toolLocked,
        toolOwned,
        currentToolTier,
        requiredToolLabel: miningToolForTier(requiredToolTier).label,
        masteryItemLevelBonus,
        currentItemLevelBonus: (recipe.itemLevelBonus ?? 0) + masteryItemLevelBonus,
        disabled: lockAll || professionLocked || invalidToolRecipe || invalidSetRecipe || toolLocked || toolOwned || ingredients.length === 0
          || ingredients.some((ingredient) => ingredient.owned < ingredient.count),
        pending,
      };
    });
  }

  private resolveForgeRecipePending(inventory: readonly InventoryItem[]): string | undefined {
    const pending = this.forgeRecipePending;
    if (!pending) return undefined;
    // Ferramentas vivem no ofício, não no inventário; sua confirmação é o
    // evento autoritativo tool_forged, nunca uma contagem da mochila.
    if (pending.recipeType === 'tool') return undefined;
    const outputAfter = this.inventoryRecipeOutputCountIn(
      inventory,
      pending.outputKind,
      pending.outputSetId,
      pending.outputSetPieceId,
    );
    if (outputAfter < pending.beforeOutput + pending.expectedOutput) return undefined;

    this.forgeRecipePending = null;
    this.hud.setForgeRecipePending(pending.recipeId, false);
    this.sfx.play('pickup');
    const label = this.npcViews.get(pending.npcId)?.definition.forgeRecipes
      ?.find((recipe) => recipe.id === pending.recipeId)?.label
      ?? (pending.recipeType === 'equipment' ? 'Equipamento' : 'Barra');
    return `${label} concluido com sucesso.`;
  }

  private clearForgeRecipePending(status: string): void {
    const pending = this.forgeRecipePending;
    if (pending) this.hud.setForgeRecipePending(pending.recipeId, false);
    this.forgeRecipePending = null;
    const active = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
    if (active?.definition.kind === 'blacksmith') this.refreshBlacksmithDialogue(status);
  }

  /** Confirma o unico pedido pendente pelo evento autoritativo do servidor. */
  private confirmForgeRecipePendingFromEvent(eventType: string, status: string): void {
    const pending = this.forgeRecipePending;
    if (!pending) return;
    const matches = (eventType === 'item_forged' && pending.recipeType === 'equipment')
      || (eventType === 'ore_smelted' && pending.recipeType === 'smelting')
      || (eventType === 'tool_forged' && pending.recipeType === 'tool');
    if (!matches) return;

    this.clearForgeRecipePending(status);
    this.sfx.play('pickup');
  }

  private resolveProfessionContractPendingFromSnapshot(professions: ProfessionsState): string | undefined {
    const pending = this.professionContractPending;
    if (!pending) return undefined;
    const contract = professions.contracts.find((candidate) => candidate.id === pending.contractId);
    if (!contract?.claimed) return undefined;

    this.professionContractPending = null;
    this.hud.setProfessionContractPending(pending.contractId, false);
    this.sfx.play('pickup');
    return `${contract.title} concluído. Recompensa recebida.`;
  }

  private clearProfessionContractPending(status: string, success = false): void {
    const pending = this.professionContractPending;
    if (!pending) return;
    this.professionContractPending = null;
    this.hud.setProfessionContractPending(pending.contractId, false);
    if (success) this.sfx.play('pickup');
    const active = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
    if (active?.definition.kind === 'blacksmith') this.refreshBlacksmithDialogue(status);
  }

  private handleProfessionContractClaim(npcId: string, contractId: string): void {
    if (this.professionContractPending || this.activeQuestNpcId !== npcId) return;
    const view = this.npcViews.get(npcId);
    if (!view || view.definition.kind !== 'blacksmith' || view.definition.zone !== this.zone) return;
    if (this.localPlayerDistanceTo(view.definition.position.x, view.definition.position.z) > BLACKSMITH_SERVICE_SAFE_RANGE) {
      this.hud.setNpcDialogueStatus('Aproxime-se do Borin para resgatar o contrato.');
      return;
    }

    const contract = this.professions.contracts.find((candidate) => candidate.id === contractId);
    if (!contract) {
      this.hud.setNpcDialogueStatus('Este contrato não está mais disponível.');
      return;
    }
    if (contract.claimed) {
      this.hud.setNpcDialogueStatus('Este contrato já foi concluído.');
      return;
    }
    if (!contract.claimable) {
      this.hud.setNpcDialogueStatus('Conclua todos os objetivos antes de resgatar.');
      return;
    }

    const pending: ProfessionContractPending = { npcId, contractId };
    this.professionContractPending = pending;
    this.hud.setProfessionContractPending(contractId, true);
    this.hud.setNpcDialogueStatus('Solicitando a recompensa do contrato...');
    this.sfx.play('ui');
    this.net.send({
      type: 'claim-profession-contract',
      entityId: this.net.playerId,
      npcId,
      contractId,
    });
    window.setTimeout(() => {
      if (this.professionContractPending !== pending) return;
      this.clearProfessionContractPending(
        'Resgate sem confirmação. Confira sua posição e o contrato antes de repetir.',
      );
    }, 11000);
  }

  private handleForgeRecipe(npcId: string, recipeId: string, count: number): void {
    if (this.forgeRecipePending || this.blacksmithUpgradePending || this.activeQuestNpcId !== npcId) return;
    const view = this.npcViews.get(npcId);
    const recipe = view?.definition.kind === 'blacksmith'
      ? view.definition.forgeRecipes?.find((candidate) => candidate.id === recipeId)
      : undefined;
    if (!view || !recipe || view.definition.zone !== this.zone) return;
    if (this.localPlayerDistanceTo(view.definition.position.x, view.definition.position.z) > BLACKSMITH_SERVICE_SAFE_RANGE) {
      this.hud.setNpcDialogueStatus('Aproxime-se do Borin para usar a forja.');
      return;
    }

    const requiredLevel = Math.max(1, recipe.requiredLevel || 1);
    if (this.professions.smithing.level < requiredLevel) {
      this.refreshBlacksmithDialogue(
        `${recipe.label} requer Ferraria Nv ${requiredLevel}. Seu nível atual é ${this.professions.smithing.level}.`,
      );
      return;
    }

    const recipeType = recipe.recipeType ?? 'smelting';
    const hasSetOutputFields = recipe.outputSetId !== undefined || recipe.outputSetPieceId !== undefined;
    const setOutput = equipmentSetForgeOutputPresentation(recipe);
    if (hasSetOutputFields && !setOutput) {
      this.refreshBlacksmithDialogue('Esta receita de conjunto não passou pela inspeção da forja.');
      return;
    }
    if (recipeType === 'tool') {
      const gated = miningToolRecipeGate(recipe);
      if (!gated) {
        this.refreshBlacksmithDialogue('Esta receita de ferramenta não passou pela inspeção da forja.');
        return;
      }
      const currentTier = this.miningState.tool.tier;
      if (currentTier >= (gated.toolTier ?? 0)) {
        this.refreshBlacksmithDialogue(`${gated.label} já faz parte do seu ofício.`);
        return;
      }
      if (currentTier !== (gated.requiredToolTier ?? 0)) {
        this.refreshBlacksmithDialogue(
          `${gated.label} requer primeiro ${miningToolForTier(gated.requiredToolTier ?? 0).label}.`,
        );
        return;
      }
    }
    const batch = recipeType === 'smelting' ? Math.max(1, Math.min(50, Math.floor(count))) : 1;
    const ingredients = this.forgeIngredientsFor(recipe);
    const missing = ingredients.find((ingredient) => (
      this.stackCount(ingredient.kind) < ingredient.count * batch
    ));
    if (ingredients.length === 0 || missing) {
      const detail = missing
        ? `${this.stackCount(missing.kind)}/${missing.count * batch}`
        : 'receita sem ingredientes';
      this.refreshBlacksmithDialogue(`Materiais insuficientes: ${detail}.`);
      return;
    }

    const pending: ForgeRecipePending = {
      npcId,
      recipeId,
      recipeType,
      outputKind: recipe.outputKind,
      outputSetId: setOutput?.definition.id,
      outputSetPieceId: setOutput?.piece.id,
      beforeOutput: this.inventoryRecipeOutputCountIn(
        this.cachedInventory,
        recipe.outputKind,
        setOutput?.definition.id,
        setOutput?.piece.id,
      ),
      expectedOutput: recipeType === 'tool' ? 0 : recipe.outputCount * batch,
    };
    this.forgeRecipePending = pending;
    this.sfx.play('ui');
    this.refreshBlacksmithDialogue(
      `${recipeType === 'smelting' ? 'Fundindo' : 'Forjando'} ${recipe.label.toLowerCase()}...`,
    );
    if (recipeType !== 'smelting') {
      this.net.send({
        type: 'forge-item-at-npc',
        entityId: this.net.playerId,
        npcId,
        recipeId,
      });
    } else {
      this.net.send({
        type: 'smelt-ore-at-npc',
        entityId: this.net.playerId,
        npcId,
        recipeId,
        count: batch,
      });
    }
    window.setTimeout(() => {
      if (this.forgeRecipePending !== pending) return;
      this.forgeRecipePending = null;
      if (this.activeQuestNpcId === npcId) {
        this.refreshBlacksmithDialogue('Pedido sem confirmacao. Confira sua posicao e o inventario antes de repetir.');
      }
    }, 11000);
  }

  private handleBlacksmithUpgrade(npcId: string): void {
    if (this.blacksmithUpgradePending || this.forgeRecipePending) return;
    const action = this.blacksmithActionState();
    this.hud.updateNpcDialogueActionLabel(action.label, action.disabled);
    if (action.disabled || !action.item) {
      this.hud.setNpcDialogueStatus(action.status ?? '');
      return;
    }

    this.blacksmithUpgradePending = true;
    this.refreshBlacksmithDialogue('Aprimoramento enviado ao servidor.');
    window.setTimeout(() => {
      if (!this.blacksmithUpgradePending) return;
      this.blacksmithUpgradePending = false;
      this.hud.setNpcDialogueActionPending(false);
      if (this.activeQuestNpcId === npcId) {
        this.refreshBlacksmithDialogue('Aprimoramento sem confirmação. Confira a arma e a gema antes de repetir.');
      }
    }, 11000);
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
    this.clearEnemySpecialVisuals(view);
    this.clearAshVeilVisual(view);
    this.clearRuinExposedVisual(view);
    this.clearBossSealPhaseVisual(view);
    this.clearArcaneResonanceVisual(view);
    this.clearStormOrbVisual(view);
    this.clearGuardianRetaliationVisual(view);
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
    view.weaponGripPose = undefined;
  }

  private syncEnemyPresentation(view: View, variant: EnemyVariant | undefined): void {
    if (this.disposed || view.kind !== 'enemy') {
      this.clearEnemySpecialVisuals(view);
      return;
    }
    if (isAshCorruptorVariant(variant)) {
      this.clearShardcasterVisual(view);
      this.clearRuinBruteVisual(view);
      this.clearUtraeanSentinelVisual(view);
      this.ensureAshCorruptorVisual(view);
      return;
    }
    if (isRuinBruteVariant(variant)) {
      this.clearShardcasterVisual(view);
      this.clearAshCorruptorVisual(view);
      this.clearUtraeanSentinelVisual(view);
      this.ensureRuinBruteVisual(view);
      return;
    }
    if (isUtraeanSentinelVariant(variant)) {
      this.clearShardcasterVisual(view);
      this.clearAshCorruptorVisual(view);
      this.clearRuinBruteVisual(view);
      this.ensureUtraeanSentinelVisual(view);
      return;
    }
    this.clearAshCorruptorVisual(view);
    this.clearRuinBruteVisual(view);
    this.clearUtraeanSentinelVisual(view);
    if (!isShardcasterVariant(variant)) {
      this.clearShardcasterVisual(view);
      return;
    }
    if (view.shardcasterRoot?.parent) return;
    this.clearShardcasterVisual(view);

    const crystalColor = colorFromCss(SHARDCASTER_PALETTE.crystal);
    const coreColor = colorFromCss(SHARDCASTER_PALETTE.crystalCore);
    const orbColor = colorFromCss(SHARDCASTER_PALETTE.orb);
    const crystalMaterial = createMaterial(crystalColor, {
      emissive: crystalColor,
      emissiveIntensity: 1.8,
      opacity: 0.9,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const coreMaterial = createMaterial(coreColor, {
      emissive: coreColor,
      emissiveIntensity: 2.4,
      opacity: 0.94,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const hazeMaterial = createMaterial(orbColor, {
      emissive: orbColor,
      emissiveIntensity: 1.55,
      opacity: 0.42,
      additive: true,
      unlit: true,
      depthWrite: false,
    });

    const root = makeEntity('shardcaster-adornment', this.world.app);
    view.visual.addChild(root);
    const crystalSpecs = [
      { x: -0.48, y: 1.63, z: -0.03, yaw: -20, roll: 18 },
      { x: 0.48, y: 1.63, z: -0.03, yaw: 20, roll: -18 },
      { x: 0, y: 1.95, z: -0.31, yaw: 0, roll: 0 },
    ] as const;
    const crystals = crystalSpecs.map((spec, index) => {
      const tall = index === 2;
      const crystal = this.world.createPrimitive(
        `shardcaster-crystal-${index}`,
        'cone',
        crystalMaterial,
        { x: spec.x, y: spec.y, z: spec.z },
        { x: tall ? 0.2 : 0.16, y: tall ? 0.62 : 0.48, z: tall ? 0.2 : 0.16 },
        root,
      );
      crystal.setLocalEulerAngles(spec.roll, spec.yaw, 0);
      return crystal;
    });

    const orb = this.world.createPrimitive(
      'shardcaster-orb',
      'sphere',
      coreMaterial,
      { x: 0, y: 2.25, z: 0.48 },
      { x: 0.28, y: 0.28, z: 0.28 },
      root,
    );
    this.world.createPrimitive(
      'shardcaster-orb-ring',
      'torus',
      hazeMaterial,
      { x: 0, y: 2.25, z: 0.48 },
      { x: 0.48, y: 0.025, z: 0.48 },
      root,
    ).setLocalEulerAngles(72, 0, 18);

    const light = makeEntity('shardcaster-orb-light', this.world.app);
    light.addComponent('light', {
      type: 'omni',
      color: orbColor,
      intensity: 1.05,
      range: 3.4,
      castShadows: false,
      falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
    });
    light.setLocalPosition(0, 2.25, 0.48);
    root.addChild(light);

    view.shardcasterRoot = root;
    view.shardcasterOrb = orb;
    view.shardcasterLight = light;
    view.shardcasterCrystals = crystals;
    view.shardcasterMaterials = [crystalMaterial, coreMaterial, hazeMaterial];
  }

  private updateShardcasterVisual(view: View): void {
    if (!view.shardcasterRoot || !view.shardcasterOrb) return;
    const phase = (view.animTime ?? 0) * 2.7;
    const pulse = 1 + Math.sin(phase * 2.1) * 0.08;
    const orbPosition = {
      x: Math.sin(phase) * 0.07,
      y: 2.25 + Math.sin(phase * 1.7) * 0.08,
      z: 0.48 + Math.cos(phase) * 0.045,
    };
    view.shardcasterOrb.setLocalPosition(orbPosition.x, orbPosition.y, orbPosition.z);
    view.shardcasterOrb.setLocalScale(0.28 * pulse, 0.28 * pulse, 0.28 * pulse);
    view.shardcasterOrb.setLocalEulerAngles(phase * 34, phase * 52, phase * 27);
    view.shardcasterLight?.setLocalPosition(orbPosition.x, orbPosition.y, orbPosition.z);
    if (view.shardcasterLight?.light) view.shardcasterLight.light.intensity = 1 + pulse * 0.18;
    for (let index = 0; index < (view.shardcasterCrystals?.length ?? 0); index++) {
      const crystal = view.shardcasterCrystals![index];
      const tall = index === 2;
      const localPulse = 1 + Math.sin(phase * 1.8 + index * 1.4) * 0.045;
      crystal.setLocalScale(
        (tall ? 0.2 : 0.16) * localPulse,
        (tall ? 0.62 : 0.48) * localPulse,
        (tall ? 0.2 : 0.16) * localPulse,
      );
    }
  }

  private clearShardcasterVisual(view: View): void {
    destroyEntity(view.shardcasterLight);
    destroyEntity(view.shardcasterOrb);
    destroyEntity(view.shardcasterRoot);
    for (const material of view.shardcasterMaterials ?? []) material.destroy();
    view.shardcasterRoot = undefined;
    view.shardcasterOrb = undefined;
    view.shardcasterLight = undefined;
    view.shardcasterCrystals = undefined;
    view.shardcasterMaterials = undefined;
  }

  private ensureAshCorruptorVisual(view: View): void {
    if (view.ashCorruptorRoot?.parent) return;
    this.clearAshCorruptorVisual(view);

    const ashColor = colorFromCss(ASH_CORRUPTOR_PALETTE.ash);
    const veilColor = colorFromCss(ASH_CORRUPTOR_PALETTE.veil);
    const amberColor = colorFromCss(ASH_CORRUPTOR_PALETTE.amber);
    const ashMaterial = createMaterial(ashColor, {
      emissive: ashColor,
      emissiveIntensity: 1.15,
      opacity: 0.84,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const veilMaterial = createMaterial(veilColor, {
      emissive: veilColor,
      emissiveIntensity: 1.85,
      opacity: 0.68,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const amberMaterial = createMaterial(amberColor, {
      emissive: amberColor,
      emissiveIntensity: 2.3,
      opacity: 0.94,
      additive: true,
      unlit: true,
      depthWrite: false,
    });

    const root = makeEntity('ash-corruptor-adornment', this.world.app);
    view.visual.addChild(root);
    const crown = makeEntity('ash-corruptor-crown', this.world.app);
    root.addChild(crown);
    this.world.createPrimitive(
      'ash-corruptor-crown-ring',
      'torus',
      ashMaterial,
      { x: 0, y: 2.04, z: 0 },
      { x: 0.55, y: 0.04, z: 0.55 },
      crown,
    );
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      const spike = this.world.createPrimitive(
        `ash-corruptor-crown-spike-${index}`,
        'cone',
        index % 2 === 0 ? amberMaterial : veilMaterial,
        {
          x: Math.sin(angle) * 0.42,
          y: 2.19,
          z: Math.cos(angle) * 0.42,
        },
        { x: 0.09, y: index % 2 === 0 ? 0.38 : 0.27, z: 0.09 },
        crown,
      );
      spike.setLocalEulerAngles(0, angle * 180 / Math.PI, index % 2 === 0 ? 9 : -9);
    }

    const orb = this.world.createPrimitive(
      'ash-corruptor-orb',
      'sphere',
      amberMaterial,
      { x: 0, y: 2.3, z: 0.38 },
      { x: 0.22, y: 0.22, z: 0.22 },
      root,
    );
    const orbRing = this.world.createPrimitive(
      'ash-corruptor-orb-sigil',
      'torus',
      veilMaterial,
      { x: 0, y: 2.3, z: 0.38 },
      { x: 0.39, y: 0.024, z: 0.39 },
      root,
    );
    orbRing.setLocalEulerAngles(68, 0, 28);

    const light = makeEntity('ash-corruptor-light', this.world.app);
    light.addComponent('light', {
      type: 'omni',
      color: amberColor,
      intensity: 1.1,
      range: 3.6,
      castShadows: false,
      falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
    });
    light.setLocalPosition(0, 2.3, 0.38);
    root.addChild(light);

    view.ashCorruptorRoot = root;
    view.ashCorruptorOrb = orb;
    view.ashCorruptorCrown = crown;
    view.ashCorruptorLight = light;
    view.ashCorruptorMaterials = [ashMaterial, veilMaterial, amberMaterial];
  }

  private updateAshCorruptorVisual(view: View): void {
    if (!view.ashCorruptorRoot || !view.ashCorruptorOrb) return;
    const phase = (view.animTime ?? 0) * 2.15;
    const pulse = 1 + Math.sin(phase * 2.3) * 0.09;
    view.ashCorruptorCrown?.setLocalEulerAngles(0, phase * 18, 0);
    view.ashCorruptorOrb.setLocalPosition(
      Math.sin(phase) * 0.055,
      2.3 + Math.sin(phase * 1.6) * 0.065,
      0.38 + Math.cos(phase) * 0.04,
    );
    view.ashCorruptorOrb.setLocalScale(0.22 * pulse, 0.22 * pulse, 0.22 * pulse);
    if (view.ashCorruptorLight?.light) view.ashCorruptorLight.light.intensity = 0.92 + pulse * 0.24;
  }

  private clearAshCorruptorVisual(view: View): void {
    destroyEntity(view.ashCorruptorLight);
    destroyEntity(view.ashCorruptorOrb);
    destroyEntity(view.ashCorruptorCrown);
    destroyEntity(view.ashCorruptorRoot);
    for (const material of view.ashCorruptorMaterials ?? []) material.destroy();
    view.ashCorruptorRoot = undefined;
    view.ashCorruptorOrb = undefined;
    view.ashCorruptorCrown = undefined;
    view.ashCorruptorLight = undefined;
    view.ashCorruptorMaterials = undefined;
  }

  private ensureRuinBruteVisual(view: View): void {
    if (view.ruinBruteRoot?.parent) return;
    this.clearRuinBruteVisual(view);

    const rustColor = colorFromCss(RUIN_BRUTE_PALETTE.rust);
    const ironColor = colorFromCss(RUIN_BRUTE_PALETTE.iron);
    const ironCoreColor = colorFromCss(RUIN_BRUTE_PALETTE.ironCore);
    const rustMaterial = createMaterial(rustColor, {
      emissive: rustColor,
      emissiveIntensity: 0.38,
      opacity: 0.96,
    });
    const ironMaterial = createMaterial(ironColor, {
      emissive: ironColor,
      emissiveIntensity: 0.24,
      opacity: 0.98,
    });
    const edgeMaterial = createMaterial(ironCoreColor, {
      emissive: ironCoreColor,
      emissiveIntensity: 0.82,
      opacity: 0.82,
      additive: true,
      unlit: true,
      depthWrite: false,
    });

    const root = makeEntity('ruin-brute-adornment', this.world.app);
    view.visual.addChild(root);
    const shoulders = [-1, 1].map((side) => {
      const shoulder = this.world.createPrimitive(
        `ruin-brute-shoulder-${side < 0 ? 'left' : 'right'}`,
        'box',
        ironMaterial,
        { x: side * 0.55, y: 1.62, z: -0.02 },
        { x: 0.62, y: 0.34, z: 0.72 },
        root,
      );
      shoulder.setLocalEulerAngles(0, 0, side * -12);
      this.world.createPrimitive(
        `ruin-brute-shoulder-rust-${side < 0 ? 'left' : 'right'}`,
        'box',
        rustMaterial,
        { x: side * 0.61, y: 1.7, z: 0.04 },
        { x: 0.48, y: 0.11, z: 0.78 },
        root,
      ).setLocalEulerAngles(0, 0, side * -12);
      return shoulder;
    });

    const plate = this.world.createPrimitive(
      'ruin-brute-armor-plate',
      'box',
      rustMaterial,
      { x: 0, y: 1.22, z: 0.3 },
      { x: 0.88, y: 0.88, z: 0.16 },
      root,
    );
    this.world.createPrimitive(
      'ruin-brute-armor-plate-rib',
      'box',
      edgeMaterial,
      { x: 0, y: 1.24, z: 0.4 },
      { x: 0.72, y: 0.08, z: 0.035 },
      root,
    );

    const maul = makeEntity('ruin-brute-maul-mass', this.world.app);
    root.addChild(maul);
    const handle = this.world.createPrimitive(
      'ruin-brute-maul-handle',
      'cylinder',
      rustMaterial,
      { x: -0.54, y: 1.02, z: -0.34 },
      { x: 0.09, y: 1.72, z: 0.09 },
      maul,
    );
    handle.setLocalEulerAngles(0, 0, 32);
    const head = this.world.createPrimitive(
      'ruin-brute-maul-head',
      'box',
      ironMaterial,
      { x: -0.98, y: 1.78, z: -0.34 },
      { x: 0.66, y: 0.42, z: 0.48 },
      maul,
    );
    head.setLocalEulerAngles(0, 0, 12);

    view.ruinBruteRoot = root;
    view.ruinBruteShoulders = shoulders;
    view.ruinBrutePlate = plate;
    view.ruinBruteMaul = maul;
    view.ruinBruteMaterials = [rustMaterial, ironMaterial, edgeMaterial];
  }

  private updateRuinBruteVisual(view: View): void {
    if (!view.ruinBruteRoot || !view.ruinBrutePlate) return;
    const phase = (view.animTime ?? 0) * 1.55;
    const pulse = 1 + Math.sin(phase * 2) * 0.025;
    view.ruinBrutePlate.setLocalScale(0.88 * pulse, 0.88 * pulse, 0.16);
    view.ruinBruteMaul?.setLocalEulerAngles(0, Math.sin(phase) * 2.4, 0);
    for (let index = 0; index < (view.ruinBruteShoulders?.length ?? 0); index++) {
      const shoulderPulse = 1 + Math.sin(phase * 1.8 + index * Math.PI) * 0.018;
      view.ruinBruteShoulders![index].setLocalScale(0.62 * shoulderPulse, 0.34, 0.72 * shoulderPulse);
    }
  }

  private clearRuinBruteVisual(view: View): void {
    destroyEntity(view.ruinBruteMaul);
    destroyEntity(view.ruinBrutePlate);
    for (const shoulder of view.ruinBruteShoulders ?? []) destroyEntity(shoulder);
    destroyEntity(view.ruinBruteRoot);
    for (const material of view.ruinBruteMaterials ?? []) material.destroy();
    view.ruinBruteRoot = undefined;
    view.ruinBruteShoulders = undefined;
    view.ruinBrutePlate = undefined;
    view.ruinBruteMaul = undefined;
    view.ruinBruteMaterials = undefined;
  }

  private ensureUtraeanSentinelVisual(view: View): void {
    if (view.utraeanSentinelRoot?.parent) return;
    this.clearUtraeanSentinelVisual(view);
    const stone = colorFromCss(UTRAEAN_SENTINEL_PALETTE.stone);
    const metal = colorFromCss(UTRAEAN_SENTINEL_PALETTE.metal);
    const rune = colorFromCss(UTRAEAN_SENTINEL_PALETTE.rune);
    const stoneMaterial = createMaterial(stone, { emissive: stone, emissiveIntensity: 0.38, opacity: 0.96 });
    const metalMaterial = createMaterial(metal, { emissive: metal, emissiveIntensity: 0.62, opacity: 0.96 });
    const runeMaterial = createMaterial(rune, {
      emissive: rune, emissiveIntensity: 2.4, opacity: 0.82,
      additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity('utraean-sentinel-adornment', this.world.app);
    view.visual.addChild(root);
    for (const side of [-1, 1]) {
      const shoulder = this.world.createPrimitive(
        `utraean-sentinel-shoulder-${side < 0 ? 'left' : 'right'}`, 'box', stoneMaterial,
        { x: side * 0.52, y: 1.62, z: 0 }, { x: 0.5, y: 0.25, z: 0.65 }, root,
      );
      shoulder.setLocalEulerAngles(0, 0, side * -14);
    }
    const core = this.world.createPrimitive(
      'utraean-sentinel-rune-core', 'sphere', runeMaterial,
      { x: 0, y: 1.32, z: 0.39 }, { x: 0.19, y: 0.26, z: 0.12 }, root,
    );
    const crown = this.world.createPrimitive(
      'utraean-sentinel-crown', 'torus', runeMaterial,
      { x: 0, y: 2.25, z: 0 }, { x: 0.42, y: 0.035, z: 0.42 }, root,
    );
    crown.setLocalEulerAngles(90, 0, 0);
    const spear = makeEntity('utraean-sentinel-spear', this.world.app);
    root.addChild(spear);
    const shaft = this.world.createPrimitive(
      'utraean-sentinel-spear-shaft', 'cylinder', metalMaterial,
      { x: 0.58, y: 1.12, z: 0.1 }, { x: 0.055, y: 1.75, z: 0.055 }, spear,
    );
    shaft.setLocalEulerAngles(0, 0, -18);
    const tip = this.world.createPrimitive(
      'utraean-sentinel-spear-tip', 'cone', runeMaterial,
      { x: 0.86, y: 2.02, z: 0.1 }, { x: 0.15, y: 0.42, z: 0.15 }, spear,
    );
    tip.setLocalEulerAngles(0, 0, -18);
    view.utraeanSentinelRoot = root;
    view.utraeanSentinelCore = core;
    view.utraeanSentinelCrown = crown;
    view.utraeanSentinelSpear = spear;
    view.utraeanSentinelMaterials = [stoneMaterial, metalMaterial, runeMaterial];
  }

  private updateUtraeanSentinelVisual(view: View): void {
    if (!view.utraeanSentinelRoot || !view.utraeanSentinelCore) return;
    const time = view.animTime ?? 0;
    const pulse = 1 + Math.sin(time * 5.2) * 0.08;
    view.utraeanSentinelCore.setLocalScale(0.19 * pulse, 0.26 * pulse, 0.12 * pulse);
    view.utraeanSentinelCrown?.setLocalEulerAngles(90, time * 48, 0);
    view.utraeanSentinelSpear?.setLocalEulerAngles(0, Math.sin(time * 2.1) * 3, 0);
  }

  private clearUtraeanSentinelVisual(view: View): void {
    destroyEntity(view.utraeanSentinelSpear);
    destroyEntity(view.utraeanSentinelCrown);
    destroyEntity(view.utraeanSentinelCore);
    destroyEntity(view.utraeanSentinelRoot);
    for (const material of view.utraeanSentinelMaterials ?? []) material.destroy();
    view.utraeanSentinelRoot = undefined;
    view.utraeanSentinelCore = undefined;
    view.utraeanSentinelCrown = undefined;
    view.utraeanSentinelSpear = undefined;
    view.utraeanSentinelMaterials = undefined;
  }

  /** Aura ortogonal ao archetype: nasce somente do envelope rúnico v1 validado. */
  private syncRunicEliteVisual(view: View, entity: EntityState): void {
    const runic = runicElitePresentationGate(entity);
    if (this.disposed || view.kind !== 'enemy' || !runic) {
      this.clearRunicEliteVisual(view);
      return;
    }
    if (view.runicEliteRoot?.parent && view.runicElitePhase === runic.phase) return;
    this.clearRunicEliteVisual(view);

    const primaryCss = runic.phase === 'aegis' ? RUNIC_ELITE_PALETTE.aegis : RUNIC_ELITE_PALETTE.fury;
    const coreCss = runic.phase === 'aegis' ? RUNIC_ELITE_PALETTE.aegisCore : RUNIC_ELITE_PALETTE.furyCore;
    const primary = colorFromCss(primaryCss);
    const core = colorFromCss(coreCss);
    const primaryMaterial = createMaterial(primary, {
      emissive: primary,
      emissiveIntensity: runic.phase === 'aegis' ? 1.8 : 2.15,
      opacity: 0.66,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const coreMaterial = createMaterial(core, {
      emissive: core,
      emissiveIntensity: 2.45,
      opacity: 0.88,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity(`runic-elite-${runic.phase}-aura`, this.world.app);
    view.visual.addChild(root);
    const rings = [0, 1].map((index) => this.world.createPrimitive(
      `runic-elite-${runic.phase}-ring-${index}`,
      'torus',
      index === 0 ? primaryMaterial : coreMaterial,
      { x: 0, y: 0.055 + index * 0.035, z: 0 },
      { x: 1.32 + index * 0.34, y: 0.025, z: 1.32 + index * 0.34 },
      root,
    ));
    const coreOrb = this.world.createPrimitive(
      `runic-elite-${runic.phase}-core`,
      'sphere',
      coreMaterial,
      { x: 0, y: 1.32, z: -0.18 },
      { x: 0.18, y: 0.18, z: 0.18 },
      root,
    );
    const runes: pc.Entity[] = [];
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI * 0.5 + Math.PI * 0.25;
      const radius = runic.phase === 'aegis' ? 0.78 : 0.86;
      const rune = this.world.createPrimitive(
        `runic-elite-${runic.phase}-sigil-${index}`,
        runic.phase === 'aegis' ? 'box' : 'cone',
        index % 2 === 0 ? primaryMaterial : coreMaterial,
        {
          x: Math.sin(angle) * radius,
          y: runic.phase === 'aegis' ? 1.08 : 1.32,
          z: Math.cos(angle) * radius,
        },
        runic.phase === 'aegis'
          ? { x: 0.11, y: 0.54, z: 0.04 }
          : { x: 0.13, y: 0.46, z: 0.13 },
        root,
      );
      rune.setLocalEulerAngles(0, angle * 180 / Math.PI, runic.phase === 'aegis' ? 18 : 0);
      runes.push(rune);
    }
    view.runicEliteRoot = root;
    view.runicEliteCore = coreOrb;
    view.runicEliteRings = rings;
    view.runicEliteRunes = runes;
    view.runicEliteMaterials = [primaryMaterial, coreMaterial];
    view.runicElitePhase = runic.phase;
  }

  private updateRunicEliteVisual(view: View): void {
    if (!view.runicEliteRoot || !view.runicEliteCore || !view.runicElitePhase) return;
    const time = view.animTime ?? 0;
    const fury = view.runicElitePhase === 'fury';
    const pulse = 1 + Math.sin(time * (fury ? 8.2 : 4.1)) * (fury ? 0.14 : 0.075);
    view.runicEliteRoot.setLocalEulerAngles(0, time * (fury ? 46 : 18), 0);
    view.runicEliteCore.setLocalScale(0.18 * pulse, 0.18 * pulse, 0.18 * pulse);
    for (let index = 0; index < (view.runicEliteRings?.length ?? 0); index++) {
      const ringPulse = 1 + Math.sin(time * (fury ? 7.4 : 3.4) + index * Math.PI) * (fury ? 0.08 : 0.035);
      const base = 1.32 + index * 0.34;
      view.runicEliteRings![index].setLocalScale(base * ringPulse, 0.025, base * ringPulse);
    }
    for (let index = 0; index < (view.runicEliteRunes?.length ?? 0); index++) {
      const bob = Math.sin(time * (fury ? 6.2 : 2.8) + index * 1.4) * (fury ? 0.12 : 0.05);
      const rune = view.runicEliteRunes![index];
      const position = rune.getLocalPosition();
      rune.setLocalPosition(position.x, (fury ? 1.32 : 1.08) + bob, position.z);
    }
  }

  private clearRunicEliteVisual(view: View): void {
    destroyEntity(view.runicEliteCore);
    for (const ring of view.runicEliteRings ?? []) destroyEntity(ring);
    for (const rune of view.runicEliteRunes ?? []) destroyEntity(rune);
    destroyEntity(view.runicEliteRoot);
    for (const material of view.runicEliteMaterials ?? []) material.destroy();
    view.runicEliteRoot = undefined;
    view.runicEliteCore = undefined;
    view.runicEliteRings = undefined;
    view.runicEliteRunes = undefined;
    view.runicEliteMaterials = undefined;
    view.runicElitePhase = undefined;
  }

  /** Halo de tier ortogonal ao arquétipo e às duas runas do Elite Rúnico. */
  private syncDifficultyAffixVisual(view: View, entity: EntityState): void {
    const modifiers = difficultyModifiersPresentationGate(entity, this.difficultyState);
    if (this.disposed || view.kind !== 'enemy' || !modifiers || modifiers.length === 0) {
      this.clearDifficultyAffixVisual(view);
      return;
    }
    const key = `${this.difficultyState.id}:${modifiers.map((modifier) => modifier.id).join(',')}`;
    if (view.difficultyAffixRoot?.parent && view.difficultyAffixKey === key) return;
    this.clearDifficultyAffixVisual(view);

    const accent = colorFromCss(DIFFICULTY_PALETTE[this.difficultyState.id]);
    const haloMaterial = createMaterial(accent, {
      emissive: accent, emissiveIntensity: 1.65, opacity: 0.52,
      additive: true, unlit: true, depthWrite: false,
    });
    const core = colorFromCss(this.difficultyState.id === 'elite' ? '#ffe4ff' : '#fff1d4');
    const coreMaterial = createMaterial(core, {
      emissive: core, emissiveIntensity: 2.1, opacity: 0.74,
      additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity(`difficulty-affixes-${key}`, this.world.app);
    view.visual.addChild(root);
    const rings = modifiers.map((modifier, index) => {
      const ring = this.world.createPrimitive(
        `difficulty-affix-ring-${modifier.id}`,
        'torus',
        index === 0 ? haloMaterial : coreMaterial,
        { x: 0, y: 0.09 + index * 0.05, z: 0 },
        { x: 1.56 + index * 0.25, y: 0.022, z: 1.56 + index * 0.25 },
        root,
      );
      ring.setLocalEulerAngles(index * 11, index * 37, index * -9);
      return ring;
    });
    const motes = modifiers.map((modifier, index) => {
      const angle = index / modifiers.length * Math.PI * 2;
      return this.world.createPrimitive(
        `difficulty-affix-sigil-${modifier.id}`,
        modifier.id === 'difficulty_fortified' ? 'box' : modifier.id === 'difficulty_vicious' ? 'cone' : 'sphere',
        index === 0 ? coreMaterial : haloMaterial,
        { x: Math.sin(angle) * 1.2, y: 1.05 + index * 0.32, z: Math.cos(angle) * 1.2 },
        { x: 0.12, y: modifier.id === 'difficulty_vicious' ? 0.28 : 0.12, z: 0.12 },
        root,
      );
    });
    view.difficultyAffixRoot = root;
    view.difficultyAffixRings = rings;
    view.difficultyAffixMotes = motes;
    view.difficultyAffixMaterials = [haloMaterial, coreMaterial];
    view.difficultyAffixKey = key;
  }

  private updateDifficultyAffixVisual(view: View): void {
    if (!view.difficultyAffixRoot) return;
    const time = view.animTime ?? 0;
    const elite = this.difficultyState.id === 'elite';
    view.difficultyAffixRoot.setLocalEulerAngles(0, time * (elite ? 34 : 22), 0);
    for (let index = 0; index < (view.difficultyAffixRings?.length ?? 0); index++) {
      const base = 1.56 + index * 0.25;
      const pulse = 1 + Math.sin(time * (elite ? 5.8 : 4.2) + index * Math.PI) * 0.055;
      view.difficultyAffixRings![index].setLocalScale(base * pulse, 0.022, base * pulse);
    }
    for (let index = 0; index < (view.difficultyAffixMotes?.length ?? 0); index++) {
      const mote = view.difficultyAffixMotes![index];
      const position = mote.getLocalPosition();
      mote.setLocalPosition(position.x, 1.05 + index * 0.32 + Math.sin(time * 4.5 + index) * 0.08, position.z);
    }
  }

  private clearDifficultyAffixVisual(view: View): void {
    for (const ring of view.difficultyAffixRings ?? []) destroyEntity(ring);
    for (const mote of view.difficultyAffixMotes ?? []) destroyEntity(mote);
    destroyEntity(view.difficultyAffixRoot);
    for (const material of view.difficultyAffixMaterials ?? []) material.destroy();
    view.difficultyAffixRoot = undefined;
    view.difficultyAffixRings = undefined;
    view.difficultyAffixMotes = undefined;
    view.difficultyAffixMaterials = undefined;
    view.difficultyAffixKey = undefined;
  }

  private clearEnemySpecialVisuals(view: View): void {
    this.clearShardcasterVisual(view);
    this.clearAshCorruptorVisual(view);
    this.clearRuinBruteVisual(view);
    this.clearUtraeanSentinelVisual(view);
    this.clearRunicEliteVisual(view);
    this.clearDifficultyAffixVisual(view);
  }

  private syncAshVeilStatus(view: View, entity: EntityState, entities: readonly EntityState[]): void {
    const presentation = ashVeilStatusPresentationGate(entity, entities);
    if (this.disposed || !presentation) {
      this.clearAshVeilVisual(view);
      return;
    }
    if (view.ashVeilRoot?.parent) return;
    this.clearAshVeilVisual(view);

    const veilColor = colorFromCss(ASH_CORRUPTOR_PALETTE.veil);
    const amberColor = colorFromCss(ASH_CORRUPTOR_PALETTE.amber);
    const veilMaterial = createMaterial(veilColor, {
      emissive: veilColor,
      emissiveIntensity: 1.65,
      opacity: 0.48,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const amberMaterial = createMaterial(amberColor, {
      emissive: amberColor,
      emissiveIntensity: 2,
      opacity: 0.66,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('ash-veil-status-overlay', this.world.app);
    view.visual.addChild(root);
    const ring = this.world.createPrimitive(
      'ash-veil-status-orbit',
      'torus',
      veilMaterial,
      { x: 0, y: 0.12, z: 0 },
      { x: 1.35, y: 0.026, z: 1.35 },
      root,
    );
    const sigil = this.world.createPrimitive(
      'ash-veil-status-sigil',
      'torus',
      amberMaterial,
      { x: 0, y: 1.28, z: 0.48 },
      { x: 0.42, y: 0.024, z: 0.42 },
      root,
    );
    sigil.setLocalEulerAngles(90, 0, 0);
    for (let index = 0; index < 3; index++) {
      const angle = index * Math.PI * 2 / 3;
      this.world.createPrimitive(
        `ash-veil-status-mote-${index}`,
        'sphere',
        index === 0 ? amberMaterial : veilMaterial,
        { x: Math.sin(angle) * 0.78, y: 1.12 + index * 0.12, z: Math.cos(angle) * 0.78 },
        { x: 0.105, y: 0.105, z: 0.105 },
        root,
      );
    }
    view.ashVeilRoot = root;
    view.ashVeilRing = ring;
    view.ashVeilSigil = sigil;
    view.ashVeilMaterials = [veilMaterial, amberMaterial];
  }

  private updateAshVeilVisual(view: View): void {
    if (!view.ashVeilRoot || !view.ashVeilRing || !view.ashVeilSigil) return;
    const phase = (view.animTime ?? 0) * 2.6;
    const pulse = 1 + Math.sin(phase * 2) * 0.075;
    view.ashVeilRoot.setLocalEulerAngles(0, phase * 24, 0);
    view.ashVeilRing.setLocalScale(1.35 * pulse, 0.026, 1.35 * pulse);
    view.ashVeilSigil.setLocalScale(0.42 / pulse, 0.024, 0.42 / pulse);
  }

  private clearAshVeilVisual(view: View): void {
    destroyEntity(view.ashVeilRing);
    destroyEntity(view.ashVeilSigil);
    destroyEntity(view.ashVeilRoot);
    for (const material of view.ashVeilMaterials ?? []) material.destroy();
    view.ashVeilRoot = undefined;
    view.ashVeilRing = undefined;
    view.ashVeilSigil = undefined;
    view.ashVeilMaterials = undefined;
  }

  private syncRuinExposedStatus(view: View, entity: EntityState, entities: readonly EntityState[]): void {
    const presentation = ruinExposedStatusPresentationGate(entity, entities);
    if (this.disposed || !presentation) {
      this.clearRuinExposedVisual(view);
      return;
    }
    if (view.ruinExposedRoot?.parent) return;
    this.clearRuinExposedVisual(view);

    const rustColor = colorFromCss(RUIN_BRUTE_PALETTE.rustCore);
    const ironColor = colorFromCss(RUIN_BRUTE_PALETTE.ironCore);
    const rustMaterial = createMaterial(rustColor, {
      emissive: rustColor,
      emissiveIntensity: 1.75,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ironMaterial = createMaterial(ironColor, {
      emissive: ironColor,
      emissiveIntensity: 1.95,
      opacity: 0.65,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('ruin-exposed-status-overlay', this.world.app);
    view.visual.addChild(root);
    const ring = this.world.createPrimitive(
      'ruin-exposed-status-ring',
      'torus',
      rustMaterial,
      { x: 0, y: 0.1, z: 0 },
      { x: 1.48, y: 0.03, z: 1.48 },
      root,
    );
    const plates: pc.Entity[] = [];
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI / 2 + Math.PI / 4;
      const plate = this.world.createPrimitive(
        `ruin-exposed-broken-plate-${index}`,
        'box',
        index % 2 === 0 ? ironMaterial : rustMaterial,
        {
          x: Math.sin(angle) * 0.84,
          y: 0.84 + (index % 2) * 0.38,
          z: Math.cos(angle) * 0.84,
        },
        { x: 0.28, y: 0.42, z: 0.055 },
        root,
      );
      plate.setLocalEulerAngles(index % 2 === 0 ? 16 : -16, angle * 180 / Math.PI, index * 13);
      plates.push(plate);
    }
    view.ruinExposedRoot = root;
    view.ruinExposedRing = ring;
    view.ruinExposedPlates = plates;
    view.ruinExposedMaterials = [rustMaterial, ironMaterial];
  }

  private updateRuinExposedVisual(view: View): void {
    if (!view.ruinExposedRoot || !view.ruinExposedRing) return;
    const phase = (view.animTime ?? 0) * 3.4;
    const pulse = 1 + Math.sin(phase * 2.2) * 0.08;
    view.ruinExposedRoot.setLocalEulerAngles(0, Math.sin(phase * 0.55) * 8, 0);
    view.ruinExposedRing.setLocalScale(1.48 * pulse, 0.03, 1.48 * pulse);
    for (let index = 0; index < (view.ruinExposedPlates?.length ?? 0); index++) {
      const platePulse = 1 + Math.sin(phase * 1.6 + index) * 0.09;
      view.ruinExposedPlates![index].setLocalScale(0.28 * platePulse, 0.42 * platePulse, 0.055);
    }
  }

  private clearRuinExposedVisual(view: View): void {
    destroyEntity(view.ruinExposedRing);
    for (const plate of view.ruinExposedPlates ?? []) destroyEntity(plate);
    destroyEntity(view.ruinExposedRoot);
    for (const material of view.ruinExposedMaterials ?? []) material.destroy();
    view.ruinExposedRoot = undefined;
    view.ruinExposedRing = undefined;
    view.ruinExposedPlates = undefined;
    view.ruinExposedMaterials = undefined;
  }

  private syncArcaneResonanceStatus(view: View, entity: EntityState, entities: readonly EntityState[]): void {
    const presentation = arcaneResonanceStatusPresentationGate(entity, entities);
    if (this.disposed || !presentation) {
      this.clearArcaneResonanceVisual(view);
      return;
    }
    if (view.arcaneResonanceRoot?.parent) return;
    this.clearArcaneResonanceVisual(view);

    const markColor = colorFromCss(ARCANE_RESONANCE_PALETTE.mark);
    const coreColor = colorFromCss(ARCANE_RESONANCE_PALETTE.core);
    const ruptureColor = colorFromCss(ARCANE_RESONANCE_PALETTE.rupture);
    const markMaterial = createMaterial(markColor, {
      emissive: markColor,
      emissiveIntensity: 2.1,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const coreMaterial = createMaterial(coreColor, {
      emissive: coreColor,
      emissiveIntensity: 2.45,
      opacity: 0.72,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ruptureMaterial = createMaterial(ruptureColor, {
      emissive: ruptureColor,
      emissiveIntensity: 1.9,
      opacity: 0.52,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('arcane-resonance-status-overlay', this.world.app);
    view.visual.addChild(root);
    const floorRing = this.world.createPrimitive(
      'arcane-resonance-mark-ring',
      'torus',
      markMaterial,
      { x: 0, y: 0.1, z: 0 },
      { x: 1.18, y: 0.026, z: 1.18 },
      root,
    );
    const sigil = this.world.createPrimitive(
      'arcane-resonance-mark-sigil',
      'torus',
      ruptureMaterial,
      { x: 0, y: 1.34, z: 0.47 },
      { x: 0.48, y: 0.022, z: 0.48 },
      root,
    );
    sigil.setLocalEulerAngles(90, 0, 0);
    const motes: pc.Entity[] = [];
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI / 2;
      const mote = this.world.createPrimitive(
        `arcane-resonance-mark-mote-${index}`,
        index % 2 === 0 ? 'sphere' : 'box',
        index % 2 === 0 ? coreMaterial : markMaterial,
        { x: Math.sin(angle) * 0.76, y: 0.7 + index * 0.14, z: Math.cos(angle) * 0.76 },
        { x: 0.095, y: 0.095, z: 0.095 },
        root,
      );
      motes.push(mote);
    }
    view.arcaneResonanceRoot = root;
    view.arcaneResonanceRings = [floorRing, sigil];
    view.arcaneResonanceMotes = motes;
    view.arcaneResonanceMaterials = [markMaterial, coreMaterial, ruptureMaterial];
  }

  private updateArcaneResonanceVisual(view: View): void {
    if (!view.arcaneResonanceRoot || !view.arcaneResonanceRings?.length) return;
    const phase = (view.animTime ?? 0) * 3.1;
    const pulse = 1 + Math.sin(phase * 1.9) * 0.08;
    view.arcaneResonanceRoot.setLocalEulerAngles(0, phase * 18, 0);
    view.arcaneResonanceRings[0].setLocalScale(1.18 * pulse, 0.026, 1.18 * pulse);
    view.arcaneResonanceRings[1]?.setLocalScale(0.48 / pulse, 0.022, 0.48 / pulse);
    for (let index = 0; index < (view.arcaneResonanceMotes?.length ?? 0); index++) {
      const mote = view.arcaneResonanceMotes![index];
      const angle = phase * 0.75 + index * Math.PI / 2;
      const scale = 0.085 + (Math.sin(phase * 2.4 + index) + 1) * 0.018;
      mote.setLocalPosition(
        Math.sin(angle) * 0.76,
        0.74 + index * 0.12 + Math.sin(angle * 1.7) * 0.1,
        Math.cos(angle) * 0.76,
      );
      mote.setLocalScale(scale, scale, scale);
    }
  }

  private clearArcaneResonanceVisual(view: View): void {
    for (const ring of view.arcaneResonanceRings ?? []) destroyEntity(ring);
    for (const mote of view.arcaneResonanceMotes ?? []) destroyEntity(mote);
    destroyEntity(view.arcaneResonanceRoot);
    for (const material of view.arcaneResonanceMaterials ?? []) material.destroy();
    view.arcaneResonanceRoot = undefined;
    view.arcaneResonanceRings = undefined;
    view.arcaneResonanceMotes = undefined;
    view.arcaneResonanceMaterials = undefined;
  }

  /** A órbita pública nasce somente do BuffState autoritativo e suas cargas. */
  private syncStormOrbVisual(view: View, entity: EntityState): void {
    const presentation = stormOrbBuffPresentationGate(entity);
    if (this.disposed || view.kind !== 'player' || !presentation) {
      this.clearStormOrbVisual(view);
      return;
    }
    const charges = presentation.buff.charges ?? 0;
    if (view.stormOrbRoot?.parent && view.stormOrbCharges === charges) return;
    this.clearStormOrbVisual(view);

    const shell = colorFromCss(STORM_ORB_PALETTE.shell);
    const core = colorFromCss(STORM_ORB_PALETTE.core);
    const storm = colorFromCss(STORM_ORB_PALETTE.storm);
    const shellMaterial = createMaterial(shell, {
      emissive: shell,
      emissiveIntensity: 2.25,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const coreMaterial = createMaterial(core, {
      emissive: core,
      emissiveIntensity: 2.8,
      opacity: 0.9,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const stormMaterial = createMaterial(storm, {
      emissive: storm,
      emissiveIntensity: 2.15,
      opacity: 0.62,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('storm-orb-authoritative-orbit', this.world.app);
    view.visual.addChild(root);
    const ring = this.world.createPrimitive(
      'storm-orb-authoritative-ring',
      'torus',
      shellMaterial,
      { x: 0, y: 1.18, z: 0 },
      { x: 1.24, y: 0.024, z: 1.24 },
      root,
    );
    const cores: pc.Entity[] = [];
    for (let index = 0; index < charges; index++) {
      const angle = index / Math.max(1, charges) * Math.PI * 2;
      const orb = this.world.createPrimitive(
        `storm-orb-authoritative-charge-${index}`,
        'sphere',
        index % 2 === 0 ? coreMaterial : stormMaterial,
        { x: Math.sin(angle) * 1.02, y: 1.18, z: Math.cos(angle) * 1.02 },
        { x: 0.18, y: 0.18, z: 0.18 },
        root,
      );
      cores.push(orb);
    }
    view.stormOrbRoot = root;
    view.stormOrbRing = ring;
    view.stormOrbCores = cores;
    view.stormOrbMaterials = [shellMaterial, coreMaterial, stormMaterial];
    view.stormOrbCharges = charges;
  }

  private updateStormOrbVisual(view: View): void {
    if (!view.stormOrbRoot || !view.stormOrbRing || !view.stormOrbCores?.length) return;
    const phase = (view.animTime ?? 0) * 3.8;
    const pulse = 1 + Math.sin(phase * 1.7) * 0.08;
    view.stormOrbRoot.setLocalEulerAngles(0, phase * 42, 0);
    view.stormOrbRing.setLocalScale(1.24 * pulse, 0.024, 1.24 * pulse);
    for (let index = 0; index < view.stormOrbCores.length; index++) {
      const orb = view.stormOrbCores[index];
      const baseAngle = index / view.stormOrbCores.length * Math.PI * 2;
      const scale = 0.16 + (Math.sin(phase * 2.3 + index) + 1) * 0.025;
      orb.setLocalPosition(
        Math.sin(baseAngle) * 1.02,
        1.18 + Math.sin(phase * 1.5 + index * 1.4) * 0.16,
        Math.cos(baseAngle) * 1.02,
      );
      orb.setLocalScale(scale, scale, scale);
    }
  }

  private clearStormOrbVisual(view: View): void {
    destroyEntity(view.stormOrbRing);
    for (const orb of view.stormOrbCores ?? []) destroyEntity(orb);
    destroyEntity(view.stormOrbRoot);
    for (const material of view.stormOrbMaterials ?? []) material.destroy();
    view.stormOrbRoot = undefined;
    view.stormOrbRing = undefined;
    view.stormOrbCores = undefined;
    view.stormOrbMaterials = undefined;
    view.stormOrbCharges = undefined;
  }

  /** Silhueta bestial procedural, criada somente pelo buff público autoritativo. */
  private syncFeralFormVisual(view: View, entity: EntityState): void {
    const presentation = feralFormBuffPresentationGate(entity);
    if (this.disposed || view.kind !== 'player' || !presentation) {
      this.clearFeralFormVisual(view);
      return;
    }
    if (view.feralFormRoot?.parent) return;
    this.clearFeralFormVisual(view);
    const hide = colorFromCss(FERAL_FORM_PALETTE.hide);
    const shadow = colorFromCss(FERAL_FORM_PALETTE.shadow);
    const eye = colorFromCss(FERAL_FORM_PALETTE.eye);
    const hideMaterial = createMaterial(hide, {
      emissive: hide, emissiveIntensity: 1.35, opacity: 0.28, additive: true, unlit: true, depthWrite: false,
    });
    const shadowMaterial = createMaterial(shadow, {
      emissive: shadow, emissiveIntensity: 1.15, opacity: 0.34, additive: true, unlit: true, depthWrite: false,
    });
    const eyeMaterial = createMaterial(eye, {
      emissive: eye, emissiveIntensity: 2.8, opacity: 0.9, additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity('feral-form-authoritative-silhouette', this.world.app);
    view.visual.addChild(root);
    const ring = this.world.createPrimitive(
      'feral-form-authoritative-ground-ring', 'torus', hideMaterial,
      { x: 0, y: 0.08, z: 0 }, { x: 0.92, y: 0.025, z: 0.92 }, root,
    );
    const parts: pc.Entity[] = [];
    parts.push(this.world.createPrimitive(
      'feral-form-authoritative-shadow-body', 'sphere', shadowMaterial,
      { x: 0, y: 1.05, z: 0 }, { x: 0.58, y: 0.88, z: 0.46 }, root,
    ));
    for (const side of [-1, 1]) {
      parts.push(this.world.createPrimitive(
        `feral-form-authoritative-claw-${side}`, 'box', hideMaterial,
        { x: side * 0.62, y: 0.72, z: 0.2 }, { x: 0.1, y: 0.1, z: 0.68 }, root,
      ));
      const eyePart = this.world.createPrimitive(
        `feral-form-authoritative-eye-${side}`, 'sphere', eyeMaterial,
        { x: side * 0.13, y: 1.72, z: 0.42 }, { x: 0.055, y: 0.045, z: 0.045 }, root,
      );
      parts.push(eyePart);
    }
    view.feralFormRoot = root;
    view.feralFormRing = ring;
    view.feralFormParts = parts;
    view.feralFormMaterials = [hideMaterial, shadowMaterial, eyeMaterial];
  }

  private updateFeralFormVisual(view: View): void {
    if (!view.feralFormRoot || !view.feralFormRing || !view.feralFormParts?.length) return;
    const phase = (view.animTime ?? 0) * 5.2;
    const pulse = 1 + Math.sin(phase * 1.7) * 0.08;
    view.feralFormRing.setLocalScale(0.92 * pulse, 0.025, 0.92 * pulse);
    view.feralFormRoot.setLocalEulerAngles(0, Math.sin(phase * 0.42) * 3.5, 0);
    for (let index = 0; index < view.feralFormParts.length; index++) {
      const part = view.feralFormParts[index];
      if (index === 0) part.setLocalScale(0.58 * pulse, 0.88 / pulse, 0.46 * pulse);
      else if (index === 1 || index === 3) part.setLocalEulerAngles(0, index === 1 ? -16 : 16, Math.sin(phase + index) * 12);
    }
  }

  private clearFeralFormVisual(view: View): void {
    destroyEntity(view.feralFormRing);
    for (const part of view.feralFormParts ?? []) destroyEntity(part);
    destroyEntity(view.feralFormRoot);
    for (const material of view.feralFormMaterials ?? []) material.destroy();
    view.feralFormRoot = undefined;
    view.feralFormRing = undefined;
    view.feralFormParts = undefined;
    view.feralFormMaterials = undefined;
  }

  private syncReviveProtectionVisual(view: View, entity: EntityState): void {
    const protection = reviveProtectionBuffPresentationGate(entity);
    if (this.disposed || view.kind !== 'player' || !protection) {
      this.clearReviveProtectionVisual(view);
      return;
    }
    if (view.reviveProtectionRoot?.parent) return;
    this.clearReviveProtectionVisual(view);
    const color = colorFromCss(COOPERATIVE_REVIVE_PALETTE.protection);
    const core = colorFromCss(COOPERATIVE_REVIVE_PALETTE.target);
    const outerMaterial = createMaterial(color, {
      emissive: color, emissiveIntensity: 2.05, opacity: 0.48, additive: true, unlit: true, depthWrite: false,
    });
    const coreMaterial = createMaterial(core, {
      emissive: core, emissiveIntensity: 1.7, opacity: 0.42, additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity('revive-protection-authoritative-aura', this.world.app);
    view.visual.addChild(root);
    const outer = this.world.createPrimitive(
      'revive-protection-authoritative-outer', 'torus', outerMaterial,
      { x: 0, y: 0.1, z: 0 }, { x: 1.02, y: 0.028, z: 1.02 }, root,
    );
    const inner = this.world.createPrimitive(
      'revive-protection-authoritative-inner', 'torus', coreMaterial,
      { x: 0, y: 1.05, z: 0 }, { x: 0.68, y: 0.022, z: 0.68 }, root,
    );
    inner.setLocalEulerAngles(22, 0, 0);
    view.reviveProtectionRoot = root;
    view.reviveProtectionRings = [outer, inner];
    view.reviveProtectionMaterials = [outerMaterial, coreMaterial];
  }

  private updateReviveProtectionVisual(view: View): void {
    if (!view.reviveProtectionRoot || !view.reviveProtectionRings?.length) return;
    const phase = (view.animTime ?? 0) * 5.4;
    const pulse = 1 + Math.sin(phase * 1.8) * 0.09;
    view.reviveProtectionRoot.setLocalEulerAngles(0, phase * 38, 0);
    view.reviveProtectionRings[0].setLocalScale(1.02 * pulse, 0.028, 1.02 * pulse);
    view.reviveProtectionRings[1]?.setLocalScale(0.68 / pulse, 0.022, 0.68 / pulse);
  }

  private clearReviveProtectionVisual(view: View): void {
    for (const ring of view.reviveProtectionRings ?? []) destroyEntity(ring);
    destroyEntity(view.reviveProtectionRoot);
    for (const material of view.reviveProtectionMaterials ?? []) material.destroy();
    view.reviveProtectionRoot = undefined;
    view.reviveProtectionRings = undefined;
    view.reviveProtectionMaterials = undefined;
  }

  private syncGuardianRetaliationTargetVisuals(entities: readonly EntityState[]): void {
    const local = entities.find((entity) => entity.id === this.net.playerId);
    const presentation = guardianRetaliationBuffPresentationGate(local, entities);
    const targetId = presentation?.target?.id ?? null;
    for (const [id, view] of this.views) {
      if (view.kind !== 'enemy' || id !== targetId) {
        this.clearGuardianRetaliationVisual(view);
        continue;
      }
      if (view.guardianRetaliationRoot?.parent) continue;
      this.clearGuardianRetaliationVisual(view);
      const targetColor = colorFromCss(GUARDIAN_RETALIATION_PALETTE.target);
      const guardColor = colorFromCss(GUARDIAN_RETALIATION_PALETTE.guard);
      const coreColor = colorFromCss(GUARDIAN_RETALIATION_PALETTE.core);
      const targetMaterial = createMaterial(targetColor, {
        emissive: targetColor,
        emissiveIntensity: 2.1,
        opacity: 0.62,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const guardMaterial = createMaterial(guardColor, {
        emissive: guardColor,
        emissiveIntensity: 2.35,
        opacity: 0.7,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const coreMaterial = createMaterial(coreColor, {
        emissive: coreColor,
        emissiveIntensity: 2.5,
        opacity: 0.76,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const root = makeEntity('guardian-retaliation-target-overlay', this.world.app);
      view.visual.addChild(root);
      const outer = this.world.createPrimitive(
        'guardian-retaliation-target-ring',
        'torus',
        targetMaterial,
        { x: 0, y: 0.1, z: 0 },
        { x: 1.34, y: 0.032, z: 1.34 },
        root,
      );
      const inner = this.world.createPrimitive(
        'guardian-retaliation-guard-ring',
        'torus',
        guardMaterial,
        { x: 0, y: 0.14, z: 0 },
        { x: 0.92, y: 0.026, z: 0.92 },
        root,
      );
      const chevrons: pc.Entity[] = [];
      for (let index = 0; index < 3; index++) {
        const angle = index / 3 * Math.PI * 2;
        const chevron = this.world.createPrimitive(
          `guardian-retaliation-chevron-${index}`,
          'box',
          index === 1 ? coreMaterial : guardMaterial,
          { x: Math.sin(angle) * 0.82, y: 1.2 + index * 0.17, z: Math.cos(angle) * 0.82 },
          { x: 0.28, y: 0.12, z: 0.065 },
          root,
        );
        chevron.setLocalEulerAngles(0, angle * 180 / Math.PI, index % 2 === 0 ? 38 : -38);
        chevrons.push(chevron);
      }
      view.guardianRetaliationRoot = root;
      view.guardianRetaliationRings = [outer, inner];
      view.guardianRetaliationChevrons = chevrons;
      view.guardianRetaliationMaterials = [targetMaterial, guardMaterial, coreMaterial];
    }
  }

  private updateGuardianRetaliationVisual(view: View): void {
    if (!view.guardianRetaliationRoot || !view.guardianRetaliationRings?.length) return;
    const phase = (view.animTime ?? 0) * 3.8;
    const pulse = 1 + Math.sin(phase * 2) * 0.075;
    view.guardianRetaliationRoot.setLocalEulerAngles(0, -phase * 20, 0);
    view.guardianRetaliationRings[0].setLocalScale(1.34 * pulse, 0.032, 1.34 * pulse);
    view.guardianRetaliationRings[1]?.setLocalScale(0.92 / pulse, 0.026, 0.92 / pulse);
    for (let index = 0; index < (view.guardianRetaliationChevrons?.length ?? 0); index++) {
      const chevron = view.guardianRetaliationChevrons![index];
      const scale = 1 + Math.sin(phase * 2.2 + index) * 0.12;
      chevron.setLocalScale(0.28 * scale, 0.12 * scale, 0.065);
    }
  }

  private clearGuardianRetaliationVisual(view: View): void {
    for (const ring of view.guardianRetaliationRings ?? []) destroyEntity(ring);
    for (const chevron of view.guardianRetaliationChevrons ?? []) destroyEntity(chevron);
    destroyEntity(view.guardianRetaliationRoot);
    for (const material of view.guardianRetaliationMaterials ?? []) material.destroy();
    view.guardianRetaliationRoot = undefined;
    view.guardianRetaliationRings = undefined;
    view.guardianRetaliationChevrons = undefined;
    view.guardianRetaliationMaterials = undefined;
  }

  private syncBossSealPhaseVisual(view: View, entity: EntityState): void {
    const phase = bossPhasePresentationGate(entity);
    const phaseTwo = this.zone === 'dungeon'
      && view.kind === 'enemy'
      && entity.alive
      && phase?.applies === true
      && phase.phase === 2;
    if (this.disposed || !phaseTwo) {
      this.clearBossSealPhaseVisual(view);
      return;
    }
    if (view.bossSealPhaseRoot?.parent) return;
    this.clearBossSealPhaseVisual(view);

    const sealColor = colorFromCss(BOSS_SEAL_PALETTE.seal);
    const coreColor = colorFromCss(BOSS_SEAL_PALETTE.sealCore);
    const ruptureColor = colorFromCss(BOSS_SEAL_PALETTE.rupture);
    const sealMaterial = createMaterial(sealColor, {
      emissive: sealColor,
      emissiveIntensity: 1.75,
      opacity: 0.48,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const coreMaterial = createMaterial(coreColor, {
      emissive: coreColor,
      emissiveIntensity: 2.15,
      opacity: 0.66,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ruptureMaterial = createMaterial(ruptureColor, {
      emissive: ruptureColor,
      emissiveIntensity: 1.95,
      opacity: 0.62,
      additive: true,
      unlit: true,
      depthWrite: false,
    });

    const root = makeEntity('boss-seal-phase2-persistent-aura', this.world.app);
    view.visual.addChild(root);
    const aura = this.world.createPrimitive(
      'boss-seal-phase2-aura-ring',
      'torus',
      sealMaterial,
      { x: 0, y: 0.1, z: 0 },
      { x: 1.72, y: 0.035, z: 1.72 },
      root,
    );
    const crown = makeEntity('boss-seal-phase2-ruptured-crown', this.world.app);
    root.addChild(crown);
    this.world.createPrimitive(
      'boss-seal-phase2-crown-ring',
      'torus',
      coreMaterial,
      { x: 0, y: 2.18, z: 0 },
      { x: 0.68, y: 0.035, z: 0.68 },
      crown,
    );
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      const shard = this.world.createPrimitive(
        `boss-seal-phase2-crown-shard-${index}`,
        'cone',
        index % 2 === 0 ? ruptureMaterial : sealMaterial,
        {
          x: Math.sin(angle) * 0.5,
          y: 2.34 + (index % 2) * 0.09,
          z: Math.cos(angle) * 0.5,
        },
        { x: 0.1, y: 0.34, z: 0.1 },
        crown,
      );
      shard.setLocalEulerAngles(index % 2 === 0 ? 12 : -12, angle * 180 / Math.PI, index * 7);
    }

    const cracks: pc.Entity[] = [];
    const crackSpecs = [
      { x: -0.24, y: 1.45, z: 0.53, roll: -34, length: 0.58 },
      { x: 0.18, y: 1.31, z: 0.54, roll: 31, length: 0.48 },
      { x: -0.06, y: 1.08, z: 0.55, roll: -9, length: 0.42 },
      { x: 0.32, y: 1.62, z: 0.52, roll: 52, length: 0.38 },
    ] as const;
    for (let index = 0; index < crackSpecs.length; index++) {
      const spec = crackSpecs[index];
      const crack = this.world.createPrimitive(
        `boss-seal-phase2-chest-crack-${index}`,
        'box',
        index % 2 === 0 ? ruptureMaterial : coreMaterial,
        { x: spec.x, y: spec.y, z: spec.z },
        { x: 0.045, y: spec.length, z: 0.025 },
        root,
      );
      crack.setLocalEulerAngles(0, 0, spec.roll);
      cracks.push(crack);
    }

    view.bossSealPhaseRoot = root;
    view.bossSealPhaseAura = aura;
    view.bossSealPhaseCrown = crown;
    view.bossSealPhaseCracks = cracks;
    view.bossSealPhaseMaterials = [sealMaterial, coreMaterial, ruptureMaterial];
  }

  private updateBossSealPhaseVisual(view: View): void {
    if (!view.bossSealPhaseRoot || !view.bossSealPhaseAura || !view.bossSealPhaseCrown) return;
    const phase = (view.animTime ?? 0) * 2.25;
    const pulse = 1 + Math.sin(phase * 2.1) * 0.07;
    view.bossSealPhaseAura.setLocalScale(1.72 * pulse, 0.035, 1.72 * pulse);
    view.bossSealPhaseCrown.setLocalEulerAngles(0, phase * 18, 0);
    for (let index = 0; index < (view.bossSealPhaseCracks?.length ?? 0); index++) {
      const crackPulse = 1 + Math.sin(phase * 2.8 + index * 0.9) * 0.12;
      const specLength = [0.58, 0.48, 0.42, 0.38][index] ?? 0.4;
      view.bossSealPhaseCracks![index].setLocalScale(0.045 * crackPulse, specLength, 0.025);
    }
  }

  private clearBossSealPhaseVisual(view: View): void {
    destroyEntity(view.bossSealPhaseAura);
    destroyEntity(view.bossSealPhaseCrown);
    for (const crack of view.bossSealPhaseCracks ?? []) destroyEntity(crack);
    destroyEntity(view.bossSealPhaseRoot);
    for (const material of view.bossSealPhaseMaterials ?? []) material.destroy();
    view.bossSealPhaseRoot = undefined;
    view.bossSealPhaseAura = undefined;
    view.bossSealPhaseCrown = undefined;
    view.bossSealPhaseCracks = undefined;
    view.bossSealPhaseMaterials = undefined;
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
      view.weaponGripPose = createWeaponGripPose(model);
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
      if (this.disposed || !view.entity.parent) {
        destroyEntity(model);
        return;
      }
      this.clearViewVisual(view);
      configureImportedModel(model);
      setVisualAssetTransform(model, ZOMBIE_VISUAL_SCALE);
      view.visual.addChild(model);
      view.anim = new PcClipController(model, clipConfigs);
      view.zombieLoading = false;
      this.syncEnemyPresentation(view, view.enemyVariant);
      const current = this.latestEntities.get(view.entity.name);
      if (current) {
        this.syncRunicEliteVisual(view, current);
        this.syncDifficultyAffixVisual(view, current);
      }
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
      const evading = activeEvasionStatePresentationGate(entity)?.evading === true;
      if (jumping && !view.wasJumping) view.jumpArc = 0;
      if (jumping) view.jumpArc = Math.min((view.jumpArc ?? 0) + dt, JUMP_TIME);
      view.wasJumping = jumping;
      const jumpArc = view.jumpArc ?? 0;
      const yOffset = jumping ? Math.sin(Math.PI * (jumpArc / JUMP_TIME)) * JUMP_HEIGHT : evading ? -0.1 : 0;
      const bob = entity.alive && entity.action !== 'idle'
        ? Math.sin((view.animTime ?? 0) * (evading ? 20 : entity.action === 'run' ? 13 : 9)) * (evading ? 0.018 : 0.035)
        : 0;
      view.visual.setLocalPosition(0, yOffset + bob, 0);
      const predictedAction = entity.id === this.net.playerId && this.localPlayerMoving
        ? (this.localPlayerRunning ? 'run' : 'walk')
        : entity.action;
      const animState = jumping ? 'jump' : evading ? 'run' : predictedAction;
      view.anim?.setState(animState);
      view.anim?.setPlaybackSpeed(evading ? 1.65 : animState === 'attack' ? entity.attackSpeed ?? 1 : 1);
      // O callback do jogo roda apos animationUpdate do PlayCanvas; esta camada
      // aditiva e aplicada por ultimo e, portanto, nao e apagada pelo clipe.
      applyWeaponGripPose(view);
      this.updateWeaponPose(view, animState, entity.alive);
      this.updateShardcasterVisual(view);
      this.updateAshCorruptorVisual(view);
      this.updateRuinBruteVisual(view);
      this.updateUtraeanSentinelVisual(view);
      this.updateRunicEliteVisual(view);
      this.updateDifficultyAffixVisual(view);
      this.updateAshVeilVisual(view);
      this.updateRuinExposedVisual(view);
      this.updateBossSealPhaseVisual(view);
      this.updateArcaneResonanceVisual(view);
      this.updateStormOrbVisual(view);
      this.updateFeralFormVisual(view);
      this.updateReviveProtectionVisual(view);
      this.updateGuardianRetaliationVisual(view);
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
      const bladeCenter = (view.weaponGlowLength ?? WEAPON_WORLD_LENGTH) * (0.5 - WEAPON_GRIP_FROM_BOTTOM);
      const cx = hand.x + dir.x * bladeCenter;
      const cy = hand.y + dir.y * bladeCenter;
      const cz = hand.z + dir.z * bladeCenter;
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
    const socketParent = findDescendantEntity(view.visual, RIGHT_HAND_BONE_NAMES);
    const attachToBone = !!socketParent;
    const inheritedScale = attachToBone ? maxWorldScale(socketParent) : 1;
    const anchor = makeEntity('weapon-anchor', this.world.app);
    (socketParent ?? view.visual).addChild(anchor);
    if (attachToBone) {
      // Usa a posicao calibrada do socket Weapon, mas orienta em espaco da mao.
      // Assim +Y do asset aponta para a frente, como na referencia do WoW.
      setHandWeaponSocket(anchor, RIGHT_HAND_SOCKET_POSITION, PRIMARY_WEAPON_SOCKET_EULER, inheritedScale);
    }
    view.weaponAnchor = anchor;
    view.weaponAttachedToBone = attachToBone;
    view.weaponGlowLength = worldLength;
    void this.world.models.instantiate(lootModelUrlFor(weapon.kind, weapon.rarity)).then((model) => {
      if (view.equippedWeaponKey !== key || !view.entity.parent || view.weaponAnchor !== anchor || !anchor.parent) {
        destroyEntity(model);
        return;
      }
      model.name = 'equipped-weapon';
      model.setLocalPosition(0, 0, 0);
      model.setLocalScale(1, 1, 1);
      fitEquippedWeaponToGrip(model, weapon.kind, worldLength, inheritedScale);
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
      setHandWeaponSocket(anchor, LEFT_HAND_SOCKET_POSITION, OFFHAND_WEAPON_SOCKET_EULER, inheritedScale);
    } else if (slot === 'helmet') {
      setScaledSocketPosition(anchor, HELMET_SOCKET_POSITION, inheritedScale);
    } else {
      setScaledSocketPosition(anchor, CHEST_SOCKET_POSITION, inheritedScale);
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
        fitEquippedWeaponToGrip(model, visual.kind, WEAPON_WORLD_LENGTH, inheritedScale);
      } else {
        const safeScale = Math.max(inheritedScale, 0.0001);
        const target = (slot === 'helmet' ? HELMET_WORLD_SIZE : CHEST_ARMOR_WORLD_SIZE) / safeScale;
        const bounds = fitEntityToLargest(model, target);
        if (bounds && slot === 'armor') {
          // Centraliza o peitoral no tronco e da folga em profundidade para a
          // malha rigida envolver o corpo, em vez de atravessa-lo.
          const scale = target / bounds.largest;
          const depthScale = scale * ARMOR_DEPTH_SCALE_BY_RARITY[visual.rarity];
          model.setLocalScale(scale, scale, depthScale);
          model.setLocalPosition(-bounds.center.x * scale, -bounds.center.y * scale, -bounds.center.z * depthScale);
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
      const groundY = this.world.groundHeightAt(item.position.x, item.position.z);
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
          baseY: groundY,
          phase: this.lootViews.size * 0.9,
        };
        this.lootViews.set(item.id, view);
        this.playNotableLootSound(item);
        void this.replaceLootModel(entity, item.modelUrl, item.kind);
      }
      view.baseY = groundY;
      view.labelText = item.name;
      this.syncLootRarityVisual(view, item);
      setEntityPosition(view.entity, { x: item.position.x, y: groundY, z: item.position.z });
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

  private async replaceLootModel(container: pc.Entity, url: string, kind: ItemKind): Promise<void> {
    const barColor = BAR_LOOT_COLORS[kind];
    if (barColor !== undefined) {
      clearChildren(container);
      const material = this.world.material(`loot-${kind}-ingot`, barColor, {
        gloss: kind === 'mithril_bar' ? 0.82 : 0.65,
        metalness: 0.78,
        emissive: kind === 'mithril_bar' ? colorFromCss('#184c57') : undefined,
        emissiveIntensity: kind === 'mithril_bar' ? 0.62 : undefined,
      });
      const base = this.world.createPrimitive(
        `${kind}-ingot-base`,
        'box',
        material,
        { x: 0, y: 0.12, z: 0 },
        { x: 0.78, y: 0.18, z: 0.36 },
        container,
      );
      base.setLocalEulerAngles(0, 0, 3);
      this.world.createPrimitive(
        `${kind}-ingot-crown`,
        'box',
        material,
        { x: 0, y: 0.25, z: 0 },
        { x: 0.58, y: 0.1, z: 0.28 },
        container,
      );
      return;
    }
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

  private reconcileOreNodes(nodes: readonly OreNodeState[]): void {
    const seen = new Set<string>();
    for (const node of nodes) {
      seen.add(node.id);
      let view = this.oreNodeViews.get(node.id);
      if (view && (view.visual.kind !== node.kind || view.visual.rich !== (node.rich === true))) {
        view.label.dispose();
        destroyOreNodeVisual(view.visual);
        this.oreNodeViews.delete(node.id);
        view = undefined;
      }
      if (!view) {
        const visual = createOreNodeVisual(this.world, {
          kind: node.kind,
          position: node.position,
          state: node.depleted ? 'depleted' : 'active',
          name: `ore-node-${node.id}`,
          seed: this.oreNodeSeed(node.id),
          scale: (node.kind === 'mithril' ? 1.08 : 1) * (node.rich ? 1.18 : 1),
          rich: node.rich === true,
        });
        const label = new WorldLabel(this.uiLayer, 'ore-node-label', ORE_NODE_NAMES[node.kind], ORE_NODE_COLORS[node.kind]);
        label.el.dataset.ore = node.kind;
        label.el.dataset.rich = node.rich ? 'true' : 'false';
        view = { visual, state: node, label };
        this.oreNodeViews.set(node.id, view);
      }
      view.state = node;
      setEntityPosition(view.visual.root, node.position);
    }

    for (const [id, view] of this.oreNodeViews) {
      if (seen.has(id)) continue;
      view.label.dispose();
      destroyOreNodeVisual(view.visual);
      this.oreNodeViews.delete(id);
    }
  }

  private reconcileDisplacers(states: readonly DisplacerState[]): void {
    const seen = new Set<string>();
    for (const state of states) {
      seen.add(state.id);
      let view = this.displacerViews.get(state.id);
      if (!view) {
        const visual = createDisplacerVisual(
          this.world,
          state,
          state.zone === 'dungeon' ? this.world.dungeon : this.world.exterior,
        );
        const label = new WorldLabel(this.uiLayer, 'displacer-world-label', state.label, displacerColor(state));
        label.el.dataset.displacer = state.id;
        view = { visual, state, label };
        this.displacerViews.set(state.id, view);
      }
      view.state = state;
      setEntityPosition(view.visual.root, state.position);
    }

    for (const [id, view] of this.displacerViews) {
      if (seen.has(id)) continue;
      view.label.dispose();
      destroyDisplacerVisual(view.visual);
      this.displacerViews.delete(id);
    }
  }

  private updateDisplacerViews(): void {
    for (const view of this.displacerViews.values()) {
      const state = view.state;
      updateDisplacerVisual(view.visual, state, this.elapsed);
      const distance = this.localPlayerDistanceTo(state.position.x, state.position.z);
      if (state.zone !== this.zone || distance > 30) {
        view.label.el.style.display = 'none';
        continue;
      }
      const status = state.current
        ? state.canActivate
          ? 'Clique para ativar'
          : state.activated
            ? 'Clique para abrir a rede'
            : state.lockedReason || 'Âncora instável'
        : state.activated
          ? 'Âncora descoberta'
          : distance <= 8
            ? state.lockedReason || `Requer nível ${state.requiredLevel}`
            : 'Âncora desconhecida';
      view.label.setText(`${state.label} · ${status}`);
      view.label.el.style.color = displacerColor(state);
      view.label.el.dataset.state = state.current ? 'current' : state.activated ? 'active' : 'locked';
      view.label.setWorldPosition(state.position.x, state.position.y + 2.45, state.position.z);
      view.label.update(this.world);
    }
  }

  private syncTreasureLodePresentation(value: unknown, zone: WorldZone): void {
    const state = treasureLodeStatePresentationGate(value);
    if (!state || zone !== 'overworld') {
      this.clearTreasureLodePresentation();
      return;
    }
    this.treasureLodeState = state;
    if (!this.treasureLodeVisual) {
      this.treasureLodeVisual = createTreasureLodeVisual(this.world, state, this.world.exterior);
    }
    updateTreasureLodeVisual(this.treasureLodeVisual, state, this.elapsed);
  }

  private updateTreasureLodePresentation(): void {
    if (!this.treasureLodeVisual || !this.treasureLodeState) return;
    updateTreasureLodeVisual(this.treasureLodeVisual, this.treasureLodeState, this.elapsed);
  }

  private clearTreasureLodePresentation(): void {
    if (this.treasureLodeVisual) destroyTreasureLodeVisual(this.treasureLodeVisual);
    this.treasureLodeVisual = null;
    this.treasureLodeState = null;
  }

  private syncUtraeanRelayPresentation(value: unknown, zone: WorldZone): void {
    const state = utraeanRelayStatePresentationGate(value);
    if (!state || zone !== 'overworld') {
      this.clearUtraeanRelayPresentation();
      return;
    }
    this.utraeanRelayState = state;
    if (!this.utraeanRelayVisual) {
      this.utraeanRelayVisual = createUtraeanRelayVisual(this.world, state, this.world.exterior);
    }
    updateUtraeanRelayVisual(this.utraeanRelayVisual, state, this.elapsed);
  }

  private updateUtraeanRelayPresentation(): void {
    if (!this.utraeanRelayVisual || !this.utraeanRelayState) return;
    updateUtraeanRelayVisual(this.utraeanRelayVisual, this.utraeanRelayState, this.elapsed);
  }

  private clearUtraeanRelayPresentation(): void {
    if (this.utraeanRelayVisual) destroyUtraeanRelayVisual(this.utraeanRelayVisual);
    this.utraeanRelayVisual = null;
    this.utraeanRelayState = null;
  }

  private syncArhokFrostPresentation(value: unknown, zone: WorldZone): void {
    const state = arhokFrostBiomePresentationGate(value);
    if (!state || zone !== 'overworld') {
      this.clearArhokFrostPresentation();
      return;
    }
    this.biomeState = state;
    if (!this.arhokFrostVisual) {
      this.arhokFrostVisual = createArhokFrostVisual(this.world, state, this.world.exterior);
    }
    this.updateArhokFrostPresentation();
  }

  private updateArhokFrostPresentation(): void {
    if (!this.arhokFrostVisual || !this.biomeState) return;
    const view = this.views.get(this.net.playerId);
    const player = view ? entityPosition(view.entity) : this.latestEntities.get(this.net.playerId)?.position;
    if (!player) return;
    updateArhokFrostVisual(this.arhokFrostVisual, this.biomeState, player, this.elapsed);
  }

  private clearArhokFrostPresentation(): void {
    if (this.arhokFrostVisual) destroyArhokFrostVisual(this.arhokFrostVisual);
    this.arhokFrostVisual = null;
    this.biomeState = null;
  }

  private syncCorruptedJunglePresentation(value: unknown, zone: WorldZone): void {
    const state = corruptedJunglePresentationGate(value);
    if (!state || zone !== 'overworld') {
      this.clearCorruptedJunglePresentation();
      return;
    }
    this.corruptedJungleState = state;
    if (!this.corruptedJungleVisual) {
      this.corruptedJungleVisual = createCorruptedJungleVisual(this.world, state, this.world.exterior);
    }
    updateCorruptedJungleVisual(this.corruptedJungleVisual, state, this.elapsed);
  }

  private updateCorruptedJunglePresentation(): void {
    if (!this.corruptedJungleVisual || !this.corruptedJungleState) return;
    updateCorruptedJungleVisual(this.corruptedJungleVisual, this.corruptedJungleState, this.elapsed);
  }

  private clearCorruptedJunglePresentation(): void {
    if (this.corruptedJungleVisual) destroyCorruptedJungleVisual(this.corruptedJungleVisual);
    this.corruptedJungleVisual = null;
    this.corruptedJungleState = null;
  }

  private oreNodeSeed(id: string): number {
    let hash = 2166136261;
    for (let index = 0; index < id.length; index++) {
      hash ^= id.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private updateOreNodeViews(dt = 0): void {
    if (dt > 0 && (this.miningState.cooldownRemaining > 0 || this.miningState.focusRemaining > 0)) {
      const focusRemaining = Math.max(0, this.miningState.focusRemaining - dt);
      this.miningState = {
        ...this.miningState,
        cooldownRemaining: Math.max(0, this.miningState.cooldownRemaining - dt),
        focusRemaining,
        ...(focusRemaining <= 0 ? {
          focusNodeId: undefined,
          strikeStreak: 0,
          perfectReady: false,
        } : {}),
      };
    }
    for (const [id, view] of this.oreNodeViews) {
      const node = view.state;
      const professionLocked = this.professions.mining.level < node.requiredLevel;
      const toolLocked = this.miningState.tool.tier < (node.requiredToolTier ?? 0);
      const treasure = this.treasureLodeState?.nodeId === id ? this.treasureLodeState : null;
      const treasureLocked = treasure?.phase === 'wave' || treasure?.phase === 'intermission';
      const locked = professionLocked || toolLocked || treasureLocked;
      const focused = this.miningState.focusNodeId === id && this.miningState.focusRemaining > 0;
      const distance = this.localPlayerDistanceTo(node.position.x, node.position.z);
      const nearby = distance <= node.interactRange + 1.4;
      updateOreNodeVisual(view.visual, {
        time: this.elapsed,
        state: node.depleted ? 'depleted' : 'active',
        emphasis: nearby || focused || (
          this.miningState.lastNodeId === id && this.miningState.cooldownRemaining > 0
        ) ? 1 : 0,
      });

      const labelVisible = this.zone === 'overworld' && distance <= (node.depleted ? 12 : 26);
      if (!labelVisible) {
        view.label.el.style.display = 'none';
        continue;
      }
      view.label.el.dataset.locked = locked ? 'true' : 'false';
      view.label.el.dataset.toolLocked = toolLocked ? 'true' : 'false';
      view.label.el.dataset.focus = focused ? 'true' : 'false';
      view.label.el.dataset.rich = node.rich ? 'true' : 'false';
      view.label.el.dataset.treasureLode = treasure ? treasure.phase : '';
      const focusSuffix = focused
        ? this.miningState.perfectReady
          ? ' · Próximo: GOLPE PERFEITO'
          : ` · Ritmo ${this.miningState.strikeStreak}/3 (${Math.max(1, Math.ceil(this.miningState.focusRemaining))}s)`
        : '';
      const suffix = node.depleted
        ? `Esgotado · retorna em ${Math.max(1, Math.ceil(node.respawnRemaining))}s`
        : professionLocked
          ? `Bloqueado · requer Mineração Nv ${node.requiredLevel} (você: Nv ${this.professions.mining.level})`
          : toolLocked
            ? `Bloqueado · requer ${miningToolForTier(node.requiredToolTier ?? 0).label}`
            : treasureLocked
              ? `EMBOSCADA · ${treasure?.remainingEnemies ?? 0} invasores · onda ${treasure?.wave ?? 0}/2`
              : treasure?.phase === 'dormant'
                ? `JAZIDA · mine para iniciar o desafio · ${node.remaining}/${node.capacity}`
                : treasure?.phase === 'reward'
                  ? `PROTEGIDA · cofre mineral revelado · ${node.remaining}/${node.capacity}`
            : `${node.rich ? 'RICO · x2 · ' : ''}${node.remaining}/${node.capacity} · clique ou R para minerar · +XP${focusSuffix}`;
      const name = node.rich ? `Veio Rico de ${ORE_NODE_NAMES[node.kind].replace('Veio de ', '')}` : ORE_NODE_NAMES[node.kind];
      view.label.setText(`${name} · ${suffix}`);
      view.label.setWorldPosition(
        node.position.x,
        node.position.y + (node.kind === 'mithril' ? 1.65 : 1.25) + (node.rich ? 0.28 : 0),
        node.position.z,
      );
      view.label.update(this.world);
    }
  }

  private reconcileProjectiles(projectiles: readonly ProjectileState[]): void {
    const canonical = new Map<string, ProjectileState>();
    for (const projectile of projectiles) {
      // JSON nao e validado em runtime. Kind futuro/desconhecido nao herda por
      // acidente lifecycle nem visual de um projetil conhecido.
      if (!projectile?.id || !isSupportedProjectileKind(projectile.kind)) continue;
      canonical.set(projectile.id, projectile);
    }
    const incoming = [...canonical.values()];
    const lifecycle = projectileLifecyclePlan(this.projectileViews.keys(), incoming);

    for (const id of lifecycle.remove) this.removeProjectileView(id);
    for (const id of lifecycle.create) {
      const state = canonical.get(id);
      if (state) this.projectileViews.set(id, this.createProjectileView(state));
    }
    for (const id of lifecycle.update) {
      const state = canonical.get(id);
      const view = this.projectileViews.get(id);
      if (!state || !view) continue;
      if (view.state.kind !== state.kind) {
        this.removeProjectileView(id);
        this.projectileViews.set(id, this.createProjectileView(state));
        continue;
      }
      view.state = state;
      view.snapshotAt = this.elapsed;
    }
  }

  private reconcileControlZones(zones: readonly ControlZoneState[]): void {
    const incoming = new Map(zones.map((zone) => [zone.id, zone]));
    for (const [id, view] of this.controlZoneViews) {
      const state = incoming.get(id);
      if (!state) {
        destroyRootSnareVisual(view.visual);
        this.controlZoneViews.delete(id);
        continue;
      }
      view.state = state;
    }
    for (const [id, state] of incoming) {
      if (this.controlZoneViews.has(id)) continue;
      this.controlZoneViews.set(id, {
        visual: createRootSnareVisual(this.world, state, this.world.root),
        state,
      });
    }
  }

  private updateControlZoneViews(): void {
    for (const view of this.controlZoneViews.values()) {
      updateRootSnareVisual(view.visual, view.state, this.elapsed);
    }
  }

  private clearControlZoneViews(): void {
    for (const view of this.controlZoneViews.values()) destroyRootSnareVisual(view.visual);
    this.controlZoneViews.clear();
  }

  private reconcileNatureSpirits(states: readonly NatureSpiritState[]): void {
    const incoming = new Map(states.map((state) => [state.id, state]));
    for (const id of [...this.natureSpiritViews.keys()]) {
      if (!incoming.has(id)) this.removeNatureSpiritView(id);
    }
    for (const [id, state] of incoming) {
      const existing = this.natureSpiritViews.get(id);
      if (existing) {
        existing.state = state;
      } else {
        this.natureSpiritViews.set(id, this.createNatureSpiritView(state));
      }
    }
  }

  private createNatureSpiritView(state: NatureSpiritState): NatureSpiritView {
    const leaf = colorFromCss(NATURE_SPIRIT_PALETTE.leaf);
    const soul = colorFromCss(NATURE_SPIRIT_PALETTE.soul);
    const halo = colorFromCss(NATURE_SPIRIT_PALETTE.halo);
    const leafMaterial = createMaterial(leaf, {
      emissive: leaf, emissiveIntensity: 2.7, opacity: 0.76,
      additive: true, unlit: true, depthWrite: false,
    });
    const soulMaterial = createMaterial(soul, {
      emissive: soul, emissiveIntensity: 3.4, opacity: 0.9,
      additive: true, unlit: true, depthWrite: false,
    });
    const haloMaterial = createMaterial(halo, {
      emissive: halo, emissiveIntensity: 2.5, opacity: 0.62,
      additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity(state.id, this.world.app);
    setEntityPosition(root, state.position);
    this.world.root.addChild(root);
    const core = this.world.createPrimitive(
      `${state.id}-core`, 'sphere', soulMaterial,
      { x: 0, y: 0, z: 0 }, { x: 0.24, y: 0.31, z: 0.24 }, root,
    );
    const haloRing = this.world.createPrimitive(
      `${state.id}-halo`, 'torus', haloMaterial,
      { x: 0, y: 0, z: 0 }, { x: 0.43, y: 0.025, z: 0.43 }, root,
    );
    haloRing.setLocalEulerAngles(68, 0, 18);
    const motes: pc.Entity[] = [];
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      motes.push(this.world.createPrimitive(
        `${state.id}-mote-${index}`, 'sphere', index === 0 ? soulMaterial : leafMaterial,
        { x: Math.sin(angle) * 0.48, y: Math.sin(angle * 2) * 0.12, z: Math.cos(angle) * 0.48 },
        { x: 0.065, y: 0.065, z: 0.065 }, root,
      ));
    }
    const light = makeEntity(`${state.id}-light`, this.world.app);
    light.addComponent('light', {
      type: 'omni', color: halo, intensity: 1.25, range: 3.4,
      castShadows: false, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
    });
    root.addChild(light);
    return {
      root, core, halo: haloRing, motes, light,
      materials: [leafMaterial, soulMaterial, haloMaterial], state,
      phase: this.projectilePhase(state.id),
    };
  }

  private updateNatureSpiritViews(dt: number): void {
    for (const view of this.natureSpiritViews.values()) {
      const alpha = dt <= 0 ? 1 : 1 - Math.exp(-dt * 15);
      lerpEntityPosition(view.root, view.state.position, alpha);
      const phase = this.elapsed * 2.8 + view.phase;
      const pulse = 1 + Math.sin(phase * 2.1) * 0.09;
      view.core.setLocalScale(0.24 * pulse, 0.31 * pulse, 0.24 * pulse);
      view.halo.setLocalEulerAngles(68, phase * 64, 18);
      view.halo.setLocalScale(0.43 * pulse, 0.025, 0.43 * pulse);
      for (let index = 0; index < view.motes.length; index++) {
        const angle = phase + index / view.motes.length * Math.PI * 2;
        view.motes[index].setLocalPosition(
          Math.sin(angle) * 0.48,
          Math.sin(angle * 1.7 + index) * 0.14,
          Math.cos(angle) * 0.48,
        );
      }
      if (view.light.light) view.light.light.intensity = 1.15 + pulse * 0.18;
    }
  }

  private removeNatureSpiritView(id: string): void {
    const view = this.natureSpiritViews.get(id);
    if (!view) return;
    destroyEntity(view.root);
    for (const material of view.materials) material.destroy();
    view.materials.length = 0;
    this.natureSpiritViews.delete(id);
  }

  private clearNatureSpiritViews(): void {
    for (const id of [...this.natureSpiritViews.keys()]) this.removeNatureSpiritView(id);
  }

  private reconcileExpeditionCargo(party: PartyState | null): void {
    const state = expeditionCargoPresentationGate(party);
    if (!state) {
      this.clearExpeditionCargoView();
      return;
    }
    if (this.expeditionCargoView?.state.id !== state.id) {
      this.clearExpeditionCargoView();
      this.expeditionCargoView = this.createExpeditionCargoView(state);
      return;
    }
    this.expeditionCargoView.state = state;
  }

  private createExpeditionCargoView(state: ExpeditionCargoState): ExpeditionCargoView {
    const hide = colorFromCss(EXPEDITION_CARGO_PALETTE.hide);
    const harness = colorFromCss(EXPEDITION_CARGO_PALETTE.harness);
    const pack = colorFromCss(EXPEDITION_CARGO_PALETTE.pack);
    const rune = colorFromCss(EXPEDITION_CARGO_PALETTE.rune);
    const hideMaterial = createMaterial(hide, { gloss: 0.12 });
    const harnessMaterial = createMaterial(harness, { gloss: 0.2 });
    const packMaterial = createMaterial(pack, { gloss: 0.08 });
    const runeMaterial = createMaterial(rune, {
      emissive: rune, emissiveIntensity: 2.5, opacity: 0.72,
      additive: true, unlit: true, depthWrite: false,
    });
    const root = makeEntity(state.id, this.world.app);
    setEntityPosition(root, state.position);
    this.world.root.addChild(root);
    const body = this.world.createPrimitive(`${state.id}-body`, 'box', hideMaterial, { x: 0, y: 0.92, z: 0 }, { x: 0.78, y: 0.72, z: 1.55 }, root);
    this.world.createPrimitive(`${state.id}-neck`, 'cylinder', hideMaterial, { x: 0, y: 1.3, z: 0.72 }, { x: 0.25, y: 0.78, z: 0.25 }, root).setLocalEulerAngles(-28, 0, 0);
    this.world.createPrimitive(`${state.id}-head`, 'box', hideMaterial, { x: 0, y: 1.66, z: 1.02 }, { x: 0.45, y: 0.42, z: 0.62 }, root);
    for (const side of [-1, 1]) {
      this.world.createPrimitive(`${state.id}-ear-${side}`, 'cone', hideMaterial, { x: side * 0.16, y: 2.01, z: 1.02 }, { x: 0.1, y: 0.34, z: 0.1 }, root);
      this.world.createPrimitive(`${state.id}-pack-${side}`, 'box', packMaterial, { x: side * 0.52, y: 1.08, z: -0.05 }, { x: 0.42, y: 0.68, z: 1.05 }, root);
    }
    this.world.createPrimitive(`${state.id}-harness`, 'box', harnessMaterial, { x: 0, y: 1.25, z: 0 }, { x: 1.16, y: 0.11, z: 0.22 }, root);
    const legs: pc.Entity[] = [];
    for (const x of [-0.26, 0.26]) for (const z of [-0.52, 0.52]) {
      legs.push(this.world.createPrimitive(`${state.id}-leg-${x}-${z}`, 'cylinder', hideMaterial, { x, y: 0.38, z }, { x: 0.13, y: 0.76, z: 0.13 }, root));
    }
    const runeRing = this.world.createPrimitive(`${state.id}-rune`, 'torus', runeMaterial, { x: 0, y: 1.55, z: -0.78 }, { x: 0.22, y: 0.025, z: 0.22 }, root);
    runeRing.setLocalEulerAngles(90, 0, 0);
    const light = makeEntity(`${state.id}-light`, this.world.app);
    light.setLocalPosition(0, 1.55, -0.78);
    light.addComponent('light', { type: 'omni', color: rune, intensity: 0.75, range: 2.5, castShadows: false });
    root.addChild(light);
    return { root, body, legs, rune: runeRing, light, materials: [hideMaterial, harnessMaterial, packMaterial, runeMaterial], state, phase: this.projectilePhase(state.id) };
  }

  private updateExpeditionCargoView(dt: number): void {
    const view = this.expeditionCargoView;
    if (!view) return;
    const before = entityPosition(view.root);
    const alpha = dt <= 0 ? 1 : 1 - Math.exp(-dt * 12);
    lerpEntityPosition(view.root, view.state.position, alpha);
    const after = entityPosition(view.root);
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const moving = Math.hypot(dx, dz) > 0.0005;
    if (moving) setYaw(view.root, Math.atan2(dx, dz));
    const phase = this.elapsed * 7 + view.phase;
    for (let index = 0; index < view.legs.length; index++) {
      view.legs[index].setLocalEulerAngles(Math.sin(phase + (index % 2) * Math.PI) * (moving ? 16 : 2), 0, 0);
    }
    const pulse = 1 + Math.sin(this.elapsed * 3 + view.phase) * 0.08;
    view.rune.setLocalScale(0.22 * pulse, 0.025, 0.22 * pulse);
    if (view.light.light) view.light.light.intensity = 0.68 + pulse * 0.12;
  }

  private clearExpeditionCargoView(): void {
    const view = this.expeditionCargoView;
    if (!view) return;
    destroyEntity(view.root);
    for (const material of view.materials) material.destroy();
    this.expeditionCargoView = null;
  }

  private reconcileCooperativeRevives(entities: readonly EntityState[]): void {
    const incoming = new Map(reviveChannelPresentations(entities).map((presentation) => [presentation.reviver.id, presentation]));
    for (const [id, view] of this.cooperativeReviveViews) {
      const presentation = incoming.get(id);
      if (!presentation) {
        destroyCooperativeReviveVisual(view.visual);
        this.cooperativeReviveViews.delete(id);
        continue;
      }
      view.presentation = presentation;
    }
    for (const [id, presentation] of incoming) {
      if (this.cooperativeReviveViews.has(id)) continue;
      this.cooperativeReviveViews.set(id, {
        visual: createCooperativeReviveVisual(this.world, presentation, this.world.root),
        presentation,
      });
    }
  }

  private updateCooperativeReviveViews(): void {
    for (const view of this.cooperativeReviveViews.values()) {
      updateCooperativeReviveVisual(view.visual, view.presentation, this.elapsed);
    }
  }

  private clearCooperativeReviveViews(): void {
    for (const view of this.cooperativeReviveViews.values()) destroyCooperativeReviveVisual(view.visual);
    this.cooperativeReviveViews.clear();
  }

  private createProjectileView(state: ProjectileState): ProjectileView {
    const root = makeEntity(`projectile-${state.id}`, this.world.app);
    setEntityPosition(root, state.position);
    this.world.root.addChild(root);

    const presentation = projectilePresentation(state.kind);
    const coreColor = colorFromCss(presentation.coreColor);
    const trailColor = colorFromCss(presentation.trailColor);
    const coreMaterial = createMaterial(coreColor, {
      emissive: coreColor,
      emissiveIntensity: presentation.coreEmissive,
      opacity: 0.94,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const trailMaterial = createMaterial(trailColor, {
      emissive: trailColor,
      emissiveIntensity: presentation.trailEmissive,
      opacity: 0.5,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const radius = Math.max(0.12, Math.min(0.8, state.radius || 0.28));
    const core = this.world.createPrimitive(
      state.kind === 'arcaneBolt' ? 'arcane-bolt-core' : 'corrupted-shard-core',
      'sphere',
      coreMaterial,
      { x: 0, y: 0, z: 0 },
      state.kind === 'arcaneBolt'
        ? { x: radius * 1.55, y: radius * 1.55, z: radius * 2.9 }
        : { x: radius * 2, y: radius * 1.2, z: radius * 2.4 },
      root,
    );
    core.setLocalEulerAngles(state.kind === 'arcaneBolt' ? 0 : 18, 0, state.kind === 'arcaneBolt' ? 0 : 45);
    const trailLength = Math.max(0.72, radius * 3.4);
    const trail = this.world.createPrimitive(
      state.kind === 'arcaneBolt' ? 'arcane-bolt-trail' : 'corrupted-shard-trail',
      'cone',
      trailMaterial,
      { x: 0, y: 0, z: -trailLength * 0.48 },
      { x: radius * 0.9, y: trailLength, z: radius * 0.9 },
      root,
    );
    trail.setLocalEulerAngles(90, 0, 0);

    const light = makeEntity(state.kind === 'arcaneBolt' ? 'arcane-bolt-light' : 'corrupted-shard-light', this.world.app);
    light.addComponent('light', {
      type: 'omni',
      color: colorFromCss(presentation.lightColor),
      intensity: state.kind === 'arcaneBolt' ? 1.75 : 1.35,
      range: state.kind === 'arcaneBolt' ? 3.8 : 3.2,
      castShadows: false,
      falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED,
    });
    root.addChild(light);

    const view: ProjectileView = {
      root,
      core,
      trail,
      light,
      materials: [coreMaterial, trailMaterial],
      state,
      snapshotAt: this.elapsed,
      phase: this.projectilePhase(state.id),
    };
    this.updateProjectileDirection(view);
    return view;
  }

  private updateProjectileViews(dt: number): void {
    for (const view of this.projectileViews.values()) {
      const presentation = projectilePresentation(view.state.kind);
      const predicted = extrapolatedProjectilePosition(view.state, this.elapsed - view.snapshotAt);
      const corrected = correctedProjectilePosition(entityPosition(view.root), predicted, dt);
      setEntityPosition(view.root, corrected);
      this.updateProjectileDirection(view);

      const radius = Math.max(0.12, Math.min(0.8, view.state.radius || 0.28));
      const pulse = 1 + Math.sin(this.elapsed * presentation.pulseSpeed + view.phase) * 0.08;
      if (view.state.kind === 'arcaneBolt') {
        view.core.setLocalScale(radius * 1.55 * pulse, radius * 1.55 * pulse, radius * 2.9 * pulse);
      } else {
        view.core.setLocalScale(radius * 2 * pulse, radius * 1.2 * pulse, radius * 2.4 * pulse);
      }
      const speed = Math.hypot(view.state.velocity.x, view.state.velocity.y, view.state.velocity.z);
      const trailLength = Math.max(0.72, Math.min(2.4, radius * 2.2 + speed * 0.055));
      view.trail.setLocalPosition(0, 0, -trailLength * 0.48);
      view.trail.setLocalScale(radius * 0.9, trailLength, radius * 0.9);
      if (view.light.light) view.light.light.intensity = (view.state.kind === 'arcaneBolt' ? 1.55 : 1.25) + pulse * 0.22;
    }
  }

  private updateProjectileDirection(view: ProjectileView): void {
    const { x, z } = view.state.velocity;
    if (Math.hypot(x, z) > 0.001) setYaw(view.root, Math.atan2(x, z));
  }

  private projectilePhase(id: string): number {
    let hash = 2166136261;
    for (let index = 0; index < id.length; index++) {
      hash ^= id.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 6283) / 1000;
  }

  private removeProjectileView(id: string): void {
    const view = this.projectileViews.get(id);
    if (!view) return;
    // Destruicao explicita deixa o ownership auditavel: nenhuma luz ou material
    // sobrevive ao root quando o servidor remove o projetil.
    destroyEntity(view.core);
    destroyEntity(view.trail);
    destroyEntity(view.light);
    destroyEntity(view.root);
    for (const material of view.materials) material.destroy();
    view.materials.length = 0;
    this.projectileViews.delete(id);
  }

  private clearProjectileViews(): void {
    for (const id of [...this.projectileViews.keys()]) this.removeProjectileView(id);
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
      // A dungeon usa uma laje plana; o backend ainda envia Y calculado pelo
      // relevo externo para os baus. Normaliza apenas a apresentacao para que
      // west/deep nao fiquem afundados no novo piso modular.
      setEntityPosition(view.entity, {
        ...chest.position,
        y: this.world.groundHeightAt(chest.position.x, chest.position.z),
      });
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
    const setItem = equipmentSetItemPresentation(item);
    if (setItem) return EQUIPMENT_SET_COLORS[setItem.definition.id];
    if (item.rarity) return RARITY_COLORS[item.rarity];
    if (item.glowGem) return glowColorForGem(item.glowGem);
    return '#f0dfb2';
  }

  private lootAccentColor(item: LootState): string | null {
    const setItem = equipmentSetItemPresentation(item);
    if (setItem) return EQUIPMENT_SET_COLORS[setItem.definition.id];
    if (item.element === 'fire') return '#ff7a2f';
    if (item.glowGem) return glowColorForGem(item.glowGem);
    if (!item.rarity || item.rarity === 'comum') return null;
    return RARITY_COLORS[item.rarity];
  }

  private syncCombatEvents(
    events: readonly CombatEvent[],
    entities: readonly EntityState[],
    oreNodes: readonly OreNodeState[],
    doctrinePresentationEnabled: boolean,
    activeDoctrineId: CombatDoctrineId | null,
  ): void {
    for (const event of events) {
      if (this.seenCombatEvents.has(event.id)) continue;
      this.seenCombatEvents.add(event.id);
      if (
        event.type === 'encounter-seal-arming'
        || event.type === 'encounter-seal-wave'
        || event.type === 'encounter-seal-complete'
        || event.type === 'encounter-seal-reset'
      ) {
        const encounter = sealChamberEventPresentationGate(event);
        if (!encounter || this.zone !== 'dungeon') continue;
        const encounterLabelPosition = {
          x: encounter.position.x,
          y: this.world.groundHeightAt(encounter.position.x, encounter.position.z),
          z: encounter.position.z,
        };
        if (encounter.type === 'arming') {
          this.sfx.play('ui');
          this.showSealChamberPulse(encounter.position, encounter.radius, 'arming', encounter.delay);
          this.showCombatText('O SELO DESPERTA', encounterLabelPosition, 'magic');
        } else if (encounter.type === 'wave') {
          this.sfx.play('boss-slam');
          this.showSealChamberPulse(encounter.position, encounter.radius, 'wave', 0.72);
          this.showCombatText(`ONDA ${encounter.wave}/3`, encounterLabelPosition, 'incoming');
        } else if (encounter.type === 'complete') {
          this.sfx.play('rare-loot');
          this.showSealChamberPulse(encounter.position, encounter.radius, 'complete', 1.15);
          this.showCombatText('SELO ROMPIDO', encounterLabelPosition, 'critical');
          this.world.rig.addShake(0.3);
        } else {
          this.sfx.play('miss');
          this.showSealChamberPulse(encounter.position, encounter.radius, 'reset', 0.75);
          this.showCombatText('RITUAL DESFEITO', encounterLabelPosition, 'stagger');
        }
        continue;
      }
      if (
        event.type === 'boss-seal-rupture'
        || event.type === 'boss-seal-pulse-warning'
        || event.type === 'boss-seal-pulse-impact'
      ) {
        const seal = bossSealEventPresentationGate(event, entities);
        if (!seal || this.zone !== 'dungeon') continue;
        if (seal.type === 'rupture') {
          this.sfx.play('boss-slam');
          this.showBossSealRupture(seal.position, seal.radius, seal.duration);
        } else if (seal.type === 'pulse-warning') {
          this.sfx.play('ui');
          this.showBossSealPulseWarning(
            seal.position,
            seal.innerRadius,
            seal.radius,
            seal.delay,
          );
        } else {
          this.sfx.play('hit-magic');
          this.showBossSealPulseImpact(seal.position, seal.innerRadius, seal.radius);
        }
        continue;
      }
      if (event.type === 'runic-elite-fury' || event.type === 'runic-elite-defeated') {
        const runic = runicEliteEventPresentationGate(event, entities);
        if (!runic || this.zone !== 'dungeon') continue;
        if (runic.type === 'fury') {
          this.sfx.play('boss-slam');
          this.showCombatText('FÚRIA RÚNICA', runic.position, 'incoming');
          this.showRunicElitePulse(runic.position, runic.radius, 'fury');
          this.world.rig.addShake(0.16);
        } else {
          this.sfx.play('rare-loot');
          this.showCombatText('ELITE DERROTADO', runic.position, 'critical');
          this.showRunicElitePulse(runic.position, runic.radius, 'defeated');
          this.world.rig.addShake(0.22);
        }
        continue;
      }
      if (event.type === 'mining-perfect-strike') {
        const strike = miningPerfectStrikeEventGate(event, entities, oreNodes);
        if (!strike || this.zone !== 'overworld') continue;
        this.sfx.play('rare-loot');
        this.showCombatText(`GOLPE PERFEITO +${strike.event.amount}`, strike.event.position, 'critical');
        this.showMiningPerfectStrike(strike.event.position, strike.event.radius, strike.event.variant);
        if (strike.event.casterId === this.net.playerId) this.world.rig.addShake(0.12);
        continue;
      }
      if (event.type === 'arcane-resonance-rupture') {
        const resonance = arcaneResonanceEventPresentationGate(event, entities);
        if (!resonance) continue;
        this.sfx.play('arcane-nova');
        this.showCombatText(`RUPTURA · +${resonance.event.amount} MANA`, resonance.event.position, 'magic');
        this.showArcaneResonanceRupture(resonance.event.position, resonance.event.radius);
        if (resonance.event.casterId === this.net.playerId) this.world.rig.addShake(0.14);
        continue;
      }
      if (event.type === 'guardian-retaliation-ready' || event.type === 'guardian-retaliation-release') {
        const retaliation = guardianRetaliationEventPresentationGate(event, entities);
        if (!retaliation) continue;
        this.sfx.play(retaliation.phase === 'ready' ? 'ui' : 'hit-physical');
        this.showCombatText(
          retaliation.phase === 'ready' ? 'RETALIAÇÃO PRONTA' : 'CONTRA-ATAQUE',
          retaliation.event.position,
          retaliation.phase === 'ready' ? 'stagger' : 'critical',
        );
        this.showGuardianRetaliationPulse(retaliation.event.position, retaliation.event.radius, retaliation.phase);
        if (retaliation.phase === 'release' && retaliation.event.casterId === this.net.playerId) {
          this.world.rig.addShake(0.18);
        }
        continue;
      }
      if (event.type === 'evade-start' || event.type === 'evade-avoid') {
        const evasion = activeEvasionEventPresentationGate(event, entities);
        if (!evasion) continue;
        this.sfx.play('evade');
        if (evasion.phase === 'start') {
          this.showActiveEvasionTrail(
            evasion.event.origin,
            evasion.event.position,
            evasion.event.radius,
          );
          if (evasion.event.casterId === this.net.playerId) this.world.rig.addShake(0.08);
        } else {
          this.showCombatText('EVITADO', evasion.event.position, 'miss');
          this.showActiveEvasionAvoid(evasion.event.position, evasion.event.radius);
          if (evasion.event.casterId === this.net.playerId) this.world.rig.addShake(0.11);
        }
        continue;
      }
      if (event.type === 'storm-orb-discharge' || (event.type === 'skill-effect' && event.skill === 'storm-orb')) {
        const orb = stormOrbEventPresentationGate(event, entities);
        if (!orb) continue;
        if (orb.phase === 'cast') {
          this.sfx.play('arcane-nova');
          this.showStormOrbCast(orb.event.position, orb.event.radius);
        } else {
          this.sfx.play('hit-magic');
          this.showStormOrbDischarge(orb.event.origin, orb.event.position, orb.event.radius);
          this.showCombatText(`ORBE · ${orb.event.charges}`, orb.event.position, 'magic');
          if (orb.event.casterId === this.net.playerId) this.world.rig.addShake(0.07);
        }
        continue;
      }
      if (event.type === 'skill-effect' && event.skill === 'feral-form') {
        const form = feralFormEventPresentationGate(event, entities);
        if (!form || form.phase !== 'cast') continue;
        this.sfx.play('ui');
        this.showFeralFormCast(form.event.position, form.event.radius);
        this.showCombatText('FORMA FERAL', form.event.position, 'stagger');
        if (form.event.casterId === this.net.playerId) this.world.rig.addShake(0.1);
        continue;
      }
      if (event.type === 'skill-effect' && event.skill === 'root-snare') {
        const roots = rootSnareEventPresentationGate(event, entities);
        if (!roots) continue;
        this.sfx.play('ui');
        this.showRootSnareCast(roots.event.position, roots.event.radius);
        this.showCombatText('RAÍZES', roots.event.position, 'stagger');
        if (roots.event.casterId === this.net.playerId) this.world.rig.addShake(0.08);
        continue;
      }
      if (event.type === 'skill-effect' && event.skill === 'chain-lightning-impact') {
        const lightning = chainLightningEventPresentationGate(event, entities);
        if (!lightning) continue;
        this.sfx.play('hit-magic');
        this.showChainLightningArc(lightning.event.origin, lightning.event.position, lightning.hop);
        if (lightning.hop === 1 && lightning.event.casterId === this.net.playerId) this.world.rig.addShake(0.09);
        continue;
      }
      if (event.type === 'skill-effect' && event.skill === 'renewal-wave-heal') {
        const renewal = renewalWaveEventPresentationGate(event, entities);
        if (!renewal) continue;
        this.sfx.play('ui');
        this.showRenewalWaveHeal(renewal.event.origin, renewal.event.position, renewal.event.amount, renewal.hop);
        this.showCombatText(`+${Math.max(1, Math.round(renewal.event.amount))}`, renewal.event.position, 'magic');
        continue;
      }
      if (event.type === 'skill-effect' && event.skill === 'phase-step') {
        const step = phaseStepEventPresentationGate(event, entities);
        if (!step) continue;
        this.sfx.play('evade');
        this.showPhaseStep(step.event.origin, step.event.position);
        this.showCombatText('PASSO ESPECTRAL', step.event.position, 'magic');
        if (step.event.casterId === this.net.playerId) this.world.rig.addShake(0.07);
        continue;
      }
      if (event.type === 'skill-effect' && (event.skill === 'nature-spirit-summon' || event.skill === 'nature-spirit-bolt')) {
        const spirit = natureSpiritEventPresentationGate(event, entities);
        if (!spirit) continue;
        if (spirit.phase === 'summon') {
          this.sfx.play('ui');
          this.showNatureSpiritSummon(spirit.event.origin, spirit.event.position);
          this.showCombatText('ESPÍRITO DE ARANNA', spirit.event.position, 'magic');
        } else {
          this.sfx.play('hit-magic');
          this.showNatureSpiritBolt(spirit.event.origin, spirit.event.position);
        }
        continue;
      }
      if (event.type === 'steel-sweep-effect') {
        const form = steelSweepFormEventPresentationGate(event, entities);
        if (!form) continue;
        this.sfx.play('hit-physical');
        if (form.formId === 'warrior_sweep_form_orbit') {
          this.showSteelSweepOrbit(form.position, form.radius, event.casterId, form.variant);
        } else {
          this.showSteelSweepWedge(
            form.position,
            form.rotationY!,
            form.radius,
            form.arcDegrees!,
            event.casterId,
            form.variant,
          );
        }
        continue;
      }
      if (event.type === 'skill-effect') {
        if (event.skill === 'arcane-nova') {
          this.sfx.play('arcane-nova');
          this.showArcaneNova(event.position, event.radius);
        }
        if (event.skill === 'arcane-bolt') {
          this.sfx.play('arcane-nova');
          this.showArcaneBoltCast(event.position, event.radius);
        }
        if (event.skill === 'arcane-bolt-impact') {
          this.sfx.play('hit-magic');
          this.showArcaneBoltImpact(event.position, event.radius);
        }
        if (event.skill === 'arcane-bolt-slow') {
          this.showCombatText('DESCOMPASSO', event.position, 'stagger');
          this.showArcaneBoltSlow(event.position, event.radius);
        }
        if (event.skill === 'bulwark-call') {
          this.sfx.play('ui');
          this.showBulwarkCall(event.position, event.radius, event.casterId);
        }
        if (event.skill === 'bulwark-call-block') {
          this.sfx.play('hit-physical');
          this.showBulwarkBlock(event.position, event.radius, event.casterId);
        }
        const validVanguardReady = event.skill === 'doctrine-vanguard-ready' && event.sourceSkill === 'charge';
        const validVanguardRelease = event.skill === 'doctrine-vanguard-release' && event.sourceSkill === 'steel-sweep';
        const remoteDoctrineCaster = event.casterId !== this.net.playerId;
        if (
          doctrinePresentationEnabled
          && (remoteDoctrineCaster || activeDoctrineId === 'warrior_doctrine_vanguard')
          && (validVanguardReady || validVanguardRelease)
        ) {
          this.sfx.play(event.skill === 'doctrine-vanguard-release' ? 'hit-physical' : 'ui');
          this.showDoctrineVanguard(
            event.position,
            event.radius,
            event.skill === 'doctrine-vanguard-release' ? 'release' : 'ready',
            event.casterId,
          );
        }
        const validArcaneFlow = event.skill === 'doctrine-arcane-flow' && (
          (event.variant === 'bolt-to-nova' && event.sourceSkill === 'arcane-bolt')
          || (event.variant === 'nova-to-bolt' && event.sourceSkill === 'arcane-nova')
        );
        if (
          doctrinePresentationEnabled
          && (remoteDoctrineCaster || activeDoctrineId === 'warrior_doctrine_arcane_convergence')
          && validArcaneFlow
        ) {
          this.sfx.play('hit-magic');
          this.showDoctrineArcaneFlow(event.position, event.radius, event.variant, event.sourceSkill);
        }
        const validGuardianFlow = event.skill === 'doctrine-guardian-flow' && (
          (event.variant === 'guard-to-bulwark' && event.sourceSkill === 'iron-guard')
          || (event.variant === 'bulwark-to-guard' && event.sourceSkill === 'bulwark-call')
        );
        if (
          doctrinePresentationEnabled
          && (remoteDoctrineCaster || activeDoctrineId === 'warrior_doctrine_guardian_cadence')
          && validGuardianFlow
        ) {
          this.sfx.play('ui');
          this.showDoctrineGuardianFlow(event.position, event.radius, event.variant, event.sourceSkill);
        }
        if (event.skill === 'charge') {
          this.sfx.play('hit-physical');
          this.showChargeTrail(event.position, event.casterId, event.radius);
          this.showHitImpact(event.position, 'physical');
        }
        if (event.skill === 'steel-sweep') {
          this.sfx.play('hit-physical');
          this.showSteelSweep(event.position, event.radius, event.casterId, event.variant);
        }
        if (event.skill === 'steel-sweep-bleed') {
          this.showCombatText('SANGRANDO', event.position, 'bleed');
          this.showSteelSweepStatus(event.position, event.radius, 'axe');
        }
        if (event.skill === 'steel-sweep-stagger') {
          this.showCombatText('ABALO', event.position, 'stagger');
          this.showSteelSweepStatus(event.position, event.radius, 'hammer');
        }
        if (event.skill === 'iron-guard') {
          this.sfx.play('ui');
          this.showIronGuard(event.position, event.radius, event.casterId, 'cast');
        }
        if (event.skill === 'iron-guard-block') {
          this.sfx.play('hit-physical');
          this.showIronGuard(event.position, event.radius, event.casterId, 'block');
        }
        if (event.skill === 'iron-guard-perfect') {
          this.sfx.play('hit-magic');
          this.showIronGuard(event.position, event.radius, event.casterId, 'perfect');
        }
        continue;
      }
      if (event.type === 'enemy-projectile-warning') {
        const casterPosition = entities.find((entity) => entity.id === event.casterId)?.position;
        this.showEnemyProjectileWarning(
          event.position,
          event.radius,
          event.delay ?? 0.7,
          event.casterId,
          casterPosition,
        );
        continue;
      }
      if (
        event.type === 'enemy-support-warning'
        || event.type === 'enemy-support-apply'
        || event.type === 'enemy-support-interrupted'
      ) {
        const support = ashSupportEventPresentationGate(event, entities);
        if (!support) continue;
        if (support.type === 'warning') {
          this.showAshVeilWarning(
            support.caster.position,
            support.target.position,
            support.radius,
            support.delay,
          );
        } else if (support.type === 'apply') {
          this.sfx.play('ui');
          this.showAshVeilApply(support.caster.position, support.target.position, support.duration);
        } else {
          this.sfx.play('hit-physical');
          this.showAshVeilInterrupted(support.caster.position, support.interrupter.id);
        }
        continue;
      }
      if (
        event.type === 'enemy-brute-warning'
        || event.type === 'enemy-brute-impact'
        || event.type === 'enemy-brute-exposed'
      ) {
        const brute = ruinBruteEventPresentationGate(event, entities);
        if (!brute) continue;
        if (brute.type === 'warning') {
          this.showRuinCleaveWarning(
            brute.position,
            brute.rotationY,
            brute.radius,
            brute.arcDegrees,
            brute.delay,
          );
        } else if (brute.type === 'impact') {
          this.sfx.play('hit-physical');
          this.showRuinCleaveImpact(
            brute.position,
            brute.rotationY,
            brute.radius,
            brute.arcDegrees,
          );
        } else {
          this.sfx.play('hit-physical');
          this.showRuinBruteExposed(brute.position, brute.guarder.id);
        }
        continue;
      }
      if (
        event.type === 'utraean-lance-warning'
        || event.type === 'utraean-lance-impact'
        || event.type === 'utraean-lance-interrupted'
      ) {
        const sentinel = utraeanSentinelEventPresentationGate(event, entities);
        if (!sentinel) continue;
        if (sentinel.type === 'warning') {
          this.showUtraeanLanceWarning(sentinel.event.origin, sentinel.event.position, sentinel.event.radius, sentinel.event.delay);
        } else if (sentinel.type === 'impact') {
          this.sfx.play('hit-magic');
          this.showUtraeanLanceImpact(sentinel.event.origin, sentinel.event.position, sentinel.event.radius);
        } else {
          this.sfx.play('hit-physical');
          this.showUtraeanLanceInterrupted(sentinel.event.position);
          this.showCombatText('LANÇA INTERROMPIDA', sentinel.event.position, 'stagger');
        }
        continue;
      }
      if (event.type === 'enemy-projectile-impact') {
        this.sfx.play('hit-magic');
        this.showEnemyProjectileImpact(event.position, event.radius, event.targetId);
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
      if (event.type !== 'damage') continue;
      const feral = event.sourceSkill === 'feral-form'
        ? feralFormEventPresentationGate(event, entities)
        : null;
      if (feral?.phase === 'claw') this.showFeralClaw(feral.event.position);
      if (event.damageEffect === 'bleed') {
        // DoT pode gerar varios eventos por segundo: texto menor, sem repetir o
        // som e a explosao visual de um impacto direto em cada tick.
        this.showDamageText(event.amount, event.position, 'bleed');
      } else {
        this.sfx.play(event.damageKind === 'magic' ? 'hit-magic' : 'hit-physical');
        this.showDamageText(event.amount, event.position, event.critical ? 'critical' : event.damageKind);
        this.showHitImpact(event.position, event.damageKind);
      }
    }
    if (this.seenCombatEvents.size > 256) {
      const keep = new Set(events.map((event) => event.id));
      for (const id of this.seenCombatEvents) if (!keep.has(id)) this.seenCombatEvents.delete(id);
    }
  }

  /**
   * O chip e o halo de provocacao nascem somente do StatusState autoritativo.
   * O conjunto evita repetir o VFX a cada snapshot e nao participa de alvo,
   * mitigacao, dano ou progressao.
   */
  private syncBulwarkTauntStatuses(entities: readonly EntityState[]): void {
    const next = new Map<string, number>();
    for (const entity of entities) {
      if (entity.kind !== 'enemy' || !entity.alive) continue;
      for (const status of entity.statuses ?? []) {
        if (status.id !== 'bulwark-taunt' || status.sourceSkill !== 'bulwark-call') continue;
        const key = `${entity.id}:${status.sourceId ?? ''}`;
        const lastPulse = this.activeBulwarkTaunts.get(key);
        if (lastPulse === undefined) this.showCombatText('PROVOCADO', entity.position, 'stagger');
        if (lastPulse === undefined || this.elapsed - lastPulse >= 0.8) {
          this.showBulwarkTaunt(entity.position);
          next.set(key, this.elapsed);
        } else {
          next.set(key, lastPulse);
        }
      }
    }
    this.activeBulwarkTaunts.clear();
    for (const [key, lastPulse] of next) this.activeBulwarkTaunts.set(key, lastPulse);
  }

  private syncPartyEvents(events: readonly PartyEvent[]): void {
    for (const event of events) {
      if (this.seenPartyEvents.has(event.id)) continue;
      this.seenPartyEvents.add(event.id);
      if (event.type === 'item_forged' || event.type === 'ore_smelted' || event.type === 'tool_forged') {
        this.confirmForgeRecipePendingFromEvent(
          event.type,
          event.message || (event.type === 'ore_smelted'
            ? 'Fundição concluída com sucesso.'
            : event.type === 'tool_forged'
              ? 'Picareta forjada e vinculada ao ofício.'
              : 'Equipamento forjado com sucesso.'),
        );
      }
      if (event.type === 'forge_error' || event.type === 'smelt_error') {
        this.clearForgeRecipePending(event.message || 'A forja recusou o pedido.');
      }
      if (event.type === 'profession_contract_claimed') {
        this.clearProfessionContractPending(event.message || 'Contrato concluído. Recompensa recebida.', true);
      }
      if (event.type === 'profession_contract_error') {
        this.clearProfessionContractPending(event.message || 'Borin recusou o resgate do contrato.');
      }
      if (event.type === 'profession_level_up') {
        this.sfx.play('rare-loot');
        const active = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
        if (active?.definition.kind === 'blacksmith') {
          this.refreshBlacksmithDialogue(event.message || 'Um ofício alcançou um novo nível.');
        }
      } else if (event.type === 'profession_progress' && event.message) {
        const active = this.activeQuestNpcId ? this.npcViews.get(this.activeQuestNpcId) : null;
        if (active?.definition.kind === 'blacksmith') this.hud.setNpcDialogueStatus(event.message);
      }
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

  private showDamageText(amount: number, position: Vec3Like, damageKind: CombatTextKind): void {
    // Numero de dano flutuante (apresentacao; client-side). O backend manda
    // valores com fracao (Round2, ex.: 14.85) — arredonda para leitura.
    this.showCombatText(Math.round(amount), position, damageKind);
  }

  private showCombatText(text: number | string, position: Vec3Like, textKind: CombatTextKind): void {
    if (typeof text === 'number' && text <= 0) return;
    if (this.damageTexts.length >= MAX_FLOATING_COMBAT_TEXTS) this.damageTexts.shift()?.dispose();
    const verticalOffset = textKind === 'magic'
      ? 3.18
      : textKind === 'miss'
        ? 2.95
        : textKind === 'incoming'
          ? 3.05
          : textKind === 'bleed'
            ? 2.55
            : textKind === 'stagger'
              ? 2.92
              : 2.75;
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

  private showArcaneBoltCast(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#dffcff');
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 2.35,
      opacity: 0.64,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'arcane-bolt-cast',
      'torus',
      material,
      { x: position.x, y: position.y + 0.12, z: position.z },
      { x: 0.34, y: 0.018, z: 0.34 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.28, 0.34, Math.max(0.9, radius * 1.6), 0.018));
  }

  /** Aparece tanto ao acertar entidade quanto ao colidir com parede. */
  private showArcaneBoltImpact(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#efffff');
    const burstMaterial = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 2.8,
      opacity: 0.78,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const burst = this.world.createPrimitive(
      'arcane-bolt-impact',
      'sphere',
      burstMaterial,
      { x: position.x, y: position.y + 0.42, z: position.z },
      { x: 0.2, y: 0.2, z: 0.2 },
    );
    this.effects.push(new PulseEffect(burst, burstMaterial, 0.34, 0.2, Math.max(1.35, radius * 4.2), 1));

    const ringColor = colorFromCss('#67e9ff');
    const ringMaterial = createMaterial(ringColor, {
      emissive: ringColor,
      emissiveIntensity: 2.1,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'arcane-bolt-impact-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.075, z: position.z },
      { x: 0.24, y: 0.018, z: 0.24 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.42, 0.24, Math.max(1.45, radius * 4.6), 0.018));
  }

  private showArcaneBoltSlow(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#76eaff');
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 1.8,
      opacity: 0.5,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'arcane-bolt-slow',
      'torus',
      material,
      { x: position.x, y: position.y + 0.11, z: position.z },
      { x: 0.36, y: 0.022, z: 0.36 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.52, 0.36, Math.max(1.25, radius * 3.8), 0.022));
  }

  private showArcaneResonanceRupture(position: Vec3Like, radius: number): void {
    const mark = colorFromCss(ARCANE_RESONANCE_PALETTE.mark);
    const rupture = colorFromCss(ARCANE_RESONANCE_PALETTE.rupture);
    const core = colorFromCss(ARCANE_RESONANCE_PALETTE.core);
    for (let index = 0; index < 2; index++) {
      const tone = index === 0 ? mark : rupture;
      const material = createMaterial(tone, {
        emissive: tone,
        emissiveIntensity: 2.65,
        opacity: index === 0 ? 0.78 : 0.62,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const ring = this.world.createPrimitive(
        `arcane-resonance-rupture-ring-${index}`,
        'torus',
        material,
        { x: position.x, y: position.y + 0.09 + index * 0.055, z: position.z },
        { x: 0.32 + index * 0.16, y: 0.028, z: 0.32 + index * 0.16 },
      );
      this.effects.push(new PulseEffect(
        ring,
        material,
        0.58 + index * 0.1,
        0.32 + index * 0.16,
        radius * (index === 0 ? 2 : 1.68),
        0.028,
      ));
    }
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      const tone = index % 3 === 0 ? core : index % 2 === 0 ? rupture : mark;
      const material = createMaterial(tone, {
        emissive: tone,
        emissiveIntensity: 2.35,
        opacity: 0.8,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `arcane-resonance-rupture-shard-${index}`,
        index % 2 === 0 ? 'cone' : 'box',
        material,
        {
          x: position.x + Math.sin(angle) * radius * 0.42,
          y: position.y + 0.35 + (index % 3) * 0.18,
          z: position.z + Math.cos(angle) * radius * 0.42,
        },
        index % 2 === 0 ? { x: 0.11, y: 0.44, z: 0.11 } : { x: 0.12, y: 0.3, z: 0.065 },
      );
      shard.setLocalEulerAngles(22, angle * 180 / Math.PI, index % 2 === 0 ? 28 : -28);
      this.effects.push(new FadingEntityEffect(shard, material, 0.58, 0.82));
    }
  }

  private showBulwarkCall(position: Vec3Like, radius: number, casterId: string): void {
    const amber = colorFromCss('#f6b94d');
    const paleAmber = colorFromCss('#ffe6a4');
    const visualRadius = Math.max(2.2, Math.min(9, radius || 8.5));
    for (let i = 0; i < 2; i++) {
      const color = i === 0 ? amber : paleAmber;
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.9 - i * 0.25,
        opacity: 0.58 - i * 0.12,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const ring = this.world.createPrimitive(
        `bulwark-call-ring-${i}`,
        'torus',
        material,
        { x: position.x, y: position.y + 0.07 + i * 0.025, z: position.z },
        { x: 0.55 + i * 0.2, y: 0.025, z: 0.55 + i * 0.2 },
      );
      this.effects.push(new PulseEffect(
        ring,
        material,
        0.72 + i * 0.1,
        0.55 + i * 0.2,
        visualRadius * (1.85 - i * 0.08),
        0.025,
      ));
    }

    // Quatro placas douradas formam uma leitura de baluarte ao redor do heroi.
    const panels: ChargeTrailSegment[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const material = createMaterial(paleAmber, {
        emissive: paleAmber,
        emissiveIntensity: 2,
        opacity: 0.58,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = { x: 0.42, y: 0.72, z: 0.055 };
      const panel = this.world.createPrimitive(
        'bulwark-call-shield',
        'box',
        material,
        {
          x: position.x + Math.sin(angle) * 0.82,
          y: position.y + 0.9,
          z: position.z + Math.cos(angle) * 0.82,
        },
        scale,
      );
      setYaw(panel, angle);
      panels.push({ entity: panel, material, opacity: 0.58, scale });
    }
    this.effects.push(new ChargeTrailEffect(panels, 0.68));
    if (casterId === this.net.playerId) this.world.rig.addShake(0.08);
  }

  private showBulwarkTaunt(position: Vec3Like): void {
    const amber = colorFromCss('#ffbd52');
    const material = createMaterial(amber, {
      emissive: amber,
      emissiveIntensity: 2.05,
      opacity: 0.62,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'bulwark-taunt-ring',
      'torus',
      material,
      { x: position.x, y: position.y + 0.12, z: position.z },
      { x: 0.34, y: 0.022, z: 0.34 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.5, 0.34, 1.45, 0.022));

    const horns: ChargeTrailSegment[] = [];
    for (const side of [-1, 1]) {
      const hornMaterial = createMaterial(amber, {
        emissive: amber,
        emissiveIntensity: 2.2,
        opacity: 0.68,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = { x: 0.08, y: 0.42, z: 0.08 };
      const horn = this.world.createPrimitive(
        'bulwark-taunt-horn',
        'cone',
        hornMaterial,
        { x: position.x + side * 0.28, y: position.y + 2.15, z: position.z },
        scale,
      );
      horn.setLocalEulerAngles(0, 0, side * -24);
      horns.push({ entity: horn, material: hornMaterial, opacity: 0.68, scale });
    }
    this.effects.push(new ChargeTrailEffect(horns, 0.58));
  }

  private showBulwarkBlock(position: Vec3Like, radius: number, defenderId: string): void {
    const color = colorFromCss('#ffd278');
    const visualRadius = Math.max(0.9, Math.min(2.2, radius || 1.25));
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 2.45,
      opacity: 0.76,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const burst = this.world.createPrimitive(
      'bulwark-call-block',
      'sphere',
      material,
      { x: position.x, y: position.y + 1.05, z: position.z },
      { x: 0.2, y: 0.32, z: 0.2 },
    );
    this.effects.push(new PulseEffect(burst, material, 0.34, 0.2, visualRadius * 1.45, 1));
    if (defenderId === this.net.playerId) this.world.rig.addShake(0.1);
  }

  private showDoctrineVanguard(
    position: Vec3Like,
    radius: number,
    phase: 'ready' | 'release',
    casterId: string,
  ): void {
    const color = colorFromCss(phase === 'release' ? '#ff7a2f' : '#ffad61');
    const visualRadius = Math.max(0.7, Math.min(2.8, radius || 1.2));
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: phase === 'release' ? 2.45 : 1.9,
      opacity: phase === 'release' ? 0.72 : 0.54,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      `doctrine-vanguard-${phase}`,
      phase === 'release' ? 'sphere' : 'torus',
      material,
      { x: position.x, y: position.y + (phase === 'release' ? 0.72 : 0.09), z: position.z },
      phase === 'release'
        ? { x: 0.2, y: 0.28, z: 0.2 }
        : { x: 0.42, y: 0.024, z: 0.42 },
    );
    this.effects.push(new PulseEffect(
      ring,
      material,
      phase === 'release' ? 0.38 : 0.58,
      phase === 'release' ? 0.2 : 0.42,
      visualRadius * (phase === 'release' ? 1.7 : 2.1),
      phase === 'release' ? 1 : 0.024,
    ));
    this.showCombatText(phase === 'release' ? 'VANGUARDA!' : 'ÍMPETO', position, 'critical');
    if (phase === 'release' && casterId === this.net.playerId) this.world.rig.addShake(0.12);
  }

  private showDoctrineArcaneFlow(
    position: Vec3Like,
    radius: number,
    variant: unknown,
    sourceSkill?: SkillId,
  ): void {
    const color = colorFromCss('#69eaff');
    const visualRadius = Math.max(0.8, Math.min(2.6, radius || 1.15));
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 2.25,
      opacity: 0.64,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'doctrine-arcane-flow',
      'torus',
      material,
      { x: position.x, y: position.y + 0.1, z: position.z },
      { x: 0.3, y: 0.02, z: 0.3 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.48, 0.3, visualRadius * 2.25, 0.02));
    const direction = variant === 'bolt-to-nova' && sourceSkill === 'arcane-bolt'
      ? 'DARDO → NOVA'
      : variant === 'nova-to-bolt' && sourceSkill === 'arcane-nova'
        ? 'NOVA → DARDO'
        : 'CONVERGÊNCIA';
    this.showCombatText(direction, position, 'magic');
  }

  private showDoctrineGuardianFlow(
    position: Vec3Like,
    radius: number,
    variant: unknown,
    sourceSkill?: SkillId,
  ): void {
    const color = colorFromCss('#ffc768');
    const visualRadius = Math.max(0.8, Math.min(2.5, radius || 1.1));
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 2.05,
      opacity: 0.6,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'doctrine-guardian-flow',
      'torus',
      material,
      { x: position.x, y: position.y + 0.1, z: position.z },
      { x: 0.38, y: 0.026, z: 0.38 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.52, 0.38, visualRadius * 2.1, 0.026));
    const direction = variant === 'guard-to-bulwark' && sourceSkill === 'iron-guard'
      ? 'GUARDA → BALUARTE'
      : variant === 'bulwark-to-guard' && sourceSkill === 'bulwark-call'
        ? 'BALUARTE → GUARDA'
        : 'CADÊNCIA GUARDIÃ';
    this.showCombatText(direction, position, 'stagger');
  }

  private showSteelSweep(position: Vec3Like, radius: number, casterId: string, variant: unknown): void {
    const presentation = steelSweepPresentationForVariant(variant);
    const visualRadius = Math.max(0.8, radius);
    for (let i = 0; i < presentation.ringCount; i++) {
      const ringColor = colorFromCss(presentation.ringColor);
      const ringMaterial = createMaterial(ringColor, {
        emissive: ringColor,
        emissiveIntensity: 1.65 + i * 0.12,
        opacity: 0.62 - i * 0.08,
        additive: true,
        unlit: true,
      });
      const startRadius = 0.5 + i * 0.2;
      const ring = this.world.createPrimitive(
        `steel-sweep-${presentation.variant ?? 'generic'}-ring`,
        'torus',
        ringMaterial,
        { x: position.x, y: position.y + 0.085 + i * 0.012, z: position.z },
        { x: startRadius, y: 0.026, z: startRadius },
      );
      this.effects.push(new PulseEffect(
        ring,
        ringMaterial,
        0.4 + i * 0.07,
        startRadius,
        visualRadius * 2 * (1 - i * 0.08),
        0.026,
      ));
    }

    // A geometria continua feita com primitivas ja carregadas; quantidade,
    // largura e cor tornam cada familia de arma legivel sem novos assets.
    const slashColor = colorFromCss(presentation.slashColor);
    const slashes: ChargeTrailSegment[] = [];
    for (let i = 0; i < presentation.slashCount; i++) {
      const angle = (i / presentation.slashCount) * Math.PI * 2;
      const material = createMaterial(slashColor, {
        emissive: slashColor,
        emissiveIntensity: 1.8,
        opacity: 0.55,
        additive: true,
        unlit: true,
      });
      const entity = this.world.createPrimitive(
        `steel-sweep-${presentation.variant ?? 'generic'}-slash`,
        'box',
        material,
        {
          x: position.x + Math.sin(angle) * visualRadius * 0.52,
          y: position.y + 0.12 + i * 0.004,
          z: position.z + Math.cos(angle) * visualRadius * 0.52,
        },
        { x: presentation.slashWidth, y: 0.018, z: visualRadius * presentation.slashLengthScale },
      );
      setYaw(entity, angle);
      slashes.push({
        entity,
        material,
        opacity: 0.55,
        scale: {
          x: presentation.slashWidth,
          y: 0.018,
          z: visualRadius * presentation.slashLengthScale,
        },
      });
    }
    this.effects.push(new ChargeTrailEffect(slashes, 0.38));
    if (casterId === this.net.playerId) this.world.rig.addShake(presentation.shake);
  }

  private showSteelSweepOrbit(
    position: Vec3Like,
    radius: number,
    casterId: string,
    variant: unknown,
  ): void {
    // A familia da arma continua legivel por baixo da nova geometria.
    this.showSteelSweep(position, radius, casterId, variant);
    for (let index = 0; index < 3; index++) {
      const color = colorFromCss(index % 2 === 0
        ? STEEL_SWEEP_FORM_PALETTE.orbit
        : STEEL_SWEEP_FORM_PALETTE.orbitCore);
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.9 + index * 0.16,
        opacity: 0.62 - index * 0.1,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const startRadius = radius * (0.24 + index * 0.13);
      const ring = this.world.createPrimitive(
        `steel-sweep-form-orbit-authoritative-ring-${index}`,
        'torus',
        material,
        { x: position.x, y: position.y + 0.1 + index * 0.012, z: position.z },
        { x: startRadius, y: 0.025, z: startRadius },
      );
      this.effects.push(new PulseEffect(
        ring,
        material,
        0.48 + index * 0.06,
        startRadius,
        radius * 2 * (0.92 + index * 0.04),
        0.025,
      ));
    }
  }

  private showSteelSweepWedge(
    position: Vec3Like,
    rotationY: number,
    radius: number,
    arcDegrees: number,
    casterId: string,
    variant: unknown,
  ): void {
    const weapon = steelSweepPresentationForVariant(variant);
    const halfArcRadians = arcDegrees * Math.PI / 360;
    const waves: ChargeTrailSegment[] = [];
    const waveCount = 9;
    for (let index = 0; index < waveCount; index++) {
      const ratio = waveCount > 1 ? index / (waveCount - 1) : 0.5;
      const offset = -halfArcRadians + ratio * halfArcRadians * 2;
      const yaw = rotationY + offset;
      const length = radius * (index === 0 || index === waveCount - 1 ? 0.98 : 0.86);
      const color = colorFromCss(index % 3 === 1
        ? weapon.slashColor
        : index % 2 === 0
          ? STEEL_SWEEP_FORM_PALETTE.wedge
          : STEEL_SWEEP_FORM_PALETTE.wedgeCore);
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.95,
        opacity: 0.7,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = {
        x: index === 0 || index === waveCount - 1 ? 0.14 : 0.09,
        y: 0.026,
        z: length,
      };
      const wave = this.world.createPrimitive(
        `steel-sweep-form-wedge-authoritative-sector-${index}`,
        'box',
        material,
        {
          x: position.x + Math.sin(yaw) * length * 0.5,
          y: position.y + 0.105 + (index % 3) * 0.01,
          z: position.z + Math.cos(yaw) * length * 0.5,
        },
        scale,
      );
      setYaw(wave, yaw);
      waves.push({ entity: wave, material, opacity: 0.7, scale });
    }
    this.effects.push(new ChargeTrailEffect(waves, 0.46));
    this.showCombatText('CUNHA', position, 'critical');
    if (casterId === this.net.playerId) this.world.rig.addShake(Math.max(0.16, weapon.shake + 0.08));
  }

  /** Feedback curto de aplicacao; dano periodico posterior fica apenas no texto vermelho. */
  private showSteelSweepStatus(position: Vec3Like, radius: number, variant: 'axe' | 'hammer'): void {
    const presentation = steelSweepPresentationForVariant(variant);
    const color = colorFromCss(presentation.statusColor);
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: 1.55,
      opacity: 0.56,
      additive: true,
      unlit: true,
    });
    const startRadius = 0.22;
    const endRadius = Math.max(0.9, Math.min(1.8, radius * 2));
    const ring = this.world.createPrimitive(
      `steel-sweep-${variant}-status`,
      'torus',
      material,
      { x: position.x, y: position.y + 0.1, z: position.z },
      { x: startRadius, y: 0.018, z: startRadius },
    );
    this.effects.push(new PulseEffect(ring, material, 0.3, startRadius, endRadius, 0.018));
  }

  private showFeralFormCast(position: Vec3Like, radius: number): void {
    const hide = colorFromCss(FERAL_FORM_PALETTE.hide);
    const shadow = colorFromCss(FERAL_FORM_PALETTE.shadow);
    for (let index = 0; index < 3; index++) {
      const material = createMaterial(index === 1 ? shadow : hide, {
        emissive: index === 1 ? shadow : hide,
        emissiveIntensity: 2.1,
        opacity: 0.68 - index * 0.1,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const start = 0.2 + index * 0.09;
      const ring = this.world.createPrimitive(
        `feral-form-authoritative-cast-ring-${index}`,
        'torus',
        material,
        { x: position.x, y: position.y + 0.08 + index * 0.03, z: position.z },
        { x: start, y: 0.024, z: start },
      );
      this.effects.push(new PulseEffect(ring, material, 0.52 + index * 0.05, start, radius * 2 * (0.88 + index * 0.06), 0.024));
    }
  }

  private showRootSnareCast(position: Vec3Like, radius: number): void {
    const rootColor = colorFromCss(ROOT_SNARE_PALETTE.root);
    const pulseColor = colorFromCss(ROOT_SNARE_PALETTE.pulse);
    for (let index = 0; index < 3; index++) {
      const color = index === 1 ? pulseColor : rootColor;
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.85,
        opacity: 0.68 - index * 0.1,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const start = 0.22 + index * 0.12;
      const ring = this.world.createPrimitive(
        `root-snare-authoritative-cast-ring-${index}`,
        'torus',
        material,
        { x: position.x, y: position.y + 0.06 + index * 0.018, z: position.z },
        { x: start, y: 0.024, z: start },
      );
      this.effects.push(new PulseEffect(ring, material, 0.46 + index * 0.06, start, radius * 2 * (0.9 + index * 0.05), 0.024));
    }
  }

  private showFeralClaw(position: Vec3Like): void {
    const claw = colorFromCss(FERAL_FORM_PALETTE.claw);
    for (const side of [-1, 1]) {
      const material = createMaterial(claw, {
        emissive: claw, emissiveIntensity: 2.4, opacity: 0.76, additive: true, unlit: true, depthWrite: false,
      });
      const slash = this.world.createPrimitive(
        `feral-form-authoritative-claw-impact-${side}`,
        'box',
        material,
        { x: position.x + side * 0.12, y: position.y + 0.78, z: position.z },
        { x: 0.055, y: 0.72, z: 0.055 },
      );
      slash.setLocalEulerAngles(0, 0, side * 32);
      this.effects.push(new FadingEntityEffect(slash, material, 0.34, 0.76));
    }
  }

  private showStormOrbCast(position: Vec3Like, radius: number): void {
    const shell = colorFromCss(STORM_ORB_PALETTE.shell);
    const storm = colorFromCss(STORM_ORB_PALETTE.storm);
    const ringMaterial = createMaterial(shell, {
      emissive: shell,
      emissiveIntensity: 2.55,
      opacity: 0.74,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'storm-orb-authoritative-cast-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.12, z: position.z },
      { x: 0.28, y: 0.028, z: 0.28 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.58, 0.28, radius * 2, 0.028));
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI * 0.5;
      const material = createMaterial(index % 2 === 0 ? shell : storm, {
        emissive: index % 2 === 0 ? shell : storm,
        emissiveIntensity: 2.3,
        opacity: 0.72,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const mote = this.world.createPrimitive(
        `storm-orb-authoritative-cast-mote-${index}`,
        'sphere',
        material,
        {
          x: position.x + Math.sin(angle) * 0.72,
          y: position.y + 0.55 + index * 0.18,
          z: position.z + Math.cos(angle) * 0.72,
        },
        { x: 0.13, y: 0.13, z: 0.13 },
      );
      this.effects.push(new FadingEntityEffect(mote, material, 0.62, 0.72));
    }
  }

  /** Tether e impacto usam somente a origem/alvo congelados no evento. */
  private showStormOrbDischarge(origin: Vec3Like, position: Vec3Like, radius: number): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const bolt = colorFromCss(STORM_ORB_PALETTE.bolt);
      const material = createMaterial(bolt, {
        emissive: bolt,
        emissiveIntensity: 3,
        opacity: 0.82,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const tether = this.world.createPrimitive(
        'storm-orb-authoritative-discharge-tether',
        'box',
        material,
        {
          x: (origin.x + position.x) * 0.5,
          y: Math.max(origin.y, position.y) + 1.08,
          z: (origin.z + position.z) * 0.5,
        },
        { x: 0.055, y: 0.055, z: distance },
      );
      setYaw(tether, Math.atan2(dx, dz));
      this.effects.push(new FadingEntityEffect(tether, material, 0.24, 0.82));
    }
    const storm = colorFromCss(STORM_ORB_PALETTE.storm);
    const impactMaterial = createMaterial(storm, {
      emissive: storm,
      emissiveIntensity: 2.75,
      opacity: 0.78,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const impact = this.world.createPrimitive(
      'storm-orb-authoritative-discharge-impact',
      'sphere',
      impactMaterial,
      { x: position.x, y: position.y + 1.08, z: position.z },
      { x: 0.18, y: 0.18, z: 0.18 },
    );
    this.effects.push(new PulseEffect(impact, impactMaterial, 0.34, 0.18, radius * 2.2, 1));
  }

  private showUtraeanLanceWarning(origin: Vec3Like, endpoint: Vec3Like, halfWidth: number, delay: number): void {
    this.showUtraeanLanceStrip(origin, endpoint, halfWidth, UTRAEAN_SENTINEL_PALETTE.warning, delay, 0.34, 'warning');
  }

  private showUtraeanLanceImpact(origin: Vec3Like, endpoint: Vec3Like, halfWidth: number): void {
    this.showUtraeanLanceStrip(origin, endpoint, halfWidth, UTRAEAN_SENTINEL_PALETTE.impact, 0.3, 0.88, 'impact');
    const tone = colorFromCss(UTRAEAN_SENTINEL_PALETTE.rune);
    for (let index = 0; index < 5; index++) {
      const material = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3.6, opacity: 0.86,
        additive: true, unlit: true, depthWrite: false,
      });
      const progress = (index + 0.5) / 5;
      const mote = this.world.createPrimitive(
        `utraean-lance-impact-mote-${index}`, 'sphere', material,
        {
          x: origin.x + (endpoint.x - origin.x) * progress,
          y: origin.y + (endpoint.y - origin.y) * progress + 0.72,
          z: origin.z + (endpoint.z - origin.z) * progress,
        },
        { x: 0.12, y: 0.12, z: 0.12 },
      );
      this.effects.push(new PulseEffect(mote, material, 0.28, 0.12, 2.2, 1));
    }
  }

  private showUtraeanLanceStrip(
    origin: Vec3Like,
    endpoint: Vec3Like,
    halfWidth: number,
    color: string,
    duration: number,
    opacity: number,
    phase: 'warning' | 'impact',
  ): void {
    const dx = endpoint.x - origin.x;
    const dz = endpoint.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const tone = colorFromCss(color);
    const material = createMaterial(tone, {
      emissive: tone, emissiveIntensity: phase === 'impact' ? 3.2 : 1.8,
      opacity, additive: true, unlit: true, depthWrite: false,
    });
    const strip = this.world.createPrimitive(
      `utraean-lance-${phase}-strip`, 'box', material,
      {
        x: (origin.x + endpoint.x) * 0.5,
        y: Math.max(origin.y, endpoint.y) + (phase === 'impact' ? 0.72 : 0.055),
        z: (origin.z + endpoint.z) * 0.5,
      },
      { x: halfWidth * 2, y: phase === 'impact' ? 0.08 : 0.025, z: distance },
    );
    setYaw(strip, Math.atan2(dx, dz));
    this.effects.push(new FadingEntityEffect(strip, material, Math.max(0.12, duration), opacity));
  }

  private showUtraeanLanceInterrupted(position: Vec3Like): void {
    const tone = colorFromCss(UTRAEAN_SENTINEL_PALETTE.interrupted);
    const material = createMaterial(tone, {
      emissive: tone, emissiveIntensity: 2.8, opacity: 0.78,
      additive: true, unlit: true, depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'utraean-lance-interrupted-ring', 'torus', material,
      { x: position.x, y: position.y + 0.08, z: position.z },
      { x: 0.8, y: 0.035, z: 0.8 },
    );
    this.effects.push(new PulseEffect(ring, material, 0.52, 0.8, 2.6, 1));
  }

  /** Arco segmentado usa somente os dois pontos congelados pelo servidor. */
  private showChainLightningArc(origin: Vec3Like, position: Vec3Like, hop: 1 | 2 | 3 | 4): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const sideX = dz / distance;
    const sideZ = -dx / distance;
    const segments = 6;
    const points: Vec3Like[] = [];
    for (let index = 0; index <= segments; index++) {
      const progress = index / segments;
      const terminal = index === 0 || index === segments;
      const jitter = terminal ? 0 : (index % 2 === 0 ? 1 : -1) * (0.14 + (index % 3) * 0.035);
      points.push({
        x: origin.x + dx * progress + sideX * jitter,
        y: origin.y + (position.y - origin.y) * progress + 1.05 + Math.sin(progress * Math.PI) * 0.16,
        z: origin.z + dz * progress + sideZ * jitter,
      });
    }
    const tone = colorFromCss(hop === 1 ? CHAIN_LIGHTNING_PALETTE.core : hop === 4 ? CHAIN_LIGHTNING_PALETTE.branch : CHAIN_LIGHTNING_PALETTE.bolt);
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index];
      const end = points[index + 1];
      const segX = end.x - start.x;
      const segZ = end.z - start.z;
      const length = Math.hypot(segX, segZ);
      const material = createMaterial(tone, {
        emissive: tone,
        emissiveIntensity: hop === 1 ? 3.8 : 3.1,
        opacity: 0.9 - hop * 0.08,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const segment = this.world.createPrimitive(
        `chain-lightning-authoritative-hop-${hop}-${index}`,
        'box', material,
        { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5, z: (start.z + end.z) * 0.5 },
        { x: hop === 1 ? 0.045 : 0.035, y: hop === 1 ? 0.045 : 0.035, z: length },
      );
      setYaw(segment, Math.atan2(segX, segZ));
      this.effects.push(new FadingEntityEffect(segment, material, 0.23, 0.9));
    }
    const impactTone = colorFromCss(CHAIN_LIGHTNING_PALETTE.impact);
    const impactMaterial = createMaterial(impactTone, {
      emissive: impactTone, emissiveIntensity: 3.4, opacity: 0.82,
      additive: true, unlit: true, depthWrite: false,
    });
    const impact = this.world.createPrimitive(
      `chain-lightning-authoritative-impact-${hop}`, 'sphere', impactMaterial,
      { x: position.x, y: position.y + 1.05, z: position.z },
      { x: 0.16, y: 0.16, z: 0.16 },
    );
    this.effects.push(new PulseEffect(impact, impactMaterial, 0.28, 0.16, 2.6, 1));
  }

  /** Elo suave e florescimento usam somente a geometria e a cura confirmadas pelo servidor. */
  private showRenewalWaveHeal(origin: Vec3Like, position: Vec3Like, amount: number, hop: 1 | 2 | 3 | 4): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= 0.001) {
      const sideX = dz / distance;
      const sideZ = -dx / distance;
      const segments = 7;
      for (let index = 0; index < segments; index++) {
        const from = index / segments;
        const to = (index + 1) / segments;
        const curveFrom = Math.sin(from * Math.PI) * (hop % 2 === 0 ? -0.16 : 0.16);
        const curveTo = Math.sin(to * Math.PI) * (hop % 2 === 0 ? -0.16 : 0.16);
        const start = {
          x: origin.x + dx * from + sideX * curveFrom,
          y: origin.y + (position.y - origin.y) * from + 0.9 + Math.sin(from * Math.PI) * 0.28,
          z: origin.z + dz * from + sideZ * curveFrom,
        };
        const end = {
          x: origin.x + dx * to + sideX * curveTo,
          y: origin.y + (position.y - origin.y) * to + 0.9 + Math.sin(to * Math.PI) * 0.28,
          z: origin.z + dz * to + sideZ * curveTo,
        };
        const segX = end.x - start.x;
        const segZ = end.z - start.z;
        const length = Math.hypot(segX, segZ);
        const tone = colorFromCss(index % 2 === 0 ? RENEWAL_WAVE_PALETTE.tether : RENEWAL_WAVE_PALETTE.core);
        const material = createMaterial(tone, {
          emissive: tone, emissiveIntensity: 2.4, opacity: 0.72 - hop * 0.055,
          additive: true, unlit: true, depthWrite: false,
        });
        const segment = this.world.createPrimitive(
          `renewal-wave-authoritative-tether-${hop}-${index}`, 'box', material,
          { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5, z: (start.z + end.z) * 0.5 },
          { x: 0.035, y: 0.035, z: length },
        );
        setYaw(segment, Math.atan2(segX, segZ));
        this.effects.push(new FadingEntityEffect(segment, material, 0.34, 0.72));
      }
    }

    const bloomTone = colorFromCss(hop === 1 ? RENEWAL_WAVE_PALETTE.core : RENEWAL_WAVE_PALETTE.bloom);
    const bloomMaterial = createMaterial(bloomTone, {
      emissive: bloomTone, emissiveIntensity: 2.8, opacity: 0.78,
      additive: true, unlit: true, depthWrite: false,
    });
    const bloomScale = Math.min(0.52, 0.24 + amount * 0.008);
    const bloom = this.world.createPrimitive(
      `renewal-wave-authoritative-bloom-${hop}`, 'torus', bloomMaterial,
      { x: position.x, y: position.y + 0.08, z: position.z },
      { x: bloomScale, y: 0.03, z: bloomScale },
    );
    this.effects.push(new PulseEffect(bloom, bloomMaterial, 0.48, bloomScale, 2.4, 1));
  }

  /** Fenda curta desenhada exclusivamente entre origem e destino confirmados. */
  private showPhaseStep(origin: Vec3Like, position: Vec3Like): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const sideX = dirZ;
    const sideZ = -dirX;
    const segments = Math.max(4, Math.ceil(distance * 1.4));
    for (let index = 0; index < segments; index++) {
      const progress = (index + 0.5) / segments;
      const width = index % 2 === 0 ? 0.055 : 0.035;
      const offset = (index % 2 === 0 ? 1 : -1) * 0.08 * Math.sin(progress * Math.PI);
      const tone = colorFromCss(index === segments - 1 ? PHASE_STEP_PALETTE.arrival : PHASE_STEP_PALETTE.trail);
      const opacity = 0.7 - Math.abs(progress - 0.5) * 0.3;
      const material = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3, opacity,
        additive: true, unlit: true, depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `phase-step-authoritative-rift-${index}`, 'box', material,
        {
          x: origin.x + dx * progress + sideX * offset,
          y: origin.y + (position.y - origin.y) * progress + 0.72 + Math.sin(progress * Math.PI) * 0.24,
          z: origin.z + dz * progress + sideZ * offset,
        },
        { x: width, y: 0.05, z: Math.max(0.12, distance / segments * 0.68) },
      );
      setYaw(shard, Math.atan2(dirX, dirZ));
      this.effects.push(new FadingEntityEffect(shard, material, 0.3, opacity));
    }

    const makePortal = (point: Vec3Like, color: string, name: string, startScale: number): void => {
      const tone = colorFromCss(color);
      const material = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3.1, opacity: 0.82,
        additive: true, unlit: true, depthWrite: false,
      });
      const portal = this.world.createPrimitive(
        name, 'torus', material,
        { x: point.x, y: point.y + 0.09, z: point.z },
        { x: startScale, y: 0.035, z: startScale },
      );
      this.effects.push(new PulseEffect(portal, material, 0.42, startScale, 2.7, 1));
    };
    makePortal(origin, PHASE_STEP_PALETTE.origin, 'phase-step-authoritative-origin', 0.3);
    makePortal(position, PHASE_STEP_PALETTE.arrival, 'phase-step-authoritative-arrival', 0.36);

    const coreTone = colorFromCss(PHASE_STEP_PALETTE.core);
    const coreMaterial = createMaterial(coreTone, {
      emissive: coreTone, emissiveIntensity: 3.6, opacity: 0.74,
      additive: true, unlit: true, depthWrite: false,
    });
    const core = this.world.createPrimitive(
      'phase-step-authoritative-arrival-core', 'sphere', coreMaterial,
      { x: position.x, y: position.y + 0.92, z: position.z },
      { x: 0.13, y: 0.32, z: 0.13 },
    );
    this.effects.push(new PulseEffect(core, coreMaterial, 0.31, 0.18, 2.4, 1));
  }

  private showNatureSpiritSummon(origin: Vec3Like, position: Vec3Like): void {
    const tone = colorFromCss(NATURE_SPIRIT_PALETTE.halo);
    for (let index = 0; index < 3; index++) {
      const material = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3, opacity: 0.78,
        additive: true, unlit: true, depthWrite: false,
      });
      const ring = this.world.createPrimitive(
        `nature-spirit-authoritative-summon-ring-${index}`, 'torus', material,
        { x: position.x, y: position.y - 0.42 + index * 0.22, z: position.z },
        { x: 0.28 + index * 0.1, y: 0.025, z: 0.28 + index * 0.1 },
      );
      this.effects.push(new PulseEffect(ring, material, 0.48 + index * 0.04, 0.28 + index * 0.1, 2.5, 1));
    }
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.001) {
      const tetherMaterial = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3, opacity: 0.72,
        additive: true, unlit: true, depthWrite: false,
      });
      const tether = this.world.createPrimitive(
        'nature-spirit-authoritative-summon-tether', 'box', tetherMaterial,
        { x: (origin.x + position.x) * 0.5, y: (origin.y + position.y) * 0.5 + 0.5, z: (origin.z + position.z) * 0.5 },
        { x: 0.035, y: 0.035, z: distance },
      );
      setYaw(tether, Math.atan2(dx, dz));
      this.effects.push(new FadingEntityEffect(tether, tetherMaterial, 0.4, 0.72));
    }
  }

  private showNatureSpiritBolt(origin: Vec3Like, position: Vec3Like): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const sideX = dz / distance;
    const sideZ = -dx / distance;
    const segments = 5;
    for (let index = 0; index < segments; index++) {
      const from = index / segments;
      const to = (index + 1) / segments;
      const bendA = Math.sin(from * Math.PI) * 0.12;
      const bendB = Math.sin(to * Math.PI) * 0.12;
      const start = {
        x: origin.x + dx * from + sideX * bendA,
        y: origin.y + (position.y - origin.y) * from,
        z: origin.z + dz * from + sideZ * bendA,
      };
      const end = {
        x: origin.x + dx * to + sideX * bendB,
        y: origin.y + (position.y - origin.y) * to,
        z: origin.z + dz * to + sideZ * bendB,
      };
      const segX = end.x - start.x;
      const segZ = end.z - start.z;
      const length = Math.hypot(segX, segZ);
      const tone = colorFromCss(index % 2 === 0 ? NATURE_SPIRIT_PALETTE.bolt : NATURE_SPIRIT_PALETTE.soul);
      const material = createMaterial(tone, {
        emissive: tone, emissiveIntensity: 3.3, opacity: 0.86,
        additive: true, unlit: true, depthWrite: false,
      });
      const segment = this.world.createPrimitive(
        `nature-spirit-authoritative-bolt-${index}`, 'box', material,
        { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5, z: (start.z + end.z) * 0.5 },
        { x: 0.035, y: 0.035, z: length },
      );
      setYaw(segment, Math.atan2(segX, segZ));
      this.effects.push(new FadingEntityEffect(segment, material, 0.24, 0.86));
    }
  }

  /** Rastro congelado exclusivamente pelo evento origem→destino do servidor. */
  private showActiveEvasionTrail(origin: Vec3Like, position: Vec3Like, radius: number): void {
    const dx = position.x - origin.x;
    const dz = position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return;
    const dirX = dx / distance;
    const dirZ = dz / distance;
    const sideX = dirZ;
    const sideZ = -dirX;
    const yaw = Math.atan2(dirX, dirZ);
    const panels: ChargeTrailSegment[] = [];
    const count = 7;
    for (let index = 0; index < count; index++) {
      const progress = (index + 0.5) / count;
      const tone = colorFromCss(index % 2 === 0 ? ACTIVE_EVASION_PALETTE.trail : ACTIVE_EVASION_PALETTE.core);
      const opacity = 0.58 - progress * 0.3;
      const material = createMaterial(tone, {
        emissive: tone,
        emissiveIntensity: 2.2,
        opacity,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = { x: 0.18 + progress * 0.08, y: 0.035, z: Math.max(0.28, distance / count * 0.72) };
      const side = (index % 2 === 0 ? -1 : 1) * 0.09;
      const panel = this.world.createPrimitive(
        `active-evasion-authoritative-afterimage-${index}`,
        'box',
        material,
        {
          x: origin.x + dx * progress + sideX * side,
          y: origin.y + 0.12 + index * 0.006,
          z: origin.z + dz * progress + sideZ * side,
        },
        scale,
      );
      setYaw(panel, yaw);
      panels.push({ entity: panel, material, opacity, scale });
    }
    this.effects.push(new ChargeTrailEffect(panels, 0.34));

    const core = colorFromCss(ACTIVE_EVASION_PALETTE.core);
    const ringMaterial = createMaterial(core, {
      emissive: core,
      emissiveIntensity: 2.6,
      opacity: 0.76,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'active-evasion-authoritative-landing',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.08, z: position.z },
      { x: 0.24, y: 0.024, z: 0.24 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.36, 0.24, Math.max(1.1, radius * 0.55), 0.024));
  }

  private showActiveEvasionAvoid(position: Vec3Like, radius: number): void {
    const avoid = colorFromCss(ACTIVE_EVASION_PALETTE.avoid);
    const shadow = colorFromCss(ACTIVE_EVASION_PALETTE.shadow);
    const ringMaterial = createMaterial(avoid, {
      emissive: avoid,
      emissiveIntensity: 2.75,
      opacity: 0.78,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'active-evasion-authoritative-avoid-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.46, z: position.z },
      { x: 0.2, y: 0.028, z: 0.2 },
    );
    ring.setLocalEulerAngles(90, 0, 0);
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.42, 0.2, radius * 2, 0.028));
    for (let index = 0; index < 6; index++) {
      const angle = index / 6 * Math.PI * 2;
      const material = createMaterial(index % 2 === 0 ? avoid : shadow, {
        emissive: index % 2 === 0 ? avoid : shadow,
        emissiveIntensity: 2.2,
        opacity: 0.72,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `active-evasion-authoritative-avoid-shard-${index}`,
        'box',
        material,
        {
          x: position.x + Math.sin(angle) * 0.52,
          y: position.y + 0.42 + (index % 3) * 0.22,
          z: position.z + Math.cos(angle) * 0.52,
        },
        { x: 0.08, y: 0.36, z: 0.045 },
      );
      shard.setLocalEulerAngles(16, angle * 180 / Math.PI, index % 2 === 0 ? 28 : -28);
      this.effects.push(new FadingEntityEffect(shard, material, 0.46, 0.72));
    }
  }

  private showGuardianRetaliationPulse(
    position: Vec3Like,
    radius: number,
    phase: 'ready' | 'release',
  ): void {
    const primary = colorFromCss(phase === 'ready'
      ? GUARDIAN_RETALIATION_PALETTE.guard
      : GUARDIAN_RETALIATION_PALETTE.release);
    const accent = colorFromCss(phase === 'ready'
      ? GUARDIAN_RETALIATION_PALETTE.target
      : GUARDIAN_RETALIATION_PALETTE.core);
    const ringMaterial = createMaterial(primary, {
      emissive: primary,
      emissiveIntensity: phase === 'release' ? 2.75 : 2.25,
      opacity: 0.76,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      `guardian-retaliation-${phase}-authoritative-ring`,
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.09, z: position.z },
      { x: 0.34, y: 0.03, z: 0.34 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, phase === 'release' ? 0.48 : 0.68, 0.34, radius * 2, 0.03));
    const count = phase === 'release' ? 8 : 4;
    for (let index = 0; index < count; index++) {
      const angle = index / count * Math.PI * 2;
      const tone = index % 2 === 0 ? primary : accent;
      const material = createMaterial(tone, {
        emissive: tone,
        emissiveIntensity: 2.3,
        opacity: 0.78,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `guardian-retaliation-${phase}-authoritative-shard-${index}`,
        phase === 'release' ? 'box' : 'cone',
        material,
        {
          x: position.x + Math.sin(angle) * radius * 0.44,
          y: position.y + 0.38 + (index % 3) * 0.17,
          z: position.z + Math.cos(angle) * radius * 0.44,
        },
        phase === 'release' ? { x: 0.14, y: 0.34, z: 0.075 } : { x: 0.11, y: 0.4, z: 0.11 },
      );
      shard.setLocalEulerAngles(20, angle * 180 / Math.PI, index % 2 === 0 ? 34 : -34);
      this.effects.push(new FadingEntityEffect(shard, material, phase === 'release' ? 0.5 : 0.66, 0.8));
    }
  }

  private showIronGuard(
    position: Vec3Like,
    radius: number,
    defenderId: string,
    phase: 'cast' | 'block' | 'perfect',
  ): void {
    const perfect = phase === 'perfect';
    const cast = phase === 'cast';
    const visualRadius = Math.max(0.9, Math.min(2.2, radius || 1.25));
    const color = colorFromCss(perfect ? '#dff8ff' : cast ? '#78c8ea' : '#9adcf5');
    const ringMaterial = createMaterial(color, {
      emissive: color,
      emissiveIntensity: perfect ? 2.3 : cast ? 1.7 : 1.45,
      opacity: perfect ? 0.82 : cast ? 0.62 : 0.48,
      additive: true,
      unlit: true,
    });
    const ring = this.world.createPrimitive(
      `iron-guard-${phase}-ring`,
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.09, z: position.z },
      { x: 0.42, y: 0.026, z: 0.42 },
    );
    const duration = perfect ? 0.48 : cast ? 0.56 : 0.3;
    this.effects.push(new PulseEffect(
      ring,
      ringMaterial,
      duration,
      perfect ? 0.38 : 0.48,
      visualRadius * (perfect ? 2.25 : cast ? 2 : 1.45),
      perfect ? 0.034 : 0.026,
    ));

    // Placas verticais em volta do defensor formam uma silhueta de escudo sem
    // depender de asset novo. O perfeito usa mais placas, maiores e quase
    // brancas para ser distinguivel mesmo no meio de varios impactos.
    const panelCount = perfect ? 8 : cast ? 6 : 3;
    const panels: ChargeTrailSegment[] = [];
    for (let i = 0; i < panelCount; i++) {
      const angle = (i / panelCount) * Math.PI * 2 + (perfect ? Math.PI / 8 : 0);
      const panelColor = colorFromCss(perfect && i % 2 === 0 ? '#ffffff' : perfect ? '#a8e9ff' : '#69badd');
      const material = createMaterial(panelColor, {
        emissive: panelColor,
        emissiveIntensity: perfect ? 2.45 : 1.55,
        opacity: perfect ? 0.72 : cast ? 0.46 : 0.36,
        additive: true,
        unlit: true,
      });
      const orbit = visualRadius * (perfect ? 0.68 : cast ? 0.62 : 0.48);
      const scale = {
        x: perfect ? 0.34 : cast ? 0.29 : 0.2,
        y: perfect ? 0.72 : cast ? 0.61 : 0.42,
        z: perfect ? 0.055 : 0.045,
      };
      const entity = this.world.createPrimitive(
        `iron-guard-${phase}-shield`,
        'box',
        material,
        {
          x: position.x + Math.sin(angle) * orbit,
          y: position.y + (perfect ? 0.98 : cast ? 0.86 : 0.72),
          z: position.z + Math.cos(angle) * orbit,
        },
        scale,
      );
      setYaw(entity, angle);
      panels.push({ entity, material, opacity: perfect ? 0.72 : cast ? 0.46 : 0.36, scale });
    }
    this.effects.push(new ChargeTrailEffect(panels, duration));

    // O id do caster representa o proprio defensor nos eventos de bloqueio.
    // Nunca deixa a defesa de outro jogador sacudir a camera local.
    if (defenderId === this.net.playerId) {
      this.world.rig.addShake(perfect ? 0.2 : phase === 'block' ? 0.08 : 0.04);
    }
  }

  private showAshVeilTether(
    casterPosition: Vec3Like,
    targetPosition: Vec3Like,
    duration: number,
    opacity: number,
  ): void {
    const dx = targetPosition.x - casterPosition.x;
    const dz = targetPosition.z - casterPosition.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.1) return;
    const tetherColor = colorFromCss(ASH_CORRUPTOR_PALETTE.tether);
    const material = createMaterial(tetherColor, {
      emissive: tetherColor,
      emissiveIntensity: 1.75,
      opacity,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const tether = this.world.createPrimitive(
      'ash-veil-authoritative-target-tether',
      'box',
      material,
      {
        x: casterPosition.x + dx * 0.5,
        y: Math.max(casterPosition.y, targetPosition.y) + 0.72,
        z: casterPosition.z + dz * 0.5,
      },
      { x: 0.045, y: 0.018, z: length },
    );
    setYaw(tether, Math.atan2(dx, dz));
    this.effects.push(new FadingEntityEffect(tether, material, duration, opacity));
  }

  private showAshVeilWarning(
    casterPosition: Vec3Like,
    targetPosition: Vec3Like,
    radius: number,
    delay: number,
  ): void {
    const duration = Math.max(0.2, Math.min(3, delay));
    // Radius apenas calibra a leitura da runa; os alvos ja vieram congelados no
    // evento e nunca sao descobertos por distancia no cliente.
    const runeRadius = Math.max(0.95, Math.min(1.35, radius * 0.12));
    const veilColor = colorFromCss(ASH_CORRUPTOR_PALETTE.veil);
    const circleMaterial = createMaterial(veilColor, {
      emissive: veilColor,
      emissiveIntensity: 1.65,
      opacity: 0.54,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const circle = this.world.createPrimitive(
      'ash-veil-warning-target-rune',
      'torus',
      circleMaterial,
      { x: targetPosition.x, y: targetPosition.y + 0.06, z: targetPosition.z },
      { x: runeRadius, y: 0.026, z: runeRadius },
    );
    this.effects.push(new PulseEffect(
      circle,
      circleMaterial,
      duration,
      runeRadius * 0.86,
      runeRadius * 1.08,
      0.026,
    ));

    const amberColor = colorFromCss(ASH_CORRUPTOR_PALETTE.amber);
    const runeMaterial = createMaterial(amberColor, {
      emissive: amberColor,
      emissiveIntensity: 2,
      opacity: 0.54,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const rune = makeEntity('ash-veil-warning-sigil', this.world.app);
    this.world.root.addChild(rune);
    setEntityPosition(rune, { x: targetPosition.x, y: targetPosition.y + 0.075, z: targetPosition.z });
    const barA = this.world.createPrimitive(
      'ash-veil-warning-sigil-bar-a',
      'box',
      runeMaterial,
      { x: 0, y: 0, z: 0 },
      { x: 0.055, y: 0.014, z: runeRadius * 1.3 },
      rune,
    );
    const barB = this.world.createPrimitive(
      'ash-veil-warning-sigil-bar-b',
      'box',
      runeMaterial,
      { x: 0, y: 0, z: 0 },
      { x: 0.055, y: 0.014, z: runeRadius * 1.3 },
      rune,
    );
    barA.setLocalEulerAngles(0, 45, 0);
    barB.setLocalEulerAngles(0, -45, 0);
    this.effects.push(new FadingEntityEffect(rune, runeMaterial, duration, 0.54));
    this.showAshVeilTether(casterPosition, targetPosition, duration, 0.48);
  }

  private showAshVeilApply(
    casterPosition: Vec3Like,
    targetPosition: Vec3Like,
    duration: number,
  ): void {
    const flashDuration = Math.max(0.36, Math.min(0.68, duration * 0.16));
    const veilColor = colorFromCss(ASH_CORRUPTOR_PALETTE.veilCore);
    const pulseMaterial = createMaterial(veilColor, {
      emissive: veilColor,
      emissiveIntensity: 2.2,
      opacity: 0.68,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const pulse = this.world.createPrimitive(
      'ash-veil-apply-target-pulse',
      'sphere',
      pulseMaterial,
      { x: targetPosition.x, y: targetPosition.y + 0.72, z: targetPosition.z },
      { x: 0.22, y: 0.34, z: 0.22 },
    );
    this.effects.push(new PulseEffect(pulse, pulseMaterial, flashDuration, 0.2, 1.4, 1));

    const amberColor = colorFromCss(ASH_CORRUPTOR_PALETTE.amber);
    const ringMaterial = createMaterial(amberColor, {
      emissive: amberColor,
      emissiveIntensity: 1.9,
      opacity: 0.58,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'ash-veil-apply-target-ring',
      'torus',
      ringMaterial,
      { x: targetPosition.x, y: targetPosition.y + 0.07, z: targetPosition.z },
      { x: 0.5, y: 0.025, z: 0.5 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, flashDuration, 0.5, 1.55, 0.025));
    this.showAshVeilTether(casterPosition, targetPosition, flashDuration, 0.62);
    this.showCombatText('VÉU DE CINZAS', targetPosition, 'critical');
  }

  private showAshVeilInterrupted(casterPosition: Vec3Like, interrupterId: string): void {
    const amberColor = colorFromCss(ASH_CORRUPTOR_PALETTE.amberCore);
    const collapseMaterial = createMaterial(amberColor, {
      emissive: amberColor,
      emissiveIntensity: 2.5,
      opacity: 0.76,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const collapse = this.world.createPrimitive(
      'ash-veil-interrupted-collapse',
      'torus',
      collapseMaterial,
      { x: casterPosition.x, y: casterPosition.y + 0.12, z: casterPosition.z },
      { x: 1.8, y: 0.035, z: 1.8 },
    );
    this.effects.push(new PulseEffect(collapse, collapseMaterial, 0.48, 1.8, 0.24, 0.035));

    const shards: ChargeTrailSegment[] = [];
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      const shardColor = colorFromCss(index % 2 === 0
        ? ASH_CORRUPTOR_PALETTE.amber
        : ASH_CORRUPTOR_PALETTE.ash);
      const material = createMaterial(shardColor, {
        emissive: shardColor,
        emissiveIntensity: 2.1,
        opacity: 0.72,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = { x: 0.12, y: 0.42, z: 0.12 };
      const shard = this.world.createPrimitive(
        `ash-veil-interrupted-shard-${index}`,
        'cone',
        material,
        {
          x: casterPosition.x + Math.sin(angle) * 0.82,
          y: casterPosition.y + 0.68 + (index % 2) * 0.28,
          z: casterPosition.z + Math.cos(angle) * 0.82,
        },
        scale,
      );
      shard.setLocalEulerAngles(index % 2 === 0 ? 58 : -58, angle * 180 / Math.PI, 18);
      shards.push({ entity: shard, material, opacity: 0.72, scale });
    }
    this.effects.push(new ChargeTrailEffect(shards, 0.56));
    this.showCombatText('VÉU INTERROMPIDO', casterPosition, 'critical');
    if (interrupterId === this.net.playerId) this.world.rig.addShake(0.16);
  }

  private showEnemyProjectileWarning(
    position: Vec3Like,
    radius: number,
    delay: number,
    casterId: string,
    casterSnapshotPosition?: Vec3Like,
  ): void {
    const warningRadius = Math.max(0.45, Math.min(3.2, radius || 0.8));
    const duration = Math.max(0.2, delay || 0.7);
    const warningColor = colorFromCss(SHARDCASTER_PALETTE.warning);
    const circleMaterial = createMaterial(warningColor, {
      emissive: warningColor,
      emissiveIntensity: 1.65,
      opacity: 0.52,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const circle = this.world.createPrimitive(
      'enemy-projectile-warning-circle',
      'torus',
      circleMaterial,
      { x: position.x, y: position.y + 0.055, z: position.z },
      { x: warningRadius * 1.8, y: 0.025, z: warningRadius * 1.8 },
    );
    this.effects.push(new PulseEffect(
      circle,
      circleMaterial,
      duration,
      warningRadius * 1.8,
      warningRadius * 2.08,
      0.025,
    ));

    // syncCombatEvents roda antes do reconcile para preservar a ordem dos VFX de
    // Investida. No primeiro snapshot do caster, usa a posicao autoritativa que
    // veio no mesmo payload; a view anterior e apenas a opcao mais suave.
    const casterView = this.views.get(casterId);
    const fallbackAngle = this.projectilePhase(casterId || 'shardcaster-warning');
    const fallbackLength = Math.max(2.8, warningRadius * 3.6);
    const casterPosition = casterView?.entity.parent
      ? entityPosition(casterView.entity)
      : casterSnapshotPosition ?? {
          x: position.x - Math.sin(fallbackAngle) * fallbackLength,
          y: position.y,
          z: position.z - Math.cos(fallbackAngle) * fallbackLength,
        };
    let dx = position.x - casterPosition.x;
    let dz = position.z - casterPosition.z;
    let lineLength = Math.hypot(dx, dz);
    if (lineLength < 0.1) {
      dx = Math.sin(fallbackAngle) * fallbackLength;
      dz = Math.cos(fallbackAngle) * fallbackLength;
      lineLength = fallbackLength;
    }
    const angle = Math.atan2(dx, dz);
    const lineMaterial = createMaterial(warningColor, {
      emissive: warningColor,
      emissiveIntensity: 1.25,
      opacity: 0.34,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const lineScale = { x: 0.055, y: 0.012, z: lineLength };
    const line = this.world.createPrimitive(
      'enemy-projectile-warning-line',
      'box',
      lineMaterial,
      {
        x: position.x - dx * 0.5,
        y: position.y + 0.04,
        z: position.z - dz * 0.5,
      },
      lineScale,
    );
    setYaw(line, angle);
    this.effects.push(new FadingEntityEffect(line, lineMaterial, duration, 0.34));
  }

  private showEnemyProjectileImpact(position: Vec3Like, radius: number, targetId?: string): void {
    const impactRadius = Math.max(0.5, Math.min(3.4, radius || 0.85));
    const impactColor = colorFromCss(SHARDCASTER_PALETTE.impact);
    const burstMaterial = createMaterial(impactColor, {
      emissive: impactColor,
      emissiveIntensity: 2.1,
      opacity: 0.66,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const burst = this.world.createPrimitive(
      'enemy-projectile-impact-burst',
      'sphere',
      burstMaterial,
      { x: position.x, y: position.y + 0.22, z: position.z },
      { x: 0.35, y: 0.08, z: 0.35 },
    );
    this.effects.push(new PulseEffect(
      burst,
      burstMaterial,
      0.42,
      0.35,
      impactRadius * 2.25,
      0.08,
    ));

    const ringColor = colorFromCss(SHARDCASTER_PALETTE.crystalCore);
    const ringMaterial = createMaterial(ringColor, {
      emissive: ringColor,
      emissiveIntensity: 1.85,
      opacity: 0.52,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const ring = this.world.createPrimitive(
      'enemy-projectile-impact-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: position.y + 0.065, z: position.z },
      { x: 0.42, y: 0.022, z: 0.42 },
    );
    this.effects.push(new PulseEffect(
      ring,
      ringMaterial,
      0.5,
      0.42,
      impactRadius * 2.55,
      0.022,
    ));
    // Somente feedback de camera; HP/dano continuam 100% autoritativos.
    if (targetId === this.net.playerId) this.world.rig.addShake(0.22);
  }

  private showRuinCleaveWarning(
    position: Vec3Like,
    rotationY: number,
    radius: number,
    arcDegrees: number,
    delay: number,
  ): void {
    const warningColor = colorFromCss(RUIN_BRUTE_PALETTE.warning);
    const material = createMaterial(warningColor, {
      emissive: warningColor,
      emissiveIntensity: 1.65,
      opacity: 0.5,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const sector = makeEntity('ruin-cleave-warning-authoritative-sector', this.world.app);
    this.world.root.addChild(sector);
    setEntityPosition(sector, position);
    // rotationY e a origem pertencem ao evento congelado; a view atual do
    // Bruto jamais reconstrui o setor depois que o windup comecou.
    setYaw(sector, rotationY);
    const halfArcRadians = arcDegrees * Math.PI / 360;
    const rayCount = 7;
    for (let index = 0; index < rayCount; index++) {
      const ratio = rayCount > 1 ? index / (rayCount - 1) : 0.5;
      const offset = -halfArcRadians + ratio * halfArcRadians * 2;
      const length = radius * (index === 0 || index === rayCount - 1 ? 0.98 : 0.88);
      const ray = this.world.createPrimitive(
        `ruin-cleave-warning-sector-ray-${index}`,
        'box',
        material,
        {
          x: Math.sin(offset) * length * 0.5,
          y: 0.065 + (index % 2) * 0.006,
          z: Math.cos(offset) * length * 0.5,
        },
        {
          x: index === 0 || index === rayCount - 1 ? 0.075 : 0.035,
          y: 0.018,
          z: length,
        },
        sector,
      );
      ray.setLocalEulerAngles(0, offset * 180 / Math.PI, 0);
    }
    // Trava curta atras da origem: deixa a retaguarda segura visualmente
    // separada sem sugerir o circulo completo dos slams.
    this.world.createPrimitive(
      'ruin-cleave-warning-rear-stop',
      'box',
      material,
      { x: 0, y: 0.07, z: -0.16 },
      { x: 1.15, y: 0.022, z: 0.09 },
      sector,
    );
    this.effects.push(new FadingEntityEffect(sector, material, delay, 0.5));
  }

  private showRuinCleaveImpact(
    position: Vec3Like,
    rotationY: number,
    radius: number,
    arcDegrees: number,
  ): void {
    const halfArcRadians = arcDegrees * Math.PI / 360;
    const waves: ChargeTrailSegment[] = [];
    const waveCount = 9;
    for (let index = 0; index < waveCount; index++) {
      const ratio = waveCount > 1 ? index / (waveCount - 1) : 0.5;
      const offset = -halfArcRadians + ratio * halfArcRadians * 2;
      const yaw = rotationY + offset;
      const dirX = Math.sin(yaw);
      const dirZ = Math.cos(yaw);
      const length = radius * (index === 0 || index === waveCount - 1 ? 0.96 : 0.82);
      const color = colorFromCss(index % 2 === 0
        ? RUIN_BRUTE_PALETTE.rustCore
        : RUIN_BRUTE_PALETTE.dust);
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 1.35,
        opacity: 0.68,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = {
        x: index === 0 || index === waveCount - 1 ? 0.16 : 0.11,
        y: 0.045,
        z: length,
      };
      const wave = this.world.createPrimitive(
        `ruin-cleave-impact-sector-wave-${index}`,
        'box',
        material,
        {
          x: position.x + dirX * length * 0.5,
          y: position.y + 0.09 + (index % 3) * 0.014,
          z: position.z + dirZ * length * 0.5,
        },
        scale,
      );
      setYaw(wave, yaw);
      waves.push({ entity: wave, material, opacity: 0.68, scale });
    }
    this.effects.push(new ChargeTrailEffect(waves, 0.56));

    for (let index = 0; index < 5; index++) {
      const ratio = index / 4;
      const yaw = rotationY - halfArcRadians + ratio * halfArcRadians * 2;
      const dustColor = colorFromCss(RUIN_BRUTE_PALETTE.dust);
      const material = createMaterial(dustColor, {
        emissive: dustColor,
        emissiveIntensity: 0.85,
        opacity: 0.52,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const distance = radius * (0.48 + ratio * 0.4);
      const dust = this.world.createPrimitive(
        `ruin-cleave-impact-sector-dust-${index}`,
        'sphere',
        material,
        {
          x: position.x + Math.sin(yaw) * distance,
          y: position.y + 0.18 + (index % 2) * 0.12,
          z: position.z + Math.cos(yaw) * distance,
        },
        { x: 0.2, y: 0.09, z: 0.2 },
      );
      this.effects.push(new PulseEffect(dust, material, 0.46, 0.2, 1.15, 0.09));
    }
  }

  private showRuinBruteExposed(position: Vec3Like, guarderId: string): void {
    const shards: ChargeTrailSegment[] = [];
    for (let index = 0; index < 8; index++) {
      const angle = index * Math.PI / 4;
      const color = colorFromCss(index % 2 === 0
        ? RUIN_BRUTE_PALETTE.ironCore
        : RUIN_BRUTE_PALETTE.rustCore);
      const material = createMaterial(color, {
        emissive: color,
        emissiveIntensity: 2.15,
        opacity: 0.76,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const scale = { x: 0.18, y: 0.44, z: 0.08 };
      const shard = this.world.createPrimitive(
        `ruin-exposed-event-armor-shard-${index}`,
        'box',
        material,
        {
          x: position.x + Math.sin(angle) * 0.92,
          y: position.y + 0.78 + (index % 3) * 0.23,
          z: position.z + Math.cos(angle) * 0.92,
        },
        scale,
      );
      shard.setLocalEulerAngles(index % 2 === 0 ? 42 : -42, angle * 180 / Math.PI, index * 17);
      shards.push({ entity: shard, material, opacity: 0.76, scale });
    }
    this.effects.push(new ChargeTrailEffect(shards, 0.62));
    this.showCombatText('EXPOSTO', position, 'critical');
    if (guarderId === this.net.playerId) this.world.rig.addShake(0.18);
  }

  private showBossSealRupture(position: Vec3Like, radius: number, duration: number): void {
    const ruptureColor = colorFromCss(BOSS_SEAL_PALETTE.rupture);
    const material = createMaterial(ruptureColor, {
      emissive: ruptureColor,
      emissiveIntensity: 2.2,
      opacity: 0.72,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('boss-seal-rupture-authoritative-transition', this.world.app);
    this.world.root.addChild(root);
    setEntityPosition(root, position);
    for (let index = 0; index < 3; index++) {
      const ringRadius = radius * (0.34 + index * 0.33);
      const ring = this.world.createPrimitive(
        `boss-seal-rupture-transition-ring-${index}`,
        'torus',
        material,
        { x: 0, y: 0.08 + index * 0.025, z: 0 },
        { x: ringRadius * 2, y: 0.035, z: ringRadius * 2 },
        root,
      );
      ring.setLocalEulerAngles(0, index * 17, 0);
    }
    for (let index = 0; index < 12; index++) {
      const angle = index / 12 * Math.PI * 2;
      const distance = radius * (0.58 + (index % 2) * 0.18);
      const shard = this.world.createPrimitive(
        `boss-seal-rupture-transition-shard-${index}`,
        'cone',
        material,
        {
          x: Math.sin(angle) * distance,
          y: 0.72 + (index % 3) * 0.34,
          z: Math.cos(angle) * distance,
        },
        { x: 0.15, y: 0.72, z: 0.15 },
        root,
      );
      shard.setLocalEulerAngles(index % 2 === 0 ? 62 : -62, angle * 180 / Math.PI, index * 11);
    }
    this.effects.push(new FadingEntityEffect(root, material, duration, 0.72));
    this.showCombatText('RUPTURA DO SELO', position, 'critical');
    this.world.rig.addShake(0.38);
  }

  private showBossSealPulseWarning(
    position: Vec3Like,
    innerRadius: number,
    radius: number,
    delay: number,
  ): void {
    const dangerColor = colorFromCss(BOSS_SEAL_PALETTE.danger);
    const dangerMaterial = createMaterial(dangerColor, {
      emissive: dangerColor,
      emissiveIntensity: 1.75,
      opacity: 0.48,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const dangerRoot = makeEntity('boss-seal-pulse-warning-authoritative-annulus', this.world.app);
    this.world.root.addChild(dangerRoot);
    setEntityPosition(dangerRoot, position);
    const bandWidth = radius - innerRadius;
    const bandRingCount = 8;
    for (let index = 0; index < bandRingCount; index++) {
      const ratio = (index + 1) / (bandRingCount + 1);
      const ringRadius = innerRadius + bandWidth * ratio;
      this.world.createPrimitive(
        `boss-seal-pulse-warning-danger-band-${index}`,
        'torus',
        dangerMaterial,
        { x: 0, y: 0.06 + (index % 2) * 0.008, z: 0 },
        { x: ringRadius * 2, y: 0.026, z: ringRadius * 2 },
        dangerRoot,
      );
    }
    this.world.createPrimitive(
      'boss-seal-pulse-warning-outer-boundary',
      'torus',
      dangerMaterial,
      { x: 0, y: 0.085, z: 0 },
      { x: radius * 2, y: 0.055, z: radius * 2 },
      dangerRoot,
    );
    this.effects.push(new FadingEntityEffect(dangerRoot, dangerMaterial, delay, 0.48));

    const safeColor = colorFromCss(BOSS_SEAL_PALETTE.safe);
    const safeMaterial = createMaterial(safeColor, {
      emissive: safeColor,
      emissiveIntensity: 2.05,
      opacity: 0.7,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const safeRoot = makeEntity('boss-seal-pulse-warning-safe-core', this.world.app);
    this.world.root.addChild(safeRoot);
    setEntityPosition(safeRoot, position);
    this.world.createPrimitive(
      'boss-seal-pulse-warning-inner-boundary',
      'torus',
      safeMaterial,
      { x: 0, y: 0.1, z: 0 },
      { x: innerRadius * 2, y: 0.055, z: innerRadius * 2 },
      safeRoot,
    );
    // Escudo geometrico no nucleo: leitura sem texto 3D e sem disco preenchido.
    const safeSymbol = makeEntity('boss-seal-pulse-safe-core-shield-symbol', this.world.app);
    safeRoot.addChild(safeSymbol);
    for (let index = 0; index < 4; index++) {
      const bar = this.world.createPrimitive(
        `boss-seal-pulse-safe-core-shield-edge-${index}`,
        'box',
        safeMaterial,
        {
          x: index < 2 ? (index === 0 ? -0.38 : 0.38) : 0,
          y: 0.11,
          z: index >= 2 ? (index === 2 ? -0.38 : 0.38) : 0,
        },
        { x: 0.78, y: 0.025, z: 0.085 },
        safeSymbol,
      );
      bar.setLocalEulerAngles(0, index * 90 + 45, 0);
    }
    this.effects.push(new FadingEntityEffect(safeRoot, safeMaterial, delay, 0.7));
    this.showCombatText('NÚCLEO SEGURO', position, 'magic');
  }

  private showBossSealPulseImpact(
    position: Vec3Like,
    innerRadius: number,
    radius: number,
  ): void {
    const impactColor = colorFromCss(BOSS_SEAL_PALETTE.ruptureCore);
    const material = createMaterial(impactColor, {
      emissive: impactColor,
      emissiveIntensity: 2.35,
      opacity: 0.76,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const root = makeEntity('boss-seal-pulse-impact-authoritative-annulus', this.world.app);
    this.world.root.addChild(root);
    setEntityPosition(root, position);
    const bandWidth = radius - innerRadius;
    for (let index = 0; index < 5; index++) {
      const ratio = index / 4;
      const ringRadius = innerRadius + bandWidth * ratio;
      this.world.createPrimitive(
        `boss-seal-pulse-impact-annular-wave-${index}`,
        'torus',
        material,
        { x: 0, y: 0.09 + index * 0.015, z: 0 },
        { x: ringRadius * 2, y: index === 0 || index === 4 ? 0.06 : 0.035, z: ringRadius * 2 },
        root,
      );
    }
    for (let index = 0; index < 18; index++) {
      const angle = index / 18 * Math.PI * 2;
      const distance = innerRadius + bandWidth * (index % 2 === 0 ? 0.28 : 0.74);
      const shard = this.world.createPrimitive(
        `boss-seal-pulse-impact-annular-shard-${index}`,
        'box',
        material,
        {
          x: Math.sin(angle) * distance,
          y: 0.28 + (index % 3) * 0.16,
          z: Math.cos(angle) * distance,
        },
        { x: 0.12, y: 0.38, z: 0.065 },
        root,
      );
      shard.setLocalEulerAngles(index % 2 === 0 ? 52 : -52, angle * 180 / Math.PI, index * 9);
    }
    this.effects.push(new FadingEntityEffect(root, material, 0.62, 0.76));
  }

  private showBossSlamWarning(position: Vec3Like, radius: number, delay: number): void {
    const color = colorFromCss('#ff5b4f');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.2, opacity: 0.38, additive: true, unlit: true });
    const entity = this.world.createPrimitive('boss-slam-warning', 'torus', material, { x: position.x, y: position.y + 0.06, z: position.z }, { x: radius * 2, y: 0.035, z: radius * 2 });
    this.effects.push(new PulseEffect(entity, material, Math.max(0.2, delay), radius * 1.8, radius * 2.08, 0.035));
  }

  private showSealChamberPulse(
    position: Vec3Like,
    radius: number,
    tone: 'arming' | 'wave' | 'complete' | 'reset',
    duration: number,
  ): void {
    const colorCss = tone === 'wave'
      ? '#ff657c'
      : tone === 'complete'
        ? '#ffe08a'
        : tone === 'reset'
          ? '#9ca9b5'
          : '#dc65f2';
    const color = colorFromCss(colorCss);
    const material = createMaterial(color, {
      emissive: color,
      emissiveIntensity: tone === 'complete' ? 1.85 : 1.5,
      opacity: tone === 'reset' ? 0.3 : 0.48,
      additive: true,
      unlit: true,
    });
    const floorY = this.world.groundHeightAt(position.x, position.z);
    const ring = this.world.createPrimitive(
      `seal-chamber-${tone}-event-ring`,
      'torus',
      material,
      { x: position.x, y: floorY + 0.1, z: position.z },
      { x: 0.4, y: 0.035, z: 0.4 },
    );
    this.effects.push(new PulseEffect(
      ring,
      material,
      Math.max(0.2, duration),
      tone === 'reset' ? radius * 2 : 0.5,
      tone === 'reset' ? 0.4 : radius * 2,
      0.035,
    ));
  }

  private showBossSlamImpact(position: Vec3Like, radius: number): void {
    const color = colorFromCss('#ff8a52');
    const material = createMaterial(color, { emissive: color, emissiveIntensity: 1.5, opacity: 0.5, additive: true, unlit: true });
    const entity = this.world.createPrimitive('boss-slam-impact', 'sphere', material, { x: position.x, y: position.y + 0.3, z: position.z }, { x: 1, y: 0.1, z: 1 });
    this.effects.push(new PulseEffect(entity, material, 0.46, 0.8, radius * 2, 0.08));
    this.world.rig.addShake(0.72);
    this.showHitImpact(position, 'physical');
  }

  /** Explosão histórica do evento; não descobre alvos nem altera colisão. */
  private showRunicElitePulse(position: Vec3Like, radius: number, phase: 'fury' | 'defeated'): void {
    const primaryCss = phase === 'fury' ? RUNIC_ELITE_PALETTE.fury : RUNIC_ELITE_PALETTE.minimap;
    const coreCss = phase === 'fury' ? RUNIC_ELITE_PALETTE.furyCore : RUNIC_ELITE_PALETTE.aegisCore;
    const primary = colorFromCss(primaryCss);
    const core = colorFromCss(coreCss);
    const ringMaterial = createMaterial(primary, {
      emissive: primary,
      emissiveIntensity: 2.2,
      opacity: 0.72,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const floorY = this.world.groundHeightAt(position.x, position.z);
    const ring = this.world.createPrimitive(
      `runic-elite-${phase}-event-ring`,
      'torus',
      ringMaterial,
      { x: position.x, y: floorY + 0.09, z: position.z },
      { x: 0.45, y: 0.035, z: 0.45 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, phase === 'fury' ? 0.68 : 0.92, 0.45, radius * 2, 0.035));

    for (let index = 0; index < 6; index++) {
      const angle = index / 6 * Math.PI * 2;
      const shardMaterial = createMaterial(index % 2 === 0 ? primary : core, {
        emissive: index % 2 === 0 ? primary : core,
        emissiveIntensity: 2.35,
        opacity: 0.78,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `runic-elite-${phase}-event-shard-${index}`,
        phase === 'fury' ? 'cone' : 'box',
        shardMaterial,
        {
          x: position.x + Math.sin(angle) * radius * 0.44,
          y: floorY + 0.42 + (index % 2) * 0.24,
          z: position.z + Math.cos(angle) * radius * 0.44,
        },
        phase === 'fury' ? { x: 0.15, y: 0.55, z: 0.15 } : { x: 0.12, y: 0.42, z: 0.055 },
      );
      shard.setLocalEulerAngles(0, angle * 180 / Math.PI, phase === 'fury' ? 18 : 36);
      this.effects.push(new FadingEntityEffect(shard, shardMaterial, phase === 'fury' ? 0.55 : 0.78, 0.78));
    }
  }

  private showMiningPerfectStrike(position: Vec3Like, radius: number, kind: OreNodeState['kind']): void {
    const oreCss = kind === 'copper'
      ? ADVANCED_MINING_PALETTE.copper
      : kind === 'iron'
        ? ADVANCED_MINING_PALETTE.iron
        : ADVANCED_MINING_PALETTE.mithril;
    const ore = colorFromCss(oreCss);
    const perfect = colorFromCss(ADVANCED_MINING_PALETTE.perfect);
    const ringMaterial = createMaterial(perfect, {
      emissive: perfect,
      emissiveIntensity: 2.55,
      opacity: 0.82,
      additive: true,
      unlit: true,
      depthWrite: false,
    });
    const floorY = this.world.groundHeightAt(position.x, position.z);
    const ring = this.world.createPrimitive(
      'mining-perfect-authoritative-ring',
      'torus',
      ringMaterial,
      { x: position.x, y: floorY + 0.1, z: position.z },
      { x: 0.32, y: 0.035, z: 0.32 },
    );
    this.effects.push(new PulseEffect(ring, ringMaterial, 0.62, 0.32, radius * 2, 0.035));
    for (let index = 0; index < 8; index++) {
      const angle = index / 8 * Math.PI * 2;
      const material = createMaterial(index % 2 === 0 ? perfect : ore, {
        emissive: index % 2 === 0 ? perfect : ore,
        emissiveIntensity: 2.25,
        opacity: 0.8,
        additive: true,
        unlit: true,
        depthWrite: false,
      });
      const shard = this.world.createPrimitive(
        `mining-perfect-authoritative-shard-${index}`,
        kind === 'mithril' ? 'cone' : 'box',
        material,
        {
          x: position.x + Math.sin(angle) * radius * 0.48,
          y: floorY + 0.32 + (index % 3) * 0.16,
          z: position.z + Math.cos(angle) * radius * 0.48,
        },
        kind === 'mithril' ? { x: 0.11, y: 0.42, z: 0.11 } : { x: 0.13, y: 0.28, z: 0.07 },
      );
      shard.setLocalEulerAngles(22, angle * 180 / Math.PI, index % 2 === 0 ? 32 : -32);
      this.effects.push(new FadingEntityEffect(shard, material, 0.52, 0.8));
    }
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

  private syncSealChamberPresentation(value: unknown, zone: WorldZone): void {
    const state = sealChamberStatePresentationGate(value, zone);
    if (!state) {
      this.clearSealChamberPresentation();
      return;
    }
    if (!this.sealChamberVisual) this.sealChamberVisual = this.createSealChamberPresentation(state);
    const visual = this.sealChamberVisual;
    visual.state = state;
    const floorY = this.world.groundHeightAt(state.center.x, state.center.z);
    visual.root.setLocalPosition(state.center.x, floorY, state.center.z);
    visual.barrierRoot.enabled = state.barrierActive;
  }

  /** Visual puro: nenhum collider, rigidbody, comando ou predicao da barreira. */
  private createSealChamberPresentation(state: EncounterState): SealChamberVisual {
    const root = makeEntity('seal-chamber-authoritative-presentation', this.world.app);
    const markerColor = colorFromCss('#d68dec');
    const coreColor = colorFromCss('#f2d4ff');
    const barrierColor = colorFromCss('#dc65f2');
    const markerMaterial = createMaterial(markerColor, {
      emissive: markerColor,
      emissiveIntensity: 1.35,
      opacity: 0.44,
      additive: true,
      unlit: true,
    });
    const coreMaterial = createMaterial(coreColor, {
      emissive: coreColor,
      emissiveIntensity: 1.5,
      opacity: 0.5,
      additive: true,
      unlit: true,
    });
    const barrierMaterial = createMaterial(barrierColor, {
      emissive: barrierColor,
      emissiveIntensity: 1.65,
      opacity: 0.34,
      additive: true,
      unlit: true,
      twoSided: true,
    });

    const marker = this.world.createPrimitive(
      'seal-chamber-dormant-marker',
      'torus',
      markerMaterial,
      { x: 0, y: 0.08, z: 0 },
      { x: 1.65, y: 0.04, z: 1.65 },
      root,
    );
    const sigil = makeEntity('seal-chamber-sigil', this.world.app);
    root.addChild(sigil);
    this.world.createPrimitive(
      'seal-chamber-sigil-axis-a',
      'box',
      coreMaterial,
      { x: 0, y: 0.07, z: 0 },
      { x: 1.55, y: 0.025, z: 0.11 },
      sigil,
    );
    const axisB = this.world.createPrimitive(
      'seal-chamber-sigil-axis-b',
      'box',
      coreMaterial,
      { x: 0, y: 0.07, z: 0 },
      { x: 1.55, y: 0.025, z: 0.11 },
      sigil,
    );
    axisB.setLocalEulerAngles(0, 90, 0);
    this.world.createPrimitive(
      'seal-chamber-sigil-core',
      'cylinder',
      coreMaterial,
      { x: 0, y: 0.06, z: 0 },
      { x: 0.42, y: 0.035, z: 0.42 },
      sigil,
    );

    const barrierRoot = makeEntity('seal-chamber-presentation-only-barrier', this.world.app);
    root.addChild(barrierRoot);
    this.world.createPrimitive(
      'seal-chamber-barrier-ring',
      'torus',
      barrierMaterial,
      { x: 0, y: 0.1, z: 0 },
      { x: state.barrierRadius * 2, y: 0.035, z: state.barrierRadius * 2 },
      barrierRoot,
    );
    const segmentCount = 28;
    for (let index = 0; index < segmentCount; index++) {
      const angle = index / segmentCount * Math.PI * 2;
      const segment = this.world.createPrimitive(
        `seal-chamber-barrier-segment-${index}`,
        'box',
        barrierMaterial,
        {
          x: Math.cos(angle) * state.barrierRadius,
          y: 1.18,
          z: Math.sin(angle) * state.barrierRadius,
        },
        { x: 1.72, y: 2.25, z: 0.055 },
        barrierRoot,
      );
      segment.setLocalEulerAngles(0, -angle * 180 / Math.PI, 0);
    }
    this.world.dungeon.addChild(root);
    barrierRoot.enabled = state.barrierActive;
    return {
      root,
      marker,
      sigil,
      barrierRoot,
      markerMaterial,
      coreMaterial,
      barrierMaterial,
      state,
      age: 0,
    };
  }

  private updateSealChamberPresentation(dt: number): void {
    const visual = this.sealChamberVisual;
    if (!visual) return;
    visual.age += dt;
    const active = visual.state.phase === 'arming'
      || visual.state.phase === 'wave'
      || visual.state.phase === 'intermission';
    const pulse = (Math.sin(visual.age * (active ? 5.6 : 2.2)) + 1) * 0.5;
    const markerScale = 1.58 + pulse * (active ? 0.22 : 0.08);
    visual.marker.setLocalScale(markerScale, 0.04, markerScale);
    visual.sigil.setLocalEulerAngles(0, (visual.age * (active ? 28 : 10)) % 360, 0);
    visual.markerMaterial.opacity = (active ? 0.42 : 0.24) + pulse * 0.2;
    visual.coreMaterial.opacity = (visual.state.completed ? 0.5 : 0.34) + pulse * 0.16;
    visual.barrierMaterial.opacity = visual.state.barrierActive ? 0.22 + pulse * 0.24 : 0;
    visual.markerMaterial.update();
    visual.coreMaterial.update();
    visual.barrierMaterial.update();
  }

  private clearSealChamberPresentation(): void {
    const visual = this.sealChamberVisual;
    if (!visual) return;
    destroyEntity(visual.root);
    visual.markerMaterial.destroy();
    visual.coreMaterial.destroy();
    visual.barrierMaterial.destroy();
    this.sealChamberVisual = null;
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

  private findOreNear(point: Vec3Like): string | null {
    let id: string | null = null;
    let best = ORE_CLICK_RADIUS * 1.25;
    for (const [nodeId, view] of this.oreNodeViews) {
      if (view.state.depleted) continue;
      const p = view.state.position;
      const distance = Math.hypot(p.x - point.x, p.z - point.z);
      if (distance < best) {
        best = distance;
        id = nodeId;
      }
    }
    return id;
  }

  private findDisplacerNear(point: Vec3Like): string | null {
    let id: string | null = null;
    let best = 1.7;
    for (const [nodeId, view] of this.displacerViews) {
      if (view.state.zone !== this.zone) continue;
      const position = view.state.position;
      const distance = Math.hypot(position.x - point.x, position.z - point.z);
      if (distance < best) {
        best = distance;
        id = nodeId;
      }
    }
    return id;
  }

  private nearestMineableOre(): string | null {
    let id: string | null = null;
    let best = Infinity;
    for (const [nodeId, view] of this.oreNodeViews) {
      if (view.state.depleted) continue;
      const maxDistance = Math.max(0.75, view.state.interactRange - ORE_INTERACT_SAFETY_MARGIN);
      const distance = this.localPlayerDistanceTo(view.state.position.x, view.state.position.z);
      if (distance <= maxDistance && distance < best) {
        best = distance;
        id = nodeId;
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
      this.activeNavigationBound(),
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
    this.clearProjectileViews();
    this.clearControlZoneViews();
    this.clearCooperativeReviveViews();
    this.clearSealChamberPresentation();
    this.clearTreasureLodePresentation();
    this.clearUtraeanRelayPresentation();
    for (const view of this.views.values()) this.clearBossSealPhaseVisual(view);
    for (const view of this.views.values()) {
      this.clearArcaneResonanceVisual(view);
      this.clearStormOrbVisual(view);
      this.clearReviveProtectionVisual(view);
      this.clearGuardianRetaliationVisual(view);
    }
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
