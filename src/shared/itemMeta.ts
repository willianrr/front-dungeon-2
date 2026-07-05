import type { EquipmentSlot, GemKind, ItemKind, ItemRarity, WeaponElement, WeaponGlowGem } from './types';

export const ITEM_ICON_URLS: Record<ItemKind, string> = {
  coin: '/models/items/Icons/runtime/Coin.png',
  mana_potion: '/models/items/Icons/Potion1_Filled_Blue.png',
  potion: '/models/items/Icons/runtime/Potion1_Filled_Red.png',
  sword: '/models/items/Icons/runtime/Sword_Golden.png',
  jewel_bless: '/models/items/Icons/runtime/Crystal5.png',
  jewel_soul: '/models/items/Icons/runtime/Crystal1.png',
  axe: '/models/items/Icons/runtime/Axe_Small.png',
  great_sword: '/models/items/Icons/runtime/Sword_big.png',
  great_axe: '/models/items/Icons/runtime/Axe_Double.png',
  war_hammer: '/models/items/Icons/runtime/Hammer_Double.png',
  armor: '/models/items/Icons/runtime/Armor_Metal.png',
  helmet: '/models/items/Icons/runtime/Crown.png',
  gloves: '/models/items/Icons/runtime/Glove.png',
  ring: '/models/items/Icons/runtime/Ring1.png',
  necklace: '/models/items/Icons/runtime/Necklace1.png',
};

/** Icone do peitoral por raridade (o pack tem 5 variantes de armadura). */
const ARMOR_ICON_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/models/items/Icons/runtime/Armor_Leather.png',
  incomum: '/models/items/Icons/runtime/Armor_Metal.png',
  raro: '/models/items/Icons/runtime/Armor_Metal2.png',
  epico: '/models/items/Icons/runtime/Armor_Golden.png',
  lendario: '/models/items/Icons/runtime/Armor_Black.png',
};

/** Icone do anel por raridade (Ring1..Ring7 do pack). */
const RING_ICON_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/models/items/Icons/runtime/Ring1.png',
  incomum: '/models/items/Icons/runtime/Ring2.png',
  raro: '/models/items/Icons/runtime/Ring4.png',
  epico: '/models/items/Icons/runtime/Ring6.png',
  lendario: '/models/items/Icons/runtime/Ring7.png',
};

const NECKLACE_ICON_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/models/items/Icons/runtime/Necklace1.png',
  incomum: '/models/items/Icons/runtime/Necklace1.png',
  raro: '/models/items/Icons/runtime/Necklace2.png',
  epico: '/models/items/Icons/runtime/Necklace2.png',
  lendario: '/models/items/Icons/runtime/Necklace3.png',
};

/** Variantes douradas de armas para epico/lendario. */
const GOLDEN_WEAPON_ICONS: Partial<Record<ItemKind, string>> = {
  axe: '/models/items/Icons/runtime/Axe_Small_Golden.png',
  great_sword: '/models/items/Icons/runtime/Sword_big_Golden.png',
  great_axe: '/models/items/Icons/runtime/Axe_Double_Golden.png',
  war_hammer: '/models/items/Icons/runtime/Hammer_Double_Golden.png',
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  comum: '#c9d1d9',
  incomum: '#5fd66f',
  raro: '#5aa9ff',
  epico: '#c084fc',
  lendario: '#fb923c',
};

export const RARITY_GLOW_SCALE: Record<ItemRarity, number> = {
  comum: 0.92,
  incomum: 1,
  raro: 1.08,
  epico: 1.18,
  lendario: 1.3,
};

export const GEM_GLOW_COLORS: Record<WeaponGlowGem, string> = {
  bless: '#d8f7ff',
  soul: '#4f7dff',
};

export const GEM_KINDS = ['jewel_bless', 'jewel_soul'] as const;

export const GEM_UPGRADE_LIMITS: Record<GemKind, {
  maxLevel: number;
  minLevel: number;
}> = {
  jewel_bless: { minLevel: 0, maxLevel: 6 },
  jewel_soul: { minLevel: 6, maxLevel: 15 },
};

export const GEM_DEFINITIONS: Record<GemKind, {
  glowGem: WeaponGlowGem;
  icon: string;
  modelUrl: string;
  name: string;
}> = {
  jewel_bless: {
    glowGem: 'bless',
    icon: ITEM_ICON_URLS.jewel_bless,
    modelUrl: '/items/Crystal5.glb',
    name: 'Jewel of Bless',
  },
  jewel_soul: {
    glowGem: 'soul',
    icon: ITEM_ICON_URLS.jewel_soul,
    modelUrl: '/items/Crystal1.glb',
    name: 'Jewel of Soul',
  },
};

