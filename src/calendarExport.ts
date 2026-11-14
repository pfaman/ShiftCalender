import * as Calendar from 'expo-calendar';
import { PlannedEvent } from './core/calendarPlan';

export { planEvents } from './core/calendarPlan';

export type CalendarChoice = { id: string; title: string; account: string };

// Writable calendars on the phone (Google accounts included); the Google ones sync to Google Calendar.
export async function writableCalendars(): Promise<CalendarChoice[]> {
  const perm = await Calendar.requestCalendarPermissions();
  if (!perm.granted) throw new Error('Calendar permission is needed to add shifts to your calendar.');
  const all = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return all
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? '' }));
}

export async function addEvents(calendarId: string, events: PlannedEvent[]): Promise<number> {
  const all = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const cal = all.find((c) => c.id === calendarId);
  if (!cal) throw new Error('That calendar is no longer available.');
  let n = 0;
  for (const e of events) {
    await cal.createEvent({ title: e.title, startDate: e.start, endDate: e.end, notes: e.notes });
    n++;
  }
  return n;
}
