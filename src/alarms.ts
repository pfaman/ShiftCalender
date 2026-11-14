import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmSource, planAllAlarms } from './core/alarms';

const CHANNEL = 'shift-alarms';

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Shift alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 300, 500],
    bypassDnd: false,
    audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM },
  });
}

export type AlarmPermissions = { notifications: boolean; exact: boolean };

export async function getAlarmPermissions(): Promise<AlarmPermissions> {
  const n = await Notifications.getPermissionsAsync();
  const e = await Notifications.getExactAlarmPermissionsAsync();
  return { notifications: n.granted, exact: e.granted };
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Opens the system screen; the user must flip the switch there.
export async function requestExactAlarmPermission(): Promise<boolean> {
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
}

// Replaces every pending alarm with the plan for the next 30 days (all calendars that have alarms on).
export async function syncAlarms(opts: { enabled: boolean; sources: AlarmSource[] }): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!opts.enabled) return 0;
  const { notifications } = await getAlarmPermissions();
  if (!notifications) return 0;
  await ensureChannel();
  const plan = planAllAlarms(opts.sources, new Date());
  for (const a of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: a.title, body: a.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.at, channelId: CHANNEL, delivery: 'alarmClock' },
    });
  }
  return plan.length;
}

export async function scheduleTestAlarm(seconds = 15): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Test alarm', body: 'Shift alarms are working', sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + seconds * 1000), channelId: CHANNEL, delivery: 'alarmClock' },
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
