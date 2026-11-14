import { fromKey, toKey } from './dates';
import { checkRest, RestRules } from './restCheck';
import { CalendarData, calendarSchedule, Store } from './store';
import { shiftsFor } from './schedule';
import { formatTime, shiftTimeLabel } from './shiftTypes';
import { ShiftType } from './types';

const NO_SHIFT = 'none';
const SEARCH_DAYS = 21; // look this far either side of the day
const CHECK_DAYS = 60;

export type SwapOption = {
  otherDate: string; // the day you would take over
  give: ShiftType; // your shift on the original day, which they take
  take: ShiftType; // their shift on `otherDate`, which you take
  giveForThem?: ShiftType; // `give` as it exists in their shift types (undefined: not found)
  takeForMe?: ShiftType; // `take` as it exists in your shift types (undefined: not found)
  myProblems: string[]; // new rest problems this swap would cause for you
  theirProblems: string[];
  distance: number; // days between the two dates
};

const byIdOf = (c: CalendarData) => Object.fromEntries(c.shiftTypes.map((s) => [s.id, s]));
const offId = (c: CalendarData) => (c.shiftTypes.some((s) => s.id === 'off') ? 'off' : NO_SHIFT);
const works = (s: ShiftType) => !!s.start && !!s.end;
const sameShift = (a: ShiftType, b: ShiftType) => a.id === b.id || (a.name === b.name && a.start === b.start && a.end === b.end);
const find = (c: CalendarData, s: ShiftType) => c.shiftTypes.find((t) => sameShift(t, s));

const workingOn = (c: CalendarData, dateKey: string) => shiftsFor(calendarSchedule(c), byIdOf(c), fromKey(dateKey)).filter(works);
const hasExtras = (c: CalendarData, dateKey: string) => (c.extras[dateKey] ?? []).length > 0;

const issueKeys = (c: CalendarData, rules: RestRules, now: Date) =>
  new Map(checkRest(calendarSchedule(c), byIdOf(c), c.overtime, now, CHECK_DAYS, rules).map((i) => [`${i.kind}-${i.dateKey}`, i.title]));

// Problems a modified calendar has that the original did not.
function newProblems(before: CalendarData, after: CalendarData, rules: RestRules, now: Date): string[] {
  const was = issueKeys(before, rules, now);
  const out: string[] = [];
  for (const [k, title] of issueKeys(after, rules, now)) if (!was.has(k)) out.push(`${title} (${k.split('-').slice(1).join('-')})`);
  return out;
}

const withOverrides = (c: CalendarData, patch: Record<string, string>): CalendarData => ({ ...c, overrides: { ...c.overrides, ...patch } });

// Ways to hand your shift on `dateKey` to `partner`: you take one of their shifts on a day you are free,
// and they take yours. Both of you are free on the day you give up.
export function findSwaps(me: CalendarData, partner: CalendarData, dateKey: string, rules: RestRules, now = new Date()): SwapOption[] {
  const mine = workingOn(me, dateKey);
  if (mine.length !== 1 || hasExtras(me, dateKey)) return [];
  const give = mine[0];
  if (workingOn(partner, dateKey).length > 0 || hasExtras(partner, dateKey)) return []; // they would have to be free that day

  const day = fromKey(dateKey);
  const today = toKey(now);
  const out: SwapOption[] = [];
  for (let d = -SEARCH_DAYS; d <= SEARCH_DAYS; d++) {
    if (d === 0) continue;
    const other = toKey(new Date(day.getFullYear(), day.getMonth(), day.getDate() + d));
    if (other < today) continue;
    const theirs = workingOn(partner, other);
    if (theirs.length !== 1 || hasExtras(partner, other)) continue;
    if (workingOn(me, other).length > 0 || hasExtras(me, other)) continue; // you must be free to take it
    const take = theirs[0];
    const takeForMe = find(me, take);
    const giveForThem = find(partner, give);

    // what each calendar would look like after the swap (only checked where the shift exists on that side)
    const myAfter = takeForMe ? withOverrides(me, { [dateKey]: offId(me), [other]: takeForMe.id }) : undefined;
    const theirAfter = giveForThem ? withOverrides(partner, { [dateKey]: giveForThem.id, [other]: offId(partner) }) : undefined;
    out.push({
      otherDate: other, give, take, giveForThem, takeForMe,
      myProblems: myAfter ? newProblems(me, myAfter, rules, now) : [],
      theirProblems: theirAfter ? newProblems(partner, theirAfter, rules, now) : [],
      distance: Math.abs(d),
    });
  }
  // clean swaps first, then the closest dates
  const bad = (o: SwapOption) => o.myProblems.length + o.theirProblems.length;
  return out.sort((a, b) => bad(a) - bad(b) || a.distance - b.distance).slice(0, 8);
}

const dateText = (key: string) => fromKey(key).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
const shiftText = (s: ShiftType) => `${s.name}${s.start ? ` (${shiftTimeLabel(s) || formatTime(s.start)})` : ''}`;

// A ready-to-send message for the request.
export function swapMessage(partnerName: string, dateKey: string, o: SwapOption): string {
  return [
    `Hi ${partnerName}, could we swap shifts?`,
    '',
    `I'd take your ${shiftText(o.take)} on ${dateText(o.otherDate)},`,
    `and you'd take my ${shiftText(o.give)} on ${dateText(dateKey)}.`,
    '',
    `We would each be free on the day we hand over. Does that work for you?`,
  ].join('\n');
}

// Both calendars with the swap applied. Only call when takeForMe / giveForThem exist (see canApply).
export const canApply = (o: SwapOption) => !!o.takeForMe && !!o.giveForThem;

export function applySwap(store: Store, meId: string, partnerId: string, dateKey: string, o: SwapOption): Store {
  if (!canApply(o)) return store;
  return {
    ...store,
    calendars: store.calendars.map((c) => {
      if (c.id === meId) return withOverrides(c, { [dateKey]: offId(c), [o.otherDate]: o.takeForMe!.id });
      if (c.id === partnerId) return withOverrides(c, { [dateKey]: o.giveForThem!.id, [o.otherDate]: offId(c) });
      return c;
    }),
  };
}
