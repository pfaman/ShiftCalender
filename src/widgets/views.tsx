import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { DayCell, WidgetModel } from './model';

export type Theme = 'light' | 'dark';
const PALETTE = {
  light: { bg: '#FFFFFF', text: '#111827', muted: '#6B7280', ring: '#0F766E' },
  dark: { bg: '#111827', text: '#F9FAFB', muted: '#9CA3AF', ring: '#5EEAD4' },
};

export const WIDGET_NAMES = ['ShiftToday', 'ShiftWeek', 'ShiftMonth'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

function Pill({ code, color, size }: { code?: string; color?: string; size: number }) {
  if (!code) return <FlexWidget style={{ height: size + 8 }} />;
  return (
    <FlexWidget style={{ backgroundColor: (color ?? '#9CA3AF') as `#${string}`, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
      <TextWidget text={code} style={{ color: '#FFFFFF', fontSize: size, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}

export function TodayWidget({ m, theme }: { m: WidgetModel; theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: m.today.color as `#${string}`, borderRadius: 20, padding: 12, justifyContent: 'center' }}
    >
      <TextWidget text="Today" style={{ color: '#FFFFFFCC', fontSize: 11 }} />
      <TextWidget text={m.today.name} style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }} />
      {m.today.time ? <TextWidget text={m.today.time} style={{ color: '#FFFFFF', fontSize: 13 }} /> : <TextWidget text=" " style={{ fontSize: 13, color: '#FFFFFF' }} />}
    </FlexWidget>
  );
}

export function WeekWidget({ m, theme }: { m: WidgetModel; theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: c.bg as `#${string}`, borderRadius: 20, padding: 12 }}
    >
      <TextWidget text="This week" style={{ color: c.text as `#${string}`, fontSize: 14, fontWeight: 'bold' }} />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flex: 1, alignItems: 'center', marginTop: 6 }}>
        {m.week.map((d, i) => (
          <FlexWidget
            key={i}
            style={{ flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: d.isToday ? 2 : 0, borderColor: c.ring as `#${string}`, paddingVertical: 4 }}
          >
            <TextWidget text={d.weekday} style={{ color: c.muted as `#${string}`, fontSize: 11 }} />
            <TextWidget text={String(d.day)} style={{ color: c.text as `#${string}`, fontSize: 14 }} />
            <Pill code={d.code} color={d.color} size={10} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

export function MonthWidget({ m, theme }: { m: WidgetModel; theme: Theme }) {
  const c = PALETTE[theme];
  const cellView = (d: DayCell | null, i: number) => (
    <FlexWidget
      key={i}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: d?.isToday ? 2 : 0, borderColor: c.ring as `#${string}` }}
    >
      {d && <TextWidget text={String(d.day)} style={{ color: c.text as `#${string}`, fontSize: 10 }} />}
      {d && <Pill code={d.code} color={d.color} size={9} />}
    </FlexWidget>
  );
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: c.bg as `#${string}`, borderRadius: 20, padding: 10 }}
    >
      <TextWidget text={m.monthTitle} style={{ color: c.text as `#${string}`, fontSize: 14, fontWeight: 'bold' }} />
      {m.weeks.map((w, wi) => (
        <FlexWidget key={wi} style={{ flexDirection: 'row', width: 'match_parent', flex: 1 }}>
          {w.map(cellView)}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function renderByName(name: string, m: WidgetModel) {
  const View = name === 'ShiftWeek' ? WeekWidget : name === 'ShiftMonth' ? MonthWidget : TodayWidget;
  return { light: <View m={m} theme="light" />, dark: <View m={m} theme="dark" /> };
}
