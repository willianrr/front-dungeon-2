import type { NpcKind } from '../shared/types';

export interface NpcServiceIdentity {
  glyph: string;
  roleLabel: string;
}

const NPC_SERVICE_IDENTITIES: Record<NpcKind, NpcServiceIdentity> = {
  vendor: { glyph: '$', roleLabel: 'Vendedor' },
  quest: { glyph: '!', roleLabel: 'Missao' },
  healer: { glyph: '+', roleLabel: 'Curandeira' },
  blacksmith: { glyph: '#', roleLabel: 'Ferreiro' },
  trainer: { glyph: 'T', roleLabel: 'Treinador' },
  travel: { glyph: '>', roleLabel: 'Portal' },
  jeweler: { glyph: 'J', roleLabel: 'Lapidaria' },
  banker: { glyph: 'B', roleLabel: 'Banco' },
  guard: { glyph: 'G', roleLabel: 'Sentinela' },
};

export function npcServiceIdentity(kind: NpcKind): NpcServiceIdentity {
  return NPC_SERVICE_IDENTITIES[kind];
}

export function npcServiceGlyph(kind: NpcKind): string {
  return npcServiceIdentity(kind).glyph;
}

export function npcServiceRoleLabel(kind: NpcKind): string {
  return npcServiceIdentity(kind).roleLabel;
}
