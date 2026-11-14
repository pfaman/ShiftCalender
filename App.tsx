import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState as RNAppState, BackHandler } from 'react-native';
import { getAlarmPermissions, syncAlarms } from './src/alarms';
import { exportBackup, pickBackup } from './src/backup';
import { checkRest, issueDays } from './src/core/restCheck';
import { applySwap } from './src/core/swap';
import { initTelemetry, track } from './src/telemetry';
import { AppHeader, MainTab } from './src/components/AppHeader';
import { AvailableShifts } from './src/components/AvailableShifts';
import { CalendarSwitcher } from './src/components/CalendarSwitcher';
import { DayDialog } from './src/components/DayDialog';
import { applyDay, DayDraft, dayInitial, EMPTY_DRAFT } from './src/core/day';
import { ExitDialog } from './src/components/ExitDialog';
import { MenuSheet } from './src/components/MenuSheet';
import { SettingsModal } from './src/components/SettingsModal';
import { ShareSheet, ShareTarget } from './src/components/ShareSheet';
import { ShiftConfig } from './src/components/ShiftConfig';
import { Shell } from './src/components/Shell';
import { addEvents, planEvents, writableCalendars, CalendarChoice } from './src/calendarExport';
import { fromKey } from './src/core/dates';
import { readRange } from './src/core/rangeEdit';
import { Schedule, shiftIdFor } from './src/core/schedule';
import { ptoSummary } from './src/core/stats';
import {
  activeCalendar, addCalendar, calendarSchedule, CalendarData, flatten, initialStore, newCalendar,
  removeCalendar, renameCalendar, setCalendarAlarms, Store, switchCalendar, unflatten,
} from './src/core/store';
import { AppState, ShiftType } from './src/core/types';
import { MonthScreen } from './src/screens/MonthScreen';
import { Onboarding } from './src/screens/Onboarding';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { Welcome } from './src/screens/Welcome';
import { YearScreen } from './src/screens/YearScreen';
import { syncShiftActions } from './src/shiftActions';
import { loadStore, saveStore } from './src/storage';
import { ThemeProvider } from './src/theme';
import { refreshWidgets } from './src/widgets/refresh';

const blankShift = (): ShiftType => ({
  id: `custom-${Date.now()}`, name: '', code: '', color: '#0EA5E9', start: '09:00', end: '17:00', breakMin: 30, alarmMinBefore: 60,
});

