import { toKey } from './dates';
import { Schedule, shiftsFor } from './schedule';
import { alarmOffsets, formatTime } from './shiftTypes';
import { ShiftType } from './types';

export type PlannedAlarm = { at: Date; title: string; body: string };

// iOS keeps only 64 pending local notifications, so stay under that.
export const MAX_ALARMS = 60;
export const HORIZON_DAYS = 30;

// Upcoming alarms: up to two per timed shift, in the next HORIZON_DAYS.
export function planAlarms(
  schedule: Schedule,
  shiftTypes: ShiftType[],
  now: Date,
  horizonDays = HORIZON_DAYS,
  max = MAX_ALARMS,
): PlannedAlarm[] {
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const out: PlannedAlarm[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = toKey(day);
    // custom alarms for this day always ring
    for (const t of schedule.dayAlarms?.[key] ?? []) {
      const [h, m] = t.split(':').map(Number);
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (at > now) out.push({ at, title: 'Alarm', body: formatTime(t) });
    }
    if (schedule.alarmOff?.[key]) continue; // shift alarms switched off for this day
    for (const s of shiftsFor(schedule, byId, day)) {
      if (!s.start) continue;
      const [h, m] = s.start.split(':').map(Number);
      for (const off of alarmOffsets(s)) {
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m - off);
        if (at <= now) continue;
        out.push({ at, title: `${s.name} shift`, body: `Starts at ${formatTime(s.start)}` });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}

export type AlarmSource = { schedule: Schedule; shiftTypes: ShiftType[] };

// Alarms from several calendars merged in time order, capped as a whole.
export function planAllAlarms(sources: AlarmSource[], now: Date, horizonDays = HORIZON_DAYS, max = MAX_ALARMS): PlannedAlarm[] {
  return sources
    .flatMap((s) => planAlarms(s.schedule, s.shiftTypes, now, horizonDays, max))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, max);
}
