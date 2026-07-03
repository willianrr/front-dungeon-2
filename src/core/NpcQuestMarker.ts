import type { QuestState } from '../shared/types';

export type NpcQuestMarkerTone = 'quest-new' | 'quest-progress' | 'quest-ready' | 'quest-done';

export interface NpcQuestMarkerModel {
  marker: string;
  label: string;
  tone: NpcQuestMarkerTone;
  actionable: boolean;
}

export function npcQuestMarkerModel(
  quest: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'> | null | undefined,
): NpcQuestMarkerModel {
  if (!quest) {
    return { marker: '!', label: 'Missao', tone: 'quest-new', actionable: true };
  }
  if (quest.rewardClaimed) {
    return { marker: 'OK', label: 'Concluida', tone: 'quest-done', actionable: false };
  }
  if (!quest.accepted) {
    return { marker: '!', label: 'Missao disponivel', tone: 'quest-new', actionable: true };
  }
  if (quest.completed) {
    return { marker: '?', label: 'Recompensa pronta', tone: 'quest-ready', actionable: true };
  }
  return { marker: '...', label: 'Missao em andamento', tone: 'quest-progress', actionable: false };
}
