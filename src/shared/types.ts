import type { V3 } from './mathx';

// ---------------------------------------------------------------------------
// Contrato compartilhado entre cliente e "servidor".
// Estes tipos viajam entre o navegador e o backend Go via JSON/WebSocket.
// ---------------------------------------------------------------------------

export type EntityKind = 'player' | 'enemy';
export type EntityAction = 'idle' | 'walk' | 'run' | 'attack' | 'dead';
export type EnemyVariant = 'zombie' | 'zombieBoss';
export type WorldZone = 'overworld' | 'dungeon';
export type PlayerAttribute = 'strength' | 'agility' | 'vitality' | 'energy';

export type GemKind = 'jewel_bless' | 'jewel_soul';
export type WeaponGlowGem = 'bless' | 'soul';
export type WeaponElement = 'fire';
export type DamageKind = 'physical' | 'magic';
export type CombatTextKind = DamageKind | 'incoming' | 'miss' | 'critical';
export type SkillId = 'arcane-nova' | 'war-cry' | 'charge' | 'heavy-strike';
/** Acoes que ocupam os slots 1-6 da hotbar (reorganizaveis via drag & drop). */
export type HotbarAction = 'potion' | 'arcane-nova' | 'mana-potion' | 'war-cry' | 'heavy-strike' | 'charge';
export type ItemKind =
  | 'coin'
  | 'mana_potion'
  | 'potion'
  | 'sword'
  | 'axe'
  | 'great_sword'
  | 'great_axe'
  | 'war_hammer'
  | 'armor'
  | 'helmet'
  | 'gloves'
  | 'ring'
  | 'necklace'
  | GemKind;
/** Armas que causam dano fisico quando empunhadas. */
export type WeaponKind = 'sword' | 'axe' | 'great_sword' | 'great_axe' | 'war_hammer';
/** Tiers de raridade de uma arma — definem (e colorem) a faixa de dano. */
export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type EquipmentSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'weapon' | 'offhand' | 'trinket' | 'ring' | 'ring2';
/** Cada slot guarda o ID da INSTÂNCIA de item equipada (ou null), não o tipo. */
export type EquipmentState = Record<EquipmentSlot, string | null>;

/**
 * Um item na mochila do herói.
 * - Consumíveis (moeda, poção) EMPILHAM: um único registro com `count`.
 * - Armas são instâncias ÚNICAS: cada uma ocupa seu próprio slot, tem `id`
 *   próprio e uma faixa de dano (damageMin..damageMax). Nunca se fundem.
 */
export interface InventoryItem {
  /** Identidade única. Para empilháveis é estável por tipo (ex.: "stack-coin"). */
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  count: number;
  /** True para consumíveis empilháveis; false para instâncias únicas (armas). */
  stackable: boolean;
  /** Itens clicáveis na mochila que executam uma ação imediata. */
  usable?: boolean;
  equipSlot?: EquipmentSlot;
  rarity?: ItemRarity;
  /** Nível de melhoria visual/estatística da arma. */
  upgradeLevel?: number;
  /** Última gema aplicada na arma, usada para definir a cor do brilho. */
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
  /** Dano mínimo da arma (cada golpe rola entre min e max). */
  damageMin?: number;
  /** Dano máximo da arma (cada golpe rola entre min e max). */
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
  /** Peças de armadura e acessórios (anéis/colar). */
  armor?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusCrit?: number;
  /** True quando ESTA instância está equipada em algum slot. */
  equipped?: boolean;
}

/** Item físico no chão, pronto para ser clicado/coletado. */
export interface LootState {
  id: string;
  kind: ItemKind;
  name: string;
  icon: string;
  modelUrl: string;
  position: V3;
  count: number;
  rarity?: ItemRarity;
  /** Cor/elemento visual da gema quando este loot for uma gema. */
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
  /** Faixa de dano de uma arma dropada (cada instância é única). */
  damageMin?: number;
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
  /** +N de uma arma dropada da mochila (preservado na coleta). */
  upgradeLevel?: number;
  /** Peças de armadura e acessórios. */
  armor?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusCrit?: number;
}

