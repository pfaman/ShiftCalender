import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { loadState } from '../storage';
import { buildWidgetModel } from './model';
import { renderByName } from './views';

// Runs headless (no app UI), so it reads state straight from storage.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const state = await loadState();
  props.renderWidget(renderByName(props.widgetInfo.widgetName, buildWidgetModel(state, new Date())));
}
