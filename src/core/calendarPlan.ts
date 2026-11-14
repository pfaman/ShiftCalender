import { toKey } from './dates';
import { Schedule, shiftsFor } from './schedule';
import { ShiftType } from './types';

export type PlannedEvent = { title: string; start: Date; end: Date; notes: string };

const MAX_EVENTS = 400;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// One event per working period of every timed shift in [from, to] (days off are skipped).
export function planEvents(schedule: Schedule, shiftTypes: ShiftType[], from: Date, to: Date): PlannedEvent[] {
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const out: PlannedEvent[] = [];
  const at = (day: Date, hhmm: string, plusDays = 0) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() + plusDays, h, m);
  };
  for (let d = new Date(from); d <= to && out.length < MAX_EVENTS; d = addDays(d, 1)) {
    for (const s of shiftsFor(schedule, byId, d)) {
      if (!s.start || !s.end) continue;
      const ranges: [string, string][] = [[s.start, s.end]];
      if (s.start2 && s.end2) ranges.push([s.start2, s.end2]);
      for (const [a, b] of ranges) {
        const overnight = b <= a ? 1 : 0;
        out.push({ title: s.name, start: at(d, a), end: at(d, b, overnight), notes: `Shift Calendar · ${toKey(d)}` });
      }
    }
  }
  return out;
}

