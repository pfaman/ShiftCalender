import { toKey } from './dates';

export type DayIcon = { id: string; emoji: string; label: string };

// The icons a day can carry (up to 3). Ids of older versions are kept in LEGACY so saved days still show.
export const DAY_ICONS: DayIcon[] = [
  { id: 'swap', emoji: '🔄', label: 'Shift change' },
  { id: 'money', emoji: '💲', label: 'Income' },
  { id: 'warning', emoji: '⚠️', label: 'Important' },
  { id: 'holiday', emoji: '☀️', label: 'Holiday' },
  { id: 'doctor', emoji: '🩺', label: 'Doctor' },
  { id: 'pet', emoji: '🐱', label: 'Pet' },
  { id: 'star', emoji: '⭐', label: 'Favourite' },
  { id: 'trip', emoji: '🚗', label: 'Car' },
];
export const MAX_DAY_ICONS = 3;

const LEGACY: Record<string, string> = { cake: '🎂', plane: '✈️', course: '🎓', family: '❤️' };

export const emojiFor = (id: string) => DAY_ICONS.find((i) => i.id === id)?.emoji ?? LEGACY[id] ?? '';

const SCAN_DAYS = 365;

// Days marked with an icon, relative to today. Upcoming includes today (oldest first); past is newest first.
export function daysWithIcon(icons: Record<string, string[]>, iconId: string, today: Date, past: boolean): string[] {
  const keys = Object.entries(icons).filter(([, ids]) => ids.includes(iconId)).map(([k]) => k);
  return pick(keys, today, past);
}

function pick(keys: string[], today: Date, past: boolean): string[] {
  const t = toKey(today);
  const out = keys.filter((k) => (past ? k < t : k >= t));
  return out.sort((a, b) => (past ? b.localeCompare(a) : a.localeCompare(b)));
}

