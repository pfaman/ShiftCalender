import { Modal, Pressable, View } from 'react-native';
import { Text, makeStyles } from '../theme';

type Item = { icon: string; label: string; onPress: () => void };
type Props = { visible: boolean; onClose: () => void; items: Item[] };

export function MenuSheet({ visible, onClose, items }: Props) {
  const styles = useStyles();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {items.map((it) => (
            <Pressable key={it.label} style={styles.item} onPress={() => { onClose(); it.onPress(); }}>
              <Text style={styles.icon}>{it.icon}</Text>
              <Text style={styles.label}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  fill: { flex: 1, alignItems: 'flex-end', paddingTop: 92, paddingRight: 10 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000055' },
  sheet: { backgroundColor: c.card, borderRadius: 16, paddingVertical: 6, minWidth: 230, elevation: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  icon: { fontSize: 20, width: 26, textAlign: 'center' },
  label: { fontSize: 16 },
}));
