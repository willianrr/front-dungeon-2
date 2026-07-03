import type { NpcKind, QuestState, WorldZone } from '../shared/types';

export interface NpcActionLabelInput {
  kind: NpcKind;
  zone: WorldZone;
  quest?: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>;
  pending?: boolean;
  key?: string;
}

function withKey(label: string, key = 'R'): string {
  return key ? `${key} ${label}` : label;
}

export function npcActionLabel(input: NpcActionLabelInput): string {
  if (input.pending) return 'Indo ate';
  if (input.kind === 'vendor') return withKey('Loja', input.key);
  if (input.kind === 'healer') return withKey('Curar', input.key);
  if (input.kind === 'blacksmith') return withKey('Forja', input.key);
  if (input.kind === 'trainer') return withKey('Treinar', input.key);
  if (input.kind === 'travel') return withKey(input.zone === 'dungeon' ? 'Retornar' : 'Viajar', input.key);
  if (input.kind === 'jeweler') return withKey('Joias', input.key);
  if (input.kind === 'banker') return withKey('Banco', input.key);
  if (input.kind === 'guard') return withKey('Falar', input.key);

  const quest = input.quest;
  if (!quest?.accepted) return withKey('Aceitar', input.key);
  if (quest.completed && !quest.rewardClaimed) return withKey('Recompensa', input.key);
  if (quest.rewardClaimed) return withKey('Concluida', input.key);
  return withKey('Missao', input.key);
}
