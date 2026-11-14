import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { tap } from '../haptics';
import { Text, makeStyles, useTheme } from '../theme';

const D = '#F5A524';
const N = '#4F46E5';
const O = '#9CA3AF';
// 4 on (day, day, night, night) / 4 off, repeated: what the first slide's mini calendar shows
const DEMO = [D, D, N, N, O, O, O, O, D, D, N, N, O, O, O, O, D, D, N, N, O, O, O, O, D, D, N, N];

type Slide = { title: string; body: string };
const SLIDES: Slide[] = [
  { title: 'Your whole year, filled in seconds', body: 'Pick your shift pattern once. Every day of the year fills itself, and you can still paint any day by hand.' },
  { title: 'Alarms that really ring', body: 'Up to two alarms per shift, set to the minute. Phone goes silent when work starts, and back to sound when it ends.' },
  { title: 'Plan, share and stay in sync', body: 'Home-screen widgets, a shareable calendar image, and a side-by-side view with your partner’s shifts.' },
];

export function Welcome({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const go = (i: number) => {
    ref.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  // Back steps through the slides; from the first slide it falls through to the exit dialog.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) {
        go(index - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  const art = (i: number) => {
    if (i === 0) {
      return (
        <View style={styles.cal}>
          {DEMO.map((col, k) => <View key={k} style={[styles.calCell, { backgroundColor: col }]} />)}
        </View>
      );
    }
    if (i === 1) {
      return (
        <View style={styles.alarmCard}>
          <Text style={styles.alarmEmoji}>⏰</Text>
          <View>
            <Text style={styles.alarmTime}>05:30</Text>
            <Text style={styles.alarmLabel}>Night shift · starts 19:00</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: N }]} />
        </View>
      );
    }
    return (
      <View style={styles.widgets}>
        <View style={[styles.widget, { backgroundColor: N }]}><Text style={styles.widgetSmall}>Today</Text><Text style={styles.widgetBig}>NIGHT</Text></View>
        <View style={styles.widgetRow}>
          {[D, D, N, O, O, D, D].map((col, k) => <View key={k} style={[styles.widgetDay, { backgroundColor: col }]} />)}
        </View>
        <View style={styles.shareChip}><Text style={styles.shareText}>🖼  Share as image</Text></View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <Pressable style={styles.skip} onPress={() => { tap(); onDone(); }}><Text style={styles.skipText}>Skip</Text></Pressable>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} style={{ flex: 1 }}>
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width, paddingHorizontal: 28 }}>
            <View style={styles.art}>{art(i)}</View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => <View key={i} style={[styles.pip, { backgroundColor: i === index ? c.primary : c.border, width: i === index ? 22 : 8 }]} />)}
        </View>
        <Pressable style={styles.next} onPress={() => { tap(); last ? onDone() : go(index + 1); }}>
          <Text style={styles.nextText}>{last ? 'Get started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, paddingTop: 56 },
  skip: { position: 'absolute', top: 56, right: 24, zIndex: 2, padding: 6 },
  skipText: { color: c.muted, fontWeight: '600', fontSize: 15 },
  art: { height: 300, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, marginTop: 24 },
  body: { fontSize: 16, color: c.muted, lineHeight: 24, marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 40, paddingTop: 12 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pip: { height: 8, borderRadius: 4 },
  next: { backgroundColor: c.primary, borderRadius: 18, paddingHorizontal: 28, paddingVertical: 14, elevation: 3 },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cal: { width: 276, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, borderRadius: 24, backgroundColor: c.card, elevation: 4 },
  calCell: { width: 26, height: 26, borderRadius: 8 },
  alarmCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 24, backgroundColor: c.card, elevation: 4, width: 290 },
  alarmEmoji: { fontSize: 38 },
  alarmTime: { fontSize: 34, fontWeight: '800' },
  alarmLabel: { color: c.muted, fontSize: 13 },
  dot: { width: 12, height: 12, borderRadius: 6, marginLeft: 'auto' },
  widgets: { gap: 12, alignItems: 'center' },
  widget: { width: 150, borderRadius: 22, padding: 16, elevation: 4 },
  widgetSmall: { color: '#FFFFFFCC', fontSize: 12 },
  widgetBig: { color: '#fff', fontSize: 24, fontWeight: '800' },
  widgetRow: { flexDirection: 'row', gap: 6, padding: 12, borderRadius: 18, backgroundColor: c.card, elevation: 4 },
  widgetDay: { width: 30, height: 38, borderRadius: 10 },
  shareChip: { backgroundColor: c.tint, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  shareText: { color: c.accent, fontWeight: '700' },
}));
