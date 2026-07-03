import type { NpcKind, QuestState } from '../shared/types';
import { npcQuestMarkerModel, type NpcQuestMarkerTone } from './NpcQuestMarker';

export type NpcNameplateTone =
  | NpcKind
  | 'active'
  | 'selected'
  | 'pending'
  | 'nearby'
  | 'objective'
  | 'hovered'
  | NpcQuestMarkerTone;

export interface NpcNameplateInput {
  kind: NpcKind;
  name: string;
  title: string;
  marker: string;
  distance?: number;
  distanceLabel?: string;
  serviceLabel?: string;
  actionLabel?: string;
  selected?: boolean;
  active?: boolean;
  pending?: boolean;
  objective?: boolean;
  hovered?: boolean;
  nearby?: boolean;
  focused?: boolean;
  quest?: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>;
}

export interface NpcNameplateModel {
  marker: string;
  name: string;
  detail: string;
  state: string;
  tone: NpcNameplateTone;
  focused: boolean;
  visible: boolean;
  compact: boolean;
}

export function npcPassiveServiceLabel(kind: NpcKind): string {
  if (kind === 'vendor') return 'Loja';
  if (kind === 'healer') return 'Cura';
  if (kind === 'blacksmith') return 'Forja';
  if (kind === 'trainer') return 'Treino';
  if (kind === 'travel') return 'Portal';
  if (kind === 'jeweler') return 'Joias';
  if (kind === 'banker') return 'Banco';
  if (kind === 'guard') return 'Sentinela';
  return 'Missao';
}

export function npcQuestStateLabel(quest: NpcNameplateInput['quest']): string {
  return npcQuestMarkerModel(quest).label;
}

function npcQuestTone(quest: NpcNameplateInput['quest']): NpcNameplateTone {
  return npcQuestMarkerModel(quest).tone;
}

export function npcNameplateModel(input: NpcNameplateInput): NpcNameplateModel {
  const distance = Number.isFinite(input.distance) ? input.distance as number : undefined;
  const questImportant = input.kind === 'quest' && !input.quest?.rewardClaimed;
  const revealDistance = questImportant ? 34 : 26;
  const detailDistance = questImportant ? 18 : 14;
  const focused = !!input.focused;
  const visible = focused || distance === undefined || distance <= revealDistance;
  const compact = !focused && distance !== undefined && distance > detailDistance;
  let state = input.kind === 'quest'
    ? npcQuestStateLabel(input.quest)
    : input.serviceLabel ?? npcPassiveServiceLabel(input.kind);
  let tone: NpcNameplateTone = input.kind === 'quest' ? npcQuestTone(input.quest) : input.kind;

  if (input.active) {
    state = 'Aberto';
    tone = 'active';
  } else if (input.pending) {
    state = 'Indo ate';
    tone = 'pending';
  } else if (input.nearby) {
    state = input.actionLabel ?? 'Perto';
    tone = 'nearby';
  } else if (input.selected) {
    state = input.actionLabel ?? state;
    tone = 'selected';
  } else if (input.objective) {
    state = 'Objetivo';
    tone = 'objective';
  } else if (input.hovered) {
    state = input.actionLabel ?? state;
    tone = 'hovered';
  }

  return {
    marker: input.marker,
    name: input.name,
    detail: input.distanceLabel ? `${input.title} - ${input.distanceLabel}` : input.title,
    state,
    tone,
    focused,
    visible,
    compact,
  };
}
