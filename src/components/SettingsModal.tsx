import { Modal, Pressable, View } from 'react-native';
import { MoreScreen } from '../screens/MoreScreen';
import { Settings } from '../core/types';
import { Text, makeStyles } from '../theme';

type Props = {
  visible: boolean;
  settings: Settings;
  onChange: (s: Settings) => void;
  onResync: () => void;
  onExport: () => void;
  onImport: () => void;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose, ...rest }: Props) {
  const styles = useStyles();
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}><Text style={styles.chev}>⌄</Text></Pressable>
          <Text style={styles.title}>SETTINGS</Text>
          <View style={{ width: 24 }} />
        </View>
        <MoreScreen {...rest} />
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.bg },
  header: { backgroundColor: c.header, paddingTop: 40, paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chev: { color: c.onHeader, fontSize: 30, lineHeight: 30, width: 24 },
  title: { color: c.onHeader, fontSize: 18, fontWeight: '800' },
}));
