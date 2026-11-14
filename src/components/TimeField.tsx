import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { formatTime } from '../core/shiftTypes';
import { Text, makeStyles } from '../theme';

type Props = { label: string; value: string; onChange: (t: string) => void };

const pad = (n: number) => String(n).padStart(2, '0');

// Shows "2:00 PM"; tapping opens the time picker (mounted only when asked, since Android opens it on render).
export function TimeField({ label, value, onChange }: Props) {
  const styles = useStyles();
  const [show, setShow] = useState(false);
  const [h, m] = value.split(':').map(Number);
  const date = new Date(2000, 0, 1, h || 0, m || 0);
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setShow((s) => !s)} style={styles.btn}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.value}>{formatTime(value)}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (e.type !== 'dismissed' && d) onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flex: 1 },
  btn: { alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 15, color: c.text2 },
  value: { fontSize: 24, fontWeight: '600' },
}));
