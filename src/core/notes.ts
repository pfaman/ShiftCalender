import { daysBetween, fromKey } from './dates';

export type NoteItem = { dateKey: string; text: string };

const items = (notes: Record<string, string>): NoteItem[] =>
  Object.entries(notes).map(([dateKey, text]) => ({ dateKey, text }));

// Notes within `days` of today. Upcoming includes today, oldest first; past is newest first.
export function nearbyNotes(notes: Record<string, string>, today: Date, mode: 'past' | 'upcoming', days = 30): NoteItem[] {
  const out = items(notes).filter((n) => {
    const diff = daysBetween(today, fromKey(n.dateKey));
    return mode === 'upcoming' ? diff >= 0 && diff <= days : diff < 0 && diff >= -days;
  });
  return out.sort((a, b) => (mode === 'upcoming' ? a.dateKey.localeCompare(b.dateKey) : b.dateKey.localeCompare(a.dateKey)));
}

export function searchNotes(notes: Record<string, string>, query: string): NoteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items(notes)
    .filter((n) => n.text.toLowerCase().includes(q))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
