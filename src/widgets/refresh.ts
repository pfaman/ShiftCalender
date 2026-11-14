import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { AppState } from '../core/types';
import { buildWidgetModel } from './model';
import { renderByName, WIDGET_NAMES } from './views';

// Push fresh data to every placed widget. Safe to call anywhere: no-ops off Android
// and when the native module is missing (Expo Go).
export async function refreshWidgets(state: AppState): Promise<void> {
  if (Platform.OS !== 'android') return;
  const model = buildWidgetModel(state, new Date());
  for (const name of WIDGET_NAMES) {
    try {
      await requestWidgetUpdate({ widgetName: name, renderWidget: () => renderByName(name, model) });
    } catch {}
  }
}
