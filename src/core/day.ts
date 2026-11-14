import { fromKey } from './dates';
import { Schedule, shiftIdFor } from './schedule';
import { AppState } from './types';

export const NO_SHIFT = 'none';

export type DayDraft = {
  shifts: [string, string, string]; // up to 3 shift ids, NO_SHIFT for an empty slot
  note: string;
  icons: string[]; // up to 3 icon ids
  overtime: number; // extra hours (can be fractional)
  extraIncome: number;
  dayAlarms: string[]; // custom alarm times "HH:mm"
  photo?: string;
  alarmOff: boolean; // shift alarms off for this day
};

export const EMPTY_DRAFT: DayDraft = { shifts: [NO_SHIFT, NO_SHIFT, NO_SHIFT], note: '', icons: [], overtime: 0, extraIncome: 0, dayAlarms: [], alarmOff: false };

// What the day dialog starts with for this day.
export function dayInitial(state: AppState, schedule: Schedule, key: string): DayDraft {
  const known = (id?: string) => (id && state.shiftTypes.some((s) => s.id === id) ? id : NO_SHIFT);
  const extras = state.extras[key] ?? [];
  return {
    shifts: [known(shiftIdFor(schedule, fromKey(key))), known(extras[0]), known(extras[1])],
    note: state.notes[key] ?? '',
    icons: state.icons[key] ?? [],
    overtime: state.overtime[key] ?? 0,
    extraIncome: state.extraIncome[key] ?? 0,
    dayAlarms: state.dayAlarms[key] ?? [],
    photo: state.photos[key],
    alarmOff: !!state.alarmOff[key],
  };
}

// OK in the day dialog: the first slot becomes the day's primary shift (no override if it equals the
// pattern), the other two become extras, and notes / icons / overtime / photo / alarms are stored or cleared.
export function applyDay(prev: AppState, key: string, d: DayDraft): AppState {
  const base: Schedule = { pattern: prev.pattern, startDate: fromKey(prev.startDate), overrides: {} };
  const patternId = shiftIdFor(base, fromKey(key)) ?? NO_SHIFT;
  const overrides = { ...prev.overrides };
  if (d.shifts[0] === patternId) delete overrides[key];
  else overrides[key] = d.shifts[0];

  const list = [d.shifts[1], d.shifts[2]].filter((id) => id !== NO_SHIFT);
  const extras = { ...prev.extras };
  if (list.length) extras[key] = list;
  else delete extras[key];

  const put = <T,>(m: Record<string, T>, keep: boolean, v: T) => {
    const next = { ...m };
    if (keep) next[key] = v;
    else delete next[key];
    return next;
  };
  return {
    ...prev,
    overrides,
    extras,
    notes: put(prev.notes, !!d.note, d.note),
    icons: put(prev.icons, d.icons.length > 0, d.icons),
    overtime: put(prev.overtime, d.overtime > 0, Math.max(0, d.overtime)),
    photos: put(prev.photos, !!d.photo, d.photo ?? ''),
    extraIncome: put(prev.extraIncome, d.extraIncome > 0, Math.max(0, d.extraIncome)),
    dayAlarms: put(prev.dayAlarms, d.dayAlarms.length > 0, d.dayAlarms),
    alarmOff: put(prev.alarmOff, d.alarmOff, true),
  };
}
