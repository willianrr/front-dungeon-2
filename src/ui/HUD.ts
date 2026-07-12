import { GEM_DEFINITIONS, GEM_GLOW_COLORS, ITEM_BASE_NAMES, ITEM_ICON_URLS, RARITY_COLORS, RARITY_LABELS, equipSlotsForKind, isGemKind, isTwoHandedKind, itemIconFor } from '../shared/itemMeta';
import type { PlayerProfile } from '../shared/playerProfile';
import {
  resolveSteelSweepVariant,
  steelSweepPresentationForVariant,
} from '../shared/SteelSweepPresentation';
import {
  arcanaMastery,
  catalogSkill,
  martialMastery,
  masteryProgressRatio,
  normalizeSkillCatalog,
  skillCatalogTooltip,
  survivalMastery,
  type NormalizedSkillState,
} from '../shared/SkillCatalog';
import {
  combatDoctrineCanLearn,
  combatDoctrinePresentationGate,
  type CombatDoctrineId,
} from '../shared/CombatDoctrines';
import {
  STEEL_SWEEP_FORM_CONTRACTS,
  steelSweepFormCanLearn,
  steelSweepFormPresentationGate,
  type SteelSweepFormId,
} from '../shared/SteelSweepForms';
import { isHotbarSkillAction } from '../shared/HotbarLoadout';
import { enemyPresentationForVariant } from '../shared/RangedEnemyPresentation';
import { ashVeilStatusPresentationGate } from '../shared/AshCorruptorPresentation';
import { ruinExposedStatusPresentationGate } from '../shared/RuinBrutePresentation';
import {
  BOSS_SEAL_PALETTE,
  bossPhasePresentationGate,
} from '../shared/BossSealRupturePresentation';
import {
  RUNIC_ELITE_PALETTE,
  runicElitePresentationGate,
  type RunicElitePresentation,
} from '../shared/RunicElites';
import { sealChamberStatePresentationGate } from '../shared/SealChamberPresentation';
import {
  ARCANE_RESONANCE_MODIFIER_ID,
  arcaneResonanceSkillPresentationGate,
  arcaneResonanceStatusPresentationGate,
} from '../shared/ArcaneResonance';
import {
  GUARDIAN_RETALIATION_MODIFIER_ID,
  GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID,
  guardianRetaliationBuffPresentationGate,
  guardianRetaliationSkillPresentationGate,
} from '../shared/GuardianRetaliation';
import {
  ACTIVE_EVASION_PALETTE,
  activeEvasionStatePresentationGate,
} from '../shared/ActiveEvasion';
import {
  STORM_ORB_PALETTE,
  stormOrbBuffPresentationGate,
  stormOrbSkillPresentationGate,
} from '../shared/StormOrb';
import {
  FERAL_FORM_PALETTE,
  feralFormBuffPresentationGate,
  feralFormSkillPresentationGate,
} from '../shared/FeralForm';
import {
  ROOT_SNARE_PALETTE,
  rootSnareSkillPresentationGate,
  rootSnareStatusPresentationGate,
} from '../shared/RootSnare';
import { partyMemberCanRequestRevive } from '../shared/CooperativeRevive';
import { CHAIN_LIGHTNING_PALETTE, chainLightningSkillPresentationGate } from '../shared/ChainLightning';
import { RENEWAL_WAVE_PALETTE, renewalWaveSkillPresentationGate } from '../shared/RenewalWave';
import { PHASE_STEP_PALETTE, phaseStepSkillPresentationGate } from '../shared/PhaseStep';
import { NATURE_SPIRIT_PALETTE, natureSpiritSkillPresentationGate } from '../shared/NatureSpirit';
import { EXPEDITION_CARGO_KINDS, expeditionCargoCount, expeditionCargoPresentationGate } from '../shared/ExpeditionCargo';
import {
  EQUIPMENT_SET_COLORS,
  equipmentSetForgeOutputPresentation,
  equipmentSetItemPresentation,
  equipmentSetStateFor,
  equipmentSetStatesPresentationGate,
} from '../shared/EquipmentSets';
import { displacerColor } from '../shared/Displacers';
import {
  DIFFICULTY_PALETTE,
  difficultyModifiersPresentationGate,
  legacyNormalDifficultyState,
} from '../shared/DifficultyTiers';
import {
  TREASURE_LODE_PALETTE,
  treasureLodeColor,
  treasureLodePhaseLabel,
  treasureLodeStatePresentationGate,
} from '../shared/TreasureLode';
import {
  UTRAEAN_RELAY_PALETTE,
  utraeanRelayColor,
  utraeanRelayPhaseLabel,
  utraeanRelayStatePresentationGate,
  utraeanRuneById,
} from '../shared/UtraeanRelay';
import {
  ARHOK_FROST_PALETTE,
  arhokFrostBiomePresentationGate,
  arhokFrostColor,
  arhokFrostStageLabel,
} from '../shared/ArhokFrostCoast';
import {
  CORRUPTED_JUNGLE_PALETTE,
  corruptedJunglePresentationGate,
  nearestThreateningSporePod,
} from '../shared/CorruptedJungle';
import { WARRIOR_TALENT_TREE_LABELS, WARRIOR_TALENTS } from '../shared/warriorTalents';
import type {
  BuffState,
  ChatChannel,
  ChatMessageState,
  CombatDoctrineChoiceState,
  DisplacerState,
  DifficultyId,
  DifficultyState,
  EntityState,
  EnemyModifierState,
  EquipmentSetState,
  EquipmentSlot,
  EquipmentState,
  ForgeIngredientState,
  ForgeRecipeState,
  FriendState,
  HotbarAction,
  InventoryItem,
  ItemKind,
  ItemRarity,
  MasteryProgressState,
  NpcKind,
  NatureSpiritState,
  PartyInviteState,
  PartyState,
  PlayerAttribute,
  ProfessionContractState,
  ProfessionProgressState,
  ProfessionsState,
  QuestState,
  SkillId,
  StatusState,
  SteelSweepTechniqueChoiceState,
  TalentDefinition,
  TalentState,
  TalentTree,
  WorldSnapshot,
  WorldZone,
} from '../shared/types';
import type { WorldData } from '../shared/worldgen';
import { npcMinimapMarkerVisualState, type NpcMinimapMarkerVisualState } from '../core/NpcMinimapMarker';
import { npcServiceDestinationSubtitle } from '../core/NpcServiceDirectory';
import { npcServiceGlyph, npcServiceRoleLabel } from '../core/NpcServiceIdentity';
import { npcServiceAccentCss } from '../core/NpcServiceVisual';
import { vendorOfferModel, vendorRecommendedItemId } from '../core/VendorOffer';
import { bagInventoryItems } from './BagInventory';
import {
  equipmentSlotLabel,
  tooltipAffixValue,
  tooltipComparisonLines,
  tooltipInteractionHint,
  tooltipItemDescription,
  tooltipItemMeta,
  tooltipItemTitle,
  tooltipItemType,
  tooltipStatLines,
  type TooltipItem,
} from '../shared/itemTooltip';

// HUD em DOM sobreposto ao canvas. Mostra nivel, vida, experiencia, quest,
// mochila, personagem e tela de morte.

const BAG_SLOT_COUNT = 44;
const BAG_DRAG_THRESHOLD_PX = 8;
const preloadedIconUrls = new Set<string>();
export const HUD_SKILL_ICON_URLS = {
  arcaneNova: '/hud/runtime/arcane-nova.png',
} as const;

async function decodeIcon(url: string): Promise<void> {
  if (preloadedIconUrls.has(url)) return;
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'eager';
  image.src = url;
  try {
    await image.decode();
    preloadedIconUrls.add(url);
  } catch {
    // Falha de decode cai no handler de erro normal do item quando renderizar.
  }
}

export async function preloadHudIcons(urls: readonly string[]): Promise<void> {
  await Promise.all(urls.map(decodeIcon));
}

