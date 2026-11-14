import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { fromKey } from '../core/dates';
import { DayDraft, NO_SHIFT } from '../core/day';
import { DAY_ICONS } from '../core/icons';
import { alarmClockTimes, shiftTimeLabel } from '../core/shiftTypes';
import { ShiftType } from '../core/types';
import { deletePhoto, pickPhoto } from '../photos';
import { Text, TextInput, makeStyles, useTheme } from '../theme';
import { Store } from '../core/store';
import { SwapOption } from '../core/swap';
import { AlarmsPopup, ExtraHoursPopup, IconPickerPopup, ShiftPickerPopup } from './DayPopups';
import { SwapSheet } from './SwapSheet';

export { NO_SHIFT };

type Props = {
  dateKey: string | null;
  shiftTypes: ShiftType[];
  currency: string;
  initial: DayDraft;
  swap?: { store: Store; onApply: (partnerId: string, option: SwapOption, dateKey: string) => void };
  onSave: (dateKey: string, draft: DayDraft) => void;
  onClose: () => void;
};

const OFF_ID = 'off'; // the pattern's day off counts as a blank day

const compact = (ids: string[]) => {
  const used = ids.filter((id) => id !== NO_SHIFT);
  return [...used, ...Array(3 - used.length).fill(NO_SHIFT)] as DayDraft['shifts'];
};

