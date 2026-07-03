import type { NpcKind } from '../shared/types';

export interface QuestTrackerRouteNpc {
  kind: NpcKind;
  name: string;
  title: string;
}

export function questTrackerRouteLabel(npc: QuestTrackerRouteNpc | null | undefined): string {
  if (!npc) return '';
  const verb = npc.kind === 'quest'
    ? 'Fale com'
    : npc.kind === 'travel'
      ? 'Siga ate'
      : 'Procure';
  return `${verb} ${npc.name} - ${npc.title}`;
}
