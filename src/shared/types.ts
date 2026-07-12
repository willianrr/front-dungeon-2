import type { V3 } from './mathx';

// ---------------------------------------------------------------------------
// Contrato compartilhado entre cliente e "servidor".
// Estes tipos viajam entre o navegador e o backend Go via JSON/WebSocket.
// ---------------------------------------------------------------------------

export type EntityKind = 'player' | 'enemy';
export type EntityAction = 'idle' | 'walk' | 'run' | 'attack' | 'dead';
export type EnemyVariant =
  | 'zombie'
  | 'zombieBoss'
  | 'zombieShardcaster'
  | 'zombieAshCorruptor'
  | 'zombieRuinBrute'
  | 'utraeanSentinel';
export type WorldZone = 'overworld' | 'dungeon';
export type RunicElitePhase = 'aegis' | 'fury';
export type PlayerAttribute = 'strength' | 'agility' | 'vitality' | 'energy';

export type GemKind = 'jewel_bless' | 'jewel_soul';
export type OreKind = 'copper' | 'iron' | 'mithril';
export type OreItemKind = 'copper_ore' | 'iron_ore' | 'mithril_ore';
export type BarItemKind = 'copper_bar' | 'iron_bar' | 'mithril_bar';
export type CraftingMaterialKind = OreItemKind | BarItemKind;
export type WeaponGlowGem = 'bless' | 'soul';
export type WeaponElement = 'fire';
export type DamageKind = 'physical' | 'magic';
export type CombatTextKind = DamageKind | 'incoming' | 'miss' | 'critical' | 'bleed' | 'stagger';
export type SkillId = 'arcane-nova' | 'war-cry' | 'charge' | 'heavy-strike' | 'steel-sweep' | 'iron-guard' | 'arcane-bolt' | 'bulwark-call' | 'storm-orb' | 'feral-form' | 'root-snare' | 'chain-lightning' | 'renewal-wave' | 'phase-step' | 'nature-spirit';
export type EnemySupportSkill = 'ash-veil';
export type EnemyBruteSkill = 'ruin-cleave' | 'ruin-exposed';
export type EnemyUtraeanSkill = 'utraean-lance';
export type BossSealSkill = 'seal-rupture' | 'seal-pulse';
export type AshVeilInterruptSkill = 'heavy-strike' | 'charge' | 'steel-sweep' | 'arcane-nova' | 'arcane-bolt';
export type SkillDiscipline = 'martial' | 'arcana' | 'survival';
export type SkillTargetMode = 'self' | 'self-area' | 'enemy' | 'ground';
export type MasteryId = 'martial' | 'arcana' | 'survival';
export type EquipmentSetId = 'arhok-vanguard' | 'utraean-tempest' | 'stoneguard-oath';
/** Variante autoritativa da Varredura de Aco, escolhida pela arma equipada. */
export type SteelSweepVariant = 'sword' | 'axe' | 'hammer';
/** Efeitos derivados de uma habilidade que nao sao comandos lancaveis. */
export type SkillEffectId = SkillId
  | 'arcane-bolt-impact'
  | 'arcane-bolt-slow'
  | 'chain-lightning-impact'
  | 'renewal-wave-heal'
  | 'nature-spirit-summon'
  | 'nature-spirit-bolt'
  | 'bulwark-call-block'
  | 'doctrine-vanguard-ready'
  | 'doctrine-vanguard-release'
  | 'doctrine-arcane-flow'
  | 'doctrine-guardian-flow'
  | 'iron-guard-block'
  | 'iron-guard-perfect'
  | 'steel-sweep-bleed'
  | 'steel-sweep-stagger';
/** Acoes que ocupam os slots 1-8 da hotbar (reorganizaveis via drag & drop). */
export type HotbarAction = 'potion' | 'mana-potion' | SkillId;
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
  | 'copper_pickaxe'
  | 'iron_pickaxe'
  | 'mithril_pickaxe'
  | CraftingMaterialKind
  | GemKind;
/** Armas que causam dano fisico quando empunhadas. */
export type WeaponKind = 'sword' | 'axe' | 'great_sword' | 'great_axe' | 'war_hammer';
/** Tiers de raridade de uma arma — definem (e colorem) a faixa de dano. */
export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type ItemAffixCategory = 'prefix' | 'suffix';
export type ItemAffixStat =
  | 'physical_damage_flat'
  | 'fire_damage_flat'
  | 'armor_flat'
  | 'max_health_flat'
  | 'max_mana_flat'
  | 'critical_chance';

