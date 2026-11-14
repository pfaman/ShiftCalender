import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { DAY_ICONS } from '../core/icons';
import { formatTime, shiftTimeLabel } from '../core/shiftTypes';
import { ShiftType } from '../core/types';
import { Text, TextInput, makeStyles, useTheme } from '../theme';
import { TimeField } from './TimeField';

const NONE = 'none';

// A centered popup with a red title bar, like the reference app's ADD SHIFT dialog.
export function Popup({ title, visible, onClose, children, footer }: { title: string; visible: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const styles = useStyles();
  // lift the popup above the keyboard so OK / CANCEL stay reachable
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={[styles.fill, { paddingBottom: 24 + kb }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {children}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

export function Footer({ onCancel, onOk }: { onCancel: () => void; onOk?: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.footer}>
      <Pressable style={[styles.btn, styles.cancel]} onPress={onCancel}><Text style={styles.cancelText}>CANCEL</Text></Pressable>
      {onOk ? <Pressable style={[styles.btn, styles.ok]} onPress={onOk}><Text style={styles.okText}>OK</Text></Pressable> : null}
    </View>
  );
}

// ADD SHIFT: pick one of your shifts.
export function ShiftPickerPopup({ visible, shiftTypes, onPick, onClose }: { visible: boolean; shiftTypes: ShiftType[]; onPick: (id: string) => void; onClose: () => void }) {
  const styles = useStyles();
  return (
    <Popup title="ADD SHIFT" visible={visible} onClose={onClose} footer={<Footer onCancel={onClose} />}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={styles.list}>
        {shiftTypes.map((sh) => {
          const ink = sh.textColor ?? (sh.start ? '#fff' : sh.color);
          return (
            <Pressable key={sh.id} style={[styles.bar, { backgroundColor: sh.start ? sh.color : sh.color + '55' }]} onPress={() => onPick(sh.id)}>
              <Text style={[styles.barName, { color: ink }]} numberOfLines={1}>{sh.name}</Text>
              {sh.start ? <Text style={[styles.barTime, { color: ink }]}>({shiftTimeLabel(sh)})</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Popup>
  );
}

// ICON: pick the icon for one of the day's three icon slots.
export function IconPickerPopup({ visible, value, onPick, onClose }: { visible: boolean; value: string; onPick: (id: string) => void; onClose: () => void }) {
  const styles = useStyles();
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <Popup title="ICON" visible={visible} onClose={onClose} footer={<Footer onCancel={onClose} />}>
      <ScrollView style={{ maxHeight: height * 0.6 }}>
        {[{ id: NONE, emoji: '', label: 'None' }, ...DAY_ICONS].map((i) => (
          <Pressable key={i.id} style={styles.iconRow} onPress={() => onPick(i.id)}>
            <Text style={styles.iconEmoji}>{i.emoji}</Text>
            <Text style={[styles.iconLabel, value === i.id && { color: c.accent, fontWeight: '800' }]}>{i.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Popup>
  );
}

// EXTRA HOURS: extra worked time and extra income for the day.
export function ExtraHoursPopup({ visible, hours, income, currency, onSave, onClose }: { visible: boolean; hours: number; income: number; currency: string; onSave: (hours: number, income: number) => void; onClose: () => void }) {
  const styles = useStyles();
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [inc, setInc] = useState('');
  const [seen, setSeen] = useState(false);
  // load the current values each time the popup opens
  if (visible && !seen) {
    setSeen(true);
    setH(String(Math.floor(hours)));
    setM(String(Math.round((hours % 1) * 60)));
    setInc(income > 0 ? String(income) : '');
  }
  if (!visible && seen) setSeen(false);

  const digits = (t: string) => t.replace(/\D/g, '');
  const save = () => {
    const hh = Math.min(24, parseInt(digits(h), 10) || 0);
    const mm = Math.min(59, parseInt(digits(m), 10) || 0);
    const money = Number(inc.replace(',', '.'));
    onSave(hh + mm / 60, Number.isFinite(money) && money > 0 ? money : 0);
    onClose();
  };
  return (
    <Popup title="EXTRA HOURS" visible={visible} onClose={onClose} footer={<Footer onCancel={onClose} onOk={save} />}>
      <View style={styles.form}>
        <Text style={styles.label}>Extra time worked</Text>
        <View style={styles.inline}>
          <TextInput style={[styles.input, styles.num]} keyboardType="number-pad" value={h} onChangeText={(t) => setH(digits(t))} maxLength={2} />
          <Text style={styles.unit}>h</Text>
          <TextInput style={[styles.input, styles.num]} keyboardType="number-pad" value={m} onChangeText={(t) => setM(digits(t))} maxLength={2} />
          <Text style={styles.unit}>m</Text>
        </View>
        <Text style={styles.label}>Extra income ({currency})</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0" value={inc} onChangeText={setInc} />
        <Text style={styles.hint}>Extra time is paid at your overtime rate. Extra income is added on top.</Text>
      </View>
    </Popup>
  );
}

// ALARMS: switch the day's shift alarms and add up to two custom alarms.
export function AlarmsPopup({ visible, alarmOff, shiftTimes, custom, onSave, onClose }: { visible: boolean; alarmOff: boolean; shiftTimes: string[]; custom: string[]; onSave: (alarmOff: boolean, custom: string[]) => void; onClose: () => void }) {
  const styles = useStyles();
  const { c } = useTheme();
  const [off, setOff] = useState(false);
  const [times, setTimes] = useState<(string | null)[]>([null, null]);
  const [seen, setSeen] = useState(false);
  if (visible && !seen) {
    setSeen(true);
    setOff(alarmOff);
    setTimes([custom[0] ?? null, custom[1] ?? null]);
  }
  if (!visible && seen) setSeen(false);

  const save = () => {
    onSave(off, times.filter((t): t is string => !!t).sort());
    onClose();
  };
  return (
    <Popup title="ALARMS" visible={visible} onClose={onClose} footer={<Footer onCancel={onClose} onOk={save} />}>
      <View style={styles.form}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { flex: 1 }]}>Alarms of this day's shifts</Text>
          <Switch value={!off} onValueChange={(on) => setOff(!on)} trackColor={{ true: c.primary }} />
        </View>
        <Text style={styles.hint}>{shiftTimes.length ? shiftTimes.map(formatTime).join(' · ') : 'The shifts of this day have no alarms.'}</Text>

        <Text style={[styles.label, { marginTop: 10 }]}>Custom alarms</Text>
        {times.map((t, i) => (
          <View key={i} style={styles.alarmRow}>
            <Pressable style={styles.check} onPress={() => setTimes((cur) => cur.map((x, j) => (j === i ? (x ? null : '08:00') : x)))}>
              <Text style={styles.box}>{t ? '☑' : '☐'}</Text>
              <Text style={styles.checkLabel}>Alarm {i + 1}</Text>
            </Pressable>
            {t ? <View style={{ width: 170 }}><TimeField label="" value={t} onChange={(v) => setTimes((cur) => cur.map((x, j) => (j === i ? v : x)))} /></View> : null}
          </View>
        ))}
      </View>
    </Popup>
  );
}

const useStyles = makeStyles((c) => ({
  fill: { flex: 1, justifyContent: 'center', padding: 24 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000099' },
  card: { backgroundColor: c.card, borderRadius: 28, overflow: 'hidden', elevation: 12 },
  title: { backgroundColor: '#B71C2B', color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 20, paddingVertical: 16 },
  list: { padding: 16, gap: 8 },
  bar: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  barName: { fontSize: 18, fontWeight: '700' },
  barTime: { fontSize: 12, marginTop: 1 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 9, paddingHorizontal: 22 },
  iconEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  iconLabel: { fontSize: 17 },
  form: { padding: 18, gap: 8 },
  label: { fontWeight: '700', fontSize: 15 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, backgroundColor: c.card },
  num: { width: 80, textAlign: 'center' },
  unit: { fontSize: 18, color: c.muted },
  hint: { fontSize: 12, color: c.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alarmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { fontSize: 24, color: c.accent },
  checkLabel: { fontSize: 16 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 6 },
  btn: { flex: 1, borderRadius: 26, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  cancel: { borderColor: '#DC2626' },
  cancelText: { fontWeight: '800', color: c.text2 },
  ok: { borderColor: c.primary, backgroundColor: c.primary },
  okText: { fontWeight: '800', color: '#fff' },
}));
