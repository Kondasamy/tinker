// Diffusion LMs' picture: the type frame (KTD15). A printer's iron chase holds the 32-token window as four rows of eight
// slots: the given phrase stands in cream slugs, the reply's slots wait as dark blank slugs ([MASK]). Each pass a press
// at the back stamps its slots: lit mint this pass, cobalt once set. Under every reply slot a mustard glow is as large
// as the model's confidence in it (its guess while blank, its stamp once set), so the frame fills in any order, surest
// first. Beside it stands Larkspur mini's typewriter, its paper as long as the tokens it has typed, one a pass; a dial
// in front points at the tokens stamped a pass. Words only in pills; on phones (scale > 1.5) the pills keep only names
// and slot numbers, and the caption carries the rest.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  box,
  byDepth,
  castShadow,
  cyl,
  cylX,
  f,
  hullInk,
  line,
  P,
  rod,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { KS, show } from '../../lib/diffusion-llms/decode';
import type { Say } from '../story/steps';

export const FRAME_BOARD: Board = [4, 6, 198, 108];

/** A reply slot: blank (with the model's current guess, if it has looked), stamped this pass, or set earlier. */
export interface FrameSlot {
  state: 'mask' | 'new' | 'set';
  /** the token guessed or stamped (ignored while blank with no guess) */
  tok: number;
  /** the probability behind it: the glow's size (0 for none) */
  p: number;
}
export interface FrameOpts {
  /** the given phrase's length, in slots */
  given: number;
  /** one blank inside the phrase (chapter 2): its window position and what it holds */
  hole?: { at: number; slot: FrameSlot };
  /** the reply's slots; none while the toy masked model sits idle */
  slots: FrameSlot[];
  /** passes done and passes the fill takes (the press's pill) */
  pass?: number;
  passes?: number;
  /** tokens stamped a pass: the dial's pointer */
  k?: number;
  /** tokens Larkspur mini has typed, and of how many; undefined: the typewriter stands idle */
  typed?: number;
  typeOf?: number;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}
/** The parts a step's callout may name. */
export const FRAME_PARTS = ['frame', 'press', 'typewriter', 'dial'] as const;

const COLS = 8,
  PITCH = 13,
  TILE = 10,
  X0 = 22,
  Y0 = 30,
  BED = BH + 3,
  SLUG = 5,
  BLANK = 1.6,
  TW = { x0: 150, y0: 30, x1: 182, y1: 54 },
  DIAL = [178, 76];

/** Where slot n's tile stands: (x, y) of its back corner. Rows read along x, row after row toward the viewer. */
export const slotAt = (n: number) => [X0 + (n % COLS) * PITCH, Y0 + Math.floor(n / COLS) * PITCH];
/** A glow's half-width for a probability: a lit square on the slug's top, from a speck to nearly the whole top. */
export const glowOf = (p: number) => 1 + 3.6 * Math.max(0, Math.min(1, p));
/** The dial's pointer angle in degrees for k: the KS notches spread over 240°, one a pass on the left. */
export const dialAngle = (k: number) => {
  const i = Math.max(0, KS.indexOf(k as (typeof KS)[number]));
  return -120 + (240 * i) / (KS.length - 1);
};

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;
const flat = (x0: number, y0: number, x1: number, y1: number, z: number) =>
  'M' +
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
    .map(([x, y]) => {
      const q = P(x, y, z);
      return `${f(q[0])} ${f(q[1])}`;
    })
    .join('L') +
  'Z';

const total = (o: FrameOpts) => o.given + o.slots.length;
/** The chase: an iron bed just large enough for the window's slots (rows of eight). */
function chaseBox(o: FrameOpts) {
  const rows = Math.max(1, Math.ceil(total(o) / COLS));
  return [X0 - 4, Y0 - 4, X0 + COLS * PITCH + 1, Y0 + rows * PITCH + 1] as const;
}

