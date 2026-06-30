import type { GemKind, ItemKind, ItemRarity, WeaponElement, WeaponGlowGem } from './types';

export const ITEM_ICON_URLS: Record<ItemKind, string> = {
  coin: '/models/items/Icons/runtime/Coin.png',
  mana_potion: '/models/items/Icons/Potion1_Filled_Blue.png',
  potion: '/models/items/Icons/runtime/Potion1_Filled_Red.png',
  sword: '/models/items/Icons/runtime/Sword_Golden.png',
  jewel_bless: '/models/items/Icons/runtime/Crystal5.png',
  jewel_soul: '/models/items/Icons/runtime/Crystal1.png',
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
};

/** Modelo 3D do loot no chao por tipo (espelha lootModels do backend). */
export const LOOT_MODEL_URLS: Record<ItemKind, string> = {
  coin: '/items/Coin.glb',
  mana_potion: '/items/Potion2_Filled.glb',
  potion: '/items/Potion1_Filled.glb',
  sword: '/items/Sword_Golden.glb',
  jewel_bless: '/items/Crystal5.glb',
  jewel_soul: '/items/Crystal1.glb',
};

export function itemIconFor(kind: ItemKind): string {
  return ITEM_ICON_URLS[kind];
}

export function lootModelUrlFor(kind: ItemKind): string {
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
}

/**
 * Nome de exibicao derivado client-side. Espelha EXATAMENTE o weaponName do
 * backend (sim/combat.go) para o WebSocket nao precisar mandar a string.
 * Ex.: "Espada Dourada +6 [Fogo] (Comum) - 15-25 dano + 2-4 magico".
 */
export function itemDisplayName(item: NameableItem): string {
  const base = ITEM_BASE_NAMES[item.kind];
  if (item.kind !== 'sword') return base;
  const up = item.upgradeLevel && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
  const el = item.element === 'fire' ? ' [Fogo]' : '';
  const rarity = RARITY_LABELS[item.rarity ?? 'comum'];
  const min = item.damageMin ?? 0;
  const max = item.damageMax ?? 0;
  const magic = item.element === 'fire' && (item.magicDamageMax ?? 0) > 0
    ? ` + ${item.magicDamageMin ?? 0}-${item.magicDamageMax ?? 0} magico`
    : '';
  return `${base}${up}${el} (${rarity}) - ${min}-${max} dano${magic}`;
}
