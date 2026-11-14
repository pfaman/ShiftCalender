import { DateField } from '../components/DateField';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput, makeStyles } from '../theme';
import { AlarmSetup } from '../components/AlarmSetup';
import { PatternEditor, PatternPreview } from '../components/PatternEditor';
import { fromKey, toKey } from '../core/dates';
import { tap } from '../haptics';
import { PRESET_PATTERNS } from '../core/patterns';
import { TEAL } from '../core/shiftTypes';
import { JobType, PatternDef, ShiftType } from '../core/types';

type Result = { job?: JobType; pattern: PatternDef; startDate: string; name?: string };

const JOBS: { id: JobType; label: string; emoji: string }[] = [
  { id: 'nurse', label: 'Nurse', emoji: '🩺' },
  { id: 'doctor', label: 'Doctor / Paramedic', emoji: '🚑' },
  { id: 'police', label: 'Police', emoji: '🚓' },
  { id: 'fire', label: 'Firefighter', emoji: '🚒' },
  { id: 'security', label: 'Security', emoji: '🛡️' },
  { id: 'factory', label: 'Factory', emoji: '🏭' },
  { id: 'warehouse', label: 'Warehouse / Logistics', emoji: '📦' },
  { id: 'driver', label: 'Driver / Transport', emoji: '🚚' },
  { id: 'hospitality', label: 'Restaurant / Hotel', emoji: '🍽️' },
  { id: 'retail', label: 'Retail / Store', emoji: '🛍️' },
  { id: 'callcenter', label: 'Call centre', emoji: '🎧' },
  { id: 'aviation', label: 'Pilot / Cabin crew', emoji: '✈️' },
  { id: 'energy', label: 'Oil, Gas & Mining', emoji: '⛏️' },
  { id: 'other', label: 'Something else', emoji: '✨' },
];

// Patterns that suit each job, shown first with a "Suggested" badge.
const SUGGESTED: Record<JobType, string[]> = {
  nurse: ['3on3off', '4on4off', 'dn44'],
  doctor: ['rot3', 'dn44', '3on3off'],
  police: ['panama', 'dupont', '6on2off'],
  fire: ['1on2off', '4on4off', 'panama'],
  security: ['4on4off', '3on3off', 'rot3'],
  factory: ['dupont', 'rot3', 'panama'],
  warehouse: ['5-2', '4on4off', 'rot3'],
  driver: ['6on2off', '5-2', '4on4off'],
  hospitality: ['5-2', '6on2off', '3on3off'],
  retail: ['5-2', '6on2off', '3on3off'],
  callcenter: ['4on4off', 'rot3', '5-2'],
  aviation: ['3on3off', '6on2off', '4on4off'],
  energy: ['6on2off', '4on4off', 'panama'],
  other: ['4on4off', '5-2', 'panama'],
};

const CUSTOM: PatternDef = { id: 'custom', name: 'Custom', cycle: ['day', 'day', 'off', 'off'] };

type Props = { shiftTypes: ShiftType[]; onDone: (r: Result) => void; mode?: 'first' | 'new'; onCancel?: () => void };

