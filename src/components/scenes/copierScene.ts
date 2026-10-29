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
  PY,
  rectUV,
  shape,
  fill,
  line,
  ink,
  rod,
  loft,
  openShell,
  extrude,
  vis,
  matOf,
  clipTo,
} from '../../lib/iso/core.js';
import { SKIN, hexa, mini, person, shaded, type Look, drawPieces } from '../../lib/iso/figures';
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

type Item = { box: number[][]; svg: string };
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
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

/** The copier: an office photocopier. Real-object notes: a pale grey cabinet with rounded edges on a dark plinth; two
 * paper drawers across its front, each with a grip; a dark hinged lid over the glass on top, the scan light glowing
 * mint from under its front edge while it copies; a control panel at the front corner with a small screen and a start
 * button (lit while it runs); an out tray sloping off the side toward the sieve, copies lying on it. */
const SHELL = matOf('#dcd8cc');
function copier(running: boolean): Item[] {
  const [x, y] = COPIER,
    x0 = x - CW,
    x1 = x + CW,
    y0 = y - CW + 4,
    y1 = y + CW - 4,
    zb = BH + 2,
    zt = BH + CH - 2;
  const PROF = rrUV(y0, zb, y1, zt, 3, 4);
  let s = box(x0 + 1, y0 + 1, BH, x1 - 1, y1 - 1, zb, DARK, toneI, 0.9);
  for (const [cx, n] of [
    [x0, [-1, 0, 0]],
    [x1, [1, 0, 0]],
  ] as [number, number[]][])
    if (vis(n)) s += shape(on(PX(cx), PROF), toneI(n, SHELL), 1.2);
  s += extrude(PROF, x0, x1, SHELL, toneI) + hullInk([...on(PX(x0), PROF), ...on(PX(x1), PROF)], 2.2);
  // the paper drawers on the front (+y) face
  for (const sy of [-1, 1]) {
    if (!vis([0, sy, 0])) continue;
    const Y = (sy > 0 ? y1 : y0) + sy * 0.15;
    for (const [z0, z1] of [
      [zb + 1.5, zb + 7.5],
      [zb + 8.5, zb + 14.5],
    ]) {
      s += shape(on(PY(Y), rrUV(x0 + 3, z0, x1 - 3, z1, 1, 2)), SHELL.m, 0.8);
      s += shape(on(PY(Y + sy * 0.1), rrUV(x - 5, z1 - 2.6, x + 5, z1 - 1.2, 0.6, 2)), DARK.d, 0.6);
    }
    // the scan light under the lid's front edge
    s += fill(pd(on(PY(Y), rectUV(x0 + 4, zt - 2.4, x1 - 12, zt - 1))), running ? PALS.mint.l : DARK.m);
  }
  // the lid over the glass, and the control panel at the front corner
  s += box(x0 + 1, y0 + 1, zt, x1 - 11, y1 - 1, zt + 3, DARK, toneI, 1);
  s += hexa(
    [
      [x1 - 10, y0 + 2, zt],
      [x1 - 1, y0 + 2, zt],
      [x1 - 1, y1 - 1, zt],
      [x1 - 10, y1 - 1, zt],
      [x1 - 10, y0 + 2, zt + 4],
      [x1 - 1, y0 + 2, zt + 2],
      [x1 - 1, y1 - 1, zt + 2],
      [x1 - 10, y1 - 1, zt + 4],
    ],
    SHELL,
    1,
  );
  // the panel's top slopes down toward +x: a small screen and the start button on it
  const pz = (u: number) => zt + 4 - ((u - (x1 - 10)) / 9) * 2;
  s += shape(
    [
      [x1 - 8.5, y0 + 4, pz(x1 - 8.5) + 0.1],
      [x1 - 5, y0 + 4, pz(x1 - 5) + 0.1],
      [x1 - 5, y0 + 13, pz(x1 - 5) + 0.1],
      [x1 - 8.5, y0 + 13, pz(x1 - 8.5) + 0.1],
    ],
    '#1d2a26',
    0.6,
  );
  s += cyl(x1 - 5, y1 - 5, pz(x1 - 5), pz(x1 - 5) + 1, 1.6, running ? PALS.mint : DARK, toneI, 0.7, 10);
  // the out tray on the side toward the sieve, with copies on it
  const tray =
    hexa(
      [
        [x1, y - 7, BH + 9],
        [x1 + 9, y - 7, BH + 7],
        [x1 + 9, y + 7, BH + 7],
        [x1, y + 7, BH + 9],
        [x1, y - 7, BH + 10.2],
        [x1 + 9, y - 7, BH + 8.2],
        [x1 + 9, y + 7, BH + 8.2],
        [x1, y + 7, BH + 10.2],
      ],
      METAL,
      0.9,
    ) +
    shape(
      [
        [x1 + 1, y - 5, BH + 10.4],
        [x1 + 7.5, y - 5, BH + 9.1],
        [x1 + 7.5, y + 5, BH + 9.1],
        [x1 + 1, y + 5, BH + 10.4],
      ],
      CERAMIC.l,
      0.7,
    );
  const g = (svg: string) => `<g class="copier" data-running="${running ? 1 : 0}">${svg}</g>`;
  return [
    { box: span(x0, y0, BH, x1, y1, zt + 4), svg: g(s) },
    { box: span(x1, y - 7, BH + 7, x1 + 9, y + 7, BH + 10.4), svg: g(tray) },
  ];
}

