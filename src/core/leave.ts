import { fromKey, toKey } from './dates';
import { Schedule, shiftsFor } from './schedule';
import { ShiftType } from './types';

export type LeaveOption = {
  from: string; // first day off in a row
  to: string; // last day off in a row
  totalDays: number; // days off in a row, counting leave days
  leaveDays: string[]; // the working days you would take as leave
};

const MAX_RESULTS = 5;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Where a few leave days give the longest stretch away from work. A day counts as work when it has a shift
// with start and end times; days off, PTO and sick days already count as free.
// Returns the best non-overlapping stretches in the next `horizonDays`, longest first.
export function planLeave(
  schedule: Schedule,
  byId: Record<string, ShiftType>,
  from: Date,
  horizonDays: number,
  budget: number,
): LeaveOption[] {
  if (budget < 1) return [];
  const days = Array.from({ length: horizonDays }, (_, i) => addDays(from, i));
  const work = days.map((d) => shiftsFor(schedule, byId, d).some((s) => !!s.start && !!s.end));

  const found: LeaveOption[] = [];
  for (let i = 0; i < horizonDays; i++) {
    // a stretch begins at the window start or right after a working day, so it is as long as it can be on the left
    if (i > 0 && !work[i - 1]) continue;
    let used = 0;
    let j = i;
    while (j < horizonDays && (!work[j] || used < budget)) {
      if (work[j]) used++;
      j++;
    }
    const end = j - 1;
    if (used === 0) continue;
    const leave: string[] = [];
    for (let k = i; k <= end; k++) if (work[k]) leave.push(toKey(days[k]));
    found.push({ from: toKey(days[i]), to: toKey(days[end]), totalDays: end - i + 1, leaveDays: leave });
  }

  // longest stretch first, then the fewest leave days, then the earliest; keep stretches that do not overlap
  found.sort((x, y) => y.totalDays - x.totalDays || x.leaveDays.length - y.leaveDays.length || (x.from < y.from ? -1 : 1));
  const out: LeaveOption[] = [];
  for (const o of found) {
    if (out.some((p) => !(o.to < p.from || o.from > p.to))) continue;
    out.push(o);
    if (out.length === MAX_RESULTS) break;
  }
  return out;
}

// Days between two keys, both included.
export const stretchLabel = (o: LeaveOption) => {
  const f = fromKey(o.from);
  const t = fromKey(o.to);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${fmt(f)} – ${fmt(t)}`;
};
