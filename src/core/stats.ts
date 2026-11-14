import { toKey } from './dates';
import { Schedule, shiftIdFor, shiftsFor } from './schedule';
import { shiftHours } from './shiftTypes';
import { Settings, ShiftType } from './types';

export type Stats = {
  hours: number;
  overtimeHours: number;
  earnings: number;
  counts: Record<string, number>; // shift code -> days
  perShift: Record<string, { count: number; hours: number }>; // shift id -> days and worked hours
  buckets: number[]; // hours per week or month, depending on the range
  labels?: string[]; // bucket labels, when the range picks its own
};

export type RangeInput = {
  extraIncome?: Record<string, number>;
  schedule: Schedule;
  shiftTypes: ShiftType[];
  overtime: Record<string, number>;
  settings: Settings;
};

const isNight = (s: ShiftType) => s.nightDiff ?? s.id === 'night';

const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

// Totals for days in [from, toExcl). bucketOf maps a day to its bucket index (0..nBuckets-1).
// Overnight shifts are counted on the day they start.
function accumulate(
  { schedule, shiftTypes, overtime, settings, extraIncome }: RangeInput,
  from: Date,
  toExcl: Date,
  bucketOf: (d: Date) => number,
  nBuckets: number,
): Stats {
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const stats: Stats = { hours: 0, overtimeHours: 0, earnings: 0, counts: {}, perShift: {}, buckets: Array(nBuckets).fill(0) };

  for (let d = new Date(from); d < toExcl; d = nextDay(d)) {
    // The day's overtime is applied once, to the first shift that has working hours.
    stats.earnings += extraIncome?.[toKey(d)] ?? 0;
    let otLeft = overtime[toKey(d)] ?? 0;
    for (const s of shiftsFor(schedule, byId, d)) {
      stats.counts[s.code] = (stats.counts[s.code] ?? 0) + 1;
      const base = shiftHours(s);
      const ot = base > 0 ? otLeft : 0;
      if (base > 0) otLeft = 0;
      const row = (stats.perShift[s.id] ??= { count: 0, hours: 0 });
      row.count += 1;
      row.hours += base + ot;
      if (base + ot === 0) continue;

      stats.hours += base + ot;
      stats.overtimeHours += ot;
      // per-shift rates win over the global ones
      const rate = s.rate && s.rate > 0 ? s.rate : settings.hourlyRate;
      const otRate = s.extraRate && s.extraRate > 0 ? s.extraRate : rate * settings.overtimeMultiplier;
      const nightBonus = isNight(s) ? settings.nightDiffPercent / 100 : 0;
      stats.earnings += (base * rate + ot * otRate) * (1 + nightBonus);

      const idx = bucketOf(d);
      if (idx >= 0 && idx < nBuckets) stats.buckets[idx] += base + ot;
    }
  }
  return stats;
}

export function computeStats(input: RangeInput, year: number, month: number | null): Stats {
  const from = new Date(year, month ?? 0, 1);
  const to = month === null ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
  const lead = month === null ? 0 : (from.getDay() - input.settings.weekStart + 7) % 7;
  const n = month === null ? 12 : Math.ceil((new Date(year, month + 1, 0).getDate() + lead) / 7);
  return accumulate(input, from, to, (d) => (month === null ? d.getMonth() : Math.floor((d.getDate() - 1 + lead) / 7)), n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Any date range, both ends included. Up to ~6 months is grouped by week, longer by month.
export function computeRange(input: RangeInput, first: Date, last: Date): Stats {
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const toExcl = nextDay(new Date(last.getFullYear(), last.getMonth(), last.getDate()));
  if (toExcl <= from) return { hours: 0, overtimeHours: 0, earnings: 0, counts: {}, perShift: {}, buckets: [], labels: [] };
  const days = Math.round((toExcl.getTime() - from.getTime()) / 86400000);

  if (days <= 182) {
    const n = Math.ceil(days / 7);
    const stats = accumulate(input, from, toExcl, (d) => Math.floor(Math.round((d.getTime() - from.getTime()) / 86400000) / 7), n);
    return { ...stats, labels: Array.from({ length: n }, (_, i) => `W${i + 1}`) };
  }
  const start = from.getFullYear() * 12 + from.getMonth();
  const n = last.getFullYear() * 12 + last.getMonth() - start + 1;
  const stats = accumulate(input, from, toExcl, (d) => d.getFullYear() * 12 + d.getMonth() - start, n);
  return { ...stats, labels: Array.from({ length: n }, (_, i) => MONTHS[(from.getMonth() + i) % 12]) };
}

// left never goes below 0; over is how far the booked PTO exceeds the allowance.
export type PtoSummary = { used: number; upcoming: number; left: number; over: number };

// PTO is counted per PTO-shift day in the calendar year: past/today = used, later = upcoming.
export function ptoSummary(input: RangeInput, year: number, today: Date): PtoSummary {
  const { schedule, shiftTypes, settings } = input;
  const ptoIds = new Set(shiftTypes.filter((s) => s.id === 'pto').map((s) => s.id));
  let used = 0;
  let upcoming = 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = new Date(year, d.getMonth(), d.getDate() + 1)) {
    const ids = [shiftIdFor(schedule, d), ...(schedule.extras?.[toKey(d)] ?? [])];
    if (!ids.some((id) => id && ptoIds.has(id))) continue;
    if (d <= todayStart) used += settings.ptoHoursPerDay;
    else upcoming += settings.ptoHoursPerDay;
  }
  const rest = settings.ptoTotalHours - used - upcoming;
  return { used, upcoming, left: Math.max(0, rest), over: Math.max(0, -rest) };
}
