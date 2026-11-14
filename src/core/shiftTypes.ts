import { ShiftType } from './types';

export const TEAL = '#0F766E';

export const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { id: 'day', name: 'Day', code: 'D', color: '#F5A524', start: '07:00', end: '19:00', breakMin: 30, alarmMinBefore: 60 },
  { id: 'evening', name: 'Evening', code: 'E', color: '#F97316', start: '15:00', end: '23:00', breakMin: 30, alarmMinBefore: 60 },
  { id: 'night', name: 'Night', code: 'N', color: '#4F46E5', start: '19:00', end: '07:00', breakMin: 30, alarmMinBefore: 90 },
  { id: 'off', name: 'Off', code: 'OFF', color: '#9CA3AF', breakMin: 0, alarmMinBefore: 0 },
  { id: 'pto', name: 'PTO', code: 'PTO', color: '#16A34A', breakMin: 0, alarmMinBefore: 0 },
  { id: 'sick', name: 'Sick', code: 'SICK', color: '#DC2626', breakMin: 0, alarmMinBefore: 0 },
];

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Minutes in one range; a range that ends at or before its start crosses midnight.
function rangeMins(start: string, end: string): number {
  const mins = toMin(end) - toMin(start);
  return mins <= 0 ? mins + 24 * 60 : mins;
}

// Each worked range of a shift as minutes from the start of its day; an end past 1440 runs into the next day.
export function shiftRanges(s: ShiftType): { start: number; end: number }[] {
  if (!s.start || !s.end) return [];
  const out = [{ start: toMin(s.start), end: toMin(s.start) + rangeMins(s.start, s.end) }];
  if (s.start2 && s.end2) out.push({ start: toMin(s.start2), end: toMin(s.start2) + rangeMins(s.start2, s.end2) });
  return out;
}

export const isSplit = (s: ShiftType) => !!(s.start2 && s.end2);

// Worked hours: both ranges of a split shift, minus the rest time.
export function shiftHours(s: ShiftType): number {
  if (!s.start || !s.end) return 0;
  if (s.manualMinutes !== undefined) return Math.max(0, s.manualMinutes) / 60;
  let mins = rangeMins(s.start, s.end);
  if (s.start2 && s.end2) mins += rangeMins(s.start2, s.end2);
  return Math.max(0, mins - s.breakMin) / 60;
}

// "14:00" -> "2:00 PM"
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// "8:00 AM-2:00 PM", or "(10:00 AM-2:00 PM) - (4:00 PM-8:00 PM)" for a split shift.
export function shiftTimeLabel(s: ShiftType): string {
  if (!s.start || !s.end) return '';
  const one = `${formatTime(s.start)}-${formatTime(s.end)}`;
  return isSplit(s) ? `(${one}) - (${formatTime(s.start2!)}-${formatTime(s.end2!)})` : one;
}

// Minutes before the first start for each enabled alarm (distinct, largest first).
export function alarmOffsets(s: ShiftType): number[] {
  if (!s.start) return [];
  const all = [s.alarmMinBefore, s.alarm2MinBefore ?? 0].filter((n) => n > 0);
  return [...new Set(all)].sort((a, b) => b - a);
}

// "HH:mm" clock time of each alarm.
export function alarmClockTimes(s: ShiftType): string[] {
  if (!s.start) return [];
  const start = toMin(s.start);
  return alarmOffsets(s).map((off) => {
    const t = (((start - off) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });
}