function barRatio(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/** Faixa de dano "min–max" de uma arma, ou string vazia se não for arma. */
function weaponRange(item: { damageMin?: number; damageMax?: number }): string {
  if (item.damageMin === undefined || item.damageMax === undefined) return '';
  return `${item.damageMin}-${item.damageMax}`;
}

function magicRange(item: { magicDamageMin?: number; magicDamageMax?: number }): string {
  if (!item.magicDamageMax || item.magicDamageMax <= 0) return '';
  return `${item.magicDamageMin ?? 0}-${item.magicDamageMax}`;
}

function upgradeLabel(item: { upgradeLevel?: number }): string {
  return item.upgradeLevel && item.upgradeLevel > 0 ? `+${item.upgradeLevel}` : '';
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function chatChannelLabel(channel: ChatChannel): string {
  if (channel === 'party') return 'Grupo';
  if (channel === 'global') return 'Global';
  if (channel === 'system') return 'Sistema';
  return 'Local';
}

function parseChatInput(raw: string): { channel: ChatChannel; message: string } {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower === '/p' || lower === '/party') return { channel: 'party', message: '' };
  if (lower.startsWith('/p ')) return { channel: 'party', message: text.slice(3).trim() };
  if (lower.startsWith('/party ')) return { channel: 'party', message: text.slice(7).trim() };
  if (lower === '/g' || lower === '/global') return { channel: 'global', message: '' };
  if (lower.startsWith('/g ')) return { channel: 'global', message: text.slice(3).trim() };
  if (lower.startsWith('/global ')) return { channel: 'global', message: text.slice(8).trim() };
  return { channel: 'local', message: text };
}

function chatDraftFor(channel: ChatChannel, message: string): string {
  if (channel === 'party') return `/p ${message}`.trimEnd();
  if (channel === 'global') return `/g ${message}`.trimEnd();
  return message;
}

function talentRank(state: TalentState | null | undefined, talentId: string): number {
  return state?.talents[talentId] ?? 0;
}

function talentRequirementLabel(talent: TalentDefinition): string {
  const requirement = talent.requires?.[0];
  if (!requirement) return '';
  const dependency = WARRIOR_TALENTS.find((candidate) => candidate.id === requirement.talentId);
  return dependency ? `${dependency.name} ${requirement.rank}/${dependency.maxRank}` : requirement.talentId;
}

function canLearnTalent(state: TalentState, talent: TalentDefinition): boolean {
  if (talentRank(state, talent.id) >= talent.maxRank) return false;
  if (state.availablePoints < talent.cost) return false;
  return (talent.requires ?? []).every((requirement) => talentRank(state, requirement.talentId) >= requirement.rank);
}

function buffInitials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function statusLabel(status: StatusState): string {
  if (status.id === 'arcane-slow') return 'Descompasso';
  if (status.id === 'arcane-resonance') return 'Marca de Ressonância';
  if (status.id === 'ash-veil') return 'Véu de Cinzas';
  if (status.id === 'bulwark-taunt') return 'Provocado';
  if (status.id === 'ruin-exposed') return 'Exposto';
  if (status.id === 'root-snare') return 'Enraizado';
  if (status.id === 'corrupted-spores') return 'Esporos Tóxicos';
  if (status.id === 'steel-sweep-bleed') return 'Sangramento';
  if (status.id === 'steel-sweep-stagger') return 'Abalo';
  return status.id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function statusSeconds(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safe.toFixed(1).replace('.', ',')} s`;
}

/** Resumo curto dos stats de pecas/acessorios para badges na bag/paper doll. */
function gearBonusLabel(item: InventoryItem): string | null {
  if ((item.armor ?? 0) > 0) return `${item.armor} arm`;
  const parts: string[] = [];
  if ((item.bonusCrit ?? 0) > 0) parts.push(`+${Math.round((item.bonusCrit ?? 0) * 100)}%crit`);
  if ((item.bonusHp ?? 0) > 0) parts.push(`+${item.bonusHp}pv`);
  if ((item.bonusMana ?? 0) > 0) parts.push(`+${item.bonusMana}mp`);
  return parts.length > 0 ? parts.join(' ') : null;
}

/** Campos que mudam a leitura do item/tooltip e precisam invalidar o DOM. */
function itemRollRenderKey(item: InventoryItem): string {
  const affixes = (item.affixes ?? [])
    .map((affix) => `${affix.id}:${affix.tier}:${affix.value ?? ''}:${affix.valueMin ?? ''}:${affix.valueMax ?? ''}`)
    .join(',');
  return [
    item.id,
    item.count,
    item.equipped ? 1 : 0,
    item.rarity ?? '',
    item.setId ?? '',
    item.setPieceId ?? '',
    item.itemLevel ?? 0,
    item.damageMin ?? '',
    item.damageMax ?? '',
    item.magicDamageMin ?? '',
    item.magicDamageMax ?? '',
    item.armor ?? '',
    item.bonusHp ?? '',
    item.bonusMana ?? '',
    item.bonusCrit ?? '',
    item.upgradeLevel ?? 0,
    item.glowGem ?? '',
    item.element ?? '',
    affixes,
  ].join(':');
}

const EQUIPMENT_SLOTS: readonly { slot: EquipmentSlot; label: string }[] = [
  { slot: 'head', label: 'Cabeça' },
  { slot: 'chest', label: 'Peito' },
  { slot: 'hands', label: 'Mãos' },
  { slot: 'ring', label: 'Anel' },
  { slot: 'ring2', label: 'Anel 2' },
  { slot: 'legs', label: 'Pernas' },
  { slot: 'feet', label: 'Botas' },
  { slot: 'weapon', label: 'Arma' },
  { slot: 'offhand', label: 'Secundária' },
  { slot: 'trinket', label: 'Talismã' },
];

const HOTBAR_EQUIPMENT_SLOTS: readonly { slot: EquipmentSlot; label: string }[] = [
  { slot: 'weapon', label: 'Arma' },
  { slot: 'offhand', label: 'Mão 2' },
];
const MINIMAP_DUNGEON_EXIT = { x: 0, z: -18 };
const MINIMAP_MAX_DPR = 2;
type RenderQualityLevel = 'high' | 'medium' | 'low';
type RenderQualityMode = RenderQualityLevel | 'auto';

export interface HudVendorItem {
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  price: number;
  rarity?: ItemRarity;
  stock?: number;
  tagline?: string;
	service?: 'expedition_mule';
}

export interface HudVendorPanel {
  id: string;
  name: string;
  title: string;
  coins: number;
  items: HudVendorItem[];
  sellUnusedCount?: number;
  sellUnusedValue?: number;
}

export type HudStashItem = InventoryItem;

export interface HudStashPanel {
  id: string;
  name: string;
  title: string;
  bagItems: HudStashItem[];
  stashItems: HudStashItem[];
}

export interface HudMinimapNpc {
  id: string;
  name: string;
  zone: WorldZone;
  position: { x: number; z: number };
  kind: NpcKind;
  marker?: string;
  active?: boolean;
  pending?: boolean;
  selected?: boolean;
  objective?: boolean;
  hovered?: boolean;
}

export interface HudNpcDestination {
  id: string;
  name: string;
  title: string;
  kind: NpcKind;
  zone: WorldZone;
  marker: string;
  statusLabel?: string;
  distance?: number;
  distanceLabel?: string;
  selected?: boolean;
  active?: boolean;
  nearby?: boolean;
  pending?: boolean;
  hovered?: boolean;
  objective?: boolean;
  priority?: number;
}

export interface HudNpcDialoguePanel {
  id: string;
  kind: NpcKind;
  name: string;
  title: string;
  greeting: string;
  actionLabel: string;
  actionDisabled?: boolean;
  quest?: QuestState;
  forgeRecipes?: HudForgeRecipe[];
  professions?: ProfessionsState;
}

export interface HudForgeIngredient extends ForgeIngredientState {
  owned: number;
}

export interface HudForgeRecipe extends Omit<ForgeRecipeState, 'ingredients'> {
  ingredients: HudForgeIngredient[];
  outputOwned: number;
  disabled: boolean;
  professionLocked: boolean;
  toolLocked: boolean;
  toolOwned: boolean;
  currentToolTier: number;
  requiredToolLabel: string;
  masteryItemLevelBonus: number;
  currentItemLevelBonus: number;
  pending?: boolean;
}

export interface HudNpcPrompt {
  id: string;
  name: string;
  title: string;
  kind: NpcKind;
  actionLabel: string;
}

export interface HudNpcTarget {
  id: string;
  kind: NpcKind;
  name: string;
  marker: string;
  subtitle: string;
  status: string;
  tone: string;
}

export interface HudPlayerContext {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
}

const TEMPLATE = `
  <div class="hotbar" aria-label="Atalhos do teclado">
    <div class="hotbar-slot hotbar-equipment-slot" id="hotbar-weapon-slot"><span>Arma</span></div>
    <div class="hotbar-slot hotbar-equipment-slot" id="hotbar-offhand-slot"><span>Mão 2</span></div>
    <div class="hotbar-slot hotbar-consumable-slot" id="hotbar-health-potion" aria-label="Poção Rubra">
      <img class="hotbar-consumable-icon" src="${ITEM_ICON_URLS.potion}" alt="" draggable="false" />
      <span class="hotbar-consumable-count" id="hotbar-health-potion-count"></span>
      <span class="hotbar-keycap">1</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot" id="hotbar-arcane-nova" aria-label="Nova Arcana">
      <img class="hotbar-skill-icon" src="${HUD_SKILL_ICON_URLS.arcaneNova}" alt="" draggable="false" />
      <span class="hotbar-cooldown-shade" id="hotbar-arcane-nova-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-arcane-nova-cooldown"></span>
      <span class="hotbar-keycap">2</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-arcane-bolt" id="hotbar-arcane-bolt" aria-label="Dardo Arcano" hidden>
      <span class="hotbar-skill-glyph hotbar-arcane-bolt-glyph" aria-hidden="true">✦</span>
      <span class="hotbar-cooldown-shade" id="hotbar-arcane-bolt-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-arcane-bolt-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-bulwark-call" id="hotbar-bulwark-call" aria-label="Clamor do Baluarte" hidden>
      <span class="hotbar-skill-glyph hotbar-bulwark-call-glyph" aria-hidden="true">♜</span>
      <span class="hotbar-cooldown-shade" id="hotbar-bulwark-call-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-bulwark-call-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-storm-orb" id="hotbar-storm-orb" aria-label="Orbe da Tempestade" hidden>
      <span class="hotbar-skill-glyph hotbar-storm-orb-glyph" aria-hidden="true">◉</span>
      <span class="hotbar-storm-orb-charges" id="hotbar-storm-orb-charges" hidden></span>
      <span class="hotbar-cooldown-shade" id="hotbar-storm-orb-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-storm-orb-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-feral-form" id="hotbar-feral-form" aria-label="Forma Feral" hidden>
      <span class="hotbar-skill-glyph hotbar-feral-form-glyph" aria-hidden="true">◆</span>
      <span class="hotbar-cooldown-shade" id="hotbar-feral-form-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-feral-form-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-root-snare" id="hotbar-root-snare" aria-label="Círculo de Raízes" hidden>
      <span class="hotbar-skill-glyph hotbar-root-snare-glyph" aria-hidden="true">♧</span>
      <span class="hotbar-cooldown-shade" id="hotbar-root-snare-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-root-snare-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-chain-lightning" id="hotbar-chain-lightning" aria-label="Relâmpago Encadeado" hidden>
      <span class="hotbar-skill-glyph hotbar-chain-lightning-glyph" aria-hidden="true">ϟ</span>
      <span class="hotbar-cooldown-shade" id="hotbar-chain-lightning-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-chain-lightning-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-renewal-wave" id="hotbar-renewal-wave" aria-label="Onda de Renovação" hidden>
      <span class="hotbar-skill-glyph hotbar-renewal-wave-glyph" aria-hidden="true">✤</span>
      <span class="hotbar-cooldown-shade" id="hotbar-renewal-wave-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-renewal-wave-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-phase-step" id="hotbar-phase-step" aria-label="Passo Espectral" hidden>
      <span class="hotbar-skill-glyph hotbar-phase-step-glyph" aria-hidden="true">⌁</span>
      <span class="hotbar-cooldown-shade" id="hotbar-phase-step-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-phase-step-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-nature-spirit" id="hotbar-nature-spirit" aria-label="Espírito de Aranna" hidden>
      <span class="hotbar-skill-glyph hotbar-nature-spirit-glyph" aria-hidden="true">❈</span>
      <span class="hotbar-cooldown-shade" id="hotbar-nature-spirit-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-nature-spirit-cooldown"></span>
      <span class="hotbar-keycap"></span>
    </div>
    <div class="hotbar-slot hotbar-consumable-slot" id="hotbar-mana-potion" aria-label="Poção Azul">
      <img class="hotbar-consumable-icon" src="${ITEM_ICON_URLS.mana_potion}" alt="" draggable="false" />
      <span class="hotbar-consumable-count" id="hotbar-mana-potion-count"></span>
      <span class="hotbar-keycap">3</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-warrior-skill" id="hotbar-war-cry" aria-label="Grito de Guerra">
      <span class="hotbar-skill-glyph">G</span>
      <span class="hotbar-cooldown-shade" id="hotbar-war-cry-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-war-cry-cooldown"></span>
      <span class="hotbar-keycap">4</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-warrior-skill" id="hotbar-heavy-strike" aria-label="Golpe Pesado">
      <span class="hotbar-skill-glyph">P</span>
      <span class="hotbar-cooldown-shade" id="hotbar-heavy-strike-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-heavy-strike-cooldown"></span>
      <span class="hotbar-keycap">5</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-warrior-skill" id="hotbar-charge" aria-label="Investida">
      <span class="hotbar-skill-glyph">I</span>
      <span class="hotbar-cooldown-shade" id="hotbar-charge-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-charge-cooldown"></span>
      <span class="hotbar-keycap">6</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-warrior-skill" id="hotbar-steel-sweep" aria-label="Varredura de Aço">
      <span class="hotbar-skill-glyph hotbar-steel-sweep-glyph">V</span>
      <span class="hotbar-steel-sweep-badge" id="hotbar-steel-sweep-badge" hidden></span>
      <span class="hotbar-steel-sweep-form-badge" id="hotbar-steel-sweep-form-badge" hidden></span>
      <span class="hotbar-cooldown-shade" id="hotbar-steel-sweep-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-steel-sweep-cooldown"></span>
      <span class="hotbar-keycap">7</span>
    </div>
    <div class="hotbar-slot hotbar-skill-slot hotbar-warrior-skill hotbar-defensive-skill" id="hotbar-iron-guard" aria-label="Guarda de Ferro">
      <span class="hotbar-skill-glyph hotbar-iron-guard-glyph" aria-hidden="true">⛨</span>
      <span class="hotbar-cooldown-shade" id="hotbar-iron-guard-shade"></span>
      <span class="hotbar-cooldown-text" id="hotbar-iron-guard-cooldown"></span>
      <span class="hotbar-keycap">8</span>
    </div>
  </div>

  <div class="evade-indicator" id="evade-indicator" aria-label="Esquiva: botão direito ou Ctrl" hidden>
    <span class="evade-indicator-glyph" aria-hidden="true">➤</span>
    <span class="evade-indicator-copy">
      <strong id="evade-indicator-status">ESQUIVA</strong>
      <small>RMB · CTRL</small>
    </span>
    <span class="evade-indicator-cooldown" id="evade-indicator-cooldown"></span>
  </div>

  <div class="unit-frame hud-panel">
    <div class="unit-portrait unit-portrait-player" aria-hidden="true">
      <span class="unit-level" id="hud-level">1</span>
    </div>
    <div class="unit-vitals">
      <div class="unit-heading">
        <span class="hud-name">Her&oacute;i de Aranna</span>
      </div>
      <div class="bar hp unit-bar">
        <div class="bar-fill" id="hud-hp-fill"></div>
        <span class="bar-text" id="hud-hp-text">0 / 0</span>
      </div>
      <div class="bar mana unit-bar">
        <div class="bar-fill" id="hud-mana-fill"></div>
        <span class="bar-text" id="hud-mana-text">0 / 0</span>
      </div>
      <div class="bar xp unit-xp">
        <div class="bar-fill" id="hud-xp-fill"></div>
        <span class="bar-text">EXP</span>
      </div>
      <div class="buff-tray" id="buff-tray" hidden aria-label="Efeitos ativos"></div>
    </div>
  </div>

  <div class="unit-frame target-frame" id="target-frame" aria-hidden="true">
    <div class="unit-portrait unit-portrait-enemy" aria-hidden="true">
      <span class="unit-level" id="target-level">1</span>
    </div>
    <div class="unit-vitals">
      <div class="unit-heading">
        <span class="target-name" id="target-name">Zumbi</span>
      </div>
      <small class="target-subtitle" id="target-subtitle" hidden></small>
      <div class="bar hp unit-bar">
        <div class="bar-fill" id="target-hp-fill"></div>
        <span class="bar-text" id="target-hp-text">0 / 0</span>
      </div>
      <div class="bar mana unit-bar target-mana-bar" id="target-mana-bar">
        <div class="bar-fill" id="target-mana-fill"></div>
        <span class="bar-text" id="target-mana-text">0 / 0</span>
      </div>
      <div class="target-status-tray" id="target-status-tray" aria-label="Efeitos negativos do alvo" hidden></div>
    </div>
  </div>

  <div class="party-panel" id="party-panel" hidden aria-label="Grupo"></div>

  <div class="party-panel friend-panel" id="friend-panel" hidden aria-label="Amigos"></div>

  <div class="party-invite-panel" id="party-invite-panel" hidden aria-live="polite"></div>

  <div class="player-context-menu" id="player-context-menu" hidden>
    <strong id="player-context-name">Jogador</strong>
    <small id="player-context-detail">Warrior</small>
    <button id="player-context-invite" type="button">Convidar para grupo</button>
    <button id="player-context-message" type="button">Enviar mensagem</button>
    <button id="player-context-inspect" type="button">Inspecionar</button>
    <button id="player-context-friend" type="button">Adicionar amigo</button>
  </div>

  <div class="system-feed" id="system-feed" aria-live="polite"></div>

  <div class="chat-panel" id="chat-panel" data-active="false" aria-label="Chat">
    <div class="chat-messages" id="chat-messages" aria-live="polite"></div>
    <form class="chat-form" id="chat-form" data-channel="local">
      <select id="chat-channel-select" aria-label="Canal do chat">
        <option value="local">Local</option>
        <option value="party">Grupo</option>
        <option value="global">Global</option>
      </select>
      <input id="chat-input" type="text" maxlength="220" autocomplete="off" spellcheck="false" placeholder="Mensagem local ou /p grupo" />
    </form>
  </div>

  <div class="quest-panel" id="quest-panel" hidden>
    <span class="panel-kicker" id="zone-name">Terras de Aranna</span>
    <h2 id="quest-title">A Escurid&atilde;o Sob Aranna</h2>
    <p id="quest-objective"></p>
    <small class="quest-route" id="quest-route" hidden></small>
    <div class="quest-progress"><div id="quest-progress-fill"></div></div>
  </div>

  <section class="encounter-panel" id="seal-chamber-panel" data-phase="idle" aria-label="Câmara do Selo" hidden>
    <div class="encounter-heading">
      <span>Câmara do Selo</span>
      <strong id="seal-chamber-phase">Adormecida</strong>
    </div>
    <div class="encounter-metrics" aria-label="Estado do encontro">
      <span id="seal-chamber-wave">Onda —</span>
      <span id="seal-chamber-remaining">0 inimigos</span>
      <span id="seal-chamber-timer">—</span>
    </div>
    <p id="seal-chamber-status" aria-live="polite">Aproxime-se do selo para despertar a câmara.</p>
  </section>

  <section class="treasure-lode-panel" id="treasure-lode-panel" data-phase="dormant" aria-label="Jazida do Coração de Ferro" hidden>
    <div class="treasure-lode-heading">
      <span>Evento de mineração</span>
      <strong id="treasure-lode-phase">Veio adormecido</strong>
    </div>
    <div class="treasure-lode-metrics">
      <span id="treasure-lode-wave">Onda —</span>
      <span id="treasure-lode-enemies">0 invasores</span>
      <span id="treasure-lode-timer">—</span>
    </div>
    <p id="treasure-lode-status">Mine o veio rico para desafiar a jazida.</p>
  </section>

  <section class="utraean-relay-panel" id="utraean-relay-panel" data-phase="dormant" aria-label="Circuito Rúnico Utraeano" hidden>
    <div class="utraean-relay-heading">
      <span>Ruínas Utraeanas</span>
      <strong id="utraean-relay-phase">Circuito adormecido</strong>
    </div>
    <div class="utraean-relay-metrics">
      <span id="utraean-relay-progress">Runas 0/3</span>
      <span id="utraean-relay-next">Console</span>
      <span id="utraean-relay-timer">—</span>
    </div>
    <p id="utraean-relay-status">Ative o console para revelar a sequência.</p>
  </section>

  <section class="arhok-frost-panel" id="arhok-frost-panel" data-stage="clear" aria-label="Exposição ao frio de Arhok" hidden>
    <div class="arhok-frost-heading">
      <span>Costa Fria de Arhok</span>
      <strong id="arhok-frost-stage">Temperatura estável</strong>
    </div>
    <div class="arhok-frost-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="arhok-frost-meter">
      <span id="arhok-frost-fill"></span>
    </div>
    <div class="arhok-frost-detail">
      <span id="arhok-frost-exposure">Frio 0/100</span>
      <strong id="arhok-frost-status">Procure os braseiros</strong>
    </div>
  </section>

  <section class="corrupted-jungle-panel" id="corrupted-jungle-panel" data-danger="safe" aria-label="Flora tóxica da Selva Corrompida" hidden>
    <div class="corrupted-jungle-heading">
      <span>Selva Corrompida</span>
      <strong id="corrupted-jungle-phase">Flora adormecida</strong>
    </div>
    <div class="corrupted-jungle-metrics">
      <span id="corrupted-jungle-active">0 ativas</span>
      <span id="corrupted-jungle-warning">0 alertas</span>
      <span id="corrupted-jungle-timer">Rota segura</span>
    </div>
    <p id="corrupted-jungle-status">Observe os anéis antes de atravessar.</p>
  </section>

  <div class="zone-banner" id="zone-banner" aria-hidden="true">
    <span id="zone-banner-kicker">Area descoberta</span>
    <strong id="zone-banner-name">Terras de Aranna</strong>
  </div>

  <div class="minimap-panel" aria-hidden="true">
    <canvas id="minimap-canvas"></canvas>
  </div>

  <div class="quality-chip" id="quality-chip" aria-hidden="true">AUTO</div>

  <div class="npc-service-panel" id="npc-service-panel" aria-hidden="true">
    <div class="npc-service-heading">
      <span>Servicos</span>
      <strong id="npc-service-zone">Terras de Aranna</strong>
    </div>
    <div class="npc-service-items" id="npc-service-items"></div>
  </div>

  <div class="npc-prompt" id="npc-prompt" aria-hidden="true">
    <span id="npc-prompt-action">Loja</span>
    <strong id="npc-prompt-name">Mercador</strong>
    <small id="npc-prompt-title">NPC</small>
  </div>

  <div class="npc-dialogue hud-window" id="npc-dialogue" role="dialog" aria-modal="false" aria-labelledby="npc-dialogue-name" aria-describedby="npc-dialogue-greeting npc-dialogue-status" aria-hidden="true" tabindex="-1">
    <button class="npc-dialogue-close" id="npc-dialogue-close" type="button" aria-label="Fechar conversa">X</button>
    <div class="npc-dialogue-heading">
      <span id="npc-dialogue-title">Missao</span>
      <strong id="npc-dialogue-name">Guia</strong>
    </div>
    <p id="npc-dialogue-greeting"></p>
    <div class="npc-dialogue-professions" id="npc-dialogue-professions" aria-label="Progresso dos ofícios" hidden></div>
    <div class="npc-dialogue-quest" id="npc-dialogue-quest">
      <strong id="npc-dialogue-quest-title"></strong>
      <small id="npc-dialogue-objective"></small>
      <div class="npc-dialogue-progress"><div id="npc-dialogue-progress-fill"></div></div>
    </div>
    <div class="npc-dialogue-reward" id="npc-dialogue-reward" hidden>
      <span>Recompensa</span>
      <strong id="npc-dialogue-reward-text">90 moedas | 2 pocoes | 1 mana | 120 EXP</strong>
    </div>
    <div class="npc-dialogue-forge" id="npc-dialogue-forge" role="group" aria-label="Receitas de fundição e forja" hidden></div>
    <div class="npc-dialogue-status" id="npc-dialogue-status" role="status" aria-live="polite" aria-atomic="true" hidden></div>
    <button class="npc-dialogue-action" id="npc-dialogue-action" type="button">Acompanhar</button>
  </div>

  <div class="vendor-panel hud-window" id="vendor-panel" aria-hidden="true">
    <button class="vendor-close" id="vendor-close" type="button" aria-label="Fechar loja">X</button>
    <div class="vendor-heading">
      <span id="vendor-title">Loja</span>
      <strong id="vendor-name">Mercador</strong>
      <small id="vendor-coins">0 moedas</small>
    </div>
    <div class="vendor-items" id="vendor-items"></div>
    <div class="vendor-status" id="vendor-status" hidden></div>
  </div>

  <div class="stash-panel hud-window" id="stash-panel" aria-hidden="true">
    <button class="stash-close" id="stash-close" type="button" aria-label="Fechar banco">X</button>
    <div class="stash-heading">
      <span id="stash-title">Banco</span>
      <strong id="stash-name">Banqueira</strong>
      <small>Consumiveis e joias</small>
    </div>
    <div class="stash-columns">
      <section class="stash-column">
        <span>Mochila</span>
        <div class="stash-items" id="stash-bag-items"></div>
      </section>
      <section class="stash-column">
        <span>Banco</span>
        <div class="stash-items" id="stash-bank-items"></div>
      </section>
    </div>
    <div class="stash-status" id="stash-status" hidden></div>
  </div>

  <div class="displacer-panel hud-window" id="displacer-panel" role="dialog" aria-modal="false" aria-labelledby="displacer-panel-name" aria-hidden="true">
    <button class="displacer-close" id="displacer-close" type="button" aria-label="Fechar rede de Displacers">X</button>
    <div class="displacer-heading">
      <span>Rede de Displacers</span>
      <strong id="displacer-panel-name">Âncora de Aranna</strong>
      <small>Escolha uma âncora já descoberta.</small>
    </div>
    <div class="displacer-destinations" id="displacer-destinations"></div>
    <section class="difficulty-selector" id="difficulty-selector" aria-labelledby="difficulty-selector-title" hidden>
      <div class="difficulty-selector-heading">
        <span>Expedição da sala</span>
        <strong id="difficulty-selector-title">Dificuldade</strong>
      </div>
      <div class="difficulty-options" id="difficulty-options"></div>
      <small class="difficulty-summary" id="difficulty-summary"></small>
      <small class="difficulty-lock" id="difficulty-lock" hidden></small>
    </section>
  </div>

  <div class="game-menu hud-window" id="game-menu" aria-hidden="true">
    <button class="game-menu-close" id="game-menu-close" type="button" aria-label="Fechar menu">X</button>
    <div class="character-stats" id="character-stats"></div>
    <div class="attribute-section" id="attribute-section"></div>
    <div class="equipment-grid" id="equipment-slots"></div>
    <div class="bag-grid" id="inventory-slots"></div>
  </div>

  <div class="item-tooltip" id="item-tooltip" role="tooltip" aria-hidden="true"></div>

  <div class="death-overlay" id="death-overlay">
    <div class="death-box">
      <h1>VOC&Ecirc; CAIU</h1>
      <p>Um aliado próximo pode reanimar você, ou use o santuário como retorno seguro.</p>
      <button id="respawn-btn">Retornar ao Santuário</button>
    </div>
  </div>

  <div class="talent-panel hud-window" id="talent-panel" role="dialog" aria-modal="false" aria-labelledby="talent-panel-title" aria-hidden="true" hidden>
    <div class="talent-heading">
      <div>
        <span class="panel-kicker">Warrior</span>
        <strong id="talent-panel-title">Talentos e Habilidades</strong>
      </div>
      <button class="talent-close" id="talent-close" type="button" aria-label="Fechar talentos">X</button>
    </div>
    <div class="mastery-summaries">
    <section class="mastery-summary" id="martial-mastery-summary" aria-label="Maestria Marcial">
      <div class="mastery-summary-heading">
        <strong id="martial-mastery-label">Maestria Marcial</strong>
        <span id="martial-mastery-level">Nv 1</span>
      </div>
      <div class="mastery-summary-progress" id="martial-mastery-progress" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">
        <span id="martial-mastery-fill"></span>
      </div>
      <div class="mastery-summary-detail">
        <span id="martial-mastery-xp">0 / 30 XP</span>
        <strong id="martial-mastery-bonus">+0% dano</strong>
      </div>
    </section>
    <section class="mastery-summary mastery-summary-arcana" id="arcana-mastery-summary" aria-label="Maestria Arcana" hidden>
      <div class="mastery-summary-heading">
        <strong id="arcana-mastery-label">Maestria Arcana</strong>
        <span id="arcana-mastery-level">Nv 1</span>
      </div>
      <div class="mastery-summary-progress" id="arcana-mastery-progress" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">
        <span id="arcana-mastery-fill"></span>
      </div>
      <div class="mastery-summary-detail">
        <span id="arcana-mastery-xp">0 / 30 XP</span>
        <strong id="arcana-mastery-bonus">+0% dano</strong>
      </div>
    </section>
    <section class="mastery-summary mastery-summary-survival" id="survival-mastery-summary" aria-label="Maestria de Sobrevivência" hidden>
      <div class="mastery-summary-heading">
        <strong id="survival-mastery-label">Maestria de Sobrevivência</strong>
        <span id="survival-mastery-level">Nv 1</span>
      </div>
      <div class="mastery-summary-progress" id="survival-mastery-progress" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0">
        <span id="survival-mastery-fill"></span>
      </div>
      <div class="mastery-summary-detail">
        <span id="survival-mastery-xp">0 / 30 XP</span>
        <strong id="survival-mastery-bonus">+0% potência defensiva</strong>
      </div>
    </section>
    </div>
    <section class="skill-loadout" aria-labelledby="skill-loadout-title">
      <div class="skill-loadout-heading">
        <div>
          <strong id="skill-loadout-title">Habilidades</strong>
          <small>6 equipadas · escolha qual slot substituir</small>
        </div>
        <span>Arraste na barra para reordenar</span>
      </div>
      <div class="skill-loadout-list" id="skill-loadout-list" aria-live="polite"></div>
    </section>
    <div class="talent-summary" id="talent-summary"></div>
    <section class="combat-doctrines" id="combat-doctrines" aria-labelledby="combat-doctrines-title" hidden>
      <div class="combat-doctrines-heading">
        <div>
          <strong id="combat-doctrines-title">Doutrina de Combate — escolha 1</strong>
          <small>Uma especialização altera a sinergia entre duas habilidades.</small>
        </div>
        <span>Use Reset para trocar</span>
      </div>
      <div class="combat-doctrine-choices" id="combat-doctrine-choices"></div>
    </section>
    <section class="steel-sweep-forms" id="steel-sweep-forms" aria-labelledby="steel-sweep-forms-title" hidden>
      <div class="steel-sweep-forms-heading">
        <div>
          <strong id="steel-sweep-forms-title">Forma da Varredura — escolha 1</strong>
          <small>Mude a geometria da mesma habilidade sem ocupar outra tecla.</small>
        </div>
        <span>Use Reset para trocar</span>
      </div>
      <div class="steel-sweep-form-choices" id="steel-sweep-form-choices"></div>
    </section>
    <div class="talent-trees" id="talent-trees"></div>
  </div>
`;

export class HUD {
  /** Disparado quando o jogador clica em "Renascer". */
  onRespawn: () => void = () => {};
  onEquipItem: (itemId: string) => void = () => {};
  onUseItem: (kind: ItemKind) => void = () => {};
  /** Item da bag arrastado para fora do menu (dropar no chao). */
  onDropItem: (item: InventoryItem) => void = () => {};
  /** Item da bag arrastado para um slot especifico do paper doll. */
  onEquipItemToSlot: (itemId: string, slot: EquipmentSlot) => void = () => {};
  /** Drag & drop entre dois slots da hotbar pedindo troca de posicoes. */
  onHotbarSwap: (from: HotbarAction, to: HotbarAction) => void = () => {};
  /** Clique simples num slot da hotbar (dispara a acao, como a tecla). */
  onHotbarUse: (action: HotbarAction) => void = () => {};
  /** Equipa uma skill da biblioteca no indice atualmente ocupado por outra. */
  onHotbarEquip: (skill: SkillId, replace: SkillId) => void = () => {};
  onUnequipSlot: (slot: EquipmentSlot) => void = () => {};
  onAllocateAttribute: (attribute: PlayerAttribute) => void = () => {};
  onVendorBuy: (vendorId: string, itemId: string) => void = () => {};
  onVendorSellUnused: (vendorId: string) => void = () => {};
  onVendorClose: () => void = () => {};
  onStashDeposit: (npcId: string, item: HudStashItem) => void = () => {};
  onStashWithdraw: (npcId: string, item: HudStashItem) => void = () => {};
  onStashClose: () => void = () => {};
  onDisplacerTravel: (nodeId: string) => void = () => {};
  onDisplacerClose: () => void = () => {};
  onDifficultySelect: (difficultyId: DifficultyId) => void = () => {};
  onNpcDestination: (npcId: string) => void = () => {};
  onNpcDestinationHover: (npcId: string | null) => void = () => {};
  onNpcTargetInteract: (npcId: string) => void = () => {};
  onNpcTargetHover: (npcId: string | null) => void = () => {};
  onQuestTracker: () => void = () => {};
  onQuestTrackerHover: (hovered: boolean) => void = () => {};
  onNpcDialogueClose: () => void = () => {};
  onNpcDialogueAction: (npcId: string) => void = () => {};
  onForgeRecipe: (npcId: string, recipeId: string, count: number) => void = () => {};
  onProfessionContractClaim: (npcId: string, contractId: string) => void = () => {};
  onPartyInviteSend: (targetPlayerId: string) => void = () => {};
  onPartyInviteAccept: (inviteId: string) => void = () => {};
  onPartyInviteDecline: (inviteId: string) => void = () => {};
  onPartyLeave: () => void = () => {};
  onPartyKick: (targetPlayerId: string) => void = () => {};
  onPartyLeaderTransfer: (targetPlayerId: string) => void = () => {};
  onPartyRevive: (targetPlayerId: string) => void = () => {};
  onCargoDeposit: (kind: ItemKind) => void = () => {};
  onCargoWithdraw: (kind: ItemKind) => void = () => {};
  onFriendAdd: (targetPlayerId: string) => void = () => {};
  onFriendRemove: (targetPlayerId: string) => void = () => {};
  onChatSend: (channel: ChatChannel, message: string) => void = () => {};
  onTalentLearn: (talentId: string) => void = () => {};
  onTalentReset: () => void = () => {};

  private readonly levelEl: HTMLElement;
  private readonly playerName: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly manaFill: HTMLElement;
  private readonly manaText: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly buffTray: HTMLElement;
  private readonly targetFrame: HTMLElement;
  private readonly targetName: HTMLElement;
  private readonly targetSubtitle: HTMLElement;
  private readonly targetLevel: HTMLElement;
  private readonly targetHpFill: HTMLElement;
  private readonly targetHpText: HTMLElement;
  private readonly targetManaBar: HTMLElement;
  private readonly targetManaFill: HTMLElement;
  private readonly targetManaText: HTMLElement;
  private readonly targetStatusTray: HTMLElement;
  private readonly partyPanel: HTMLElement;
  private readonly friendPanel: HTMLElement;
  private readonly partyInvitePanel: HTMLElement;
  private readonly playerContextMenu: HTMLElement;
  private readonly playerContextName: HTMLElement;
  private readonly playerContextDetail: HTMLElement;
  private readonly playerContextInvite: HTMLButtonElement;
  private readonly playerContextMessage: HTMLButtonElement;
  private readonly playerContextInspect: HTMLButtonElement;
  private readonly playerContextFriend: HTMLButtonElement;
  private readonly systemFeed: HTMLElement;
  private readonly chatPanel: HTMLElement;
  private readonly chatMessages: HTMLElement;
  private readonly chatForm: HTMLFormElement;
  private readonly chatChannelSelect: HTMLSelectElement;
  private readonly chatInput: HTMLInputElement;
  private readonly deathOverlay: HTMLElement;
  private readonly zoneName: HTMLElement;
  private readonly questPanel: HTMLElement;
  private readonly questTitle: HTMLElement;
  private readonly questObjective: HTMLElement;
  private readonly questRoute: HTMLElement;
  private readonly questProgress: HTMLElement;
  private readonly sealChamberPanel: HTMLElement;
  private readonly sealChamberPhase: HTMLElement;
  private readonly sealChamberWave: HTMLElement;
  private readonly sealChamberRemaining: HTMLElement;
  private readonly sealChamberTimer: HTMLElement;
  private readonly sealChamberStatus: HTMLElement;
  private readonly treasureLodePanel: HTMLElement;
  private readonly treasureLodePhase: HTMLElement;
  private readonly treasureLodeWave: HTMLElement;
  private readonly treasureLodeEnemies: HTMLElement;
  private readonly treasureLodeTimer: HTMLElement;
  private readonly treasureLodeStatus: HTMLElement;
  private readonly utraeanRelayPanel: HTMLElement;
  private readonly utraeanRelayPhase: HTMLElement;
  private readonly utraeanRelayProgress: HTMLElement;
  private readonly utraeanRelayNext: HTMLElement;
  private readonly utraeanRelayTimer: HTMLElement;
  private readonly utraeanRelayStatus: HTMLElement;
  private readonly arhokFrostPanel: HTMLElement;
  private readonly arhokFrostStage: HTMLElement;
  private readonly arhokFrostMeter: HTMLElement;
  private readonly arhokFrostFill: HTMLElement;
  private readonly arhokFrostExposure: HTMLElement;
  private readonly arhokFrostStatus: HTMLElement;
  private readonly corruptedJunglePanel: HTMLElement;
  private readonly corruptedJunglePhase: HTMLElement;
  private readonly corruptedJungleActive: HTMLElement;
  private readonly corruptedJungleWarning: HTMLElement;
  private readonly corruptedJungleTimer: HTMLElement;
  private readonly corruptedJungleStatus: HTMLElement;
  private readonly zoneBanner: HTMLElement;
  private readonly zoneBannerKicker: HTMLElement;
  private readonly zoneBannerName: HTMLElement;
  private readonly hotbarWeaponSlot: HTMLElement;
  private readonly hotbarOffhandSlot: HTMLElement;
  private readonly hotbarEl: HTMLElement;
  private readonly hotbarDragBound = new Set<HTMLElement>();
  private readonly hotbarHealthPotionSlot: HTMLElement;
  private readonly hotbarHealthPotionCount: HTMLElement;
  private readonly hotbarManaPotionSlot: HTMLElement;
  private readonly hotbarManaPotionCount: HTMLElement;
  private readonly hotbarArcaneNovaSlot: HTMLElement;
  private readonly hotbarArcaneNovaShade: HTMLElement;
  private readonly hotbarArcaneNovaCooldown: HTMLElement;
  private readonly hotbarArcaneBoltSlot: HTMLElement;
  private readonly hotbarArcaneBoltShade: HTMLElement;
  private readonly hotbarArcaneBoltCooldown: HTMLElement;
  private readonly hotbarBulwarkCallSlot: HTMLElement;
  private readonly hotbarBulwarkCallShade: HTMLElement;
  private readonly hotbarBulwarkCallCooldown: HTMLElement;
  private readonly hotbarStormOrbSlot: HTMLElement;
  private readonly hotbarStormOrbShade: HTMLElement;
  private readonly hotbarStormOrbCooldown: HTMLElement;
  private readonly hotbarStormOrbCharges: HTMLElement;
  private readonly hotbarFeralFormSlot: HTMLElement;
  private readonly hotbarFeralFormShade: HTMLElement;
  private readonly hotbarFeralFormCooldown: HTMLElement;
  private readonly hotbarRootSnareSlot: HTMLElement;
  private readonly hotbarRootSnareShade: HTMLElement;
  private readonly hotbarRootSnareCooldown: HTMLElement;
  private readonly hotbarChainLightningSlot: HTMLElement;
  private readonly hotbarChainLightningShade: HTMLElement;
  private readonly hotbarChainLightningCooldown: HTMLElement;
  private readonly hotbarRenewalWaveSlot: HTMLElement;
  private readonly hotbarRenewalWaveShade: HTMLElement;
  private readonly hotbarRenewalWaveCooldown: HTMLElement;
  private readonly hotbarPhaseStepSlot: HTMLElement;
  private readonly hotbarPhaseStepShade: HTMLElement;
  private readonly hotbarPhaseStepCooldown: HTMLElement;
  private readonly hotbarNatureSpiritSlot: HTMLElement;
  private readonly hotbarNatureSpiritShade: HTMLElement;
  private readonly hotbarNatureSpiritCooldown: HTMLElement;
  private readonly hotbarWarCrySlot: HTMLElement;
  private readonly hotbarWarCryShade: HTMLElement;
  private readonly hotbarWarCryCooldown: HTMLElement;
  private readonly hotbarHeavyStrikeSlot: HTMLElement;
  private readonly hotbarHeavyStrikeShade: HTMLElement;
  private readonly hotbarHeavyStrikeCooldown: HTMLElement;
  private readonly hotbarChargeSlot: HTMLElement;
  private readonly hotbarChargeShade: HTMLElement;
  private readonly hotbarChargeCooldown: HTMLElement;
  private readonly hotbarSteelSweepSlot: HTMLElement;
  private readonly hotbarSteelSweepBadge: HTMLElement;
  private readonly hotbarSteelSweepFormBadge: HTMLElement;
  private readonly hotbarSteelSweepShade: HTMLElement;
  private readonly hotbarSteelSweepCooldown: HTMLElement;
  private readonly hotbarIronGuardSlot: HTMLElement;
  private readonly hotbarIronGuardShade: HTMLElement;
  private readonly hotbarIronGuardCooldown: HTMLElement;
  private readonly evadeIndicator: HTMLElement;
  private readonly evadeIndicatorStatus: HTMLElement;
  private readonly evadeIndicatorCooldown: HTMLElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapContext: CanvasRenderingContext2D | null;
  private readonly qualityChip: HTMLElement;
  private readonly npcServicePanel: HTMLElement;
  private readonly npcServiceZone: HTMLElement;
  private readonly npcServiceItems: HTMLElement;
  private readonly npcPrompt: HTMLElement;
  private readonly npcPromptAction: HTMLElement;
  private readonly npcPromptName: HTMLElement;
  private readonly npcPromptTitle: HTMLElement;
  private readonly npcDialogue: HTMLElement;
  private readonly npcDialogueClose: HTMLButtonElement;
  private readonly npcDialogueTitle: HTMLElement;
  private readonly npcDialogueName: HTMLElement;
  private readonly npcDialogueGreeting: HTMLElement;
  private readonly npcDialogueProfessions: HTMLElement;
  private readonly npcDialogueQuest: HTMLElement;
  private readonly npcDialogueQuestTitle: HTMLElement;
  private readonly npcDialogueObjective: HTMLElement;
  private readonly npcDialogueProgress: HTMLElement;
  private readonly npcDialogueReward: HTMLElement;
  private readonly npcDialogueRewardText: HTMLElement;
  private readonly npcDialogueForge: HTMLElement;
  private readonly npcDialogueStatus: HTMLElement;
  private readonly npcDialogueAction: HTMLButtonElement;
  private npcDialoguePreviousFocus: HTMLElement | null = null;
  private readonly vendorPanel: HTMLElement;
  private readonly vendorClose: HTMLButtonElement;
  private readonly vendorTitle: HTMLElement;
  private readonly vendorName: HTMLElement;
  private readonly vendorCoins: HTMLElement;
  private readonly vendorItems: HTMLElement;
  private readonly vendorStatus: HTMLElement;
  private readonly stashPanel: HTMLElement;
  private readonly stashClose: HTMLButtonElement;
  private readonly stashTitle: HTMLElement;
  private readonly stashName: HTMLElement;
  private readonly stashBagItems: HTMLElement;
  private readonly stashBankItems: HTMLElement;
  private readonly stashStatus: HTMLElement;
  private readonly displacerPanel: HTMLElement;
  private readonly displacerClose: HTMLButtonElement;
  private readonly displacerPanelName: HTMLElement;
  private readonly displacerDestinations: HTMLElement;
  private readonly difficultySelector: HTMLElement;
  private readonly difficultyOptions: HTMLElement;
  private readonly difficultyLock: HTMLElement;
  private readonly difficultySummary: HTMLElement;
  private readonly gameMenu: HTMLElement;
  private readonly inventorySlots: HTMLElement;
  private readonly characterStats: HTMLElement;
  private readonly attributeSection: HTMLElement;
  private readonly equipmentSlots: HTMLElement;
  private readonly itemTooltip: HTMLElement;
  private readonly talentPanel: HTMLElement;
  private readonly talentClose: HTMLButtonElement;
  private readonly martialMasterySummary: HTMLElement;
  private readonly martialMasteryLabel: HTMLElement;
  private readonly martialMasteryLevel: HTMLElement;
  private readonly martialMasteryProgress: HTMLElement;
  private readonly martialMasteryFill: HTMLElement;
  private readonly martialMasteryXp: HTMLElement;
  private readonly martialMasteryBonus: HTMLElement;
  private readonly arcanaMasterySummary: HTMLElement;
  private readonly arcanaMasteryLabel: HTMLElement;
  private readonly arcanaMasteryLevel: HTMLElement;
  private readonly arcanaMasteryProgress: HTMLElement;
  private readonly arcanaMasteryFill: HTMLElement;
  private readonly arcanaMasteryXp: HTMLElement;
  private readonly arcanaMasteryBonus: HTMLElement;
  private readonly survivalMasterySummary: HTMLElement;
  private readonly survivalMasteryLabel: HTMLElement;
  private readonly survivalMasteryLevel: HTMLElement;
  private readonly survivalMasteryProgress: HTMLElement;
  private readonly survivalMasteryFill: HTMLElement;
  private readonly survivalMasteryXp: HTMLElement;
  private readonly survivalMasteryBonus: HTMLElement;
  private readonly skillLoadoutList: HTMLElement;
  private readonly talentSummary: HTMLElement;
  private readonly combatDoctrines: HTMLElement;
  private readonly combatDoctrineChoices: HTMLElement;
  private readonly steelSweepForms: HTMLElement;
  private readonly steelSweepFormChoices: HTMLElement;
  private readonly talentTrees: HTMLElement;

  private gameMenuOpen = false;
  private talentPanelOpen = false;
  private talentPreviousFocus: HTMLElement | null = null;
  private hotbarRenderKey = '';
  private hotbarLayout: HotbarAction[] = [];
  private skillLoadoutRenderKey = '';
  private skillLoadoutFocusSkillId: SkillId | null = null;
  private inventoryRenderKey = '__initial_inventory__';
  private lastInventoryForRender: InventoryItem[] = [];
  private bagSlots: Array<string | null> = Array(BAG_SLOT_COUNT).fill(null);
  private characterRenderKey = '';
  private minimapRenderKey = '';
  private minimapNpcKey = '';
  private minimapNpcs: HudMinimapNpc[] = [];
  private npcServiceKey = '';
  private activeNpcPrompt: HudNpcPrompt | null = null;
  private activeVendor: HudVendorPanel | null = null;
  private readonly vendorPendingItemIds = new Set<string>();
  private vendorSellPending = false;
  private activeStash: HudStashPanel | null = null;
  private activeDisplacerSourceId: string | null = null;
  private activeDifficulty: DifficultyState = legacyNormalDifficultyState();
  private readonly stashPendingKeys = new Set<string>();
  private activeNpcDialogue: HudNpcDialoguePanel | null = null;
  private activeNpcTargetId: string | null = null;
  private emittedNpcTargetHoverId: string | null = null;
  private npcTargetFrameHovered = false;
  private npcDialogueActionPending = false;
  private professionContractPendingId: string | null = null;
  private partyRenderKey = '';
  private friendRenderKey = '';
  private friendPresenceInitialized = false;
  private readonly friendIds = new Set<string>();
  private readonly friendOnlineById = new Map<string, boolean>();
  private partyInviteRenderKey = '';
  private readonly partyMemberIds = new Set<string>();
  private activePlayerContextId: string | null = null;
  private activePlayerContextName = '';
  private activePlayerContextLevel = 1;
  private activePlayerContextHp = 0;
  private activePlayerContextMaxHp = 0;
  private chatActive = false;
  private talentRenderKey = '';
  private activeDoctrineId: CombatDoctrineId | null = null;
  private activeDoctrineModifierId: CombatDoctrineId | null = null;
  private activeSteelSweepFormId: SteelSweepFormId | null = null;
  private arcaneResonanceActive = false;
  private guardianRetaliationActive = false;
  private guardianRetaliationTargetId: string | null = null;
  private masteryRenderKey = '';
  private arcanaMasteryRenderKey = '';
  private survivalMasteryRenderKey = '';
  private buffRenderKey = '';
  private zoneBannerTimer: number | null = null;
  private characterTrainingContext: string | null = null;
  private questTrackerActionable = false;
  private questTrackerRouteText = '';
  private tooltipInventory: InventoryItem[] = [];
  private tooltipEquipment: EquipmentState | null = null;
  private tooltipEquipmentSets: readonly EquipmentSetState[] = [];
  private tooltipAnchor: HTMLElement | null = null;
  private tooltipWorldKey = '';
  private readonly itemTooltipCleanup = new WeakMap<HTMLElement, () => void>();

  constructor(layer: HTMLElement, profile: PlayerProfile, private readonly world: WorldData) {
    layer.innerHTML = TEMPLATE;
    this.levelEl = layer.querySelector('#hud-level')!;
    this.playerName = layer.querySelector('.hud-name')!;
    this.hpFill = layer.querySelector('#hud-hp-fill')!;
    this.hpText = layer.querySelector('#hud-hp-text')!;
    this.manaFill = layer.querySelector('#hud-mana-fill')!;
    this.manaText = layer.querySelector('#hud-mana-text')!;
    this.xpFill = layer.querySelector('#hud-xp-fill')!;
    this.buffTray = layer.querySelector('#buff-tray')!;
    this.targetFrame = layer.querySelector('#target-frame')!;
    this.targetName = layer.querySelector('#target-name')!;
    this.targetSubtitle = layer.querySelector('#target-subtitle')!;
    this.targetLevel = layer.querySelector('#target-level')!;
    this.targetHpFill = layer.querySelector('#target-hp-fill')!;
    this.targetHpText = layer.querySelector('#target-hp-text')!;
    this.targetManaBar = layer.querySelector('#target-mana-bar')!;
    this.targetManaFill = layer.querySelector('#target-mana-fill')!;
    this.targetManaText = layer.querySelector('#target-mana-text')!;
    this.targetStatusTray = layer.querySelector('#target-status-tray')!;
    this.partyPanel = layer.querySelector('#party-panel')!;
    this.friendPanel = layer.querySelector('#friend-panel')!;
    this.partyInvitePanel = layer.querySelector('#party-invite-panel')!;
    this.playerContextMenu = layer.querySelector('#player-context-menu')!;
    this.playerContextName = layer.querySelector('#player-context-name')!;
    this.playerContextDetail = layer.querySelector('#player-context-detail')!;
    this.playerContextInvite = layer.querySelector('#player-context-invite') as HTMLButtonElement;
    this.playerContextMessage = layer.querySelector('#player-context-message') as HTMLButtonElement;
    this.playerContextInspect = layer.querySelector('#player-context-inspect') as HTMLButtonElement;
    this.playerContextFriend = layer.querySelector('#player-context-friend') as HTMLButtonElement;
    this.systemFeed = layer.querySelector('#system-feed')!;
    this.chatPanel = layer.querySelector('#chat-panel')!;
    this.chatMessages = layer.querySelector('#chat-messages')!;
    this.chatForm = layer.querySelector('#chat-form') as HTMLFormElement;
    this.chatChannelSelect = layer.querySelector('#chat-channel-select') as HTMLSelectElement;
    this.chatInput = layer.querySelector('#chat-input') as HTMLInputElement;
    this.deathOverlay = layer.querySelector('#death-overlay')!;
    this.zoneName = layer.querySelector('#zone-name')!;
    this.questPanel = layer.querySelector('#quest-panel')!;
    this.questTitle = layer.querySelector('#quest-title')!;
    this.questObjective = layer.querySelector('#quest-objective')!;
    this.questRoute = layer.querySelector('#quest-route')!;
    this.questProgress = layer.querySelector('#quest-progress-fill')!;
    this.sealChamberPanel = layer.querySelector('#seal-chamber-panel')!;
    this.sealChamberPhase = layer.querySelector('#seal-chamber-phase')!;
    this.sealChamberWave = layer.querySelector('#seal-chamber-wave')!;
    this.sealChamberRemaining = layer.querySelector('#seal-chamber-remaining')!;
    this.sealChamberTimer = layer.querySelector('#seal-chamber-timer')!;
    this.sealChamberStatus = layer.querySelector('#seal-chamber-status')!;
    this.treasureLodePanel = layer.querySelector('#treasure-lode-panel')!;
    this.treasureLodePhase = layer.querySelector('#treasure-lode-phase')!;
    this.treasureLodeWave = layer.querySelector('#treasure-lode-wave')!;
    this.treasureLodeEnemies = layer.querySelector('#treasure-lode-enemies')!;
    this.treasureLodeTimer = layer.querySelector('#treasure-lode-timer')!;
    this.treasureLodeStatus = layer.querySelector('#treasure-lode-status')!;
    this.utraeanRelayPanel = layer.querySelector('#utraean-relay-panel')!;
    this.utraeanRelayPhase = layer.querySelector('#utraean-relay-phase')!;
    this.utraeanRelayProgress = layer.querySelector('#utraean-relay-progress')!;
    this.utraeanRelayNext = layer.querySelector('#utraean-relay-next')!;
    this.utraeanRelayTimer = layer.querySelector('#utraean-relay-timer')!;
    this.utraeanRelayStatus = layer.querySelector('#utraean-relay-status')!;
    this.arhokFrostPanel = layer.querySelector('#arhok-frost-panel')!;
    this.arhokFrostStage = layer.querySelector('#arhok-frost-stage')!;
    this.arhokFrostMeter = layer.querySelector('#arhok-frost-meter')!;
    this.arhokFrostFill = layer.querySelector('#arhok-frost-fill')!;
    this.arhokFrostExposure = layer.querySelector('#arhok-frost-exposure')!;
    this.arhokFrostStatus = layer.querySelector('#arhok-frost-status')!;
    this.corruptedJunglePanel = layer.querySelector('#corrupted-jungle-panel')!;
    this.corruptedJunglePhase = layer.querySelector('#corrupted-jungle-phase')!;
    this.corruptedJungleActive = layer.querySelector('#corrupted-jungle-active')!;
    this.corruptedJungleWarning = layer.querySelector('#corrupted-jungle-warning')!;
    this.corruptedJungleTimer = layer.querySelector('#corrupted-jungle-timer')!;
    this.corruptedJungleStatus = layer.querySelector('#corrupted-jungle-status')!;
    this.zoneBanner = layer.querySelector('#zone-banner')!;
    this.zoneBannerKicker = layer.querySelector('#zone-banner-kicker')!;
    this.zoneBannerName = layer.querySelector('#zone-banner-name')!;
    this.hotbarWeaponSlot = layer.querySelector('#hotbar-weapon-slot')!;
    this.hotbarOffhandSlot = layer.querySelector('#hotbar-offhand-slot')!;
    this.hotbarEl = layer.querySelector('.hotbar')!;
    this.hotbarHealthPotionSlot = layer.querySelector('#hotbar-health-potion')!;
    this.hotbarHealthPotionCount = layer.querySelector('#hotbar-health-potion-count')!;
    this.hotbarManaPotionSlot = layer.querySelector('#hotbar-mana-potion')!;
    this.hotbarManaPotionCount = layer.querySelector('#hotbar-mana-potion-count')!;
    this.hotbarArcaneNovaSlot = layer.querySelector('#hotbar-arcane-nova')!;
    this.hotbarArcaneNovaShade = layer.querySelector('#hotbar-arcane-nova-shade')!;
    this.hotbarArcaneNovaCooldown = layer.querySelector('#hotbar-arcane-nova-cooldown')!;
    this.hotbarArcaneBoltSlot = layer.querySelector('#hotbar-arcane-bolt')!;
    this.hotbarArcaneBoltShade = layer.querySelector('#hotbar-arcane-bolt-shade')!;
    this.hotbarArcaneBoltCooldown = layer.querySelector('#hotbar-arcane-bolt-cooldown')!;
    this.hotbarBulwarkCallSlot = layer.querySelector('#hotbar-bulwark-call')!;
    this.hotbarBulwarkCallShade = layer.querySelector('#hotbar-bulwark-call-shade')!;
    this.hotbarBulwarkCallCooldown = layer.querySelector('#hotbar-bulwark-call-cooldown')!;
    this.hotbarStormOrbSlot = layer.querySelector('#hotbar-storm-orb')!;
    this.hotbarStormOrbShade = layer.querySelector('#hotbar-storm-orb-shade')!;
    this.hotbarStormOrbCooldown = layer.querySelector('#hotbar-storm-orb-cooldown')!;
    this.hotbarStormOrbCharges = layer.querySelector('#hotbar-storm-orb-charges')!;
    this.hotbarFeralFormSlot = layer.querySelector('#hotbar-feral-form')!;
    this.hotbarFeralFormShade = layer.querySelector('#hotbar-feral-form-shade')!;
    this.hotbarFeralFormCooldown = layer.querySelector('#hotbar-feral-form-cooldown')!;
    this.hotbarRootSnareSlot = layer.querySelector('#hotbar-root-snare')!;
    this.hotbarRootSnareShade = layer.querySelector('#hotbar-root-snare-shade')!;
    this.hotbarRootSnareCooldown = layer.querySelector('#hotbar-root-snare-cooldown')!;
    this.hotbarChainLightningSlot = layer.querySelector('#hotbar-chain-lightning')!;
    this.hotbarChainLightningShade = layer.querySelector('#hotbar-chain-lightning-shade')!;
    this.hotbarChainLightningCooldown = layer.querySelector('#hotbar-chain-lightning-cooldown')!;
    this.hotbarRenewalWaveSlot = layer.querySelector('#hotbar-renewal-wave')!;
    this.hotbarRenewalWaveShade = layer.querySelector('#hotbar-renewal-wave-shade')!;
    this.hotbarRenewalWaveCooldown = layer.querySelector('#hotbar-renewal-wave-cooldown')!;
    this.hotbarPhaseStepSlot = layer.querySelector('#hotbar-phase-step')!;
    this.hotbarPhaseStepShade = layer.querySelector('#hotbar-phase-step-shade')!;
    this.hotbarPhaseStepCooldown = layer.querySelector('#hotbar-phase-step-cooldown')!;
    this.hotbarNatureSpiritSlot = layer.querySelector('#hotbar-nature-spirit')!;
    this.hotbarNatureSpiritShade = layer.querySelector('#hotbar-nature-spirit-shade')!;
    this.hotbarNatureSpiritCooldown = layer.querySelector('#hotbar-nature-spirit-cooldown')!;
    this.hotbarWarCrySlot = layer.querySelector('#hotbar-war-cry')!;
    this.hotbarWarCryShade = layer.querySelector('#hotbar-war-cry-shade')!;
    this.hotbarWarCryCooldown = layer.querySelector('#hotbar-war-cry-cooldown')!;
    this.hotbarHeavyStrikeSlot = layer.querySelector('#hotbar-heavy-strike')!;
    this.hotbarHeavyStrikeShade = layer.querySelector('#hotbar-heavy-strike-shade')!;
    this.hotbarHeavyStrikeCooldown = layer.querySelector('#hotbar-heavy-strike-cooldown')!;
    this.hotbarChargeSlot = layer.querySelector('#hotbar-charge')!;
    this.hotbarChargeShade = layer.querySelector('#hotbar-charge-shade')!;
    this.hotbarChargeCooldown = layer.querySelector('#hotbar-charge-cooldown')!;
    this.hotbarSteelSweepSlot = layer.querySelector('#hotbar-steel-sweep')!;
    this.hotbarSteelSweepBadge = layer.querySelector('#hotbar-steel-sweep-badge')!;
    this.hotbarSteelSweepFormBadge = layer.querySelector('#hotbar-steel-sweep-form-badge')!;
    this.hotbarSteelSweepShade = layer.querySelector('#hotbar-steel-sweep-shade')!;
    this.hotbarSteelSweepCooldown = layer.querySelector('#hotbar-steel-sweep-cooldown')!;
    this.hotbarIronGuardSlot = layer.querySelector('#hotbar-iron-guard')!;
    this.hotbarIronGuardShade = layer.querySelector('#hotbar-iron-guard-shade')!;
    this.hotbarIronGuardCooldown = layer.querySelector('#hotbar-iron-guard-cooldown')!;
    this.evadeIndicator = layer.querySelector('#evade-indicator')!;
    this.evadeIndicatorStatus = layer.querySelector('#evade-indicator-status')!;
    this.evadeIndicatorCooldown = layer.querySelector('#evade-indicator-cooldown')!;
    this.minimapCanvas = layer.querySelector('#minimap-canvas')!;
    this.minimapContext = this.minimapCanvas.getContext('2d');
    this.qualityChip = layer.querySelector('#quality-chip')!;
    this.npcServicePanel = layer.querySelector('#npc-service-panel')!;
    this.npcServiceZone = layer.querySelector('#npc-service-zone')!;
    this.npcServiceItems = layer.querySelector('#npc-service-items')!;
    this.npcPrompt = layer.querySelector('#npc-prompt')!;
    this.npcPromptAction = layer.querySelector('#npc-prompt-action')!;
    this.npcPromptName = layer.querySelector('#npc-prompt-name')!;
    this.npcPromptTitle = layer.querySelector('#npc-prompt-title')!;
    this.npcDialogue = layer.querySelector('#npc-dialogue')!;
    this.npcDialogueClose = layer.querySelector('#npc-dialogue-close') as HTMLButtonElement;
    this.npcDialogueTitle = layer.querySelector('#npc-dialogue-title')!;
    this.npcDialogueName = layer.querySelector('#npc-dialogue-name')!;
    this.npcDialogueGreeting = layer.querySelector('#npc-dialogue-greeting')!;
    this.npcDialogueProfessions = layer.querySelector('#npc-dialogue-professions')!;
    this.npcDialogueQuest = layer.querySelector('#npc-dialogue-quest')!;
    this.npcDialogueQuestTitle = layer.querySelector('#npc-dialogue-quest-title')!;
    this.npcDialogueObjective = layer.querySelector('#npc-dialogue-objective')!;
    this.npcDialogueProgress = layer.querySelector('#npc-dialogue-progress-fill')!;
    this.npcDialogueReward = layer.querySelector('#npc-dialogue-reward')!;
    this.npcDialogueRewardText = layer.querySelector('#npc-dialogue-reward-text')!;
    this.npcDialogueForge = layer.querySelector('#npc-dialogue-forge')!;
    this.npcDialogueStatus = layer.querySelector('#npc-dialogue-status')!;
    this.npcDialogueAction = layer.querySelector('#npc-dialogue-action') as HTMLButtonElement;
    this.vendorPanel = layer.querySelector('#vendor-panel')!;
    this.vendorClose = layer.querySelector('#vendor-close') as HTMLButtonElement;
    this.vendorTitle = layer.querySelector('#vendor-title')!;
    this.vendorName = layer.querySelector('#vendor-name')!;
    this.vendorCoins = layer.querySelector('#vendor-coins')!;
    this.vendorItems = layer.querySelector('#vendor-items')!;
    this.vendorStatus = layer.querySelector('#vendor-status')!;
    this.stashPanel = layer.querySelector('#stash-panel')!;
    this.stashClose = layer.querySelector('#stash-close') as HTMLButtonElement;
    this.stashTitle = layer.querySelector('#stash-title')!;
    this.stashName = layer.querySelector('#stash-name')!;
    this.stashBagItems = layer.querySelector('#stash-bag-items')!;
    this.stashBankItems = layer.querySelector('#stash-bank-items')!;
    this.stashStatus = layer.querySelector('#stash-status')!;
    this.displacerPanel = layer.querySelector('#displacer-panel')!;
    this.displacerClose = layer.querySelector('#displacer-close') as HTMLButtonElement;
    this.displacerPanelName = layer.querySelector('#displacer-panel-name')!;
    this.displacerDestinations = layer.querySelector('#displacer-destinations')!;
    this.difficultySelector = layer.querySelector('#difficulty-selector')!;
    this.difficultyOptions = layer.querySelector('#difficulty-options')!;
    this.difficultyLock = layer.querySelector('#difficulty-lock')!;
    this.difficultySummary = layer.querySelector('#difficulty-summary')!;
    this.gameMenu = layer.querySelector('#game-menu')!;
    this.inventorySlots = layer.querySelector('#inventory-slots')!;
    this.characterStats = layer.querySelector('#character-stats')!;
    this.attributeSection = layer.querySelector('#attribute-section')!;
    this.equipmentSlots = layer.querySelector('#equipment-slots')!;
    this.itemTooltip = layer.querySelector('#item-tooltip')!;
    this.talentPanel = layer.querySelector('#talent-panel')!;
    this.talentClose = layer.querySelector('#talent-close') as HTMLButtonElement;
    this.martialMasterySummary = layer.querySelector('#martial-mastery-summary')!;
    this.martialMasteryLabel = layer.querySelector('#martial-mastery-label')!;
    this.martialMasteryLevel = layer.querySelector('#martial-mastery-level')!;
    this.martialMasteryProgress = layer.querySelector('#martial-mastery-progress')!;
    this.martialMasteryFill = layer.querySelector('#martial-mastery-fill')!;
    this.martialMasteryXp = layer.querySelector('#martial-mastery-xp')!;
    this.martialMasteryBonus = layer.querySelector('#martial-mastery-bonus')!;
    this.arcanaMasterySummary = layer.querySelector('#arcana-mastery-summary')!;
    this.arcanaMasteryLabel = layer.querySelector('#arcana-mastery-label')!;
    this.arcanaMasteryLevel = layer.querySelector('#arcana-mastery-level')!;
    this.arcanaMasteryProgress = layer.querySelector('#arcana-mastery-progress')!;
    this.arcanaMasteryFill = layer.querySelector('#arcana-mastery-fill')!;
    this.arcanaMasteryXp = layer.querySelector('#arcana-mastery-xp')!;
    this.arcanaMasteryBonus = layer.querySelector('#arcana-mastery-bonus')!;
    this.survivalMasterySummary = layer.querySelector('#survival-mastery-summary')!;
    this.survivalMasteryLabel = layer.querySelector('#survival-mastery-label')!;
    this.survivalMasteryLevel = layer.querySelector('#survival-mastery-level')!;
    this.survivalMasteryProgress = layer.querySelector('#survival-mastery-progress')!;
    this.survivalMasteryFill = layer.querySelector('#survival-mastery-fill')!;
    this.survivalMasteryXp = layer.querySelector('#survival-mastery-xp')!;
    this.survivalMasteryBonus = layer.querySelector('#survival-mastery-bonus')!;
    this.skillLoadoutList = layer.querySelector('#skill-loadout-list')!;
    this.talentSummary = layer.querySelector('#talent-summary')!;
    this.combatDoctrines = layer.querySelector('#combat-doctrines')!;
    this.combatDoctrineChoices = layer.querySelector('#combat-doctrine-choices')!;
    this.steelSweepForms = layer.querySelector('#steel-sweep-forms')!;
    this.steelSweepFormChoices = layer.querySelector('#steel-sweep-form-choices')!;
    this.talentTrees = layer.querySelector('#talent-trees')!;

    const btn = layer.querySelector('#respawn-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => this.onRespawn());
    const menuClose = layer.querySelector('#game-menu-close') as HTMLButtonElement;
    menuClose.addEventListener('click', () => this.setMenuOpen(false));
    this.talentClose.addEventListener('click', () => this.setTalentPanelOpen(false));
    this.targetFrame.addEventListener('click', () => {
      if (this.activeNpcTargetId) this.onNpcTargetInteract(this.activeNpcTargetId);
    });
    this.targetFrame.addEventListener('pointerenter', () => this.setNpcTargetFrameHovered(true));
    this.targetFrame.addEventListener('pointerleave', () => this.setNpcTargetFrameHovered(false));
    this.targetFrame.addEventListener('focus', () => this.setNpcTargetFrameHovered(true));
    this.targetFrame.addEventListener('blur', () => this.setNpcTargetFrameHovered(false));
    this.targetFrame.addEventListener('keydown', (event) => {
      if (!this.activeNpcTargetId) return;
      if (event.code !== 'Enter' && event.code !== 'Space') return;
      event.preventDefault();
      this.onNpcTargetInteract(this.activeNpcTargetId);
    });
    this.playerContextInvite.addEventListener('click', () => {
      if (!this.activePlayerContextId) return;
      this.onPartyInviteSend(this.activePlayerContextId);
      this.hidePlayerContextMenu();
    });
    this.playerContextMessage.addEventListener('click', () => {
      if (!this.activePlayerContextId) return;
      const name = this.activePlayerContextName || 'jogador';
      const targetPlayerId = this.activePlayerContextId;
      this.hidePlayerContextMenu();
      this.openPlayerMessageDraft(targetPlayerId, name);
    });
    this.playerContextInspect.addEventListener('click', () => {
      if (!this.activePlayerContextId) return;
      const sameParty = this.partyMemberIds.has(this.activePlayerContextId);
      const hp = Math.max(0, Math.ceil(this.activePlayerContextHp));
      const maxHp = Math.max(1, Math.ceil(this.activePlayerContextMaxHp));
      const name = this.activePlayerContextName || 'Jogador';
      const relation = sameParty ? 'membro do grupo' : 'jogador proximo';
      this.hidePlayerContextMenu();
      this.pushSystemMessage(`Inspecao: ${name} - Warrior nivel ${this.activePlayerContextLevel}, vida ${hp}/${maxHp}, ${relation}.`);
    });
    this.playerContextFriend.addEventListener('click', () => {
      if (!this.activePlayerContextId) return;
      this.onFriendAdd(this.activePlayerContextId);
      this.hidePlayerContextMenu();
    });
    window.addEventListener('pointerdown', (event) => {
      if (this.playerContextMenu.hidden) return;
      if (event.target instanceof Node && this.playerContextMenu.contains(event.target)) return;
      this.hidePlayerContextMenu();
    });
    this.chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitChatInput();
    });
    this.chatChannelSelect.addEventListener('change', () => this.applyChatChannelSelection(this.chatChannelSelect.value as ChatChannel));
    this.chatInput.addEventListener('input', () => this.syncChatDraftChannel());
    this.chatInput.addEventListener('focus', () => this.openChat());
    // Sem isso, clicar fora do input deixava chatActive=true para sempre e o
    // stopPropagation abaixo engolia TODO o teclado do jogo (WASD, skills...).
    this.chatInput.addEventListener('blur', (event) => {
      const next = event.relatedTarget;
      if (next instanceof Node && this.chatPanel.contains(next)) return;
      this.closeChat();
    });
    window.addEventListener('keydown', (event) => {
      if (event.target === this.chatInput) {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeChat();
        }
        if (event.key === 'Enter' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          this.submitChatInput();
        }
        return;
      }
      if (this.chatActive && document.activeElement === this.chatInput) event.stopPropagation();
      if (event.key === 'Escape' && this.chatActive) {
        event.preventDefault();
        this.closeChat();
        return;
      }
      if (event.key !== 'Enter' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (event.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.openChat();
    }, true);
    this.npcDialogueClose.addEventListener('click', () => {
      this.hideNpcDialogue();
      this.onNpcDialogueClose();
    });
    this.npcDialogueAction.addEventListener('click', () => {
      if (this.activeNpcDialogue) this.onNpcDialogueAction(this.activeNpcDialogue.id);
    });
    this.questPanel.addEventListener('click', () => {
      if (this.questTrackerActionable) this.onQuestTracker();
    });
    this.questPanel.addEventListener('pointerenter', () => {
      if (this.questTrackerActionable) this.onQuestTrackerHover(true);
    });
    this.questPanel.addEventListener('pointerleave', () => this.onQuestTrackerHover(false));
    this.questPanel.addEventListener('focus', () => {
      if (this.questTrackerActionable) this.onQuestTrackerHover(true);
    });
    this.questPanel.addEventListener('blur', () => this.onQuestTrackerHover(false));
    this.questPanel.addEventListener('keydown', (event) => {
      if (!this.questTrackerActionable) return;
      if (event.code !== 'Enter' && event.code !== 'Space') return;
      event.preventDefault();
      this.onQuestTracker();
    });
    this.npcServicePanel.addEventListener('pointerleave', () => this.onNpcDestinationHover(null));
    this.vendorClose.addEventListener('click', () => {
      this.hideVendor();
      this.onVendorClose();
    });
    this.stashClose.addEventListener('click', () => {
      this.hideStash();
      this.onStashClose();
    });
    this.displacerClose.addEventListener('click', () => {
      this.hideDisplacerNetwork();
      this.onDisplacerClose();
    });
    this.playerName.textContent = profile.name.trim() || 'Heroi de Aranna';

    this.setMenuOpen(false);
    this.setTalentPanelOpen(false);
  }

  toggleInventory(): void {
    this.toggleMenu();
  }

  toggleCharacter(): void {
    this.toggleMenu();
  }

  showCharacterMenu(): void {
    this.setMenuOpen(true);
  }

  setCharacterTrainingContext(label: string | null): void {
    if (this.characterTrainingContext === label) return;
    this.characterTrainingContext = label;
    this.characterRenderKey = '';
  }

  toggleMenu(): void {
    this.setMenuOpen(!this.gameMenuOpen);
  }

  toggleTalents(): void {
    this.setTalentPanelOpen(!this.talentPanelOpen);
  }

  setTalentPanelOpen(open: boolean): void {
    if (open === this.talentPanelOpen) {
      this.talentPanel.hidden = !open;
      this.talentPanel.classList.toggle('open', open);
      this.talentPanel.setAttribute('aria-hidden', String(!open));
      return;
    }
    if (open) {
      this.talentPreviousFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    this.talentPanelOpen = open;
    this.talentPanel.hidden = !open;
    this.talentPanel.classList.toggle('open', open);
    this.talentPanel.setAttribute('aria-hidden', String(!open));
    if (open) {
      this.talentClose.focus({ preventScroll: true });
      return;
    }
    const restoreFocus = this.talentPreviousFocus;
    this.talentPreviousFocus = null;
    if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  }

  /** Escape fecha primeiro o dialog; sem dialog aberto, o Game cancela a intencao normal. */
  closeTalentPanel(): boolean {
    if (!this.talentPanelOpen) return false;
    this.setTalentPanelOpen(false);
    return true;
  }

  setRenderQuality(mode: RenderQualityMode, level: RenderQualityLevel): void {
    const label: Record<RenderQualityLevel, string> = {
      high: 'ALTA',
      medium: 'MEDIA',
      low: 'BAIXA',
    };
    this.qualityChip.textContent = mode === 'auto' ? `AUTO ${label[level]}` : label[level];
    this.qualityChip.dataset.mode = mode;
    this.qualityChip.dataset.level = level;
  }

  showPlayerContextMenu(context: HudPlayerContext): void {
    this.activePlayerContextId = context.id;
    this.activePlayerContextName = context.name || 'Jogador';
    this.activePlayerContextLevel = context.level;
    this.activePlayerContextHp = context.hp;
    this.activePlayerContextMaxHp = context.maxHp;
    this.playerContextName.textContent = context.name || 'Jogador';
    this.playerContextDetail.textContent = `Warrior nivel ${context.level}`;
    this.updatePlayerContextFriendAction(context.id);
    const width = 214;
    const height = 186;
    const x = Math.min(Math.max(12, context.x), Math.max(12, window.innerWidth - width - 12));
    const y = Math.min(Math.max(12, context.y), Math.max(12, window.innerHeight - height - 12));
    this.playerContextMenu.style.left = `${x}px`;
    this.playerContextMenu.style.top = `${y}px`;
    this.playerContextMenu.hidden = false;
  }

  hidePlayerContextMenu(): void {
    this.activePlayerContextId = null;
    this.activePlayerContextName = '';
    this.activePlayerContextLevel = 1;
    this.activePlayerContextHp = 0;
    this.activePlayerContextMaxHp = 0;
    this.updatePlayerContextFriendAction(null);
    this.playerContextMenu.hidden = true;
  }

  syncPlayerContextTargets(availablePlayerIds: ReadonlySet<string>): void {
    if (!this.activePlayerContextId) return;
    if (availablePlayerIds.has(this.activePlayerContextId)) return;
    this.hidePlayerContextMenu();
  }

  pushSystemMessage(message: string): void {
    const text = message.trim();
    if (!text) return;
    const row = document.createElement('div');
    row.className = 'system-feed-message';
    row.textContent = text;
    this.systemFeed.append(row);
    while (this.systemFeed.children.length > 5) {
      this.systemFeed.firstElementChild?.remove();
    }
    window.setTimeout(() => row.remove(), 6500);
  }

  openChat(): void {
    this.chatActive = true;
    this.chatPanel.dataset.active = 'true';
    this.chatInput.focus();
  }

  openChatWithDraft(draft: string): void {
    this.openChat();
    this.chatInput.value = draft;
    this.syncChatDraftChannel();
    this.chatInput.setSelectionRange(this.chatInput.value.length, this.chatInput.value.length);
  }

  closeChat(): void {
    this.chatActive = false;
    this.chatPanel.dataset.active = 'false';
    this.chatInput.blur();
  }

  private submitChatInput(): void {
    const parsed = parseChatInput(this.chatInput.value);
    if (parsed.message) this.onChatSend(parsed.channel, parsed.message);
    this.chatInput.value = '';
    this.syncChatDraftChannel();
    this.closeChat();
  }

  private syncChatDraftChannel(): void {
    const channel = parseChatInput(this.chatInput.value).channel;
    this.chatForm.dataset.channel = channel;
    if (this.chatChannelSelect.value !== channel) this.chatChannelSelect.value = channel;
  }

  private applyChatChannelSelection(channel: ChatChannel): void {
    const parsed = parseChatInput(this.chatInput.value);
    this.chatInput.value = chatDraftFor(channel, parsed.message);
    this.chatInput.setSelectionRange(this.chatInput.value.length, this.chatInput.value.length);
    this.syncChatDraftChannel();
    this.openChat();
  }

  pushChatMessage(message: ChatMessageState, localPlayerId: string): void {
    const row = document.createElement('div');
    row.className = 'chat-message';
    row.dataset.channel = message.channel;
    row.classList.toggle('self', message.senderId === localPlayerId);
    const channel = document.createElement('span');
    channel.className = 'chat-channel';
    channel.textContent = chatChannelLabel(message.channel);
    const body = document.createElement('span');
    body.className = 'chat-body';
    if (message.channel === 'system') {
      body.textContent = message.message;
    } else {
      const sender = document.createElement('strong');
      sender.textContent = `${message.senderName}:`;
      const text = document.createElement('span');
      text.textContent = message.message;
      body.append(sender, text);
    }
    row.append(channel, body);
    this.chatMessages.append(row);
    while (this.chatMessages.children.length > 60) {
      this.chatMessages.firstElementChild?.remove();
    }
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  setQuestTrackerActionable(actionable: boolean): void {
    if (this.questTrackerActionable === actionable) return;
    this.questTrackerActionable = actionable;
    if (!actionable) this.onQuestTrackerHover(false);
    this.updateQuestTrackerAccess(!this.questPanel.hidden);
  }

  setQuestTrackerRoute(label: string): void {
    if (this.questTrackerRouteText === label) return;
    this.questTrackerRouteText = label;
    this.renderQuestTrackerRoute(!this.questPanel.hidden);
  }

  private updateQuestTrackerAccess(visible: boolean): void {
    const enabled = visible && this.questTrackerActionable;
    this.questPanel.classList.toggle('trackable', enabled);
    this.questPanel.tabIndex = enabled ? 0 : -1;
    this.questPanel.setAttribute('role', enabled ? 'button' : 'region');
    this.questPanel.title = enabled ? 'Navegar para objetivo' : '';
  }

  private renderQuestTrackerRoute(visible: boolean): void {
    const routeVisible = visible && this.questTrackerRouteText.trim() !== '';
    this.questRoute.hidden = !routeVisible;
    this.questRoute.textContent = routeVisible ? this.questTrackerRouteText : '';
  }

  showZoneBanner(zone: WorldZone): void {
    if (this.zoneBannerTimer !== null) {
      window.clearTimeout(this.zoneBannerTimer);
      this.zoneBannerTimer = null;
    }
    this.zoneBannerKicker.textContent = zone === 'dungeon' ? 'Masmorra' : 'Acampamento';
    this.zoneBannerName.textContent = zone === 'dungeon' ? 'Camara das Sombras' : 'Terras de Aranna';
    this.zoneBanner.classList.add('open');
    this.zoneBanner.setAttribute('aria-hidden', 'false');
    this.zoneBannerTimer = window.setTimeout(() => {
      this.zoneBanner.classList.remove('open');
      this.zoneBanner.setAttribute('aria-hidden', 'true');
      this.zoneBannerTimer = null;
    }, 1800);
  }

  private zoneLabel(zone: WorldZone): string {
    return zone === 'dungeon' ? 'Camara das Sombras' : 'Terras de Aranna';
  }

  setNpcMinimapMarkers(markers: HudMinimapNpc[]): void {
    const key = markers
      .map((marker) => `${marker.id}:${marker.zone}:${marker.position.x.toFixed(2)}:${marker.position.z.toFixed(2)}:${marker.kind}:${marker.marker ?? ''}:${marker.active ? 1 : 0}:${marker.pending ? 1 : 0}:${marker.selected ? 1 : 0}:${marker.objective ? 1 : 0}:${marker.hovered ? 1 : 0}`)
      .join('|');
    if (key === this.minimapNpcKey) return;
    this.minimapNpcKey = key;
    this.minimapNpcs = markers;
    this.minimapRenderKey = '';
  }

  setNpcServiceDestinations(destinations: HudNpcDestination[], zone: WorldZone): void {
    const zoneLabel = this.zoneLabel(zone);
    const visible = destinations.filter((destination) => destination.zone === zone);
    const key = `${zone}:${visible.map((destination) => `${destination.id}:${destination.marker}:${destination.kind}:${destination.name}:${destination.title}:${destination.statusLabel ?? ''}:${destination.distanceLabel ?? ''}:${destination.active ? 1 : 0}:${destination.selected ? 1 : 0}:${destination.nearby ? 1 : 0}:${destination.pending ? 1 : 0}:${destination.hovered ? 1 : 0}:${destination.objective ? 1 : 0}`).join('|')}`;
    if (key === this.npcServiceKey) return;
    this.npcServiceKey = key;
    this.npcServiceZone.textContent = zoneLabel;
    this.npcServiceItems.replaceChildren();
    this.npcServicePanel.classList.toggle('open', visible.length > 0);
    this.npcServicePanel.setAttribute('aria-hidden', visible.length > 0 ? 'false' : 'true');
    for (const destination of visible) {
      const subtitle = npcServiceDestinationSubtitle(destination);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'npc-service-button';
      button.classList.toggle('active', !!destination.active);
      button.classList.toggle('selected', !!destination.selected);
      button.classList.toggle('nearby', !!destination.nearby);
      button.classList.toggle('pending', !!destination.pending);
      button.classList.toggle('hovered', !!destination.hovered);
      button.classList.toggle('objective', !!destination.objective);
      button.dataset.kind = destination.kind;
      button.title = `${destination.name} - ${destination.title}`;
      const marker = document.createElement('span');
      marker.className = 'npc-service-marker';
      marker.textContent = destination.marker;
      const label = document.createElement('strong');
      label.textContent = destination.name;
      const role = document.createElement('em');
      role.className = 'npc-service-role';
      role.textContent = npcServiceRoleLabel(destination.kind);
      const title = document.createElement('small');
      title.textContent = subtitle;
      button.append(marker, label, role, title);
      button.addEventListener('pointerenter', () => this.onNpcDestinationHover(destination.id));
      button.addEventListener('pointerleave', () => this.onNpcDestinationHover(null));
      button.addEventListener('focus', () => this.onNpcDestinationHover(destination.id));
      button.addEventListener('blur', () => this.onNpcDestinationHover(null));
      button.addEventListener('click', () => this.onNpcDestination(destination.id));
      this.npcServiceItems.append(button);
    }
  }

  showNpcDialogue(dialogue: HudNpcDialoguePanel): void {
    if (!this.npcDialogue.classList.contains('open')) {
      this.npcDialoguePreviousFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    this.activeNpcDialogue = dialogue;
    this.npcDialogueActionPending = false;
    this.npcDialogueTitle.textContent = dialogue.title;
    this.npcDialogueName.textContent = dialogue.name;
    this.npcDialogueGreeting.textContent = dialogue.greeting;
    this.npcDialogueStatus.hidden = true;
    this.npcDialogueStatus.textContent = '';
    this.npcDialogueAction.textContent = dialogue.actionLabel;
    this.npcDialogue.dataset.kind = dialogue.kind;
    if (dialogue.quest) {
      this.renderNpcDialogueQuest(dialogue.quest);
    } else {
      this.npcDialogueQuest.hidden = true;
      this.npcDialogueReward.hidden = true;
      this.npcDialogueAction.disabled = !!dialogue.actionDisabled;
    }
    this.renderNpcDialogueProfessions(dialogue.kind === 'blacksmith' ? dialogue.professions : undefined);
    this.renderNpcDialogueForge(dialogue.forgeRecipes ?? []);
    this.npcDialogue.classList.add('open');
    this.npcDialogue.setAttribute('aria-hidden', 'false');
    window.queueMicrotask(() => this.npcDialogueClose.focus({ preventScroll: true }));
  }

  showNpcPrompt(prompt: HudNpcPrompt): void {
    const key = `${prompt.id}:${prompt.actionLabel}`;
    const activeKey = this.activeNpcPrompt ? `${this.activeNpcPrompt.id}:${this.activeNpcPrompt.actionLabel}` : '';
    this.activeNpcPrompt = prompt;
    if (key !== activeKey) {
      this.npcPromptAction.textContent = prompt.actionLabel;
      this.npcPromptName.textContent = prompt.name;
      this.npcPromptTitle.textContent = prompt.title;
      this.npcPrompt.dataset.kind = prompt.kind;
    }
    this.npcPrompt.classList.add('open');
    this.npcPrompt.setAttribute('aria-hidden', 'false');
  }

  hideNpcPrompt(): void {
    if (!this.activeNpcPrompt) return;
    this.activeNpcPrompt = null;
    this.npcPrompt.classList.remove('open');
    this.npcPrompt.setAttribute('aria-hidden', 'true');
  }

  hideNpcDialogue(): void {
    const restoreFocus = this.npcDialoguePreviousFocus;
    this.npcDialoguePreviousFocus = null;
    this.activeNpcDialogue = null;
    this.npcDialogueActionPending = false;
    this.npcDialogue.classList.remove('open');
    this.npcDialogue.setAttribute('aria-hidden', 'true');
    this.npcDialogueStatus.hidden = true;
    this.npcDialogueStatus.textContent = '';
    this.npcDialogueForge.hidden = true;
    this.npcDialogueForge.replaceChildren();
    this.npcDialogueProfessions.hidden = true;
    this.npcDialogueProfessions.replaceChildren();
    if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  }

  updateNpcDialogueQuest(quest: QuestState, actionLabel?: string): void {
    if (!this.activeNpcDialogue || this.activeNpcDialogue.kind !== 'quest') return;
    this.activeNpcDialogue = {
      ...this.activeNpcDialogue,
      quest,
      actionLabel: actionLabel ?? this.activeNpcDialogue.actionLabel,
    };
    if (quest.rewardClaimed) {
      this.npcDialogueActionPending = false;
      this.setNpcDialogueStatus('Recompensa recebida.');
    }
    this.renderNpcDialogueQuest(quest);
  }

  setNpcDialogueStatus(message: string): void {
    if (!this.activeNpcDialogue) return;
    this.npcDialogueStatus.textContent = message;
    this.npcDialogueStatus.hidden = message.trim() === '';
  }

  setNpcDialogueActionPending(pending: boolean): void {
    if (!this.activeNpcDialogue) return;
    this.npcDialogueActionPending = pending;
    if (this.activeNpcDialogue.quest) {
      this.renderNpcDialogueQuest(this.activeNpcDialogue.quest);
    } else {
      this.npcDialogueAction.disabled = pending || !!this.activeNpcDialogue.actionDisabled;
      this.npcDialogueAction.textContent = pending ? 'Enviando' : this.activeNpcDialogue.actionLabel;
    }
  }

  updateNpcDialogueActionLabel(label: string, disabled = false): void {
    if (!this.activeNpcDialogue) return;
    this.activeNpcDialogue = { ...this.activeNpcDialogue, actionLabel: label, actionDisabled: disabled };
    if (this.activeNpcDialogue.quest) {
      this.renderNpcDialogueQuest(this.activeNpcDialogue.quest);
      return;
    }
    if (!this.npcDialogueActionPending) {
      this.npcDialogueAction.textContent = label;
      this.npcDialogueAction.disabled = disabled;
    }
  }

  updateForgeRecipes(recipes: HudForgeRecipe[]): void {
    if (!this.activeNpcDialogue || this.activeNpcDialogue.kind !== 'blacksmith') return;
    this.activeNpcDialogue = { ...this.activeNpcDialogue, forgeRecipes: recipes };
    this.renderNpcDialogueForge(recipes);
  }

  updateNpcDialogueProfessions(professions: ProfessionsState): void {
    if (!this.activeNpcDialogue || this.activeNpcDialogue.kind !== 'blacksmith') return;
    this.activeNpcDialogue = { ...this.activeNpcDialogue, professions };
    this.renderNpcDialogueProfessions(professions);
  }

  private renderNpcDialogueProfessions(professions: ProfessionsState | undefined): void {
    this.npcDialogueProfessions.replaceChildren();
    this.npcDialogueProfessions.hidden = !professions;
    if (!professions) return;

    const heading = document.createElement('div');
    heading.className = 'profession-summary-heading';
    const title = document.createElement('strong');
    title.textContent = 'Ofícios do herói';
    const hint = document.createElement('small');
    hint.textContent = 'Progresso persistente';
    heading.append(title, hint);
    this.npcDialogueProfessions.append(heading);

    const cards = document.createElement('div');
    cards.className = 'profession-summary-cards';
    cards.append(
      this.professionSummaryCard(professions.mining),
      this.professionSummaryCard(professions.smithing),
    );
    this.npcDialogueProfessions.append(cards);

    if (professions.contracts.length > 0) {
      const contracts = document.createElement('div');
      contracts.className = 'profession-contracts';
      for (const contract of professions.contracts) contracts.append(this.professionContractCard(contract));
      this.npcDialogueProfessions.append(contracts);
    }
  }

  private professionSummaryCard(profession: ProfessionProgressState): HTMLElement {
    const card = document.createElement('section');
    card.className = 'profession-summary-card';
    card.dataset.profession = profession.id;
    const maxed = profession.level >= profession.maxLevel;
    const ratio = maxed ? 1 : barRatio(profession.xpIntoLevel, profession.xpToNext);

    const heading = document.createElement('div');
    const icon = document.createElement('span');
    icon.className = 'profession-summary-icon';
    icon.textContent = profession.id === 'mining' ? '⛏' : '⚒';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('strong');
    label.textContent = profession.label;
    const level = document.createElement('em');
    level.textContent = `Nv ${profession.level}`;
    heading.append(icon, label, level);

    const progress = document.createElement('div');
    progress.className = 'profession-summary-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', `${profession.label}, nível ${profession.level}`);
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', String(maxed ? 1 : profession.xpToNext));
    progress.setAttribute('aria-valuenow', String(maxed ? 1 : profession.xpIntoLevel));
    const fill = document.createElement('span');
    fill.style.width = `${ratio * 100}%`;
    progress.append(fill);

    const detail = document.createElement('small');
    if (maxed) {
      detail.textContent = 'Domínio máximo';
    } else {
      detail.textContent = `${profession.xpIntoLevel}/${profession.xpToNext} XP`;
    }
    if (profession.id === 'mining' && (profession.bonusYieldChance ?? 0) > 0) {
      detail.textContent += ` · +${Math.round((profession.bonusYieldChance ?? 0) * 100)}% minério extra`;
    }

    card.append(heading, progress, detail);
    return card;
  }

  private professionContractCard(contract: ProfessionContractState): HTMLElement {
    const card = document.createElement('section');
    card.className = 'profession-contract';
    card.dataset.state = contract.claimed
      ? 'claimed'
      : contract.claimable
        ? 'claimable'
        : contract.completed
          ? 'completed'
          : 'progress';

    const heading = document.createElement('div');
    heading.className = 'profession-contract-heading';
    const copy = document.createElement('span');
    const kicker = document.createElement('small');
    kicker.textContent = 'Contrato de Borin';
    const title = document.createElement('strong');
    title.textContent = contract.title;
    copy.append(kicker, title);
    const state = document.createElement('em');
    state.textContent = contract.claimed
      ? 'Concluído'
      : contract.claimable
        ? 'Pronto'
        : contract.completed
          ? 'Concluído'
          : 'Em progresso';
    heading.append(copy, state);
    card.append(heading);

    if (contract.description) {
      const description = document.createElement('p');
      description.textContent = contract.description;
      card.append(description);
    }

    const objectives = document.createElement('div');
    objectives.className = 'profession-contract-objectives';
    objectives.setAttribute('role', 'list');
    for (const objective of contract.objectives) {
      const row = document.createElement('div');
      row.className = 'profession-contract-objective';
      row.dataset.completed = objective.completed ? 'true' : 'false';
      row.setAttribute('role', 'listitem');
      const marker = document.createElement('span');
      marker.className = 'profession-contract-objective-marker';
      marker.textContent = objective.completed ? '✓' : '•';
      marker.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = objective.label;
      const progress = document.createElement('strong');
      progress.textContent = `${objective.current}/${objective.goal}`;
      row.setAttribute(
        'aria-label',
        `${objective.label}: ${objective.current} de ${objective.goal}${objective.completed ? ', concluído' : ''}`,
      );
      row.append(marker, label, progress);
      objectives.append(row);
    }
    if (contract.objectives.length > 0) card.append(objectives);

    const footer = document.createElement('div');
    footer.className = 'profession-contract-footer';
    const reward = document.createElement('span');
    reward.className = 'profession-contract-reward';
    const rewardLabel = document.createElement('small');
    rewardLabel.textContent = 'Recompensa';
    const rewardText = document.createElement('strong');
    rewardText.textContent = contract.rewardText || 'Recompensa do contrato';
    reward.append(rewardLabel, rewardText);

    const pending = this.professionContractPendingId === contract.id;
    const anotherPending = this.professionContractPendingId !== null && !pending;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'profession-contract-action';
    action.dataset.contractId = contract.id;
    action.disabled = contract.claimed || !contract.claimable || pending || anotherPending;
    action.textContent = contract.claimed
      ? 'Concluído'
      : pending
        ? 'Resgatando…'
        : contract.claimable
          ? 'Resgatar'
          : contract.completed
            ? 'Aguardando'
            : 'Em progresso';
    action.setAttribute('aria-label', `${action.textContent}: ${contract.title}`);
    if (pending) action.setAttribute('aria-busy', 'true');
    action.addEventListener('click', () => {
      if (!this.activeNpcDialogue || action.disabled) return;
      this.onProfessionContractClaim(this.activeNpcDialogue.id, contract.id);
    });
    footer.append(reward, action);
    card.append(footer);
    return card;
  }

  setProfessionContractPending(contractId: string, pending: boolean): void {
    if (pending) this.professionContractPendingId = contractId;
    else if (this.professionContractPendingId === contractId) this.professionContractPendingId = null;
    if (this.activeNpcDialogue?.kind === 'blacksmith') {
      this.renderNpcDialogueProfessions(this.activeNpcDialogue.professions);
    }
  }

  setForgeRecipePending(recipeId: string, pending: boolean): void {
    if (!this.activeNpcDialogue?.forgeRecipes) return;
    const recipes = this.activeNpcDialogue.forgeRecipes.map((recipe) => (
      recipe.id === recipeId ? { ...recipe, pending } : recipe
    ));
    this.activeNpcDialogue = { ...this.activeNpcDialogue, forgeRecipes: recipes };
    this.renderNpcDialogueForge(recipes);
  }

  private renderNpcDialogueForge(recipes: readonly HudForgeRecipe[]): void {
    const focusedRecipeId = this.npcDialogueForge.contains(document.activeElement)
      && document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.recipeId
      : undefined;
    this.npcDialogueForge.replaceChildren();
    this.npcDialogueForge.hidden = recipes.length === 0;
    if (recipes.length === 0) return;

    const groups: Array<{
      type: ForgeRecipeState['recipeType'];
      title: string;
      hint: string;
    }> = [
      { type: 'smelting', title: 'Fundir barras', hint: 'Minérios → barras' },
      { type: 'tool', title: 'Forjar picaretas', hint: 'Ferramenta permanente do ofício' },
      { type: 'equipment', title: 'Forjar equipamentos', hint: 'Barras → item único' },
    ];

    for (const group of groups) {
      const groupRecipes = recipes.filter((recipe) => recipe.recipeType === group.type);
      if (groupRecipes.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'forge-recipe-section';
      section.dataset.recipeType = group.type;
      const heading = document.createElement('div');
      heading.className = 'forge-recipe-heading';
      const title = document.createElement('strong');
      title.textContent = group.title;
      const hint = document.createElement('small');
      hint.textContent = group.hint;
      heading.append(title, hint);
      const list = document.createElement('div');
      list.className = 'forge-recipe-list';
      section.append(heading, list);

      for (const recipe of groupRecipes) {
        const currentSmithingLevel = this.activeNpcDialogue?.professions?.smithing.level ?? 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'forge-recipe';
        button.dataset.ore = recipe.ingredients[0]?.kind ?? recipe.inputKind;
        button.dataset.recipeId = recipe.id;
        button.dataset.recipeType = recipe.recipeType;
        button.dataset.professionLocked = recipe.professionLocked ? 'true' : 'false';
        button.dataset.toolLocked = recipe.toolLocked ? 'true' : 'false';
        button.dataset.toolOwned = recipe.toolOwned ? 'true' : 'false';
        if (recipe.outputRarity) {
          button.dataset.rarity = recipe.outputRarity;
          button.style.setProperty('--forge-rarity', RARITY_COLORS[recipe.outputRarity]);
        }
        const setOutput = equipmentSetForgeOutputPresentation(recipe);
        if (setOutput) {
          button.dataset.setId = setOutput.definition.id;
          button.style.setProperty('--forge-set', EQUIPMENT_SET_COLORS[setOutput.definition.id]);
        }
        button.disabled = recipe.disabled || !!recipe.pending;
        const baseItemLevelBonus = recipe.itemLevelBonus ?? 0;
        const masteryDetail = recipe.masteryItemLevelBonus > 0
          ? ` (${baseItemLevelBonus} da receita + ${recipe.masteryItemLevelBonus} por domínio)`
          : '';
        button.title = recipe.professionLocked
          ? `Requer Ferraria Nv ${recipe.requiredLevel}; nível atual ${currentSmithingLevel}.`
          : recipe.toolOwned
            ? 'Ferramenta permanente já incorporada ao ofício de Mineração.'
            : recipe.toolLocked
              ? `Requer primeiro ${recipe.requiredToolLabel}.`
          : recipe.recipeType === 'equipment' && recipe.currentItemLevelBonus > 0
            ? `Item level +${recipe.currentItemLevelBonus}${masteryDetail}.`
            : `Concede ${recipe.xpReward} XP de Ferraria.`;
        const icon = document.createElement('img');
        icon.src = itemIconFor(recipe.outputKind, recipe.outputRarity);
        icon.alt = '';
        icon.draggable = false;
        const copy = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = recipe.label;
        const requirement = document.createElement('small');
        requirement.className = 'forge-recipe-requirement';
        requirement.dataset.locked = recipe.professionLocked || recipe.toolLocked ? 'true' : 'false';
        requirement.textContent = recipe.professionLocked
          ? `🔒 Requer Ferraria Nv ${recipe.requiredLevel} · atual Nv ${currentSmithingLevel}`
          : recipe.toolLocked
            ? `🔒 Requer ${recipe.requiredToolLabel}`
            : recipe.toolOwned
              ? `✓ Progressão concluída · picareta atual tier ${recipe.currentToolTier}`
          : `Ferraria Nv ${recipe.requiredLevel} · +${recipe.xpReward} XP`;
        const cost = document.createElement('small');
        cost.className = 'forge-recipe-cost';
        cost.textContent = recipe.ingredients.map((ingredient) => (
          `${ingredient.count} ${ITEM_BASE_NAMES[ingredient.kind]} (${ingredient.owned})`
        )).join(' + ');
        cost.dataset.missing = recipe.ingredients.some((ingredient) => ingredient.owned < ingredient.count)
          ? 'true'
          : 'false';
        const result = document.createElement('em');
        if (recipe.pending) {
          result.textContent = recipe.recipeType === 'smelting' ? 'Fundindo…' : 'Forjando…';
        } else if (recipe.professionLocked) {
          result.textContent = 'Receita bloqueada';
        } else if (recipe.toolOwned) {
          result.textContent = 'Já forjada · vinculada ao ofício';
        } else if (recipe.toolLocked) {
          result.textContent = 'Progressão anterior necessária';
        } else if (recipe.recipeType === 'tool') {
          result.textContent = 'Forjar e equipar · permanente';
        } else if (recipe.recipeType === 'equipment') {
          const rarity = RARITY_LABELS[recipe.outputRarity ?? 'comum'];
          const level = recipe.currentItemLevelBonus > 0 ? ` · item level +${recipe.currentItemLevelBonus}` : '';
          const setLabel = setOutput ? ` · ${setOutput.definition.label}` : '';
          result.textContent = `Forjar · ${rarity}${setLabel}${level} · possui ${recipe.outputOwned}`;
        } else {
          result.textContent = `Fundir ${recipe.outputCount} · possui ${recipe.outputOwned}`;
        }
        copy.append(name, requirement, cost, result);
        button.append(icon, copy);
        button.addEventListener('click', () => {
          if (!this.activeNpcDialogue || button.disabled) return;
          this.onForgeRecipe(this.activeNpcDialogue.id, recipe.id, 1);
        });
        list.append(button);
      }
      this.npcDialogueForge.append(section);
    }
    if (focusedRecipeId) {
      window.queueMicrotask(() => {
        const next = [...this.npcDialogueForge.querySelectorAll<HTMLButtonElement>('.forge-recipe')]
          .find((button) => button.dataset.recipeId === focusedRecipeId && !button.disabled);
        (next ?? this.npcDialogueClose).focus({ preventScroll: true });
      });
    }
  }

  showVendor(vendor: HudVendorPanel): void {
    this.activeVendor = vendor;
    this.vendorPendingItemIds.clear();
    this.vendorSellPending = false;
    this.vendorTitle.textContent = vendor.title;
    this.vendorName.textContent = vendor.name;
    this.vendorCoins.textContent = `${vendor.coins} moedas`;
    this.vendorStatus.hidden = true;
    this.vendorStatus.textContent = '';
    this.renderVendorItems(vendor);
    this.vendorPanel.classList.add('open');
    this.vendorPanel.setAttribute('aria-hidden', 'false');
  }

  hideVendor(): void {
    this.activeVendor = null;
    this.vendorPendingItemIds.clear();
    this.vendorSellPending = false;
    this.vendorPanel.classList.remove('open');
    this.vendorPanel.setAttribute('aria-hidden', 'true');
    this.vendorStatus.hidden = true;
    this.vendorStatus.textContent = '';
  }

  showStash(stash: HudStashPanel): void {
    this.activeStash = stash;
    this.stashPendingKeys.clear();
    this.stashTitle.textContent = stash.title;
    this.stashName.textContent = stash.name;
    this.stashStatus.hidden = true;
    this.stashStatus.textContent = '';
    this.renderStashItems(stash);
    this.stashPanel.classList.add('open');
    this.stashPanel.setAttribute('aria-hidden', 'false');
  }

  updateStash(stash: HudStashPanel): void {
    if (!this.activeStash) return;
    this.activeStash = stash;
    this.stashTitle.textContent = stash.title;
    this.stashName.textContent = stash.name;
    this.renderStashItems(stash);
  }

  hideStash(): void {
    this.activeStash = null;
    this.stashPendingKeys.clear();
    this.stashPanel.classList.remove('open');
    this.stashPanel.setAttribute('aria-hidden', 'true');
    this.stashStatus.hidden = true;
    this.stashStatus.textContent = '';
  }

  showDisplacerNetwork(states: readonly DisplacerState[], sourceId: string, difficulty: DifficultyState): void {
    const source = states.find((state) => state.id === sourceId && state.current && state.activated);
    if (!source) {
      this.hideDisplacerNetwork();
      return;
    }
    this.activeDisplacerSourceId = source.id;
    this.activeDifficulty = difficulty;
    this.displacerPanelName.textContent = source.label;
    this.displacerDestinations.replaceChildren();
    for (const destination of states) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'displacer-destination';
      button.dataset.state = destination.current
        ? 'current'
        : destination.canTravel
          ? 'available'
          : destination.activated
            ? 'blocked'
            : 'undiscovered';
      button.disabled = !destination.canTravel;
      button.style.setProperty('--displacer-accent', displacerColor(destination));

      const glyph = document.createElement('span');
      glyph.className = 'displacer-destination-glyph';
      glyph.textContent = destination.current ? '◈' : destination.activated ? '◇' : '◆';
      const copy = document.createElement('span');
      copy.className = 'displacer-destination-copy';
      const name = document.createElement('strong');
      name.textContent = destination.label;
      const detail = document.createElement('small');
      const zone = destination.zone === 'dungeon' ? 'Câmara das Sombras' : 'Terras de Aranna';
      detail.textContent = destination.current
        ? `${zone} · âncora atual`
        : destination.canTravel
          ? `${zone} · viajar agora`
          : `${zone} · ${destination.lockedReason || `requer nível ${destination.requiredLevel}`}`;
      copy.append(name, detail);
      button.append(glyph, copy);
      button.addEventListener('click', () => {
        if (button.disabled || !this.activeDisplacerSourceId) return;
        this.onDisplacerTravel(destination.id);
      });
      this.displacerDestinations.append(button);
    }
    const showDifficulty = source.id === 'displacer-camp';
    this.difficultySelector.hidden = !showDifficulty;
    this.difficultyOptions.replaceChildren();
    if (showDifficulty) {
      for (const option of difficulty.options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'difficulty-option';
        button.dataset.difficulty = option.id;
        button.dataset.selected = String(option.selected);
        button.disabled = !option.canSelect;
        button.style.setProperty('--difficulty-accent', DIFFICULTY_PALETTE[option.id]);
        const name = document.createElement('strong');
        name.textContent = option.label;
        const definition = option.id === difficulty.id ? difficulty : null;
        const detail = document.createElement('small');
        detail.textContent = option.selected
          ? `Atual · ${Math.round((difficulty.xpMultiplier - 1) * 100)}% XP · ${difficulty.affixesPerEnemy} afixo(s)`
          : option.canSelect
            ? option.description
            : option.lockedReason || `Requer nível ${option.requiredLevel}`;
        const badge = document.createElement('span');
        badge.textContent = option.selected ? 'ATUAL' : option.canSelect ? 'ESCOLHER' : `NV ${option.requiredLevel}`;
        button.append(name, detail, badge);
        button.title = definition
          ? `Vida inimiga ×${definition.enemyHpMultiplier.toFixed(2)} · dano ×${definition.enemyDamageMultiplier.toFixed(2)} · raro+ ${Math.round(definition.rarePlusChance * 100)}%`
          : option.description;
        button.addEventListener('click', () => {
          if (button.disabled || !this.activeDisplacerSourceId) return;
          this.onDifficultySelect(option.id);
        });
        this.difficultyOptions.append(button);
      }
      this.difficultyLock.hidden = difficulty.canChange;
      this.difficultyLock.textContent = difficulty.canChange ? '' : difficulty.lockedReason || 'Troca indisponível.';
      this.difficultySummary.textContent = [
        `Vida ×${difficulty.enemyHpMultiplier.toFixed(2)}`,
        `Dano ×${difficulty.enemyDamageMultiplier.toFixed(2)}`,
        `Mov. ×${difficulty.enemySpeedMultiplier.toFixed(2)}`,
        `XP ×${difficulty.xpMultiplier.toFixed(2)}`,
        `Raro+ ${Math.round(difficulty.rarePlusChance * 100)}%`,
        `Poder +${difficulty.itemPowerBonus}`,
      ].join(' · ');
    }
    this.displacerPanel.classList.add('open');
    this.displacerPanel.setAttribute('aria-hidden', 'false');
  }

  updateDisplacerNetwork(states: readonly DisplacerState[], difficulty: DifficultyState): void {
    if (!this.activeDisplacerSourceId) return;
    this.showDisplacerNetwork(states, this.activeDisplacerSourceId, difficulty);
  }

  hideDisplacerNetwork(): void {
    this.activeDisplacerSourceId = null;
    this.displacerPanel.classList.remove('open');
    this.displacerPanel.setAttribute('aria-hidden', 'true');
    this.displacerDestinations.replaceChildren();
    this.difficultyOptions.replaceChildren();
    this.difficultySelector.hidden = true;
    this.difficultySummary.textContent = '';
  }

  isDisplacerNetworkOpen(): boolean {
    return this.activeDisplacerSourceId !== null;
  }

  setStashStatus(message: string): void {
    if (!this.activeStash) return;
    this.stashStatus.textContent = message;
    this.stashStatus.hidden = message.trim() === '';
  }

  setStashItemPending(itemId: string, action: 'deposit' | 'withdraw', pending: boolean): void {
    if (!this.activeStash) return;
    const key = `${action}:${itemId}`;
    if (pending) this.stashPendingKeys.add(key);
    else this.stashPendingKeys.delete(key);
    this.renderStashItems(this.activeStash);
  }

  clearStashPending(): void {
    if (!this.activeStash || this.stashPendingKeys.size === 0) return;
    this.stashPendingKeys.clear();
    this.renderStashItems(this.activeStash);
  }

  setVendorStatus(message: string): void {
    if (!this.activeVendor) return;
    this.vendorStatus.textContent = message;
    this.vendorStatus.hidden = message.trim() === '';
  }

  updateVendorCoins(coins: number): void {
    if (!this.activeVendor) return;
    this.vendorPendingItemIds.clear();
    this.activeVendor = { ...this.activeVendor, coins };
    this.vendorCoins.textContent = `${coins} moedas`;
    this.renderVendorItems(this.activeVendor);
  }

  setVendorSellPending(pending: boolean): void {
    if (!this.activeVendor) return;
    this.vendorSellPending = pending;
    this.renderVendorItems(this.activeVendor);
  }

  setVendorItemPending(itemId: string, pending: boolean): void {
    if (!this.activeVendor) return;
    if (pending) this.vendorPendingItemIds.add(itemId);
    else this.vendorPendingItemIds.delete(itemId);
    this.renderVendorItems(this.activeVendor);
  }

  clearVendorPending(): void {
    if (!this.activeVendor || (this.vendorPendingItemIds.size === 0 && !this.vendorSellPending)) return;
    this.vendorPendingItemIds.clear();
    this.vendorSellPending = false;
    this.renderVendorItems(this.activeVendor);
  }

  private renderNpcDialogueQuest(quest: QuestState): void {
    this.npcDialogueQuest.hidden = false;
    this.npcDialogueQuestTitle.textContent = quest.title;
    this.npcDialogueObjective.textContent = quest.objective;
    const ratio = quest.goal > 0 ? Math.min(1, Math.max(0, quest.progress / quest.goal)) : 0;
    this.npcDialogueProgress.style.width = `${ratio * 100}%`;
    const canAccept = !quest.accepted;
    const canClaimReward = quest.accepted && quest.completed && !quest.rewardClaimed;
    this.npcDialogueReward.hidden = !quest.accepted || !quest.completed;
    this.npcDialogueRewardText.textContent = quest.rewardClaimed
      ? 'Recebida'
      : quest.rewardText || '90 moedas | 2 pocoes | 1 mana | 120 EXP';
    this.npcDialogueAction.disabled = this.npcDialogueActionPending || (quest.accepted && quest.completed && quest.rewardClaimed);
    this.npcDialogueAction.textContent = this.npcDialogueActionPending
      ? 'Enviando'
      : canAccept
        ? 'Aceitar missao'
        : canClaimReward
          ? 'Receber recompensa'
          : quest.completed
            ? 'Concluida'
            : this.activeNpcDialogue?.actionLabel ?? 'Acompanhar';
  }

  update(snapshot: WorldSnapshot, player: EntityState | undefined, target?: EntityState, npcTarget?: HudNpcTarget): void {
    this.activeDifficulty = snapshot.difficulty;
    this.updateTarget(target, npcTarget, snapshot.entities);
    this.renderSealChamberTracker(snapshot);
    this.renderTreasureLodeTracker(snapshot);
    this.renderUtraeanRelayTracker(snapshot);
    this.renderArhokFrostTracker(snapshot);
    this.renderCorruptedJungleTracker(snapshot, player);
    if (!player) return;

    this.tooltipInventory = snapshot.inventory;
    this.tooltipEquipment = snapshot.equipment;
    this.tooltipEquipmentSets = equipmentSetStatesPresentationGate(player.equipmentSets ?? []) ?? [];

    this.levelEl.textContent = String(player.level);

    const hpRatio = barRatio(player.hp, player.maxHp);
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpText.textContent = `${Math.ceil(Math.max(0, player.hp))} / ${Math.round(player.maxHp)}`;

    const mana = player.mana ?? 0;
    const maxMana = player.maxMana ?? 0;
    const manaRatio = barRatio(mana, maxMana);
    this.manaFill.style.width = `${manaRatio * 100}%`;
    this.manaText.textContent = `${Math.ceil(Math.max(0, mana))} / ${maxMana}`;
    this.updateActiveEvasionIndicator(player);
    const doctrineGate = combatDoctrinePresentationGate(snapshot.talents, player.skills);
    const gatedDoctrineChoices = doctrineGate?.choices ?? null;
    this.activeDoctrineId = doctrineGate?.activeId ?? null;
    const sweepFormGate = steelSweepFormPresentationGate(snapshot.talents, player.skills);
    const gatedSweepFormChoices = sweepFormGate?.choices ?? null;
    this.activeSteelSweepFormId = sweepFormGate?.activeId ?? null;
    const normalizedPlayerSkills = normalizeSkillCatalog(player.skills);
    this.activeDoctrineModifierId = doctrineGate?.activeId ?? null;
    this.arcaneResonanceActive = arcaneResonanceSkillPresentationGate(player.skills, snapshot.masteries) !== null;
    this.guardianRetaliationActive = guardianRetaliationSkillPresentationGate(player.skills, snapshot.masteries) !== null;
    this.guardianRetaliationTargetId = guardianRetaliationBuffPresentationGate(player, snapshot.entities)?.target?.id ?? null;
    const mastery = martialMastery(snapshot.masteries);
    const arcana = arcanaMastery(snapshot.masteries, player.skills);
    const survival = survivalMastery(snapshot.masteries, player.skills);
    this.updateArcaneNovaHotbar(player, arcana);
    this.updateArcaneBoltHotbar(player, arcana);
    this.updateBulwarkCallHotbar(player, survival);
    this.updateStormOrbHotbar(player);
    this.updateFeralFormHotbar(player);
    this.updateRootSnareHotbar(player);
    this.updateChainLightningHotbar(player, arcana);
    this.updateRenewalWaveHotbar(player, survival);
    this.updatePhaseStepHotbar(player, arcana);
    this.updateNatureSpiritHotbar(player, survival, snapshot.natureSpirits);
    this.updateWarCryHotbar(player);
    this.updateHeavyStrikeHotbar(player, mastery);
    this.updateChargeHotbar(player, mastery);
    this.updateSteelSweepHotbar(player, snapshot, mastery);
    this.updateIronGuardHotbar(player, survival);
    this.updateTemporarySkillLocks(normalizedPlayerSkills);
    this.renderDoctrineSkillBadges(normalizedPlayerSkills);
    this.updateConsumableHotbar(snapshot);
    this.renderBuffs(
      Array.isArray(player.buffs) ? player.buffs : [],
      Array.isArray(player.statuses) ? player.statuses : [],
      this.activeDoctrineId,
    );
    this.renderParty(snapshot.party, player, snapshot.inventory);
    const friends = snapshot.friends ?? [];
    this.syncFriendPresenceFeedback(friends);
    this.renderFriends(friends);
    this.renderPartyInvites(snapshot.partyInvites);
    this.renderMartialMastery(mastery);
    this.renderArcanaMastery(arcana);
    this.renderSurvivalMastery(survival);
    this.renderSkillLoadout(player.skills, snapshot.masteries);
    this.renderTalents(
      snapshot.talents,
      snapshot.masteries,
      gatedDoctrineChoices,
      gatedSweepFormChoices,
    );

    const xp = player.xp ?? 0;
    const xpToNext = player.xpToNext ?? 1;
    this.xpFill.style.width = `${barRatio(xp, xpToNext) * 100}%`;

    this.deathOverlay.style.display = player.alive ? 'none' : 'flex';

    this.zoneName.textContent = snapshot.zone === 'overworld' ? 'Terras de Aranna' : 'Câmara das Sombras';
    const questVisible = snapshot.quest.accepted || snapshot.quest.rewardClaimed;
    this.questPanel.hidden = !questVisible;
    this.updateQuestTrackerAccess(questVisible);
    this.renderQuestTrackerRoute(questVisible);
    if (questVisible) {
      this.questTitle.textContent = snapshot.quest.title;
      this.questObjective.textContent = snapshot.quest.objective;
      this.questProgress.style.width = `${Math.min(100, (snapshot.quest.progress / snapshot.quest.goal) * 100)}%`;
    } else {
      this.questProgress.style.width = '0%';
    }
    const minimapKey = [
      snapshot.zone,
      snapshot.tick,
      this.minimapCanvas.clientWidth,
      this.minimapCanvas.clientHeight,
    ].join(':');
    if (minimapKey !== this.minimapRenderKey) {
      this.minimapRenderKey = minimapKey;
      this.renderMinimap(snapshot, player);
    }

    const inventoryKey = snapshot.inventory.map(itemRollRenderKey).join(',');
    if (inventoryKey !== this.inventoryRenderKey) {
      this.inventoryRenderKey = inventoryKey;
      this.renderInventory(snapshot.inventory);
    }

    const hotbarKey = HOTBAR_EQUIPMENT_SLOTS.map(({ slot }) => {
      const id = snapshot.equipment[slot];
      const item = id ? snapshot.inventory.find((candidate) => candidate.id === id) : undefined;
      return `${slot}:${id ?? ''}:${item ? itemRollRenderKey(item) : ''}`;
    }).join('|');
    if (hotbarKey !== this.hotbarRenderKey) {
      this.hotbarRenderKey = hotbarKey;
      this.renderHotbarEquipment(snapshot);
    }

    const attributes = player.attributes;
    const characterKey = [
      player.level,
      Math.ceil(player.hp),
      player.maxHp,
      Math.ceil(player.mana ?? 0),
      player.maxMana ?? 0,
      player.xp ?? 0,
      player.xpToNext ?? 0,
      player.attackDamage ?? 0,
      player.attackSpeed ?? 1,
      player.weaponDamageMin ?? 0,
      player.weaponDamageMax ?? 0,
      player.weaponMagicDamageMin ?? 0,
      player.weaponMagicDamageMax ?? 0,
      player.dodgeChance ?? 0,
      player.healthRegen ?? 0,
      attributes?.strength ?? 0,
      attributes?.agility ?? 0,
      attributes?.vitality ?? 0,
      attributes?.energy ?? 0,
      attributes?.unspentPoints ?? 0,
      snapshot.talents.talentPoints,
      snapshot.talents.spentPoints,
      snapshot.talents.availablePoints,
      ...Object.entries(snapshot.talents.talents).map(([id, rank]) => `${id}:${rank}`).sort(),
      snapshot.zone,
      ...this.tooltipEquipmentSets.map((set) => `${set.id}:${set.piecesEquipped}:${set.bonuses.map((bonus) => bonus.active ? 1 : 0).join('')}`),
      ...EQUIPMENT_SLOTS.map(({ slot }) => {
        const id = snapshot.equipment[slot];
        const item = id ? snapshot.inventory.find((candidate) => candidate.id === id) : undefined;
        return `${id ?? ''}:${item ? itemRollRenderKey(item) : ''}`;
      }),
    ].join('|');
    if (characterKey !== this.characterRenderKey) {
      this.characterRenderKey = characterKey;
      this.renderCharacter(snapshot, player);
    }
  }

  private updateActiveEvasionIndicator(player: EntityState): void {
    const presentation = activeEvasionStatePresentationGate(player);
    this.evadeIndicator.hidden = presentation === null;
    if (!presentation) {
      this.evadeIndicator.classList.remove('ready', 'active', 'cooldown');
      this.evadeIndicatorCooldown.textContent = '';
      return;
    }
    const { state, ready, evading, cooldownRatio } = presentation;
    this.evadeIndicator.classList.toggle('ready', ready);
    this.evadeIndicator.classList.toggle('active', evading);
    this.evadeIndicator.classList.toggle('cooldown', !ready && !evading);
    this.evadeIndicator.style.setProperty('--evade-trail', ACTIVE_EVASION_PALETTE.trail);
    this.evadeIndicator.style.setProperty('--evade-core', ACTIVE_EVASION_PALETTE.core);
    this.evadeIndicator.style.setProperty('--evade-cooldown', `${Math.max(0, Math.min(1, cooldownRatio)) * 100}%`);
    this.evadeIndicatorStatus.textContent = evading ? 'EVITANDO' : ready ? 'ESQUIVA PRONTA' : 'RECUPERANDO';
    this.evadeIndicatorCooldown.textContent = !ready && !evading && state.cooldownRemaining > 0
      ? state.cooldownRemaining.toFixed(1)
      : '';
  }

  private renderSealChamberTracker(snapshot: WorldSnapshot): void {
    const encounter = sealChamberStatePresentationGate(snapshot.encounter, snapshot.zone);
    this.sealChamberPanel.hidden = encounter === null;
    if (!encounter) {
      this.sealChamberPanel.dataset.phase = 'invalid';
      return;
    }

    const phaseLabels = {
      idle: 'Adormecida',
      arming: 'Despertando',
      wave: 'Em combate',
      intermission: 'Breve trégua',
      complete: 'Conquistada',
      cooldown: 'Silenciosa',
    } as const;
    this.sealChamberPanel.dataset.phase = encounter.phase;
    this.sealChamberPhase.textContent = phaseLabels[encounter.phase];
    this.sealChamberWave.textContent = encounter.wave > 0
      ? `Onda ${encounter.wave}/${encounter.totalWaves}`
      : `Ondas ${encounter.totalWaves}`;
    this.sealChamberRemaining.textContent = `${encounter.remaining} ${encounter.remaining === 1 ? 'inimigo' : 'inimigos'}`;
    const timedPhase = encounter.phase === 'arming'
      || encounter.phase === 'intermission'
      || encounter.phase === 'complete'
      || encounter.phase === 'cooldown';
    this.sealChamberTimer.textContent = timedPhase ? `${encounter.timer.toFixed(1)}s` : 'Selo ativo';

    if (encounter.completed) {
      this.sealChamberStatus.textContent = encounter.rewardEligible
        ? 'Concluída • recompensa única recebida.'
        : encounter.participant
          ? 'Concluída • você auxiliou esta investida.'
          : 'Concluída • recompensa única já recebida.';
    } else if (encounter.rewardEligible) {
      this.sealChamberStatus.textContent = 'Elegível • 180 moedas + 150 EXP.';
    } else if (encounter.participant) {
      this.sealChamberStatus.textContent = 'Auxílio • sem recompensa única nesta investida.';
    } else if (encounter.phase === 'idle') {
      this.sealChamberStatus.textContent = 'Aproxime-se do selo para despertar a câmara.';
    } else {
      this.sealChamberStatus.textContent = 'A batalha já começou; entre para auxiliar.';
    }
  }

  private renderTreasureLodeTracker(snapshot: WorldSnapshot): void {
    const state = treasureLodeStatePresentationGate(snapshot.treasureLode);
    this.treasureLodePanel.hidden = state === null;
    if (!state) {
      this.treasureLodePanel.dataset.phase = 'invalid';
      return;
    }
    this.treasureLodePanel.dataset.phase = state.phase;
    this.treasureLodePanel.style.setProperty('--treasure-accent', treasureLodeColor(state));
    this.treasureLodePhase.textContent = treasureLodePhaseLabel(state);
    this.treasureLodeWave.textContent = state.wave > 0 ? `Onda ${state.wave}/${state.totalWaves}` : `${state.totalWaves} ondas`;
    this.treasureLodeEnemies.textContent = `${state.remainingEnemies} ${state.remainingEnemies === 1 ? 'invasor' : 'invasores'}`;
    this.treasureLodeTimer.textContent = state.timer > 0 ? `${state.timer.toFixed(1)}s` : state.rewardReady ? 'Cofre pronto' : 'Jazida ativa';
    this.treasureLodeStatus.textContent = state.canClaim
      ? 'Clique no cofre mineral para liberar a recompensa.'
      : state.lockedReason || 'Proteja a jazida.';
  }

  private renderUtraeanRelayTracker(snapshot: WorldSnapshot): void {
    const state = utraeanRelayStatePresentationGate(snapshot.utraeanRelay);
    this.utraeanRelayPanel.hidden = state === null;
    if (!state) {
      this.utraeanRelayPanel.dataset.phase = 'invalid';
      return;
    }
    this.utraeanRelayPanel.dataset.phase = state.phase;
    this.utraeanRelayPanel.style.setProperty('--utraean-accent', utraeanRelayColor(state));
    this.utraeanRelayPhase.textContent = utraeanRelayPhaseLabel(state);
    this.utraeanRelayProgress.textContent = `Runas ${state.progress}/3`;
    this.utraeanRelayNext.textContent = state.guardianActive
      ? 'Sentinela ativo'
      : state.phase === 'active'
        ? `Próxima: ${utraeanRuneById(state.sequence[state.progress])}`
      : state.phase === 'reward'
        ? state.claimed ? 'Recolhido' : 'Cofre pronto'
        : state.phase === 'cooldown' ? 'Recarregando' : 'Console';
    this.utraeanRelayTimer.textContent = state.guardianActive ? 'Tempo pausado' : state.timer > 0 ? `${state.timer.toFixed(1)}s` : 'Pronto';
    this.utraeanRelayStatus.textContent = state.guardianActive
      ? state.lockedReason || 'Derrote o Sentinela para liberar as runas.'
      : state.phase === 'active' && state.participant
      ? `Ordem: ${state.sequence.map(utraeanRuneById).join(' → ')}.`
      : state.canClaim
        ? 'Clique no cofre: 3 minérios + 1 barra de mithril, moedas e XP.'
        : state.lockedReason || 'As runas aguardam.';
  }

  private renderArhokFrostTracker(snapshot: WorldSnapshot): void {
    const state = arhokFrostBiomePresentationGate(snapshot.biome);
    const visible = state !== null && (state.active || state.exposure > 0);
    this.arhokFrostPanel.hidden = !visible;
    if (!state || !visible) {
      this.arhokFrostPanel.dataset.stage = 'clear';
      return;
    }
    const ratio = state.maxExposure > 0 ? Math.max(0, Math.min(1, state.exposure / state.maxExposure)) : 0;
    this.arhokFrostPanel.dataset.stage = state.warmth ? 'warmth' : state.stage;
    this.arhokFrostPanel.style.setProperty('--frost-accent', arhokFrostColor(state));
    this.arhokFrostStage.textContent = arhokFrostStageLabel(state);
    this.arhokFrostFill.style.width = `${ratio * 100}%`;
    this.arhokFrostExposure.textContent = `Frio ${Math.round(state.exposure)}/${state.maxExposure}`;
    this.arhokFrostStatus.textContent = state.warmth
      ? 'Fonte de calor · exposição recuando'
      : state.stage === 'frostbitten'
        ? '−22% movimento · dano a cada 4 s no limite'
        : state.stage === 'chilled'
          ? '−10% movimento · alcance um braseiro'
          : 'Exposição aumentando · localize um braseiro';
    this.arhokFrostMeter.setAttribute('aria-valuenow', String(Math.round(state.exposure)));
  }

  private renderCorruptedJungleTracker(snapshot: WorldSnapshot, player?: EntityState): void {
    const state = corruptedJunglePresentationGate(snapshot.jungle);
    const visible = state !== null && state.active && !!player;
    this.corruptedJunglePanel.hidden = !visible;
    if (!state || !visible || !player) {
      this.corruptedJunglePanel.dataset.danger = 'safe';
      return;
    }
    const active = state.pods.filter((pod) => pod.phase === 'active');
    const warning = state.pods.filter((pod) => pod.phase === 'warning');
    const nearest = nearestThreateningSporePod(state, player.position);
    const danger = nearest?.phase ?? 'safe';
    this.corruptedJunglePanel.dataset.danger = danger;
    this.corruptedJunglePanel.style.setProperty('--jungle-accent', danger === 'safe'
      ? CORRUPTED_JUNGLE_PALETTE.dormant
      : CORRUPTED_JUNGLE_PALETTE[danger]);
    this.corruptedJunglePhase.textContent = danger === 'active' ? 'Floração tóxica' : danger === 'warning' ? 'Flora armando' : 'Rota segura';
    this.corruptedJungleActive.textContent = `${active.length} ${active.length === 1 ? 'ativa' : 'ativas'}`;
    this.corruptedJungleWarning.textContent = `${warning.length} ${warning.length === 1 ? 'alerta' : 'alertas'}`;
    this.corruptedJungleTimer.textContent = nearest ? `${nearest.timer.toFixed(1)}s` : 'Observe';
    this.corruptedJungleStatus.textContent = nearest
      ? `${nearest.label}: ${nearest.phase === 'active' ? 'saia do anel agora' : 'o pulso está prestes a abrir'}.`
      : 'Observe os anéis antes de atravessar.';
  }

  private renderBuffs(
    buffs: readonly BuffState[],
    statuses: readonly StatusState[],
    activeDoctrineId: CombatDoctrineId | null,
  ): void {
    const visibleStatuses = statuses.filter((status) => status.id === 'arcane-slow' || status.id === 'bulwark-taunt' || status.id === 'corrupted-spores');
    const visibleBuffs = buffs.filter((buff) => (
      buff.id !== 'doctrine-vanguard-momentum'
      || activeDoctrineId === 'warrior_doctrine_vanguard'
    ));
    const entries = [
      ...visibleBuffs.map((buff) => ({ ...buff, tone: 'buff' as const })),
      ...visibleStatuses.map((status) => ({
        id: status.id,
        label: statusLabel(status),
        remaining: status.remaining,
        duration: status.duration,
        tone: 'status' as const,
      })),
    ];
    const key = entries
      .map((entry) => `${entry.tone}:${entry.id}:${entry.label}:${Math.ceil(entry.remaining * 10)}:${entry.duration}:${'targetId' in entry ? entry.targetId ?? '' : ''}`)
      .join('|');
    if (key === this.buffRenderKey) return;
    this.buffRenderKey = key;
    this.buffTray.replaceChildren();
    this.buffTray.hidden = entries.length === 0;
    for (const buff of entries) {
      const item = document.createElement('div');
      item.className = 'buff-icon';
      item.dataset.buff = buff.id;
      item.dataset.tone = buff.tone;
      const ratio = buff.duration > 0 ? Math.max(0, Math.min(1, buff.remaining / buff.duration)) : 0;
      item.style.setProperty('--buff-ratio', String(ratio));
      item.title = buff.tone === 'status'
        ? `${buff.label} · ${statusSeconds(buff.remaining)}`
        : `${buff.label} - ${Math.ceil(buff.remaining)}s`;
      const label = document.createElement('strong');
      label.textContent = buffInitials(buff.label) || '?';
      const time = document.createElement('span');
      time.textContent = `${Math.ceil(buff.remaining)}`;
      item.append(label, time);
      this.buffTray.append(item);
    }
  }

  private renderParty(party: PartyState | null, localPlayer: EntityState, inventory: readonly InventoryItem[]): void {
    const localPlayerId = localPlayer.id;
    this.partyMemberIds.clear();
    for (const member of party?.members ?? []) {
      if (member.id !== localPlayerId && member.online) this.partyMemberIds.add(member.id);
    }

    const localMember = party?.members.find((member) => member.id === localPlayerId);
    const cargo = expeditionCargoPresentationGate(party);
    const cargoDistance = cargo ? Math.hypot(cargo.position.x - localPlayer.position.x, cargo.position.z - localPlayer.position.z) : Number.POSITIVE_INFINITY;
    const cargoNearby = cargo !== null && cargoDistance <= cargo.interactRange;
    const key = party
      ? [
        party.id,
        party.leaderId,
        ...party.members.map((member) => [
          member.id,
          member.name,
          member.level,
          Math.ceil(member.hp),
          member.maxHp,
          member.online ? 1 : 0,
          member.alive ? 1 : 0,
          member.zone ?? '',
          party.leaderId === localPlayerId && member.id !== localPlayerId ? 1 : 0,
        ].join(':')),
        cargo ? [cargo.id, cargo.leaderId, cargo.used, cargoNearby ? 1 : 0, ...cargo.items.map((item) => `${item.kind}:${item.count}`)].join(':') : '',
        ...EXPEDITION_CARGO_KINDS.map((kind) => `${kind}:${inventory.find((item) => item.kind === kind)?.count ?? 0}`),
      ].join('|')
      : '';
    if (key === this.partyRenderKey) return;
    this.partyRenderKey = key;
    this.partyPanel.replaceChildren();
    this.partyPanel.hidden = !party;
    if (!party) return;

    const heading = document.createElement('div');
    heading.className = 'party-heading';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'party-heading-title';
    const title = document.createElement('strong');
    title.textContent = 'Grupo';
    const count = document.createElement('small');
    count.textContent = `${party.members.filter((member) => member.online).length}/${party.members.length}`;
    titleWrap.append(title, count);
    const actions = document.createElement('div');
    actions.className = 'party-member-actions';
    const chat = document.createElement('button');
    chat.type = 'button';
    chat.className = 'party-message';
    chat.textContent = 'Chat';
    chat.title = 'Abrir chat do grupo';
    chat.addEventListener('click', () => {
      this.openChatWithDraft('/p ');
      this.pushSystemMessage('Chat do grupo aberto.');
    });
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Sair';
    leave.addEventListener('click', () => this.onPartyLeave());
	if (party.members.length > 1) actions.append(chat, leave);
    heading.append(titleWrap, actions);
    this.partyPanel.append(heading);

    if (cargo) {
      const cargoCard = document.createElement('section');
      cargoCard.className = 'expedition-cargo-card';
      const cargoHeading = document.createElement('div');
      cargoHeading.className = 'expedition-cargo-heading';
      const cargoTitle = document.createElement('strong');
      cargoTitle.textContent = `Mula de Expedição · ${cargo.used}/${cargo.capacity}`;
      const cargoMeta = document.createElement('small');
      cargoMeta.textContent = cargoNearby ? `PRÓXIMA · ${cargoDistance.toFixed(1)}m` : `DISTANTE · ${cargoDistance.toFixed(1)}m`;
      cargoHeading.append(cargoTitle, cargoMeta);
      cargoCard.append(cargoHeading);
      for (const kind of EXPEDITION_CARGO_KINDS) {
        const cargoCount = expeditionCargoCount(cargo, kind);
        const bagCount = inventory.find((item) => item.kind === kind)?.count ?? 0;
        if (cargoCount <= 0 && bagCount <= 0) continue;
        const row = document.createElement('div');
        row.className = 'expedition-cargo-row';
        const icon = document.createElement('img');
        icon.src = itemIconFor(kind);
        icon.alt = '';
        const label = document.createElement('span');
        label.textContent = `${ITEM_BASE_NAMES[kind]} · mochila ${bagCount} · carga ${cargoCount}`;
        const actions = document.createElement('div');
        const deposit = document.createElement('button');
        deposit.type = 'button';
        deposit.textContent = 'Guardar';
        deposit.disabled = !cargoNearby || bagCount <= 0 || cargo.used >= cargo.capacity;
        deposit.addEventListener('click', () => this.onCargoDeposit(kind));
        const withdraw = document.createElement('button');
        withdraw.type = 'button';
        withdraw.textContent = 'Retirar';
        withdraw.disabled = !cargoNearby || cargoCount <= 0;
        withdraw.addEventListener('click', () => this.onCargoWithdraw(kind));
        actions.append(deposit, withdraw);
        row.append(icon, label, actions);
        cargoCard.append(row);
      }
      this.partyPanel.append(cargoCard);
    }

    for (const member of party.members) {
      const row = document.createElement('div');
      row.className = 'party-member';
      row.classList.toggle('offline', !member.online);
      row.classList.toggle('self', member.id === localPlayerId);
      row.classList.toggle('downed', member.online && member.alive === false);
      const top = document.createElement('div');
      top.className = 'party-member-top';
      const info = document.createElement('div');
      info.className = 'party-member-info';
      const name = document.createElement('strong');
      name.textContent = `${member.name}${member.id === party.leaderId ? ' (lider)' : ''}`;
      const meta = document.createElement('small');
      meta.textContent = member.online && member.alive === false
        ? `CAÍDO · ${member.zone === 'dungeon' ? 'Masmorra' : 'Aranna'}`
        : `Nv ${member.level} ${member.class}`;
      info.append(name, meta);
      const canManage = party.leaderId === localPlayerId && member.id !== localPlayerId;
      const canRevive = partyMemberCanRequestRevive(member, localMember);
      if (canManage || canRevive) {
        const actions = document.createElement('div');
        actions.className = 'party-member-actions';
        if (canRevive) {
          const revive = document.createElement('button');
          revive.type = 'button';
          revive.className = 'party-revive';
          revive.textContent = 'Reanimar';
          revive.title = `Canalizar reanimação em ${member.name}; aproxime-se até 3,2 m`;
          revive.addEventListener('click', () => this.onPartyRevive(member.id));
          actions.append(revive);
        }
        if (canManage) {
          const promote = document.createElement('button');
          promote.type = 'button';
          promote.className = 'party-promote';
          promote.textContent = 'Promover';
          promote.title = `Transferir lideranca para ${member.name}`;
          promote.addEventListener('click', () => this.onPartyLeaderTransfer(member.id));
          const kick = document.createElement('button');
          kick.type = 'button';
          kick.className = 'party-kick';
          kick.textContent = 'Remover';
          kick.title = `Remover ${member.name} do grupo`;
          kick.addEventListener('click', () => this.onPartyKick(member.id));
          actions.append(promote, kick);
        }
        top.append(info, actions);
      } else {
        top.append(info);
      }
      const hp = document.createElement('div');
      hp.className = 'party-hp';
      const fill = document.createElement('div');
      fill.style.width = `${barRatio(member.hp, member.maxHp) * 100}%`;
      const label = document.createElement('span');
      label.textContent = !member.online ? 'offline' : member.alive === false ? 'Aguardando reanimação' : `${Math.ceil(member.hp)} / ${Math.round(member.maxHp)}`;
      hp.append(fill, label);
      row.append(top, hp);
      this.partyPanel.append(row);
    }
  }

  private renderFriends(friends: readonly FriendState[]): void {
    const orderedFriends = [...friends].sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      const aName = a.name || a.id;
      const bName = b.name || b.id;
      return aName.localeCompare(bName, 'pt-BR') || a.id.localeCompare(b.id);
    });
    const key = orderedFriends
      .map((friend) => [
        friend.id,
        friend.name,
        friend.level,
        friend.online ? 1 : 0,
        this.partyMemberIds.has(friend.id) ? 1 : 0,
      ].join(':'))
      .join('|');
    if (key === this.friendRenderKey) return;
    this.friendRenderKey = key;
    this.friendPanel.replaceChildren();
    this.friendPanel.hidden = friends.length === 0;
    if (friends.length === 0) return;

    const heading = document.createElement('div');
    heading.className = 'party-heading';
    const title = document.createElement('strong');
    title.textContent = 'Amigos';
    const count = document.createElement('small');
    count.textContent = `${friends.filter((friend) => friend.online).length}/${friends.length}`;
    heading.append(title, count);
    this.friendPanel.append(heading);

    for (const friend of orderedFriends) {
      const row = document.createElement('div');
      row.className = 'party-member friend-member';
      row.classList.toggle('offline', !friend.online);
      const top = document.createElement('div');
      top.className = 'party-member-top';
      const info = document.createElement('div');
      info.className = 'party-member-info';
      const name = document.createElement('strong');
      name.textContent = friend.name || friend.id;
      const meta = document.createElement('small');
      meta.textContent = friend.online ? `Nv ${friend.level} Warrior` : 'offline';
      info.append(name, meta);
      const actions = document.createElement('div');
      actions.className = 'party-member-actions';
      if (friend.online) {
        const message = document.createElement('button');
        message.type = 'button';
        message.className = 'party-message';
        message.textContent = 'Msg';
        message.title = `Enviar mensagem para ${friend.name || friend.id}`;
        message.addEventListener('click', () => this.openPlayerMessageDraft(friend.id, friend.name || friend.id));
        actions.append(message);
        const invite = document.createElement('button');
        invite.type = 'button';
        invite.className = 'party-promote';
        if (this.partyMemberIds.has(friend.id)) {
          invite.disabled = true;
          invite.textContent = 'No grupo';
          invite.title = `${friend.name || friend.id} ja esta no grupo`;
        } else {
          invite.textContent = 'Grupo';
          invite.title = `Convidar ${friend.name || friend.id} para grupo`;
          invite.addEventListener('click', () => this.onPartyInviteSend(friend.id));
        }
        actions.append(invite);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'party-kick';
      remove.textContent = 'Remover';
      remove.title = `Remover ${friend.name || friend.id} dos amigos`;
      remove.addEventListener('click', () => this.onFriendRemove(friend.id));
      actions.append(remove);
      top.append(info, actions);
      row.append(top);
      this.friendPanel.append(row);
    }
  }

  private openPlayerMessageDraft(targetPlayerId: string, name: string): void {
    const sameParty = this.partyMemberIds.has(targetPlayerId);
    this.openChatWithDraft(sameParty ? '/p ' : '');
    this.pushSystemMessage(sameParty ? `Chat do grupo aberto para falar com ${name}.` : `Chat local aberto para falar com ${name}.`);
  }

  private syncFriendPresenceFeedback(friends: readonly FriendState[]): void {
    this.friendIds.clear();
    const seen = new Set<string>();
    for (const friend of friends) {
      seen.add(friend.id);
      this.friendIds.add(friend.id);
      const previous = this.friendOnlineById.get(friend.id);
      if (this.friendPresenceInitialized && previous !== undefined && previous !== friend.online) {
        const name = friend.name || friend.id;
        this.pushSystemMessage(friend.online ? `${name} entrou no jogo.` : `${name} saiu do jogo.`);
      }
      this.friendOnlineById.set(friend.id, friend.online);
    }

    for (const id of this.friendOnlineById.keys()) {
      if (!seen.has(id)) this.friendOnlineById.delete(id);
    }
    this.friendPresenceInitialized = true;
    this.updatePlayerContextFriendAction(this.activePlayerContextId);
  }

  private updatePlayerContextFriendAction(playerId: string | null): void {
    const alreadyFriend = !!playerId && this.friendIds.has(playerId);
    this.playerContextFriend.disabled = alreadyFriend;
    this.playerContextFriend.textContent = alreadyFriend ? 'Amigo adicionado' : 'Adicionar amigo';
    this.playerContextFriend.title = alreadyFriend ? 'Jogador ja esta na sua lista de amigos.' : 'Adicionar jogador aos amigos.';
  }

  private renderPartyInvites(invites: readonly PartyInviteState[]): void {
    const key = invites.map((invite) => `${invite.inviteId}:${invite.fromPlayerId}:${invite.expiresAt}`).join('|');
    if (key === this.partyInviteRenderKey) return;
    this.partyInviteRenderKey = key;
    this.partyInvitePanel.replaceChildren();
    this.partyInvitePanel.hidden = invites.length === 0;
    for (const invite of invites) {
      const card = document.createElement('div');
      card.className = 'party-invite-card';
      const title = document.createElement('strong');
      title.textContent = 'Convite de grupo';
      const text = document.createElement('span');
      text.textContent = `${invite.fromName} quer formar um grupo.`;
      const actions = document.createElement('div');
      actions.className = 'party-invite-actions';
      const accept = document.createElement('button');
      accept.type = 'button';
      accept.textContent = 'Aceitar';
      accept.addEventListener('click', () => this.onPartyInviteAccept(invite.inviteId));
      const decline = document.createElement('button');
      decline.type = 'button';
      decline.textContent = 'Recusar';
      decline.addEventListener('click', () => this.onPartyInviteDecline(invite.inviteId));
      actions.append(accept, decline);
      card.append(title, text, actions);
      this.partyInvitePanel.append(card);
    }
  }

  private renderMartialMastery(state: MasteryProgressState): void {
    const key = [
      state.id,
      state.label,
      state.level,
      state.xp,
      state.xpIntoLevel,
      state.xpToNext,
      state.maxLevel,
      state.damageBonus,
    ].join(':');
    if (key === this.masteryRenderKey) return;
    this.masteryRenderKey = key;

    const maxed = state.level >= state.maxLevel;
    const ratio = masteryProgressRatio(state);
    const bonus = Math.round(state.damageBonus * 100);
    this.martialMasterySummary.classList.toggle('maxed', maxed);
    this.martialMasteryLabel.textContent = state.label;
    this.martialMasteryLevel.textContent = `Nv ${state.level}`;
    this.martialMasteryFill.style.width = `${ratio * 100}%`;
    this.martialMasteryXp.textContent = maxed
      ? `${state.xp} XP · nível máximo`
      : `${state.xpIntoLevel} / ${state.xpToNext} XP`;
    this.martialMasteryBonus.textContent = `+${bonus}% dano`;
    this.martialMasteryProgress.setAttribute('aria-label', `${state.label}, nível ${state.level}`);
    this.martialMasteryProgress.setAttribute('aria-valuemax', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpToNext));
    this.martialMasteryProgress.setAttribute('aria-valuenow', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpIntoLevel));
    this.martialMasterySummary.title = `${state.label} Nv ${state.level} · +${bonus}% de dano para Investida, Golpe Pesado e Varredura de Aço`;
  }

  private renderArcanaMastery(state: MasteryProgressState | null): void {
    this.arcanaMasterySummary.hidden = state === null;
    if (!state) {
      this.arcanaMasteryRenderKey = '';
      return;
    }
    const key = [state.id, state.label, state.level, state.xp, state.xpIntoLevel, state.xpToNext, state.maxLevel, state.damageBonus].join(':');
    if (key === this.arcanaMasteryRenderKey) return;
    this.arcanaMasteryRenderKey = key;

    const maxed = state.level >= state.maxLevel;
    const ratio = masteryProgressRatio(state);
    const bonus = Math.round(state.damageBonus * 100);
    this.arcanaMasterySummary.classList.toggle('maxed', maxed);
    this.arcanaMasteryLabel.textContent = state.label;
    this.arcanaMasteryLevel.textContent = `Nv ${state.level}`;
    this.arcanaMasteryFill.style.width = `${ratio * 100}%`;
    this.arcanaMasteryXp.textContent = maxed
      ? `${state.xp} XP · nível máximo`
      : `${state.xpIntoLevel} / ${state.xpToNext} XP`;
    this.arcanaMasteryBonus.textContent = `+${bonus}% dano`;
    this.arcanaMasteryProgress.setAttribute('aria-label', `${state.label}, nível ${state.level}`);
    this.arcanaMasteryProgress.setAttribute('aria-valuemax', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpToNext));
    this.arcanaMasteryProgress.setAttribute('aria-valuenow', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpIntoLevel));
    this.arcanaMasterySummary.title = `${state.label} Nv ${state.level} · +${bonus}% de dano para Nova e Dardo Arcano`
      + (state.level >= 5 ? ' · Ressonância Arcana ativa' : ' · Ressonância Arcana no Nv 5');
  }

  private renderSurvivalMastery(state: MasteryProgressState | null): void {
    this.survivalMasterySummary.hidden = state === null;
    if (!state) {
      this.survivalMasteryRenderKey = '';
      return;
    }
    const bonus = Math.round((state.defenseBonus ?? 0) * 100);
    const key = [state.id, state.label, state.level, state.xp, state.xpIntoLevel, state.xpToNext, state.maxLevel, bonus].join(':');
    if (key === this.survivalMasteryRenderKey) return;
    this.survivalMasteryRenderKey = key;

    const maxed = state.level >= state.maxLevel;
    const ratio = masteryProgressRatio(state);
    this.survivalMasterySummary.classList.toggle('maxed', maxed);
    this.survivalMasteryLabel.textContent = state.label;
    this.survivalMasteryLevel.textContent = `Nv ${state.level}`;
    this.survivalMasteryFill.style.width = `${ratio * 100}%`;
    this.survivalMasteryXp.textContent = maxed
      ? `${state.xp} XP · nível máximo`
      : `${state.xpIntoLevel} / ${state.xpToNext} XP`;
    this.survivalMasteryBonus.textContent = `+${bonus}% potência defensiva`;
    this.survivalMasteryProgress.setAttribute('aria-label', `${state.label}, nível ${state.level}`);
    this.survivalMasteryProgress.setAttribute('aria-valuemax', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpToNext));
    this.survivalMasteryProgress.setAttribute('aria-valuenow', String(maxed ? Math.max(1, state.xpIntoLevel) : state.xpIntoLevel));
    this.survivalMasterySummary.title = `${state.label} Nv ${state.level} · +${bonus}% de potência defensiva para Guarda de Ferro e Clamor do Baluarte`
      + (state.level >= 5 ? ' · Retaliação do Guardião ativa' : ' · Retaliação do Guardião no Nv 5');
  }

  private doctrineSkillTooltip(
    skill: NormalizedSkillState,
    mastery?: MasteryProgressState | null,
    mechanics?: string,
  ): string {
    const activeModifierIds: string[] = [];
    if (this.activeDoctrineModifierId) activeModifierIds.push(this.activeDoctrineModifierId);
    if (this.activeSteelSweepFormId) activeModifierIds.push(this.activeSteelSweepFormId);
    if (this.arcaneResonanceActive) activeModifierIds.push(ARCANE_RESONANCE_MODIFIER_ID);
    if (this.guardianRetaliationActive) {
      activeModifierIds.push(GUARDIAN_RETALIATION_MODIFIER_ID, GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID);
    }
    return skillCatalogTooltip(skill, {
      mastery,
      mechanics,
      showModifiers: activeModifierIds.length > 0,
      activeModifierId: this.activeDoctrineModifierId,
      activeModifierIds,
    });
  }

  private renderDoctrineSkillBadges(skills: readonly NormalizedSkillState[]): void {
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const slots = this.hotbarActionSlots();
    for (const [action, slot] of Object.entries(slots) as [HotbarAction, HTMLElement][]) {
      if (!isHotbarSkillAction(action)) continue;
      const modifier = this.activeDoctrineModifierId
        ? skillById.get(action)?.modifiers?.find((candidate) => candidate.id === this.activeDoctrineModifierId)
        : undefined;
      slot.classList.toggle('doctrine-modified', Boolean(modifier));
      if (modifier) slot.dataset.doctrineModifier = modifier.label;
      else delete slot.dataset.doctrineModifier;
      const formModifier = this.activeSteelSweepFormId
        ? skillById.get(action)?.modifiers?.find((candidate) => candidate.id === this.activeSteelSweepFormId)
        : undefined;
      slot.classList.toggle('steel-sweep-form-modified', Boolean(formModifier));
      if (formModifier) slot.dataset.steelSweepFormModifier = formModifier.label;
      else delete slot.dataset.steelSweepFormModifier;
      const resonanceModifier = this.arcaneResonanceActive
        ? skillById.get(action)?.modifiers?.find((candidate) => candidate.id === ARCANE_RESONANCE_MODIFIER_ID)
        : undefined;
      slot.classList.toggle('arcane-resonance-modified', Boolean(resonanceModifier));
      if (resonanceModifier) slot.dataset.arcaneResonanceModifier = resonanceModifier.label;
      else delete slot.dataset.arcaneResonanceModifier;
      const retaliationModifier = this.guardianRetaliationActive
        ? skillById.get(action)?.modifiers?.find((candidate) => (
          candidate.id === GUARDIAN_RETALIATION_MODIFIER_ID
          || candidate.id === GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID
        ))
        : undefined;
      slot.classList.toggle('guardian-retaliation-modified', Boolean(retaliationModifier));
      if (retaliationModifier) slot.dataset.guardianRetaliationModifier = retaliationModifier.label;
      else delete slot.dataset.guardianRetaliationModifier;
    }
  }

  private renderSkillLoadout(skillsWire: unknown, masteries: readonly MasteryProgressState[]): void {
    const skills = normalizeSkillCatalog(skillsWire);
    const masteryMap = new Map(masteries.map((mastery) => [mastery.id, mastery]));
    const key = [
      this.hotbarLayout.join(','),
      this.activeDoctrineId ?? '',
      this.activeDoctrineModifierId ?? '',
      this.activeSteelSweepFormId ?? '',
      this.arcaneResonanceActive ? ARCANE_RESONANCE_MODIFIER_ID : '',
      this.guardianRetaliationActive ? GUARDIAN_RETALIATION_MODIFIER_ID : '',
      ...skills.map((skill) => [
        skill.id,
        skill.label,
        skill.description ?? '',
        skill.discipline,
        skill.targetMode,
        skill.stationary ? 1 : 0,
        skill.requiresPhysicalWeapon ? 1 : 0,
        skill.masteryId ?? '',
        skill.manaCost,
        skill.cooldown,
        skill.blocked ? 1 : 0,
        skill.blockedReason ?? '',
        skill.range ?? '',
        ...(skill.modifiers ?? []).map((modifier) => `${modifier.id},${modifier.label},${modifier.description}`),
      ].join(':')),
      ...masteries.map((mastery) => `${mastery.id}:${mastery.level}:${mastery.damageBonus}:${mastery.defenseBonus ?? 0}`),
    ].join('|');
    if (key === this.skillLoadoutRenderKey) return;
    this.skillLoadoutRenderKey = key;
    this.skillLoadoutList.replaceChildren();

    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const equipped = this.hotbarLayout.filter(isHotbarSkillAction);
    for (const skill of skills) {
      const slotIndex = this.hotbarLayout.indexOf(skill.id);
      const card = document.createElement('article');
      card.className = 'skill-loadout-card';
      card.dataset.discipline = skill.discipline;
      card.dataset.skill = skill.id;
      card.tabIndex = -1;
      card.classList.toggle('equipped', slotIndex >= 0);
      card.classList.toggle('temporarily-blocked', skill.blocked === true);
      const activeModifier = this.activeDoctrineModifierId
        ? skill.modifiers?.find((modifier) => modifier.id === this.activeDoctrineModifierId)
        : undefined;
      const activeFormModifier = this.activeSteelSweepFormId
        ? skill.modifiers?.find((modifier) => modifier.id === this.activeSteelSweepFormId)
        : undefined;
      const activeResonanceModifier = this.arcaneResonanceActive
        ? skill.modifiers?.find((modifier) => modifier.id === ARCANE_RESONANCE_MODIFIER_ID)
        : undefined;
      const activeRetaliationModifier = this.guardianRetaliationActive
        ? skill.modifiers?.find((modifier) => (
          modifier.id === GUARDIAN_RETALIATION_MODIFIER_ID
          || modifier.id === GUARDIAN_RETALIATION_RELEASE_MODIFIER_ID
        ))
        : undefined;
      card.classList.toggle('doctrine-modified', Boolean(activeModifier));
      card.classList.toggle('steel-sweep-form-modified', Boolean(activeFormModifier));
      card.classList.toggle('arcane-resonance-modified', Boolean(activeResonanceModifier));
      card.classList.toggle('guardian-retaliation-modified', Boolean(activeRetaliationModifier));

      const copy = document.createElement('div');
      copy.className = 'skill-loadout-copy';
      const heading = document.createElement('strong');
      heading.textContent = skill.label;
      const description = document.createElement('p');
      description.textContent = skill.description ?? 'Habilidade anunciada pelo servidor.';
      const meta = document.createElement('small');
      const mastery = skill.masteryId ? masteryMap.get(skill.masteryId) : undefined;
      meta.textContent = this.doctrineSkillTooltip(skill, mastery);
      copy.append(heading);
      if (skill.blocked && skill.blockedReason) {
        const badge = document.createElement('span');
        badge.className = 'skill-blocked-badge';
        badge.textContent = 'Bloqueada pela Forma Feral';
        badge.title = skill.blockedReason;
        copy.append(badge);
      }
      if (activeModifier) {
        const badge = document.createElement('span');
        badge.className = 'skill-doctrine-badge';
        badge.dataset.modifier = activeModifier.id;
        badge.textContent = activeModifier.label;
        copy.append(badge);
      }
      if (activeFormModifier) {
        const badge = document.createElement('span');
        badge.className = 'skill-form-badge';
        badge.dataset.modifier = activeFormModifier.id;
        badge.textContent = activeFormModifier.label;
        copy.append(badge);
      }
      if (activeResonanceModifier) {
        const badge = document.createElement('span');
        badge.className = 'skill-resonance-badge';
        badge.dataset.modifier = activeResonanceModifier.id;
        badge.textContent = activeResonanceModifier.label;
        copy.append(badge);
      }
      if (activeRetaliationModifier) {
        const badge = document.createElement('span');
        badge.className = 'skill-retaliation-badge';
        badge.dataset.modifier = activeRetaliationModifier.id;
        badge.textContent = activeRetaliationModifier.label;
        copy.append(badge);
      }
      copy.append(description, meta);

      const controls = document.createElement('div');
      controls.className = 'skill-loadout-controls';
      if (slotIndex >= 0) {
        const active = document.createElement('button');
        active.type = 'button';
        active.disabled = true;
        active.textContent = `Slot ${slotIndex + 1}`;
        active.setAttribute('aria-label', `${skill.label} equipada no slot ${slotIndex + 1}`);
        controls.append(active);
      } else {
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Escolher habilidade a substituir por ${skill.label}`);
        for (const equippedId of equipped) {
          const option = document.createElement('option');
          option.value = equippedId;
          const equippedIndex = this.hotbarLayout.indexOf(equippedId);
          option.textContent = `Slot ${equippedIndex + 1} · ${skillById.get(equippedId)?.label ?? equippedId}`;
          select.append(option);
        }
        const equip = document.createElement('button');
        equip.type = 'button';
        equip.textContent = 'Equipar';
        equip.addEventListener('click', () => {
          const replace = select.value;
          if (isHotbarSkillAction(replace)) {
            this.skillLoadoutFocusSkillId = skill.id;
            this.onHotbarEquip(skill.id, replace);
          }
        });
        controls.append(select, equip);
      }
      card.append(copy, controls);
      this.skillLoadoutList.append(card);
    }
    if (this.skillLoadoutFocusSkillId) {
      const focusSkill = this.skillLoadoutFocusSkillId;
      this.skillLoadoutFocusSkillId = null;
      const focusCard = [...this.skillLoadoutList.querySelectorAll<HTMLElement>('.skill-loadout-card')]
        .find((card) => card.dataset.skill === focusSkill);
      focusCard?.focus({ preventScroll: true });
    }
  }

  private renderTalents(
    state: TalentState,
    masteries: readonly MasteryProgressState[],
    doctrineChoices: readonly CombatDoctrineChoiceState[] | null,
    sweepFormChoices: readonly SteelSweepTechniqueChoiceState[] | null,
  ): void {
    const ranksKey = Object.entries(state.talents).map(([id, rank]) => `${id}:${rank}`).sort().join('|');
    const signatureKey = doctrineChoices
      ? doctrineChoices.map((choice) => [
        choice.id,
        choice.label,
        choice.description,
        choice.choiceGroup,
        choice.cost,
        choice.requiredMasteryId,
        choice.requiredMasteryLevel,
        choice.modifiesSkills.join(','),
      ].join(':')).join('|')
      : 'hidden';
    const techniqueKey = sweepFormChoices
      ? sweepFormChoices.map((choice) => [
        choice.id,
        choice.label,
        choice.description,
        choice.choiceGroup,
        choice.cost,
        choice.requiredMasteryId,
        choice.requiredMasteryLevel,
        choice.modifiesSkills.join(','),
      ].join(':')).join('|')
      : 'hidden';
    const masteryKey = masteries
      .map((mastery) => `${mastery.id}:${mastery.level}:${mastery.xp}`)
      .sort()
      .join('|');
    const key = `${state.talentPoints}:${state.spentPoints}:${state.availablePoints}:${ranksKey}:${signatureKey}:${techniqueKey}:${masteryKey}`;
    if (key === this.talentRenderKey) return;
    this.talentRenderKey = key;

    this.talentSummary.replaceChildren();
    const points = document.createElement('strong');
    points.textContent = `${state.availablePoints} disponivel${state.availablePoints === 1 ? '' : 'is'}`;
    const spent = document.createElement('span');
    spent.textContent = `${state.spentPoints}/${state.talentPoints} gastos`;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'talent-reset';
    reset.textContent = 'Reset';
    const hasDoctrine = this.activeDoctrineId !== null;
    const hasSweepForm = this.activeSteelSweepFormId !== null;
    reset.title = state.spentPoints > 0 || hasDoctrine || hasSweepForm ? 'Reiniciar talentos e devolver pontos' : 'Nenhum talento gasto';
    reset.disabled = state.spentPoints <= 0 && !hasDoctrine && !hasSweepForm;
    reset.addEventListener('click', () => this.onTalentReset());
    this.talentSummary.append(points, spent, reset);

    this.combatDoctrines.hidden = doctrineChoices === null;
    this.combatDoctrineChoices.replaceChildren();
    if (doctrineChoices) {
      const skillLabels: Readonly<Record<SkillId, string>> = {
        'arcane-nova': 'Nova Arcana',
        'war-cry': 'Grito de Guerra',
        charge: 'Investida',
        'heavy-strike': 'Golpe Pesado',
        'steel-sweep': 'Varredura de Aço',
        'iron-guard': 'Guarda de Ferro',
        'arcane-bolt': 'Dardo Arcano',
        'bulwark-call': 'Clamor do Baluarte',
        'storm-orb': 'Orbe da Tempestade',
        'feral-form': 'Forma Feral',
        'root-snare': 'Círculo de Raízes',
        'chain-lightning': 'Relâmpago Encadeado',
        'renewal-wave': 'Onda de Renovação',
        'phase-step': 'Passo Espectral',
        'nature-spirit': 'Espírito de Aranna',
      };
      const masteryLabels: Readonly<Record<string, string>> = {
        martial: 'Maestria Marcial',
        arcana: 'Maestria Arcana',
        survival: 'Maestria de Sobrevivência',
      };
      for (const choice of doctrineChoices) {
        const mastery = masteries.find((candidate) => candidate.id === choice.requiredMasteryId);
        const currentMasteryLevel = mastery?.level ?? 0;
        const selected = this.activeDoctrineId === choice.id;
        const anotherSelected = this.activeDoctrineId !== null && !selected;
        const masteryMet = currentMasteryLevel >= choice.requiredMasteryLevel;
        const learnable = combatDoctrineCanLearn(state, choice, masteries, doctrineChoices);

        const card = document.createElement('article');
        card.className = 'combat-doctrine-card';
        card.dataset.doctrine = choice.id;
        card.classList.toggle('selected', selected);
        card.classList.toggle('locked', !masteryMet || anotherSelected);
        card.classList.toggle('learnable', learnable);

        const top = document.createElement('div');
        top.className = 'combat-doctrine-card-top';
        const name = document.createElement('strong');
        name.textContent = choice.label;
        const stateLabel = document.createElement('span');
        stateLabel.textContent = selected ? 'Escolhida' : `${choice.cost} ponto`;
        top.append(name, stateLabel);

        const description = document.createElement('p');
        description.textContent = choice.description;
        const pair = document.createElement('small');
        pair.className = 'combat-doctrine-pair';
        pair.textContent = `Modifica: ${choice.modifiesSkills.map((id) => skillLabels[id]).join(' + ')}`;
        const requirement = document.createElement('small');
        requirement.textContent = `Requer ${mastery?.label ?? masteryLabels[choice.requiredMasteryId]} Nv ${choice.requiredMasteryLevel} (atual Nv ${currentMasteryLevel}) · custo ${choice.cost} ponto`;

        const learn = document.createElement('button');
        learn.type = 'button';
        learn.textContent = selected ? 'Ativa' : anotherSelected ? 'Use Reset para trocar' : 'Escolher';
        learn.disabled = !learnable;
        learn.title = selected
          ? `${choice.label} ativa. Use Reset para trocar.`
          : anotherSelected
            ? 'Use Reset para trocar de Doutrina.'
            : !masteryMet
              ? `Requer ${mastery?.label ?? masteryLabels[choice.requiredMasteryId]} Nv ${choice.requiredMasteryLevel}`
              : state.availablePoints < choice.cost
                ? 'Sem pontos'
                : `Escolher ${choice.label}`;
        learn.addEventListener('click', () => this.onTalentLearn(choice.id));

        card.append(top, description, pair, requirement, learn);
        this.combatDoctrineChoices.append(card);
      }
    }

    this.steelSweepForms.hidden = sweepFormChoices === null;
    this.steelSweepFormChoices.replaceChildren();
    if (sweepFormChoices) {
      const martial = masteries.find((candidate) => candidate.id === 'martial');
      const currentMasteryLevel = martial?.level ?? 0;
      for (const choice of sweepFormChoices) {
        const selected = this.activeSteelSweepFormId === choice.id;
        const anotherSelected = this.activeSteelSweepFormId !== null && !selected;
        const masteryMet = currentMasteryLevel >= choice.requiredMasteryLevel;
        const learnable = steelSweepFormCanLearn(state, choice, masteries, sweepFormChoices);
        const contract = STEEL_SWEEP_FORM_CONTRACTS[choice.id as SteelSweepFormId];

        const card = document.createElement('article');
        card.className = 'steel-sweep-form-card';
        card.dataset.form = choice.id;
        card.classList.toggle('selected', selected);
        card.classList.toggle('locked', !masteryMet || anotherSelected);
        card.classList.toggle('learnable', learnable);

        const top = document.createElement('div');
        top.className = 'steel-sweep-form-card-top';
        const name = document.createElement('strong');
        name.textContent = choice.label;
        const stateLabel = document.createElement('span');
        stateLabel.textContent = selected ? 'Escolhida' : `${choice.cost} ponto`;
        top.append(name, stateLabel);

        const diagram = document.createElement('span');
        diagram.className = 'steel-sweep-form-diagram';
        diagram.dataset.geometry = choice.id === 'warrior_sweep_form_orbit' ? 'orbit' : 'wedge';
        diagram.setAttribute('aria-hidden', 'true');

        const description = document.createElement('p');
        description.textContent = choice.description;
        const geometry = document.createElement('small');
        geometry.className = 'steel-sweep-form-geometry';
        geometry.textContent = choice.id === 'warrior_sweep_form_orbit'
          ? `360° · ${contract.radius.toFixed(1).replace('.', ',')} m · até ${contract.maxTargets} alvos · ${Math.round(contract.damageMultiplier * 100)}% dano`
          : `${contract.arcDegrees}° · ${contract.radius.toFixed(1).replace('.', ',')} m · até ${contract.maxTargets} alvos · ${Math.round(contract.damageMultiplier * 100)}% dano`;
        const requirement = document.createElement('small');
        requirement.textContent = `Requer ${martial?.label ?? 'Maestria Marcial'} Nv ${choice.requiredMasteryLevel} (atual Nv ${currentMasteryLevel}) · custo ${choice.cost} ponto`;

        const learn = document.createElement('button');
        learn.type = 'button';
        learn.textContent = selected ? 'Ativa' : anotherSelected ? 'Use Reset para trocar' : 'Escolher';
        learn.disabled = !learnable;
        learn.title = selected
          ? `${choice.label} ativa. Use Reset para trocar.`
          : anotherSelected
            ? 'Use Reset para trocar de Forma.'
            : !masteryMet
              ? `Requer Maestria Marcial Nv ${choice.requiredMasteryLevel}`
              : state.availablePoints < choice.cost
                ? 'Sem pontos'
                : `Escolher ${choice.label}`;
        learn.addEventListener('click', () => this.onTalentLearn(choice.id));

        card.append(top, diagram, description, geometry, requirement, learn);
        this.steelSweepFormChoices.append(card);
      }
    }

    this.talentTrees.replaceChildren();
    const trees: readonly TalentTree[] = ['fury', 'defense', 'weapons'];
    for (const tree of trees) {
      const column = document.createElement('section');
      column.className = 'talent-tree';
      const heading = document.createElement('h3');
      heading.textContent = WARRIOR_TALENT_TREE_LABELS[tree];
      column.append(heading);

      for (const talent of WARRIOR_TALENTS.filter((candidate) => candidate.tree === tree)) {
        const rank = talentRank(state, talent.id);
        const maxed = rank >= talent.maxRank;
        const requirementsMet = (talent.requires ?? []).every((requirement) => talentRank(state, requirement.talentId) >= requirement.rank);
        const learnable = canLearnTalent(state, talent);
        const card = document.createElement('article');
        card.className = 'talent-card';
        card.classList.toggle('locked', !requirementsMet);
        card.classList.toggle('maxed', maxed);
        card.classList.toggle('learnable', learnable);

        const top = document.createElement('div');
        top.className = 'talent-card-top';
        const name = document.createElement('strong');
        name.textContent = talent.name;
        const rankLabel = document.createElement('span');
        rankLabel.textContent = `${rank}/${talent.maxRank}`;
        top.append(name, rankLabel);

        const description = document.createElement('p');
        description.textContent = talent.description;

        const meta = document.createElement('small');
        const requirement = talentRequirementLabel(talent);
        meta.textContent = requirement ? `Requer ${requirement}` : 'Base';

        const learn = document.createElement('button');
        learn.type = 'button';
        learn.textContent = maxed ? 'Max' : '+';
        learn.title = maxed
          ? 'Nivel maximo'
          : !requirementsMet
            ? `Requer ${requirement}`
            : state.availablePoints < talent.cost
              ? 'Sem pontos'
              : `Aprender ${talent.name}`;
        learn.disabled = !learnable;
        learn.addEventListener('click', () => this.onTalentLearn(talent.id));

        card.append(top, description, meta, learn);
        column.append(card);
      }
      this.talentTrees.append(column);
    }
  }

  private updateTarget(
    target?: EntityState,
    npcTarget?: HudNpcTarget,
    entities: readonly EntityState[] = [],
  ): void {
    const visible = !!target && target.kind === 'enemy' && target.alive;
    const npcVisible = !visible && !!npcTarget;
    const nextNpcTargetId = npcVisible && npcTarget ? npcTarget.id : null;
    if (nextNpcTargetId !== this.activeNpcTargetId) {
      this.activeNpcTargetId = nextNpcTargetId;
      if (this.npcTargetFrameHovered) this.emitNpcTargetHover(this.activeNpcTargetId);
    }
    this.targetFrame.classList.toggle('open', visible || npcVisible);
    this.targetFrame.classList.toggle('npc-target', npcVisible);
    this.targetFrame.classList.toggle('actionable', !!this.activeNpcTargetId);
    this.targetFrame.setAttribute('aria-hidden', String(!visible && !npcVisible));
    this.targetFrame.tabIndex = this.activeNpcTargetId ? 0 : -1;
    this.targetFrame.setAttribute('role', this.activeNpcTargetId ? 'button' : 'group');
    if (npcVisible && npcTarget) {
      this.renderTargetStatuses([]);
      delete this.targetFrame.dataset.enemyVariant;
      delete this.targetFrame.dataset.bossPhase;
      delete this.targetFrame.dataset.runicPhase;
      this.targetFrame.dataset.kind = npcTarget.kind;
      this.targetFrame.dataset.tone = npcTarget.tone;
      this.targetName.textContent = npcTarget.name;
      this.targetSubtitle.textContent = npcTarget.subtitle;
      this.targetSubtitle.hidden = false;
      this.targetLevel.textContent = npcTarget.marker;
      this.targetHpFill.style.width = '100%';
      this.targetHpText.textContent = npcTarget.status;
      this.targetManaBar.classList.add('hidden');
      this.targetManaFill.style.width = '0%';
      this.targetManaText.textContent = '';
      this.targetFrame.title = npcTarget.subtitle || npcTarget.name;
      return;
    }
    if (!this.activeNpcTargetId && this.npcTargetFrameHovered) this.emitNpcTargetHover(null);
    delete this.targetFrame.dataset.kind;
    delete this.targetFrame.dataset.tone;
    delete this.targetFrame.dataset.enemyVariant;
    delete this.targetFrame.dataset.bossPhase;
    delete this.targetFrame.dataset.runicPhase;
    this.targetFrame.title = '';
    if (!visible || !target) {
      this.renderTargetStatuses([]);
      return;
    }

    const enemyPresentation = enemyPresentationForVariant(target.enemyVariant);
    const bossPhase = bossPhasePresentationGate(target);
    const bossPhaseTwo = bossPhase?.applies === true && bossPhase.phase === 2;
    const runicElite = runicElitePresentationGate(target);
    const difficultyModifiers = difficultyModifiersPresentationGate(target, this.activeDifficulty) ?? [];
    this.targetFrame.dataset.enemyVariant = enemyPresentation.variant;
    if (bossPhaseTwo) this.targetFrame.dataset.bossPhase = '2';
    if (runicElite) this.targetFrame.dataset.runicPhase = runicElite.phase;
    this.targetName.textContent = runicElite?.targetName ?? enemyPresentation.targetName;
    const baseTargetSubtitle = bossPhaseTwo
      ? 'Fase II • Ruptura do Selo'
      : runicElite?.targetSubtitle ?? enemyPresentation.targetSubtitle;
    const targetSubtitle = difficultyModifiers.length > 0
      ? `${baseTargetSubtitle ? `${baseTargetSubtitle} • ` : ''}${this.activeDifficulty.label} • ${difficultyModifiers.length} afixo(s)`
      : baseTargetSubtitle;
    this.targetSubtitle.textContent = targetSubtitle;
    this.targetSubtitle.hidden = !targetSubtitle;
    this.targetLevel.textContent = String(target.level);

    const hpRatio = barRatio(target.hp, target.maxHp);
    this.targetHpFill.style.width = `${hpRatio * 100}%`;
    this.targetHpText.textContent = `${Math.ceil(Math.max(0, target.hp))} / ${Math.round(target.maxHp)}`;
    this.renderTargetStatuses(
      Array.isArray(target.statuses) ? target.statuses : [],
      ashVeilStatusPresentationGate(target, entities) !== null,
      ruinExposedStatusPresentationGate(target, entities) !== null,
      arcaneResonanceStatusPresentationGate(target, entities) !== null,
      rootSnareStatusPresentationGate(target, entities) !== null,
      this.guardianRetaliationTargetId === target.id,
      bossPhaseTwo,
      runicElite,
      difficultyModifiers,
    );

    const mana = target.mana ?? 0;
    const maxMana = target.maxMana ?? 0;
    const hasMana = maxMana > 0;
    this.targetManaBar.classList.toggle('hidden', !hasMana);
    if (!hasMana) return;

    this.targetManaFill.style.width = `${barRatio(mana, maxMana) * 100}%`;
    this.targetManaText.textContent = `${Math.ceil(Math.max(0, mana))} / ${maxMana}`;
  }

  private renderTargetStatuses(
    statuses: readonly StatusState[],
    allowAshVeil = false,
    allowRuinExposed = false,
    allowArcaneResonance = false,
    allowRootSnare = false,
    showGuardianRetaliation = false,
    showBossRupture = false,
    runicElite: RunicElitePresentation | null = null,
    difficultyModifiers: readonly EnemyModifierState[] = [],
  ): void {
    const visible = statuses.filter((status) => (
      status.id === 'arcane-slow'
      || (allowArcaneResonance && status.id === 'arcane-resonance')
      || (allowRootSnare && status.id === 'root-snare')
      || (allowAshVeil && status.id === 'ash-veil')
      || (allowRuinExposed && status.id === 'ruin-exposed')
      || status.id === 'bulwark-taunt'
    ));
    this.targetStatusTray.replaceChildren();
    this.targetStatusTray.hidden = visible.length === 0 && !showGuardianRetaliation && !showBossRupture && !runicElite
      && difficultyModifiers.length === 0;
    for (const status of visible) {
      const chip = document.createElement('span');
      chip.className = 'target-status-chip';
      chip.dataset.status = status.id;
      chip.textContent = `${statusLabel(status)} · ${statusSeconds(status.remaining)}`;
      chip.title = status.id === 'bulwark-taunt'
        ? 'Provocado: este inimigo foi desafiado pelo Clamor do Baluarte.'
        : status.id === 'arcane-resonance'
          ? 'Marca de Ressonância: sua próxima Nova efetiva pode consumir uma marca própria para causar Ruptura e recuperar mana.'
        : status.id === 'root-snare'
          ? 'Enraizado: movimento reduzido em 35% enquanto o alvo permanecer no Círculo de Raízes.'
        : status.id === 'ash-veil'
          ? 'Véu de Cinzas: proteção de suporte mantida por um Corruptor de Cinzas.'
          : status.id === 'ruin-exposed'
            ? 'Exposto: as placas do Bruto foram quebradas por uma Guarda de Ferro perfeita.'
          : 'Descompasso reduz temporariamente a velocidade de movimento.';
      this.targetStatusTray.append(chip);
    }
    if (showGuardianRetaliation) {
      const chip = document.createElement('span');
      chip.className = 'target-status-chip';
      chip.dataset.status = 'guardian-retaliation';
      chip.textContent = 'Alvo da Retaliação';
      chip.title = 'Agressor marcado: use Golpe Pesado antes que a janela de Retaliação expire.';
      this.targetStatusTray.append(chip);
    }
    if (showBossRupture) {
      const chip = document.createElement('span');
      chip.className = 'target-status-chip';
      chip.dataset.status = 'boss-seal-rupture';
      chip.textContent = 'Ruptura';
      chip.title = 'Ruptura do Selo: o Boss Zumbi entrou na segunda fase.';
      this.targetStatusTray.append(chip);
    }
    for (const modifier of runicElite?.modifiers ?? []) {
      const chip = document.createElement('span');
      chip.className = 'target-status-chip';
      chip.dataset.status = modifier.id === 'runic_aegis' ? 'runic-aegis' : 'runic-fury';
      chip.dataset.active = String(modifier.active);
      chip.textContent = modifier.id === 'runic_aegis' ? 'Égide' : 'Fúria';
      chip.title = `${modifier.label}: ${modifier.description}${modifier.active ? ' (ativa)' : ' (aguardando)'}`;
      this.targetStatusTray.append(chip);
    }
    for (const modifier of difficultyModifiers) {
      const chip = document.createElement('span');
      chip.className = 'target-status-chip difficulty-affix-chip';
      chip.dataset.status = modifier.id.replaceAll('_', '-');
      chip.dataset.difficulty = this.activeDifficulty.id;
      chip.textContent = modifier.label;
      chip.title = `${modifier.label}: ${modifier.description}`;
      this.targetStatusTray.append(chip);
    }
  }

  private setNpcTargetFrameHovered(hovered: boolean): void {
    if (this.npcTargetFrameHovered === hovered) return;
    this.npcTargetFrameHovered = hovered;
    this.emitNpcTargetHover(hovered ? this.activeNpcTargetId : null);
  }

  private emitNpcTargetHover(npcId: string | null): void {
    if (this.emittedNpcTargetHoverId === npcId) return;
    this.emittedNpcTargetHoverId = npcId;
    this.onNpcTargetHover(npcId);
  }

  private updateArcaneNovaHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = catalogSkill(player.skills, 'arcane-nova');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const mana = player.mana ?? 0;
    const manaCost = skill?.manaCost ?? 0;
    const enoughMana = mana >= manaCost;
    const onCooldown = cooldown > 0.05;

    this.hotbarArcaneNovaSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarArcaneNovaSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarArcaneNovaSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarArcaneNovaSlot.setAttribute('aria-label', this.hotbarArcaneNovaSlot.title);
    this.hotbarArcaneNovaShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarArcaneNovaCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateArcaneBoltHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = catalogSkill(player.skills, 'arcane-bolt');
    if (!skill) {
      this.hotbarArcaneBoltSlot.classList.remove('on-cooldown', 'not-enough-mana', 'skill-queued');
      this.hotbarArcaneBoltShade.style.height = '0%';
      this.hotbarArcaneBoltCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const cooldownDuration = Math.max(0.01, skill.cooldown);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const onCooldown = cooldown > 0.05;

    this.hotbarArcaneBoltSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarArcaneBoltSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarArcaneBoltSlot.classList.toggle('skill-queued', skill.pending === true);
    this.hotbarArcaneBoltSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarArcaneBoltSlot.setAttribute('aria-label', this.hotbarArcaneBoltSlot.title);
    this.hotbarArcaneBoltShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarArcaneBoltCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateBulwarkCallHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = catalogSkill(player.skills, 'bulwark-call');
    if (!skill) {
      this.hotbarBulwarkCallSlot.classList.remove('on-cooldown');
      this.hotbarBulwarkCallShade.style.height = '0%';
      this.hotbarBulwarkCallCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const cooldownDuration = Math.max(0.01, skill.cooldown);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;
    const tooltip = this.doctrineSkillTooltip(skill, mastery);

    this.hotbarBulwarkCallSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarBulwarkCallSlot.title = tooltip;
    this.hotbarBulwarkCallSlot.setAttribute('aria-label', tooltip);
    this.hotbarBulwarkCallShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarBulwarkCallCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateStormOrbHotbar(player: EntityState): void {
    const skill = stormOrbSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarStormOrbSlot.classList.remove('on-cooldown', 'not-enough-mana', 'orb-active');
      this.hotbarStormOrbShade.style.height = '0%';
      this.hotbarStormOrbCooldown.textContent = '';
      this.hotbarStormOrbCharges.hidden = true;
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    const orb = stormOrbBuffPresentationGate(player);
    this.hotbarStormOrbSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarStormOrbSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarStormOrbSlot.classList.toggle('orb-active', orb !== null);
    this.hotbarStormOrbSlot.style.setProperty('--storm-orb', STORM_ORB_PALETTE.shell);
    this.hotbarStormOrbSlot.title = `${skill.label} — ${skill.description}\nMana ${skill.manaCost} · recarga ${skill.cooldown}s · alcance ${skill.range ?? 0}m`;
    this.hotbarStormOrbSlot.setAttribute('aria-label', this.hotbarStormOrbSlot.title);
    this.hotbarStormOrbShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarStormOrbCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
    this.hotbarStormOrbCharges.textContent = orb ? String(orb.buff.charges) : '';
    this.hotbarStormOrbCharges.hidden = orb === null;
  }

  private updateFeralFormHotbar(player: EntityState): void {
    const skill = feralFormSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarFeralFormSlot.classList.remove('on-cooldown', 'not-enough-mana', 'form-active');
      this.hotbarFeralFormShade.style.height = '0%';
      this.hotbarFeralFormCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    const active = feralFormBuffPresentationGate(player) !== null;
    this.hotbarFeralFormSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarFeralFormSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarFeralFormSlot.classList.toggle('form-active', active);
    this.hotbarFeralFormSlot.style.setProperty('--feral-form', FERAL_FORM_PALETTE.hide);
    this.hotbarFeralFormSlot.title = `${skill.label} — ${skill.description}\nMana ${skill.manaCost} · recarga ${skill.cooldown}s`;
    this.hotbarFeralFormSlot.setAttribute('aria-label', this.hotbarFeralFormSlot.title);
    this.hotbarFeralFormShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarFeralFormCooldown.textContent = onCooldown && !active ? String(Math.ceil(cooldown)) : '';
  }

  private updateRootSnareHotbar(player: EntityState): void {
    const skill = rootSnareSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarRootSnareSlot.classList.remove('on-cooldown', 'not-enough-mana');
      this.hotbarRootSnareShade.style.height = '0%';
      this.hotbarRootSnareCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    this.hotbarRootSnareSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarRootSnareSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarRootSnareSlot.style.setProperty('--root-snare', ROOT_SNARE_PALETTE.root);
    this.hotbarRootSnareSlot.title = `${skill.label} — ${skill.description}\nMana ${skill.manaCost} · recarga ${skill.cooldown}s · alcance ${skill.range ?? 0}m · mire no chão`;
    this.hotbarRootSnareSlot.setAttribute('aria-label', this.hotbarRootSnareSlot.title);
    this.hotbarRootSnareShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarRootSnareCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateChainLightningHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = chainLightningSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarChainLightningSlot.classList.remove('on-cooldown', 'not-enough-mana', 'skill-queued');
      this.hotbarChainLightningShade.style.height = '0%';
      this.hotbarChainLightningCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    this.hotbarChainLightningSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarChainLightningSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarChainLightningSlot.classList.toggle('skill-queued', skill.pending === true);
    this.hotbarChainLightningSlot.style.setProperty('--chain-lightning', CHAIN_LIGHTNING_PALETTE.bolt);
    this.hotbarChainLightningSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarChainLightningSlot.setAttribute('aria-label', this.hotbarChainLightningSlot.title);
    this.hotbarChainLightningShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarChainLightningCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateRenewalWaveHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = renewalWaveSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarRenewalWaveSlot.classList.remove('on-cooldown', 'not-enough-mana');
      this.hotbarRenewalWaveShade.style.height = '0%';
      this.hotbarRenewalWaveCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    this.hotbarRenewalWaveSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarRenewalWaveSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarRenewalWaveSlot.style.setProperty('--renewal-wave', RENEWAL_WAVE_PALETTE.leaf);
    this.hotbarRenewalWaveSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarRenewalWaveSlot.setAttribute('aria-label', this.hotbarRenewalWaveSlot.title);
    this.hotbarRenewalWaveShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarRenewalWaveCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updatePhaseStepHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = phaseStepSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarPhaseStepSlot.classList.remove('on-cooldown', 'not-enough-mana');
      this.hotbarPhaseStepShade.style.height = '0%';
      this.hotbarPhaseStepCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    this.hotbarPhaseStepSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarPhaseStepSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarPhaseStepSlot.style.setProperty('--phase-step', PHASE_STEP_PALETTE.trail);
    this.hotbarPhaseStepSlot.title = `${this.doctrineSkillTooltip(skill, mastery)}\nAponte para o chão; não atravessa paredes.`;
    this.hotbarPhaseStepSlot.setAttribute('aria-label', this.hotbarPhaseStepSlot.title);
    this.hotbarPhaseStepShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarPhaseStepCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateNatureSpiritHotbar(
    player: EntityState,
    mastery: MasteryProgressState | null,
    spirits: readonly NatureSpiritState[],
  ): void {
    const skill = natureSpiritSkillPresentationGate(player.skills);
    if (!skill) {
      this.hotbarNatureSpiritSlot.classList.remove('on-cooldown', 'not-enough-mana', 'spirit-active');
      this.hotbarNatureSpiritShade.style.height = '0%';
      this.hotbarNatureSpiritCooldown.textContent = '';
      return;
    }
    const cooldown = Math.max(0, skill.cooldownRemaining);
    const onCooldown = cooldown > 0.05;
    const enoughMana = (player.mana ?? 0) >= skill.manaCost;
    const cooldownRatio = skill.cooldown > 0 ? Math.min(1, cooldown / skill.cooldown) : 0;
    const active = spirits.find((spirit) => spirit.ownerId === player.id);
    this.hotbarNatureSpiritSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarNatureSpiritSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarNatureSpiritSlot.classList.toggle('spirit-active', active !== undefined);
    this.hotbarNatureSpiritSlot.style.setProperty('--nature-spirit', NATURE_SPIRIT_PALETTE.leaf);
    this.hotbarNatureSpiritSlot.title = `${this.doctrineSkillTooltip(skill, mastery)}${active ? `\nATIVO · ${Math.ceil(active.remaining)}s restantes` : ''}`;
    this.hotbarNatureSpiritSlot.setAttribute('aria-label', this.hotbarNatureSpiritSlot.title);
    this.hotbarNatureSpiritShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarNatureSpiritCooldown.textContent = active ? String(Math.ceil(active.remaining)) : onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateTemporarySkillLocks(skills: readonly ReturnType<typeof normalizeSkillCatalog>[number][]): void {
    const slots = this.hotbarActionSlots();
    for (const skill of skills) {
      const slot = slots[skill.id];
      slot.classList.toggle('skill-temporarily-blocked', skill.blocked === true);
      if (skill.blocked && skill.blockedReason) {
        slot.title = `${slot.title}\nBLOQUEADA: ${skill.blockedReason}`;
        slot.setAttribute('aria-label', slot.title);
      }
    }
  }

  private updateWarCryHotbar(player: EntityState): void {
    const skill = catalogSkill(player.skills, 'war-cry');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarWarCrySlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarWarCrySlot.title = this.doctrineSkillTooltip(skill);
    this.hotbarWarCryShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarWarCryCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateHeavyStrikeHotbar(player: EntityState, mastery: MasteryProgressState): void {
    const skill = catalogSkill(player.skills, 'heavy-strike');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarHeavyStrikeSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarHeavyStrikeSlot.classList.toggle('skill-queued', skill?.pending === true);
    this.hotbarHeavyStrikeSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarHeavyStrikeSlot.setAttribute('aria-label', this.hotbarHeavyStrikeSlot.title);
    this.hotbarHeavyStrikeShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarHeavyStrikeCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateChargeHotbar(player: EntityState, mastery: MasteryProgressState): void {
    const skill = catalogSkill(player.skills, 'charge');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarChargeSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarChargeSlot.classList.toggle('skill-queued', skill?.pending === true);
    this.hotbarChargeSlot.title = this.doctrineSkillTooltip(skill, mastery);
    this.hotbarChargeSlot.setAttribute('aria-label', this.hotbarChargeSlot.title);
    this.hotbarChargeShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarChargeCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateSteelSweepHotbar(player: EntityState, snapshot: WorldSnapshot, mastery: MasteryProgressState): void {
    const skill = catalogSkill(player.skills, 'steel-sweep');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 5.5);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;
    const variant = resolveSteelSweepVariant(skill?.variant, snapshot.equipment, snapshot.inventory);
    const presentation = steelSweepPresentationForVariant(variant);
    const hasPhysicalWeapon = variant !== null;
    const formContract = this.activeSteelSweepFormId
      ? STEEL_SWEEP_FORM_CONTRACTS[this.activeSteelSweepFormId]
      : null;
    const geometry = this.activeSteelSweepFormId === 'warrior_sweep_form_orbit'
      ? `Área 360° de ${formContract!.radius.toFixed(1).replace('.', ',')} m para até ${formContract!.maxTargets} alvos`
      : this.activeSteelSweepFormId === 'warrior_sweep_form_wedge'
        ? `Cone de ${formContract!.arcDegrees}° por ${formContract!.radius.toFixed(1).replace('.', ',')} m para até ${formContract!.maxTargets} alvos`
        : 'Área física de 3,4 m para até 5 alvos';
    const tooltip = this.doctrineSkillTooltip(
      skill,
      mastery,
      `${skill.description ?? presentation.description} ${geometry}`,
    );

    this.hotbarSteelSweepSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarSteelSweepSlot.classList.toggle('weapon-required', !hasPhysicalWeapon && !onCooldown);
    this.hotbarSteelSweepSlot.dataset.steelSweepVariant = variant ?? 'none';
    this.hotbarSteelSweepSlot.title = tooltip;
    this.hotbarSteelSweepSlot.setAttribute('aria-label', tooltip);
    this.hotbarSteelSweepBadge.textContent = presentation.badge;
    this.hotbarSteelSweepBadge.hidden = variant === null;
    this.hotbarSteelSweepFormBadge.textContent = this.activeSteelSweepFormId === 'warrior_sweep_form_orbit'
      ? 'ÓRBITA'
      : this.activeSteelSweepFormId === 'warrior_sweep_form_wedge'
        ? 'CUNHA'
        : '';
    this.hotbarSteelSweepFormBadge.hidden = this.activeSteelSweepFormId === null;
    if (this.activeSteelSweepFormId) this.hotbarSteelSweepSlot.dataset.steelSweepForm = this.activeSteelSweepFormId;
    else delete this.hotbarSteelSweepSlot.dataset.steelSweepForm;
    this.hotbarSteelSweepShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarSteelSweepCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateIronGuardHotbar(player: EntityState, mastery: MasteryProgressState | null): void {
    const skill = catalogSkill(player.skills, 'iron-guard');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 7);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarIronGuardSlot.classList.toggle('on-cooldown', onCooldown);
    const tooltip = this.doctrineSkillTooltip(
      skill,
      mastery,
      `${skill.description ?? ''} Por 1,4 s bloqueia 45% do dano; nos primeiros 0,35 s, o bloqueio perfeito reduz 80%; mover, atacar, pular ou usar outra habilidade cancela`,
    );
    this.hotbarIronGuardSlot.title = tooltip;
    this.hotbarIronGuardSlot.setAttribute('aria-label', tooltip);
    this.hotbarIronGuardShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarIronGuardCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateConsumableHotbar(snapshot: WorldSnapshot): void {
    const healthPotion = snapshot.inventory.find((item) => item.kind === 'potion' && item.stackable);
    const manaPotion = snapshot.inventory.find((item) => item.kind === 'mana_potion' && item.stackable);
    this.updateConsumableSlot(this.hotbarHealthPotionSlot, this.hotbarHealthPotionCount, healthPotion, 'Poção Rubra');
    this.updateConsumableSlot(this.hotbarManaPotionSlot, this.hotbarManaPotionCount, manaPotion, 'Poção Azul');
  }

  private updateConsumableSlot(slot: HTMLElement, countEl: HTMLElement, item: InventoryItem | undefined, label: string): void {
    const count = item?.count ?? 0;
    slot.classList.toggle('empty', count <= 0);
    slot.title = count > 0 ? `${label} (${count})` : `${label} vazia`;
    countEl.textContent = count > 0 ? String(count) : '';
    if (item) {
      this.bindItemTooltip(slot, item);
    } else {
      this.itemTooltipCleanup.get(slot)?.();
      this.itemTooltipCleanup.delete(slot);
      slot.removeAttribute('aria-describedby');
    }
  }

  private stackCount(snapshot: WorldSnapshot, kind: ItemKind): number {
    return snapshot.inventory.find((item) => item.kind === kind && item.stackable)?.count ?? 0;
  }

  private renderVendorItems(vendor: HudVendorPanel): void {
    this.hideItemTooltip();
    this.vendorItems.replaceChildren();
    const recommendedItemId = vendorRecommendedItemId({ coins: vendor.coins, items: vendor.items });
    if ((vendor.sellUnusedCount ?? 0) > 0 && (vendor.sellUnusedValue ?? 0) > 0) {
      const row = document.createElement('div');
      row.className = 'vendor-item vendor-sell-row';

      const icon = document.createElement('div');
      icon.className = 'vendor-sell-icon';
      icon.textContent = '$';

      const details = document.createElement('span');
      details.className = 'vendor-item-details';
      const name = document.createElement('strong');
      name.textContent = 'Vender equipamentos';
      const meta = document.createElement('small');
      const count = vendor.sellUnusedCount ?? 0;
      meta.textContent = `${count} item${count === 1 ? '' : 's'} - ${vendor.sellUnusedValue} moedas`;
      const tagline = document.createElement('em');
      tagline.textContent = 'A arma equipada fica guardada.';
      details.append(name, meta, tagline);

      const sell = document.createElement('button');
      sell.type = 'button';
      sell.className = 'vendor-buy vendor-sell-button';
      sell.textContent = this.vendorSellPending ? 'Enviando' : 'Vender';
      sell.disabled = this.vendorSellPending;
      sell.addEventListener('click', () => this.onVendorSellUnused(vendor.id));

      row.append(icon, details, sell);
      this.vendorItems.append(row);
    }

    for (const item of vendor.items) {
      const row = document.createElement('div');
      row.className = 'vendor-item';
      const offer = vendorOfferModel({ coins: vendor.coins, items: vendor.items, item, recommendedItemId });
      row.classList.toggle('sold-out', offer.soldOut);
      row.classList.toggle('recommended', offer.tone === 'buy-now');
      row.classList.toggle('saving', offer.tone === 'save-up');
      if (item.rarity) row.style.borderColor = RARITY_COLORS[item.rarity];

      const image = document.createElement('img');
      image.src = item.icon;
      image.alt = item.name;
      image.loading = 'eager';
      image.decoding = 'async';

      const details = document.createElement('span');
      details.className = 'vendor-item-details';
      const nameLine = document.createElement('span');
      nameLine.className = 'vendor-item-name-line';
      const name = document.createElement('strong');
      name.textContent = item.name;
      nameLine.append(name);
      if (offer.badgeLabel) {
        const badge = document.createElement('b');
        badge.className = 'vendor-item-badge';
        badge.dataset.tone = offer.tone;
        badge.textContent = offer.badgeLabel;
        nameLine.append(badge);
      }
      const meta = document.createElement('small');
      meta.textContent = offer.metaLabel;
      details.append(nameLine, meta);
      if (item.tagline) {
        const tagline = document.createElement('em');
        tagline.textContent = item.tagline;
        details.append(tagline);
      }
      const status = document.createElement('em');
      status.className = 'vendor-item-offer';
      status.textContent = offer.statusLabel;
      details.append(status);

      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'vendor-buy';
      const pending = this.vendorPendingItemIds.has(item.id);
      buy.textContent = offer.soldOut ? 'Esgotado' : pending ? 'Enviando' : 'Comprar';
      buy.disabled = offer.soldOut || pending || !offer.affordable;
      buy.addEventListener('click', () => this.onVendorBuy(vendor.id, item.id));

		if (!item.service) this.bindItemTooltip(row, item);
      row.append(image, details, buy);
      this.vendorItems.append(row);
    }
  }

  private renderStashItems(stash: HudStashPanel): void {
    this.hideItemTooltip();
    this.renderStashColumn(this.stashBagItems, stash.bagItems, 'deposit', stash.id);
    this.renderStashColumn(this.stashBankItems, stash.stashItems, 'withdraw', stash.id);
  }

  private renderStashColumn(container: HTMLElement, items: HudStashItem[], action: 'deposit' | 'withdraw', npcId: string): void {
    container.replaceChildren();
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'stash-empty';
      empty.textContent = action === 'deposit' ? 'Nada para guardar' : 'Banco vazio';
      container.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'stash-item';

      const image = document.createElement('img');
      image.src = item.icon;
      image.alt = item.name;
      image.loading = 'eager';
      image.decoding = 'async';

      const details = document.createElement('span');
      details.className = 'stash-item-details';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const meta = document.createElement('small');
      if (item.stackable) {
        meta.textContent = `${item.count}x`;
      } else {
        const up = item.upgradeLevel ? ` +${item.upgradeLevel}` : '';
        const rarity = item.rarity ? `${item.rarity}${up}` : `arma${up}`;
        const range = weaponRange(item);
        meta.textContent = range ? `${rarity} - ${range}` : rarity;
      }
      details.append(name, meta);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stash-action';
      const pending = this.stashPendingKeys.has(`${action}:${item.id}`);
      button.textContent = pending ? 'Enviando' : action === 'deposit' ? 'Guardar' : 'Retirar';
      button.disabled = pending;
      button.addEventListener('click', () => {
        if (action === 'deposit') this.onStashDeposit(npcId, item);
        else this.onStashWithdraw(npcId, item);
      });

      this.bindItemTooltip(row, item);
      row.append(image, details, button);
      container.append(row);
    }
  }

  private renderMinimap(snapshot: WorldSnapshot, player: EntityState): void {
    const ctx = this.minimapContext;
    if (!ctx) return;

    const rect = this.minimapCanvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MINIMAP_MAX_DPR);
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));
    if (this.minimapCanvas.width !== bufferWidth || this.minimapCanvas.height !== bufferHeight) {
      this.minimapCanvas.width = bufferWidth;
      this.minimapCanvas.height = bufferHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const radius = Math.min(cssWidth, cssHeight) * 0.46;
    const worldRadius = snapshot.zone === 'dungeon' ? 28 : 58;
    const scale = radius / worldRadius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = snapshot.zone === 'dungeon' ? 'rgba(5, 7, 11, 0.82)' : 'rgba(10, 20, 18, 0.78)';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    this.drawMinimapGrid(ctx, cx, cy, radius);

    const toMap = (x: number, z: number) => ({
      x: cx + (x - player.position.x) * scale,
      y: cy + (z - player.position.z) * scale,
    });

    if (snapshot.zone === 'overworld') {
      this.drawMinimapDiamond(ctx, toMap(this.world.dungeon.x, this.world.dungeon.z), cx, cy, radius, '#6ecae5', 4.6);
    } else {
      this.drawMinimapDiamond(ctx, toMap(MINIMAP_DUNGEON_EXIT.x, MINIMAP_DUNGEON_EXIT.z), cx, cy, radius, '#6ecae5', 4.6);
    }

    const encounter = sealChamberStatePresentationGate(snapshot.encounter, snapshot.zone);
    if (encounter) {
      const seal = toMap(encounter.center.x, encounter.center.z);
      ctx.save();
      ctx.strokeStyle = encounter.barrierActive ? '#e46dff' : 'rgba(202, 154, 225, 0.72)';
      ctx.lineWidth = encounter.barrierActive ? 2 : 1;
      ctx.setLineDash(encounter.barrierActive ? [] : [3, 3]);
      ctx.beginPath();
      ctx.arc(seal.x, seal.y, encounter.barrierRadius * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      this.drawMinimapDiamond(ctx, seal, cx, cy, radius, encounter.completed ? '#d8b969' : '#f2b6ff', 4.8);
    }

    const treasureLode = treasureLodeStatePresentationGate(snapshot.treasureLode);
    if (treasureLode) {
      const center = toMap(treasureLode.center.x, treasureLode.center.z);
      this.drawMinimapDiamond(ctx, center, cx, cy, radius, treasureLodeColor(treasureLode), 5.1);
      if (treasureLode.rewardReady) {
        const chest = toMap(treasureLode.chestPosition.x, treasureLode.chestPosition.z);
        this.drawMinimapSquare(ctx, chest, cx, cy, radius, TREASURE_LODE_PALETTE.chest, 4.8);
      }
    }

    const utraeanRelay = utraeanRelayStatePresentationGate(snapshot.utraeanRelay);
    if (utraeanRelay && snapshot.zone === 'overworld') {
      const center = toMap(utraeanRelay.center.x, utraeanRelay.center.z);
      this.drawMinimapDiamond(ctx, center, cx, cy, radius, utraeanRelayColor(utraeanRelay), 5.2);
      for (const rune of utraeanRelay.runes) {
        const runePoint = toMap(rune.position.x, rune.position.z);
        const color = rune.current
          ? UTRAEAN_RELAY_PALETTE.current
          : rune.activated ? UTRAEAN_RELAY_PALETTE.activated : UTRAEAN_RELAY_PALETTE.dormant;
        this.drawMinimapDiamond(ctx, runePoint, cx, cy, radius, color, rune.current ? 4.8 : 3.4);
      }
      if (utraeanRelay.phase === 'reward' && !utraeanRelay.claimed) {
        const chest = toMap(utraeanRelay.chestPosition.x, utraeanRelay.chestPosition.z);
        this.drawMinimapSquare(ctx, chest, cx, cy, radius, UTRAEAN_RELAY_PALETTE.reward, 4.8);
      }
    }

    const frostBiome = arhokFrostBiomePresentationGate(snapshot.biome);
    if (frostBiome && snapshot.zone === 'overworld') {
      for (const source of frostBiome.warmthSources) {
        this.drawMinimapDiamond(
          ctx,
          toMap(source.position.x, source.position.z),
          cx,
          cy,
          radius,
          ARHOK_FROST_PALETTE.warmth,
          frostBiome.warmth && Math.hypot(source.position.x - player.position.x, source.position.z - player.position.z) <= source.radius ? 5.4 : 3.8,
        );
      }
    }

    const jungle = corruptedJunglePresentationGate(snapshot.jungle);
    if (jungle && snapshot.zone === 'overworld') {
      for (const pod of jungle.pods) {
        this.drawMinimapDiamond(
          ctx,
          toMap(pod.position.x, pod.position.z),
          cx,
          cy,
          radius,
          CORRUPTED_JUNGLE_PALETTE[pod.phase],
          pod.phase === 'active' ? 5.2 : pod.phase === 'warning' ? 4.4 : 3.2,
        );
      }
    }

    for (const zone of snapshot.controlZones ?? []) {
      if (zone.kind !== 'root-snare') continue;
      const point = toMap(zone.position.x, zone.position.z);
      ctx.save();
      ctx.strokeStyle = ROOT_SNARE_PALETTE.thorn;
      ctx.fillStyle = 'rgba(131, 184, 79, 0.14)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(point.x, point.y, zone.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (const npc of this.minimapNpcs) {
      if (npc.zone !== snapshot.zone) continue;
      const p = toMap(npc.position.x, npc.position.z);
      this.drawMinimapNpcMarker(
        ctx,
        p,
        cx,
        cy,
        radius,
        this.minimapNpcColor(npc.kind),
        npc.marker ?? this.minimapNpcGlyph(npc.kind),
        npcMinimapMarkerVisualState(npc),
      );
    }

    for (const displacer of snapshot.displacers ?? []) {
      if (displacer.zone !== snapshot.zone || (!displacer.activated && !displacer.current)) continue;
      const point = toMap(displacer.position.x, displacer.position.z);
      this.drawMinimapDiamond(
        ctx,
        point,
        cx,
        cy,
        radius,
        displacerColor(displacer),
        displacer.current ? 5.6 : 4.4,
      );
    }

    for (const chest of snapshot.chests) {
      const p = toMap(chest.position.x, chest.position.z);
      this.drawMinimapSquare(ctx, p, cx, cy, radius, chest.opened ? 'rgba(154, 112, 71, 0.46)' : '#f2b34c', 4);
    }

    for (const loot of snapshot.loot) {
      const p = toMap(loot.position.x, loot.position.z);
      const color = loot.kind === 'potion'
        ? '#e65f70'
        : loot.kind === 'mana_potion'
          ? '#5aa9ff'
          : loot.kind === 'coin'
            ? '#ffd874'
            : isGemKind(loot.kind)
              ? GEM_GLOW_COLORS[GEM_DEFINITIONS[loot.kind].glowGem]
              : '#d7e3ef';
      this.drawMinimapDot(ctx, p, cx, cy, radius, color, loot.kind === 'sword' ? 3.7 : 2.6);
    }

    for (const entity of snapshot.entities) {
      if (!entity.alive || entity.id === player.id) continue;
      const p = toMap(entity.position.x, entity.position.z);
      if (entity.kind === 'player') {
        this.drawMinimapDot(ctx, p, cx, cy, radius, '#62e6a1', 4.2);
        continue;
      }
      if (entity.kind !== 'enemy') continue;
      const enemyPresentation = enemyPresentationForVariant(entity.enemyVariant);
      const bossPhase = bossPhasePresentationGate(entity);
      const runicElite = runicElitePresentationGate(entity);
      const difficultyModifiers = difficultyModifiersPresentationGate(entity, snapshot.difficulty) ?? [];
      if (difficultyModifiers.length > 0) {
        this.drawMinimapDot(
          ctx,
          p,
          cx,
          cy,
          radius,
          DIFFICULTY_PALETTE[snapshot.difficulty.id],
          (runicElite ? 4.8 : enemyPresentation.minimapSize) + 2.6,
        );
      }
      const minimapRingColor = bossPhase?.applies === true && bossPhase.phase === 2
        ? BOSS_SEAL_PALETTE.minimapRing
        : runicElite
          ? runicElite.phase === 'fury' ? RUNIC_ELITE_PALETTE.minimapFuryRing : RUNIC_ELITE_PALETTE.minimapRing
          : enemyPresentation.minimapRingColor;
      if (minimapRingColor) {
        this.drawMinimapDot(
          ctx,
          p,
          cx,
          cy,
          radius,
          minimapRingColor,
          (runicElite ? 4.8 : enemyPresentation.minimapSize) + 1.5,
        );
      }
      this.drawMinimapDot(
        ctx,
        p,
        cx,
        cy,
        radius,
        runicElite ? RUNIC_ELITE_PALETTE.minimap : enemyPresentation.minimapColor,
        runicElite ? 4.8 : enemyPresentation.minimapSize,
      );
    }

    ctx.restore();
    this.drawMinimapPlayer(ctx, cx, cy, player.rotationY);
    this.drawMinimapBorder(ctx, cx, cy, radius);
  }

  private drawMinimapGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.strokeStyle = 'rgba(216, 185, 105, 0.13)';
    ctx.lineWidth = 1;
    for (const ratio of [0.34, 0.67]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * ratio, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
  }

  private minimapNpcColor(kind: NpcKind): string {
    return npcServiceAccentCss(kind);
  }

  private minimapNpcGlyph(kind: NpcKind): string {
    return npcServiceGlyph(kind);
  }

  private drawMinimapNpcMarker(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number },
    cx: number,
    cy: number,
    radius: number,
    color: string,
    marker: string,
    visual: NpcMinimapMarkerVisualState,
  ): void {
    const size = (marker.length > 1 ? 5.4 : 4.8) * visual.sizeMultiplier;
    const clamped = this.clampMinimapPoint(p, cx, cy, radius - size - 7);
    if (visual.haloRadius > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = visual.haloColor;
      ctx.arc(clamped.x, clamped.y, size + visual.haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.drawMinimapDiamond(ctx, clamped, cx, cy, radius, color, size);
    ctx.save();
    ctx.font = `900 ${marker.length > 1 ? 7 : 9}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(2, 5, 8, 0.92)';
    ctx.fillStyle = '#f8feff';
    ctx.strokeText(marker, clamped.x, clamped.y + 0.2);
    ctx.fillText(marker, clamped.x, clamped.y + 0.2);
    ctx.restore();
  }

  private drawMinimapBorder(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.62, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(110, 202, 229, 0)');
    gradient.addColorStop(1, 'rgba(110, 202, 229, 0.18)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(211, 181, 105, 0.68)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawMinimapPlayer(ctx: CanvasRenderingContext2D, cx: number, cy: number, rotationY: number): void {
    const tip = 8;
    const side = 5.2;
    ctx.fillStyle = '#effcff';
    ctx.strokeStyle = 'rgba(7, 12, 18, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(rotationY) * tip, cy + Math.cos(rotationY) * tip);
    ctx.lineTo(cx + Math.sin(rotationY + 2.42) * side, cy + Math.cos(rotationY + 2.42) * side);
    ctx.lineTo(cx + Math.sin(rotationY - 2.42) * side, cy + Math.cos(rotationY - 2.42) * side);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  private drawMinimapDot(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number },
    cx: number,
    cy: number,
    radius: number,
    color: string,
    size: number,
  ): void {
    const clamped = this.clampMinimapPoint(p, cx, cy, radius - size - 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(clamped.x, clamped.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMinimapSquare(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number },
    cx: number,
    cy: number,
    radius: number,
    color: string,
    size: number,
  ): void {
    const clamped = this.clampMinimapPoint(p, cx, cy, radius - size - 2);
    ctx.fillStyle = color;
    ctx.fillRect(clamped.x - size, clamped.y - size, size * 2, size * 2);
  }

  private drawMinimapDiamond(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number },
    cx: number,
    cy: number,
    radius: number,
    color: string,
    size: number,
  ): void {
    const clamped = this.clampMinimapPoint(p, cx, cy, radius - size - 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(clamped.x, clamped.y - size);
    ctx.lineTo(clamped.x + size, clamped.y);
    ctx.lineTo(clamped.x, clamped.y + size);
    ctx.lineTo(clamped.x - size, clamped.y);
    ctx.closePath();
    ctx.fill();
  }

  private clampMinimapPoint(
    p: { x: number; y: number },
    cx: number,
    cy: number,
    maxDistance: number,
  ): { x: number; y: number } {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const distance = Math.hypot(dx, dy);
    if (distance <= maxDistance || distance <= 0.001) return p;
    const ratio = maxDistance / distance;
    return { x: cx + dx * ratio, y: cy + dy * ratio };
  }

  private setMenuOpen(open: boolean): void {
    this.gameMenuOpen = open;
    this.gameMenu.classList.toggle('open', open);
    this.gameMenu.setAttribute('aria-hidden', String(!open));
    if (!open) this.hideItemTooltip();
  }

  private hideItemTooltip(anchor?: HTMLElement): void {
    if (anchor && this.tooltipAnchor !== anchor) return;
    this.tooltipAnchor?.removeAttribute('aria-describedby');
    this.tooltipAnchor = null;
    this.tooltipWorldKey = '';
    this.itemTooltip.classList.remove('open');
    this.itemTooltip.setAttribute('aria-hidden', 'true');
  }

  private positionItemTooltip(clientX: number, clientY: number): void {
    const margin = 10;
    const offset = 18;
    const rect = this.itemTooltip.getBoundingClientRect();
    let left = clientX + offset;
    let top = clientY + offset;
    if (left+rect.width > window.innerWidth-margin) left = clientX-rect.width-offset;
    if (top+rect.height > window.innerHeight-margin) top = clientY-rect.height-offset;
    left = Math.max(margin, Math.min(left, window.innerWidth-rect.width-margin));
    top = Math.max(margin, Math.min(top, window.innerHeight-rect.height-margin));
    this.itemTooltip.style.left = `${Math.round(left)}px`;
    this.itemTooltip.style.top = `${Math.round(top)}px`;
  }

  private tooltipComparisonItem(item: TooltipItem): { item: InventoryItem; slot: EquipmentSlot } | null {
    if (item.equipped || !this.tooltipEquipment) return null;
    const compatibleSlots = equipSlotsForKind(item.kind);
    if (compatibleSlots.length === 0) return null;
    const candidates = compatibleSlots
      .map((slot) => {
        const equippedId = this.tooltipEquipment?.[slot];
        const equipped = equippedId ? this.tooltipInventory.find((candidate) => candidate.id === equippedId) : undefined;
        return equipped ? { item: equipped, slot } : null;
      })
      .filter((candidate): candidate is { item: InventoryItem; slot: EquipmentSlot } => !!candidate);
    if (candidates.length === 0) return null;
    const score = (candidate: InventoryItem) => tooltipStatLines(candidate)
      .reduce((total, line) => total+Math.max(0, line.numericValue), 0);
    return candidates.reduce((weakest, candidate) => (
      score(candidate.item) < score(weakest.item) ? candidate : weakest
    ));
  }

  private renderItemTooltip(item: TooltipItem, equippedSlot?: EquipmentSlot, interactionHint?: string): void {
    this.itemTooltip.replaceChildren();
    this.itemTooltip.dataset.rarity = item.rarity ?? 'comum';

    const header = document.createElement('header');
    header.className = 'item-tooltip-header';
    const name = document.createElement('strong');
    name.className = 'item-tooltip-name';
    name.textContent = tooltipItemTitle(item);
    const type = document.createElement('span');
    type.className = 'item-tooltip-type';
    type.textContent = tooltipItemType(item);
    header.append(name, type);
    this.itemTooltip.append(header);

    const metaValues = tooltipItemMeta(item);
    if (equippedSlot) {
      const equippedIndex = metaValues.indexOf('Equipado');
      if (equippedIndex >= 0) metaValues.splice(equippedIndex, 1, `Equipado: ${equipmentSlotLabel(equippedSlot)}`);
      else metaValues.push(`Equipado: ${equipmentSlotLabel(equippedSlot)}`);
    }
    if (metaValues.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'item-tooltip-meta';
      for (const value of metaValues) {
        const chip = document.createElement('span');
        chip.textContent = value;
        meta.append(chip);
      }
      this.itemTooltip.append(meta);
    }

    const stats = tooltipStatLines(item);
    if (stats.length > 0) {
      const section = document.createElement('section');
      section.className = 'item-tooltip-section item-tooltip-stats';
      for (const stat of stats) {
        const row = document.createElement('div');
        row.className = 'item-tooltip-row';
        row.dataset.stat = stat.key;
        const label = document.createElement('span');
        label.textContent = stat.label;
        const value = document.createElement('strong');
        value.textContent = stat.value;
        row.append(label, value);
        section.append(row);
      }
      this.itemTooltip.append(section);
    }

    const setItem = equipmentSetItemPresentation(item);
    if (setItem) {
      const progress = equipmentSetStateFor(this.tooltipEquipmentSets, setItem.definition.id);
      const equippedCount = progress?.piecesEquipped ?? 0;
      const section = document.createElement('section');
      section.className = 'item-tooltip-section item-tooltip-set';
      section.style.setProperty('--equipment-set', EQUIPMENT_SET_COLORS[setItem.definition.id]);
      const title = document.createElement('span');
      title.className = 'item-tooltip-section-title';
      title.textContent = `${setItem.definition.label} · ${equippedCount}/3 equipado`;
      section.append(title);
      for (const piece of setItem.definition.pieces) {
        const row = document.createElement('div');
        row.className = 'item-tooltip-set-piece';
        row.dataset.current = piece.id === setItem.piece.id ? 'true' : 'false';
        row.textContent = `${piece.id === setItem.piece.id ? '◆' : '◇'} ${piece.label}`;
        section.append(row);
      }
      for (const expected of setItem.definition.bonuses) {
        const announced = progress?.bonuses.find((bonus) => bonus.pieces === expected.pieces);
        const row = document.createElement('div');
        row.className = 'item-tooltip-set-bonus';
        row.dataset.active = announced?.active === true ? 'true' : 'false';
        row.textContent = `(${expected.pieces}) ${announced?.label ?? expected.label}: ${announced?.description ?? expected.description}`;
        section.append(row);
      }
      this.itemTooltip.append(section);
    }

    const affixes = item.affixes ?? [];
    if (affixes.length > 0) {
      const section = document.createElement('section');
      section.className = 'item-tooltip-section item-tooltip-affixes';
      const title = document.createElement('span');
      title.className = 'item-tooltip-section-title';
      title.textContent = `Afixos rolados · ${affixes.length}`;
      section.append(title);
      for (const affix of affixes) {
        const row = document.createElement('div');
        row.className = 'item-tooltip-affix';
        row.dataset.category = affix.category;
        const identity = document.createElement('span');
        identity.className = 'item-tooltip-affix-name';
        const rollRange = affix.valueMin !== undefined && affix.valueMax !== undefined
          ? ` · faixa ${affix.valueMin}–${affix.valueMax}`
          : '';
        identity.textContent = `${affix.name} · T${affix.tier}${rollRange}`;
        const value = document.createElement('strong');
        value.textContent = tooltipAffixValue(affix);
        row.append(identity, value);
        section.append(row);
      }
      this.itemTooltip.append(section);
    }

    const compared = this.tooltipComparisonItem(item);
    if (compared) {
      const section = document.createElement('section');
      section.className = 'item-tooltip-section item-tooltip-comparison';
      const title = document.createElement('span');
      title.className = 'item-tooltip-section-title';
      title.textContent = `Comparação direta · ${tooltipItemTitle(compared.item)} · ${equipmentSlotLabel(compared.slot)}`;
      section.append(title);
      for (const comparison of tooltipComparisonLines(item, compared.item)) {
        const row = document.createElement('div');
        row.className = 'item-tooltip-row item-tooltip-delta';
        row.dataset.tone = comparison.tone;
        const label = document.createElement('span');
        label.textContent = comparison.label;
        const value = document.createElement('strong');
        value.textContent = comparison.value;
        row.append(label, value);
        section.append(row);
      }
      if (isTwoHandedKind(item.kind) && this.tooltipEquipment?.offhand) {
        const warning = document.createElement('small');
        warning.className = 'item-tooltip-warning';
        warning.textContent = 'Equipar esta arma também remove o item da mão secundária.';
        section.append(warning);
      }
      this.itemTooltip.append(section);
    }

    const description = tooltipItemDescription(item);
    if (description) {
      const text = document.createElement('p');
      text.className = 'item-tooltip-description';
      text.textContent = description;
      this.itemTooltip.append(text);
    }
    const hint = interactionHint ?? tooltipInteractionHint(item);
    if (hint) {
      const footer = document.createElement('footer');
      footer.textContent = hint;
      this.itemTooltip.append(footer);
    }
  }

  private bindItemTooltip(element: HTMLElement, item: TooltipItem, equippedSlot?: EquipmentSlot): void {
    this.itemTooltipCleanup.get(element)?.();
    element.removeAttribute('title');
    const show = (clientX: number, clientY: number) => {
      this.tooltipAnchor?.removeAttribute('aria-describedby');
      this.tooltipAnchor = element;
      this.tooltipWorldKey = '';
      element.setAttribute('aria-describedby', 'item-tooltip');
      this.renderItemTooltip(item, equippedSlot);
      this.itemTooltip.classList.add('open');
      this.itemTooltip.setAttribute('aria-hidden', 'false');
      this.positionItemTooltip(clientX, clientY);
    };
    const onPointerEnter = (event: PointerEvent) => show(event.clientX, event.clientY);
    const onPointerMove = (event: PointerEvent) => {
      if (this.tooltipAnchor === element) this.positionItemTooltip(event.clientX, event.clientY);
    };
    const onPointerLeave = () => this.hideItemTooltip(element);
    const onPointerDown = () => this.hideItemTooltip(element);
    const onFocus = () => {
      const rect = element.getBoundingClientRect();
      show(rect.right, rect.top+rect.height/2);
    };
    const onBlur = () => this.hideItemTooltip(element);
    element.addEventListener('pointerenter', onPointerEnter);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerleave', onPointerLeave);
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);
    this.itemTooltipCleanup.set(element, () => {
      element.removeEventListener('pointerenter', onPointerEnter);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerleave', onPointerLeave);
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
    });
  }

  showWorldItemTooltip(item: TooltipItem, clientX: number, clientY: number): void {
    if (this.tooltipAnchor) return;
    const key = item.id ? `${item.id}:${itemRollRenderKey(item as InventoryItem)}` : `${item.kind}:${item.name ?? ''}`;
    if (key !== this.tooltipWorldKey) {
      this.tooltipWorldKey = key;
      this.renderItemTooltip(item, undefined, 'Clique para coletar');
    }
    this.itemTooltip.classList.add('open');
    this.itemTooltip.setAttribute('aria-hidden', 'false');
    this.positionItemTooltip(clientX, clientY);
  }

  hideWorldItemTooltip(): void {
    if (this.tooltipAnchor || !this.tooltipWorldKey) return;
    this.hideItemTooltip();
  }

  private renderInventory(inventory: InventoryItem[]): void {
    this.hideItemTooltip();
    this.lastInventoryForRender = inventory;
    this.inventorySlots.replaceChildren();
    const visibleInventory = this.bagSlotItems(inventory);
    for (let i = 0; i < BAG_SLOT_COUNT; i++) {
      const item = visibleInventory[i];
      const interactive = !!item?.equipSlot || !!item?.usable;
      const slot = document.createElement(interactive ? 'button' : 'div');
      slot.className = 'inventory-slot';
      slot.dataset.bagIndex = String(i);
      slot.setAttribute('aria-label', item ? item.name : `Slot ${i + 1}`);

      if (!item) {
        slot.classList.add('empty');
        this.inventorySlots.append(slot);
        continue;
      }

      slot.classList.add('filled');
      if (equipmentSetItemPresentation(item)) slot.classList.add('equipment-set-item');
      slot.title = item.name;
      if (item.equipped) slot.classList.add('equipped');
      // Cada arma tem sua própria borda colorida pela raridade.
      if (item.rarity) slot.style.borderColor = RARITY_COLORS[item.rarity];
      else if (isGemKind(item.kind)) slot.style.borderColor = GEM_GLOW_COLORS[item.glowGem ?? 'bless'];
      if (item.equipSlot) {
        (slot as HTMLButtonElement).type = 'button';
        // Equipa ESTA instância específica (por id), não "qualquer espada".
        slot.title = `${item.name} - botao direito equipa`;
        slot.addEventListener('click', () => this.onEquipItem(item.id));
        slot.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.onEquipItem(item.id);
        });
      } else if (item.usable) {
        (slot as HTMLButtonElement).type = 'button';
        slot.addEventListener('click', () => this.onUseItem(item.kind));
        slot.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.onUseItem(item.kind);
        });
      }
      this.bindItemTooltip(slot, item);

      const image = this.createItemIcon(item);
      image.draggable = false;
      slot.append(image);
      // Arrastar para fora do menu dropa o item no chao (moeda nao dropa;
      // o backend tambem bloqueia).
      if (item.kind !== 'coin') this.bindInventoryDrag(slot, item);

      // Empilháveis mostram a quantidade; armas marcam "E" quando equipadas.
      if (item.stackable && item.count > 1) {
        const count = document.createElement('span');
        count.className = 'slot-count';
        count.textContent = String(item.count);
        slot.append(count);
      } else if (item.equipped) {
        const mark = document.createElement('span');
        mark.className = 'slot-count';
        mark.textContent = 'E';
        slot.append(mark);
      }

      // Faixa de dano da arma (ex.: "3–7") no canto, na cor da raridade.
      const range = weaponRange(item);
      if (range) {
        const badge = document.createElement('span');
        badge.className = 'weapon-damage-bonus';
        badge.textContent = range;
        if (item.rarity) badge.style.color = RARITY_COLORS[item.rarity];
        slot.append(badge);
      }
      const magic = magicRange(item);
      if (magic) {
        const badge = document.createElement('span');
        badge.className = 'weapon-damage-bonus magic-damage-bonus';
        badge.textContent = `Mag ${magic}`;
        badge.style.color = '#6ed8ff';
        slot.append(badge);
      }
      const gearBonus = gearBonusLabel(item);
      if (gearBonus) {
        const badge = document.createElement('span');
        badge.className = 'weapon-damage-bonus';
        badge.textContent = gearBonus;
        if (item.rarity) badge.style.color = RARITY_COLORS[item.rarity];
        slot.append(badge);
      }
      const upgrade = upgradeLabel(item);
      if (upgrade) {
        const badge = document.createElement('span');
        badge.className = 'weapon-upgrade-badge';
        badge.textContent = upgrade;
        if (item.glowGem) badge.style.color = GEM_GLOW_COLORS[item.glowGem];
        slot.append(badge);
      }
      if (item.element === 'fire') {
        const badge = document.createElement('span');
        badge.className = 'weapon-element-badge';
        badge.textContent = 'Fogo';
        slot.append(badge);
      }
      this.inventorySlots.append(slot);
    }
  }

  /** Slot da hotbar correspondente a cada acao reorganizavel. */
  private hotbarActionSlots(): Record<HotbarAction, HTMLElement> {
    return {
      'potion': this.hotbarHealthPotionSlot,
      'arcane-nova': this.hotbarArcaneNovaSlot,
      'arcane-bolt': this.hotbarArcaneBoltSlot,
      'bulwark-call': this.hotbarBulwarkCallSlot,
      'storm-orb': this.hotbarStormOrbSlot,
      'feral-form': this.hotbarFeralFormSlot,
      'root-snare': this.hotbarRootSnareSlot,
      'chain-lightning': this.hotbarChainLightningSlot,
      'renewal-wave': this.hotbarRenewalWaveSlot,
      'phase-step': this.hotbarPhaseStepSlot,
      'nature-spirit': this.hotbarNatureSpiritSlot,
      'mana-potion': this.hotbarManaPotionSlot,
      'war-cry': this.hotbarWarCrySlot,
      'heavy-strike': this.hotbarHeavyStrikeSlot,
      'charge': this.hotbarChargeSlot,
      'steel-sweep': this.hotbarSteelSweepSlot,
      'iron-guard': this.hotbarIronGuardSlot,
    };
  }

  /**
   * Aplica o layout dos slots 1-8: reordena o DOM (a posicao define a tecla),
   * atualiza os keycaps e garante o bind de drag & drop de cada slot.
   */
  setHotbarLayout(layout: readonly HotbarAction[]): void {
    const slots = this.hotbarActionSlots();
    this.hotbarLayout = [...layout];
    this.skillLoadoutRenderKey = '';
    const equipped = new Set(layout);
    for (const [action, slot] of Object.entries(slots) as [HotbarAction, HTMLElement][]) {
      const active = equipped.has(action);
      slot.hidden = !active;
      slot.setAttribute('aria-hidden', String(!active));
      slot.draggable = active;
      slot.tabIndex = active ? 0 : -1;
      if (!active) {
        delete slot.dataset.hotbarAction;
        const keycap = slot.querySelector('.hotbar-keycap');
        if (keycap) keycap.textContent = '';
      }
    }
    layout.forEach((action, index) => {
      const slot = slots[action];
      if (!slot) return;
      slot.hidden = false;
      slot.setAttribute('aria-hidden', 'false');
      slot.draggable = true;
      slot.tabIndex = 0;
      this.hotbarEl.append(slot);
      const keycap = slot.querySelector('.hotbar-keycap');
      if (keycap) keycap.textContent = String(index + 1);
      slot.dataset.hotbarAction = action;
      this.bindHotbarDrag(slot, action);
    });
  }

  private bindHotbarDrag(slot: HTMLElement, action: HotbarAction): void {
    if (this.hotbarDragBound.has(slot)) return;
    this.hotbarDragBound.add(slot);
    slot.draggable = true;
    slot.setAttribute('role', 'button');
    slot.tabIndex = 0;
    const useAction = () => this.onHotbarUse(action);
    // Clique simples usa a acao (apos um drag real o browser nao emite click).
    slot.addEventListener('click', useAction);
    slot.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) useAction();
    });
    slot.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/aranna-hotbar', action);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      slot.classList.add('hotbar-dragging');
    });
    slot.addEventListener('dragend', () => this.clearHotbarDragState());
    slot.addEventListener('dragover', (event) => {
      if (!event.dataTransfer?.types.includes('text/aranna-hotbar')) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      slot.classList.add('hotbar-drag-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('hotbar-drag-over'));
    slot.addEventListener('drop', (event) => {
      const from = event.dataTransfer?.getData('text/aranna-hotbar') as HotbarAction | '';
      this.clearHotbarDragState();
      if (!from) return;
      event.preventDefault();
      if (from !== action) this.onHotbarSwap(from, action);
    });
  }

  private clearHotbarDragState(): void {
    for (const el of this.hotbarDragBound) el.classList.remove('hotbar-drag-over', 'hotbar-dragging');
  }

  private bagSlotItems(inventory: InventoryItem[]): Array<InventoryItem | undefined> {
    const visibleInventory = bagInventoryItems(inventory);
    const byId = new Map(visibleInventory.map((item) => [item.id, item]));
    const assigned = new Set<string>();
    const nextSlots = Array<string | null>(BAG_SLOT_COUNT).fill(null);
    for (let i = 0; i < BAG_SLOT_COUNT; i++) {
      const id = this.bagSlots[i];
      if (!id || !byId.has(id) || assigned.has(id)) continue;
      nextSlots[i] = id;
      assigned.add(id);
    }
    let emptyIndex = 0;
    for (const item of visibleInventory) {
      if (assigned.has(item.id)) continue;
      while (emptyIndex < BAG_SLOT_COUNT && nextSlots[emptyIndex]) emptyIndex++;
      if (emptyIndex >= BAG_SLOT_COUNT) break;
      nextSlots[emptyIndex] = item.id;
      assigned.add(item.id);
    }
    this.bagSlots = nextSlots;
    return nextSlots.map((id) => (id ? byId.get(id) : undefined));
  }

  private moveBagItem(itemId: string, targetIndex: number): void {
    const sourceIndex = this.bagSlots.indexOf(itemId);
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= BAG_SLOT_COUNT || sourceIndex === targetIndex) return;
    const nextSlots = [...this.bagSlots];
    const targetId = nextSlots[targetIndex] ?? null;
    nextSlots[targetIndex] = itemId;
    nextSlots[sourceIndex] = targetId;
    this.bagSlots = nextSlots;
    this.inventoryRenderKey = '__local_bag_order__';
    this.renderInventory(this.lastInventoryForRender);
  }

  private suppressNextClick(): void {
    const suppress = (clickEvent: MouseEvent) => {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    };
    window.addEventListener('click', suppress, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', suppress, { capture: true }), 0);
  }

  /**
   * Arrastar um item da bag para FORA do menu dropa o item no chao.
   * Implementado com pointer events (ghost segue o cursor); o click de
   * equipar/usar que seguiria o pointerup e suprimido apos um drag real.
   */
  private bindInventoryDrag(slot: HTMLElement, item: InventoryItem): void {
    slot.addEventListener('pointerdown', (down) => {
      if (down.button !== 0) return;
      const startX = down.clientX;
      const startY = down.clientY;
      let ghost: HTMLElement | null = null;
      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        ghost?.remove();
        ghost = null;
        slot.classList.remove('dragging-out');
      };
      const onMove = (move: PointerEvent) => {
        if (!ghost) {
          if (Math.hypot(move.clientX - startX, move.clientY - startY) < BAG_DRAG_THRESHOLD_PX) return;
          ghost = document.createElement('div');
          ghost.className = 'inventory-drag-ghost';
          const icon = this.createItemIcon(item);
          icon.draggable = false;
          ghost.append(icon);
          document.body.append(ghost);
          slot.classList.add('dragging-out');
        }
        ghost.style.transform = `translate(${move.clientX + 8}px, ${move.clientY + 10}px)`;
      };
      const onCancel = () => cleanup();
      const onUp = (up: PointerEvent) => {
        const dragged = ghost !== null;
        cleanup();
        if (!dragged) return;
        // Depois de um drag real, o browser ainda dispara `click` no slot se o
        // pointerup cair sobre ele — suprime para nao equipar/usar sem querer.
        this.suppressNextClick();
        // Soltar sobre um slot do paper doll = equipar NAQUELE slot (se o
        // tipo do item permitir; ex.: arma 1H na 2a mao, anel no Anel 2).
        const under = document.elementFromPoint(up.clientX, up.clientY);
        const slotCell = under instanceof Element ? (under.closest('[data-equip-slot]') as HTMLElement | null) : null;
        const targetSlot = slotCell?.dataset.equipSlot as EquipmentSlot | undefined;
        if (targetSlot) {
          if (equipSlotsForKind(item.kind).includes(targetSlot)) {
            this.onEquipItemToSlot(item.id, targetSlot);
          }
          return;
        }
        const bagCell = under instanceof Element ? (under.closest('[data-bag-index]') as HTMLElement | null) : null;
        const targetBagIndex = bagCell?.dataset.bagIndex ? Number(bagCell.dataset.bagIndex) : -1;
        if (Number.isInteger(targetBagIndex) && targetBagIndex >= 0) {
          this.moveBagItem(item.id, targetBagIndex);
          return;
        }
        const withinRect = (rect: DOMRect) =>
          up.clientX >= rect.left && up.clientX <= rect.right && up.clientY >= rect.top && up.clientY <= rect.bottom;
        // Soltar dentro do menu = cancelar; sobre a hotbar tambem (gesto de
        // "colocar na barra" nao pode virar drop acidental no chao).
        if (!withinRect(this.gameMenu.getBoundingClientRect()) && !withinRect(this.hotbarEl.getBoundingClientRect())) {
          this.onDropItem(item);
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    });
  }

  private renderHotbarEquipment(snapshot: WorldSnapshot): void {
    this.hideItemTooltip();
    this.renderHotbarEquipmentSlot(this.hotbarWeaponSlot, snapshot, 'weapon', 'Arma');
    this.renderHotbarEquipmentSlot(this.hotbarOffhandSlot, snapshot, 'offhand', 'Mão 2');
  }

  private renderHotbarEquipmentSlot(
    slotEl: HTMLElement,
    snapshot: WorldSnapshot,
    slot: EquipmentSlot,
    emptyLabel: string,
  ): void {
    const equippedId = snapshot.equipment[slot];
    const item = equippedId ? snapshot.inventory.find((candidate) => candidate.id === equippedId) : undefined;
    this.itemTooltipCleanup.get(slotEl)?.();
    this.itemTooltipCleanup.delete(slotEl);
    slotEl.removeAttribute('aria-describedby');
    slotEl.replaceChildren();
    slotEl.classList.toggle('filled', !!item);
    slotEl.style.removeProperty('border-color');
    slotEl.title = item?.name ?? emptyLabel;
    slotEl.setAttribute('aria-label', item ? `${emptyLabel}: ${item.name}` : `${emptyLabel}: vazio`);
    slotEl.onclick = item ? () => this.onUnequipSlot(slot) : null;
    slotEl.oncontextmenu = item
      ? (event) => {
        event.preventDefault();
        this.onUnequipSlot(slot);
      }
      : null;
    slotEl.onkeydown = item
      ? (event) => {
        if (event.repeat) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.onUnequipSlot(slot);
      }
      : null;

    if (!item) {
      slotEl.removeAttribute('role');
      slotEl.removeAttribute('tabindex');
      const label = document.createElement('span');
      label.className = 'hotbar-equipment-label';
      label.textContent = emptyLabel;
      slotEl.append(label);
      return;
    }

    slotEl.setAttribute('role', 'button');
    slotEl.setAttribute('tabindex', '0');
    this.bindItemTooltip(slotEl, item, slot);
    if (item.rarity) slotEl.style.borderColor = RARITY_COLORS[item.rarity];
    const image = this.createItemIcon(item);
    image.className = 'hotbar-equipment-icon';
    slotEl.append(image);
  }

  private renderCharacter(snapshot: WorldSnapshot, player: EntityState): void {
    this.hideItemTooltip();
    const xp = player.xp ?? 0;
    const xpToNext = player.xpToNext ?? 1;
    const base = player.attackDamage ?? 0;
    const wMin = player.weaponDamageMin ?? 0;
    const wMax = player.weaponDamageMax ?? 0;
    const mMin = player.weaponMagicDamageMin ?? 0;
    const mMax = player.weaponMagicDamageMax ?? 0;
    const hasWeapon = wMax > 0;
    const hasMagic = mMax > 0;
    const stats = [
      ['Arma', hasWeapon ? `${wMin}–${wMax} dano` : 'Sem arma'],
      ['Dano magico', hasMagic ? `${mMin}–${mMax}` : '0'],
      ['Mana', `${Math.ceil(player.mana ?? 0)} / ${player.maxMana ?? 0}`],
      ['Dano base', String(base)],
      ['Dano total', hasWeapon ? `${base + wMin}–${base + wMax}` : String(base)],
      ['Total + mag', hasWeapon ? `${base + wMin}-${base + wMax}${hasMagic ? ` + ${mMin}-${mMax}` : ''}` : String(base)],
      ['Vel. ataque', `x${(player.attackSpeed ?? 1).toFixed(2)}`],
      ['Esquiva', percent(player.dodgeChance ?? 0)],
      ['Armadura', String(player.armor ?? 0)],
      ['Critico', percent(player.criticalChance ?? 0)],
      ['Regen vida', `${(player.healthRegen ?? 0).toFixed(1)} /s`],
      ['Nível', String(player.level)],
      ['Vida', `${Math.ceil(player.hp)} / ${Math.round(player.maxHp)}`],
      ['EXP', `${xp} / ${xpToNext}`],
      ['Área', snapshot.zone === 'overworld' ? 'Terras de Aranna' : 'Câmara das Sombras'],
    ];

    this.characterStats.replaceChildren();
    for (const [label, value] of stats.slice(0, -1)) {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const key = document.createElement('span');
      key.textContent = label;
      const val = document.createElement('strong');
      val.textContent = value;
      row.append(key, val);
      this.characterStats.append(row);
    }
    for (const set of this.tooltipEquipmentSets) {
      const row = document.createElement('div');
      row.className = 'stat-row equipment-set-progress';
      row.dataset.setId = set.id;
      row.style.setProperty('--equipment-set', EQUIPMENT_SET_COLORS[set.id]);
      row.title = set.bonuses.map((bonus) => `${bonus.active ? 'Ativo' : `${bonus.pieces} peças`}: ${bonus.label} — ${bonus.description}`).join('\n');
      const key = document.createElement('span');
      key.textContent = set.label;
      const value = document.createElement('strong');
      value.textContent = `${set.piecesEquipped}/${set.totalPieces}`;
      row.append(key, value);
      this.characterStats.append(row);
    }

    this.renderAttributes(player);
    this.equipmentSlots.replaceChildren();
    for (const { slot, label } of EQUIPMENT_SLOTS) {
      const equippedId = snapshot.equipment[slot];
      const item = equippedId ? snapshot.inventory.find((candidate) => candidate.id === equippedId) : undefined;
      const cell = document.createElement(equippedId ? 'button' : 'div');
      cell.className = `equipment-slot equipment-slot-${slot}`;
      cell.dataset.equipSlot = slot;
      cell.setAttribute('aria-label', item ? `${label}: ${item.name}` : `${label}: vazio`);

      const labelEl = document.createElement('span');
      labelEl.className = 'equipment-label';
      labelEl.textContent = label;

      const content = document.createElement('span');
      content.className = 'equipment-content';

      if (item) {
        cell.classList.add('filled');
        if (equipmentSetItemPresentation(item)) cell.classList.add('equipment-set-item');
        (cell as HTMLButtonElement).type = 'button';
        cell.addEventListener('click', () => this.onUnequipSlot(slot));
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.onUnequipSlot(slot);
        });
        this.bindItemTooltip(cell, item, slot);
        if (item.rarity) cell.style.borderColor = RARITY_COLORS[item.rarity];
        const image = this.createItemIcon(item);
        content.append(image);
        const range = weaponRange(item);
        if (range) {
          const badge = document.createElement('span');
          badge.className = 'weapon-damage-bonus equipment-bonus';
          badge.textContent = range;
          if (item.rarity) badge.style.color = RARITY_COLORS[item.rarity];
          content.append(badge);
        }
        const magic = magicRange(item);
        if (magic) {
          const badge = document.createElement('span');
          badge.className = 'weapon-damage-bonus equipment-bonus magic-equipment-bonus';
          badge.textContent = `Mag ${magic}`;
          badge.style.color = '#6ed8ff';
          content.append(badge);
        }
        const gearBonus = gearBonusLabel(item);
        if (gearBonus) {
          const badge = document.createElement('span');
          badge.className = 'weapon-damage-bonus equipment-bonus';
          badge.textContent = gearBonus;
          if (item.rarity) badge.style.color = RARITY_COLORS[item.rarity];
          content.append(badge);
        }
        const upgrade = upgradeLabel(item);
        if (upgrade) {
          const badge = document.createElement('span');
          badge.className = 'weapon-upgrade-badge equipment-upgrade';
          badge.textContent = upgrade;
          if (item.glowGem) badge.style.color = GEM_GLOW_COLORS[item.glowGem];
          content.append(badge);
        }
        if (item.element === 'fire') {
          const badge = document.createElement('span');
          badge.className = 'weapon-element-badge equipment-element';
          badge.textContent = 'Fogo';
          content.append(badge);
        }
      } else {
        content.textContent = '';
      }

      cell.append(labelEl, content);
      this.equipmentSlots.append(cell);
    }
  }

  private renderAttributes(player: EntityState): void {
    this.attributeSection.replaceChildren();
    this.attributeSection.classList.toggle('training-mode', !!this.characterTrainingContext);
    const attributes = player.attributes;
    if (!attributes) return;

    const header = document.createElement('div');
    header.className = 'attribute-header';
    const title = document.createElement('span');
    title.textContent = this.characterTrainingContext ?? 'Atributos';
    const points = document.createElement('strong');
    points.textContent = `${attributes.unspentPoints} ponto${attributes.unspentPoints === 1 ? '' : 's'}`;
    header.append(title, points);
    this.attributeSection.append(header);

    const entries: { attribute: PlayerAttribute; label: string; effect: string }[] = [
      { attribute: 'strength', label: 'Força', effect: '+1 dano, +0.05 vida/s' },
      { attribute: 'agility', label: 'Agilidade', effect: '+2% vel. ataque, +1.2% esquiva' },
      { attribute: 'vitality', label: 'Vitalidade', effect: '+4 vida máxima' },
      { attribute: 'energy', label: 'Energia', effect: '+5 mana máxima' },
    ];

    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'attribute-row';
      const details = document.createElement('span');
      details.className = 'attribute-details';
      const label = document.createElement('strong');
      label.textContent = `${entry.label} ${attributes[entry.attribute]}`;
      const effect = document.createElement('small');
      effect.textContent = entry.effect;
      details.append(label, effect);

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'attribute-add';
      add.textContent = '+';
      add.title = `Adicionar ponto em ${entry.label}`;
      add.disabled = attributes.unspentPoints <= 0;
      add.addEventListener('click', () => this.onAllocateAttribute(entry.attribute));
      row.append(details, add);
      this.attributeSection.append(row);
    }
  }

  private createItemIcon(item: InventoryItem): HTMLImageElement {
    const image = document.createElement('img');
    image.src = item.icon;
    image.alt = item.name;
    image.loading = 'eager';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'item-icon-fallback';
      fallback.textContent = item.kind === 'sword'
        ? 'S'
        : isGemKind(item.kind)
          ? '*'
          : item.kind === 'potion'
            ? '+'
            : item.kind === 'mana_potion'
              ? 'M'
              : 'o';
      fallback.title = item.name;
      image.replaceWith(fallback);
    }, { once: true });
    return image;
  }
}
