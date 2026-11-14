import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { fromKey } from '../core/dates';
import { activeCalendar, calendarSchedule, Store } from '../core/store';
import { shiftsFor } from '../core/schedule';
import { shiftTimeLabel } from '../core/shiftTypes';
import { applySwap, canApply, findSwaps, swapMessage, SwapOption } from '../core/swap';
import { track } from '../telemetry';
import { Text, makeStyles } from '../theme';
import { Footer, Popup } from './DayPopups';

type Props = {
  visible: boolean;
  dateKey: string;
  store: Store;
  onApply: (partnerId: string, option: SwapOption) => void; // the swap is applied to both calendars
  onClose: () => void;
};

const label = (key: string) => fromKey(key).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

// Suggests ways to hand today's shift to someone else and writes the request message.
export function SwapSheet({ visible, dateKey, store, onApply, onClose }: Props) {
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const me = activeCalendar(store);
  const partners = store.calendars.filter((c) => c.id !== me.id);
  const [pick, setPick] = useState<string | null>(null);
  const partner = partners.find((c) => c.id === pick) ?? partners.find((c) => c.id === store.compareId) ?? partners[0];

  const myShifts = useMemo(
    () => shiftsFor(calendarSchedule(me), Object.fromEntries(me.shiftTypes.map((s) => [s.id, s])), fromKey(dateKey)).filter((s) => s.start),
    [me, dateKey],
  );
  const options = useMemo(() => (visible && partner ? findSwaps(me, partner, dateKey, store.settings) : []), [visible, me, partner, dateKey, store.settings]);

  const send = (o: SwapOption) => {
    track('swap_request_shared');
    Share.share({ message: swapMessage(partner!.name, dateKey, o) }).catch(() => {});
  };
  const agree = (o: SwapOption) =>
    Alert.alert(
      'Swap agreed?',
      `This updates both calendars: you take ${o.take.name} on ${label(o.otherDate)}, ${partner!.name} takes your ${o.give.name} on ${label(dateKey)}.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Update both', onPress: () => { track('swap_applied'); onApply(partner!.id, o); } },
      ],
    );

  let body;
  if (!partner) {
    body = <Text style={styles.note}>Add your partner's or a colleague's calendar first (menu → Calendars → New). Then you can swap shifts with them here.</Text>;
  } else if (myShifts.length !== 1) {
    body = <Text style={styles.note}>{myShifts.length === 0 ? 'You have no shift on this day to swap.' : 'This day has more than one shift. Swap works on days with a single shift.'}</Text>;
  } else if (options.length === 0) {
    body = <Text style={styles.note}>No swap fits. {partner.name} must be free on {label(dateKey)}, and you must be free on the day you take over.</Text>;
  } else {
    body = (
      <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={styles.list}>
        {options.map((o) => {
          const problems = [...o.myProblems.map((p) => `You: ${p}`), ...o.theirProblems.map((p) => `${partner.name}: ${p}`)];
          return (
            <View key={o.otherDate} style={styles.card}>
              <Text style={styles.line}>You take <Text style={styles.strong}>{o.take.name}</Text> on {label(o.otherDate)}</Text>
              <Text style={styles.sub}>{shiftTimeLabel(o.take)}</Text>
              <Text style={styles.line}>{partner.name} takes <Text style={styles.strong}>{o.give.name}</Text> on {label(dateKey)}</Text>
              {problems.length === 0 ? (
                <Text style={styles.good}>✅ Rest rules stay OK for both</Text>
              ) : (
                problems.slice(0, 3).map((p, i) => <Text key={i} style={styles.warn}>⚠️ {p}</Text>)
              )}
              {!canApply(o) && <Text style={styles.sub}>One of you has no matching shift type, so it can't be applied automatically.</Text>}
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.send]} onPress={() => send(o)}><Text style={styles.sendText}>Send request</Text></Pressable>
                {canApply(o) && <Pressable style={[styles.btn, styles.agree]} onPress={() => agree(o)}><Text style={styles.agreeText}>Agreed</Text></Pressable>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <Popup title="SHIFT SWAP" visible={visible} onClose={onClose} footer={<Footer onCancel={onClose} />}>
      <View style={styles.body}>
        <Text style={styles.head}>Hand over your shift on {label(dateKey)}{myShifts[0] ? ` (${myShifts[0].name})` : ''}</Text>
        {partners.length > 1 && (
          <View style={styles.chips}>
            {partners.map((c) => (
              <Pressable key={c.id} onPress={() => setPick(c.id)} style={[styles.chip, partner?.id === c.id && styles.chipOn]}>
                <Text style={[styles.chipText, partner?.id === c.id && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {body}
      </View>
    </Popup>
  );
}

// kept next to the sheet so App only imports one thing
export { applySwap };

const useStyles = makeStyles((c) => ({
  body: { padding: 16, gap: 10 },
  head: { fontWeight: '800', fontSize: 16 },
  note: { color: c.text2, fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: c.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  list: { gap: 10 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 12, gap: 4 },
  line: { fontSize: 15 },
  strong: { fontWeight: '800' },
  sub: { fontSize: 12, color: c.muted },
  good: { color: '#16A34A', fontWeight: '700', marginTop: 4 },
  warn: { color: '#D97706', fontWeight: '600', fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 20, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5 },
  send: { borderColor: c.primary, backgroundColor: c.primary },
  sendText: { color: '#fff', fontWeight: '800' },
  agree: { borderColor: c.primary },
  agreeText: { color: c.accent, fontWeight: '800' },
}));
