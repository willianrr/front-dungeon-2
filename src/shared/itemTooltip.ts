import { ITEM_BASE_NAMES, RARITY_LABELS, isTwoHandedKind, isWeaponKind } from './itemMeta';
import { equipmentSetItemPresentation } from './EquipmentSets';
import type { EquipmentSlot, InventoryItem, ItemAffix, ItemKind } from './types';

export type TooltipItem = Pick<InventoryItem, 'kind'> & Partial<InventoryItem>;

export interface TooltipStatLine {
  key: 'physical' | 'fire' | 'armor' | 'health' | 'mana' | 'critical';
  label: string;
  value: string;
  numericValue: number;
}

export interface TooltipComparisonLine {
  key: TooltipStatLine['key'];
  label: string;
  value: string;
  tone: 'better' | 'worse' | 'same';
}

const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  coin: 'Moeda',
  mana_potion: 'Consumível',
  potion: 'Consumível',
  sword: 'Espada de uma mão',
  axe: 'Machado de uma mão',
  great_sword: 'Espada de duas mãos',
  great_axe: 'Machado de duas mãos',
  war_hammer: 'Martelo de duas mãos',
  armor: 'Armadura de peito',
  helmet: 'Elmo',
  gloves: 'Manoplas',
  ring: 'Anel',
  necklace: 'Colar',
  jewel_bless: 'Gema de melhoria',
  jewel_soul: 'Gema de melhoria',
  copper_ore: 'Minério de fundição',
  iron_ore: 'Minério de fundição',
  mithril_ore: 'Minério raro de fundição',
  copper_bar: 'Barra metálica',
  iron_bar: 'Barra metálica',
  mithril_bar: 'Barra metálica rara',
  copper_pickaxe: 'Ferramenta de Mineração',
  iron_pickaxe: 'Ferramenta de Mineração',
  mithril_pickaxe: 'Ferramenta de Mineração',
};

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: 'Cabeça',
  chest: 'Peito',
  hands: 'Mãos',
  legs: 'Pernas',
  feet: 'Botas',
  weapon: 'Arma principal',
  offhand: 'Mão secundária',
  trinket: 'Talismã',
  ring: 'Anel 1',
  ring2: 'Anel 2',
};

function numberLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function rangeLabel(min: number | undefined, max: number | undefined): string {
  return `${min ?? 0}–${max ?? 0}`;
}

export function tooltipItemTitle(item: TooltipItem): string {
  const upgrade = item.upgradeLevel && item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
  return `${equipmentSetItemPresentation(item)?.piece.label ?? ITEM_BASE_NAMES[item.kind]}${upgrade}`;
}

export function tooltipItemType(item: TooltipItem): string {
  const rarity = item.rarity ? RARITY_LABELS[item.rarity] : '';
  const kind = ITEM_KIND_LABELS[item.kind];
  return rarity ? `${rarity} · ${kind}` : kind;
}

export function tooltipItemMeta(item: TooltipItem): string[] {
  const meta: string[] = [];
  if ((item.itemLevel ?? 0) > 0) meta.push(`Nível do item ${item.itemLevel}`);
  if ((item.count ?? 0) > 1) meta.push(`Quantidade ${item.count}`);
  if (item.equipped) meta.push('Equipado');
  return meta;
}

export function tooltipItemDescription(item: TooltipItem): string | null {
  if (item.kind === 'potion') return 'Restaura 48 de vida. Não pode ser usado com a vida cheia.';
  if (item.kind === 'mana_potion') return 'Restaura 45 de mana. Não pode ser usado com a mana cheia.';
  if (item.kind === 'jewel_bless') return 'Borin usa esta joia para melhorar uma arma do +0 ao +6.';
  if (item.kind === 'jewel_soul') return 'Borin usa esta joia para melhorar uma arma do +6 ao +15.';
  if (item.kind === 'coin') return 'Moeda usada pelos mercadores de Aranna.';
  if (item.kind === 'copper_ore') return 'Extraído de veios de cobre. Borin funde 3 unidades em uma barra.';
  if (item.kind === 'iron_ore') return 'Extraído de veios de ferro. Borin funde 3 unidades em uma barra.';
  if (item.kind === 'mithril_ore') return 'Minério arcano raro. Borin funde 3 unidades em uma barra de mithril.';
  if (item.kind === 'copper_bar') return 'Metal refinado na forja de Borin.';
  if (item.kind === 'iron_bar') return 'Ferro refinado usado nas receitas incomuns de Borin.';
  if (item.kind === 'mithril_bar') return 'Liga arcana usada nas receitas raras de Borin.';
  if (isTwoHandedKind(item.kind)) return 'Ocupa as duas mãos quando equipada.';
  return null;
}