export default function App() {
  const [store, setStore] = useState<Store>(initialStore);
  const [loaded, setLoaded] = useState(false);
  const now0 = new Date();
  const [main, setMain] = useState<MainTab>('month');
  const [cursor, setCursor] = useState({ y: now0.getFullYear(), m: now0.getMonth() });
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [shiftsOpen, setShiftsOpen] = useState(false);
  const [config, setConfig] = useState<{ shift: ShiftType; isNew: boolean } | null>(null);
  const [menu, setMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [calChoice, setCalChoice] = useState<{ choices: CalendarChoice[]; count: number; add: (id: string) => void } | null>(null);
  const [perms, setPerms] = useState<{ notifications: boolean; exact: boolean } | null>(null);

  // The active calendar + global settings in the flat shape; updates are written back into the store.
  const state = useMemo(() => flatten(store), [store]);
  const setState = useCallback((u: AppState | ((p: AppState) => AppState)) => {
    setStore((prev) => unflatten(prev, typeof u === 'function' ? u(flatten(prev)) : u));
  }, []);

  useEffect(() => {
    initTelemetry().then(() => track('app_open'));
  }, []);

  useEffect(() => {
    loadStore().then((s) => {
      setStore(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveStore(store);
  }, [store, loaded]);

  // Alarm permission status drives the warning icon in the header.
  const refreshPerms = useCallback(() => {
    getAlarmPermissions().then(setPerms).catch(() => {});
  }, []);
  useEffect(() => {
    refreshPerms();
    const sub = RNAppState.addEventListener('change', (s) => s === 'active' && refreshPerms());
    return () => sub.remove();
  }, [refreshPerms]);

  // Paint mode: the day becomes exactly this shift (extras cleared); null resets it to the pattern.
  const onPaint = useCallback((dateKey: string, shiftId: string | null) => {
    setState((prev) => {
      const overrides = { ...prev.overrides };
      const extras = { ...prev.extras };
      if (shiftId) overrides[dateKey] = shiftId;
      else delete overrides[dateKey];
      delete extras[dateKey];
      return { ...prev, overrides, extras };
    });
  }, [setState]);

  // OK in the day dialog: apply everything at once.
  const onSaveDay = useCallback((key: string, d: DayDraft) => {
    track('day_saved', { shifts: d.shifts.filter((x) => x !== 'none').length, note: !!d.note, photo: !!d.photo, icons: d.icons.length, extra: d.overtime > 0 || d.extraIncome > 0 });
    setState((prev) => applyDay(prev, key, d));
  }, [setState]);

  const onSaveShiftType = useCallback((st: ShiftType) => {
    setState((prev) => {
      const exists = prev.shiftTypes.some((s) => s.id === st.id);
      return { ...prev, shiftTypes: exists ? prev.shiftTypes.map((s) => (s.id === st.id ? st : s)) : [...prev.shiftTypes, st] };
    });
  }, [setState]);

  // Copies shifts in with fresh ids so they never collide with existing ones.
  const onImportShifts = useCallback((shifts: ShiftType[]) => {
    setState((prev) => ({
      ...prev,
      shiftTypes: [...prev.shiftTypes, ...shifts.map((s, i) => ({ ...s, id: `imp-${Date.now().toString(36)}-${i}` }))],
    }));
  }, [setState]);

  const onDeleteShiftType = useCallback((id: string) => {
    setState((prev) => (prev.shiftTypes.length <= 1 ? prev : { ...prev, shiftTypes: prev.shiftTypes.filter((s) => s.id !== id) }));
  }, [setState]);

  const onReorder = useCallback((id: string, toIndex: number) => {
    setState((prev) => {
      const list = [...prev.shiftTypes];
      const from = list.findIndex((s) => s.id === id);
      if (from < 0) return prev;
      const [item] = list.splice(from, 1);
      list.splice(toIndex, 0, item);
      return { ...prev, shiftTypes: list };
    });
  }, [setState]);

  // Re-plan alarms whenever anything that affects them changes (debounced). Every calendar with alarms on rings.
  const alarmKey = JSON.stringify([
    store.calendars.map((c) => [c.alarms, c.pattern, c.startDate, c.overrides, c.extras, c.alarmOff, c.dayAlarms, c.shiftTypes]),
    store.settings.alarmsEnabled,
    store.onboarded,
  ]);
  const resyncRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!loaded || !store.onboarded) return;
    const run = () => {
      const sources = store.calendars.filter((c) => c.alarms).map((c) => ({ schedule: calendarSchedule(c), shiftTypes: c.shiftTypes }));
      syncAlarms({ enabled: store.settings.alarmsEnabled, sources }).catch(() => {});
      try {
        syncShiftActions({ enabled: store.settings.alarmsEnabled, sources });
      } catch {}
    };
    resyncRef.current = run;
    const t = setTimeout(run, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, alarmKey]);

  // Keep home-screen widgets in sync with the active calendar.
  useEffect(() => {
    if (loaded && state.onboarded) refreshWidgets(state);
  }, [loaded, state]);

  // EDIT mode -> "add to phone / Google calendar": writes the range's shifts as events into a calendar on the phone.
  const addRangeToCalendar = async (from: Date, to: Date) => {
    try {
      const events = planEvents(schedule, state.shiftTypes, from, to);
      if (events.length === 0) return Alert.alert('Nothing to add', 'There are no working shifts in this range.');
      const choices = await writableCalendars();
      if (choices.length === 0) return Alert.alert('No calendar found', 'This phone has no calendar that can be written to.');
      const confirm = (cal: CalendarChoice) =>
        Alert.alert('Add to calendar', `Add ${events.length} shift${events.length === 1 ? '' : 's'} to "${cal.title}"${cal.account ? ` (${cal.account})` : ''}?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: () => addEvents(cal.id, events)
              .then((n) => Alert.alert('Done', `${n} shift${n === 1 ? '' : 's'} added.`))
              .catch((e) => Alert.alert('Could not add', e instanceof Error ? e.message : 'Something went wrong')),
          },
        ]);
      if (choices.length === 1) confirm(choices[0]);
      else setCalChoice({ choices, count: events.length, add: (id) => confirm(choices.find((c) => c.id === id)!) });
    } catch (e) {
      Alert.alert('Calendar', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const onExport = useCallback(() => {
    exportBackup(store).catch((e) => Alert.alert('Export failed', e instanceof Error ? e.message : 'Something went wrong'));
  }, [store]);

  const onImport = useCallback(async () => {
    try {
      const imported = await pickBackup();
      if (!imported) return;
      Alert.alert('Replace all data?', 'Importing will overwrite all your calendars, shifts, notes and settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => setStore(imported) },
      ]);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Something went wrong');
    }
  }, []);

  // Android back: Year / Summary return to Month; from Month it asks before exiting.
  // Registered once, before any screen, so screens that handle back themselves (modals, the paint
  // palette, onboarding steps) get it first: the last registered listener runs first.
  const backState = useRef({ main, onboarded: store.onboarded, exitOpen });
  backState.current = { main, onboarded: store.onboarded, exitOpen };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const { main: t, onboarded, exitOpen: open } = backState.current;
      if (open) return false;
      if (onboarded && t !== 'month') {
        setMain('month');
        return true;
      }
      setExitOpen(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!loaded) return null;

  const active = activeCalendar(store);
  const schedule: Schedule = calendarSchedule(active);
  const restIssues = state.settings.restAlerts
    ? checkRest(schedule, Object.fromEntries(state.shiftTypes.map((s) => [s.id, s])), state.overtime, new Date(), 30, state.settings)
    : [];
  const rangeInput = { schedule, shiftTypes: state.shiftTypes, overtime: state.overtime, extraIncome: state.extraIncome, settings: state.settings };
  const compareCal: CalendarData | undefined = store.calendars.find((c) => c.id === store.compareId);
  const compare = compareCal
    ? { name: compareCal.name, schedule: calendarSchedule(compareCal), byId: Object.fromEntries(compareCal.shiftTypes.map((s) => [s.id, s])) }
    : undefined;
  const warn = !!perms && state.settings.alarmsEnabled && store.calendars.some((c) => c.alarms) && (!perms.notifications || !perms.exact);

  // turn the given working days into PTO (their extra shifts are cleared too)
  const bookLeave = (dateKeys: string[]) => {
    track('leave_booked', { days: dateKeys.length });
    setState((prev) => {
      const extras = { ...prev.extras };
      const overrides = { ...prev.overrides };
      for (const k of dateKeys) { overrides[k] = 'pto'; delete extras[k]; }
      return { ...prev, overrides, extras };
    });
  };

  const onboardingDone = (r: { job?: AppState['job']; pattern: AppState['pattern']; startDate: string; name?: string }) => {
    track(store.onboarded ? 'calendar_added' : 'onboarding_done', { job: r.job ?? 'none', pattern: r.pattern.id });
    if (!store.onboarded) {
      setState((prev) => ({ ...prev, job: r.job, pattern: r.pattern, startDate: r.startDate, onboarded: true, overrides: {}, extras: {} }));
      return;
    }
    // adding another calendar: it starts with a copy of the current shift types
    setStore((prev) =>
      addCalendar(prev, newCalendar(r.name?.trim() || `Calendar ${prev.calendars.length + 1}`, {
        pattern: r.pattern,
        startDate: r.startDate,
        shiftTypes: activeCalendar(prev).shiftTypes,
      })),
    );
    setCreating(false);
  };

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  return (
    <ThemeProvider pref={store.settings.theme}>
      <Shell>
        {!store.onboarded && !store.welcomed ? (
          <Welcome onDone={() => setStore((p) => ({ ...p, welcomed: true }))} />
        ) : state.onboarded && !creating ? (
          <>
            <AppHeader
              calendarName={active.name}
              tab={main}
              monthLabel={monthLabel}
              yearLabel={String(cursor.y)}
              warn={warn}
              onTab={setMain}
              onCalendars={() => setSwitcher(true)}
              onShare={() => setShare({ y: cursor.y, m: cursor.m, view: 'month' })}
              onMenu={() => setMenu(true)}
              onWarn={() => setSettingsOpen(true)}
            />
            {main === 'month' && (
              <MonthScreen
                cursor={cursor}
                onCursor={setCursor}
                compare={compare}
                schedule={schedule}
                shiftTypes={state.shiftTypes}
                notes={state.notes}
                icons={state.icons}
                weekStart={state.settings.weekStart}
                restDays={issueDays(restIssues)}
                onPaint={onPaint}
                onEditDay={setOpenDay}
                onOpenShifts={() => setShiftsOpen(true)}
                onApply={setState}
                readClip={(a, b) => readRange(state, a, b)}
                onAddToCalendar={addRangeToCalendar}
              />
            )}
            {main === 'year' && (
              <YearScreen
                year={cursor.y}
                schedule={schedule}
                shiftTypes={state.shiftTypes}
                weekStart={state.settings.weekStart}
                onPickMonth={(y, m) => { setCursor({ y, m }); setMain('month'); }}
              />
            )}
            {main === 'summary' && (
              <SummaryScreen onBookLeave={bookLeave} restIssues={state.settings.restAlerts ? restIssues : undefined} notes={state.notes} icons={state.icons} input={rangeInput} pto={(y) => ptoSummary(rangeInput, y, new Date())} />
            )}

            <DayDialog
              dateKey={openDay}
              shiftTypes={state.shiftTypes}
              currency={state.settings.currency}
              swap={{ store, onApply: (pid, o, key) => setStore((p) => applySwap(p, p.activeId, pid, key, o)) }}
              initial={openDay ? dayInitial(state, schedule, openDay) : EMPTY_DRAFT}
              onSave={onSaveDay}
              onClose={() => setOpenDay(null)}
            />
            <AvailableShifts
              visible={shiftsOpen}
              shiftTypes={state.shiftTypes}
              onCreate={() => setConfig({ shift: blankShift(), isNew: true })}
              onEdit={(s) => setConfig({ shift: s, isNew: false })}
              onReorder={onReorder}
              onClose={() => setShiftsOpen(false)}
              importSources={store.calendars.filter((c) => c.id !== store.activeId).map((c) => ({ name: c.name, shifts: c.shiftTypes }))}
              onLoadImportFile={async () => {
                const imported = await pickBackup();
                return imported ? imported.calendars.map((c) => ({ name: c.name, shifts: c.shiftTypes })) : null;
              }}
              onImportShifts={onImportShifts}
            />
            <ShiftConfig
              shift={config?.shift ?? null}
              isNew={config?.isNew ?? false}
              currency={state.settings.currency}
              onCurrency={(currency) => setState((prev) => ({ ...prev, settings: { ...prev.settings, currency } }))}
              onSave={onSaveShiftType}
              onDelete={onDeleteShiftType}
              onClose={() => setConfig(null)}
            />
            <MenuSheet
              visible={menu}
              onClose={() => setMenu(false)}
              items={[
                { icon: '📅', label: 'Calendars', onPress: () => setSwitcher(true) },
                { icon: '⚙️', label: 'Settings', onPress: () => setSettingsOpen(true) },
                { icon: '🖼️', label: 'Share calendar image', onPress: () => setShare({ y: cursor.y, m: cursor.m, view: 'month' }) },
                { icon: '📤', label: 'Export backup', onPress: onExport },
                { icon: '📥', label: 'Import backup', onPress: onImport },
              ]}
            />
            <MenuSheet
              visible={!!calChoice}
              onClose={() => setCalChoice(null)}
              items={(calChoice?.choices ?? []).map((c) => ({ icon: '📆', label: c.account ? `${c.title} (${c.account})` : c.title, onPress: () => calChoice?.add(c.id) }))}
            />
            <SettingsModal
              visible={settingsOpen}
              settings={state.settings}
              onChange={(settings) => setState((prev) => ({ ...prev, settings }))}
              onResync={() => { resyncRef.current(); refreshPerms(); }}
              onExport={onExport}
              onImport={onImport}
              onClose={() => { setSettingsOpen(false); refreshPerms(); }}
            />
            <CalendarSwitcher
              visible={switcher}
              store={store}
              onClose={() => setSwitcher(false)}
              onSwitch={(id) => { setStore((p) => switchCalendar(p, id)); setSwitcher(false); }}
              onNew={() => { setSwitcher(false); setCreating(true); }}
              onRename={(id, name) => setStore((p) => renameCalendar(p, id, name))}
              onDelete={(id) => setStore((p) => removeCalendar(p, id))}
              onToggleAlarms={(id, on) => setStore((p) => setCalendarAlarms(p, id, on))}
              onCompare={(id) => setStore((p) => ({ ...p, compareId: p.compareId === id ? null : id }))}
            />
            <ShareSheet
              target={share}
              calendarName={active.name}
              schedule={schedule}
              shiftTypes={state.shiftTypes}
              overtime={state.overtime}
              weekStart={state.settings.weekStart}
              onClose={() => setShare(null)}
            />
          </>
        ) : (
          <Onboarding
            mode={store.onboarded ? 'new' : 'first'}
            shiftTypes={state.shiftTypes}
            onDone={onboardingDone}
            onCancel={() => setCreating(false)}
          />
        )}
        <ExitDialog visible={exitOpen} onStay={() => setExitOpen(false)} onExit={() => BackHandler.exitApp()} />
      </Shell>
    </ThemeProvider>
  );
}