/** Baú persistente da zona atual; abrir gera loot físico no chão. */
export interface ChestState {
  id: string;
  position: V3;
  opened: boolean;
}

/** Pequeno estado visual de uma peca de gear equipada (arma/elmo/peitoral). */
export interface EquippedWeaponVisualState {
  kind: ItemKind;
  rarity: ItemRarity;
  upgradeLevel: number;
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
}

/** Pequena quest que guia o primeiro ciclo externo -> dungeon. */
export interface QuestState {
  title: string;
  objective: string;
  progress: number;
  goal: number;
  accepted: boolean;
  completed: boolean;
  rewardClaimed: boolean;
  rewardText?: string;
}

export type NpcKind = 'vendor' | 'quest' | 'healer' | 'blacksmith' | 'trainer' | 'travel' | 'jeweler' | 'banker' | 'guard';

export interface NpcDialogueState {
  greeting: string;
  actionLabel: string;
}

export interface NpcShopItemState {
  id: string;
  kind: ItemKind;
  price: number;
  count?: number;
  stock?: number;
  rarity?: ItemRarity;
  upgradeLevel?: number;
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
  damageMin?: number;
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
}

export interface NpcState {
  id: string;
  kind: NpcKind;
  name: string;
  title: string;
  zone: WorldZone;
  position: V3;
  rotationY: number;
  modelUrl: string;
  interactRange: number;
  clickRadius: number;
  collisionRadius: number;
  shopItems?: NpcShopItemState[];
  dialogue?: NpcDialogueState;
}

/** Atributos distribuídos pelo jogador no painel de personagem. */
export interface PartyMemberState {
  id: string;
  name: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  online: boolean;
}

export interface PartyState {
  id: string;
  leaderId: string;
  members: PartyMemberState[];
}

export interface PartyInviteState {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  expiresAt: number;
}

export interface PartyEvent {
  id: string;
  type: string;
  message: string;
  inviteId?: string;
  fromPlayerId?: string;
  fromName?: string;
  party?: PartyState;
}

export interface FriendState {
  id: string;
  name: string;
  level: number;
  online: boolean;
}

export type ChatChannel = 'local' | 'party' | 'global' | 'system';

export interface ChatMessageState {
  id: string;
  channel: ChatChannel;
  senderId: string;
  senderName: string;
  message: string;
  position: V3;
  timestamp: number;
}

export type TalentTree = 'fury' | 'defense' | 'weapons';
export type TalentEffectType =
  | 'physical_damage_percent'
  | 'attack_speed_proc'
  | 'execute_damage_percent'
  | 'armor_percent'
  | 'max_hp_percent'
  | 'low_hp_damage_reduction'
  | 'sword_damage_percent'
  | 'fire_damage_on_hit'
  | 'critical_chance_percent';

export interface TalentRequirement {
  talentId: string;
  rank: number;
}

export interface TalentEffectDefinition {
  type: TalentEffectType;
  valuePerRank?: number;
  value?: number;
  chancePerRank?: number;
  attackSpeedPercent?: number;
  durationSeconds?: number;
  cooldownSeconds?: number;
  hpBelowPercent?: number;
  enemyHpBelowPercent?: number;
}

export interface TalentDefinition {
  id: string;
  classId: 'warrior';
  name: string;
  description: string;
  tree: TalentTree;
  maxRank: number;
  cost: number;
  requires?: TalentRequirement[];
  effects: TalentEffectDefinition[];
  position?: { x: number; y: number };
}

export interface TalentState {
  talentPoints: number;
  spentPoints: number;
  availablePoints: number;
  talents: Record<string, number>;
}

export interface PlayerAttributes {
  strength: number;
  agility: number;
  vitality: number;
  energy: number;
  unspentPoints: number;
}

