import AsyncStorage from '@react-native-async-storage/async-storage';

// Anonymous usage analytics and crash reports through Firebase.
// Everything here is a no-op until a google-services.json is added (see app.config.js),
// and the person can switch it off in Settings.

const KEY = 'shiftcalender/telemetry';
let enabled = true;

type Analytics = { logEvent: (name: string, params?: Record<string, string | number | boolean>) => Promise<void>; setAnalyticsCollectionEnabled: (on: boolean) => Promise<void> };
type Crashlytics = { recordError: (e: Error) => void; log: (m: string) => void; setCrashlyticsCollectionEnabled: (on: boolean) => Promise<void> };

function modules(): { analytics?: Analytics; crashlytics?: Crashlytics } {
  try {
    const app = require('@react-native-firebase/app');
    if (!app.getApps().length) return {}; // no Firebase project configured
    return legacy();
  } catch {
    return {};
  }
}

// the namespaced API is the stable one across versions
function legacy(): { analytics?: Analytics; crashlytics?: Crashlytics } {
  try {
    return {
      analytics: require('@react-native-firebase/analytics').default(),
      crashlytics: require('@react-native-firebase/crashlytics').default(),
    };
  } catch {
    return {};
  }
}

const safe = (fn: () => unknown) => {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => {});
  } catch {}
};

export async function initTelemetry() {
  try {
    enabled = (await AsyncStorage.getItem(KEY)) !== 'off';
  } catch {}
  const m = modules();
  safe(() => m.analytics?.setAnalyticsCollectionEnabled(enabled));
  safe(() => m.crashlytics?.setCrashlyticsCollectionEnabled(enabled));

  // JS crashes: report, then hand over to the normal handler
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: Error, fatal?: boolean) => void; setGlobalHandler: (h: (e: Error, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (eu) {
    const prev = eu.getGlobalHandler();
    eu.setGlobalHandler((e, fatal) => {
      if (enabled) recordError(e);
      prev(e, fatal);
    });
  }
}

export const isTelemetryEnabled = () => enabled;

export async function setTelemetryEnabled(on: boolean) {
  enabled = on;
  try {
    await AsyncStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {}
  const m = modules();
  safe(() => m.analytics?.setAnalyticsCollectionEnabled(on));
  safe(() => m.crashlytics?.setCrashlyticsCollectionEnabled(on));
}

// Never put personal data (notes, names, pay) in event params.
export function track(name: string, params?: Record<string, string | number | boolean>) {
  if (!enabled) return;
  safe(() => modules().analytics?.logEvent(name, params));
}

export function recordError(e: unknown) {
  if (!enabled) return;
  safe(() => modules().crashlytics?.recordError(e instanceof Error ? e : new Error(String(e))));
}
