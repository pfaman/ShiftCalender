import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, makeStyles } from '../theme';
import { shiftTimeLabel, TEAL } from '../core/shiftTypes';
import { ShiftType } from '../core/types';

export type ShiftSource = { name: string; shifts: ShiftType[] };

type Props = {
  sources: ShiftSource[]; // other calendars in this app
  onLoadFile: () => Promise<ShiftSource[] | null>; // calendars inside a backup file; null if cancelled
  onImport: (shifts: ShiftType[]) => void;
  onBack: () => void;
};

export function ImportShiftsPanel({ sources, onLoadFile, onImport, onBack }: Props) {
  const styles = useStyles();
  const [fileSources, setFileSources] = useState<ShiftSource[]>([]);
  const [picked, setPicked] = useState<Record<string, ShiftType>>({});
  const all = [...sources.map((s) => ({ ...s, from: 'app' })), ...fileSources.map((s) => ({ ...s, from: 'file' }))];

  const toggle = (key: string, s: ShiftType) =>
    setPicked((p) => {
      const next = { ...p };
      if (next[key]) delete next[key];
      else next[key] = s;
      return next;
    });

  const loadFile = async () => {
    try {
      const res = await onLoadFile();
      if (res) setFileSources(res);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const count = Object.keys(picked).length;

  return (
    <>
      <Text style={styles.h1}>Import shifts</Text>
      {all.length === 0 && <Text style={styles.hint}>No other calendars yet. Load a backup file to copy shifts from it.</Text>}
      {all.map((src, si) => (
        <View key={`${src.from}-${si}`} style={styles.group}>
          <Text style={styles.groupTitle}>{src.from === 'file' ? '📄 ' : ''}{src.name}</Text>
          {src.shifts.map((s) => {
            const key = `${src.from}-${si}-${s.id}`;
            return (
              <Pressable key={key} style={[styles.item, picked[key] && styles.itemOn]} onPress={() => toggle(key, s)}>
                <Text style={styles.check}>{picked[key] ? '☑' : '☐'}</Text>
                <View style={[styles.pill, { backgroundColor: s.color }]}><Text style={styles.pillText}>{s.code}</Text></View>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.time}>{s.start ? shiftTimeLabel(s) : 'untimed'}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable onPress={loadFile}><Text style={styles.link}>Load a backup file…</Text></Pressable>
      <View style={styles.footer}>
        <Pressable onPress={onBack}><Text style={styles.link}>Back</Text></Pressable>
        <Pressable
          disabled={count === 0}
          style={[styles.btn, count === 0 && { opacity: 0.4 }]}
          onPress={() => { onImport(Object.values(picked)); onBack(); }}
        >
          <Text style={styles.btnText}>Import {count || ''}</Text>
        </Pressable>
      </View>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  hint: { color: c.muted },
  group: { gap: 8 },
  groupTitle: { fontWeight: '700', color: c.text2, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1.5, borderColor: c.border },
  itemOn: { borderColor: c.accent, backgroundColor: c.tint },
  check: { fontSize: 18, color: c.accent },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, minWidth: 42, alignItems: 'center' },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  name: { flex: 1, fontWeight: '600' },
  time: { color: c.muted, fontSize: 12 },
  link: { color: c.accent, fontSize: 16, paddingVertical: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { backgroundColor: c.primary, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
}));
