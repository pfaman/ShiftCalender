import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { monthGrid, toKey } from '../core/dates';
import { Schedule, shiftsFor } from '../core/schedule';
import { ShiftType } from '../core/types';
import { Text, makeStyles, useTheme } from '../theme';

type Props = {
  year: number; // the year shown in the header tab
  schedule: Schedule;
  shiftTypes: ShiftType[];
  weekStart: 0 | 1;
  onPickMonth: (year: number, month: number) => void;
};

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PAD = 16;
const GAP = 14;

// Every month of a range of years, two per row. Tap a month to open it.
export function YearScreen({ year, schedule, shiftTypes, weekStart, onPickMonth }: Props) {
  const styles = useStyles();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [from, setFrom] = useState(year);
  const [to, setTo] = useState(year);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [page, setPage] = useState(0); // first year shown in the picker grid
  // follow the header year (it changes when you open a month of another year)
  useEffect(() => { setFrom(year); setTo(year); }, [year]);
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const todayKey = toKey(new Date());

  const colW = (width - PAD * 2 - GAP) / 2;
  const cell = Math.floor(colW / 7);
  const letters = weekStart === 0 ? LETTERS : [...LETTERS.slice(1), LETTERS[0]];
  const first = Math.min(from, to);
  const last = Math.max(from, to);
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const choices = Array.from({ length: 20 }, (_, i) => page + i);
  const openPicker = (which: 'from' | 'to', value: number) => { setPage(value - (value % 20)); setPicking(which); };

  const pill = (which: 'from' | 'to', value: number) => (
    <Pressable style={styles.pill} onPress={() => openPicker(which, value)}>
      <Text style={styles.pillText}>{value}</Text>
    </Pressable>
  );

  return (
    <View style={styles.page}>
      <View style={styles.pills}>
        {pill('from', from)}
        {pill('to', to)}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {years.map((y) => (
          <View key={y}>
            {years.length > 1 && <Text style={styles.yearTitle}>{y}</Text>}
            <View style={styles.months}>
              {Array.from({ length: 12 }, (_, m) => (
                <Pressable key={m} style={{ width: colW }} onPress={() => onPickMonth(y, m)}>
                  <Text style={styles.monthName}>{new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}</Text>
                  <View style={styles.row}>
                    {letters.map((l, i) => <Text key={i} style={[styles.letter, { width: cell }]}>{l}</Text>)}
                  </View>
                  {monthGrid(y, m, weekStart).map((week, wi) => (
                    <View key={wi} style={styles.row}>
                      {week.map((d, di) => {
                        if (!d) return <View key={di} style={{ width: cell, height: cell }} />;
                        const all = shiftsFor(schedule, byId, d);
                        const s = all[0];
                        const isToday = toKey(d) === todayKey;
                        return (
                          <View
                            key={di}
                            style={[
                              styles.day,
                              { width: cell, height: cell, backgroundColor: !s ? c.card : s.start ? s.color : s.color + '40' },
                              isToday && styles.today,
                            ]}
                          >
                            <Text style={[styles.dayText, { color: s?.start ? '#fff' : c.text }, isToday && { color: s?.start ? '#fff' : '#DC2626', fontWeight: '900' }]}>{d.getDate()}</Text>
                            {all.length > 1 && <View style={[styles.second, { backgroundColor: all[1].color }]} />}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal transparent animationType="fade" visible={picking !== null} onRequestClose={() => setPicking(null)}>
        <View style={styles.modal}>
          <Pressable style={styles.backdrop} onPress={() => setPicking(null)} />
          <View style={styles.sheet}>
            <View style={styles.pageRow}>
              <Pressable hitSlop={12} onPress={() => setPage((p) => p - 20)}><Text style={styles.pageArrow}>‹</Text></Pressable>
              <Text style={styles.pageTitle}>{page} – {page + 19}</Text>
              <Pressable hitSlop={12} onPress={() => setPage((p) => p + 20)}><Text style={styles.pageArrow}>›</Text></Pressable>
            </View>
            <View style={styles.grid}>
              {choices.map((y) => {
                const on = (picking === 'from' ? from : to) === y;
                return (
                  <Pressable key={y} style={[styles.choice, on && { backgroundColor: c.primary }]} onPress={() => { if (picking === 'from') setFrom(y); else setTo(y); setPicking(null); }}>
                    <Text style={[styles.choiceText, on && { color: '#fff', fontWeight: '900' }]}>{y}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.bg },
  pills: { flexDirection: 'row', gap: GAP, paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 6 },
  pill: { flex: 1, borderWidth: 1.5, borderColor: c.text2, borderRadius: 22, paddingVertical: 10, alignItems: 'center' },
  pillText: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: PAD, paddingBottom: 40 },
  yearTitle: { fontSize: 22, fontWeight: '900', marginTop: 8, marginBottom: 6 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: 10 },
  monthName: { textAlign: 'center', fontWeight: '800', fontSize: 15, marginVertical: 6 },
  row: { flexDirection: 'row' },
  letter: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: c.text2, paddingBottom: 2 },
  day: { borderWidth: 0.7, borderColor: c.text2, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: '#DC2626' },
  dayText: { fontSize: 11, fontWeight: '600' },
  second: { position: 'absolute', right: 1, bottom: 1, width: 6, height: 6, borderRadius: 3 },
  modal: { flex: 1, justifyContent: 'center', padding: 24 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000080' },
  sheet: { backgroundColor: c.card, borderRadius: 20, padding: 8 },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  pageArrow: { fontSize: 34, color: c.text, lineHeight: 38 },
  pageTitle: { fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  choice: { width: '25%', paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  choiceText: { fontSize: 16 },
}));
