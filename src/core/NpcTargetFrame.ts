import type { NpcKind, QuestState } from '../shared/types';
import { npcQuestMarkerModel, type NpcQuestMarkerTone } from './NpcQuestMarker';

export interface NpcTargetFrameInput {
  kind: NpcKind;
  name: string;
  title: string;
  marker: string;
  distanceLabel?: string;
  serviceLabel?: string;
  actionLabel?: string;
  selected?: boolean;
  active?: boolean;
  pending?: boolean;
  hovered?: boolean;
  nearby?: boolean;
  quest?: Pick<QuestState, 'accepted' | 'completed' | 'rewardClaimed'>;
}

export interface NpcTargetFrameModel {
  name: string;
  marker: string;
  subtitle: string;
  status: string;
  tone: NpcKind | 'active' | 'selected' | 'pending' | 'nearby' | 'hovered' | NpcQuestMarkerTone;
}

export interface NpcTargetFrameRenderKeyInput {
  name: string;
  marker: string;
  subtitle: string;
  status: string;
  tone: string;
}

function passiveServiceLabel(kind: NpcKind): string {
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

function questLabel(quest: NpcTargetFrameInput['quest']): string {
  return npcQuestMarkerModel(quest).label;
}

function questTone(quest: NpcTargetFrameInput['quest']): NpcTargetFrameModel['tone'] {
  return npcQuestMarkerModel(quest).tone;
}

export function npcTargetFrameModel(input: NpcTargetFrameInput): NpcTargetFrameModel {
  let status = input.kind === 'quest' ? questLabel(input.quest) : passiveServiceLabel(input.kind);
  let tone: NpcTargetFrameModel['tone'] = input.kind === 'quest' ? questTone(input.quest) : input.kind;

  if (input.active) {
    status = 'Servico aberto';
    tone = 'active';
  } else if (input.pending) {
    status = 'Indo ate';
    tone = 'pending';
  } else if (input.nearby) {
    status = input.actionLabel ?? 'Em alcance';
    tone = 'nearby';
  } else if (input.selected) {
    status = input.actionLabel ?? 'Selecionado';
    tone = 'selected';
  } else if (input.hovered) {
    status = input.actionLabel ?? 'Clique Aproximar';
    tone = 'hovered';
  }

  return {
    name: input.name,
    marker: input.marker,
    subtitle: [input.title, input.serviceLabel, input.distanceLabel].filter(Boolean).join(' - '),
    status,
    tone,
  };
}

export function npcTargetFrameRenderKey(id: string, model: NpcTargetFrameRenderKeyInput): string {
  return [
    'npc',
    id,
    model.marker,
    model.name,
    model.subtitle,
    model.status,
    model.tone,
  ].join(':');
}
