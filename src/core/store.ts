import { fromKey, toKey } from './dates';
import { PRESET_PATTERNS } from './patterns';
import { Schedule } from './schedule';
import { DEFAULT_SHIFT_TYPES } from './shiftTypes';
import { AppState, JobType, Overrides, PatternDef, Settings, ShiftType } from './types';

export const DEFAULT_SETTINGS: Settings = {
  currency: '$',
  hourlyRate: 0,
  overtimeMultiplier: 1.5,
  nightDiffPercent: 0,
  ptoTotalHours: 0,
  ptoHoursPerDay: 8,
  alarmsEnabled: true,
  weekStart: 0,
  theme: 'system',
  restAlerts: true,
  minRestHours: 11,
  maxStreakDays: 6,
  maxWeekHours: 60,
};

// Everything that belongs to one calendar (yours, a partner's, ...).
export type CalendarData = {
  id: string;
  name: string;
  alarms: boolean; // ring this calendar's shift alarms
  pattern: PatternDef;
  startDate: string; // "YYYY-MM-DD"
  overrides: Overrides;
  extras: Record<string, string[]>;
  shiftTypes: ShiftType[];
  notes: Record<string, string>;
  overtime: Record<string, number>;
  icons: Record<string, string[]>;
  photos: Record<string, string>;
  alarmOff: Record<string, boolean>;
  extraIncome: Record<string, number>;
  dayAlarms: Record<string, string[]>;
};

export type Store = {
  welcomed: boolean; // intro slides seen
  onboarded: boolean;
  job?: JobType;
  settings: Settings;
  calendars: CalendarData[];
  activeId: string;
  compareId: string | null; // calendar shown alongside the active one
};

let counter = 0;
export const newId = () => `cal-${Date.now().toString(36)}${(counter++).toString(36)}`;

export function newCalendar(name: string, base?: Partial<CalendarData>): CalendarData {
  return {
    id: newId(),
    name,
    alarms: false,
    pattern: PRESET_PATTERNS[0],
    startDate: toKey(new Date()),
    overrides: {},
    extras: {},
    shiftTypes: DEFAULT_SHIFT_TYPES,
    notes: {},
    overtime: {},
    icons: {},
    photos: {},
    alarmOff: {},
    extraIncome: {},
    dayAlarms: {},
    ...base,
  };
}

export function initialStore(): Store {
  const cal = newCalendar('My calendar', { id: 'main', alarms: true });
  return { welcomed: false, onboarded: false, settings: DEFAULT_SETTINGS, calendars: [cal], activeId: cal.id, compareId: null };
}

// Numbers that must never be negative or NaN; anything else falls back to the default.
const nonNeg = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback);
const optNonNeg = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

export function sanitizeSettings(raw: Partial<Settings>): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    currency: typeof raw.currency === 'string' ? raw.currency : d.currency,
    hourlyRate: nonNeg(raw.hourlyRate, d.hourlyRate),
    overtimeMultiplier: nonNeg(raw.overtimeMultiplier, d.overtimeMultiplier),
    nightDiffPercent: nonNeg(raw.nightDiffPercent, d.nightDiffPercent),
    ptoTotalHours: nonNeg(raw.ptoTotalHours, d.ptoTotalHours),
    ptoHoursPerDay: nonNeg(raw.ptoHoursPerDay, d.ptoHoursPerDay),
    alarmsEnabled: typeof raw.alarmsEnabled === 'boolean' ? raw.alarmsEnabled : d.alarmsEnabled,
    weekStart: raw.weekStart === 1 ? 1 : 0,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system',
    restAlerts: typeof raw.restAlerts === 'boolean' ? raw.restAlerts : d.restAlerts,
    minRestHours: nonNeg(raw.minRestHours, d.minRestHours),
    maxStreakDays: nonNeg(raw.maxStreakDays, d.maxStreakDays),
    maxWeekHours: nonNeg(raw.maxWeekHours, d.maxWeekHours),
  };
}

export function sanitizeShift(s: ShiftType): ShiftType {
  return {
    ...s,
    breakMin: nonNeg(s.breakMin, 0),
    alarmMinBefore: nonNeg(s.alarmMinBefore, 0),
    alarm2MinBefore: s.alarm2MinBefore === undefined ? undefined : nonNeg(s.alarm2MinBefore, 0),
    manualMinutes: s.manualMinutes === undefined ? undefined : nonNeg(s.manualMinutes, 0),
    rate: optNonNeg(s.rate),
    extraRate: optNonNeg(s.extraRate),
    textSize: s.textSize === undefined ? undefined : Math.min(20, Math.max(9, nonNeg(s.textSize, 13))),
  };
}

