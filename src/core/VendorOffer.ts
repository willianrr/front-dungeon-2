import type { ItemRarity } from '../shared/types';

export interface VendorOfferItemLike {
  id: string;
  price: number;
  stock?: number;
  rarity?: ItemRarity;
}

export type VendorOfferTone = 'buy-now' | 'save-up' | 'sold-out' | 'neutral';

export interface VendorOfferModel {
  id: string;
  soldOut: boolean;
  affordable: boolean;
  missingCoins: number;
  metaLabel: string;
  statusLabel: string;
  badgeLabel?: string;
  tone: VendorOfferTone;
}

export interface VendorRecommendedItemInput<T extends VendorOfferItemLike> {
  coins: number;
  items: readonly T[];
}

export interface VendorOfferModelInput<T extends VendorOfferItemLike> extends VendorRecommendedItemInput<T> {
  item: T;
  recommendedItemId?: string | null;
}

const RARITY_SCORE: Record<ItemRarity, number> = {
  comum: 0,
  incomum: 1,
  raro: 2,
  epico: 3,
  lendario: 4,
};

function isAvailable(item: VendorOfferItemLike): boolean {
  return item.stock !== 0;
}

function offerScore(item: VendorOfferItemLike): number {
  return (RARITY_SCORE[item.rarity ?? 'comum'] ?? 0) * 1000 + item.price;
}

function compareStable(a: VendorOfferItemLike, b: VendorOfferItemLike): number {
  return a.id.localeCompare(b.id);
}

export function vendorRecommendedItemId<T extends VendorOfferItemLike>(input: VendorRecommendedItemInput<T>): string | null {
  const available = input.items.filter(isAvailable);
  if (available.length === 0) return null;

  const affordable = available.filter((item) => input.coins >= item.price);
  if (affordable.length > 0) {
    return [...affordable].sort((a, b) => {
      const score = offerScore(b) - offerScore(a);
      return score !== 0 ? score : compareStable(a, b);
    })[0]?.id ?? null;
  }

  return [...available].sort((a, b) => {
    const missing = (a.price - input.coins) - (b.price - input.coins);
    if (missing !== 0) return missing;
    const price = a.price - b.price;
    return price !== 0 ? price : compareStable(a, b);
  })[0]?.id ?? null;
}

function stockSuffix(stock: number | undefined): string {
  return stock === undefined ? '' : ` - ${stock}x`;
}

export function vendorOfferModel<T extends VendorOfferItemLike>(input: VendorOfferModelInput<T>): VendorOfferModel {
  const recommendedItemId = input.recommendedItemId ?? vendorRecommendedItemId(input);
  const soldOut = input.item.stock === 0;
  const missingCoins = Math.max(0, input.item.price - input.coins);
  const affordable = !soldOut && missingCoins === 0;
  const recommended = recommendedItemId === input.item.id;
  const metaLabel = `${input.item.price} moedas${stockSuffix(input.item.stock)}`;

  if (soldOut) {
    return {
      id: input.item.id,
      soldOut,
      affordable: false,
      missingCoins,
      metaLabel,
      statusLabel: 'Esgotado',
      tone: 'sold-out',
    };
  }

  if (affordable) {
    return {
      id: input.item.id,
      soldOut,
      affordable,
      missingCoins,
      metaLabel,
      statusLabel: recommended ? 'Melhor compra agora' : 'Disponivel agora',
      badgeLabel: recommended ? 'Sugerido' : undefined,
      tone: recommended ? 'buy-now' : 'neutral',
    };
  }

  return {
    id: input.item.id,
    soldOut,
    affordable,
    missingCoins,
    metaLabel,
    statusLabel: `Faltam ${missingCoins} moedas`,
    badgeLabel: recommended ? 'Proxima' : undefined,
    tone: recommended ? 'save-up' : 'neutral',
  };
}
