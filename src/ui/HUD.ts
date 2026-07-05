import { GEM_DEFINITIONS, GEM_GLOW_COLORS, ITEM_ICON_URLS, RARITY_COLORS, equipSlotsForKind, isGemKind } from '../shared/itemMeta';
import type { PlayerProfile } from '../shared/playerProfile';
import { WARRIOR_TALENT_TREE_LABELS, WARRIOR_TALENTS } from '../shared/warriorTalents';
import type {
  BuffState,
  ChatChannel,
  ChatMessageState,
  EntityState,
  EquipmentSlot,
  FriendState,
  HotbarAction,
  InventoryItem,
  ItemKind,
  ItemRarity,
  NpcKind,
  PartyInviteState,
  PartyState,
  PlayerAttribute,
  QuestState,
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

// HUD em DOM sobreposto ao canvas. Mostra nivel, vida, experiencia, quest,
// mochila, personagem e tela de morte.

const BAG_SLOT_COUNT = 44;
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

/** Resumo curto dos stats de pecas/acessorios para badges na bag/paper doll. */
function gearBonusLabel(item: InventoryItem): string | null {
  if ((item.armor ?? 0) > 0) return `${item.armor} arm`;
  const parts: string[] = [];
  if ((item.bonusCrit ?? 0) > 0) parts.push(`+${Math.round((item.bonusCrit ?? 0) * 100)}%crit`);
  if ((item.bonusHp ?? 0) > 0) parts.push(`+${item.bonusHp}pv`);
  if ((item.bonusMana ?? 0) > 0) parts.push(`+${item.bonusMana}mp`);
  return parts.length > 0 ? parts.join(' ') : null;
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

export interface HudStashItem {
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  count: number;
  stackable: boolean;
  rarity?: ItemRarity;
  upgradeLevel?: number;
  damageMin?: number;
  damageMax?: number;
}

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
    <div class="hotbar-slot hotbar-number-slot"><span>7</span></div>
    <div class="hotbar-slot hotbar-number-slot"><span>8</span></div>
    <div class="hotbar-slot hotbar-number-slot"><span>9</span></div>
    <div class="hotbar-slot hotbar-number-slot"><span>0</span></div>
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

  <div class="npc-dialogue hud-window" id="npc-dialogue" aria-hidden="true">
    <button class="npc-dialogue-close" id="npc-dialogue-close" type="button" aria-label="Fechar conversa">X</button>
    <div class="npc-dialogue-heading">
      <span id="npc-dialogue-title">Missao</span>
      <strong id="npc-dialogue-name">Guia</strong>
    </div>
    <p id="npc-dialogue-greeting"></p>
    <div class="npc-dialogue-quest" id="npc-dialogue-quest">
      <strong id="npc-dialogue-quest-title"></strong>
      <small id="npc-dialogue-objective"></small>
      <div class="npc-dialogue-progress"><div id="npc-dialogue-progress-fill"></div></div>
    </div>
    <div class="npc-dialogue-reward" id="npc-dialogue-reward" hidden>
      <span>Recompensa</span>
      <strong id="npc-dialogue-reward-text">90 moedas | 2 pocoes | 1 mana | 120 EXP</strong>
    </div>
    <div class="npc-dialogue-status" id="npc-dialogue-status" hidden></div>
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

  <div class="game-menu hud-window" id="game-menu" aria-hidden="true">
    <button class="game-menu-close" id="game-menu-close" type="button" aria-label="Fechar menu">X</button>
    <div class="character-stats" id="character-stats"></div>
    <div class="attribute-section" id="attribute-section"></div>
    <div class="equipment-grid" id="equipment-slots"></div>
    <div class="bag-grid" id="inventory-slots"></div>
  </div>

  <div class="death-overlay" id="death-overlay">
    <div class="death-box">
      <h1>VOC&Ecirc; CAIU</h1>
      <p>As sombras de Aranna te derrubaram.</p>
      <button id="respawn-btn">Renascer</button>
    </div>
  </div>

  <div class="talent-panel hud-window" id="talent-panel" hidden aria-label="Talentos do Warrior">
    <div class="talent-heading">
      <div>
        <span class="panel-kicker">Warrior</span>
        <strong>Talentos</strong>
      </div>
      <button class="talent-close" id="talent-close" type="button" aria-label="Fechar talentos">X</button>
    </div>
    <div class="talent-summary" id="talent-summary"></div>
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
  onUnequipSlot: (slot: EquipmentSlot) => void = () => {};
  onAllocateAttribute: (attribute: PlayerAttribute) => void = () => {};
  onVendorBuy: (vendorId: string, itemId: string) => void = () => {};
  onVendorSellUnused: (vendorId: string) => void = () => {};
  onVendorClose: () => void = () => {};
  onStashDeposit: (npcId: string, item: HudStashItem) => void = () => {};
  onStashWithdraw: (npcId: string, item: HudStashItem) => void = () => {};
  onStashClose: () => void = () => {};
  onNpcDestination: (npcId: string) => void = () => {};
  onNpcDestinationHover: (npcId: string | null) => void = () => {};
  onNpcTargetInteract: (npcId: string) => void = () => {};
  onNpcTargetHover: (npcId: string | null) => void = () => {};
  onQuestTracker: () => void = () => {};
  onQuestTrackerHover: (hovered: boolean) => void = () => {};
  onNpcDialogueClose: () => void = () => {};
  onNpcDialogueAction: (npcId: string) => void = () => {};
  onPartyInviteSend: (targetPlayerId: string) => void = () => {};
  onPartyInviteAccept: (inviteId: string) => void = () => {};
  onPartyInviteDecline: (inviteId: string) => void = () => {};
  onPartyLeave: () => void = () => {};
  onPartyKick: (targetPlayerId: string) => void = () => {};
  onPartyLeaderTransfer: (targetPlayerId: string) => void = () => {};
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
  private readonly hotbarWarCrySlot: HTMLElement;
  private readonly hotbarWarCryShade: HTMLElement;
  private readonly hotbarWarCryCooldown: HTMLElement;
  private readonly hotbarHeavyStrikeSlot: HTMLElement;
  private readonly hotbarHeavyStrikeShade: HTMLElement;
  private readonly hotbarHeavyStrikeCooldown: HTMLElement;
  private readonly hotbarChargeSlot: HTMLElement;
  private readonly hotbarChargeShade: HTMLElement;
  private readonly hotbarChargeCooldown: HTMLElement;
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
  private readonly npcDialogueQuest: HTMLElement;
  private readonly npcDialogueQuestTitle: HTMLElement;
  private readonly npcDialogueObjective: HTMLElement;
  private readonly npcDialogueProgress: HTMLElement;
  private readonly npcDialogueReward: HTMLElement;
  private readonly npcDialogueRewardText: HTMLElement;
  private readonly npcDialogueStatus: HTMLElement;
  private readonly npcDialogueAction: HTMLButtonElement;
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
  private readonly gameMenu: HTMLElement;
  private readonly inventorySlots: HTMLElement;
  private readonly characterStats: HTMLElement;
  private readonly attributeSection: HTMLElement;
  private readonly equipmentSlots: HTMLElement;
  private readonly talentPanel: HTMLElement;
  private readonly talentClose: HTMLButtonElement;
  private readonly talentSummary: HTMLElement;
  private readonly talentTrees: HTMLElement;

  private gameMenuOpen = false;
  private talentPanelOpen = false;
  private hotbarRenderKey = '';
  private inventoryRenderKey = '__initial_inventory__';
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
  private readonly stashPendingKeys = new Set<string>();
  private activeNpcDialogue: HudNpcDialoguePanel | null = null;
  private activeNpcTargetId: string | null = null;
  private emittedNpcTargetHoverId: string | null = null;
  private npcTargetFrameHovered = false;
  private npcDialogueActionPending = false;
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
  private buffRenderKey = '';
  private zoneBannerTimer: number | null = null;
  private characterTrainingContext: string | null = null;
  private questTrackerActionable = false;
  private questTrackerRouteText = '';

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
    this.hotbarWarCrySlot = layer.querySelector('#hotbar-war-cry')!;
    this.hotbarWarCryShade = layer.querySelector('#hotbar-war-cry-shade')!;
    this.hotbarWarCryCooldown = layer.querySelector('#hotbar-war-cry-cooldown')!;
    this.hotbarHeavyStrikeSlot = layer.querySelector('#hotbar-heavy-strike')!;
    this.hotbarHeavyStrikeShade = layer.querySelector('#hotbar-heavy-strike-shade')!;
    this.hotbarHeavyStrikeCooldown = layer.querySelector('#hotbar-heavy-strike-cooldown')!;
    this.hotbarChargeSlot = layer.querySelector('#hotbar-charge')!;
    this.hotbarChargeShade = layer.querySelector('#hotbar-charge-shade')!;
    this.hotbarChargeCooldown = layer.querySelector('#hotbar-charge-cooldown')!;
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
    this.npcDialogueQuest = layer.querySelector('#npc-dialogue-quest')!;
    this.npcDialogueQuestTitle = layer.querySelector('#npc-dialogue-quest-title')!;
    this.npcDialogueObjective = layer.querySelector('#npc-dialogue-objective')!;
    this.npcDialogueProgress = layer.querySelector('#npc-dialogue-progress-fill')!;
    this.npcDialogueReward = layer.querySelector('#npc-dialogue-reward')!;
    this.npcDialogueRewardText = layer.querySelector('#npc-dialogue-reward-text')!;
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
    this.gameMenu = layer.querySelector('#game-menu')!;
    this.inventorySlots = layer.querySelector('#inventory-slots')!;
    this.characterStats = layer.querySelector('#character-stats')!;
    this.attributeSection = layer.querySelector('#attribute-section')!;
    this.equipmentSlots = layer.querySelector('#equipment-slots')!;
    this.talentPanel = layer.querySelector('#talent-panel')!;
    this.talentClose = layer.querySelector('#talent-close') as HTMLButtonElement;
    this.talentSummary = layer.querySelector('#talent-summary')!;
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
    this.talentPanelOpen = open;
    this.talentPanel.hidden = !open;
    this.talentPanel.classList.toggle('open', open);
    this.talentPanel.setAttribute('aria-hidden', String(!open));
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
    this.npcDialogue.classList.add('open');
    this.npcDialogue.setAttribute('aria-hidden', 'false');
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
    this.activeNpcDialogue = null;
    this.npcDialogueActionPending = false;
    this.npcDialogue.classList.remove('open');
    this.npcDialogue.setAttribute('aria-hidden', 'true');
    this.npcDialogueStatus.hidden = true;
    this.npcDialogueStatus.textContent = '';
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
    this.updateTarget(target, npcTarget);
    if (!player) return;

    this.levelEl.textContent = String(player.level);

    const hpRatio = barRatio(player.hp, player.maxHp);
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpText.textContent = `${Math.ceil(Math.max(0, player.hp))} / ${Math.round(player.maxHp)}`;

    const mana = player.mana ?? 0;
    const maxMana = player.maxMana ?? 0;
    const manaRatio = barRatio(mana, maxMana);
    this.manaFill.style.width = `${manaRatio * 100}%`;
    this.manaText.textContent = `${Math.ceil(Math.max(0, mana))} / ${maxMana}`;
    this.updateArcaneNovaHotbar(player);
    this.updateWarCryHotbar(player);
    this.updateHeavyStrikeHotbar(player);
    this.updateChargeHotbar(player);
    this.updateConsumableHotbar(snapshot);
    this.renderBuffs(player.buffs ?? []);
    this.renderParty(snapshot.party, player.id);
    const friends = snapshot.friends ?? [];
    this.syncFriendPresenceFeedback(friends);
    this.renderFriends(friends);
    this.renderPartyInvites(snapshot.partyInvites);
    this.renderTalents(snapshot.talents);

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

    const inventoryKey = snapshot.inventory
      .map((item) => [
        item.id,
        item.count,
        item.equipped ? 1 : 0,
        item.damageMin ?? '',
        item.damageMax ?? '',
        item.magicDamageMin ?? '',
        item.magicDamageMax ?? '',
        item.upgradeLevel ?? 0,
        item.glowGem ?? '',
        item.element ?? '',
      ].join(':'))
      .join(',');
    if (inventoryKey !== this.inventoryRenderKey) {
      this.inventoryRenderKey = inventoryKey;
      this.renderInventory(snapshot.inventory);
    }

    const hotbarKey = HOTBAR_EQUIPMENT_SLOTS.map(({ slot }) => {
      const id = snapshot.equipment[slot];
      const item = id ? snapshot.inventory.find((candidate) => candidate.id === id) : undefined;
      return [
        slot,
        id ?? '',
        item?.name ?? '',
        item?.icon ?? '',
        item?.rarity ?? '',
        item?.upgradeLevel ?? 0,
        item?.glowGem ?? '',
        item?.element ?? '',
      ].join(':');
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
      ...EQUIPMENT_SLOTS.map(({ slot }) => {
        const id = snapshot.equipment[slot];
        const item = id ? snapshot.inventory.find((candidate) => candidate.id === id) : undefined;
        return [
          id ?? '',
          item?.damageMin ?? '',
          item?.damageMax ?? '',
          item?.magicDamageMin ?? '',
          item?.magicDamageMax ?? '',
          item?.upgradeLevel ?? 0,
          item?.glowGem ?? '',
          item?.element ?? '',
        ].join(':');
      }),
    ].join('|');
    if (characterKey !== this.characterRenderKey) {
      this.characterRenderKey = characterKey;
      this.renderCharacter(snapshot, player);
    }
  }

  private renderBuffs(buffs: readonly BuffState[]): void {
    const key = buffs
      .map((buff) => `${buff.id}:${buff.label}:${Math.ceil(buff.remaining)}:${buff.duration}`)
      .join('|');
    if (key === this.buffRenderKey) return;
    this.buffRenderKey = key;
    this.buffTray.replaceChildren();
    this.buffTray.hidden = buffs.length === 0;
    for (const buff of buffs) {
      const item = document.createElement('div');
      item.className = 'buff-icon';
      item.dataset.buff = buff.id;
      const ratio = buff.duration > 0 ? Math.max(0, Math.min(1, buff.remaining / buff.duration)) : 0;
      item.style.setProperty('--buff-ratio', String(ratio));
      item.title = `${buff.label} - ${Math.ceil(buff.remaining)}s`;
      const label = document.createElement('strong');
      label.textContent = buffInitials(buff.label) || '?';
      const time = document.createElement('span');
      time.textContent = `${Math.ceil(buff.remaining)}`;
      item.append(label, time);
      this.buffTray.append(item);
    }
  }

  private renderParty(party: PartyState | null, localPlayerId: string): void {
    this.partyMemberIds.clear();
    for (const member of party?.members ?? []) {
      if (member.id !== localPlayerId && member.online) this.partyMemberIds.add(member.id);
    }

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
          party.leaderId === localPlayerId && member.id !== localPlayerId ? 1 : 0,
        ].join(':')),
      ].join('|')
      : '';
    if (key === this.partyRenderKey) return;
    this.partyRenderKey = key;
    this.partyPanel.replaceChildren();
    this.partyPanel.hidden = !party || party.members.length <= 1;
    if (!party || party.members.length <= 1) return;

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
    actions.append(chat, leave);
    heading.append(titleWrap, actions);
    this.partyPanel.append(heading);

    for (const member of party.members) {
      const row = document.createElement('div');
      row.className = 'party-member';
      row.classList.toggle('offline', !member.online);
      row.classList.toggle('self', member.id === localPlayerId);
      const top = document.createElement('div');
      top.className = 'party-member-top';
      const info = document.createElement('div');
      info.className = 'party-member-info';
      const name = document.createElement('strong');
      name.textContent = `${member.name}${member.id === party.leaderId ? ' (lider)' : ''}`;
      const meta = document.createElement('small');
      meta.textContent = `Nv ${member.level} ${member.class}`;
      info.append(name, meta);
      const canManage = party.leaderId === localPlayerId && member.id !== localPlayerId;
      if (canManage) {
        const actions = document.createElement('div');
        actions.className = 'party-member-actions';
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
        top.append(info, actions);
      } else {
        top.append(info);
      }
      const hp = document.createElement('div');
      hp.className = 'party-hp';
      const fill = document.createElement('div');
      fill.style.width = `${barRatio(member.hp, member.maxHp) * 100}%`;
      const label = document.createElement('span');
      label.textContent = member.online ? `${Math.ceil(member.hp)} / ${Math.round(member.maxHp)}` : 'offline';
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

  private renderTalents(state: TalentState): void {
    const ranksKey = Object.entries(state.talents).map(([id, rank]) => `${id}:${rank}`).sort().join('|');
    const key = `${state.talentPoints}:${state.spentPoints}:${state.availablePoints}:${ranksKey}`;
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
    reset.title = state.spentPoints > 0 ? 'Reiniciar talentos e devolver pontos' : 'Nenhum talento gasto';
    reset.disabled = state.spentPoints <= 0;
    reset.addEventListener('click', () => this.onTalentReset());
    this.talentSummary.append(points, spent, reset);

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

  private updateTarget(target?: EntityState, npcTarget?: HudNpcTarget): void {
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
    this.targetFrame.title = '';
    if (!visible || !target) return;

    this.targetName.textContent = target.enemyVariant === 'zombieBoss' ? 'Boss Zumbi' : 'Zumbi';
    this.targetSubtitle.textContent = '';
    this.targetSubtitle.hidden = true;
    this.targetLevel.textContent = String(target.level);

    const hpRatio = barRatio(target.hp, target.maxHp);
    this.targetHpFill.style.width = `${hpRatio * 100}%`;
    this.targetHpText.textContent = `${Math.ceil(Math.max(0, target.hp))} / ${Math.round(target.maxHp)}`;

    const mana = target.mana ?? 0;
    const maxMana = target.maxMana ?? 0;
    const hasMana = maxMana > 0;
    this.targetManaBar.classList.toggle('hidden', !hasMana);
    if (!hasMana) return;

    this.targetManaFill.style.width = `${barRatio(mana, maxMana) * 100}%`;
    this.targetManaText.textContent = `${Math.ceil(Math.max(0, mana))} / ${maxMana}`;
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

  private updateArcaneNovaHotbar(player: EntityState): void {
    const skill = player.skills?.find((entry) => entry.id === 'arcane-nova');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const mana = player.mana ?? 0;
    const manaCost = skill?.manaCost ?? 0;
    const enoughMana = mana >= manaCost;
    const onCooldown = cooldown > 0.05;

    this.hotbarArcaneNovaSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarArcaneNovaSlot.classList.toggle('not-enough-mana', !enoughMana && !onCooldown);
    this.hotbarArcaneNovaSlot.title = skill
      ? `${skill.label} - ${manaCost} mana`
      : 'Nova Arcana';
    this.hotbarArcaneNovaShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarArcaneNovaCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateWarCryHotbar(player: EntityState): void {
    const skill = player.skills?.find((entry) => entry.id === 'war-cry');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarWarCrySlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarWarCrySlot.title = skill
      ? `${skill.label} - bonus de combate`
      : 'Grito de Guerra';
    this.hotbarWarCryShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarWarCryCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateHeavyStrikeHotbar(player: EntityState): void {
    const skill = player.skills?.find((entry) => entry.id === 'heavy-strike');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarHeavyStrikeSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarHeavyStrikeSlot.classList.toggle('skill-queued', skill?.pending === true);
    this.hotbarHeavyStrikeSlot.title = skill
      ? `${skill.label} - alvo selecionado`
      : 'Golpe Pesado';
    this.hotbarHeavyStrikeShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarHeavyStrikeCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateChargeHotbar(player: EntityState): void {
    const skill = player.skills?.find((entry) => entry.id === 'charge');
    const cooldown = Math.max(0, skill?.cooldownRemaining ?? 0);
    const cooldownDuration = Math.max(0.01, skill?.cooldown ?? 1);
    const cooldownRatio = barRatio(cooldown, cooldownDuration);
    const onCooldown = cooldown > 0.05;

    this.hotbarChargeSlot.classList.toggle('on-cooldown', onCooldown);
    this.hotbarChargeSlot.classList.toggle('skill-queued', skill?.pending === true);
    this.hotbarChargeSlot.title = skill
      ? `${skill.label} - avance ate o alvo`
      : 'Investida';
    this.hotbarChargeShade.style.height = `${cooldownRatio * 100}%`;
    this.hotbarChargeCooldown.textContent = onCooldown ? String(Math.ceil(cooldown)) : '';
  }

  private updateConsumableHotbar(snapshot: WorldSnapshot): void {
    const healthPotions = this.stackCount(snapshot, 'potion');
    const manaPotions = this.stackCount(snapshot, 'mana_potion');
    this.updateConsumableSlot(this.hotbarHealthPotionSlot, this.hotbarHealthPotionCount, healthPotions, 'Poção Rubra');
    this.updateConsumableSlot(this.hotbarManaPotionSlot, this.hotbarManaPotionCount, manaPotions, 'Poção Azul');
  }

  private updateConsumableSlot(slot: HTMLElement, countEl: HTMLElement, count: number, label: string): void {
    slot.classList.toggle('empty', count <= 0);
    slot.title = count > 0 ? `${label} (${count})` : `${label} vazia`;
    countEl.textContent = count > 0 ? String(count) : '';
  }

  private stackCount(snapshot: WorldSnapshot, kind: ItemKind): number {
    return snapshot.inventory.find((item) => item.kind === kind && item.stackable)?.count ?? 0;
  }

  private renderVendorItems(vendor: HudVendorPanel): void {
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

      row.append(image, details, buy);
      this.vendorItems.append(row);
    }
  }

  private renderStashItems(stash: HudStashPanel): void {
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
      const isBoss = entity.enemyVariant === 'zombieBoss';
      this.drawMinimapDot(ctx, p, cx, cy, radius, isBoss ? '#ff6a3d' : '#dc6256', isBoss ? 5 : 3.4);
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
  }

  private renderInventory(inventory: InventoryItem[]): void {
    this.inventorySlots.replaceChildren();
    const visibleInventory = inventory.filter((item) => !item.equipped);
    for (let i = 0; i < BAG_SLOT_COUNT; i++) {
      const item = visibleInventory[i];
      const interactive = !!item?.equipSlot || !!item?.usable;
      const slot = document.createElement(interactive ? 'button' : 'div');
      slot.className = 'inventory-slot';
      slot.setAttribute('aria-label', item ? item.name : `Slot ${i + 1}`);

      if (!item) {
        slot.classList.add('empty');
        this.inventorySlots.append(slot);
        continue;
      }

      slot.classList.add('filled');
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

      const image = this.createItemIcon(item);
      image.draggable = false;
      slot.append(image);
      // Arrastar para fora do menu dropa o item no chao (moeda nao dropa;
      // o backend tambem bloqueia).
      if (item.kind !== 'coin') this.bindInventoryDragOut(slot, item);

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
      'mana-potion': this.hotbarManaPotionSlot,
      'war-cry': this.hotbarWarCrySlot,
      'heavy-strike': this.hotbarHeavyStrikeSlot,
      'charge': this.hotbarChargeSlot,
    };
  }

  /**
   * Aplica o layout dos slots 1-6: reordena o DOM (a posicao define a tecla),
   * atualiza os keycaps e garante o bind de drag & drop de cada slot.
   */
  setHotbarLayout(layout: readonly HotbarAction[]): void {
    const slots = this.hotbarActionSlots();
    const anchor = this.hotbarEl.querySelector('.hotbar-number-slot');
    layout.forEach((action, index) => {
      const slot = slots[action];
      if (!slot) return;
      if (anchor) this.hotbarEl.insertBefore(slot, anchor);
      else this.hotbarEl.append(slot);
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
    // Clique simples usa a acao (apos um drag real o browser nao emite click).
    slot.addEventListener('click', () => this.onHotbarUse(action));
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

  /**
   * Arrastar um item da bag para FORA do menu dropa o item no chao.
   * Implementado com pointer events (ghost segue o cursor); o click de
   * equipar/usar que seguiria o pointerup e suprimido apos um drag real.
   */
  private bindInventoryDragOut(slot: HTMLElement, item: InventoryItem): void {
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
          if (Math.hypot(move.clientX - startX, move.clientY - startY) < 8) return;
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
        const suppress = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        window.addEventListener('click', suppress, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener('click', suppress, { capture: true }), 0);
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
    if (item.rarity) slotEl.style.borderColor = RARITY_COLORS[item.rarity];
    const image = this.createItemIcon(item);
    image.className = 'hotbar-equipment-icon';
    slotEl.append(image);
  }

  private renderCharacter(snapshot: WorldSnapshot, player: EntityState): void {
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
        (cell as HTMLButtonElement).type = 'button';
        cell.addEventListener('click', () => this.onUnequipSlot(slot));
        cell.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.onUnequipSlot(slot);
        });
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