/** The frame: the bed, then every slug back to front, each reply slot with its glow on top. */
function frame(o: FrameOpts) {
  const [x0, y0, x1, y1] = chaseBox(o);
  let s = box(x0, y0, BH, x1, y1, BED, METAL, toneI, 1);
  s +=
    box(x0, y0, BED, x0 + 2, y1, BED + 2, METAL, toneI, 0.8) + box(x0, y0, BED, x1, y0 + 2, BED + 2, METAL, toneI, 0.8);
  const tiles: { n: number; svg: string }[] = [];
  for (let n = 0; n < total(o); n++) {
    const [x, y] = slotAt(n);
    const sl = n < o.given ? (o.hole?.at === n ? o.hole.slot : null) : o.slots[n - o.given];
    const state = sl ? sl.state : 'given';
    const m = state === 'given' ? CERAMIC : state === 'new' ? PALS.mint : state === 'set' ? PALS.cobalt : DARK;
    const h = state === 'mask' ? BLANK : SLUG;
    let t = box(x, y, BED, x + TILE, y + TILE, BED + h, m, toneI, 0.9);
    if (sl && sl.p > 0) {
      // the glow: a lit square on the slug's top, as wide as the model's confidence in this slot
      const g = glowOf(sl.p),
        cx = x + TILE / 2,
        cy = y + TILE / 2;
      t += `<path d="${flat(cx - g, cy - g, cx + g, cy + g, BED + h + 0.05)}" fill="${PALS.mustard.l}" stroke="${PALS.mustard.d}" stroke-width="0.6" data-glow="${sl.p.toFixed(3)}" data-slot="${n < o.given ? 'hole' : n - o.given}"/>`;
    } else if (!sl) {
      // a raised letter mark on the slug's face: a short bar, not text (the words go in pills and the strip)
      t += line(
        [
          [x + 3, y + 5, BED + h + 0.05],
          [x + 7, y + 5, BED + h + 0.05],
        ],
        1,
      );
    }
    tiles.push({
      n,
      svg: `<g data-slot-n="${n}" data-state="${state}">${t + hullInk(boxCorners(x, y, BED, x + TILE, y + TILE, BED + h), 1.2)}</g>`,
    });
  }
  tiles.sort((a, b) => {
    const [ax, ay] = slotAt(a.n),
      [bx, by] = slotAt(b.n);
    return ax + ay - (bx + by) || ax - bx;
  });
  s += `<g data-glows="${o.slots.filter(sl => sl.p > 0).length}">${tiles.map(t => t.svg).join('')}</g>`;
  const lit = o.slots.filter(sl => sl.state === 'new').length;
  return `<g data-part="frame" data-given="${o.given}" data-reply="${o.slots.length}" data-new="${lit}">${s}</g>`;
}

/** The surest slot stamped on the latest pass, if any. */
export function surest(o: FrameOpts): number | null {
  let best: number | null = null;
  o.slots.forEach((sl, i) => {
    if (sl.state === 'new' && (best === null || sl.p > o.slots[best].p)) best = i;
  });
  return best;
}

/** The press: two posts behind the frame, a crossbar, and a head over the surest slot it just stamped. */
function press(o: FrameOpts, at: number | null) {
  const [x0, y0, x1] = chaseBox(o),
    yb = y0 - 7,
    top = BH + 30;
  let s = box(x0 - 2, yb - 2, BH, x0 + 2, yb + 2, top, METAL, toneI, 1);
  s += box(x1 - 2, yb - 2, BH, x1 + 2, yb + 2, top, METAL, toneI, 1);
  s += box(x0 - 3, yb - 2.5, top, x1 + 3, yb + 2.5, top + 4, DARK, toneI, 1);
  const lit = at !== null;
  const hx = lit ? slotAt(o.given + at)[0] + TILE / 2 : (x0 + x1) / 2;
  s += box(hx - 5, yb - 4, top - 6, hx + 5, yb + 4, top + 5, lit ? PALS.mustard : METAL, toneI, 1);
  if (lit) {
    const [tx, ty] = slotAt(o.given + at!);
    s += rod([hx, yb + 3, top - 4], [tx + TILE / 2, ty + TILE / 2, BED + SLUG + 3], 0.9, METAL);
  }
  return `<g data-part="press" data-lit="${lit ? 1 : 0}">${s}</g>`;
}

