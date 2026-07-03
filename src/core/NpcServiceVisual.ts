import type { NpcKind } from '../shared/types';

const NPC_SERVICE_ACCENTS: Record<NpcKind, { css: string; hex: number }> = {
  vendor: { css: '#ffd874', hex: 0xffd874 },
  quest: { css: '#8dffb2', hex: 0x8dffb2 },
  healer: { css: '#76e2ff', hex: 0x76e2ff },
  blacksmith: { css: '#ff9d5c', hex: 0xff9d5c },
  trainer: { css: '#b8f27a', hex: 0xb8f27a },
  travel: { css: '#9fddff', hex: 0x9fddff },
  jeweler: { css: '#ff9fd8', hex: 0xff9fd8 },
  banker: { css: '#d8c6ff', hex: 0xd8c6ff },
  guard: { css: '#f0c36a', hex: 0xf0c36a },
};

export function npcServiceAccentCss(kind: NpcKind): string {
  return NPC_SERVICE_ACCENTS[kind].css;
}

export function npcServiceAccentHex(kind: NpcKind): number {
  return NPC_SERVICE_ACCENTS[kind].hex;
}
