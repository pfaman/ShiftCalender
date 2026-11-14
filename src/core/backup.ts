import { migrate, Store } from './store';

export const BACKUP_APP = 'shiftcalender';
// 1 = single calendar (flat), 2 = all calendars
export const BACKUP_VERSION = 2;

export type BackupFile = { app: string; version: number; exportedAt: string; data: Store };

// Photos are files on this phone, so they are not part of the backup.
export const makeBackup = (data: Store, now = new Date()): BackupFile => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  data: { ...data, calendars: data.calendars.map((c) => ({ ...c, photos: {} })) },
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Checks one calendar's data (also the whole file for a version 1 backup).
function validateCalendar(d: Record<string, unknown>, label: string): void {
  const bad = (what: string) => new Error(`Backup is damaged (${what}${label}).`);
  if (!isObj(d.pattern) || !isStr(d.pattern.id) || !isStr(d.pattern.name) || !Array.isArray(d.pattern.cycle) || d.pattern.cycle.length === 0 || !d.pattern.cycle.every(isStr)) throw bad('pattern');
  if (!isStr(d.startDate) || !DATE_RE.test(d.startDate)) throw bad('start date');
  if (!isObj(d.overrides) || !Object.entries(d.overrides).every(([k, v]) => DATE_RE.test(k) && isStr(v))) throw bad('painted days');
  if (d.extras !== undefined && !(isObj(d.extras) && Object.entries(d.extras).every(([k, v]) => DATE_RE.test(k) && Array.isArray(v) && v.every(isStr)))) throw bad('extra shifts');
  if (!Array.isArray(d.shiftTypes) || d.shiftTypes.length === 0) throw bad('shift types');
  for (const s of d.shiftTypes) {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.name) || !isStr(s.code) || !isStr(s.color) || !isNum(s.breakMin) || !isNum(s.alarmMinBefore)) throw bad('shift types');
    if ((s.alarm2MinBefore !== undefined && !isNum(s.alarm2MinBefore)) || (s.start2 !== undefined && !isStr(s.start2)) || (s.end2 !== undefined && !isStr(s.end2))) throw bad('shift types');
    if (s.actions !== undefined && !isObj(s.actions)) throw bad('shift types');
    for (const k of ['textColor'] as const) if (s[k] !== undefined && !isStr(s[k])) throw bad('shift types');
    for (const k of ['textSize', 'rate', 'extraRate', 'manualMinutes'] as const) if (s[k] !== undefined && !isNum(s[k])) throw bad('shift types');
  }
  if (d.notes !== undefined && !(isObj(d.notes) && Object.values(d.notes).every(isStr))) throw bad('notes');
  if (d.icons !== undefined && !(isObj(d.icons) && Object.entries(d.icons).every(([k, v]) => DATE_RE.test(k) && Array.isArray(v) && v.every(isStr)))) throw bad('icons');
  if (d.alarmOff !== undefined && !(isObj(d.alarmOff) && Object.entries(d.alarmOff).every(([k, v]) => DATE_RE.test(k) && typeof v === 'boolean'))) throw bad('alarm days');
  if (d.extraIncome !== undefined && !(isObj(d.extraIncome) && Object.values(d.extraIncome).every(isNum))) throw bad('extra income');
  if (d.dayAlarms !== undefined && !(isObj(d.dayAlarms) && Object.entries(d.dayAlarms).every(([k, v]) => DATE_RE.test(k) && Array.isArray(v) && v.every((t) => isStr(t) && /^\d{2}:\d{2}$/.test(t))))) throw bad('day alarms');
  if (d.overtime !== undefined && !(isObj(d.overtime) && Object.values(d.overtime).every(isNum))) throw bad('overtime');
}

// Parses and validates a backup file's text into a Store. Throws an Error with a user-facing message.
export function parseBackup(text: string): Store {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isObj(json) || json.app !== BACKUP_APP || !isObj(json.data)) throw new Error('This is not a Shift Calendar backup.');
  if (!isNum(json.version) || json.version > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the app.');
  const d = json.data;
  if (d.settings !== undefined && !isObj(d.settings)) throw new Error('Backup is damaged (settings).');

  if (json.version === 1) {
    validateCalendar(d, '');
  } else {
    if (!Array.isArray(d.calendars) || d.calendars.length === 0) throw new Error('Backup is damaged (calendars).');
    d.calendars.forEach((c, i) => {
      if (!isObj(c)) throw new Error('Backup is damaged (calendars).');
      validateCalendar(c, ` in calendar ${i + 1}`);
    });
  }
  // Missing optional parts fall back to defaults inside migrate; the backup is always "set up".
  return { ...migrate(d), onboarded: true };
}