/** Um modificador individual sorteado pelo servidor quando o equipamento nasce. */
export interface ItemAffix {
  id: string;
  name: string;
  category: ItemAffixCategory;
  stat: ItemAffixStat;
  tier: number;
  value?: number;
  valueMin?: number;
  valueMax?: number;
}
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
  /** Identidade explicita de conjunto; ambos os campos aparecem juntos. */
  setId?: EquipmentSetId;
  setPieceId?: string;
  /** Poder da instancia no momento do drop; dirige tiers e valores dos afixos. */
  itemLevel?: number;
  /** Rolls explicitos e imutaveis desta instancia. */
  affixes?: ItemAffix[];
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
  setId?: EquipmentSetId;
  setPieceId?: string;
  itemLevel?: number;
  affixes?: ItemAffix[];
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

export interface ForgeRecipeState {
  id: string;
  label: string;
  recipeType: 'smelting' | 'tool' | 'equipment';
  ingredients: ForgeIngredientState[];
  /** Primeiro ingrediente, mantido para compatibilidade com servidores antigos. */
  inputKind: CraftingMaterialKind;
  inputCount: number;
  outputKind: ItemKind;
  outputCount: number;
  outputRarity?: ItemRarity;
  outputSetId?: EquipmentSetId;
  outputSetPieceId?: string;
  itemLevelBonus?: number;
  /** Nivel de Ferraria necessario para executar a receita. */
  requiredLevel: number;
  /** Experiencia de Ferraria concedida por lote concluido. */
  xpReward: number;
  toolTier?: number;
  requiredToolTier?: number;
}

export interface ForgeIngredientState {
  kind: CraftingMaterialKind;
  count: number;
}

export interface NpcShopItemState {
  id: string;
  kind: ItemKind;
  price: number;
  count?: number;
  stock?: number;
  rarity?: ItemRarity;
  itemLevel?: number;
  affixes?: ItemAffix[];
  upgradeLevel?: number;
  glowGem?: WeaponGlowGem;
  element?: WeaponElement;
  damageMin?: number;
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
  armor?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusCrit?: number;
	service?: 'expedition_mule';
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
  forgeRecipes?: ForgeRecipeState[];
  dialogue?: NpcDialogueState;
}

/** Veio de minerio autoritativo presente no overworld. */
export interface OreNodeState {
  id: string;
  kind: OreKind;
  oreKind: OreItemKind;
  position: V3;
  remaining: number;
  capacity: number;
  depleted: boolean;
  respawnRemaining: number;
  interactRange: number;
  /** Nivel de Mineracao necessario para extrair deste veio. */
  requiredLevel: number;
  rich?: boolean;
  baseYield?: number;
  requiredToolTier?: number;
}

export interface MiningToolState {
  version: 1;
  id: 'improvised_pickaxe' | 'copper_pickaxe' | 'iron_pickaxe' | 'mithril_pickaxe';
  label: string;
  tier: 0 | 1 | 2 | 3;
  cooldown: number;
  perfectEvery: 0 | 3;
  perfectYieldBonus: 0 | 1 | 2;
}

export interface MiningState {
  cooldown: number;
  cooldownRemaining: number;
  interactRange: number;
  lastNodeId?: string;
  tool?: MiningToolState;
  focusNodeId?: string;
  strikeStreak?: number;
  focusRemaining?: number;
  perfectReady?: boolean;
}

/** Progresso autoritativo de um oficio persistente do personagem. */
export interface ProfessionProgressState {
  id: 'mining' | 'smithing';
  label: string;
  level: number;
  /** Experiencia total acumulada neste oficio. */
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  maxLevel: number;
  /** Presente em Mineracao: chance [0..1] de extrair +1 minerio. */
  bonusYieldChance?: number;
}

/** Um passo mensuravel do contrato tutorial de oficios oferecido por Borin. */
export interface ProfessionContractObjectiveState {
  id: string;
  label: string;
  current: number;
  goal: number;
  completed: boolean;
}

/** Contrato autoritativo: o cliente apenas exibe progresso e solicita o resgate. */
export interface ProfessionContractState {
  id: string;
  title: string;
  description: string;
  objectives: ProfessionContractObjectiveState[];
  completed: boolean;
  claimable: boolean;
  claimed: boolean;
  rewardText: string;
}

export interface ProfessionsState {
  mining: ProfessionProgressState;
  smithing: ProfessionProgressState;
  /** Ausente em servidores antigos; a normalizacao do cliente converte para []. */
  contracts: ProfessionContractState[];
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
  alive: boolean;
  zone?: WorldZone;
}

export interface PartyState {
  id: string;
  leaderId: string;
  members: PartyMemberState[];
  cargo?: ExpeditionCargoState;
}

export interface ExpeditionCargoItemState {
  kind: ItemKind;
  count: number;
}

