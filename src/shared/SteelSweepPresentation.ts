import type {
  EquipmentState,
  InventoryItem,
  ItemKind,
  SkillState,
  SteelSweepVariant,
} from './types';

export interface SteelSweepPresentation {
  /** `null` preserva a apresentacao generica com servidores antigos. */
  variant: SteelSweepVariant | null;
  badge: string;
  weaponLabel: string;
  description: string;
  ringColor: string;
  slashColor: string;
  statusColor: string;
  ringCount: number;
  slashCount: number;
  slashWidth: number;
  slashLengthScale: number;
  shake: number;
}

export const STEEL_SWEEP_PRESENTATIONS: Readonly<Record<SteelSweepVariant, SteelSweepPresentation>> = {
  sword: {
    variant: 'sword',
    badge: 'CRIT',
    weaponLabel: 'Espada',
    description: 'Espadas concentram a varredura em golpes críticos.',
    ringColor: '#ffd874',
    slashColor: '#fff3c4',
    statusColor: '#ffe8a8',
    ringCount: 1,
    slashCount: 6,
    slashWidth: 0.06,
    slashLengthScale: 0.44,
    shake: 0.12,
  },
  axe: {
    variant: 'axe',
    badge: 'SANG',
    weaponLabel: 'Machado',
    description: 'Machados aplicam Sangramento aos inimigos atingidos.',
    ringColor: '#d95a4e',
    slashColor: '#ff9a72',
    statusColor: '#ff6b68',
    ringCount: 1,
    slashCount: 4,
    slashWidth: 0.12,
    slashLengthScale: 0.46,
    shake: 0.13,
  },
  hammer: {
    variant: 'hammer',
    badge: 'ABALO',
    weaponLabel: 'Martelo',
    description: 'Martelos causam Abalo e atrasam os ataques inimigos atingidos.',
    ringColor: '#9bd7e8',
    slashColor: '#eefaff',
    statusColor: '#c8f1ff',
    ringCount: 2,
    slashCount: 8,
    slashWidth: 0.14,
    slashLengthScale: 0.3,
    shake: 0.18,
  },
};

export const GENERIC_STEEL_SWEEP_PRESENTATION: SteelSweepPresentation = {
  variant: null,
  badge: 'ARMA',
  weaponLabel: 'Arma física',
  description: 'A arma equipada define o efeito adicional da varredura.',
  ringColor: '#ffc66d',
  slashColor: '#fff0ba',
  statusColor: '#ffe8a8',
  ringCount: 1,
  slashCount: 6,
  slashWidth: 0.07,
  slashLengthScale: 0.42,
  shake: 0.12,
};

const VARIANT_BY_WEAPON_KIND: Readonly<Partial<Record<ItemKind, SteelSweepVariant>>> = {
  sword: 'sword',
  great_sword: 'sword',
  axe: 'axe',
  great_axe: 'axe',
  war_hammer: 'hammer',
};

/** O WebSocket nao possui validacao de schema em runtime; valores desconhecidos caem no generico. */
export function normalizeSteelSweepVariant(value: unknown): SteelSweepVariant | null {
  return value === 'sword' || value === 'axe' || value === 'hammer' ? value : null;
}

export function steelSweepVariantForWeaponKind(kind: unknown): SteelSweepVariant | null {
  if (typeof kind !== 'string') return null;
  return VARIANT_BY_WEAPON_KIND[kind as ItemKind] ?? null;
}

type SteelSweepEquipment = Partial<Pick<EquipmentState, 'weapon' | 'offhand'>>;
type SteelSweepInventoryItem = Pick<InventoryItem, 'id' | 'kind'>;

/**
 * Fallback somente de apresentacao local. A mao principal vence em dual wield,
 * espelhando a regra autoritativa; a secundaria cobre inventarios legados.
 */
export function steelSweepVariantForEquipment(
  equipment: SteelSweepEquipment | null | undefined,
  inventory: readonly SteelSweepInventoryItem[] | null | undefined,
): SteelSweepVariant | null {
  if (!equipment || !inventory) return null;
  const byId = new Map(inventory.map((item) => [item.id, item]));
  for (const slot of ['weapon', 'offhand'] as const) {
    const itemId = equipment[slot];
    if (!itemId) continue;
    const variant = steelSweepVariantForWeaponKind(byId.get(itemId)?.kind);
    if (variant) return variant;
  }
  return null;
}

/** Estado do servidor vence; equipamento local cobre snapshots antigos ou ainda incompletos. */
export function resolveSteelSweepVariant(
  authoritativeVariant: unknown,
  equipment: SteelSweepEquipment | null | undefined,
  inventory: readonly SteelSweepInventoryItem[] | null | undefined,
): SteelSweepVariant | null {
  return normalizeSteelSweepVariant(authoritativeVariant)
    ?? steelSweepVariantForEquipment(equipment, inventory);
}

export function steelSweepPresentationForVariant(value: unknown): SteelSweepPresentation {
  const variant = normalizeSteelSweepVariant(value);
  return variant ? STEEL_SWEEP_PRESENTATIONS[variant] : GENERIC_STEEL_SWEEP_PRESENTATION;
}

function secondsLabel(value: number): string {
  const rounded = Math.round(Math.max(0, value) * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace('.', ',');
}

/** Texto compartilhado pelo `title` e pelo nome acessivel do slot. */
export function steelSweepTooltip(
  skill: Pick<SkillState, 'label' | 'description' | 'cooldown'> | null | undefined,
  variant: SteelSweepVariant | null,
  hasPhysicalWeapon: boolean,
): string {
  const presentation = steelSweepPresentationForVariant(variant);
  const label = skill?.label?.trim() || 'Varredura de Aço';
  const authoritativeDescription = skill?.description?.trim();
  const description = authoritativeDescription || presentation.description;
  const rawCooldown = skill?.cooldown;
  const cooldown = typeof rawCooldown === 'number' && Number.isFinite(rawCooldown) ? rawCooldown : 5.5;
  // A descrição autoritativa já explica estados inválidos (por exemplo, o
  // payload desarmado). Só sintetizamos o requisito no fallback legado.
  const requirement = hasPhysicalWeapon || authoritativeDescription ? '' : ' Requer arma física equipada.';
  return `${label} — área física (3,4 m). ${description} Recarga ${secondsLabel(cooldown)} s.${requirement}`;
}
