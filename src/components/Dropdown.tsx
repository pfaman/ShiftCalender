import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text, makeStyles } from '../theme';

export type DropdownOption = { id: string; label: string; color?: string };

type Props = {
  options: DropdownOption[];
  value: string;
  onChange: (id: string) => void;
  title?: string;
  compact?: boolean;
};

// A "None ▾" style selector that opens a list in a popup.
export function Dropdown({ options, value, onChange, title, compact }: Props) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <>
      <Pressable style={[styles.box, compact && styles.compact]} onPress={() => setOpen(true)}>
        {current?.color ? <View style={[styles.dot, { backgroundColor: current.color }]} /> : null}
        <Text style={styles.label} numberOfLines={1}>{current?.label ?? '—'}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <ScrollView style={{ maxHeight: 420 }}>
              {options.map((o) => (
                <Pressable key={o.id} style={styles.option} onPress={() => { onChange(o.id); setOpen(false); }}>
                  {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
                  <Text style={[styles.optionText, o.id === value && styles.optionOn]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((c) => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  compact: { paddingVertical: 8 },
  dot: { width: 14, height: 14, borderRadius: 4 },
  label: { flex: 1, fontSize: 15 },
  caret: { color: c.muted, fontSize: 13 },
  modal: { flex: 1, justifyContent: 'center', padding: 28 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000080' },
  sheet: { backgroundColor: c.card, borderRadius: 20, padding: 8 },
  title: { fontWeight: '800', fontSize: 16, padding: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14 },
  optionText: { fontSize: 16 },
  optionOn: { color: c.accent, fontWeight: '800' },
}));
