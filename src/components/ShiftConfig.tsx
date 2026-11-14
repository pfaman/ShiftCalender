import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { isSplit, shiftHours } from '../core/shiftTypes';
import { BluetoothMode, ShiftActions, ShiftType, SoundMode } from '../core/types';
import { Text, TextInput, makeStyles, useTheme } from '../theme';
import { TimeField } from './TimeField';

type Props = {
  shift: ShiftType | null; // null = closed
  isNew: boolean;
  currency: string;
  onCurrency: (c: string) => void;
  onSave: (s: ShiftType) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

const BG_COLORS = [
  '#F5A524', '#F97316', '#DC2626', '#DB2777', '#7C3AED', '#4F46E5', '#0EA5E9', '#0F766E', '#16A34A', '#65A30D', '#9CA3AF', '#334155',
  '#FFF59D', '#FFCC80', '#F8BBD0', '#E1BEE7', '#B3E5FC', '#C8E6C9', '#FFCCBC', '#CFD8DC',
];
const TEXT_COLORS = ['#000000', '#404040', '#808080', '#B0B0B0', '#E0E0E0', '#FFFFFF'];
const SOUND: { v: SoundMode | undefined; l: string }[] = [
  { v: 'sound', l: 'Sound Mode' }, { v: 'vibrate', l: 'Vibration Mode' }, { v: 'silent', l: 'Silence Mode' }, { v: undefined, l: 'Do not change' },
];
const BT: { v: BluetoothMode | undefined; l: string }[] = [
  { v: 'on', l: 'Bluetooth ON' }, { v: 'off', l: 'Bluetooth OFF' }, { v: undefined, l: 'Do not change' },
];

type Tab = 'appearance' | 'schedule' | 'actions';

export function ShiftConfig(props: Props) {
  const { shift } = props;
  if (!shift) return null;
  // Re-mount per shift so the draft state starts from it.
  return <Editor key={shift.id} {...props} shift={shift} />;
}

function Editor({ shift, isNew, currency, onCurrency, onSave, onDelete, onClose }: Props & { shift: ShiftType }) {
  const styles = useStyles();
  const { c } = useTheme();
  const [draft, setDraft] = useState<ShiftType>(shift);
  const [tab, setTab] = useState<Tab>('appearance');
  const [rates, setRates] = useState({ rate: shift.rate ? String(shift.rate) : '', extra: shift.extraRate ? String(shift.extraRate) : '' });
  const set = (patch: Partial<ShiftType>) => setDraft((d) => ({ ...d, ...patch }));
  const setAction = (patch: Partial<ShiftActions>) => setDraft((d) => ({ ...d, actions: { ...d.actions, ...patch } }));
  const timed = !!draft.start;
  const split = isSplit(draft);
  const num = (t: string) => Math.max(0, parseInt(t.replace(/\D/g, ''), 10) || 0);
  const money = (t: string) => {
    const n = Number(t.replace(',', '.'));
    return t.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const calc = draft.manualMinutes === undefined;
  const shownMin = calc ? Math.round(shiftHours(draft) * 60) : draft.manualMinutes ?? 0;

  const save = () => {
    if (!draft.name.trim()) return Alert.alert('Shift', 'Please give the shift a name.');
    if (!draft.code.trim()) return Alert.alert('Shift', 'Please give the shift an abbreviation.');
    onSave({ ...draft, name: draft.name.trim(), code: draft.code.trim() });
    onClose();
  };

  const Check = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
    <Pressable style={styles.check} onPress={onPress}>
      <Text style={styles.box}>{on ? '☑' : '☐'}</Text>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );

  const Radio = <T,>({ opts, value, onChange }: { opts: { v: T | undefined; l: string }[]; value: T | undefined; onChange: (v: T | undefined) => void }) => (
    <View style={styles.radioBox}>
      {opts.map((o) => (
        <Pressable key={o.l} style={styles.radioRow} onPress={() => onChange(o.v)}>
          <View style={[styles.radio, value === o.v && styles.radioOn]}>{value === o.v ? <View style={styles.radioDot} /> : null}</View>
          <Text style={styles.radioLabel}>{o.l}</Text>
        </Pressable>
      ))}
    </View>
  );

  const preview = (
    <View style={[styles.preview, { backgroundColor: timed ? draft.color : draft.color + '55' }]}>
      <Text style={{ color: draft.textColor ?? (timed ? '#fff' : draft.color), fontSize: Math.min(draft.textSize ?? 13, 20), fontWeight: '700' }} numberOfLines={2}>{draft.code || 'New'}</Text>
    </View>
  );

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headTop}>
            <Pressable onPress={onClose} hitSlop={12}><Text style={styles.chev}>⌄</Text></Pressable>
            <Text style={styles.title}>SHIFTS CONFIGURATION</Text>
            {!isNew ? (
              <Pressable hitSlop={12} onPress={() => Alert.alert(`Delete "${shift.name}"?`, 'Days that use this shift will show nothing. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { onDelete(shift.id); onClose(); } },
              ])}><Text style={styles.trash}>🗑</Text></Pressable>
            ) : <View style={{ width: 24 }} />}
          </View>
          <Text style={styles.nameLabel}>Shift name</Text>
          <View style={styles.nameRow}>
            <TextInput style={styles.nameInput} value={draft.name} onChangeText={(name) => set({ name })} placeholder="e.g. Night" />
            {preview}
          </View>
          <View style={styles.tabs}>
            {(['appearance', 'schedule', 'actions'] as const).map((t) => (
              <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabOn]}>{t.toUpperCase()}</Text>
                <View style={[styles.underline, tab === t && styles.underlineOn]} />
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {tab === 'appearance' && (
            <>
              <Text style={styles.section}>ABBREVIATION</Text>
              <View style={styles.card}>
                <TextInput style={styles.input} value={draft.code} maxLength={8} onChangeText={(code) => set({ code })} placeholder="Abbreviation" />
              </View>
              <Text style={styles.section}>BACKGROUND COLOR</Text>
              <View style={[styles.card, styles.swatches]}>
                {BG_COLORS.map((col) => (
                  <Pressable key={col} onPress={() => set({ color: col })} style={[styles.swatch, { backgroundColor: col }, draft.color === col && styles.swatchOn]}>
                    {draft.color === col ? <Text style={styles.tick}>✓</Text> : null}
                  </Pressable>
                ))}
              </View>
              <Text style={styles.section}>TEXT COLOR</Text>
              <View style={[styles.card, styles.swatches]}>
                {TEXT_COLORS.map((col) => (
                  <Pressable key={col} onPress={() => set({ textColor: col })} style={[styles.swatch, { backgroundColor: col, borderWidth: 1, borderColor: c.border }, draft.textColor === col && styles.swatchOn]}>
                    {draft.textColor === col ? <Text style={[styles.tick, { color: col === '#FFFFFF' || col === '#E0E0E0' ? '#000' : '#fff' }]}>✓</Text> : null}
                  </Pressable>
                ))}
                <Pressable onPress={() => set({ textColor: undefined })} style={[styles.autoBtn, draft.textColor === undefined && styles.swatchOn]}><Text style={styles.autoText}>Auto</Text></Pressable>
              </View>
              <Text style={styles.section}>TEXT SIZE</Text>
              <View style={[styles.card, styles.sliderRow]}>
                <Text style={styles.sizeValue}>{draft.textSize ?? 13}</Text>
                <Slider style={{ flex: 1, height: 40 }} minimumValue={8} maximumValue={24} step={1} value={draft.textSize ?? 13} onValueChange={(v) => set({ textSize: v })} minimumTrackTintColor={c.primary} thumbTintColor={c.primary} />
              </View>
            </>
          )}

          {tab === 'schedule' && (
            <>
              <Text style={styles.section}>SCHEDULE</Text>
              <View style={styles.card}>
                <Check
                  on={timed}
                  label="This shift has working hours"
                  onPress={() => set(timed
                    ? { start: undefined, end: undefined, start2: undefined, end2: undefined, breakMin: 0, alarmMinBefore: 0, alarm2MinBefore: 0, manualMinutes: undefined }
                    : { start: '09:00', end: '17:00', breakMin: 30, alarmMinBefore: 60 })}
                />
                {timed && (
                  <>
                    <View style={styles.timeBox}>
                      <TimeField label="Start" value={draft.start!} onChange={(start) => set({ start })} />
                      <Text style={styles.dash}>–</Text>
                      <TimeField label="End" value={draft.end!} onChange={(end) => set({ end })} />
                    </View>
                    <Check on={split} label="Split shift" onPress={() => set(split ? { start2: undefined, end2: undefined } : { start2: '16:00', end2: '20:00' })} />
                    {split && (
                      <View style={styles.timeBox}>
                        <TimeField label="Start" value={draft.start2!} onChange={(start2) => set({ start2 })} />
                        <Text style={styles.dash}>–</Text>
                        <TimeField label="End" value={draft.end2!} onChange={(end2) => set({ end2 })} />
                      </View>
                    )}
                    <View style={styles.inline}>
                      <TextInput style={[styles.input, styles.small]} keyboardType="number-pad" value={String(draft.breakMin)} onChangeText={(t) => set({ breakMin: num(t) })} />
                      <Text style={styles.inlineLabel}>Rest Time (minutes)</Text>
                    </View>
                    <View style={styles.inline}>
                      <Check on={calc} label="Calculate shift time" onPress={() => set({ manualMinutes: calc ? shownMin : undefined })} />
                      <TextInput
                        style={[styles.input, styles.tiny, calc && styles.readonly]}
                        editable={!calc}
                        keyboardType="number-pad"
                        value={String(Math.floor(shownMin / 60))}
                        onChangeText={(t) => set({ manualMinutes: num(t) * 60 + (shownMin % 60) })}
                      />
                      <Text style={styles.inlineLabel}>h</Text>
                      <TextInput
                        style={[styles.input, styles.tiny, calc && styles.readonly]}
                        editable={!calc}
                        keyboardType="number-pad"
                        value={String(shownMin % 60)}
                        onChangeText={(t) => set({ manualMinutes: Math.floor(shownMin / 60) * 60 + Math.min(59, num(t)) })}
                      />
                      <Text style={styles.inlineLabel}>m</Text>
                    </View>
                  </>
                )}
              </View>

              {timed && (
                <>
                  <Text style={styles.section}>SHIFT'S ALARMS</Text>
                  <View style={styles.cardTight}>
                    <View style={styles.alarmRow}>
                      <Check on={draft.alarmMinBefore > 0} label="Alarm 1" onPress={() => set({ alarmMinBefore: draft.alarmMinBefore > 0 ? 0 : 60 })} />
                      {draft.alarmMinBefore > 0 && minutesInput(draft.alarmMinBefore, (n) => set({ alarmMinBefore: n }))}
                    </View>
                    <View style={styles.alarmRow}>
                      <Check on={(draft.alarm2MinBefore ?? 0) > 0} label="Alarm 2" onPress={() => set({ alarm2MinBefore: (draft.alarm2MinBefore ?? 0) > 0 ? 0 : 30 })} />
                      {(draft.alarm2MinBefore ?? 0) > 0 && minutesInput(draft.alarm2MinBefore ?? 0, (n) => set({ alarm2MinBefore: n }))}
                    </View>
                  </View>
                </>
              )}

              <Text style={styles.section}>INCOMES</Text>
              <View style={styles.card}>
                <View style={styles.inline}>
                  <Text style={styles.inlineLabel}>Currency Symbol:</Text>
                  <TextInput style={[styles.input, styles.small, { textAlign: 'center' }]} maxLength={3} value={currency} onChangeText={onCurrency} />
                </View>
                <View style={styles.inline}>
                  <TextInput style={[styles.input, styles.flexInput]} keyboardType="decimal-pad" value={rates.rate} onChangeText={(t) => { setRates((r) => ({ ...r, rate: t })); set({ rate: money(t) }); }} placeholder="global rate" />
                  <Text style={styles.inlineLabel}>{currency} per hour</Text>
                </View>
                <View style={styles.inline}>
                  <TextInput style={[styles.input, styles.flexInput]} keyboardType="decimal-pad" value={rates.extra} onChangeText={(t) => { setRates((r) => ({ ...r, extra: t })); set({ extraRate: money(t) }); }} placeholder="rate × multiplier" />
                  <Text style={styles.inlineLabel}>{currency} per extra hour</Text>
                </View>
                {timed && <Check on={draft.nightDiff ?? draft.id === 'night'} label="Earns the night differential" onPress={() => set({ nightDiff: !(draft.nightDiff ?? draft.id === 'night') })} />}
              </View>
            </>
          )}

          {tab === 'actions' && (
            <>
              <Text style={styles.section}>SOUND</Text>
              <View style={styles.twoCol}>
                <View style={styles.col}><Text style={styles.colTitle}>At the start of the shift</Text><Radio opts={SOUND} value={draft.actions?.soundStart} onChange={(v) => setAction({ soundStart: v })} /></View>
                <View style={styles.col}><Text style={styles.colTitle}>At the end of the shift</Text><Radio opts={SOUND} value={draft.actions?.soundEnd} onChange={(v) => setAction({ soundEnd: v })} /></View>
              </View>
              <Text style={styles.section}>BLUETOOTH</Text>
              <View style={styles.twoCol}>
                <View style={styles.col}><Text style={styles.colTitle}>At the start of the shift</Text><Radio opts={BT} value={draft.actions?.bluetoothStart} onChange={(v) => setAction({ bluetoothStart: v })} /></View>
                <View style={styles.col}><Text style={styles.colTitle}>At the end of the shift</Text><Radio opts={BT} value={draft.actions?.bluetoothEnd} onChange={(v) => setAction({ bluetoothEnd: v })} /></View>
              </View>
              <Text style={styles.hint}>Silence Mode needs Do Not Disturb access (Menu → Settings → Phone actions). Bluetooth switching only works on Android 12 and older. These need a shift with working hours.</Text>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.footBtn} onPress={onClose}><Text style={styles.footText}>CANCEL</Text></Pressable>
          <Pressable style={styles.footBtn} onPress={save}><Text style={styles.footText}>SAVE</Text></Pressable>
        </View>
      </View>
    </Modal>
  );

  // a plain function (not a component) so the input keeps focus while typing
  function minutesInput(value: number, onChange: (n: number) => void) {
    return (
      <View style={styles.inline}>
        <TextInput style={[styles.input, styles.small]} keyboardType="number-pad" value={String(value)} onChangeText={(t) => onChange(num(t))} />
        <Text style={styles.inlineLabel}>min before</Text>
      </View>
    );
  }
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.header, paddingTop: 40, paddingHorizontal: 12 },
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chev: { color: c.onHeader, fontSize: 30, lineHeight: 30, width: 24 },
  title: { color: c.onHeader, fontSize: 18, fontWeight: '800' },
  trash: { fontSize: 20, width: 24 },
  nameLabel: { color: c.onHeader, fontWeight: '800', fontSize: 16, marginTop: 8 },
  nameRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  nameInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: '#111827', paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, color: '#111827' },
  preview: { width: 78, height: 50, borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 4 },
  tabs: { flexDirection: 'row', marginTop: 10 },
  tab: { flex: 1, alignItems: 'center', paddingTop: 8 },
  tabText: { color: c.onHeaderMuted, fontWeight: '800', fontSize: 14, paddingBottom: 8 },
  tabOn: { color: c.onHeader },
  underline: { height: 3, alignSelf: 'stretch' },
  underlineOn: { backgroundColor: '#5EEAD4' },
  body: { padding: 10, paddingBottom: 30 },
  section: { textAlign: 'center', fontWeight: '800', fontSize: 14, color: c.text2, marginTop: 14, marginBottom: 6 },
  card: { backgroundColor: c.card, borderRadius: 12, padding: 12, gap: 12, elevation: 1 },
  cardTight: { gap: 8 },
  input: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17, backgroundColor: c.card },
  small: { width: 90 },
  tiny: { width: 64, textAlign: 'center' },
  readonly: { backgroundColor: c.surface, color: c.muted },
  flexInput: { flex: 1 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: c.accent },
  tick: { color: '#fff', fontWeight: '900', fontSize: 18 },
  autoBtn: { height: 48, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  autoText: { fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeValue: { fontSize: 20, fontWeight: '700', color: c.muted, width: 32 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { fontSize: 24, color: c.accent },
  checkLabel: { fontSize: 16 },
  timeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'center' },
  dash: { fontSize: 20, color: c.muted, paddingHorizontal: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineLabel: { fontSize: 15 },
  alarmRow: { backgroundColor: c.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 8, gap: 6, elevation: 1 },
  colTitle: { textAlign: 'center', color: c.text2, fontSize: 13 },
  radioBox: { borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 6 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.text2, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.accent },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.accent },
  radioLabel: { fontSize: 14, flexShrink: 1 },
  hint: { fontSize: 12, color: c.muted, marginTop: 12, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, padding: 10, paddingBottom: 18, backgroundColor: c.surface },
  footBtn: { flex: 1, backgroundColor: c.text2, borderRadius: 26, paddingVertical: 15, alignItems: 'center' },
  footText: { color: c.card, fontWeight: '800', fontSize: 16 },
}));
