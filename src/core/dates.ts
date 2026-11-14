export const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// whole days between two local dates, DST-safe
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

// Grid of weeks (weekStart: 1 = Monday first, 0 = Sunday first) covering the month; null for padding cells.
export function monthGrid(year: number, month: number, weekStart: 0 | 1 = 1): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type GridDay = { date: Date; inMonth: boolean };

// Full weeks covering the month, including the neighbouring months' days at the edges.
export function monthGridFull(year: number, month: number, weekStart: 0 | 1 = 0): GridDay[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + count) / 7) * 7;
  const days: GridDay[] = Array.from({ length: total }, (_, i) => {
    const date = new Date(year, month, 1 - lead + i);
    return { date, inMonth: date.getMonth() === month };
  });
  const weeks: GridDay[][] = [];
  for (let i = 0; i < total; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