export function isGemKind(kind: ItemKind): kind is GemKind {
  return (GEM_KINDS as readonly string[]).includes(kind);
}

export function glowColorForGem(gem: WeaponGlowGem | undefined): string {
  return gem ? GEM_GLOW_COLORS[gem] : '#d8f7ff';
}

// ---------------------------------------------------------------------------
// Derivacao client-side de PRESENTACAO (nome/icone/modelo) a partir do tipo.
// O WebSocket nao manda mais esses campos (eram redundantes e inflavam o
// payload com ~70 itens/tick); o cliente os reconstroi aqui. Os mapas/strings
// espelham o backend (sim/items.go e sim/combat.go weaponName).
// ---------------------------------------------------------------------------

/** Rotulo de raridade (espelha rarityDef.Label do backend). */
export const RARITY_LABELS: Record<ItemRarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
};

/** Nome-base por tipo (espelha itemDefs[].Name do backend). */
export const ITEM_BASE_NAMES: Record<ItemKind, string> = {
  coin: 'Moedas de Aranna',
  mana_potion: 'Poção Azul',
  potion: 'Poção Rubra',
  sword: 'Espada Dourada',
  jewel_bless: 'Jewel of Bless',
  jewel_soul: 'Jewel of Soul',
  axe: 'Machado',
  great_sword: 'Espadão',
  great_axe: 'Machado Duplo',
  war_hammer: 'Martelo de Guerra',
  armor: 'Peitoral',
  helmet: 'Elmo',
  gloves: 'Manoplas',
  ring: 'Anel',
  necklace: 'Colar',
};

/** Modelo 3D do loot no chao por tipo (espelha lootModels do backend). */
export const LOOT_MODEL_URLS: Record<ItemKind, string> = {
  coin: '/items/Coin.glb',
  mana_potion: '/items/Potion2_Filled.glb',
  potion: '/items/Potion1_Filled.glb',
  sword: '/items/Sword_Golden.glb',
  jewel_bless: '/items/Crystal5.glb',
  jewel_soul: '/items/Crystal1.glb',
  axe: '/items/Axe_small.glb',
  great_sword: '/items/Sword_big.glb',
  great_axe: '/items/Axe_Double.glb',
  war_hammer: '/items/Hammer_Double.glb',
  armor: '/items/Armor_Metal.glb',
  helmet: '/items/Crown.glb',
  gloves: '/items/Glove.glb',
  ring: '/items/Ring1.glb',
  necklace: '/items/Necklace1.glb',
};

/** Modelo do peitoral por raridade (5 variantes do pack). */
export const ARMOR_MODEL_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/items/Armor_Leather.glb',
  incomum: '/items/Armor_Metal.glb',
  raro: '/items/Armor_Metal2.glb',
  epico: '/items/Armor_Golden.glb',
  lendario: '/items/Armor_Black.glb',
};

const RING_MODEL_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/items/Ring1.glb',
  incomum: '/items/Ring2.glb',
  raro: '/items/Ring4.glb',
  epico: '/items/Ring6.glb',
  lendario: '/items/Ring7.glb',
};

const NECKLACE_MODEL_BY_RARITY: Record<ItemRarity, string> = {
  comum: '/items/Necklace1.glb',
  incomum: '/items/Necklace1.glb',
  raro: '/items/Necklace2.glb',
  epico: '/items/Necklace2.glb',
  lendario: '/items/Necklace3.glb',
};

/** Variantes douradas (modelo) para epico/lendario. */
const GOLDEN_WEAPON_MODELS: Partial<Record<ItemKind, string>> = {
  axe: '/items/Axe_small_Golden.glb',
  great_sword: '/items/Sword_big_Golden.glb',
  great_axe: '/items/Axe_Double_Golden.glb',
  war_hammer: '/items/Hammer_Double_Golden.glb',
};

function isGoldenRarity(rarity: ItemRarity | undefined): boolean {
  return rarity === 'epico' || rarity === 'lendario';
}

