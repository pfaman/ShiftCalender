import { Modal, Pressable, View } from 'react-native';
import { Text, makeStyles } from '../theme';

type Props = { visible: boolean; onStay: () => void; onExit: () => void };

export function ExitDialog({ visible, onStay, onExit }: Props) {
  const styles = useStyles();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onStay}>
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onStay} />
        <View style={styles.card}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Exit Shift Calendar?</Text>
          <Text style={styles.body}>Your calendar is saved. Shift alarms keep working even when the app is closed.</Text>
          <View style={styles.row}>
            <Pressable style={styles.stay} onPress={onStay}><Text style={styles.stayText}>Stay</Text></Pressable>
            <Pressable style={styles.exit} onPress={onExit}><Text style={styles.exitText}>Exit</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  fill: { flex: 1, justifyContent: 'center', padding: 28 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000AA' },
  card: { backgroundColor: c.card, borderRadius: 28, padding: 24, alignItems: 'center', gap: 8, elevation: 8 },
  emoji: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '800' },
  body: { textAlign: 'center', color: c.muted, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12, marginTop: 14, alignSelf: 'stretch' },
  stay: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, paddingVertical: 13, alignItems: 'center' },
  stayText: { fontWeight: '700', color: c.text },
  exit: { flex: 1, borderRadius: 16, backgroundColor: c.primary, paddingVertical: 13, alignItems: 'center' },
  exitText: { fontWeight: '700', color: '#fff' },
}));
