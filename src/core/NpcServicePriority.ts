import type { NpcKind, QuestState } from '../shared/types';

export interface NpcServicePriorityInput {
  kind: NpcKind;
  quest?: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>;
  questRouteTarget?: boolean;
  vendorAvailableItems?: number;
  vendorAffordableItems?: number;
  healer?: {
    needsService: boolean;
    canPay: boolean;
  };
  blacksmith?: {
    disabled: boolean;
  };
  trainer?: {
    unspentPoints: number;
  };
  jeweler?: {
    blessCount: number;
    requiredBless: number;
  };
  banker?: {
    stashItems: number;
  };
  guideTargetAvailable?: boolean;
}

export function npcServicePriorityScore(input: NpcServicePriorityInput): number {
  if (input.questRouteTarget) return 100;

  if (input.kind === 'quest') {
    const quest = input.quest;
    if (!quest || !quest.accepted) return 86;
    if (quest.completed && !quest.rewardClaimed) return 92;
    return quest.rewardClaimed ? 10 : 44;
  }

  if (input.kind === 'healer') {
    if (!input.healer?.needsService) return 12;
    return input.healer.canPay ? 76 : 52;
  }

  if (input.kind === 'trainer') {
    const points = input.trainer?.unspentPoints ?? 0;
    return points > 0 ? 70 : 16;
  }

  if (input.kind === 'blacksmith') {
    return input.blacksmith && !input.blacksmith.disabled ? 66 : 18;
  }

  if (input.kind === 'jeweler') {
    const jeweler = input.jeweler;
    return jeweler && jeweler.blessCount >= jeweler.requiredBless ? 62 : 18;
  }

  if (input.kind === 'vendor') {
    const affordable = input.vendorAffordableItems ?? 0;
    const available = input.vendorAvailableItems ?? 0;
    if (affordable > 0) return 56;
    if (available > 0) return 32;
    return 8;
  }

  if (input.kind === 'travel') return 38;
  if (input.kind === 'banker') return (input.banker?.stashItems ?? 0) > 0 ? 30 : 14;
  if (input.kind === 'guard') return input.guideTargetAvailable ? 28 : 10;

  return 0;
}