// Edit one day. The big blank area adds shifts; the three selectors at the bottom pick icons.
// Nothing changes until OK.
export function DayDialog({ dateKey, shiftTypes, currency, initial, swap, onSave, onClose }: Props) {
  const styles = useStyles();
  const { c } = useTheme();
  const [draft, setDraft] = useState<DayDraft>(initial);
  const [zoom, setZoom] = useState(false);
  const [popup, setPopup] = useState<'shift' | 'extra' | 'alarms' | 'swap' | null>(null);
  const [iconSlot, setIconSlot] = useState<number | null>(null);

  useEffect(() => {
    setDraft(initial);
    setZoom(false);
    setIconSlot(null);
    // a blank day opens the ADD SHIFT popup straight away
    setPopup(dateKey && initial.shifts.every((id) => id === NO_SHIFT || id === OFF_ID) ? 'shift' : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  if (!dateKey) return null;
  const date = fromKey(dateKey);
  const set = (patch: Partial<DayDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const chosen = draft.shifts.filter((id) => id !== NO_SHIFT).map((id) => shiftTypes.find((s) => s.id === id)).filter((s): s is ShiftType => !!s);
  const full = chosen.filter((s) => s.id !== OFF_ID).length >= 3;
  const shiftTimes = [...new Set(chosen.flatMap(alarmClockTimes))].sort();
  const iconSlots = [0, 1, 2].map((i) => draft.icons[i] ?? NO_SHIFT);

  const addShift = (id: string) => {
    // a real shift replaces the day off; adding Off itself keeps the others
    const kept = id === OFF_ID ? draft.shifts : draft.shifts.map((s) => (s === OFF_ID ? NO_SHIFT : s));
    const slots = compact([...kept]);
    const free = slots.indexOf(NO_SHIFT);
    if (free >= 0) slots[free] = id;
    set({ shifts: slots });
  };
  const removeShift = (id: string) => {
    const slots = [...draft.shifts];
    const at = slots.indexOf(id);
    if (at >= 0) slots[at] = NO_SHIFT;
    set({ shifts: compact(slots) });
  };
  const setIcon = (slot: number, id: string) => {
    const slots = [...iconSlots];
    slots[slot] = id;
    set({ icons: slots.filter((x) => x !== NO_SHIFT) });
  };

  const cancel = () => {
    if (draft.photo && draft.photo !== initial.photo) deletePhoto(draft.photo); // photo added in this dialog
    onClose();
  };
  const save = () => {
    if (initial.photo && initial.photo !== draft.photo) deletePhoto(initial.photo);
    onSave(dateKey, { ...draft, note: draft.note.trim() });
    onClose();
  };
  const addPhoto = async (source: 'camera' | 'gallery') => {
    try {
      const uri = await pickPhoto(source, dateKey);
      if (!uri) return;
      if (draft.photo && draft.photo !== initial.photo) deletePhoto(draft.photo);
      set({ photo: uri });
    } catch (e) {
      Alert.alert('Photo', e instanceof Error ? e.message : 'Something went wrong');
    }
  };
  const title = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const alarmMarked = draft.dayAlarms.length > 0 || draft.alarmOff;

  return (
    <Modal animationType="slide" visible onRequestClose={cancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerDate}>{title}</Text>
          <Text style={styles.headerDay}>{date.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.noteRow}>
            <Pressable
              style={styles.camera}
              onPress={() => {
                if (draft.photo) setZoom(true);
                else Alert.alert('Add photo', undefined, [
                  { text: 'Camera', onPress: () => addPhoto('camera') },
                  { text: 'Gallery', onPress: () => addPhoto('gallery') },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            >
              {draft.photo ? <Image source={{ uri: draft.photo }} style={styles.photo} /> : <Text style={styles.cameraIcon}>📷</Text>}
            </Pressable>
            <TextInput style={styles.note} placeholder="No notes…" value={draft.note} onChangeText={(note) => set({ note })} multiline />
          </View>
          {draft.photo ? <Pressable onPress={() => set({ photo: undefined })}><Text style={styles.remove}>Remove photo</Text></Pressable> : null}

          <View style={styles.card}>
            <View style={styles.pillRow}>
              <Pressable style={styles.pill} onPress={() => setPopup('alarms')}>
                <Text style={styles.pillIcon}>⏰</Text>
                {alarmMarked ? <View style={styles.dot} /> : null}
              </Pressable>
              <Pressable style={styles.pill} onPress={() => setPopup('extra')}>
                <Text style={styles.pillIcon}>⏳</Text>
                {draft.overtime > 0 ? <Text style={styles.pillBadge}>+{Math.floor(draft.overtime)}h{Math.round((draft.overtime % 1) * 60) ? `${Math.round((draft.overtime % 1) * 60)}m` : ''}</Text> : null}
                {draft.extraIncome > 0 ? <Text style={styles.pillBadge}>{currency}{draft.extraIncome}</Text> : null}
              </Pressable>
              {swap ? (
                <Pressable style={styles.pill} onPress={() => setPopup('swap')}>
                  <Text style={styles.pillIcon}>🔄</Text>
                </Pressable>
              ) : null}
              <Text style={styles.bigDay}>{date.getDate()}</Text>
            </View>

            {/* the whole blank area adds a shift */}
            <Pressable style={styles.area} onPress={() => (full ? Alert.alert('Three shifts is the limit', 'Remove one to add another.') : setPopup('shift'))}>
              <ScrollView scrollEnabled={false} contentContainerStyle={styles.bars} pointerEvents="box-none">
                {chosen.map((sh) => {
                  const ink = sh.textColor ?? (sh.start ? '#fff' : sh.color);
                  return (
                    <View key={sh.id} style={[styles.shiftBar, { backgroundColor: sh.start ? sh.color : sh.color + '55' }]}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.shiftName, { color: ink }]} numberOfLines={1}>{sh.name}</Text>
                        {sh.start ? <Text style={[styles.shiftTime, { color: ink }]}>({shiftTimeLabel(sh)})</Text> : null}
                      </View>
                      <Pressable hitSlop={12} onPress={() => removeShift(sh.id)}><Text style={[styles.shiftRemove, { color: ink }]}>✕</Text></Pressable>
                    </View>
                  );
                })}
              </ScrollView>
              {chosen.length === 0 ? <Text style={styles.areaHint}>Tap anywhere to add a shift</Text> : null}
            </Pressable>

            <View style={styles.icons}>
              {iconSlots.map((id, i) => {
                const ic = DAY_ICONS.find((x) => x.id === id);
                return (
                  <Pressable key={i} style={styles.slot} onPress={() => setIconSlot(i)}>
                    <Text style={styles.slotText} numberOfLines={1}>{ic ? `${ic.emoji} ${ic.label}` : 'None'}</Text>
                    <Text style={styles.slotCaret}>▼</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.cancel]} onPress={cancel}><Text style={[styles.btnText, { color: c.danger }]}>CANCEL</Text></Pressable>
          <Pressable style={[styles.btn, styles.ok]} onPress={save}><Text style={[styles.btnText, { color: '#fff' }]}>OK</Text></Pressable>
        </View>

        <ShiftPickerPopup visible={popup === 'shift'} shiftTypes={shiftTypes} onPick={(id) => { addShift(id); setPopup(null); }} onClose={() => setPopup(null)} />
        <ExtraHoursPopup visible={popup === 'extra'} hours={draft.overtime} income={draft.extraIncome} currency={currency} onSave={(overtime, extraIncome) => set({ overtime, extraIncome })} onClose={() => setPopup(null)} />
        <AlarmsPopup visible={popup === 'alarms'} alarmOff={draft.alarmOff} shiftTimes={shiftTimes} custom={draft.dayAlarms} onSave={(alarmOff, dayAlarms) => set({ alarmOff, dayAlarms })} onClose={() => setPopup(null)} />
        {swap ? <SwapSheet visible={popup === 'swap'} dateKey={dateKey} store={swap.store} onApply={(pid, o) => { swap.onApply(pid, o, dateKey); setPopup(null); onClose(); }} onClose={() => setPopup(null)} /> : null}
        <IconPickerPopup visible={iconSlot !== null} value={iconSlot !== null ? iconSlots[iconSlot] : NO_SHIFT} onPick={(id) => { if (iconSlot !== null) setIcon(iconSlot, id); setIconSlot(null); }} onClose={() => setIconSlot(null)} />

        {zoom && draft.photo ? (
          <Pressable style={styles.zoom} onPress={() => setZoom(false)}>
            <Image source={{ uri: draft.photo }} style={styles.zoomImg} resizeMode="contain" />
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.header, paddingTop: 44, paddingHorizontal: 16, paddingBottom: 14 },
  headerDate: { color: c.onHeader, fontSize: 26, fontWeight: '900' },
  headerDay: { color: c.onHeaderMuted, fontSize: 14, fontWeight: '600' },
  body: { flex: 1, padding: 10, gap: 10 },
  noteRow: { flexDirection: 'row', gap: 8 },
  camera: { width: 74, minHeight: 100, borderRadius: 12, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 1 },
  cameraIcon: { fontSize: 34 },
  photo: { width: '100%', height: '100%' },
  note: { flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 12, minHeight: 100, fontSize: 16, textAlignVertical: 'top' },
  remove: { color: c.danger, fontWeight: '700', paddingLeft: 4 },
  card: { flex: 1, backgroundColor: c.card, borderRadius: 12, padding: 12, gap: 10, elevation: 1 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: c.primary, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8 },
  pillIcon: { fontSize: 22 },
  pillBadge: { fontWeight: '800', color: c.accent, fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#DC2626' },
  bigDay: { marginLeft: 'auto', fontSize: 34, fontWeight: '300' },
  area: { flex: 1, borderRadius: 10, justifyContent: 'flex-start' },
  bars: { gap: 8, paddingTop: 4 },
  shiftBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  shiftName: { fontSize: 18, fontWeight: '700' },
  shiftTime: { fontSize: 12, marginTop: 1 },
  shiftRemove: { fontSize: 20, paddingLeft: 10, fontWeight: '700' },
  areaHint: { position: 'absolute', top: '40%', alignSelf: 'center', color: c.muted, fontSize: 15 },
  icons: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6 },
  slotText: { flex: 1, fontSize: 13 },
  slotCaret: { color: c.text2, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, padding: 10, paddingBottom: 18 },
  btn: { flex: 1, borderRadius: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5 },
  cancel: { borderColor: c.danger, backgroundColor: c.card },
  ok: { borderColor: c.primary, backgroundColor: c.primary },
  btnText: { fontWeight: '800', fontSize: 15 },
  zoom: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000EE', justifyContent: 'center' },
  zoomImg: { width: '100%', height: '80%' },
}));
