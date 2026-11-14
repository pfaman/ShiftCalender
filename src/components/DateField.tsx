import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, makeStyles } from '../theme';
import { TEAL } from '../core/shiftTypes';

type Props = { label?: string; value: Date; onChange: (d: Date) => void };

// Android shows the picker as a dialog as soon as it is rendered, so only mount it when asked.
export function DateField({ label, value, onChange }: Props) {
  const styles = useStyles();
  const [show, setShow] = useState(false);
  return (
    <View>
      <Pressable style={styles.field} onPress={() => setShow((s) => !s)}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.value}>{value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, d) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (e.type !== 'dismissed' && d) onChange(d);
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  field: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  label: { fontSize: 11, color: c.muted },
  value: { fontSize: 16, fontWeight: '600', color: c.accent },
}));
