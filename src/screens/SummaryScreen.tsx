import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { DateField } from '../components/DateField';
import { Dropdown } from '../components/Dropdown';
import { fromKey } from '../core/dates';
import { DAY_ICONS, daysWithIcon, emojiFor } from '../core/icons';
import { nearbyNotes, searchNotes } from '../core/notes';
import { shiftsFor } from '../core/schedule';
import { computeRange, computeStats, PtoSummary, RangeInput } from '../core/stats';
import { planLeave, stretchLabel } from '../core/leave';
import { RestIssue } from '../core/restCheck';
import { shiftTimeLabel } from '../core/shiftTypes';
import { Text, TextInput, makeStyles } from '../theme';

type Props = { onBookLeave?: (dateKeys: string[]) => void; restIssues?: RestIssue[]; input: RangeInput; pto: (year: number) => PtoSummary; notes: Record<string, string>; icons: Record<string, string[]> };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const hm = (hours: number) => {
  const mins = Math.round(hours * 60);
  return `${Math.floor(mins / 60)}h,${mins % 60}m`;
};
const ICON_OPTIONS = DAY_ICONS.map((i) => ({ id: i.id, label: `${i.emoji}  ${i.label}` }));
const dateLabel = (key: string) => fromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Statistics (per-shift table), nearby notes, note search and find-days-by-icon, in that order.
export function SummaryScreen({ onBookLeave, restIssues, input, pto, notes, icons }: Props) {
  const styles = useStyles();
  const now = new Date();

  const [showAllRest, setShowAllRest] = useState(false);
  const [leaveDays, setLeaveDays] = useState(3); // how many leave days you can take
  // statistics
  const [mode, setMode] = useState<'month' | 'year' | 'range'>('month');
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [from, setFrom] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [to, setTo] = useState(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [excluded, setExcluded] = useState<Record<string, boolean>>({}); // shifts left out of the Global total
  // notes
  const [nearby, setNearby] = useState<'past' | 'upcoming'>('upcoming');
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  // icons
  const [iconId, setIconId] = useState(DAY_ICONS[0].id);
  const [pastDays, setPastDays] = useState(false);

  const { currency, hourlyRate } = input.settings;
  const stats = mode === 'range' ? computeRange(input, from, to) : computeStats(input, cursor.y, mode === 'month' ? cursor.m : null);
  const hasPay = hourlyRate > 0 || input.shiftTypes.some((s) => (s.rate ?? 0) > 0) || stats.earnings > 0;
  const rows = input.shiftTypes.filter((s) => (stats.perShift[s.id]?.count ?? 0) > 0);
  const global = rows.filter((s) => !excluded[s.id]).reduce((acc, s) => ({ count: acc.count + stats.perShift[s.id].count, hours: acc.hours + stats.perShift[s.id].hours }), { count: 0, hours: 0 });
  const p = pto(cursor.y);
  const max = Math.max(1, ...stats.buckets);
  const labels = stats.labels ?? (mode === 'year' ? 'JFMAMJJASOND'.split('') : stats.buckets.map((_, i) => `W${i + 1}`));
  const periodLabel = mode === 'month'
    ? new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
    : String(cursor.y);

  const move = (delta: number) => {
    const d = mode === 'month' ? new Date(cursor.y, cursor.m + delta, 1) : new Date(cursor.y + delta, cursor.m, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const nearbyList = nearbyNotes(notes, now, nearby);
  const found = searched.trim() ? searchNotes(notes, searched) : [];
  const byId = Object.fromEntries(input.shiftTypes.map((s) => [s.id, s]));
  const leaveOptions = planLeave(input.schedule, byId, new Date(now.getFullYear(), now.getMonth(), now.getDate()), 365, leaveDays);
  const canBook = !!onBookLeave && !!byId.pto;
  const ptoLeft = input.settings.ptoTotalHours > 0 && input.settings.ptoHoursPerDay > 0 ? Math.floor(pto(now.getFullYear()).left / input.settings.ptoHoursPerDay) : null;
  const book = (o: { from: string; to: string; leaveDays: string[] }) =>
    Alert.alert('Book as PTO?', `${o.leaveDays.length} working day${o.leaveDays.length === 1 ? '' : 's'} between ${stretchLabel({ ...o, totalDays: 0 })} become PTO in your calendar.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Book', onPress: () => onBookLeave?.(o.leaveDays) },
    ]);
  const iconDays = daysWithIcon(icons, iconId, now, pastDays);

  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) => (
    <View style={styles.seg}>
      {options.map((o, i) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segItem, i > 0 && styles.segDivider, value === o.id && styles.segOn]}>
          <Text style={[styles.segText, value === o.id && styles.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {restIssues && (
        <>
          <Text style={styles.section}>REST & OVERTIME CHECK · NEXT 30 DAYS</Text>
          <View style={styles.card}>
            {restIssues.length === 0 ? (
              <Text style={styles.okRow}>✅  No rest or overtime problems found.</Text>
            ) : (
              <>
                <Text style={styles.restCount}>{restIssues.length} thing{restIssues.length === 1 ? '' : 's'} to look at</Text>
                {(showAllRest ? restIssues : restIssues.slice(0, 5)).map((i, n) => (
                  <View key={`${i.dateKey}-${i.kind}-${n}`} style={[styles.restItem, { borderLeftColor: i.severity === 'bad' ? '#DC2626' : '#F59E0B' }]}>
                    <Text style={styles.restTitle}>{i.severity === 'bad' ? '🔴' : '🟠'}  {i.title}</Text>
                    <Text style={styles.itemDate}>{dateLabel(i.dateKey)}</Text>
                    <Text style={styles.restDetail}>{i.detail}</Text>
                  </View>
                ))}
                {restIssues.length > 5 && (
                  <Pressable onPress={() => setShowAllRest((v) => !v)}><Text style={styles.more}>{showAllRest ? 'Show fewer' : `Show all ${restIssues.length}`}</Text></Pressable>
                )}
              </>
            )}
          </View>
        </>
      )}

      <Text style={styles.section}>LEAVE PLANNER</Text>
      <View style={styles.card}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>I can take</Text>
          <Pressable style={styles.stepBtn} onPress={() => setLeaveDays((n) => Math.max(1, n - 1))} hitSlop={8}><Text style={styles.stepSign}>−</Text></Pressable>
          <Text style={styles.stepValue}>{leaveDays}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setLeaveDays((n) => Math.min(14, n + 1))} hitSlop={8}><Text style={styles.stepSign}>+</Text></Pressable>
          <Text style={styles.stepLabel}>leave day{leaveDays === 1 ? '' : 's'}</Text>
        </View>
        {ptoLeft !== null && <Text style={styles.hint}>You have about {ptoLeft} PTO day{ptoLeft === 1 ? '' : 's'} left this year.</Text>}
        {leaveOptions.length === 0 ? (
          <Text style={styles.empty}>No working days to take leave from in the next year.</Text>
        ) : (
          leaveOptions.map((o) => (
            <View key={o.from} style={styles.leaveItem}>
              <Text style={styles.leaveTitle}>{stretchLabel(o)}</Text>
              <Text style={styles.leaveSub}>{o.totalDays} days off in a row · uses {o.leaveDays.length} leave day{o.leaveDays.length === 1 ? '' : 's'} · {Math.round((o.totalDays / o.leaveDays.length) * 10) / 10}× your leave</Text>
              <Text style={styles.leaveDates}>Take off: {o.leaveDays.map((k) => fromKey(k).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}</Text>
              {canBook && <Pressable style={styles.bookBtn} onPress={() => book(o)}><Text style={styles.bookText}>Book as PTO</Text></Pressable>}
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>STATISTICS</Text>
      <View style={styles.card}>
        <Seg value={mode} onChange={setMode} options={[{ id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }, { id: 'range', label: 'Range' }]} />
        {mode === 'range' ? (
          <View style={styles.rangeRow}>
            <View style={{ flex: 1 }}><DateField label="From" value={from} onChange={setFrom} /></View>
            <View style={{ flex: 1 }}><DateField label="To" value={to} onChange={setTo} /></View>
          </View>
        ) : (
          <View style={styles.nav}>
            <Pressable onPress={() => move(-1)} hitSlop={12}><Text style={styles.arrow}>‹</Text></Pressable>
            <View style={styles.periodPill}><Text style={styles.periodText}>{periodLabel}</Text></View>
            <Pressable onPress={() => move(1)} hitSlop={12}><Text style={styles.arrow}>›</Text></Pressable>
          </View>
        )}

        {rows.length === 0 ? (
          <Text style={styles.noData}>No data found</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.thead}>
              <Text style={[styles.th, { flex: 2.4, textAlign: 'left' }]}>Shifts</Text>
              <Text style={[styles.th, { flex: 1 }]}>Count</Text>
              <Text style={[styles.th, { flex: 1.3, textAlign: 'right' }]}>Time</Text>
              <Text style={[styles.th, { width: 56 }]}>Global</Text>
            </View>
            {rows.map((s) => {
              const r = stats.perShift[s.id];
              const ink = s.textColor ?? (s.start ? '#fff' : s.color);
              return (
                <View key={s.id} style={styles.tr}>
                  <View style={[styles.tile, { flex: 2.4, backgroundColor: s.start ? s.color : s.color + '55' }]}>
                    <Text style={[styles.tileName, { color: ink }]} numberOfLines={1}>{s.name}</Text>
                    {s.start ? <Text style={[styles.tileTime, { color: ink }]} numberOfLines={1}>({shiftTimeLabel(s)})</Text> : null}
                  </View>
                  <Text style={[styles.td, { flex: 1 }]}>{r.count}</Text>
                  <Text style={[styles.td, { flex: 1.3, textAlign: 'right' }]}>{hm(r.hours)}</Text>
                  <Pressable style={styles.checkCell} onPress={() => setExcluded((e) => ({ ...e, [s.id]: !e[s.id] }))}>
                    <View style={[styles.check, !excluded[s.id] && styles.checkOn]}>{!excluded[s.id] ? <Text style={styles.tick}>✓</Text> : null}</View>
                  </Pressable>
                </View>
              );
            })}
            <Text style={styles.global}>Global: {global.count} Shifts{'\n'}{hm(global.hours)}</Text>

            <View style={styles.cards}>
              <View style={styles.stat}><Text style={styles.statValue}>{fmt(stats.overtimeHours)}h</Text><Text style={styles.statLabel}>Extra hours</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{hasPay ? `${currency}${Math.round(stats.earnings).toLocaleString()}` : '—'}</Text><Text style={styles.statLabel}>Earnings</Text></View>
            </View>
            {!hasPay && <Text style={styles.hint}>Set an hourly rate in Settings to see earnings.</Text>}
            <View style={styles.bars}>
              {stats.buckets.map((h, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barVal}>{h > 0 ? fmt(h) : ''}</Text>
                  <View style={[styles.bar, { height: Math.max(2, (h / max) * 90) }]} />
                  <Text style={styles.barLabel}>{labels[i]}</Text>
                </View>
              ))}
            </View>
            {input.settings.ptoTotalHours > 0 && (
              <Text style={styles.body}>PTO {cursor.y}: used {fmt(p.used)}h · upcoming {fmt(p.upcoming)}h · left {fmt(p.left)}h{p.over > 0 ? ` (over by ${fmt(p.over)}h)` : ''}</Text>
            )}
          </View>
        )}
      </View>

      <Text style={styles.section}>NEARBY NOTES (30 DAYS)</Text>
      <View style={styles.card}>
        <Seg value={nearby} onChange={setNearby} options={[{ id: 'past', label: 'Past' }, { id: 'upcoming', label: 'Upcoming' }]} />
        {nearbyList.length === 0 ? (
          <Text style={styles.empty}>No nearby notes found</Text>
        ) : (
          nearbyList.map((n) => (
            <View key={n.dateKey} style={styles.item}>
              <Text style={styles.itemDate}>{dateLabel(n.dateKey)}</Text>
              <Text style={styles.itemText}>{n.text}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>SEARCH ON NOTES</Text>
      <View style={styles.card}>
        <View style={styles.searchRow}>
          <TextInput style={styles.input} value={query} onChangeText={setQuery} onSubmitEditing={() => setSearched(query)} returnKeyType="search" />
          <Pressable style={styles.searchBtn} onPress={() => setSearched(query)}><Text style={styles.searchText}>SEARCH</Text></Pressable>
        </View>
        {found.length === 0 ? (
          <Text style={styles.empty}>No data found</Text>
        ) : (
          found.map((n) => (
            <View key={n.dateKey} style={styles.item}>
              <Text style={styles.itemDate}>{dateLabel(n.dateKey)}</Text>
              <Text style={styles.itemText}>{n.text}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.section}>SEARCH DAYS BY ICON</Text>
      <View style={styles.card}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}><Dropdown compact title="Icon" options={ICON_OPTIONS} value={iconId} onChange={setIconId} /></View>
          <Pressable style={styles.checkRow} onPress={() => setPastDays((v) => !v)}>
            <View style={[styles.check, pastDays && styles.checkOn]}>{pastDays ? <Text style={styles.tick}>✓</Text> : null}</View>
            <Text style={styles.checkLabel}>Past days</Text>
          </Pressable>
        </View>
        {iconDays.length === 0 ? (
          <Text style={styles.empty}>No days found with selected icon</Text>
        ) : (
          iconDays.slice(0, 60).map((k) => {
            const day = shiftsFor(input.schedule, byId, fromKey(k));
            return (
              <View key={k} style={styles.iconItem}>
                <Text style={styles.iconEmoji}>{emojiFor(iconId)}</Text>
                <Text style={styles.iconDate}>{dateLabel(k)}</Text>
                <View style={styles.chips}>
                  {day.map((s) => (
                    <View key={s.id} style={[styles.chip, { backgroundColor: s.start ? s.color : s.color + '55' }]}>
                      <Text style={[styles.chipText, { color: s.textColor ?? (s.start ? '#fff' : s.color) }]} numberOfLines={1}>{s.code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  page: { padding: 12, paddingBottom: 40, gap: 6 },
  section: { textAlign: 'center', fontWeight: '800', fontSize: 14, color: c.text2, marginTop: 14, marginBottom: 4 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 12, gap: 12, elevation: 2 },
  seg: { flexDirection: 'row', borderWidth: 1.5, borderColor: c.text2, borderRadius: 14, overflow: 'hidden' },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  segDivider: { borderLeftWidth: 1.5, borderLeftColor: c.text2 },
  segOn: { backgroundColor: c.text2 },
  segText: { fontWeight: '800', fontSize: 15 },
  segTextOn: { color: c.card },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { fontSize: 36, color: c.text, paddingHorizontal: 6, lineHeight: 40 },
  periodPill: { flex: 1, marginHorizontal: 6, borderWidth: 1.5, borderColor: c.text2, borderRadius: 22, paddingVertical: 10, alignItems: 'center' },
  periodText: { fontWeight: '800', fontSize: 15 },
  rangeRow: { flexDirection: 'row', gap: 10 },
  noData: { textAlign: 'right', fontStyle: 'italic', color: c.text2, paddingTop: 12 },
  thead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  th: { fontWeight: '800', fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tile: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 15, fontWeight: '600' },
  tileTime: { fontSize: 9 },
  td: { fontSize: 15, textAlign: 'center', color: c.text2 },
  checkCell: { width: 56, alignItems: 'center' },
  check: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: c.text2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: c.primary, borderColor: c.primary },
  tick: { color: '#fff', fontWeight: '900', fontSize: 16 },
  global: { textAlign: 'right', fontStyle: 'italic', fontSize: 16, color: c.text2, marginTop: 4 },
  cards: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: c.tint, borderRadius: 14, padding: 12 },
  statValue: { fontSize: 20, fontWeight: '800', color: c.accent },
  statLabel: { color: c.muted, marginTop: 2, fontSize: 12 },
  hint: { fontSize: 12, color: c.muted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 130 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: c.primary, borderRadius: 5 },
  barVal: { fontSize: 9, color: c.muted, marginBottom: 2 },
  barLabel: { fontSize: 10, color: c.muted, marginTop: 4 },
  body: { fontSize: 14, color: c.text2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { fontSize: 15, fontWeight: '600' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: c.text2, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 22, lineHeight: 24, fontWeight: '700' },
  stepValue: { fontSize: 22, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  leaveItem: { borderRadius: 12, backgroundColor: c.surface, padding: 12, gap: 3 },
  leaveTitle: { fontWeight: '800', fontSize: 17 },
  leaveSub: { color: c.accent, fontWeight: '700', fontSize: 13 },
  leaveDates: { color: c.text2, fontSize: 13 },
  bookBtn: { alignSelf: 'flex-start', marginTop: 6, borderWidth: 1.5, borderColor: c.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 7 },
  bookText: { color: c.accent, fontWeight: '800' },
  okRow: { fontSize: 15, color: c.text2 },
  restCount: { fontWeight: '800', fontSize: 15 },
  restItem: { borderLeftWidth: 4, borderRadius: 10, backgroundColor: c.surface, padding: 12, gap: 2 },
  restTitle: { fontWeight: '800', fontSize: 16 },
  restDetail: { color: c.text2, fontSize: 13, lineHeight: 18, marginTop: 2 },
  more: { color: c.accent, fontWeight: '800', textAlign: 'center', paddingVertical: 6 },
  empty: { borderWidth: 1.5, borderColor: c.border, borderRadius: 10, padding: 12, color: c.text2 },
  item: { borderRadius: 12, backgroundColor: c.surface, padding: 12, gap: 2 },
  itemDate: { color: c.accent, fontWeight: '800', fontSize: 12 },
  itemText: { fontSize: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  searchBtn: { borderWidth: 1.5, borderColor: c.text2, borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12 },
  searchText: { fontWeight: '800' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 15 },
  iconItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, backgroundColor: c.surface, paddingVertical: 10, paddingHorizontal: 12 },
  iconEmoji: { fontSize: 22 },
  iconDate: { flex: 1, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 4 },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '800' },
}));
