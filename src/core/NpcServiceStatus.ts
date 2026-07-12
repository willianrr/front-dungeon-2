import type { NpcKind, QuestState } from '../shared/types';

export interface NpcServiceStatusInput {
  kind: NpcKind;
  quest?: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed' | 'progress' | 'goal'>;
  vendorAvailableItems?: number;
  vendorAffordableItems?: number;
  healer?: {
    needsService: boolean;
    canPay: boolean;
    cost: number;
  };
  blacksmith?: {
    label: string;
    disabled: boolean;
    forgeableBatches?: number;
  };
  trainer?: {
    unspentPoints: number;
  };
  travel?: {
    destination: string;
  };
  jeweler?: {
    blessCount: number;
    requiredBless: number;
  };
  banker?: {
    stashItems: number;
  };
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function npcServiceStatusLabel(input: NpcServiceStatusInput): string | undefined {
  if (input.kind === 'quest') {
    const quest = input.quest;
    if (!quest) return undefined;
    if (quest.rewardClaimed) return 'Concluida';
    if (!quest.accepted) return 'Nova missao';
    if (quest.completed) return 'Recompensa pronta';
    return `${quest.progress}/${quest.goal}`;
  }

  if (input.kind === 'vendor') {
    const available = input.vendorAvailableItems;
    if (available === undefined) return undefined;
    if (available <= 0) return 'Esgotado';
    const affordable = Math.max(0, input.vendorAffordableItems ?? 0);
    if (affordable > 0) return `${affordable}/${available} compraveis`;
    return `${available} ${plural(available, 'item', 'itens')}`;
  }

  if (input.kind === 'healer') {
    const healer = input.healer;
    if (!healer) return undefined;
    if (!healer.needsService) return 'Vida cheia';
    if (!healer.canPay) return 'Sem moedas';
    return `${healer.cost} moedas`;
  }

  if (input.kind === 'blacksmith') {
    const blacksmith = input.blacksmith;
    if (!blacksmith) return undefined;
    const batches = blacksmith.forgeableBatches ?? 0;
    if (batches > 0) return batches === 1 ? 'Receita pronta' : `${batches} receitas prontas`;
    return blacksmith.label;
  }

  if (input.kind === 'trainer') {
    const points = input.trainer?.unspentPoints ?? 0;
    return points > 0 ? `${points} ${plural(points, 'ponto', 'pontos')}` : 'Sem pontos';
  }

  if (input.kind === 'travel') {
    return input.travel?.destination ? `Para ${input.travel.destination}` : undefined;
  }

  if (input.kind === 'jeweler') {
    const jeweler = input.jeweler;
    if (!jeweler) return undefined;
    if (jeweler.blessCount >= jeweler.requiredBless) return 'Transmutar pronto';
    return `Bless ${jeweler.blessCount}/${jeweler.requiredBless}`;
  }

  if (input.kind === 'banker') {
    const stashItems = input.banker?.stashItems ?? 0;
    return stashItems > 0
      ? `${stashItems} ${plural(stashItems, 'item guardado', 'itens guardados')}`
      : 'Banco vazio';
  }

  if (input.kind === 'guard') {
    return 'Ronda segura';
  }

  return undefined;
}