const cleanOvertime = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([, h]) => typeof h === 'number' && h > 0));

const CAL_FIELDS = ['pattern', 'startDate', 'overrides', 'extras', 'shiftTypes', 'notes', 'overtime', 'icons', 'photos', 'alarmOff', 'extraIncome', 'dayAlarms'] as const;

// Accepts the current store shape or the older single-calendar shape and returns a valid Store.
export function migrate(raw: unknown): Store {
  const base = initialStore();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Record<string, any>;

  const settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...(r.settings ?? {}) });
  let calendars: CalendarData[];
  if (Array.isArray(r.calendars) && r.calendars.length > 0) {
    calendars = r.calendars.map((c: Partial<CalendarData>, i: number) =>
      newCalendar(c.name || `Calendar ${i + 1}`, { ...c, id: c.id || newId() }),
    );
  } else if (r.pattern) {
    const flat: Partial<CalendarData> = {};
    for (const k of CAL_FIELDS) if (r[k] !== undefined) (flat as any)[k] = r[k];
    calendars = [newCalendar('My calendar', { ...flat, id: 'main', alarms: true })];
  } else {
    calendars = base.calendars;
  }
  calendars = calendars.map((c) => ({ ...c, shiftTypes: c.shiftTypes.map(sanitizeShift), overtime: cleanOvertime(c.overtime), extraIncome: cleanOvertime(c.extraIncome ?? {}) }));
  const activeId = calendars.some((c) => c.id === r.activeId) ? r.activeId : calendars[0].id;
  const compareId = calendars.some((c) => c.id === r.compareId) && r.compareId !== activeId ? r.compareId : null;
  return { welcomed: r.welcomed === true || !!r.onboarded, onboarded: !!r.onboarded, job: r.job, settings, calendars, activeId, compareId };
}

export const activeCalendar = (s: Store): CalendarData => s.calendars.find((c) => c.id === s.activeId) ?? s.calendars[0];

// The active calendar plus global fields, as the flat shape most of the app works with.
export function flatten(s: Store): AppState {
  const c = activeCalendar(s);
  return {
    onboarded: s.onboarded,
    job: s.job,
    settings: s.settings,
    pattern: c.pattern,
    startDate: c.startDate,
    overrides: c.overrides,
    extras: c.extras,
    shiftTypes: c.shiftTypes,
    notes: c.notes,
    overtime: c.overtime,
    icons: c.icons,
    photos: c.photos,
    alarmOff: c.alarmOff,
    extraIncome: c.extraIncome,
    dayAlarms: c.dayAlarms,
  };
}

export function unflatten(s: Store, a: AppState): Store {
  const id = activeCalendar(s).id;
  const patch: Partial<CalendarData> = {
    pattern: a.pattern, startDate: a.startDate, overrides: a.overrides, extras: a.extras,
    shiftTypes: a.shiftTypes, notes: a.notes, overtime: a.overtime, icons: a.icons, photos: a.photos, alarmOff: a.alarmOff, extraIncome: a.extraIncome, dayAlarms: a.dayAlarms,
  };
  return {
    ...s,
    onboarded: a.onboarded,
    job: a.job,
    settings: a.settings,
    calendars: s.calendars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export const calendarSchedule = (c: CalendarData): Schedule => ({
  pattern: c.pattern,
  startDate: fromKey(c.startDate),
  overrides: c.overrides,
  extras: c.extras,
  alarmOff: c.alarmOff,
  dayAlarms: c.dayAlarms,
});

export function addCalendar(s: Store, cal: CalendarData): Store {
  return { ...s, calendars: [...s.calendars, cal], activeId: cal.id, compareId: s.compareId === cal.id ? null : s.compareId };
}

export function removeCalendar(s: Store, id: string): Store {
  if (s.calendars.length <= 1) return s;
  const calendars = s.calendars.filter((c) => c.id !== id);
  const activeId = s.activeId === id ? calendars[0].id : s.activeId;
  return { ...s, calendars, activeId, compareId: s.compareId === id || s.compareId === activeId ? null : s.compareId };
}

export const renameCalendar = (s: Store, id: string, name: string): Store => ({
  ...s,
  calendars: s.calendars.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)),
});

export const setCalendarAlarms = (s: Store, id: string, alarms: boolean): Store => ({
  ...s,
  calendars: s.calendars.map((c) => (c.id === id ? { ...c, alarms } : c)),
});

export function switchCalendar(s: Store, id: string): Store {
  return { ...s, activeId: id, compareId: s.compareId === id ? null : s.compareId };
}
