import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text, TextInput, makeStyles, useTheme } from '../theme';
import { AlarmSetup } from '../components/AlarmSetup';
import { PhoneActionsSetup } from '../components/PhoneActionsSetup';
import { Settings } from '../core/types';
import { isTelemetryEnabled, setTelemetryEnabled } from '../telemetry';

type NumKey = 'hourlyRate' | 'overtimeMultiplier' | 'nightDiffPercent' | 'ptoTotalHours' | 'ptoHoursPerDay' | 'minRestHours' | 'maxStreakDays' | 'maxWeekHours';

const FIELDS: { key: NumKey; label: string; hint?: string }[] = [
  { key: 'hourlyRate', label: 'Hourly rate' },
  { key: 'overtimeMultiplier', label: 'Overtime multiplier', hint: 'e.g. 1.5 = time and a half' },
  { key: 'nightDiffPercent', label: 'Night differential (%)', hint: 'Extra pay on shifts marked as night' },
  { key: 'ptoTotalHours', label: 'PTO allowance (hours / year)' },
  { key: 'ptoHoursPerDay', label: 'Hours deducted per PTO day' },
];

const REST_FIELDS: { key: NumKey; label: string; hint?: string }[] = [
  { key: 'minRestHours', label: 'Least rest between shifts (hours)', hint: 'Many countries ask for 11 hours' },
  { key: 'maxStreakDays', label: 'Most working days in a row' },
  { key: 'maxWeekHours', label: 'Most hours in any 7 days', hint: 'The EU limit is 48 hours on average' },
];

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
  onResync: () => void;
  onExport: () => void;
  onImport: () => void;
};

export function MoreScreen({ settings, onChange, onResync, onExport, onImport }: Props) {
  const styles = useStyles();
  const { c } = useTheme();
  // keep raw text so "1." or "" can be typed; commit only valid numbers
  const [text, setText] = useState<Record<string, string>>({});
  const show = (k: NumKey) => text[k] ?? String(settings[k] || '');
  const [shareUsage, setShareUsage] = useState(isTelemetryEnabled());

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Pay & PTO</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Currency symbol</Text>
        <TextInput style={styles.input} value={settings.currency} maxLength={3} onChangeText={(currency) => onChange({ ...settings, currency })} />
      </View>
      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={show(f.key)}
            placeholder="0"
            onChangeText={(t) => {
              setText((prev) => ({ ...prev, [f.key]: t }));
              const n = t.trim() === '' ? 0 : Number(t.replace(',', '.'));
              if (Number.isFinite(n) && n >= 0) onChange({ ...settings, [f.key]: n });
            }}
          />
          {f.hint && <Text style={styles.hint}>{f.hint}</Text>}
        </View>
      ))}

      <Text style={[styles.h1, styles.gap]}>Appearance</Text>
      <View style={styles.seg}>
        {(['system', 'light', 'dark'] as const).map((t) => (
          <Pressable key={t} onPress={() => onChange({ ...settings, theme: t })} style={[styles.segItem, settings.theme === t && styles.segOn]}>
            <Text style={[styles.segText, settings.theme === t && styles.segTextOn]}>{t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.h1, styles.gap]}>Calendar</Text>
      <Text style={styles.label}>Week starts on</Text>
      <View style={styles.seg}>
        {([1, 0] as const).map((w) => (
          <Pressable key={w} onPress={() => onChange({ ...settings, weekStart: w })} style={[styles.segItem, settings.weekStart === w && styles.segOn]}>
            <Text style={[styles.segText, settings.weekStart === w && styles.segTextOn]}>{w === 1 ? 'Monday' : 'Sunday'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.h1, styles.gap]}>Alarms</Text>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Shift alarms</Text>
        <Switch value={settings.alarmsEnabled} onValueChange={(alarmsEnabled) => onChange({ ...settings, alarmsEnabled })} trackColor={{ true: c.primary }} />
      </View>
      <AlarmSetup showTest onChanged={onResync} />
      <Text style={styles.hint}>Alarms are planned for the next 30 days each time you open the app. Open it at least once a month.</Text>

      <Text style={[styles.h1, styles.gap]}>Phone actions</Text>
      <PhoneActionsSetup />

      <Text style={[styles.h1, styles.gap]}>Rest & overtime alerts</Text>
      <View style={styles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.label, { flex: 1 }]}>Warn me about tiring plans</Text>
          <Switch value={settings.restAlerts} onValueChange={(restAlerts) => onChange({ ...settings, restAlerts })} trackColor={{ true: c.primary }} />
        </View>
        <Text style={styles.hint}>Checks the next 30 days for short rest, long streaks and heavy weeks. Shown in Summary and as ! on the calendar.</Text>
      </View>
      {REST_FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={show(f.key)}
            placeholder="0"
            onChangeText={(t) => {
              setText((prev) => ({ ...prev, [f.key]: t }));
              const n = t.trim() === '' ? 0 : Number(t.replace(',', '.'));
              if (Number.isFinite(n) && n >= 0) onChange({ ...settings, [f.key]: n });
            }}
          />
          {f.hint && <Text style={styles.hint}>{f.hint}</Text>}
        </View>
      ))}

      <Text style={[styles.h1, styles.gap]}>Privacy</Text>
      <View style={styles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.label, { flex: 1 }]}>Share anonymous usage and crash reports</Text>
          <Switch value={shareUsage} onValueChange={(on) => { setShareUsage(on); setTelemetryEnabled(on); }} trackColor={{ true: c.primary }} />
        </View>
        <Text style={styles.hint}>Helps fix bugs. Never includes your notes, photos, pay or shifts.</Text>
      </View>

      <Text style={[styles.h1, styles.gap]}>Backup</Text>
      <Pressable style={styles.btn} onPress={onExport}><Text style={styles.btnText}>Export backup</Text></Pressable>
      <Pressable style={styles.btnGhost} onPress={onImport}><Text style={styles.ghostText}>Import backup…</Text></Pressable>
      <Text style={styles.hint}>Import replaces everything currently in the app.</Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  page: { padding: 20, paddingTop: 16, paddingBottom: 60, gap: 14 },
  h1: { fontSize: 24, fontWeight: '700' },
  field: { gap: 6 },
  label: { fontWeight: '600', color: c.text2 },
  input: { borderWidth: 1.5, borderColor: c.border, borderRadius: 14, padding: 12, fontSize: 16 },
  hint: { fontSize: 12, color: c.muted },
  gap: { marginTop: 20 },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: c.surface, borderRadius: 16, padding: 4 },
  segItem: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
  segOn: { backgroundColor: c.primary },
  segText: { color: c.text2, fontWeight: '600' },
  segTextOn: { color: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: { backgroundColor: c.primary, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 12, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnGhost: { paddingVertical: 8 },
  ghostText: { color: c.accent, fontWeight: '600', fontSize: 16 },
}));
