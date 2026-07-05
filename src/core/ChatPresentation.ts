import type { ChatChannel } from '../shared/types';

export type ChatBubbleTone = 'local' | 'party';

export function chatBubbleToneFor(channel: ChatChannel): ChatBubbleTone | null {
  if (channel === 'local' || channel === 'party') return channel;
  return null;
}

export function chatBubbleTextColor(tone: ChatBubbleTone): string {
  return tone === 'party' ? '#d8f7ff' : '#fff6de';
}
