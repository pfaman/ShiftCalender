import { toKey } from './dates';
import { Schedule, shiftsFor } from './schedule';
import { formatTime, shiftHours, shiftRanges } from './shiftTypes';
import { ShiftType } from './types';

export type RestRules = { minRestHours: number; maxStreakDays: number; maxWeekHours: number };
export type RestIssue = {
  kind: 'rest' | 'streak' | 'week' | 'long';
  dateKey: string; // the day the problem shows on
  severity: 'warn' | 'bad';
  title: string;
  detail: string;
};

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

type Work = { start: number; end: number; day: Date; shift: ShiftType }; // minutes since `origin`
const DAY_MIN = 1440;
const MAX_DAY_HOURS = 12;

const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
const hoursText = (h: number) => `${Math.round(h * 10) / 10}h`;

// Looks at `days` days from `from` (plus some look-back) and lists where the plan breaks a rule:
// too little rest between shifts, too many working days in a row, too many hours in a week, or a very long day.
// extraHours: dateKey -> extra hours worked that day (added after the day's last shift).
export function checkRest(
  schedule: Schedule,
  byId: Record<string, ShiftType>,
  extraHours: Record<string, number>,
  from: Date,
  days: number,
  rules: RestRules,
): RestIssue[] {
  const origin = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 14);
  const total = days + 14;
  const issues: RestIssue[] = [];
  const reportFrom = toKey(from);
  const reportTo = toKey(addDays(from, days - 1));
  const inWindow = (k: string) => k >= reportFrom && k <= reportTo;

  // every worked range, on one timeline
  const works: Work[] = [];
  const hoursByDay: number[] = [];
  const workedDay: boolean[] = [];
  for (let i = 0; i < total; i++) {
    const day = addDays(origin, i);
    const shifts = shiftsFor(schedule, byId, day).filter((s) => shiftRanges(s).length > 0);
    const extra = extraHours[toKey(day)] ?? 0;
    let h = extra;
    for (const s of shifts) {
      h += shiftHours(s);
      for (const r of shiftRanges(s)) works.push({ start: i * DAY_MIN + r.start, end: i * DAY_MIN + r.end, day, shift: s });
    }
    if (extra > 0 && shifts.length) {
      const last = works.filter((w) => w.day === day).sort((a, b) => b.end - a.end)[0];
      last.end += extra * 60;
    }
    hoursByDay.push(h);
    workedDay.push(shifts.length > 0 || extra > 0);
  }

  // 1) rest between consecutive shifts
  works.sort((a, b) => a.start - b.start);
  for (let i = 1; i < works.length; i++) {
    const prev = works[i - 1];
    const next = works[i];
    if (prev.day === next.day) continue; // the two halves of one day
    const gap = (next.start - prev.end) / 60;
    const key = toKey(next.day);
    if (gap >= rules.minRestHours || !inWindow(key)) continue;
    issues.push({
      kind: 'rest',
      dateKey: key,
      severity: gap < rules.minRestHours - 3 ? 'bad' : 'warn',
      title: gap < 0 ? 'Shifts overlap' : gap === 0 ? 'No rest between shifts' : `Only ${hoursText(gap)} of rest`,
      detail: `${prev.shift.name} on ${dayLabel(prev.day)} ends ${formatTime(clock(prev.end))}, ${next.shift.name} starts ${formatTime(clock(next.start))}. You need at least ${hoursText(rules.minRestHours)}.`,
    });
  }

  // 2) working days in a row
  let streak = 0;
  for (let i = 0; i < total; i++) {
    streak = workedDay[i] ? streak + 1 : 0;
    const key = toKey(addDays(origin, i));
    if (streak === rules.maxStreakDays + 1 && inWindow(key)) {
      let end = i;
      while (end + 1 < total && workedDay[end + 1]) end++;
      const len = end - (i - streak + 1) + 1;
      issues.push({
        kind: 'streak',
        dateKey: key,
        severity: len > rules.maxStreakDays + 2 ? 'bad' : 'warn',
        title: `${len} working days in a row`,
        detail: `${dayLabel(addDays(origin, i - streak + 1))} to ${dayLabel(addDays(origin, end))}. Try to take a day off after ${rules.maxStreakDays}.`,
      });
    }
  }

  // 3) hours in any 7 days (reported once per heavy stretch)
  let reported = false; // one report per heavy stretch, even if it began before the window
  for (let i = 6; i < total; i++) {
    let sum = 0;
    for (let k = i - 6; k <= i; k++) sum += hoursByDay[k];
    const key = toKey(addDays(origin, i));
    if (sum > rules.maxWeekHours) {
      if (!reported && inWindow(key)) {
        reported = true;
        issues.push({
          kind: 'week',
          dateKey: key,
          severity: sum > rules.maxWeekHours + 8 ? 'bad' : 'warn',
          title: `${hoursText(sum)} in 7 days`,
          detail: `${dayLabel(addDays(origin, i - 6))} to ${dayLabel(addDays(origin, i))}. Your limit is ${hoursText(rules.maxWeekHours)} a week.`,
        });
      }
    } else {
      reported = false;
    }
  }

  // 4) one very long day
  for (let i = 0; i < total; i++) {
    const key = toKey(addDays(origin, i));
    if (hoursByDay[i] > MAX_DAY_HOURS && inWindow(key)) {
      issues.push({
        kind: 'long',
        dateKey: key,
        severity: hoursByDay[i] > MAX_DAY_HOURS + 4 ? 'bad' : 'warn',
        title: `${hoursText(hoursByDay[i])} in one day`,
        detail: `${dayLabel(addDays(origin, i))} is longer than ${MAX_DAY_HOURS}h of work.`,
      });
    }
  }

  return issues.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
}

function clock(min: number): string {
  const t = ((min % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// dateKey -> the worst severity that day, for marking the calendar.
export function issueDays(issues: RestIssue[]): Record<string, 'warn' | 'bad'> {
  const out: Record<string, 'warn' | 'bad'> = {};
  for (const i of issues) if (out[i.dateKey] !== 'bad') out[i.dateKey] = i.severity;
  return out;
}