/** Estado de uma habilidade ativa exibida na hotbar do jogador. */
export interface SkillState {
  id: SkillId;
  label: string;
  manaCost: number;
  cooldown: number;
  cooldownRemaining: number;
  /** Skill "armada": cast pedido fora de alcance; dispara ao chegar no range. */
  pending?: boolean;
}

/** Efeito temporario autoritativo; o cliente decide a apresentacao visual. */
export interface BuffState {
  id: string;
  label: string;
  remaining: number;
  duration: number;
}

/** Estado de uma entidade num dado instante (o que o servidor transmite). */
export interface EntityState {
  id: string;
  name?: string;
  modelUrl?: string;
  kind: EntityKind;
  position: V3;
  rotationY: number;
  hp: number;
  maxHp: number;
  level: number;
  alive: boolean;
  /** Variante visual/mecanica usada pelos inimigos. */
  enemyVariant?: EnemyVariant;
  /** Escala visual relativa ao inimigo comum. */
  scale?: number;
  /** Ação autoritativa: a renderização não precisa mais adivinhar o combate. */
  action: EntityAction;
  /** True enquanto a entidade esta no meio de um pulo. */
  jumping?: boolean;
  // Campos de progressao — so preenchidos para o jogador.
  xp?: number;
  xpToNext?: number;
  mana?: number;
  maxMana?: number;
  attackDamage?: number;
  attackSpeed?: number;
  /** Faixa de dano da arma equipada (0..0 quando desarmado). */
  weaponDamageMin?: number;
  weaponDamageMax?: number;
  weaponMagicDamageMin?: number;
  weaponMagicDamageMax?: number;
  /** Chance atual de evitar ataques inimigos, de 0 a 1. */
  dodgeChance?: number;
  /** Regeneracao de vida por segundo. */
  healthRegen?: number;
  armor?: number;
  criticalChance?: number;
  attributes?: PlayerAttributes;
  skills?: SkillState[];
  buffs?: BuffState[];
  equippedWeapon?: EquippedWeaponVisualState | null;
  /** Visuais extras de gear no corpo (dual wield, elmo, peitoral). */
  offhandWeapon?: EquippedWeaponVisualState | null;
  helmetVisual?: EquippedWeaponVisualState | null;
  armorVisual?: EquippedWeaponVisualState | null;
}

export interface DamageCombatEvent {
  id: string;
  type: 'damage';
  targetId: string;
  amount: number;
  damageKind: DamageKind;
  critical?: boolean;
  position: V3;
}

export interface MissCombatEvent {
  id: string;
  type: 'miss';
  targetId: string;
  position: V3;
}

export interface SkillEffectCombatEvent {
  id: string;
  type: 'skill-effect';
  skill: SkillId;
  casterId: string;
  position: V3;
  radius: number;
}

export interface BossSlamWarningCombatEvent {
  id: string;
  type: 'boss-slam-warning';
  casterId: string;
  position: V3;
  radius: number;
  delay: number;
}

export interface BossSlamImpactCombatEvent {
  id: string;
  type: 'boss-slam-impact';
  casterId: string;
  position: V3;
  radius: number;
}

export type CombatEvent =
  | DamageCombatEvent
  | MissCombatEvent
  | SkillEffectCombatEvent
  | BossSlamWarningCombatEvent
  | BossSlamImpactCombatEvent;

