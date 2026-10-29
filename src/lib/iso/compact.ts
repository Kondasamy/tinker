// Lossless SVG compaction for dense scenes (people, wheels, tins): the same picture in about two thirds of the bytes, so
// a scene with several people stays inside its size budget (tests/unit/scene-size.test.ts).
//  - A path drawn by pd()/sp() (absolute M/L/Z with one-decimal numbers) is rewritten with relative lines: each point
//    as its step from the last, in exact tenths, so no rounding drifts.
//  - stroke-linejoin="round" and stroke-linecap="round" move onto one wrapping group: both inherit, so every path joins
//    as before; a closed path has no caps, and every open stroke the engine draws (ink, line, rods' bars) is round-capped.
//    So does the commonest stroke width, .7 (every flat-shaded face's seam): a path with no stroke ignores it, and
//    inkScale() still scales the group's copy like any other.
// Paths with any other command (pill outlines, arcs) are left as they are.
const PD = / d="(M[\d. \-MLZ]*)"/g;
const NUM = /-?\d*\.?\d+/g;

/** A number of tenths as the shortest SVG number: 5 → .5, -15 → -1.5, 20 → 2. */
const tenths = (t: number) => {
  const s = (Math.abs(t) / 10).toString().replace(/^0\./, '.');
  return t < 0 ? `-${s}` : s;
};
/** Join numbers: a minus sign separates on its own. */
const join = (ns: string[]) => ns.reduce((o, n, i) => o + (i && n[0] !== '-' ? ' ' : '') + n, '');

/** One pd()-style path's d, with its lines relative. */
export function relPath(d: string): string {
  let out = '',
    cx = 0,
    cy = 0,
    sx = 0,
    sy = 0;
  for (const seg of d.match(/[MLZ][^MLZ]*/g) ?? []) {
    const c = seg[0];
    if (c === 'Z') {
      // closing returns the pen to the subpath's start
      out += 'Z';
      cx = sx;
      cy = sy;
      continue;
    }
    const [x, y] = (seg.match(NUM) ?? []).map(n => Math.round(Number(n) * 10));
    if (x === undefined || y === undefined) return d;
    if (c === 'M') {
      out += `M${join([tenths(x), tenths(y)])}`;
      sx = x;
      sy = y;
    } else {
      const step = join([tenths(x - cx), tenths(y - cy)]);
      // a line after a line needs no letter: the l carries on
      out += out.endsWith('Z') || /M[^l]*$/.test(out) ? `l${step}` : step[0] === '-' ? step : ` ${step}`;
    }
    cx = x;
    cy = y;
  }
  return out;
}

/** Compact a scene's drawing (not its pills: their paths are left alone anyway). */
export const compact = (svg: string) =>
  `<g stroke-linejoin="round" stroke-linecap="round" stroke-width=".7">${svg
    .replace(/ stroke-line(join|cap)="round"| stroke-width="\.7"/g, '')
    .replace(PD, (_, d) => ` d="${relPath(d)}"`)}</g>`;
