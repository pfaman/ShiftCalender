import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text, makeStyles } from '../theme';
import {
  AlarmPermissions,
  getAlarmPermissions,
  openBatterySettings,
  requestExactAlarmPermission,
  requestNotificationPermission,
  scheduleTestAlarm,
} from '../alarms';
import { TEAL } from '../core/shiftTypes';

type Props = { onChanged?: () => void; showTest?: boolean };

export function AlarmSetup({ onChanged, showTest }: Props) {
  const styles = useStyles();
  const [perms, setPerms] = useState<AlarmPermissions | null>(null);

  const refresh = useCallback(() => {
    getAlarmPermissions().then(setPerms).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Could not open', e instanceof Error ? e.message : 'Something went wrong');
    }
    refresh();
    onChanged?.();
  };

  const Row = ({ title, ok, action, label }: { title: string; ok?: boolean; action: () => void; label: string }) => (
    <View style={styles.row}>
      <Text style={styles.title}>{ok === undefined ? '' : ok ? '✅ ' : '⚠️ '}{title}</Text>
      {ok !== true && (
        <Pressable style={styles.btn} onPress={action}><Text style={styles.btnText}>{label}</Text></Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Row title="Notifications" ok={perms?.notifications} label="Allow" action={() => run(requestNotificationPermission)} />
      <Row title="Exact alarms" ok={perms?.exact} label="Allow" action={() => run(requestExactAlarmPermission)} />
      <Row title="Battery: set this app to Unrestricted" label="Open settings" action={() => run(openBatterySettings)} />
      {showTest && (
        <Pressable
          style={styles.ghost}
          onPress={() => run(async () => {
            await scheduleTestAlarm(15);
            Alert.alert('Test alarm set', 'It will ring in about 15 seconds. Lock your phone to test properly.');
          })}
        >
          <Text style={styles.ghostText}>Send test alarm (15 s)</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: c.border, borderRadius: 16, padding: 12, gap: 8 },
  title: { flex: 1, fontWeight: '600' },
  btn: { backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  ghost: { paddingVertical: 8 },
  ghostText: { color: c.accent, fontWeight: '600', fontSize: 15 },
}));
