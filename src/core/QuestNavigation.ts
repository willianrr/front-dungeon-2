import type { NpcKind, QuestState, WorldZone } from '../shared/types';

export interface QuestNavigationNpc {
  id: string;
  kind: NpcKind;
  zone: WorldZone;
}

export interface QuestNavigationTargetInput {
  quest: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed' | 'progress' | 'goal'>;
  zone: WorldZone;
  npcs: readonly QuestNavigationNpc[];
}

export function questNavigationTargetNpcId(input: QuestNavigationTargetInput): string | null {
  const inZone = (kind: NpcKind) => input.npcs.find((npc) => npc.zone === input.zone && npc.kind === kind)?.id ?? null;
  if (input.quest.rewardClaimed) return null;
  if (!input.quest.accepted) return inZone('quest');
  if (input.quest.completed) return inZone('quest') ?? inZone('travel');
  if (input.zone === 'overworld' && input.quest.goal > 0 && input.quest.progress >= input.quest.goal) {
    return inZone('travel');
  }
  return null;
}

export function questNavigationHoverNpcId(targetNpcId: string | null, hovered: boolean): string | null {
  return hovered ? targetNpcId : null;
}
