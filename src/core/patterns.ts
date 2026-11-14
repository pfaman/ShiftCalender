import { PatternDef } from './types';

const rep = (id: string, n: number) => Array<string>(n).fill(id);

export const PRESET_PATTERNS: PatternDef[] = [
  { id: '4on4off', name: '4-on-4-off', cycle: [...rep('day', 4), ...rep('off', 4)] },
  {
    id: 'panama',
    name: '2-2-3 (Panama)',
    cycle: [...rep('day', 2), ...rep('off', 2), ...rep('day', 3), ...rep('off', 2), ...rep('day', 2), ...rep('off', 3)],
  },
  {
    id: 'dupont',
    name: 'DuPont',
    cycle: [
      ...rep('night', 4), ...rep('off', 3), ...rep('day', 3), ...rep('off', 1),
      ...rep('night', 3), ...rep('off', 3), ...rep('day', 4), ...rep('off', 7),
    ],
  },
  { id: '5-2', name: '5-2', cycle: [...rep('day', 5), ...rep('off', 2)] },
  { id: '3on3off', name: '3-on-3-off', cycle: [...rep('day', 3), ...rep('off', 3)] },
  { id: '6on2off', name: '6-on-2-off', cycle: [...rep('day', 6), ...rep('off', 2)] },
  { id: 'dn44', name: '2 days · 2 nights · 4 off', cycle: [...rep('day', 2), ...rep('night', 2), ...rep('off', 4)] },
  { id: 'rot3', name: '3-shift rotation', cycle: [...rep('day', 2), ...rep('evening', 2), ...rep('night', 2), ...rep('off', 4)] },
  { id: '1on2off', name: '1-on-2-off', cycle: [...rep('day', 1), ...rep('off', 2)] },
];