export function itemIconFor(kind: ItemKind, rarity?: ItemRarity): string {
  if (kind === 'armor' && rarity) return ARMOR_ICON_BY_RARITY[rarity];
  if (kind === 'ring' && rarity) return RING_ICON_BY_RARITY[rarity];
  if (kind === 'necklace' && rarity) return NECKLACE_ICON_BY_RARITY[rarity];
  if (isGoldenRarity(rarity)) {
    const golden = GOLDEN_WEAPON_ICONS[kind];
    if (golden) return golden;
  }
  return ITEM_ICON_URLS[kind];
}

export function lootModelUrlFor(kind: ItemKind, rarity?: ItemRarity): string {
  if (kind === 'armor' && rarity) return ARMOR_MODEL_BY_RARITY[rarity];
  if (kind === 'ring' && rarity) return RING_MODEL_BY_RARITY[rarity];
  if (kind === 'necklace' && rarity) return NECKLACE_MODEL_BY_RARITY[rarity];
  if (isGoldenRarity(rarity)) {
    const golden = GOLDEN_WEAPON_MODELS[kind];
    if (golden) return golden;
  }
  return LOOT_MODEL_URLS[kind];
}

/** Subconjunto de campos necessario para montar o nome (InventoryItem/LootState). */
export interface NameableItem {
  kind: ItemKind;
  rarity?: ItemRarity;
  upgradeLevel?: number;
  element?: WeaponElement;
  damageMin?: number;
  damageMax?: number;
  magicDamageMin?: number;
  magicDamageMax?: number;
  armor?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusCrit?: number;
}

export const WEAPON_KINDS = ['sword', 'axe', 'great_sword', 'great_axe', 'war_hammer'] as const;
export const TWO_HANDED_KINDS = ['great_sword', 'great_axe', 'war_hammer'] as const;

export function isWeaponKind(kind: ItemKind): boolean {
  return (WEAPON_KINDS as readonly string[]).includes(kind);
}

export function isTwoHandedKind(kind: ItemKind): boolean {
  return (TWO_HANDED_KINDS as readonly string[]).includes(kind);
}

/** Slots onde cada tipo pode ser equipado (espelha slotsForKind do backend). */
export function equipSlotsForKind(kind: ItemKind): EquipmentSlot[] {
  if (isTwoHandedKind(kind)) return ['weapon'];
  if (isWeaponKind(kind)) return ['weapon', 'offhand'];
  switch (kind) {
    case 'armor':
      return ['chest'];
    case 'helmet':
      return ['head'];
    case 'gloves':
      return ['hands'];
    case 'ring':
      return ['ring', 'ring2'];
    case 'necklace':
      return ['trinket'];
    default:
      return [];
  }
}

/**
 * Nome de exibicao derivado client-side. Espelha EXATAMENTE o weaponName /
 * gearName do backend (sim/combat.go e sim/gear.go) para o WebSocket nao
 * precisar mandar a string.
 * Ex.: "Espada Dourada +6 [Fogo] (Comum) - 15-25 dano + 2-4 magico".
 */
export function itemDisplayName(item: NameableItem): string {
  const base = ITEM_BASE_NAMES[item.kind];
  const rarity = RARITY_LABELS[item.rarity ?? 'comum'];
  const up = item.upgradeLevel && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
  if (isWeaponKind(item.kind)) {
    const el = item.element === 'fire' ? ' [Fogo]' : '';
    const min = item.damageMin ?? 0;
    const max = item.damageMax ?? 0;
    const magic = item.element === 'fire' && (item.magicDamageMax ?? 0) > 0
      ? ` + ${item.magicDamageMin ?? 0}-${item.magicDamageMax ?? 0} magico`
      : '';
    return `${base}${up}${el} (${rarity}) - ${min}-${max} dano${magic}`;
  }
  if (item.kind === 'armor' || item.kind === 'helmet' || item.kind === 'gloves') {
    return `${base}${up} (${rarity}) - ${item.armor ?? 0} armadura`;
  }
  if (item.kind === 'ring' || item.kind === 'necklace') {
    let parts = '';
    if ((item.bonusCrit ?? 0) > 0) parts += ` +${Math.round((item.bonusCrit ?? 0) * 100)}% critico`;
    if ((item.bonusHp ?? 0) > 0) parts += `${parts ? ',' : ''} +${item.bonusHp} vida`;
    if ((item.bonusMana ?? 0) > 0) parts += `${parts ? ',' : ''} +${item.bonusMana} mana`;
    return `${base}${up} (${rarity}) -${parts}`;
  }
  return base;
}