export function Onboarding({ shiftTypes, onDone, mode = 'first', onCancel }: Props) {
  const styles = useStyles();
  const isNew = mode === 'new';
  const [calName, setCalName] = useState('');
  const [step, setStep] = useState(isNew ? 2 : 1);
  const [job, setJob] = useState<JobType | undefined>();
  const [pattern, setPattern] = useState<PatternDef>(PRESET_PATTERNS[0]);
  const [custom, setCustom] = useState<PatternDef>(CUSTOM);
  const [start, setStart] = useState(() => new Date());

  const firstStep = isNew ? 2 : 1;
  // Back goes to the previous step; at the first step it cancels a new calendar, or falls through to the exit dialog.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > firstStep) { setStep(step - 1); return true; }
      if (isNew) { onCancel?.(); return true; }
      return false;
    });
    return () => sub.remove();
  });
  const lastStep = isNew ? 2 : 3;
  const finish = () => onDone({ job: isNew ? undefined : job ?? 'other', pattern, startDate: toKey(start), name: isNew ? calName : undefined });
  const canNext = step === 1 ? !!job : true;
  const rec = job ? SUGGESTED[job] : [];
  const ordered = [...PRESET_PATTERNS].sort((x, y) => (rec.includes(y.id) ? 1 : 0) - (rec.includes(x.id) ? 1 : 0) || rec.indexOf(x.id) - rec.indexOf(y.id));
  const total = isNew ? 1 : 3;
  const pos = isNew ? 1 : step;

  return (
    <View style={styles.root}>
    <View style={styles.top}>
      <View style={styles.bars}>
        {Array.from({ length: total }, (_, i) => <View key={i} style={[styles.bar, i < pos && styles.barOn]} />)}
      </View>
      <Text style={styles.step}>{isNew ? 'New calendar' : `Step ${step} of 3`}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>

      {step === 1 && (
        <>
          <Text style={styles.hero}>👋</Text>
          <Text style={styles.h1}>What do you do?</Text>
          <Text style={styles.body}>We'll suggest the shift patterns that fit your job.</Text>
          <View style={styles.grid}>
            {JOBS.map((j) => {
              const on = job === j.id;
              return (
                <Pressable key={j.id} onPress={() => { tap(); setJob(j.id); setPattern(PRESET_PATTERNS.find((p) => p.id === SUGGESTED[j.id][0]) ?? PRESET_PATTERNS[0]); }} style={[styles.job, on && styles.jobOn]}>
                  <Text style={styles.jobEmoji}>{j.emoji}</Text>
                  <Text style={[styles.jobLabel, on && styles.jobLabelOn]}>{j.label}</Text>
                  {on ? <View style={styles.check}><Text style={styles.checkMark}>✓</Text></View> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          {isNew && <TextInput style={styles.nameInput} placeholder="Calendar name (e.g. Partner)" value={calName} onChangeText={setCalName} />}
          <Text style={styles.h1}>Pick your pattern</Text>
          <Text style={styles.body}>{rec.length ? 'Suggested for your job come first. You can change it any time.' : 'You can change it any time.'}</Text>
          {[...ordered, custom].map((p) => (
            <Pressable key={p.id} onPress={() => { tap(); setPattern(p); }} style={[styles.card, pattern.id === p.id && styles.cardOn]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                {rec.includes(p.id) ? <Text style={styles.badge}>Suggested</Text> : null}
                {pattern.id === p.id ? <View style={styles.check}><Text style={styles.checkMark}>✓</Text></View> : null}
              </View>
              <PatternPreview cycle={p.cycle} shiftTypes={shiftTypes} />
            </Pressable>
          ))}
          {pattern.id === 'custom' && (
            <PatternEditor
              cycle={custom.cycle}
              shiftTypes={shiftTypes}
              onChange={(cycle) => {
                const c = { ...custom, cycle };
                setCustom(c);
                setPattern(c);
              }}
            />
          )}
          <Text style={styles.label}>First day of the pattern</Text>
          <DateField value={start} onChange={(d) => setStart(fromKey(toKey(d)))} />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.hero}>⏰</Text>
          <Text style={styles.h1}>Make alarms reliable</Text>
          <Text style={styles.body}>
            Shift alarms need two permissions so Android doesn't silence them: exact alarms, and no battery optimization for this app.
          </Text>
          <AlarmSetup />
        </>
      )}

    </ScrollView>
      <View style={styles.footer}>
        {step > (isNew ? 2 : 1) ? (
          <Pressable onPress={() => setStep(step - 1)}><Text style={styles.back}>Back</Text></Pressable>
        ) : isNew ? (
          <Pressable onPress={onCancel}><Text style={styles.back}>Cancel</Text></Pressable>
        ) : <View />}
        <Pressable
          disabled={!canNext}
          onPress={() => (step < lastStep ? setStep(step + 1) : finish())}
          style={[styles.next, !canNext && styles.nextOff]}
        >
          <Text style={styles.nextText}>{step < lastStep ? 'Next →' : isNew ? 'Create calendar' : 'See my calendar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  top: { paddingHorizontal: 24, paddingTop: 56, gap: 10 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.border },
  barOn: { backgroundColor: c.primary },
  page: { padding: 24, paddingTop: 16, paddingBottom: 12, gap: 14 },
  step: { color: c.muted, fontWeight: '600' },
  hero: { fontSize: 44 },
  nameInput: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, padding: 12, fontSize: 16 },
  h1: { fontSize: 30, fontWeight: '800', lineHeight: 36 },
  body: { fontSize: 15, color: c.muted, lineHeight: 22 },
  label: { marginTop: 8, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  job: { width: '48%', minHeight: 92, borderRadius: 18, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card, padding: 14, justifyContent: 'space-between' },
  jobOn: { borderColor: c.accent, backgroundColor: c.tint },
  jobEmoji: { fontSize: 28 },
  jobLabel: { fontSize: 15, fontWeight: '600' },
  jobLabelOn: { color: c.accent, fontWeight: '800' },
  check: { backgroundColor: c.primary, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 13 },
  card: { borderRadius: 18, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card, padding: 14, gap: 10 },
  cardOn: { borderColor: c.accent, backgroundColor: c.tint },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '700', fontSize: 16, flex: 1 },
  badge: { backgroundColor: c.tintStrong, color: c.accent, fontWeight: '800', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  back: { color: c.accent, fontSize: 16, fontWeight: '600' },
  next: { backgroundColor: c.primary, borderRadius: 18, paddingHorizontal: 26, paddingVertical: 14, elevation: 3 },
  nextOff: { opacity: 0.4 },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 16 },
}));