/** "Foto" completa do mundo num tick. E o que o cliente desenha. */
export interface WorldSnapshot {
  tick: number;
  zone: WorldZone;
  entities: EntityState[];
  loot: LootState[];
  chests: ChestState[];
  /** Catalogo de NPCs. Em runtime pode chegar `null` quando nao mudou (delta). */
  npcs: NpcState[];
  /**
   * Inventário do jogador. O servidor só (re)envia este array quando muda (delta) ou
   * periodicamente; quando não muda manda `null` e o cliente reaproveita o cache.
   * (em runtime pode chegar `null`; o cliente injeta o cache antes de consumir.)
   */
  inventory: InventoryItem[];
  /** Banco do jogador. DELTA: em runtime pode chegar `null` (= nao mudou). */
  stash: InventoryItem[];
  /**
   * Slots de equipamento. DELTA igual ao inventário: em runtime pode chegar
   * `null` (= não mudou) e o cliente injeta o cache antes de consumir. Quando
   * `equipment` vem preenchido, `equippedWeapon` acompanha (mesmo rev).
   */
  equipment: EquipmentState;
  /** Arma que o herói está exibindo/empunhando. */
  equippedWeapon: EquippedWeaponVisualState | null;
  combatEvents: CombatEvent[];
  /** Quest guia. DELTA: em runtime pode chegar `null` (= não mudou). */
  quest: QuestState;
  vendorStock: Record<string, Record<string, number>>;
  party: PartyState | null;
  partyInvites: PartyInviteState[];
  partyEvents: PartyEvent[];
  friends: FriendState[];
  chatMessages: ChatMessageState[];
  talents: TalentState;
}

/** Comandos que o cliente envia ao servidor (intencoes do jogador). */
export type Command =
  | { type: 'move'; entityId: string; target: V3; run?: boolean }
  | { type: 'attack'; entityId: string; targetId: string }
  | { type: 'jump'; entityId: string }
  | { type: 'cast-skill'; entityId: string; skill: SkillId; targetId?: string }
  | { type: 'collect'; entityId: string; lootId: string }
  | { type: 'drop-item'; entityId: string; itemId?: string; item?: ItemKind }
  | { type: 'open-chest'; entityId: string; chestId: string }
  | { type: 'equip-item'; entityId: string; itemId: string; slot?: EquipmentSlot }
  | { type: 'buy-vendor-item'; entityId: string; vendorId: string; itemId: string }
  | { type: 'sell-unused-gear-at-vendor'; entityId: string; vendorId: string }
  | { type: 'deposit-stash-item'; entityId: string; npcId: string; item?: ItemKind; itemId?: string }
  | { type: 'withdraw-stash-item'; entityId: string; npcId: string; item?: ItemKind; itemId?: string }
  | { type: 'accept-quest'; entityId: string; npcId: string }
  | { type: 'claim-quest-reward'; entityId: string; npcId: string }
  | { type: 'heal-at-npc'; entityId: string; npcId: string }
  | { type: 'upgrade-at-npc'; entityId: string; npcId: string; item: ItemKind }
  | { type: 'travel-at-npc'; entityId: string; npcId: string }
  | { type: 'train-attribute-at-npc'; entityId: string; npcId: string; attribute: PlayerAttribute }
  | { type: 'transmute-at-npc'; entityId: string; npcId: string }
  | { type: 'unequip-slot'; entityId: string; slot: EquipmentSlot }
  | { type: 'use-item'; entityId: string; item: ItemKind }
  | { type: 'allocate-attribute'; entityId: string; attribute: PlayerAttribute }
  | { type: 'enter-dungeon'; entityId: string }
  | { type: 'leave-dungeon'; entityId: string }
  | { type: 'party_invite_send'; entityId: string; targetPlayerId: string }
  | { type: 'party_invite_accept'; entityId: string; inviteId: string }
  | { type: 'party_invite_decline'; entityId: string; inviteId: string }
  | { type: 'party_leave'; entityId: string }
  | { type: 'party_kick'; entityId: string; targetPlayerId: string }
  | { type: 'party_leader_transfer'; entityId: string; targetPlayerId: string }
  | { type: 'friend_add'; entityId: string; targetPlayerId: string }
  | { type: 'friend_remove'; entityId: string; targetPlayerId: string }
  | { type: 'chat_send'; entityId: string; channel: ChatChannel; message: string }
  | { type: 'talent_learn'; entityId: string; talentId: string }
  | { type: 'talent_reset'; entityId: string }
  | { type: 'respawn'; entityId: string };
