// Synthetic data's picture: the copier room (U26). Larkspur's real documents stand in a stack at the back; the copier
// (Larkspur mini) writes copies, which pass a sieve; along the front a shelf holds one stack of copies per generation.
// Each stack's top sheet carries rare marks: lit ones in proportion to that generation's measured rare next-word
// accuracy (runs.json) against generation 0's, the rest faded. Under "accumulate" a wire feeds the real stack back in.
// (The plan's other measure, distinct rare words used, failed its bar: copies write more rare pieces, not fewer.)
// The chosen generation is lit; its top sheet flips when shown, unless motion is off. Words only in pills; on phones
// (scale > 1.5) only the lit generation keeps its pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { ACC, BH, boxCorners, esc, sayAt, calloutsLast } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  cyl,
  pd,
  on,
  PX,
  PZ,
  rrUV,
  ellUV,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { RUNS, genOf, type Arm } from '../../lib/synthetic-data/runs';
import type { SieveKind } from '../../lib/synthetic-data/sieve';
import type { Say } from '../story/steps';

export const COPIER_BOARD: Board = [0, 0, 156, 124];
/** Rare-mark slots on each top sheet. */
export const MAX_MARKS = 12;

export interface CopierOpts {
  /** rare next-word accuracy per generation (0…5) on the shelf; [] draws an empty shelf */
  gens: number[];
  /** the generation shown and lit; null: none */
  gen: number | null;
  arm: Arm;
  /** generation 0's rare next-word accuracy: a full set of marks */
  real: number;
  sieve?: SieveKind;
  /** the copier is running */
  copying?: boolean;
  /** the lit top sheet flips in (off with reduced motion) */
  flip?: boolean;
  scale?: number;
  say?: Say;
}

/** The parts a step's callout may point at. */
export const COPIER_PARTS = ['originals', 'copier', 'sieve', 'copies'] as const;

/** Lit marks for an accuracy: proportional to generation 0's, capped at MAX_MARKS. */
export const marksFor = (acc: number, real: number) =>
  Math.max(0, Math.min(MAX_MARKS, Math.round((MAX_MARKS * acc) / real)));

/** The room for one arm at one generation, read off runs.json: every generation up to `gen` on the shelf. */
export function copierAt(arm: Arm, gen: number, o: Partial<CopierOpts> = {}): Omit<CopierOpts, 'say' | 'scale'> {
  return {
    gens: RUNS.arms[arm].slice(0, gen + 1).map(g => g.rareTop5),
    gen,
    arm,
    real: RUNS.arms[arm][0].rareTop5,
    ...o,
  };
}

const SIEVE_NAME: Record<SieveKind, string> = { off: 'SIEVE OFF', dedupe: 'DEDUPE', facts: 'DEDUPE + FACTS' };

/** What the room shows. Pure, so the tests can check it without drawing. */
export function copierState(o: CopierOpts) {
  const stacks = o.gens.slice(0, 6).map((acc, i) => ({ gen: i, acc, marks: marksFor(acc, o.real), lit: i === o.gen }));
  return {
    stacks,
    realMarks: marksFor(o.real, o.real),
    feedsBack: o.arm === 'accumulate',
    sieve: o.sieve ?? 'off',
    copying: !!o.copying,
    lit: stacks.find(s => s.lit) ?? null,
  };
}

type Part = { at: number[]; svg: string };
const ORIG = [24, 34],
  COPIER = [72, 44],
  SIEVE = [122, 36],
  SHELF_Y = 104,
  SHELF_X0 = 30,
  SHELF_X1 = 152,
  CW = 18, // copier half-width and height
  CH = 22;

/** A sheet's rare marks: MAX_MARKS dots in a 4 × 3 grid on the top face at z, `lit` of them inked tomato. */
function marks(x: number, y: number, z: number, lit: number, k = 1): string {
  let s = '';
  for (let i = 0; i < MAX_MARKS; i++) {
    const cx = x - 4.5 * k + (i % 4) * 3 * k,
      cy = y - 3 * k + Math.floor(i / 4) * 3 * k;
    s += `<path class="mark" data-lit="${i < lit ? 1 : 0}" d="${pd(on(PZ(z + 0.2), ellUV(cx, cy, 0.9 * k, 0.9 * k, 8)))}" fill="${i < lit ? PALS.tomato.m : CERAMIC.m}" stroke="${i < lit ? INK : CERAMIC.d}" stroke-width="${i < lit ? 0.5 : 0.4}"/>`;
  }
  return s;
}

/** A stack of paper: sheets as thin boxes, the top one with its marks. */
function stack(x: number, y: number, h: number, lit: number, k = 1, top = '', z0 = BH): string {
  const w = 7 * k,
    d = 5.5 * k;
  let s = box(x - w, y - d, z0, x + w, y + d, z0 + h, CERAMIC, toneI, 0.8);
  for (let z = z0 + 2; z < z0 + h; z += 2)
    s += `<path d="${pd(
      [
        [x + w + 0.1, y - d, z],
        [x + w + 0.1, y + d, z],
      ],
      false,
    )}" stroke="${CERAMIC.d}" stroke-width=".5" fill="none"/>`;
  const sheet = marks(x, y, z0 + h, lit, k);
  s += top ? `<g class="${top}">${sheet}</g>` : sheet;
  return s + hullInk(boxCorners(x - w, y - d, z0, x + w, y + d, z0 + h), 1.3);
}