export interface ExpeditionCargoState {
  version: 1;
  id: string;
  partyId: string;
  leaderId: string;
  position: V3;
  capacity: 12;
  used: number;
  interactRange: 4.5;
  items: ExpeditionCargoItemState[];
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
  /** Contrato aditivo das escolhas exclusivas; ausente em servidores antigos. */
  signatureVersion?: number;
  signatureChoices?: CombatDoctrineChoiceState[];
  /** Contrato independente das escolhas laterais de técnica. */
  techniqueVersion?: number;
  techniqueChoices?: SteelSweepTechniqueChoiceState[];
}

/** Escolha autoritativa de Doutrina de Combate anunciada pelo servidor. */
export interface CombatDoctrineChoiceState {
  id: string;
  label: string;
  description: string;
  choiceGroup: string;
  cost: number;
  requiredMasteryId: MasteryId;
  requiredMasteryLevel: number;
  modifiesSkills: SkillId[];
}

export interface SteelSweepTechniqueChoiceState {
  id: string;
  label: string;
  description: string;
  choiceGroup: string;
  cost: number;
  requiredMasteryId: MasteryId;
  requiredMasteryLevel: number;
  modifiesSkills: SkillId[];
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
  /** Alcance autoritativo em metros, quando o cast depende de um alvo. */
  range?: number;
  /** Texto mecanico autoritativo, quando o servidor tiver uma descricao dinamica. */
  description?: string;
  /** Preenchida para Varredura de Aco conforme a arma que dirige o cast. */
  variant?: SteelSweepVariant;
  /** Skill "armada": cast pedido fora de alcance; dispara ao chegar no range. */
  pending?: boolean;
  /** Bloqueio temporário autoritativo, separado de mana e cooldown. */
  blocked?: boolean;
  blockedReason?: string;
  /** Familia de progressao e apresentacao da habilidade. */
  discipline?: SkillDiscipline;
  /** Forma autoritativa de aquisicao de alvo; substitui inferencias pelo ID. */
  targetMode?: SkillTargetMode;
  /** O servidor rejeita o cast quando nao ha uma arma fisica equipada. */
  requiresPhysicalWeapon?: boolean;
  /** O cast valido interrompe a intencao de movimento atual. */
  stationary?: boolean;
  /** Progressao de uso que modifica esta habilidade, quando aplicavel. */
  masteryId?: MasteryId;
  /** Descricoes autoritativas de modificadores ativos; nunca alteram o cast local. */
  modifiers?: SkillModifierState[];
}

export interface SkillModifierState {
  id: string;
  label: string;
  description: string;
}

export interface EquipmentSetBonusState {
  pieces: 2 | 3;
  label: string;
  description: string;
  active: boolean;
}

/** Progresso calculado exclusivamente pelo servidor a partir dos slots equipados. */
export interface EquipmentSetState {
  id: EquipmentSetId;
  label: string;
  piecesEquipped: number;
  totalPieces: 3;
  bonuses: EquipmentSetBonusState[];
}

/** Progressao persistente de uso exposta no snapshot. */
export interface MasteryProgressState {
  id: MasteryId;
  label: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  maxLevel: number;
  /** Fracao de dano adicional: 0.02 representa +2%. */
  damageBonus: number;
  /** Fracao de potencia defensiva adicional; ausente em servidores anteriores. */
  defenseBonus?: number;
}

/** Efeito temporario autoritativo; o cliente decide a apresentacao visual. */
export interface BuffState {
  id: string;
  label: string;
  remaining: number;
  duration: number;
  targetId?: string;
  charges?: number;
  amount?: number;
}

/** Status temporario autoritativo, benefico ou negativo, visivel no estado da entidade. */
export interface StatusState {
  id: string;
  sourceId?: string;
  sourceSkill?: SkillId | EnemySupportSkill;
  variant?: SteelSweepVariant;
  remaining: number;
  duration: number;
}

/** Relogios autoritativos da manobra universal; ausente em servidores legados. */
export interface EvadeState {
  cooldown: 3;
  cooldownRemaining: number;
  duration: 0.32;
  remaining: number;
}

