import { Pressable, StyleSheet, View } from 'react-native';
import { Text, makeStyles } from '../theme';
import { TEAL } from '../core/shiftTypes';
import { ShiftType } from '../core/types';

type Props = {
  cycle: string[];
  shiftTypes: ShiftType[];
  onChange: (cycle: string[]) => void;
};

// Tap a day to cycle through shift types; long-press removes it.
export function PatternEditor({ cycle, shiftTypes, onChange }: Props) {
  const styles = useStyles();
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  const next = (id: string) => shiftTypes[(shiftTypes.findIndex((s) => s.id === id) + 1) % shiftTypes.length].id;

  return (
    <View>
      <View style={styles.wrap}>
        {cycle.map((id, i) => (
          <Pressable
            key={i}
            style={[styles.day, { backgroundColor: byId[id]?.color ?? '#9CA3AF' }]}
            onPress={() => onChange(cycle.map((c, j) => (j === i ? next(c) : c)))}
            onLongPress={() => cycle.length > 1 && onChange(cycle.filter((_, j) => j !== i))}
          >
            <Text style={styles.index}>{i + 1}</Text>
            <Text style={styles.code}>{byId[id]?.code ?? '?'}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.add} onPress={() => onChange([...cycle, cycle[cycle.length - 1] ?? shiftTypes[0].id])}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Tap a day to change its shift · long-press to remove</Text>
    </View>
  );
}

export function PatternPreview({ cycle, shiftTypes }: { cycle: string[]; shiftTypes: ShiftType[] }) {
  const styles = useStyles();
  const byId = Object.fromEntries(shiftTypes.map((s) => [s.id, s]));
  return (
    <View style={styles.wrap}>
      {cycle.map((id, i) => (
        <View key={i} style={[styles.mini, { backgroundColor: byId[id]?.color ?? '#9CA3AF' }]} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { width: 52, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  index: { color: '#ffffffcc', fontSize: 10 },
  code: { color: '#fff', fontSize: 12, fontWeight: '700' },
  add: { width: 52, height: 56, borderRadius: 12, borderWidth: 2, borderColor: c.accent, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addText: { color: c.accent, fontSize: 22 },
  hint: { marginTop: 8, color: c.muted, fontSize: 12 },
  mini: { width: 14, height: 14, borderRadius: 4 },
}));
