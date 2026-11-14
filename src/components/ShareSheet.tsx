import * as Sharing from 'expo-sharing';
import { ComponentRef, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { monthGrid } from '../core/dates';
import { Schedule, shiftsFor } from '../core/schedule';
import { computeStats } from '../core/stats';
import { DEFAULT_SETTINGS } from '../core/store';
import { TEAL } from '../core/shiftTypes';
import { useTheme } from '../theme';
import { ShiftType } from '../core/types';

export type ShareTarget = { y: number; m: number; view: 'month' | 'year' };

type Props = {
  target: ShareTarget | null;
  calendarName: string;
  schedule: Schedule;
  shiftTypes: ShiftType[];
  overtime: Record<string, number>;
  weekStart: 0 | 1;
  onClose: () => void;
};

const CARD_W = 360;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const weekdayLabels = (weekStart: 0 | 1) => (weekStart === 0 ? ['S', ...WEEKDAYS.slice(0, 6)] : WEEKDAYS);
const fill = (s: ShiftType) => (s.start ? s.color : s.color + '33');
const ink = (s: ShiftType) => s.textColor ?? (s.start ? '#FFFFFF' : s.color);

export function ShareSheet({ target, calendarName, schedule, shiftTypes, overtime, weekStart, onClose }: Props) {
  const { c: page } = useTheme();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [view, setView] = useState<'month' | 'year' | null>(null);
  const [busy, setBusy] = useState(false);
  if (!target) return null;
  const mode = view ?? target.view;
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share calendar' });
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const used = new Set<string>();
  const markUsed = (d: Date) => shiftsFor(schedule, byId, d).forEach((s) => used.add(s.id));

  const monthCard = (y: number, m: number) => {
    const weeks = monthGrid(y, m, weekStart);
    weeks.forEach((w) => w.forEach((d) => d && markUsed(d)));
    return weeks.map((week, wi) => (
      <View key={wi} style={styles.row}>
        {week.map((d, di) => {
          if (!d) return <View key={di} style={styles.cell} />;
          const all = shiftsFor(schedule, byId, d);
          const s = all[0];
          return (
            <View key={di} style={[styles.cell, { backgroundColor: s ? fill(s) : '#F3F4F6' }]}>
              <Text style={[styles.date, { color: s?.start ? '#FFFFFFD9' : '#374151' }]}>{d.getDate()}</Text>
              {all.length > 1 ? (
                <Text style={[styles.code, { color: ink(s) }]}>{all.map((x) => x.code).join('\n')}</Text>
              ) : s ? <Text style={[styles.code, { color: ink(s), fontSize: s.textSize ?? 12 }]}>{s.code}</Text> : null}
            </View>
          );
        })}
      </View>
    ));
  };

  const yearCard = (y: number) => {
    const cs = 11;
    return (
      <View style={styles.yearGrid}>
        {Array.from({ length: 12 }, (_, m) => (
          <View key={m} style={{ width: (CARD_W - 32 - 24) / 3 }}>
            <Text style={styles.miniName}>{new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short' })}</Text>
            {monthGrid(y, m, weekStart).map((week, wi) => (
              <View key={wi} style={styles.row}>
                {week.map((d, di) => {
                  if (!d) return <View key={di} style={{ width: cs, height: cs }} />;
                  markUsed(d);
                  const s = shiftsFor(schedule, byId, d)[0];
                  return <View key={di} style={{ width: cs, height: cs, margin: 0.5, borderRadius: 2, backgroundColor: s ? fill(s) : '#F3F4F6' }} />;
                })}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const stats = computeStats({ schedule, shiftTypes, overtime, settings: { ...DEFAULT_SETTINGS, weekStart } }, target.y, mode === 'month' ? target.m : null);
  const title = mode === 'month' ? new Date(target.y, target.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : String(target.y);
  const body = mode === 'month' ? monthCard(target.y, target.m) : yearCard(target.y);

  return (
    <Modal animationType="slide" visible onRequestClose={() => { setView(null); onClose(); }}>
      <ScrollView style={{ flex: 1, backgroundColor: page.bg }} contentContainerStyle={styles.page}>
        <View style={styles.toggle}>
          {(['month', 'year'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[styles.tab, mode === v && styles.tabOn]}>
              <Text style={[styles.tabText, mode === v && styles.tabTextOn]}>{v === 'month' ? 'Month' : 'Year'}</Text>
            </Pressable>
          ))}
        </View>

        <View ref={cardRef} collapsable={false} style={styles.card}>
          <Text style={styles.cal}>{calendarName}</Text>
          <Text style={styles.title}>{title}</Text>
          {mode === 'month' && (
            <View style={styles.row}>{weekdayLabels(weekStart).map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}</View>
          )}
          {body}
          <View style={styles.legend}>
            {shiftTypes.filter((s) => used.has(s.id)).map((s) => (
              <View key={s.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendText}>{s.code} {s.name}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.foot}>{Math.round(stats.hours)}h scheduled · made with Shift Calendar</Text>
        </View>

        <Pressable style={[styles.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={share}>
          <Text style={styles.btnText}>{busy ? 'Preparing…' : 'Share image'}</Text>
        </Pressable>
        <Pressable onPress={() => { setView(null); onClose(); }}><Text style={styles.close}>Close</Text></Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingTop: 64, alignItems: 'center', gap: 16 },
  toggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 16, padding: 4 },
  tab: { paddingHorizontal: 22, paddingVertical: 7, borderRadius: 12 },
  tabOn: { backgroundColor: TEAL },
  tabText: { color: '#374151', fontWeight: '600' },
  tabTextOn: { color: '#fff' },
  card: { width: CARD_W, backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  cal: { color: TEAL, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  row: { flexDirection: 'row' },
  weekday: { width: (CARD_W - 32) / 7, textAlign: 'center', color: '#6B7280', fontSize: 11, marginBottom: 4 },
  cell: { width: (CARD_W - 32) / 7 - 3, height: 54, margin: 1.5, borderRadius: 10, padding: 3, alignItems: 'center' },
  date: { fontSize: 10, fontWeight: '600', alignSelf: 'flex-start' },
  code: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  miniName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: '#374151' },
  foot: { marginTop: 12, fontSize: 10, color: '#9CA3AF' },
  btn: { backgroundColor: TEAL, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  close: { color: TEAL, fontSize: 16, paddingVertical: 6 },
});
