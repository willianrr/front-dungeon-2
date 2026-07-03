import type { NpcKind, WorldZone } from '../shared/types';

export interface NpcGuideTargetNpc {
  id: string;
  kind: NpcKind;
  zone: WorldZone;
}

export interface NpcGuideTargetInput {
  sourceKind: NpcKind;
  zone: WorldZone;
  npcs: readonly NpcGuideTargetNpc[];
}

export function npcGuideTargetNpcId(input: NpcGuideTargetInput): string | null {
  if (input.sourceKind !== 'guard') return null;
  return input.npcs.find((npc) => npc.zone === input.zone && npc.kind === 'travel')?.id ?? null;
}