/** Larkspur mini's typewriter: a body, keys, a roller, and paper as long as what it has typed. */
function typewriter(o: FrameOpts) {
  const { x0, y0, x1, y1 } = TW,
    z = BH + 9,
    on = o.typed !== undefined;
  let s = box(x0, y0, BH, x1, y1, z, on ? PALS.cobalt : METAL, toneI, 1);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const kx = x0 + 4 + c * 5.4,
        ky = y0 + 10 + r * 4.4;
      s += box(kx, ky, z, kx + 3.2, ky + 2.6, z + 1.4, CERAMIC, toneI, 0.6);
    }
  const typed = o.typed ?? 0,
    paperH = 6 + typed * 1.4;
  s += box(x0 + 3, y0 + 2, z, x1 - 3, y0 + 3.2, z + paperH, CERAMIC, toneI, 0.9);
  // a typed line per token, on the paper's front, newest lowest (marks, not text)
  for (let i = 0; i < typed; i++) {
    const lz = z + paperH - 2 - i * 1.4,
      w = 6 + ((i * 7) % 11);
    s += line(
      [
        [x0 + 6, y0 + 3.3, lz],
        [x0 + 6 + w, y0 + 3.3, lz],
      ],
      0.6,
    );
  }
  s += cylX(x0 - 1, x1 + 1, y0 + 4, z + 1.5, 2.4, DARK, toneI, 1);
  return `<g data-part="typewriter" data-typed="${typed}">${s}</g>`;
}

/** The dial: tokens stamped a pass, one notch per k, the pointer on the one set. */
function dial(k?: number) {
  const [cx, cy] = DIAL,
    top = BH + 8,
    R = 10;
  const dir = (deg: number, r: number) => {
    const t = (deg * Math.PI) / 180,
      q = r / Math.SQRT2;
    return [cx + q * (Math.sin(t) - Math.cos(t)), cy - q * (Math.sin(t) + Math.cos(t))];
  };
  let s = cyl(cx, cy, BH, top, R + 2, METAL, toneI, 1.2);
  s += cyl(cx, cy, top, top + 1, R, CERAMIC, toneI, 0.8);
  for (const n of KS) {
    const d = dialAngle(n),
      [ax, ay] = dir(d, R - 1),
      [bx, by] = dir(d, R - 3.2);
    s += line(
      [
        [ax, ay, top + 1.05],
        [bx, by, top + 1.05],
      ],
      0.7,
    );
  }
  if (k !== undefined) {
    const [px, py] = dir(dialAngle(k), R - 2.4);
    s += rod([cx, cy, top + 1.3], [px, py, top + 1.3], 0.9, PALS.tomato);
  }
  s += cyl(cx, cy, top + 1, top + 2.2, 1.6, DARK, toneI, 0.8);
  return `<g data-part="dial" data-k="${k ?? ''}" data-angle="${k === undefined ? '' : dialAngle(k)}">${s}</g>`;
}

/** A token for a pill: its piece, quoted, spaces kept visible at the edges. */
const quoted = (tok: number) => `“${show(tok).trim() || '·'}”`;