/** Canal público de reanimação cooperativa mantido pelo servidor. */
export interface ReviveChannelState {
  targetId: string;
  remaining: number;
  duration: 3;
  range: 3.2;
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
  /** Fase autoritativa do Boss Zumbi; ausente preserva o wire legado da fase I. */
  bossPhase?: 1 | 2;
  /** Envelope aditivo dos Elites Rúnicos; ausente mantém inimigo legado. */
  eliteVersion?: 1;
  eliteModifiers?: EnemyModifierState[];
  elitePhase?: RunicElitePhase;
  /** Afixos ortogonais comprometidos pelo tier da sala. */
  difficultyModifiers?: EnemyModifierState[];
  /** Escala visual relativa ao inimigo comum. */
  scale?: number;
  /** Ação autoritativa: a renderização não precisa mais adivinhar o combate. */
  action: EntityAction;
  /** True enquanto a entidade esta no meio de um pulo. */
  jumping?: boolean;
  /** True somente durante a janela defensiva da esquiva autoritativa. */
  evading?: boolean;
  /** Contrato da manobra universal; não pertence ao catálogo/hotbar de skills. */
  evade?: EvadeState;
  revive?: ReviveChannelState;
  // Campos de progressão — em geral só do jogador; attackSpeed também pode
  // acompanhar a animação autoritativa de um inimigo especial.
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
  equipmentSets?: EquipmentSetState[];
  buffs?: BuffState[];
  statuses?: StatusState[];
  equippedWeapon?: EquippedWeaponVisualState | null;
  /** Visuais extras de gear no corpo (dual wield, elmo, peitoral). */
  offhandWeapon?: EquippedWeaponVisualState | null;
  helmetVisual?: EquippedWeaponVisualState | null;
  armorVisual?: EquippedWeaponVisualState | null;
}

export interface EnemyModifierState {
  id: 'runic_aegis' | 'runic_fury' | 'difficulty_fortified' | 'difficulty_vicious' | 'difficulty_relentless';
  label: string;
  description: string;
  active: boolean;
}

export interface DamageCombatEvent {
  id: string;
  type: 'damage';
  targetId: string;
  casterId?: string;
  amount: number;
  damageKind: DamageKind;
  critical?: boolean;
  /** Permite correlacionar dano e habilidade sem inferir por alvo/tempo. */
  sourceSkill?: SkillId | EnemyBruteSkill | EnemyUtraeanSkill | BossSealSkill;
  variant?: SteelSweepVariant;
  /** Marca dano periodico que precisa de apresentacao mais discreta. */
  damageEffect?: 'bleed';
  duration?: number;
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
  skill: SkillEffectId;
  casterId: string;
  targetId?: string;
  sourceSkill?: SkillId;
  position: V3;
  radius: number;
  /** Necessaria no evento para que outros jogadores vejam a variante correta. */
  variant?: SteelSweepVariant | DoctrineFlowVariant;
  duration?: number;
  /** Segmentos instantâneos podem congelar a origem e a carga/ordem visual. */
  origin?: V3;
  charges?: number;
  /** Valor efetivo autoritativo aplicado por efeitos que não causam dano, como cura. */
  amount?: number;
}

/** Geometria congelada da forma lateral; acertos continuam exclusivos do servidor. */
export interface SteelSweepFormCombatEvent {
  id: string;
  type: 'steel-sweep-effect';
  skill: 'steel-sweep';
  casterId: string;
  position: V3;
  radius: number;
  variant: SteelSweepVariant;
  modifierId: 'warrior_sweep_form_orbit' | 'warrior_sweep_form_wedge';
  rotationY?: number;
  arcDegrees?: number;
}

export type DoctrineFlowVariant =
  | 'bolt-to-nova'
  | 'nova-to-bolt'
  | 'guard-to-bulwark'
  | 'bulwark-to-guard';

export interface EnemyProjectileWarningCombatEvent {
  id: string;
  type: 'enemy-projectile-warning';
  casterId: string;
  targetId?: string;
  position: V3;
  radius: number;
  delay?: number;
}

