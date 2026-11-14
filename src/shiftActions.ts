import { Platform } from 'react-native';
import { scheduleActions } from '../modules/shift-actions';
import { planActions } from './core/actions';
import { AlarmSource } from './core/alarms';

// Hands the next 30 days of phone actions to the native scheduler. No-op off Android / in Expo Go.
export function syncShiftActions(opts: { enabled: boolean; sources: AlarmSource[] }): number {
  if (Platform.OS !== 'android') return 0;
  const now = new Date();
  const plan = opts.enabled
    ? opts.sources
        .flatMap((s) => planActions(s.schedule, s.shiftTypes, now))
        .sort((a, b) => a.at - b.at)
    : [];
  return scheduleActions(JSON.stringify(plan));
}
