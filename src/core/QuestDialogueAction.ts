import type { QuestState } from '../shared/types';

export type QuestDialogueAction = 'accept' | 'claim' | 'track' | 'close';

export interface QuestDialogueActionDecision {
  action: QuestDialogueAction;
  targetNpcId: string | null;
}

export function questDialogueActionDecision(
  quest: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>,
  navigationTargetNpcId: string | null,
): QuestDialogueActionDecision {
  if (!quest.accepted) return { action: 'accept', targetNpcId: null };
  if (quest.completed && !quest.rewardClaimed) return { action: 'claim', targetNpcId: null };
  if (quest.rewardClaimed) return { action: 'close', targetNpcId: null };
  if (navigationTargetNpcId) return { action: 'track', targetNpcId: navigationTargetNpcId };
  return { action: 'close', targetNpcId: null };
}

export function questDialogueActionLabel(
  quest: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>,
  navigationTargetNpcId: string | null,
  fallback: string,
): string {
  return questDialogueActionDecision(quest, navigationTargetNpcId).action === 'track'
    ? 'Ir para objetivo'
    : fallback;
}
