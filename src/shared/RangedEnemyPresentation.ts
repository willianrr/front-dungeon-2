import type { EnemyVariant } from './types';

export interface EnemyPresentation {
  variant: EnemyVariant;
  targetName: string;
  targetSubtitle: string;
  minimapColor: string;
  minimapRingColor?: string;
  minimapSize: number;
  ranged: boolean;
}

export const SHARDCASTER_PALETTE = {
  crystal: '#b65cff',
  crystalCore: '#f0dcff',
  orb: '#d99cff',
  warning: '#c66dff',
  impact: '#8e3bd1',
  trail: '#7936a8',
  minimap: '#bd68f2',
} as const;

/** Verde-cinza e ambar mantem o suporte legivel sem herdar o roxo do Shardcaster. */
export const ASH_CORRUPTOR_PALETTE = {
  ash: '#8b9b78',
  veil: '#91b06b',
  veilCore: '#d0dda8',
  amber: '#e0a94f',
  amberCore: '#ffd986',
  tether: '#aabd78',
  minimap: '#879b72',
  minimapRing: '#e3ad52',
} as const;

/** Ferrugem e cinza de ferro separam o quebra-linhas dos inimigos magicos. */
export const RUIN_BRUTE_PALETTE = {
  rust: '#b84d36',
  rustCore: '#ed7b52',
  iron: '#70777b',
  ironCore: '#b7bec0',
  dust: '#a47a61',
  warning: '#d66243',
  minimap: '#b64b35',
  minimapRing: '#727a7e',
} as const;

const UTRAEAN_SENTINEL_MINIMAP = '#67cfe8';
const UTRAEAN_SENTINEL_MINIMAP_RING = '#e9cf72';

export const ENEMY_PRESENTATIONS: Readonly<Record<EnemyVariant, EnemyPresentation>> = {
  zombie: {
    variant: 'zombie',
    targetName: 'Zumbi',
    targetSubtitle: '',
    minimapColor: '#dc6256',
    minimapSize: 3.4,
    ranged: false,
  },
  zombieBoss: {
    variant: 'zombieBoss',
    targetName: 'Boss Zumbi',
    targetSubtitle: '',
    minimapColor: '#ff6a3d',
    minimapSize: 5,
    ranged: false,
  },
  zombieShardcaster: {
    variant: 'zombieShardcaster',
    targetName: 'Conjurador de Estilhaços',
    targetSubtitle: 'Atirador arcano',
    minimapColor: SHARDCASTER_PALETTE.minimap,
    minimapSize: 4.25,
    ranged: true,
  },
  zombieAshCorruptor: {
    variant: 'zombieAshCorruptor',
    targetName: 'Corruptor de Cinzas',
    targetSubtitle: 'Suporte corpo a corpo',
    minimapColor: ASH_CORRUPTOR_PALETTE.minimap,
    minimapRingColor: ASH_CORRUPTOR_PALETTE.minimapRing,
    minimapSize: 4.5,
    ranged: false,
  },
  zombieRuinBrute: {
    variant: 'zombieRuinBrute',
    targetName: 'Bruto da Ruína',
    targetSubtitle: 'Quebra-linhas',
    minimapColor: RUIN_BRUTE_PALETTE.minimap,
    minimapRingColor: RUIN_BRUTE_PALETTE.minimapRing,
    minimapSize: 5.4,
    ranged: false,
  },
  utraeanSentinel: {
    variant: 'utraeanSentinel',
    targetName: 'Sentinela Utraeano',
    targetSubtitle: 'Guardião rúnico · interrompa a lança',
    minimapColor: UTRAEAN_SENTINEL_MINIMAP,
    minimapRingColor: UTRAEAN_SENTINEL_MINIMAP_RING,
    minimapSize: 5.2,
    ranged: false,
  },
};

export function normalizeEnemyVariant(value: unknown): EnemyVariant {
  if (
    value === 'zombieBoss'
    || value === 'zombieShardcaster'
    || value === 'zombieAshCorruptor'
    || value === 'zombieRuinBrute'
    || value === 'utraeanSentinel'
  ) return value;
  return 'zombie';
}

export function enemyPresentationForVariant(value: unknown): EnemyPresentation {
  return ENEMY_PRESENTATIONS[normalizeEnemyVariant(value)];
}

export function isShardcasterVariant(value: unknown): boolean {
  return normalizeEnemyVariant(value) === 'zombieShardcaster';
}

export function isAshCorruptorVariant(value: unknown): boolean {
  return normalizeEnemyVariant(value) === 'zombieAshCorruptor';
}

export function isRuinBruteVariant(value: unknown): boolean {
  return normalizeEnemyVariant(value) === 'zombieRuinBrute';
}

export function isUtraeanSentinelVariant(value: unknown): boolean {
  return normalizeEnemyVariant(value) === 'utraeanSentinel';
}
