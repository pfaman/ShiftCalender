import { toKey } from './dates';
import { Schedule, shiftsFor } from './schedule';
import { ShiftType } from './types';

export type NextShift = { shift: ShiftType; startsAt: Date };

// The next timed shift that starts after `now` (looks up to 60 days ahead).
export function nextShift(schedule: Schedule, byId: Record<string, ShiftType>, now: Date): NextShift | null {
  for (let i = 0; i <= 60; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const upcoming = shiftsFor(schedule, byId, day)
      .filter((s) => s.start)
      .map((s) => {
        const [h, m] = s.start!.split(':').map(Number);
        return { shift: s, startsAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m) };
      })
      .filter((x) => x.startsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    if (upcoming.length) return upcoming[0];
  }
  return null;
}

// "in 42 min", "in 5h 12m", "tomorrow", "in 3 days"
export function untilLabel(from: Date, to: Date): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  const sameKey = (d: Date) => toKey(d);
  const tomorrow = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  if (sameKey(to) === sameKey(tomorrow)) return 'tomorrow';
  const days = Math.round((new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) / 86400000);
  return `in ${days} days`;
}
