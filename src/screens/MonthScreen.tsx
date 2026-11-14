import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { RangeEditPanel } from '../components/RangeEditPanel';
import { monthGridFull, toKey } from '../core/dates';
import { Clip, eraseRange, pasteClip, repeatRange, repeatUntil, setRange, sortRange } from '../core/rangeEdit';
import { emojiFor } from '../core/icons';
import { Schedule, shiftsFor } from '../core/schedule';
import { alarmOffsets } from '../core/shiftTypes';
import { AppState, ShiftType } from '../core/types';
import { tap } from '../haptics';
import { Text, makeStyles, useTheme } from '../theme';

type Props = {
  cursor: { y: number; m: number };
  onCursor: (c: { y: number; m: number }) => void;
  schedule: Schedule;
  shiftTypes: ShiftType[];
  notes: Record<string, string>;
  icons: Record<string, string[]>;
  weekStart: 0 | 1;
  restDays?: Record<string, 'warn' | 'bad'>; // days that break a rest / overtime rule
  compare?: { name: string; schedule: Schedule; byId: Record<string, ShiftType> };
  onPaint: (dateKey: string, shiftId: string | null) => void;
  onEditDay: (dateKey: string) => void;
  onOpenShifts: () => void;
  onApply: (fn: (prev: AppState) => AppState) => void; // range edits go through the app state
  readClip: (from: Date, to: Date) => Clip;
  onAddToCalendar: (from: Date, to: Date) => void;
};

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const THICK = 2.5;
const THIN = 0.5;

