import type { ConversationDto } from './types';

export function formatCost(n: number): string {
  if (n >= 1) return '$' + n.toFixed(2);
  let s = n.toFixed(4);
  while (s.endsWith('0') && s.split('.')[1]!.length > 2) s = s.slice(0, -1);
  return '$' + s;
}

export function groupByDay(items: ConversationDto[], now = new Date()): { label: string; items: ConversationDto[] }[] {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = day(now), groups = new Map<string, ConversationDto[]>();
  for (const c of items) {
    const diff = Math.round((today - day(new Date(c.updatedAt))) / 864e5);
    const label = diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
    groups.set(label, [...(groups.get(label) ?? []), c]);
  }
  return ['Today', 'Yesterday', 'Earlier'].filter(l => groups.has(l)).map(label => ({ label, items: groups.get(label)! }));
}

export const isRtl = (s: string) => /[\u0590-\u08FF]/.test(s);
export const slugUrl = (origin: string, slug: string) => `${origin.replace(/\/$/, '')}/c/${slug}`;
