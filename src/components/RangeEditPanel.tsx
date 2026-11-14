import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { ShiftType } from '../core/types';
import { Text, makeStyles } from '../theme';

type Props = {
  onClose: () => void;
  from: Date;
  to: Date;
  onFrom: (d: Date) => void;
  onTo: (d: Date) => void;
  shiftTypes: ShiftType[];
  clipLength: number;
  message: string;
  onSet: (shiftId: string) => void;
  onRepeat: (times: number) => void;
  onRepeatUntil: (d: Date) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onErase: () => void;
  onCalendar: () => void;
};

const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });

// A date button that opens the picker only when tapped (Android opens it as soon as it renders).
function DatePill({ value, onChange, children }: { value: Date; onChange: (d: Date) => void; children: (open: () => void) => React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <>
      {children(() => setShow(true))}
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, d) => {
            setShow(false);
            if (e.type !== 'dismissed' && d) onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
          }}
        />
      )}
    </>
  );
}

// Edit mode: change a whole range of days at once (set shift, repeat, cut / copy / paste, erase).
export function RangeEditPanel(p: Props) {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const days = Math.round((Date.UTC(p.to.getFullYear(), p.to.getMonth(), p.to.getDate()) - Date.UTC(p.from.getFullYear(), p.from.getMonth(), p.from.getDate())) / 86400000) + 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={p.onClose}>
    <View style={styles.fill}>
    <Pressable style={styles.backdrop} onPress={p.onClose} />
    <View style={[styles.panel, { maxHeight: height * 0.8 }]}>
      <View style={styles.head}>
        <View style={styles.headCol}>
          <Text style={styles.headLabel}>FROM</Text>
          <DatePill value={p.from} onChange={p.onFrom}>{(open) => <Pressable style={styles.datePill} onPress={open}><Text style={styles.dateText}>{fmt(p.from)}</Text></Pressable>}</DatePill>
        </View>
        <View style={styles.headCol}>
          <Text style={styles.headLabel}>TO</Text>
          <DatePill value={p.to} onChange={p.onTo}>{(open) => <Pressable style={styles.datePill} onPress={open}><Text style={styles.dateText}>{fmt(p.to)}</Text></Pressable>}</DatePill>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.count}>{Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} selected · change FROM / TO to adjust the range</Text>

        <Text style={styles.section}>SET SHIFT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {p.shiftTypes.map((s) => (
            <Pressable key={s.id} style={[styles.chip, { backgroundColor: s.start ? s.color : s.color + '55' }]} onPress={() => p.onSet(s.id)}>
              <Text style={[styles.chipText, { color: s.textColor ?? (s.start ? '#fff' : s.color) }]} numberOfLines={2}>{s.code}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.section}>REPEAT SELECTED RANGE</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            {[10, 20, 30, 40].map((n) => (
              <Pressable key={n} style={styles.btn} onPress={() => p.onRepeat(n)}><Text style={styles.btnText}>x{n}</Text></Pressable>
            ))}
          </View>
          <DatePill value={p.to} onChange={p.onRepeatUntil}>
            {(open) => <Pressable style={styles.btnWide} onPress={open}><Text style={styles.btnText}>FROM... TO...</Text></Pressable>}
          </DatePill>
        </View>

        <Text style={styles.section}>EDIT</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Pressable style={styles.btn} onPress={p.onCut}><Text style={styles.btnText}>CUT</Text></Pressable>
            <Pressable style={styles.btn} onPress={p.onCopy}><Text style={styles.btnText}>COPY</Text></Pressable>
            <Pressable style={[styles.btn, p.clipLength === 0 && styles.off]} onPress={p.onPaste}>
              <Text style={styles.btnText}>PASTE{p.clipLength ? ` (${p.clipLength})` : ''}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.btnWide} onPress={p.onErase}><Text style={styles.btnText}>ERASE</Text></Pressable>
        </View>

        <Pressable style={styles.cal} onPress={p.onCalendar}><Text style={styles.calText}>UPLOAD TO GOOGLE CALENDAR</Text></Pressable>
        {p.message ? <Text style={styles.message}>{p.message}</Text> : null}
      </ScrollView>
    </View>
    </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  fill: { flex: 1, justifyContent: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000088' },
  panel: { backgroundColor: c.card, borderRadius: 28, overflow: 'hidden', elevation: 12 },
  head: { flexDirection: 'row', gap: 10, backgroundColor: '#B71C2B', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  headCol: { flex: 1, alignItems: 'center', gap: 2 },
  headLabel: { color: '#fff', fontWeight: '800', fontSize: 14 },
  datePill: { alignSelf: 'stretch', borderWidth: 2, borderColor: '#FFFFFF80', backgroundColor: '#FFFFFF2A', borderRadius: 24, paddingVertical: 10, alignItems: 'center' },
  dateText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  body: { padding: 12, paddingBottom: 16 },
  count: { textAlign: 'center', color: c.muted, fontSize: 12 },
  section: { textAlign: 'center', fontWeight: '800', fontSize: 14, color: c.text2, marginTop: 12, marginBottom: 6 },
  chips: { gap: 8, paddingHorizontal: 2 },
  chip: { width: 74, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 4 },
  chipText: { fontWeight: '600', textAlign: 'center', fontSize: 14 },
  box: { backgroundColor: c.card, borderRadius: 16, padding: 8, gap: 8, elevation: 2 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderWidth: 1.5, borderColor: c.text2, borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnWide: { borderWidth: 1.5, borderColor: c.text2, borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
  off: { opacity: 0.4 },
  cal: { marginTop: 14, backgroundColor: c.primary, borderRadius: 26, paddingVertical: 15, alignItems: 'center' },
  calText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  message: { textAlign: 'center', color: c.accent, fontWeight: '700', marginTop: 10 },
}));