export function MonthScreen({ cursor, onCursor, schedule, shiftTypes, notes, icons, weekStart, restDays, compare, onPaint, onEditDay, onOpenShifts, onApply, readClip, onAddToCalendar }: Props) {
  const styles = useStyles();
  const { c } = useTheme();
  const now = new Date();
  const todayKey = toKey(now);
  // Edit mode: pick a range of days, then change them all at once.
  const [editMode, setEditMode] = useState(false);
  const [range, setRange_] = useState<{ from: Date; to: Date }>({ from: now, to: now });
  const [secondTap, setSecondTap] = useState(false); // the next tap completes the range
  const [panelOpen, setPanelOpen] = useState(false); // the range popup
  const [clip, setClip] = useState<Clip>([]);
  const [message, setMessage] = useState('');
  const [brush, setBrush] = useState<string | null | undefined>(undefined); // undefined = palette closed; null = eraser
  const byId = useMemo(() => Object.fromEntries(shiftTypes.map((s) => [s.id, s])), [shiftTypes]);
  const weeks = monthGridFull(cursor.y, cursor.m, weekStart);
  const dayNames = weekStart === 0 ? DAYS : [...DAYS.slice(1), DAYS[0]];

  const go = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    onCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goRef = useRef(go);
  goRef.current = go;

  // Swipe left / right on the grid changes the month.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) goRef.current(1);
        else if (g.dx > 50) goRef.current(-1);
      },
    }),
  ).current;

  // Back leaves edit mode / closes the paint palette first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editMode) { if (panelOpen) setPanelOpen(false); else setEditMode(false); return true; }
      if (brush !== undefined) { setBrush(undefined); return true; }
      return false;
    });
    return () => sub.remove();
  }, [brush, editMode, panelOpen]);

  const startKey = toKey(range.from);
  const endKey = toKey(range.to);
  const [lo, hi] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];

  const press = (key: string, date: Date) => {
    tap();
    if (editMode) {
      // first box = one day; a second box (after closing the popup) extends the range
      if (secondTap) setRange_({ from: range.from, to: date });
      else { setRange_({ from: date, to: date }); setSecondTap(true); }
      setPanelOpen(true);
      return;
    }
    if (brush !== undefined) return onPaint(key, brush);
    onEditDay(key);
  };

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2500);
  };
  const [a, b] = sortRange(range.from, range.to);
  // After an edit the popup closes and the next box starts a new selection.
  const finish = (text: string) => { flash(text); setPanelOpen(false); setSecondTap(false); };
  const apply = (fn: (prev: AppState) => AppState, text: string) => { onApply(fn); finish(text); };

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <View style={styles.page}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => go(-1)} hitSlop={12}><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={() => go(1)} hitSlop={12}><Text style={styles.arrow}>›</Text></Pressable>
      </View>
      {compare && <Text style={styles.cmpNote}>Small tags show {compare.name}'s shifts</Text>}
      <View style={styles.weekRow}>
        {dayNames.map((d) => <Text key={d} style={styles.weekday}>{d}</Text>)}
      </View>

      <View style={styles.grid} {...pan.panHandlers}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.row}>
            {week.map((g, di) => {
              const key = toKey(g.date);
              if (!g.inMonth) {
                return (
                  <View key={di} style={styles.out}>
                    <Text style={styles.outDate}>{g.date.getDate()}</Text>
                  </View>
                );
              }
              // heavy outline around the current month: thick on sides that touch another month
              const up = weeks[wi - 1]?.[di]?.inMonth;
              const down = weeks[wi + 1]?.[di]?.inMonth;
              const left = week[di - 1]?.inMonth;
              const right = week[di + 1]?.inMonth;
              const all = shiftsFor(schedule, byId, g.date);
              const multi = all.length > 1;
              const s = all[0];
              const isToday = key === todayKey;
              const cmp = compare ? shiftsFor(compare.schedule, compare.byId, g.date)[0] : undefined;
              const hasAlarm = all.some((x) => alarmOffsets(x).length > 0) && !schedule.alarmOff?.[key];
              const marks = (icons[key] ?? []).slice(0, 3).map(emojiFor).join('') + (notes[key] ? '✎' : '');
              const label = (x: ShiftType) => (x.textColor ?? (x.start ? '#FFFFFF' : x.color));
              return (
                <Pressable
                  key={di}
                  onPress={() => press(key, g.date)}
                  style={[
                    styles.cell,
                    {
                      borderTopWidth: up ? THIN : THICK,
                      borderBottomWidth: down ? THIN : THICK,
                      borderLeftWidth: left ? THIN : THICK,
                      borderRightWidth: right ? THIN : THICK,
                      backgroundColor: !s || multi ? c.card : s.start ? s.color : s.color + '33',
                    },
                  ]}
                >
                  {multi && (
                    <View style={styles.stack}>
                      {all.map((x, i) => (
                        <View key={i} style={[styles.block, { backgroundColor: x.start ? x.color : x.color + '55' }]}>
                          <Text style={[styles.blockText, { color: label(x) }]} numberOfLines={1}>{x.code}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {!multi && s ? (
                    <Text style={[styles.code, { color: s.textColor ?? (s.start ? '#FFFFFF' : s.color), fontSize: s.textSize ?? 12 }]} numberOfLines={2}>{s.code}</Text>
                  ) : null}
                  <View style={styles.top} pointerEvents="none">
                    <Text style={styles.alarm}>{hasAlarm ? '⏰' : ''}</Text>
                    <View style={[styles.dateBubble, isToday && styles.todayBubble]}>
                      <Text style={[styles.date, !isToday && !s?.start && { color: c.text }, !isToday && !!s?.start && !multi && { color: '#FFFFFF' }, isToday && styles.todayDate]}>{g.date.getDate()}</Text>
                    </View>
                  </View>
                  {restDays?.[key] ? <View style={[styles.restDot, { backgroundColor: restDays[key] === 'bad' ? '#DC2626' : '#F59E0B' }]} pointerEvents="none"><Text style={styles.restDotText}>!</Text></View> : null}
                  {marks ? <Text style={styles.marks} pointerEvents="none">{marks}</Text> : null}
                  {cmp ? <View style={[styles.cmp, { backgroundColor: cmp.color }]}><Text style={styles.cmpText}>{cmp.code}</Text></View> : null}
                  {editMode && (panelOpen || secondTap) && key >= lo && key <= hi ? <View style={styles.sel} pointerEvents="none" /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {editMode ? (
        <View style={styles.editBar}>
          <Pressable style={styles.exitEdit} onPress={() => { setEditMode(false); setPanelOpen(false); setSecondTap(false); }}><Text style={styles.exitEditText}>EXIT EDIT MODE</Text></Pressable>
        </View>
      ) : brush === undefined ? (
        <View style={styles.bottom}>
          <Pressable style={styles.bottomBtn} onPress={() => { tap(); setBrush(null); }}><Text style={styles.bottomText}>PAINT</Text></Pressable>
          <Pressable style={styles.bottomBtn} onPress={() => { tap(); setEditMode(true); setSecondTap(false); setPanelOpen(false); setRange_({ from: now, to: now }); }}><Text style={styles.bottomText}>EDIT</Text></Pressable>
          <Pressable style={styles.bottomBtn} onPress={() => { tap(); onOpenShifts(); }}><Text style={styles.bottomText}>SHIFTS</Text></Pressable>
        </View>
      ) : (
        <View style={styles.palette}>
          <Pressable style={styles.close} onPress={() => setBrush(undefined)}><Text style={styles.closeText}>⌄</Text></Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable onPress={() => setBrush(null)} style={[styles.chip, styles.eraser, brush === null && styles.chipOn]}>
              <Text style={styles.eraserText}>✕</Text>
            </Pressable>
            {shiftTypes.map((s) => (
              <Pressable key={s.id} onPress={() => setBrush(s.id)} style={[styles.chip, { backgroundColor: s.start ? s.color : s.color + '55' }, brush === s.id && styles.chipOn]}>
                <Text style={[styles.chipText, { color: s.textColor ?? (s.start ? '#fff' : s.color) }]} numberOfLines={1}>{s.code}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {editMode && message ? <View style={styles.toast} pointerEvents="none"><Text style={styles.toastText}>{message}</Text></View> : null}
      {editMode && !panelOpen && !secondTap ? <Text style={styles.editHint} pointerEvents="none">Tap a day to edit it</Text> : null}

      {editMode && panelOpen && (
        <RangeEditPanel
          onClose={() => setPanelOpen(false)}
          from={range.from}
          to={range.to}
          onFrom={(d) => setRange_((r) => ({ ...r, from: d }))}
          onTo={(d) => setRange_((r) => ({ ...r, to: d }))}
          shiftTypes={shiftTypes}
          clipLength={clip.length}
          message={message}
          onSet={(id) => apply((prev) => setRange(prev, a, b, id), 'Shift set')}
          onRepeat={(n) => apply((prev) => repeatRange(prev, a, b, n), `Repeated x${n}`)}
          onRepeatUntil={(d) => apply((prev) => repeatUntil(prev, a, b, d), 'Repeated')}
          onCopy={() => { setClip(readClip(a, b)); finish('Copied'); }}
          onCut={() => { setClip(readClip(a, b)); apply((prev) => eraseRange(prev, a, b), 'Cut'); }}
          onPaste={() => (clip.length ? apply((prev) => pasteClip(prev, a, clip), 'Pasted') : flash('Nothing copied yet'))}
          onErase={() => apply((prev) => eraseRange(prev, a, b), 'Erased')}
          onCalendar={() => { setPanelOpen(false); setSecondTap(false); onAddToCalendar(a, b); }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  arrow: { fontSize: 38, color: c.text, paddingHorizontal: 8, lineHeight: 42 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  cmpNote: { textAlign: 'center', color: c.muted, fontSize: 12 },
  weekRow: { flexDirection: 'row', paddingHorizontal: 6, paddingTop: 4 },
  weekday: { flex: 1, textAlign: 'center', color: c.text2, fontSize: 12, fontWeight: '800', paddingBottom: 4 },
  grid: { flex: 1, marginHorizontal: 6, marginBottom: 6 },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderColor: c.text, overflow: 'hidden' },
  out: { flex: 1, padding: 3, alignItems: 'flex-end' },
  outDate: { color: c.placeholder, fontSize: 12, opacity: 0.6 },
  stack: { ...{ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }, paddingTop: 22 },
  block: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  blockText: { fontSize: 10, fontWeight: '800' },
  code: { position: 'absolute', left: 0, right: 0, top: '38%', textAlign: 'center', fontWeight: '600' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 2 },
  alarm: { fontSize: 9 },
  dateBubble: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  todayBubble: { backgroundColor: '#FFFFFFE6' },
  date: { fontSize: 13, fontWeight: '600' },
  todayDate: { color: '#DC2626', fontWeight: '900' },
  restDot: { position: 'absolute', right: 3, bottom: 3, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  restDotText: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 12 },
  marks: { position: 'absolute', left: 3, bottom: 2, fontSize: 10, color: c.text },
  cmp: { position: 'absolute', bottom: 3, right: 3, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  cmpText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  toast: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: '#000000CC', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 9 },
  toastText: { color: '#fff', fontWeight: '700' },
  editHint: { position: 'absolute', bottom: 92, alignSelf: 'center', backgroundColor: '#000000AA', color: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden', fontSize: 13 },
  editBar: { backgroundColor: '#4C0E14', paddingVertical: 14, paddingBottom: 22, alignItems: 'center' },
  exitEdit: { borderWidth: 1.5, borderColor: '#FFFFFF66', borderRadius: 26, paddingHorizontal: 34, paddingVertical: 13 },
  exitEditText: { color: '#FFFFFFCC', fontWeight: '800', fontSize: 15 },
  sel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: c.accent, backgroundColor: '#14B8A622' },
  bottom: { flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: 14 },
  bottomBtn: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  bottomText: { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  palette: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, paddingBottom: 14, paddingTop: 8 },
  close: { paddingHorizontal: 14 },
  closeText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  chips: { gap: 8, paddingRight: 12, alignItems: 'center' },
  chip: { minWidth: 64, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 3, borderColor: 'transparent' },
  chipOn: { borderColor: '#111827' },
  chipText: { fontWeight: '700', fontSize: 13 },
  eraser: { backgroundColor: '#E5E7EB' },
  eraserText: { fontSize: 18, color: '#374151' },
}));