export interface EnemyProjectileImpactCombatEvent {
  id: string;
  type: 'enemy-projectile-impact';
  casterId: string;
  targetId?: string;
  position: V3;
  radius: number;
  delay?: number;
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

/** Telegraph autoritativo, emitido uma vez para cada aliado congelado pelo Corruptor. */
export interface EnemySupportWarningCombatEvent {
  id: string;
  type: 'enemy-support-warning';
  casterId: string;
  targetId: string;
  skill: EnemySupportSkill;
  radius: number;
  delay: number;
}

/** Confirmacao autoritativa de que um alvo recebeu o Veu de Cinzas. */
export interface EnemySupportApplyCombatEvent {
  id: string;
  type: 'enemy-support-apply';
  casterId: string;
  targetId: string;
  skill: EnemySupportSkill;
  duration: number;
}

/** Interrupcao autoritativa do canal; targetId identifica o jogador interruptor. */
export interface EnemySupportInterruptedCombatEvent {
  id: string;
  type: 'enemy-support-interrupted';
  casterId: string;
  targetId: string;
  skill: EnemySupportSkill;
  sourceSkill: AshVeilInterruptSkill;
}

/** Setor autoritativo congelado quando o Bruto inicia o Golpe da Ruina. */
export interface EnemyBruteWarningCombatEvent {
  id: string;
  type: 'enemy-brute-warning';
  casterId: string;
  skill: 'ruin-cleave';
  position: V3;
  rotationY: number;
  radius: number;
  arcDegrees: number;
  delay: number;
}

/** Confirmacao autoritativa do mesmo setor; nao implica hit calculado no cliente. */
export interface EnemyBruteImpactCombatEvent {
  id: string;
  type: 'enemy-brute-impact';
  casterId: string;
  skill: 'ruin-cleave';
  position: V3;
  rotationY: number;
  radius: number;
  arcDegrees: number;
}

/** Janela autoritativa aberta por uma Guarda de Ferro perfeita. */
export interface EnemyBruteExposedCombatEvent {
  id: string;
  type: 'enemy-brute-exposed';
  casterId: string;
  targetId: string;
  skill: 'ruin-exposed';
  sourceSkill: 'iron-guard';
  position: V3;
  duration: number;
}

export interface UtraeanLanceWarningCombatEvent {
  id: string;
  type: 'utraean-lance-warning';
  casterId: string;
  skill: 'utraean-lance';
  origin: V3;
  position: V3;
  radius: 0.9;
  delay: 0.85;
}

export interface UtraeanLanceImpactCombatEvent {
  id: string;
  type: 'utraean-lance-impact';
  casterId: string;
  skill: 'utraean-lance';
  origin: V3;
  position: V3;
  radius: 0.9;
}

export interface UtraeanLanceInterruptedCombatEvent {
  id: string;
  type: 'utraean-lance-interrupted';
  casterId: string;
  targetId: string;
  skill: 'utraean-lance';
  sourceSkill: SkillId;
  position: V3;
  duration: 1.8;
}

export type UtraeanSentinelCombatEvent =
  | UtraeanLanceWarningCombatEvent
  | UtraeanLanceImpactCombatEvent
  | UtraeanLanceInterruptedCombatEvent;

/** Transicao autoritativa para a segunda fase do Boss Zumbi. */
export interface BossSealRuptureCombatEvent {
  id: string;
  type: 'boss-seal-rupture';
  casterId: string;
  skill: 'seal-rupture';
  position: V3;
  radius: number;
  duration: number;
}

/** Telegraph autoritativo do anel: o nucleo interno permanece seguro. */
export interface BossSealPulseWarningCombatEvent {
  id: string;
  type: 'boss-seal-pulse-warning';
  casterId: string;
  skill: 'seal-pulse';
  position: V3;
  innerRadius: number;
  radius: number;
  delay: number;
}

/** Confirmacao autoritativa do mesmo anel congelado no warning. */
export interface BossSealPulseImpactCombatEvent {
  id: string;
  type: 'boss-seal-pulse-impact';
  casterId: string;
  skill: 'seal-pulse';
  position: V3;
  innerRadius: number;
  radius: number;
}

/** Transição monotônica do Elite Rúnico para sua metade acelerada. */
export interface RunicEliteFuryCombatEvent {
  id: string;
  type: 'runic-elite-fury';
  casterId: string;
  skill: 'runic-fury';
  modifierId: 'runic_fury';
  position: V3;
  radius: number;
}

/** Confirmação histórica da morte e do pacote superior de recompensa. */
export interface RunicEliteDefeatedCombatEvent {
  id: string;
  type: 'runic-elite-defeated';
  casterId: string;
  targetId?: string;
  skill: 'runic-elite';
  position: V3;
  radius: number;
}

export interface MiningPerfectStrikeCombatEvent {
  id: string;
  type: 'mining-perfect-strike';
  casterId: string;
  skill: 'mining-perfect-strike';
  resourceId: string;
  variant: OreKind;
  modifierId: 'copper_pickaxe' | 'iron_pickaxe' | 'mithril_pickaxe';
  amount: 1 | 2;
  position: V3;
  radius: number;
}

/** Consumo autoritativo da Marca de Ressonância pela Nova Arcana. */
export interface ArcaneResonanceRuptureCombatEvent {
  id: string;
  type: 'arcane-resonance-rupture';
  casterId: string;
  targetId: string;
  amount: 6;
  skill: 'arcane-resonance';
  variant: 'rupture';
  sourceSkill: 'arcane-nova';
  modifierId: 'arcane_resonance';
  position: V3;
  radius: 2.8;
}

export interface GuardianRetaliationReadyCombatEvent {
  id: string;
  type: 'guardian-retaliation-ready';
  casterId: string;
  targetId: string;
  skill: 'guardian-retaliation';
  variant: 'ready';
  sourceSkill: 'iron-guard';
  modifierId: 'guardian_retaliation';
  position: V3;
  radius: 1.6;
  duration: 4;
}

export interface GuardianRetaliationReleaseCombatEvent {
  id: string;
  type: 'guardian-retaliation-release';
  casterId: string;
  targetId: string;
  skill: 'guardian-retaliation';
  variant: 'release';
  sourceSkill: 'heavy-strike';
  modifierId: 'guardian_retaliation';
  position: V3;
  radius: 2.2;
}

export type GuardianRetaliationCombatEvent =
  | GuardianRetaliationReadyCombatEvent
  | GuardianRetaliationReleaseCombatEvent;

export interface EvadeStartCombatEvent {
  id: string;
  type: 'evade-start';
  casterId: string;
  skill: 'evade';
  variant: 'start';
  modifierId: 'targeted_evasion';
  origin: V3;
  position: V3;
  radius: number;
  duration: 0.32;
}

export interface EvadeAvoidCombatEvent {
  id: string;
  type: 'evade-avoid';
  casterId: string;
  targetId: string;
  skill: 'evade';
  variant: 'avoid';
  modifierId: 'targeted_evasion';
  position: V3;
  radius: 1.2;
  duration: 0.32;
}

export type ActiveEvasionCombatEvent = EvadeStartCombatEvent | EvadeAvoidCombatEvent;

export interface StormOrbDischargeCombatEvent {
  id: string;
  type: 'storm-orb-discharge';
  casterId: string;
  targetId: string;
  skill: 'storm-orb';
  variant: 'discharge';
  modifierId: 'storm_orb_autonomous';
  charges: 0 | 1 | 2 | 3;
  origin: V3;
  position: V3;
  radius: 0.9;
}

export type EncounterPhase = 'idle' | 'arming' | 'wave' | 'intermission' | 'complete' | 'cooldown';

/** Estado personalizado e autoritativo da sala estruturada da masmorra. */
export interface EncounterState {
  version: 1;
  id: 'seal-chamber';
  phase: EncounterPhase;
  wave: number;
  totalWaves: 3;
  remaining: number;
  timer: number;
  center: V3;
  triggerRadius: number;
  barrierRadius: number;
  barrierActive: boolean;
  participant: boolean;
  rewardEligible: boolean;
  completed: boolean;
}

export interface EncounterSealArmingCombatEvent {
  id: string;
  type: 'encounter-seal-arming';
  encounterId: 'seal-chamber';
  position: V3;
  radius: number;
  delay: number;
}

export interface EncounterSealWaveCombatEvent {
  id: string;
  type: 'encounter-seal-wave';
  encounterId: 'seal-chamber';
  position: V3;
  radius: number;
  wave: number;
}

export interface EncounterSealCompleteCombatEvent {
  id: string;
  type: 'encounter-seal-complete';
  encounterId: 'seal-chamber';
  position: V3;
  radius: number;
}

export interface EncounterSealResetCombatEvent {
  id: string;
  type: 'encounter-seal-reset';
  encounterId: 'seal-chamber';
  position: V3;
  radius: number;
}

export type CombatEvent =
  | DamageCombatEvent
  | MissCombatEvent
  | SkillEffectCombatEvent
  | SteelSweepFormCombatEvent
  | EnemyProjectileWarningCombatEvent
  | EnemyProjectileImpactCombatEvent
  | BossSlamWarningCombatEvent
  | BossSlamImpactCombatEvent
  | EnemySupportWarningCombatEvent
  | EnemySupportApplyCombatEvent
  | EnemySupportInterruptedCombatEvent
  | EnemyBruteWarningCombatEvent
  | EnemyBruteImpactCombatEvent
  | EnemyBruteExposedCombatEvent
  | UtraeanSentinelCombatEvent
  | BossSealRuptureCombatEvent
  | BossSealPulseWarningCombatEvent
  | BossSealPulseImpactCombatEvent
  | RunicEliteFuryCombatEvent
  | RunicEliteDefeatedCombatEvent
  | MiningPerfectStrikeCombatEvent
  | ArcaneResonanceRuptureCombatEvent
  | GuardianRetaliationCombatEvent
  | ActiveEvasionCombatEvent
  | StormOrbDischargeCombatEvent
  | EncounterSealArmingCombatEvent
  | EncounterSealWaveCombatEvent
  | EncounterSealCompleteCombatEvent
  | EncounterSealResetCombatEvent;

export type ProjectileKind = 'corruptedShard' | 'arcaneBolt';

export interface ProjectileState {
  id: string;
  kind: ProjectileKind;
  casterId: string;
  position: V3;
  velocity: V3;
  radius: number;
}

/** Zona de controle autoritativa criada por uma habilidade lançada no chão. */
export interface ControlZoneState {
  id: string;
  kind: 'root-snare';
  casterId: string;
  position: V3;
  radius: 3.6;
  remaining: number;
  duration: 4;
  slowMultiplier: 0.65;
}

export type BiomeHazardStage = 'clear' | 'chilled' | 'frostbitten';

export interface BiomeBoundsState {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WarmthSourceState {
  id: string;
  label: string;
  position: V3;
  radius: number;
}

/** Projeção pessoal do primeiro bioma mecânico do overworld. */
export interface BiomeState {
  version: 1;
  id: 'arhok-frost-coast';
  label: 'Costa Fria de Arhok';
  active: boolean;
  bounds: BiomeBoundsState;
  exposure: number;
  maxExposure: 100;
  stage: BiomeHazardStage;
  warmth: boolean;
  moveSpeedMultiplier: 1 | 0.9 | 0.78;
  warmthSources: WarmthSourceState[];
}

export type CorruptedSporePhase = 'dormant' | 'warning' | 'active';

export interface SporePodState {
  id: string;
  label: string;
  position: V3;
  radius: 3.4;
  phase: CorruptedSporePhase;
  timer: number;
}

export interface CorruptedJungleState {
  version: 1;
  id: 'ironwood-corrupted-jungle';
  label: 'Selva Corrompida de Ironwood';
  active: boolean;
  bounds: BiomeBoundsState;
  pods: SporePodState[];
}

/** Projecao pessoal de uma ancora da rede de viagem de Aranna. */
export interface DisplacerState {
  id: string;
  label: string;
  zone: WorldZone;
  position: V3;
  interactRange: number;
  requiredLevel: number;
  activated: boolean;
  current: boolean;
  canActivate: boolean;
  canTravel: boolean;
  lockedReason?: string;
}

export type DifficultyId = 'normal' | 'veteran' | 'elite';

export interface DifficultyOptionState {
  id: DifficultyId;
  label: string;
  description: string;
  requiredLevel: number;
  selected: boolean;
  canSelect: boolean;
  lockedReason?: string;
}

export interface DifficultyState {
  id: DifficultyId;
  label: string;
  rank: 0 | 1 | 2;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  xpMultiplier: number;
  coinMultiplier: number;
  lootChanceBonus: number;
  itemPowerBonus: number;
  rarePlusChance: number;
  affixesPerEnemy: number;
  leaderId?: string;
  canChange: boolean;
  lockedReason?: string;
  options: DifficultyOptionState[];
}

export type TreasureLodePhase = 'dormant' | 'wave' | 'intermission' | 'reward' | 'cooldown';

export interface TreasureLodeState {
  id: 'treasure-lode-ironwood';
  label: 'Jazida do Coração de Ferro';
  phase: TreasureLodePhase;
  nodeId: 'ore-iron-3';
  center: V3;
  triggerRadius: number;
  arenaRadius: number;
  wave: number;
  totalWaves: number;
  remainingEnemies: number;
  timer: number;
  participant: boolean;
  rewardReady: boolean;
  chestPosition: V3;
  chestInteractRange: number;
  canClaim: boolean;
  lockedReason?: string;
}

export type UtraeanRelayPhase = 'dormant' | 'active' | 'reward' | 'cooldown';

export interface UtraeanRuneState {
  id: 'utraean-rune-sun' | 'utraean-rune-tide' | 'utraean-rune-star';
  label: 'Runa do Sol' | 'Runa da Maré' | 'Runa da Estrela';
  position: V3;
  sequenceStep: number;
  activated: boolean;
  current: boolean;
}

export interface UtraeanRelayState {
  id: 'utraean-rune-relay';
  label: 'Circuito Rúnico Utraeano';
  phase: UtraeanRelayPhase;
  center: V3;
  consoleInteractRange: number;
  runes: UtraeanRuneState[];
  sequence: UtraeanRuneState['id'][];
  progress: number;
  timer: number;
  participant: boolean;
  claimed: boolean;
  chestPosition: V3;
  chestInteractRange: number;
  canClaim: boolean;
  guardianActive: boolean;
  guardianId?: string;
  lockedReason?: string;
}

/** "Foto" completa do mundo num tick. E o que o cliente desenha. */
export interface WorldSnapshot {
  tick: number;
  zone: WorldZone;
  entities: EntityState[];
  loot: LootState[];
  chests: ChestState[];
  oreNodes: OreNodeState[];
  /** Rede pessoal persistente de viagem; ausente em servidores antigos = vazia. */
  displacers: DisplacerState[];
  /** Tier autoritativo e compartilhado da sala. */
  difficulty: DifficultyState;
  /** Evento local de mineração/emboscada; ausente fora da AOI/zona. */
  treasureLode?: TreasureLodeState;
  /** Puzzle cooperativo recorrente das ruínas; ausente fora da AOI/zona. */
  utraeanRelay?: UtraeanRelayState;
  /** Lista autoritativa completa; ausente em servidores antigos equivale a vazia. */
  projectiles: ProjectileState[];
  /** Invocações temporárias públicas; ausente em servidores antigos equivale a vazia. */
  natureSpirits: NatureSpiritState[];
  /** Zonas de controle autoritativas; ausente em servidores antigos equivale a vazia. */
  controlZones: ControlZoneState[];
  /** Bioma ambiental autoritativo e sua exposição pessoal. */
  biome: BiomeState;
  /** Segundo bioma mecânico: flora tóxica com fases públicas. */
  jungle: CorruptedJungleState;
  mining: MiningState;
  professions: ProfessionsState;
  /** Progresso por uso; ausente em servidores antigos equivale ao fallback inicial. */
  masteries: MasteryProgressState[];
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
  /** Sala estruturada; omitida fora da masmorra e por servidores antigos. */
  encounter?: EncounterState;
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

export interface NatureSpiritState {
  version: 1;
  id: string;
  ownerId: string;
  position: V3;
  remaining: number;
  duration: number;
  attackCooldown: number;
  targetId?: string;
}

/** Comandos que o cliente envia ao servidor (intencoes do jogador). */
export type Command =
  | { type: 'move'; entityId: string; target: V3; run?: boolean }
  | { type: 'attack'; entityId: string; targetId: string }
  | { type: 'jump'; entityId: string }
  | { type: 'evade'; entityId: string; target: V3 }
  | { type: 'cast-skill'; entityId: string; skill: SkillId; targetId?: string; target?: V3 }
  | { type: 'collect'; entityId: string; lootId: string }
  | { type: 'drop-item'; entityId: string; itemId?: string; item?: ItemKind }
  | { type: 'open-chest'; entityId: string; chestId: string }
  | { type: 'mine-ore'; entityId: string; nodeId: string }
  | { type: 'activate-displacer'; entityId: string; nodeId: string }
  | { type: 'travel-displacer'; entityId: string; nodeId: string }
  | { type: 'set-world-difficulty'; entityId: string; difficultyId: DifficultyId }
  | { type: 'claim-treasure-lode'; entityId: string }
  | { type: 'start-utraean-relay'; entityId: string }
  | { type: 'activate-utraean-rune'; entityId: string; nodeId: UtraeanRuneState['id'] }
  | { type: 'claim-utraean-relay'; entityId: string }
  | { type: 'equip-item'; entityId: string; itemId: string; slot?: EquipmentSlot }
  | { type: 'buy-vendor-item'; entityId: string; vendorId: string; itemId: string }
  | { type: 'sell-unused-gear-at-vendor'; entityId: string; vendorId: string }
  | { type: 'deposit-stash-item'; entityId: string; npcId: string; item?: ItemKind; itemId?: string }
  | { type: 'withdraw-stash-item'; entityId: string; npcId: string; item?: ItemKind; itemId?: string }
  | { type: 'accept-quest'; entityId: string; npcId: string }
  | { type: 'claim-quest-reward'; entityId: string; npcId: string }
  | { type: 'heal-at-npc'; entityId: string; npcId: string }
  | { type: 'upgrade-at-npc'; entityId: string; npcId: string; item: ItemKind }
  | { type: 'smelt-ore-at-npc'; entityId: string; npcId: string; recipeId: string; count: number }
  | { type: 'forge-item-at-npc'; entityId: string; npcId: string; recipeId: string }
  | { type: 'claim-profession-contract'; entityId: string; npcId: string; contractId: string }
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
  | { type: 'revive-player'; entityId: string; targetPlayerId: string }
  | { type: 'expedition-cargo-deposit'; entityId: string; item: ItemKind; count: number }
  | { type: 'expedition-cargo-withdraw'; entityId: string; item: ItemKind; count: number }
  | { type: 'friend_add'; entityId: string; targetPlayerId: string }
  | { type: 'friend_remove'; entityId: string; targetPlayerId: string }
  | { type: 'chat_send'; entityId: string; channel: ChatChannel; message: string }
  | { type: 'talent_learn'; entityId: string; talentId: string }
  | { type: 'talent_reset'; entityId: string }
  | { type: 'respawn'; entityId: string };
