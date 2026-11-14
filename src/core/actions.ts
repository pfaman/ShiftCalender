import { Schedule, shiftsFor } from './schedule';
import { BluetoothMode, ShiftType, SoundMode } from './types';

export type PlannedAction = { at: number; sound?: SoundMode; bt?: BluetoothMode };

export const MAX_ACTIONS = 150;

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Phone changes at the start and end of timed shifts with actions set, merged when they land
// on the same minute. A split shift starts at its first start and ends at its last end.
export function planActions(schedule: Schedule, shiftTypes: ShiftType[], now: Date, horizonDays = 30, max = MAX_ACTIONS): PlannedAction[] {
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const events = new Map<number, PlannedAction>();
  const add = (at: Date, patch: Omit<PlannedAction, 'at'>) => {
    if (at <= now || (!patch.sound && !patch.bt)) return;
    const t = at.getTime();
    events.set(t, { ...events.get(t), ...patch, at: t });
  };

  for (let i = 0; i <= horizonDays; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    for (const s of shiftsFor(schedule, byId, day)) {
      if (!s.start || !s.end || !s.actions) continue;
      const lastEnd = s.start2 && s.end2 ? s.end2 : s.end;
      const [sh, sm] = s.start.split(':').map(Number);
      const [eh, em] = lastEnd.split(':').map(Number);
      const overnight = toMin(lastEnd) <= toMin(s.start) ? 1 : 0;
      add(new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm), { sound: s.actions.soundStart, bt: s.actions.bluetoothStart });
      add(new Date(day.getFullYear(), day.getMonth(), day.getDate() + overnight, eh, em), { sound: s.actions.soundEnd, bt: s.actions.bluetoothEnd });
    }
  }
  return [...events.values()].sort((a, b) => a.at - b.at).slice(0, max);
}
