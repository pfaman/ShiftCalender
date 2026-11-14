import { daysBetween, toKey } from './dates';
import { Overrides, PatternDef, ShiftType } from './types';

export type Schedule = {
  pattern: PatternDef;
  startDate: Date;
  overrides: Overrides;
  extras?: Record<string, string[]>;
  alarmOff?: Record<string, boolean>; // days whose shift alarms are switched off
  dayAlarms?: Record<string, string[]>; // custom alarms for single days
};

// Shift type id for a date: manual override first, then the repeating pattern. The pattern repeats in
// both directions from startDate, so the whole calendar is filled, not only the days after it.
export function shiftIdFor(s: Schedule, date: Date): string | undefined {
  const o = s.overrides[toKey(date)];
  if (o) return o;
  const diff = daysBetween(s.startDate, date);
  const n = s.pattern.cycle.length;
  if (n === 0) return undefined;
  return s.pattern.cycle[((diff % n) + n) % n];
}

// All shifts on a date: the primary (override or pattern) first, then extras. Unknown ids
// (including the "none" marker) are dropped.
export function shiftsFor(s: Schedule, byId: Record<string, ShiftType>, date: Date): ShiftType[] {
  const ids = [shiftIdFor(s, date), ...(s.extras?.[toKey(date)] ?? [])];
  return ids.map((id) => (id ? byId[id] : undefined)).filter((x): x is ShiftType => !!x);
}
