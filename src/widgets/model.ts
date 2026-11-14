import { monthGrid } from '../core/dates';
import { shiftsFor } from '../core/schedule';
import { shiftTimeLabel } from '../core/shiftTypes';
import { AppState } from '../core/types';
import { fromKey } from '../core/dates';

export type DayCell = { day: number; weekday: string; code?: string; color?: string; isToday: boolean };

export type WidgetModel = {
  today: { name: string; time: string; color: string; hasShift: boolean };
  week: DayCell[]; // today + next 6 days
  monthTitle: string;
  weeks: (DayCell | null)[][]; // Monday-first grid for the current month
};

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function buildWidgetModel(state: AppState, now: Date): WidgetModel {
  const schedule = { pattern: state.pattern, startDate: fromKey(state.startDate), overrides: state.overrides, extras: state.extras };
  const byId = Object.fromEntries(state.shiftTypes.map((s) => [s.id, s]));
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const cell = (d: Date): DayCell => {
    const all = shiftsFor(schedule, byId, d);
    const s = all[0];
    const code = s ? s.code + (all.length > 1 ? `+${all.length - 1}` : '') : undefined;
    return { day: d.getDate(), weekday: WD[d.getDay()], code, color: s?.color, isToday: sameDay(d, now) };
  };

  const todays = shiftsFor(schedule, byId, now);
  const t = todays[0];
  return {
    today: {
      name: t ? todays.map((x) => x.name).join(' + ').toUpperCase() : 'NO SHIFT',
      time: todays.map(shiftTimeLabel).filter(Boolean).join(' · '),
      color: t?.color ?? '#9CA3AF',
      hasShift: !!t,
    },
    week: Array.from({ length: 7 }, (_, i) => cell(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))),
    monthTitle: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    weeks: monthGrid(now.getFullYear(), now.getMonth(), state.settings.weekStart ?? 1).map((w) => w.map((d) => (d ? cell(d) : null))),
  };
}
