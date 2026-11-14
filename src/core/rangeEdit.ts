import { fromKey, toKey } from './dates';
import { NO_SHIFT } from './day';
import { Schedule, shiftIdFor } from './schedule';
import { AppState } from './types';

// One day of copied shifts: the primary shift (NO_SHIFT if empty) and its extras.
export type ClipDay = { primary: string; extras: string[] };
export type Clip = ClipDay[];

const MAX_DAYS = 3660; // ~10 years: a safety cap for repeat / paste

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sortRange = (a: Date, b: Date): [Date, Date] => (a <= b ? [a, b] : [b, a]);
export const rangeLength = (from: Date, to: Date) => {
  const [a, b] = sortRange(from, to);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000) + 1;
};

// The shifts on each day of [from, to], in order.
export function readRange(state: AppState, from: Date, to: Date): Clip {
  const [a, b] = sortRange(from, to);
  const sched: Schedule = { pattern: state.pattern, startDate: fromKey(state.startDate), overrides: state.overrides, extras: state.extras };
  return Array.from({ length: Math.min(rangeLength(a, b), MAX_DAYS) }, (_, i) => {
    const d = addDays(a, i);
    return { primary: shiftIdFor(sched, d) ?? NO_SHIFT, extras: [...(state.extras[toKey(d)] ?? [])] };
  });
}

// Writes `clip` day by day starting at `start`. A primary equal to the pattern's shift needs no override.
export function writeClip(prev: AppState, start: Date, clip: Clip): AppState {
  const base: Schedule = { pattern: prev.pattern, startDate: fromKey(prev.startDate), overrides: {} };
  const overrides = { ...prev.overrides };
  const extras = { ...prev.extras };
  clip.slice(0, MAX_DAYS).forEach((day, i) => {
    const d = addDays(start, i);
    const key = toKey(d);
    const patternId = shiftIdFor(base, d) ?? NO_SHIFT;
    if (day.primary === patternId) delete overrides[key];
    else overrides[key] = day.primary;
    if (day.extras.length) extras[key] = day.extras;
    else delete extras[key];
  });
  return { ...prev, overrides, extras };
}

const filled = (n: number, day: ClipDay): Clip => Array.from({ length: Math.min(n, MAX_DAYS) }, () => day);

export const setRange = (prev: AppState, from: Date, to: Date, shiftId: string): AppState => {
  const [a, b] = sortRange(from, to);
  return writeClip(prev, a, filled(rangeLength(a, b), { primary: shiftId, extras: [] }));
};

export const eraseRange = (prev: AppState, from: Date, to: Date): AppState => setRange(prev, from, to, NO_SHIFT);

// Paste a copied range with its first day on `at`.
export const pasteClip = (prev: AppState, at: Date, clip: Clip): AppState => (clip.length ? writeClip(prev, at, clip) : prev);

// Repeat the selected range `times` more times, directly after it.
export function repeatRange(prev: AppState, from: Date, to: Date, times: number): AppState {
  const [a, b] = sortRange(from, to);
  const clip = readRange(prev, a, b);
  const all: Clip = [];
  for (let k = 0; k < times; k++) all.push(...clip);
  return writeClip(prev, addDays(b, 1), all);
}

// Repeat the selected range after itself until `until` (inclusive; the last copy may be cut short).
export function repeatUntil(prev: AppState, from: Date, to: Date, until: Date): AppState {
  const [a, b] = sortRange(from, to);
  const clip = readRange(prev, a, b);
  const start = addDays(b, 1);
  const days = Math.min(rangeLength(start, until), MAX_DAYS);
  if (until < start || !clip.length) return prev;
  return writeClip(prev, start, Array.from({ length: days }, (_, i) => clip[i % clip.length]));
}
