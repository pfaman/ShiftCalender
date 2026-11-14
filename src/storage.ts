import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './core/types';
import { flatten, initialStore, migrate, Store } from './core/store';

export { DEFAULT_SETTINGS } from './core/store';

const KEY = 'shiftcalender/v3';
const OLD_KEY = 'shiftcalender/v2'; // single-calendar format

export const initialState = (): AppState => flatten(initialStore());

export async function loadStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
    const old = await AsyncStorage.getItem(OLD_KEY);
    if (old) return migrate(JSON.parse(old));
  } catch {}
  return initialStore();
}

export async function saveStore(store: Store): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

// Active calendar only; used by the home-screen widgets.
export async function loadState(): Promise<AppState> {
  return flatten(await loadStore());
}
