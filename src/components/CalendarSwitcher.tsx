import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, makeStyles } from '../theme';
import { Store } from '../core/store';
import { TEAL } from '../core/shiftTypes';

type Props = {
  visible: boolean;
  store: Store;
  onClose: () => void;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleAlarms: (id: string, on: boolean) => void;
  onCompare: (id: string) => void;
};

export function CalendarSwitcher(p: Props) {
  const styles = useStyles();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const only = p.store.calendars.length === 1;

  const confirmDelete = (id: string, label: string) =>
    Alert.alert(`Delete "${label}"?`, 'Its shifts, notes and overtime are removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => p.onDelete(id) },
    ]);

  return (
    <Modal transparent animationType="slide" visible={p.visible} onRequestClose={p.onClose}>
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={p.onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Calendars</Text>
          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {p.store.calendars.map((c) => {
              const isActive = c.id === p.store.activeId;
              return (
                <View key={c.id} style={[styles.row, isActive && styles.rowOn]}>
                  {editing === c.id ? (
                    <View style={styles.nameRow}>
                      <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus />
                      <Pressable onPress={() => { p.onRename(c.id, name); setEditing(null); }}><Text style={styles.save}>Save</Text></Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.nameRow} onPress={() => p.onSwitch(c.id)}>
                      <Text style={styles.radio}>{isActive ? '◉' : '○'}</Text>
                      <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
                    </Pressable>
                  )}
                  <View style={styles.tools}>
                    <Pressable hitSlop={8} onPress={() => p.onToggleAlarms(c.id, !c.alarms)}>
                      <Text style={[styles.tool, !c.alarms && styles.off]}>🔔</Text>
                    </Pressable>
                    {!isActive && (
                      <Pressable hitSlop={8} onPress={() => p.onCompare(c.id)}>
                        <Text style={[styles.tool, p.store.compareId !== c.id && styles.off]}>👥</Text>
                      </Pressable>
                    )}
                    <Pressable hitSlop={8} onPress={() => { setName(c.name); setEditing(c.id); }}><Text style={styles.tool}>✎</Text></Pressable>
                    {!only && <Pressable hitSlop={8} onPress={() => confirmDelete(c.id, c.name)}><Text style={[styles.tool, { color: '#DC2626' }]}>🗑</Text></Pressable>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>🔔 rings this calendar's alarms · 👥 shows it alongside the current one (e.g. your partner)</Text>
          <Pressable style={styles.btn} onPress={p.onNew}><Text style={styles.btnText}>＋ New calendar</Text></Pressable>
          <Pressable onPress={p.onClose}><Text style={styles.close}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#00000066' },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: c.border, padding: 12, marginBottom: 8, gap: 8 },
  rowOn: { borderColor: c.accent, backgroundColor: c.tint },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { color: c.accent, fontSize: 18 },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  input: { flex: 1, borderWidth: 1.5, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 16 },
  save: { color: c.accent, fontWeight: '700' },
  tools: { flexDirection: 'row', gap: 12 },
  tool: { fontSize: 18 },
  off: { opacity: 0.25 },
  hint: { fontSize: 12, color: c.muted },
  btn: { backgroundColor: c.primary, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  close: { color: c.accent, fontSize: 16, paddingVertical: 6 },
}));
