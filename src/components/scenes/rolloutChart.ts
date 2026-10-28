// Releases' precise view (the Errors tab): minute by minute up to now, the share of checkouts that failed on the new
// track (tomato dots) and on the old one (a cobalt line), over a band showing the share on the new track (mustard bars).
// The way back is marked: a tomato tick where it began, a mint one where the new track emptied. Pure layout, so the
// tests check it without drawing; the kit draws it as React SVG (text nodes only).
import { PALS } from '../../lib/iso/core.js';
import { TICKS, clock, pct, type Run } from '../../lib/releases/sim';

export const CHART_PAL = {
  new: PALS.tomato.l,
  old: PALS.cobalt.m,
  share: PALS.mustard.l,
  back: PALS.tomato.m,
  safe: PALS.mint.m,
};
const DESK = { w: 600, h: 300, pad: 12, label: 40, band: 60, gap: 18, axis: 20, fs: 11 },
  PHONE = { w: 340, h: 300, pad: 8, label: 34, band: 60, gap: 18, axis: 20, fs: 12 };

export interface Bar {
  t: number;
  x: number;
  w: number;
  share: number;
  /** failure rates this minute; null on a track nobody used */
  newRate: number | null;
  oldRate: number | null;
}

/** The chart's layout up to minute `upTo`. The time scale always spans the whole morning, so the page never resizes. */
export function rolloutChart(r: Run, upTo: number, phone = false) {
  const L = phone ? PHONE : DESK,
    x0 = L.pad + L.label,
    x1 = L.w - L.pad,
    cw = (x1 - x0) / TICKS,
    rateTop = L.pad,
    rateBottom = L.h - L.axis - L.band - L.gap,
    bandTop = rateBottom + L.gap,
    bandBottom = L.h - L.axis;
  const shown = r.ticks.slice(0, Math.max(0, Math.min(upTo, TICKS - 1)) + 1);
  const rates = shown.flatMap(k => [k.newN ? k.newErr / k.newN : 0, k.oldN ? k.oldErr / k.oldN : 0]);
  // the rate axis tops out at the next 5% over the worst minute, never under 10%
  const max = Math.max(0.1, Math.ceil(Math.max(0, ...rates) * 20) / 20);
  const Y = (rate: number) => rateBottom - (rate / max) * (rateBottom - rateTop);
  const bars: Bar[] = shown.map(k => ({
    t: k.t,
    x: x0 + k.t * cw,
    w: cw,
    share: k.share,
    newRate: k.newN ? k.newErr / k.newN : null,
    oldRate: k.oldN ? k.oldErr / k.oldN : null,
  }));
  const marks = r.milestones
    .filter(m => m.t <= upTo && (m.kind === 'back' || m.kind === 'safe'))
    .map(m => ({ t: m.t, kind: m.kind as 'back' | 'safe', x: x0 + m.t * cw }));
  return {
    w: L.w,
    h: L.h,
    fs: L.fs,
    x0,
    x1,
    cw,
    rateTop,
    rateBottom,
    bandTop,
    bandBottom,
    max,
    Y,
    shareY: (s: number) => bandBottom - s * (bandBottom - bandTop),
    bars,
    marks,
    yTicks: [0, max / 2, max].map(v => ({ y: Y(v), label: pct(v) })),
    xTicks: [0, Math.floor(TICKS / 2), TICKS - 1].map(t => ({ x: x0 + t * cw, label: clock(t) })),
  };
}
export type Chart = ReturnType<typeof rolloutChart>;

/** The chart in words, for its label. */
export function chartLabel(r: Run, upTo: number): string {
  const ks = r.ticks.slice(0, upTo + 1),
    sum = (f: (k: (typeof ks)[number]) => number) => ks.reduce((a, k) => a + f(k), 0);
  const nN = sum(k => k.newN),
    nE = sum(k => k.newErr),
    oN = sum(k => k.oldN),
    oE = sum(k => k.oldErr);
  return (
    `Failed checkouts by minute, ${clock(0)} to ${clock(upTo)}: ${nE} of ${nN} on the new track` +
    `${nN ? ` (${pct(nE / nN)})` : ''}, ${oE} of ${oN} on the old track${oN ? ` (${pct(oE / oN)})` : ''}.`
  );
}
