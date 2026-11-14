import { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { shiftTimeLabel } from '../core/shiftTypes';
import { ShiftType } from '../core/types';
import { Text, makeStyles } from '../theme';
import { ImportShiftsPanel, ShiftSource } from './ImportShiftsPanel';

type Props = {
  visible: boolean;
  shiftTypes: ShiftType[];
  onCreate: () => void;
  onEdit: (s: ShiftType) => void;
  onReorder: (id: string, toIndex: number) => void;
  onClose: () => void;
  importSources: ShiftSource[];
  onLoadImportFile: () => Promise<ShiftSource[] | null>;
  onImportShifts: (shifts: ShiftType[]) => void;
};

const ROW = 86;

export function AvailableShifts(p: Props) {
  const styles = useStyles();
  const [importing, setImporting] = useState(false);
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);

  return (
    <Modal animationType="slide" visible={p.visible} onRequestClose={() => (importing ? setImporting(false) : p.onClose())}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={p.onClose} hitSlop={12}><Text style={styles.chev}>⌄</Text></Pressable>
          <Text style={styles.title}>AVAILABLE SHIFTS</Text>
          <View style={styles.headBtns}>
            <Pressable style={styles.headBtn} onPress={p.onCreate}><Text style={styles.headBtnText}>CREATE NEW SHIFT</Text></Pressable>
            <Pressable style={styles.headBtn} onPress={() => setImporting(true)}><Text style={styles.headBtnText}>IMPORT SHIFTS…</Text></Pressable>
          </View>
        </View>
        {importing ? (
          <ScrollView contentContainerStyle={styles.importBody}>
            <ImportShiftsPanel sources={p.importSources} onLoadFile={p.onLoadImportFile} onImport={p.onImportShifts} onBack={() => setImporting(false)} />
          </ScrollView>
        ) : (
          <ScrollView scrollEnabled={!drag} contentContainerStyle={{ paddingBottom: 40 }}>
            {p.shiftTypes.map((s, i) => (
              <Row
                key={s.id}
                shift={s}
                index={i}
                count={p.shiftTypes.length}
                dy={drag?.id === s.id ? drag.dy : 0}
                dragging={drag?.id === s.id}
                onPress={() => p.onEdit(s)}
                onDrag={(dy) => setDrag({ id: s.id, dy })}
                onDrop={(dy) => {
                  setDrag(null);
                  const to = Math.min(p.shiftTypes.length - 1, Math.max(0, i + Math.round(dy / ROW)));
                  if (to !== i) p.onReorder(s.id, to);
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

type RowProps = {
  shift: ShiftType;
  index: number;
  count: number;
  dy: number;
  dragging: boolean;
  onPress: () => void;
  onDrag: (dy: number) => void;
  onDrop: (dy: number) => void;
};

function Row({ shift: s, dy, dragging, onPress, onDrag, onDrop }: RowProps) {
  const styles = useStyles();
  // Callbacks change every render; keep the latest in a ref so the responder stays stable.
  const cb = useRef({ onDrag, onDrop });
  cb.current = { onDrag, onDrop };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => cb.current.onDrag(g.dy),
      onPanResponderRelease: (_, g) => cb.current.onDrop(g.dy),
      onPanResponderTerminate: (_, g) => cb.current.onDrop(g.dy),
    }),
  ).current;

  return (
    <View style={[styles.row, dragging && styles.dragging, { transform: [{ translateY: dy }] }]}>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={[styles.tile, { backgroundColor: s.start ? s.color : s.color + '55' }]}>
          <Text style={[styles.tileText, { color: s.textColor ?? (s.start ? '#fff' : s.color), fontSize: Math.min(s.textSize ?? 14, 18) }]} numberOfLines={2}>{s.code}</Text>
          {s.alarmMinBefore > 0 || (s.alarm2MinBefore ?? 0) > 0 ? <Text style={styles.tileAlarm}>⏰</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{s.name}</Text>
          {s.start ? <Text style={styles.time}>({shiftTimeLabel(s)})</Text> : null}
        </View>
      </Pressable>
      <View style={styles.handle} {...pan.panHandlers}><Text style={styles.handleText}>☰</Text></View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  page: { flex: 1, backgroundColor: c.bg },
  header: { backgroundColor: c.header, paddingTop: 40, paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  chev: { color: c.onHeader, fontSize: 30, textAlign: 'center', lineHeight: 30 },
  title: { color: c.onHeader, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  headBtn: { flex: 1, backgroundColor: '#FFFFFF24', borderRadius: 22, paddingVertical: 12, alignItems: 'center' },
  headBtnText: { color: c.onHeader, fontWeight: '800', fontSize: 13 },
  importBody: { padding: 16, gap: 12 },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.bg, paddingHorizontal: 12 },
  dragging: { zIndex: 10, elevation: 8, backgroundColor: c.card },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, height: '100%' },
  tile: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 4 },
  tileText: { fontWeight: '700', textAlign: 'center' },
  tileAlarm: { position: 'absolute', top: 3, left: 4, fontSize: 10 },
  name: { fontSize: 16 },
  time: { fontSize: 13, color: c.muted, marginTop: 2 },
  handle: { paddingHorizontal: 16, paddingVertical: 24 },
  handleText: { fontSize: 26, color: c.text },
}));
