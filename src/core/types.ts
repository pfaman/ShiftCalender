export type ShiftType = {
  id: string;
  name: string;
  code: string;
  color: string;
  start?: string; // "HH:mm"
  end?: string;
  breakMin: number;
  alarmMinBefore: number; // alarm 1, minutes before the first start (0 = off)
  alarm2MinBefore?: number; // alarm 2 (0/undefined = off)
  start2?: string; // second range of a split shift
  end2?: string;
  nightDiff?: boolean; // earns the night differential
  actions?: ShiftActions; // phone changes at the start / end of the shift
  textColor?: string; // calendar label color (default: white on timed shifts)
  textSize?: number; // calendar label size
  manualMinutes?: number; // worked minutes typed by hand instead of calculated from the times
  rate?: number; // pay per hour for this shift (overrides the global rate)
  extraRate?: number; // pay per overtime hour for this shift (overrides rate x multiplier)
};

export type SoundMode = 'sound' | 'vibrate' | 'silent';
export type BluetoothMode = 'on' | 'off';
export type ShiftActions = {
  soundStart?: SoundMode;
  soundEnd?: SoundMode;
  bluetoothStart?: BluetoothMode;
  bluetoothEnd?: BluetoothMode;
};

export type PatternDef = {
  id: string;
  name: string;
  // shift type ids, one per day of the cycle
  cycle: string[];
};

// "YYYY-MM-DD" -> shift type id (manual paint overrides)
export type Overrides = Record<string, string>;

export const MAX_SHIFTS_PER_DAY = 3;

export type JobType =
  | 'nurse' | 'doctor' | 'police' | 'fire' | 'security' | 'factory' | 'warehouse' | 'driver'
  | 'hospitality' | 'retail' | 'callcenter' | 'aviation' | 'energy' | 'other';

export type AppState = {
  onboarded: boolean;
  job?: JobType;
  pattern: PatternDef;
  startDate: string; // "YYYY-MM-DD"
  overrides: Overrides;
  extras: Record<string, string[]>; // dateKey -> additional shift type ids (on top of the primary)
  shiftTypes: ShiftType[];
  notes: Record<string, string>; // dateKey -> note
  overtime: Record<string, number>; // dateKey -> extra hours
  icons: Record<string, string[]>; // dateKey -> icon ids
  alarmOff: Record<string, boolean>; // dateKey -> alarms off for that day
  extraIncome: Record<string, number>; // dateKey -> extra money earned that day
  dayAlarms: Record<string, string[]>; // dateKey -> custom alarm times ("HH:mm") for that day
  photos: Record<string, string>; // dateKey -> local photo uri
  settings: Settings;
};

export type Settings = {
  currency: string;
  hourlyRate: number;
  overtimeMultiplier: number; // e.g. 1.5
  nightDiffPercent: number; // extra % on night-shift hours
  ptoTotalHours: number; // yearly allowance
  ptoHoursPerDay: number;
  alarmsEnabled: boolean;
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  theme: 'system' | 'light' | 'dark';
  restAlerts: boolean; // warn about short rest, long streaks and heavy weeks
  minRestHours: number; // least rest between two shifts
  maxStreakDays: number; // most working days in a row
  maxWeekHours: number; // most hours in any 7 days
};
