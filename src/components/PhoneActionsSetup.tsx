import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, makeStyles } from '../theme';
import { applyNow, bluetoothSupported, hasPolicyAccess, openPolicySettings, shiftActionsAvailable } from '../../modules/shift-actions';
import { TEAL } from '../core/shiftTypes';

export function PhoneActionsSetup() {
  const styles = useStyles();
  const [dnd, setDnd] = useState(false);
  const refresh = useCallback(() => setDnd(hasPolicyAccess()), []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (Platform.OS !== 'android') return <Text style={styles.hint}>Phone actions are available on Android.</Text>;
  if (!shiftActionsAvailable) return <Text style={styles.hint}>Phone actions need the installed app, not Expo Go.</Text>;

  const test = (sound: string | null, bt: string | null) => Alert.alert('Phone actions', applyNow(sound, bt) || 'Nothing to do');

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.title}>{dnd ? '✅ ' : '⚠️ '}Do Not Disturb access</Text>
        {!dnd && <Pressable style={styles.btn} onPress={() => openPolicySettings()}><Text style={styles.btnText}>Allow</Text></Pressable>}
      </View>
      <Text style={styles.hint}>
        Needed for Silent mode. Set the actions on each shift (Edit shift types).{' '}
        {bluetoothSupported() ? 'Bluetooth can be switched on this phone.' : 'This Android version does not let apps switch Bluetooth.'}
      </Text>
      <View style={styles.tests}>
        <Pressable onPress={() => test('silent', null)}><Text style={styles.link}>Test: silent</Text></Pressable>
        <Pressable onPress={() => test('vibrate', null)}><Text style={styles.link}>Test: vibrate</Text></Pressable>
        <Pressable onPress={() => test('sound', null)}><Text style={styles.link}>Test: sound</Text></Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: c.border, borderRadius: 16, padding: 12, gap: 8 },
  title: { flex: 1, fontWeight: '600' },
  btn: { backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: c.muted },
  tests: { flexDirection: 'row', gap: 18 },
  link: { color: c.accent, fontWeight: '600', fontSize: 15 },
}));