export function tooltipStatLines(item: TooltipItem): TooltipStatLine[] {
  const lines: TooltipStatLine[] = [];
  const physicalMin = item.damageMin ?? 0;
  const physicalMax = item.damageMax ?? 0;
  if (isWeaponKind(item.kind) || physicalMax > 0) {
    lines.push({
      key: 'physical',
      label: 'Dano físico',
      value: rangeLabel(item.damageMin, item.damageMax),
      numericValue: (physicalMin + physicalMax) / 2,
    });
  }
  const fireMin = item.magicDamageMin ?? 0;
  const fireMax = item.magicDamageMax ?? 0;
  if (fireMax > 0) {
    lines.push({
      key: 'fire',
      label: 'Dano de fogo',
      value: rangeLabel(item.magicDamageMin, item.magicDamageMax),
      numericValue: (fireMin + fireMax) / 2,
    });
  }
  if ((item.armor ?? 0) > 0) {
    lines.push({ key: 'armor', label: 'Armadura', value: String(item.armor), numericValue: item.armor ?? 0 });
  }
  if ((item.bonusHp ?? 0) > 0) {
    lines.push({ key: 'health', label: 'Vida máxima', value: `+${item.bonusHp}`, numericValue: item.bonusHp ?? 0 });
  }
  if ((item.bonusMana ?? 0) > 0) {
    lines.push({ key: 'mana', label: 'Mana máxima', value: `+${item.bonusMana}`, numericValue: item.bonusMana ?? 0 });
  }
  if ((item.bonusCrit ?? 0) > 0) {
    const percent = (item.bonusCrit ?? 0) * 100;
    lines.push({ key: 'critical', label: 'Chance de crítico', value: `+${numberLabel(percent)}%`, numericValue: percent });
  }
  return lines;
}

export function tooltipAffixValue(affix: ItemAffix): string {
  switch (affix.stat) {
    case 'physical_damage_flat':
      return `+${numberLabel(affix.value ?? 0)} de dano físico`;
    case 'fire_damage_flat':
      return `+${numberLabel(affix.value ?? 0)} de dano de fogo`;
    case 'armor_flat':
      return `+${affix.value ?? 0} de armadura`;
    case 'max_health_flat':
      return `+${affix.value ?? 0} de vida máxima`;
    case 'max_mana_flat':
      return `+${affix.value ?? 0} de mana máxima`;
    case 'critical_chance':
      return `+${numberLabel(affix.value ?? 0)}% de chance de crítico`;
  }
}

export function tooltipComparisonLines(item: TooltipItem, equipped: TooltipItem): TooltipComparisonLine[] {
  const current = new Map(tooltipStatLines(item).map((line) => [line.key, line]));
  const previous = new Map(tooltipStatLines(equipped).map((line) => [line.key, line]));
  const keys: TooltipStatLine['key'][] = ['physical', 'fire', 'armor', 'health', 'mana', 'critical'];
  const labels: Record<TooltipStatLine['key'], string> = {
    physical: 'Dano físico médio',
    fire: 'Dano de fogo médio',
    armor: 'Armadura',
    health: 'Vida máxima',
    mana: 'Mana máxima',
    critical: 'Chance de crítico',
  };
  const result: TooltipComparisonLine[] = [];
  for (const key of keys) {
    if (!current.has(key) && !previous.has(key)) continue;
    const delta = (current.get(key)?.numericValue ?? 0) - (previous.get(key)?.numericValue ?? 0);
    const rounded = Math.round(delta * 10) / 10;
    const suffix = key === 'critical' ? ' p.p.' : '';
    result.push({
      key,
      label: labels[key],
      value: `${rounded > 0 ? '+' : ''}${numberLabel(rounded)}${suffix}`,
      tone: rounded > 0 ? 'better' : rounded < 0 ? 'worse' : 'same',
    });
  }
  return result;
}

export function equipmentSlotLabel(slot: EquipmentSlot): string {
  return EQUIPMENT_SLOT_LABELS[slot];
}

export function tooltipInteractionHint(item: TooltipItem): string | null {
  if (item.equipped) return 'Clique ou botão direito para desequipar';
  if (item.equipSlot) return 'Clique ou botão direito para equipar';
  if (item.usable) return 'Clique ou botão direito para usar';
  return null;
}
