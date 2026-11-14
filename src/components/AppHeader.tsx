import { Pressable, View } from 'react-native';
import { tap } from '../haptics';
import { Text, makeStyles } from '../theme';

export type MainTab = 'month' | 'year' | 'summary';

type Props = {
  calendarName: string;
  tab: MainTab;
  monthLabel: string; // e.g. NOVEMBER
  yearLabel: string; // e.g. 2026
  warn: boolean; // alarm permissions missing
  onTab: (t: MainTab) => void;
  onCalendars: () => void;
  onShare: () => void;
  onMenu: () => void;
  onWarn: () => void;
};

// Top app bar (logo, calendar picker, share, menu, warning) with the Month / Year / Summary tabs.
export function AppHeader(p: Props) {
  const styles = useStyles();
  const tabs: { id: MainTab; label: string }[] = [
    { id: 'month', label: p.monthLabel },
    { id: 'year', label: p.yearLabel },
    { id: 'summary', label: 'SUMMARY' },
  ];
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <View style={styles.logo}>
          <Text style={styles.logoTop}>SHIFT</Text>
          <Text style={styles.logoDay}>{new Date().getDate()}</Text>
        </View>
        <Pressable style={styles.pill} onPress={p.onCalendars}>
          <Text style={styles.pencil}>✎</Text>
          <Text style={styles.name} numberOfLines={1}>{p.calendarName}</Text>
          <Text style={styles.caret}>▾</Text>
        </Pressable>
        <Pressable style={styles.icon} hitSlop={8} onPress={p.onShare}><Text style={styles.iconText}>⤴</Text></Pressable>
        <Pressable style={styles.menu} hitSlop={8} onPress={p.onMenu}><Text style={styles.menuText}>☰</Text></Pressable>
        {p.warn && (
          <Pressable style={styles.warn} hitSlop={8} onPress={p.onWarn}><Text style={styles.warnText}>!</Text></Pressable>
        )}
      </View>
      <View style={styles.tabs}>
        {tabs.map((t) => {
          const on = p.tab === t.id;
          return (
            <Pressable key={t.id} style={styles.tab} onPress={() => { if (!on) tap(); p.onTab(t.id); }}>
              <Text style={[styles.tabText, on && styles.tabOn]}>{t.label}</Text>
              <View style={[styles.underline, on && styles.underlineOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { backgroundColor: c.header, paddingTop: 40 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  logo: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoTop: { backgroundColor: '#DC2626', color: '#fff', fontSize: 8, fontWeight: '800', alignSelf: 'stretch', textAlign: 'center', paddingVertical: 1 },
  logoDay: { color: '#111827', fontSize: 18, fontWeight: '800' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF1F', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  pencil: { color: c.onHeader, fontSize: 16 },
  name: { flex: 1, color: c.onHeader, fontWeight: '700', fontSize: 16 },
  caret: { color: c.onHeader, fontSize: 14 },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: c.onHeader, fontSize: 22 },
  menu: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#5EEAD4', alignItems: 'center', justifyContent: 'center' },
  menuText: { color: '#5EEAD4', fontSize: 16, fontWeight: '800' },
  warn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  warnText: { color: '#7F1D1D', fontWeight: '900', fontSize: 18 },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabText: { color: c.onHeaderMuted, fontWeight: '800', fontSize: 14, letterSpacing: 0.5, paddingBottom: 8 },
  tabOn: { color: c.onHeader },
  underline: { height: 3, alignSelf: 'stretch', backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: '#5EEAD4' },
}));