/** The type frame. Shadows, then the parts back to front, then the pills. */
export const typeFrameScene = (o: FrameOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    at = surest(o);
  const [x0, y0, x1, y1] = chaseBox(o);
  let s =
    castShadow(boxCorners(x0, y0, BH, x1, y1, BED + SLUG), BH, ctx.top) +
    castShadow(boxCorners(TW.x0, TW.y0, BH, TW.x1, TW.y1, BH + 9), BH, ctx.top);
  s += byDepth([
    { at: [(x0 + x1) / 2, y0 - 7, 0], svg: press(o, at) },
    { at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], svg: frame(o) },
    { at: [(TW.x0 + TW.x1) / 2, (TW.y0 + TW.y1) / 2, 0], svg: typewriter(o) },
    { at: [DIAL[0], DIAL[1], 0], svg: dial(o.k) },
  ]);
  const running = o.pass !== undefined && o.passes !== undefined;
  const pressText = !running ? 'PRESS' : narrow ? `PASS ${o.pass}` : `PASS ${o.pass} OF ${o.passes}`;
  const typing = o.typed !== undefined;
  const twText = narrow || !typing ? 'MINI' : `MINI · ${o.typed} PASS${o.typed === 1 ? '' : 'ES'}`;
  const dialText = o.k === undefined ? 'K' : narrow ? `K ${o.k}` : `${o.k} A PASS`;
  const pressAt = [(x0 + x1) / 2, y0 - 7, BH + 35],
    frameAt = [x0, y1, BED],
    twAt = [(TW.x0 + TW.x1) / 2, TW.y0 + 2, BH + 9 + 6 + (o.typed ?? 0) * 1.4],
    dialAt = [DIAL[0], DIAL[1], BH + 9];
  const hole = o.hole && o.hole.slot.state !== 'mask' ? o.hole : null;
  const holePill = hole
    ? (() => {
        const [x, y] = slotAt(hole.at);
        const words = narrow ? 'BLANK' : `BLANK ${quoted(hole.slot.tok)} ${Math.round(hole.slot.p * 100)}%`;
        return pill([x + TILE / 2, y + TILE / 2, BED + SLUG], narrow ? -30 : -18, words, true, scale);
      })()
    : '';
  const slotPill =
    at === null
      ? ''
      : (() => {
          const [x, y] = slotAt(o.given + at),
            sl = o.slots[at];
          const words = narrow ? `#${at + 1}` : `#${at + 1} ${quoted(sl.tok)} ${Math.round(sl.p * 100)}%`;
          return pill([x + TILE / 2, y + TILE / 2, BED + SLUG], narrow ? -30 : -18, words, true, scale);
        })();
  return (
    s +
    pill(pressAt, -12, pressText, running && at !== null, scale) +
    pill(frameAt, 30, o.slots.length && !narrow ? 'TOY MASKED MODEL' : 'FRAME', false, scale) +
    pill(twAt, -14, twText, typing, scale) +
    pill(dialAt, 20, dialText, false, scale) +
    slotPill +
    holePill +
    sayAt(o.say, 'press', pressAt, -12, scale, narrow) +
    sayAt(o.say, 'frame', frameAt, 30, scale, narrow) +
    sayAt(o.say, 'typewriter', twAt, -14, scale, narrow) +
    sayAt(o.say, 'dial', dialAt, 20, scale, narrow)
  );
};

/** The picture in words, for its aria-label. */
export function frameLabel(o: FrameOpts): string {
  const set = o.slots.filter(s => s.state !== 'mask').length;
  const frame = o.slots.length
    ? `A type frame holds a ${o.given}-token phrase and ${o.slots.length} reply slots, ${set} stamped${
        o.pass !== undefined && o.passes !== undefined ? ` after pass ${o.pass} of ${o.passes}` : ''
      }.`
    : `A type frame holds a ${o.given}-token phrase.`;
  const tw =
    o.typed === undefined
      ? 'Larkspur mini’s typewriter stands idle.'
      : `Larkspur mini’s typewriter has typed ${o.typed} token${o.typed === 1 ? '' : 's'}, one a pass.`;
  const k = o.k === undefined ? '' : ` The dial is set to ${o.k} token${o.k === 1 ? '' : 's'} a pass.`;
  return `${frame} ${tw}${k}`;
}

/** The home hero's plot (heroScene): a small chase of two rows, a few slugs stamped mint among dark blanks, and a
 * squat typewriter beside it. */
export function typeFramePlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 3,
    p = 7;
  let t = box(x - 18, y - 9, BH, x + 12, y + 9, z, METAL, toneI, 1);
  const lit = new Set([1, 6]),
    set = new Set([0, 3, 4]);
  const cells: string[] = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 4; c++) {
      const n = r * 4 + c,
        cx = x - 16 + c * p,
        cy = y - 7 + r * p;
      const m = lit.has(n) ? PALS.mint : set.has(n) ? PALS.cobalt : DARK,
        h = lit.has(n) || set.has(n) ? 3 : 1;
      cells.push(box(cx, cy, z, cx + 5, cy + 5, z + h, m, toneI, 0.7));
    }
  t += cells.join('') + hullInk(boxCorners(x - 18, y - 9, BH, x + 12, y + 9, z + 3), 1.4);
  const w =
    box(x + 18, y - 8, BH, x + 30, y + 2, BH + 5, PALS.cobalt, toneI, 1) +
    box(x + 19, y - 8, BH + 5, x + 29, y - 7, BH + 11, CERAMIC, toneI, 0.8);
  return (
    castShadow(boxCorners(x - 18, y - 9, BH, x + 12, y + 9, z), BH, top) +
    byDepth([
      { at: [x - 3, y, 0], svg: `<g>${t}</g>` },
      { at: [x + 24, y - 3, 0], svg: `<g>${w}</g>` },
    ])
  );
}