/** The clerk: an office clerk in a blue shirt reaching to the copier's start button. */
const CLERK: Look = { skin: SKIN[0], top: '#7fa6c9', legs: '#4a4642', hair: '#6a4426', cut: 'bun' };
const CLERK_AT = [84, 66];

/** The sieve: a kitchen sieve resting on a three-legged stand. Real-object notes: a mesh bowl (wires down and round
 * it), a rolled rim, a long handle off one side ending in a hanging loop; the rim lit when it filters. */
function sieveOf(kind: SieveKind): Item {
  const [x, y] = SIEVE,
    z = BH + 14,
    live = kind !== 'off',
    ring = (zz: number, r: number, n = 20) => on(PZ(zz), ellUV(x, y, r, r, n));
  let s = '';
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * 2 * Math.PI + 0.5;
    s += rod(
      [x + Math.cos(t) * 10, y + Math.sin(t) * 10, BH],
      [x + Math.cos(t) * 8.5, y + Math.sin(t) * 8.5, z - 3],
      0.6,
      DARK,
      toneI,
      0.8,
    );
  }
  const A = ring(z - 7, 4.5),
    B = ring(z + 1, 11);
  // the mesh: meridian wires on the bowl's outside, on the side toward the viewer
  let mesh = '';
  for (let i = 0; i < A.length; i += 2) if (vis([A[i][0] - x, A[i][1] - y, 0])) mesh += line([A[i], B[i]], 0.4);
  s += openShell(A, B, (n: number[]) => toneI(n, METAL), fill(pd(ring(z - 6.9, 4.5)), METAL.d)) + mesh;
  s += line(ring(z - 3, 7.9), 0.4);
  s +=
    loft(ring(z, 11.4), ring(z + 1.4, 11.4), (n: number[]) => toneI(n, live ? PALS.mustard : METAL)) +
    ink(pd(ring(z + 1.4, 11.4)), 1);
  s += rod([x, y + 11, z + 1], [x, y + 21, z + 2.5], 0.9, live ? PALS.mustard : METAL, toneI, 0.9);
  s += hullInk([...A, ...ring(z + 1.4, 11.4)], 1.6);
  return {
    box: span(x - 11.5, y - 11.5, BH, x + 11.5, y + 22, z + 2.5),
    svg: `<g class="sieve" data-sieve="${kind}">${s}</g>`,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale)}</g>`;

const slotX = (i: number) => SHELF_X0 + ((SHELF_X1 - SHELF_X0) / 6) * (i + 0.5);

/** The copier room. Every shadow and the wires (floor), then one depth sort over every part, then every pill on top. */
export const copierScene = (o: CopierOpts) => (ctx: SceneCtx) => {
  const st = copierState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const clerk = person({ x: CLERK_AT[0], y: CLERK_AT[1], facing: 270, pose: 'reach', look: CLERK });
  const machine = copier(st.copying),
    sieve = sieveOf(st.sieve);
  const shelf: Item = {
    box: span(SHELF_X0, SHELF_Y - 8, BH, SHELF_X1, SHELF_Y + 8, BH + 3),
    svg: `<g class="shelf">${[SHELF_X0 + 4, SHELF_X1 - 4].map(lx => box(lx - 1.5, SHELF_Y - 7, BH, lx + 1.5, SHELF_Y + 7, BH + 1.6, WOOD, toneI, 0.8)).join('')}${box(SHELF_X0, SHELF_Y - 8, BH + 1.6, SHELF_X1, SHELF_Y + 8, BH + 3, WOOD, toneI, 1)}${hullInk(boxCorners(SHELF_X0, SHELF_Y - 8, BH, SHELF_X1, SHELF_Y + 8, BH + 3), 1.5)}</g>`,
  };
  const originals: Item = {
    box: span(ORIG[0] - 7, ORIG[1] - 5.5, BH, ORIG[0] + 7, ORIG[1] + 5.5, BH + 18),
    svg: `<g class="originals">${stack(ORIG[0], ORIG[1], 18, st.realMarks)}</g>`,
  };
  const shadowOf = (b: number[][]) =>
    castShadow(boxCorners(b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2]), BH, ctx.top);
  let s = [originals.box, machine[0].box, sieve.box, shelf.box].map(shadowOf).join('') + clipTo(ctx.top, clerk.shadow);
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
  // the stacks ride in the shelf's own item: sorted apart, a stack beside the copier on x but in front of it on y
  // makes a cycle with the shelf and the sort puts the plank over them
  const stacks: Item[] = [];
  for (const k of st.stacks) {
    const x = slotX(k.gen),
      ring = k.lit
        ? `<path d="${pd(on(PZ(BH + 3.2), rrUV(x - 9, SHELF_Y - 7.5, x + 9, SHELF_Y + 7.5, 2)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
        : '';
    stacks.push({
      box: span(x - 8.1, SHELF_Y - 6.4, BH + 3, x + 8.1, SHELF_Y + 6.4, BH + 14),
      svg: `<g class="copy" data-gen="${k.gen}" data-marks="${k.marks}" data-lit="${k.lit ? 1 : 0}">${ring}${stack(x, SHELF_Y, 11, k.marks, 1.15, k.lit && o.flip ? 'sd-flip' : '', BH + 3)}</g>`,
    });
  }
  const onShelf: Item = {
    box: span(SHELF_X0, SHELF_Y - 8, BH, SHELF_X1, SHELF_Y + 8, BH + 14),
    svg: shelf.svg + byDepth(stacks),
  };
  s += byDepth([originals, ...machine, sieve, onShelf, ...clerk.items]);
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

/** The home hero's plot: the photocopier in miniature, its clerk at the panel, and three generations of copies,
 * their marks fading. */
export function copierPlot(x: number, y: number, top: SceneCtx['top']): string {
  const lits = [MAX_MARKS, 8, 4],
    stacks = lits.map((l, i) => ({
      box: span(x - 9 + i * 11, y + 7, BH, x - 3 + i * 11, y + 13, BH + 6),
      svg: stack(x - 6 + i * 11, y + 10, 6, l, 0.55),
    })),
    pieces = [
      mini(shaded(copier(true)), [...COPIER, BH], [x - 6, y - 10, BH], 0.45),
      mini(person({ x: 0, y: 0, facing: 270, pose: 'reach', look: CLERK }), [0, 0, BH], [x + 4, y - 2, BH], 0.55),
      shaded(stacks),
    ];
  return drawPieces(pieces, top);
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
