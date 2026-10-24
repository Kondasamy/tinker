// The A/B testing module's precise view (the Result tab): B's rate minus A's after each day, time running right. Each
// day is a dot with its interval drawn as a band, round a zero line; a day whose interval clears zero is significant
// (inked dot). A dashed line marks the planned end, and a peek marker the day a daily check would have stopped. Each
// day is one focusable column. Pure layout, so the tests check it without drawing; the kit draws it as React SVG.
import { PALS } from '../../lib/iso/core.js';
import { ASSUMPTIONS, resultAt, type Metric, type Run } from '../../lib/ab-testing/sim';

export const CHART_PAL = { band: PALS.cobalt.l, win: PALS.mint.l, lose: PALS.tomato.l, peek: PALS.mustard.l };
const DESK = { w: 600, pad: 20, label: 46, plot: 170, axis: 20, fs: 10 },
  PHONE = { w: 340, pad: 18, label: 40, plot: 170, axis: 20, fs: 10 };

export interface ChartOpts {
  arm?: number;
  metric?: Metric;
  /** the day index a daily peek stopped on, if one did */
  peek?: number | null;
  phone?: boolean;
  level?: number;
}
export interface Column {
  t: number;
  x: number;
  w: number;
  cx: number;
  y: number;
  lo: number;
  hi: number;
  significant: boolean;
  up: boolean;
}

/** Points of a share: 0.012 is 1.2 points. */
export const points = (x: number) => x * 100;
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(points(x)).toFixed(1)}`;

/** The chart's layout: a column per day. The scale is symmetric round zero, wide enough for every day's interval. */
export function resultChart(r: Run, o: ChartOpts = {}) {
  const L = o.phone ? PHONE : DESK,
    level = o.level ?? ASSUMPTIONS.level,
    arm = o.arm ?? 1,
    metric = o.metric ?? 'orders',
    x0 = L.pad + L.label,
    n = r.length,
    w = (L.w - L.pad - x0) / n,
    top = L.pad,
    bottom = top + L.plot;
  const res = r.map((_, t) => resultAt(r, t, level, arm, metric));
  // the half-range in points: whole points, at least 3
  const span = Math.max(3, Math.ceil(Math.max(...res.flatMap(c => [Math.abs(points(c.lo)), Math.abs(points(c.hi))]))));
  const yOf = (share: number) => top + ((span - points(share)) / (2 * span)) * L.plot;
  const columns: Column[] = res.map((c, t) => ({
    t,
    x: x0 + t * w,
    w,
    cx: x0 + (t + 0.5) * w,
    y: yOf(c.diff),
    lo: yOf(c.lo),
    hi: yOf(c.hi),
    significant: c.significant,
    up: c.diff > 0,
  }));
  const step = span > 6 ? 2 : 1;
  const ticks: { y: number; label: string }[] = [];
  for (let v = -span; v <= span; v += step)
    ticks.push({ y: yOf(v / 100), label: v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v)}` });
  return {
    columns,
    w: L.w,
    h: bottom + L.axis + 4,
    x0,
    fs: L.fs,
    top,
    bottom,
    zeroY: yOf(0),
    ticks,
    days: columns.filter(c => c.t === 0 || (c.t + 1) % 7 === 0).map(c => ({ x: c.cx, label: `${c.t + 1}` })),
    end: columns[n - 1].cx,
    peek: o.peek != null && o.peek >= 0 && o.peek < n ? columns[o.peek].cx : null,
    band: `${columns.map(c => `${c.cx},${c.hi}`).join(' ')} ${[...columns]
      .reverse()
      .map(c => `${c.cx},${c.lo}`)
      .join(' ')}`,
  };
}
export type ResultChart = ReturnType<typeof resultChart>;

/** One day in words, for the read-out line. */
export function dayName(
  r: Run,
  t: number,
  {
    arm = 1,
    metric = 'orders',
    level = ASSUMPTIONS.level,
    name = 'B',
  }: { arm?: number; metric?: Metric; level?: number; name?: string } = {},
): string {
  const c = resultAt(r, t, level, arm, metric),
    what = metric === 'orders' ? 'buying' : 'returns';
  const verdict = c.significant ? `${c.diff > 0 ? name : 'A'} ${metric === 'orders' ? 'wins' : 'higher'}` : 'no winner';
  return `Day ${t + 1}: ${name} − A in ${what} = ${signed(c.diff)} points; interval ${signed(c.lo)} to ${signed(c.hi)}; ${verdict}.`;
}

/** The chart in words, for its label. */
export function chartLabel(r: Run, o: ChartOpts & { name?: string } = {}) {
  const last = r.length - 1,
    c = resultAt(r, last, o.level ?? ASSUMPTIONS.level, o.arm ?? 1, o.metric ?? 'orders');
  return (
    `Result chart, a column per day for ${r.length} days: ${o.name ?? 'B'} minus A ${o.metric === 'returns' ? 'in returns' : 'in buying'}, ` +
    `with its interval. At the end: ${signed(c.diff)} points, ${c.significant ? 'significant' : 'not significant'}.` +
    (o.peek != null ? ` A daily peek would have stopped on day ${o.peek + 1}.` : '')
  );
}