/** The copier: a dark body, a metal lid, a glass strip glowing while it runs, and the out tray toward the sieve. */
function copier(running: boolean): Part {
  const [x, y] = COPIER,
    z1 = BH + CH;
  let s = box(x - CW, y - CW + 4, BH, x + CW, y + CW - 4, z1, DARK, toneI, 1);
  s += box(x - CW, y - CW + 4, z1, x + CW, y + CW - 4, z1 + 3, METAL, toneI, 0.9);
  s += `<path d="${pd(on(PX(x + CW + 0.15), rrUV(y - 8, BH + 8, y + 8, BH + 14, 2)))}" fill="${running ? PALS.mint.l : DARK.d}" stroke="${INK}" stroke-width="1"/>`;
  s += box(x + CW, y - 6, BH + 6, x + CW + 8, y + 6, BH + 7.5, METAL, toneI, 0.8);
  s += hullInk(boxCorners(x - CW, y - CW + 4, BH, x + CW + 8, y + CW - 4, z1 + 3), 1.8);
  return { at: [x, y, 0], svg: `<g class="copier" data-running="${running ? 1 : 0}">${s}</g>` };
}

/** The sieve: a round metal frame on a stand, its mesh lit when it filters. */
function sieveOf(kind: SieveKind): Part {
  const [x, y] = SIEVE,
    z = BH + 14,
    live = kind !== 'off';
  let s = cyl(x, y, BH, z - 2, 2.2, METAL, toneI, 0.9, 10);
  s += cyl(x, y, z - 2, z + 2, 11, live ? PALS.mustard : METAL, toneI, 1.2, 24);
  for (let i = -2; i <= 2; i++)
    s += `<path d="${pd(
      [
        [x + i * 3.6, y - Math.sqrt(100 - (i * 3.6) ** 2), z + 2.1],
        [x + i * 3.6, y + Math.sqrt(100 - (i * 3.6) ** 2), z + 2.1],
      ],
      false,
    )}" stroke="${INK}" stroke-width=".5"/>`;
  return { at: [x, y, 0], svg: `<g class="sieve" data-sieve="${kind}">${s}</g>` };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

const slotX = (i: number) => SHELF_X0 + ((SHELF_X1 - SHELF_X0) / 6) * (i + 0.5);

/** The copier room. Shadows, wires (floor), then the parts back to front, then every pill on top. */
export const copierScene = (o: CopierOpts) => (ctx: SceneCtx) => {
  const st = copierState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const sh = (x0: number, y0: number, x1: number, y1: number, h: number) =>
    castShadow(boxCorners(x0, y0, BH, x1, y1, BH + h), BH, ctx.top);
  let s = sh(ORIG[0] - 7, ORIG[1] - 5.5, ORIG[0] + 7, ORIG[1] + 5.5, 18);
  s += sh(COPIER[0] - CW, COPIER[1] - CW + 4, COPIER[0] + CW, COPIER[1] + CW - 4, CH + 3);
  // wires: originals → copier (always for generation 0; under accumulate for every generation), copier → sieve → shelf
  const wire = (a: number[], b: number[], lit: boolean) => {
    const d = pd([a, b], false);
    return (
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${lit ? 5 : 3.6}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${lit ? ACC : DARK.l}" stroke-width="${lit ? 2.8 : 1.6}" stroke-linecap="round"/>`
    );
  };
  const feed = st.feedsBack || o.gen === 0;
  s += `<g class="feed" data-lit="${feed ? 1 : 0}">${wire([ORIG[0] + 7, ORIG[1] + 4, BH + 0.3], [COPIER[0] - CW, COPIER[1], BH + 0.3], feed)}</g>`;
  s += wire([COPIER[0] + CW + 8, COPIER[1] - 4, BH + 0.3], [SIEVE[0], SIEVE[1], BH + 0.3], st.copying);
  s += wire([SIEVE[0], SIEVE[1], BH + 0.3], [SIEVE[0], SHELF_Y - 8, BH + 0.3], st.copying);
  // the shelf
  const shelf =
    box(SHELF_X0, SHELF_Y - 8, BH, SHELF_X1, SHELF_Y + 8, BH + 3, WOOD, toneI, 1) +
    hullInk(boxCorners(SHELF_X0, SHELF_Y - 8, BH, SHELF_X1, SHELF_Y + 8, BH + 3), 1.5);
  const parts: Part[] = [
    { at: [ORIG[0], ORIG[1], 0], svg: `<g class="originals">${stack(ORIG[0], ORIG[1], 18, st.realMarks)}</g>` },
    copier(st.copying),
    sieveOf(st.sieve),
    { at: [(SHELF_X0 + SHELF_X1) / 2, SHELF_Y, 0], svg: `<g class="shelf">${shelf}</g>` },
  ];
  for (const k of st.stacks) {
    const x = slotX(k.gen),
      ring = k.lit
        ? `<path d="${pd(on(PZ(BH + 3.2), rrUV(x - 9, SHELF_Y - 7.5, x + 9, SHELF_Y + 7.5, 2)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
        : '';
    // shift each stack's depth key forward of the shelf so it draws on top of it
    parts.push({
      at: [x, SHELF_Y + 9, 0],
      svg: `<g class="copy" data-gen="${k.gen}" data-marks="${k.marks}" data-lit="${k.lit ? 1 : 0}">${ring}${stack(x, SHELF_Y, 11, k.marks, 1.15, k.lit && o.flip ? 'sd-flip' : '', BH + 3)}</g>`,
    });
  }
  s += byDepth(parts);
  const origAt = [ORIG[0], ORIG[1], BH + 18],
    copierAt3 = [COPIER[0], COPIER[1], BH + CH + 3],
    sieveAt3 = [SIEVE[0], SIEVE[1], BH + 16],
    litX = slotX(st.lit?.gen ?? Math.max(0, st.stacks.length - 1)),
    copyAt3 = [litX, SHELF_Y, BH + 14];
  const pills = [
    sayAt(o.say, 'originals', origAt, -14, scale),
    sayAt(o.say, 'copier', copierAt3, -14, scale),
    sayAt(o.say, 'sieve', sieveAt3, -14, scale),
    sayAt(o.say, 'copies', copyAt3, -12, scale),
  ];
  if (!narrow)
    pills.push(
      pill(origAt, 0, -14, st.feedsBack ? 'REAL DOCS · KEPT' : 'REAL DOCS', st.feedsBack, scale),
      pill(copierAt3, 0, -14, st.copying ? 'COPYING' : 'LARKSPUR MINI', st.copying, scale),
      pill(sieveAt3, 0, -14, SIEVE_NAME[st.sieve], st.sieve !== 'off', scale),
    );
  if (st.lit)
    pills.push(pill(copyAt3, 0, -12, `GEN ${st.lit.gen} · RARE ${Math.round(st.lit.acc * 100)}%`, true, scale));
  else if (!narrow) pills.push(pill(copyAt3, 0, -12, 'NO COPIES', false, scale));
  return s + calloutsLast(pills);
};

/** The home hero's plot: a small copier and three copy stacks, their rare marks fading left to right. */
export function copierPlot(x: number, y: number, top: SceneCtx['top']): string {
  const c = [x - 16, y - 14, x + 2, y - 2];
  const body =
    box(c[0], c[1], BH, c[2], c[3], BH + 11, DARK, toneI, 1) +
    box(c[0], c[1], BH + 11, c[2], c[3], BH + 13, METAL, toneI, 0.8) +
    `<path d="${pd(on(PX(c[2] + 0.15), rrUV(c[1] + 3, BH + 4, c[3] - 3, BH + 8, 1.5)))}" fill="${PALS.mint.l}" stroke="${INK}" stroke-width=".8"/>` +
    hullInk(boxCorners(c[0], c[1], BH, c[2], c[3], BH + 13), 1.6);
  const lits = [MAX_MARKS, 8, 4];
  return (
    castShadow(boxCorners(c[0], c[1], BH, c[2], c[3], BH + 13), BH, top) +
    byDepth([
      { at: [x - 7, y - 8, 0], svg: body },
      ...lits.map((l, i) => ({ at: [x - 6 + i * 11, y + 10, 0], svg: stack(x - 6 + i * 11, y + 10, 6, l, 0.55) })),
    ])
  );
}

/** The home card's picture (and the intro's hero): generation 5 under replace, the full shelf. */
export const copierCard = (scale = 1.6): CopierOpts => ({ ...copierAt('replace', RUNS.generations), scale });

/** The picture in words, for its aria-label. */
export function copierLabel(o: CopierOpts): string {
  const st = copierState(o);
  return (
    `A copier room: Larkspur’s real documents ${st.feedsBack ? 'feed the copier with every generation' : 'stand at the back'}, ` +
    `the copier ${st.copying ? 'is running' : 'is idle'}, the sieve is ${st.sieve === 'off' ? 'off' : `set to ${SIEVE_NAME[st.sieve].toLowerCase()}`}. ` +
    (st.stacks.length
      ? `The shelf holds ${st.stacks.length} stack${st.stacks.length === 1 ? '' : 's'} of copies` +
        (st.lit
          ? `; generation ${st.lit.gen} is shown, its top sheet with ${st.lit.marks} of ${MAX_MARKS} rare marks (it guesses ${Math.round(st.lit.acc * 100)}% of rare words in real text).`
          : '.')
      : 'The shelf is empty.')
  );
}

/** The read-out beside the room: each generation's measures as text. */
export const copierReadouts = (arm: Arm, gen: number) => {
  const g = genOf(arm, gen);
  return [
    `Generation ${gen}, ${arm}`,
    `held-out loss ${g.heldout.toFixed(2)}`,
    `rare words guessed ${Math.round(g.rareTop5 * 100)}%`,
    `all words ${Math.round(g.top5 * 100)}%`,
    `repeats ${(g.repeatRate * 100).toFixed(1)}%`,
  ];
};
