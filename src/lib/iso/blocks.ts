// Block renderers for the RAG canvas, ported from the canvas prototype's drawNode (001-canvas-shapes.html).
// Pure functions returning SVG strings; call them inside an IsoStage scene (or withFrame) so they use its framing.
import {
  PALS,
  METAL,
  CLEAR,
  CERAMIC,
  DARK,
  WOOD,
  matOf,
  box,
  cyl,
  rod,
  shape,
  fill,
  ink,
  line,
  hullInk,
  castShadow,
  tag,
  inkK,
  pd,
  on,
  PX,
  PZ,
  PY,
  vis,
  rectUV,
  rrUV,
  ellUV,
  tone,
  toneI,
  avg,
  dot,
  norm,
  loft,
  byDepth,
} from './core.js';
import { BH, HALF, STATE_COL, STATE_TXT, esc, faceText } from './shared';
import { hexa, modelMachine } from './figures';

export { BH, HALF, STATE_COL, STATE_TXT, esc, faceText };
export const CELL = 56; // grid pitch on the workbench
export const ACC = '#ffb627';

export type BlockType =
  | 'docs'
  | 'chunker'
  | 'embedder'
  | 'index'
  | 'retriever'
  | 'rewrite'
  | 'reranker'
  | 'assembler'
  | 'llm'
  | 'agent'
  | 'graph'
  | 'grader';

export interface BlockOpts {
  x: number;
  y: number;
  stat?: string; // live text on the side face, e.g. "42 CHUNKS"
  selected?: boolean; // accent ring on the floor
  lit?: boolean; // retriever lens glows when it found something
  state?: 'ok' | 'warn' | 'bad'; // LLM screen / grader needle
  pill?: string; // colour of the name pill at rest (the model's verdict)
}

type Mat = { l: string; m: string; d: string };
// fx = the x face toward the viewer (x1 in the default view, x0 when turned round); sx = its outward sign, so fx + sx*d sits just proud of it
interface Ctx {
  x: number;
  y: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
  m: Mat;
  o: BlockOpts;
  fx: number;
  sx: number;
}
interface Spec {
  name: string;
  label: string;
  pal: Mat;
  ht: number;
  labelZ?: number;
  /** height of the box its shadow is cast from, when the silhouette is lower or more open than its full height */
  sh?: number;
  draw: (c: Ctx) => string;
}

const LILAC = matOf('#b39ddb');

/** Two white streaks slanting up a front pane x = x1 (colorfigures glass). */
export function streaks(x1: number, y0: number, y1: number, z0: number, z1: number) {
  const w = y1 - y0,
    lean = Math.min((z1 - z0) * 0.4, w * 0.3);
  return [
    [0.18, 0.15],
    [0.42, 0.07],
  ]
    .map(([a, b]) =>
      fill(
        pd(
          on(PX(x1 + 0.05), [
            [y0 + w * a, z0 + 1],
            [y0 + w * (a + b), z0 + 1],
            [y0 + w * (a + b) + lean, z1 - 1],
            [y0 + w * a + lean, z1 - 1],
          ]),
        ),
        '#ffffff',
        'opacity=".38"',
      ),
    )
    .join('');
}

/** See-through box for the fixed-view scenes: floor and far walls, then `inside`, then the near walls as tinted panes. */
export function glassCase(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: Mat, inside = '') {
  // far walls one tone lighter than solid: seen through a tinted pane they would read as murky
  let s =
    fill(pd(on(PZ(z0), rectUV(x0, y0, x1, y1))), m.m) +
    fill(pd(on(PX(x0), rectUV(y0, z0, y1, z1))), m.m) +
    fill(pd(on(PY(y0), rectUV(x0, z0, x1, z1))), m.l) +
    inside;
  const panes: [number[], number[][]][] = [
    [[0, 1, 0], on(PY(y1), rectUV(x0, z0, x1, z1))],
    [[1, 0, 0], on(PX(x1), rectUV(y0, z0, y1, z1))],
    [[0, 0, 1], on(PZ(z1), rectUV(x0, y0, x1, y1))],
  ];
  for (const [n, q] of panes) s += fill(pd(q), tone(n, m), 'fill-opacity=".34"') + ink(pd(q), 1);
  return s + streaks(x1, y0, y1, z0, z1);
}

/* ---------- parts: each block is a few separate parts, sorted by byDepth (box-aware) so it draws right from any turn ---------- */
type Part = { box?: number[][]; at?: number[]; svg: string };
const span = (pts: number[][], r = 0) =>
  [0, 1].map(e => [0, 1, 2].map(k => (e ? Math.max(...pts.map(p => p[k])) + r : Math.min(...pts.map(p => p[k])) - r)));
/** a solid box with its own silhouette */
const slab = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: Mat, w = 1.8): Part => ({
  box: [
    [x0, y0, z0],
    [x1, y1, z1],
  ],
  svg: box(x0, y0, z0, x1, y1, z1, m, tone, 0.9) + hullInk(boxCorners(x0, y0, z0, x1, y1, z1), w),
});
const bar = (a: number[], b: number[], r: number, m: Mat, w = 1): Part => ({
  box: span([a, b], r),
  svg: rod(a, b, r, m, toneI, w),
});
const drum = (x: number, y: number, z0: number, z1: number, r: number, m: Mat, w = 1.2, extra = ''): Part => ({
  box: [
    [x - r, y - r, z0],
    [x + r, y + r, z1],
  ],
  svg: cyl(x, y, z0, z1, r, m, toneI, w) + extra,
});
/** a profile in (x, z) swept along y from ya to yb (a typewriter's sloped body): sides, the end caps that face the
 * viewer, an inner line along each edge with a face toward the viewer, and the silhouette */
function prism(prof: number[][], ya: number, yb: number, m: Mat, w = 2.4): Part {
  const A = prof.map(([u, v]) => [u, ya, v]),
    B = prof.map(([u, v]) => [u, yb, v]),
    c = avg(A);
  let s = loft(A, B, (n: number[]) => tone(n, m));
  for (const [ring, n] of [
    [A, [0, -1, 0]],
    [B, [0, 1, 0]],
  ] as [number[][], number[]][])
    if (vis(n)) s += fill(pd(ring), tone(n, m)) + ink(pd(ring), 1);
  // outward normal of the side face on each profile edge i → i+1
  const nf = prof.map((p, i) => {
    const q = prof[(i + 1) % prof.length],
      n = norm([q[1] - p[1], 0, p[0] - q[0]]);
    return dot(n, [p[0] - c[0], 0, p[1] - c[2]]) < 0 ? n.map((v: number) => -v) : n;
  });
  prof.forEach((_, i) => {
    if (vis(nf[i]) || vis(nf[(i + prof.length - 1) % prof.length])) s += line([A[i], B[i]], 0.9);
  });
  return { box: span([...A, ...B]), svg: s + hullInk([...A, ...B], w) };
}
/** a flat round mark on a plane through c spanned by unit vectors e1, e2 */
const disc = (c: number[], e1: number[], e2: number[], r: number, n = 12) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    return [0, 1, 2].map(k => c[k] + e1[k] * r * Math.cos(t) + e2[k] * r * Math.sin(t));
  });
const sort = (parts: Part[]) => byDepth(parts);

export const BLOCKS: Record<BlockType, Spec> = {
  docs: {
    name: 'Docs',
    label: 'DOCS',
    pal: CERAMIC,
    ht: 18,
    draw: ({ x0, y0, z0, x1, y1 }) => {
      // a stack of three ring binders lying flat, each a little askew: covers, the page block, a spine on the -y side
      const covers = [PALS.cobalt, PALS.mustard, PALS.mint];
      return sort(
        [
          [0.5, 1],
          [-1, -0.5],
          [1, 0],
        ].map(([dx, dy], i) => {
          const bx0 = x0 + 2 + dx,
            bx1 = x1 - 2 + dx,
            by0 = y0 + 1.5 + dy,
            by1 = y1 - 1.5 + dy,
            bz = z0 + i * 6,
            m = covers[i];
          const parts = [
            slab(bx0, by0, bz, bx1, by0 + 3, bz + 6, m, 1),
            slab(bx0, by0 + 3, bz, bx1, by1, bz + 1, m, 0.9),
            slab(bx0 + 0.8, by0 + 3, bz + 1, bx1 - 0.8, by1 - 0.8, bz + 5, CERAMIC, 0.8),
            slab(bx0, by0 + 3, bz + 5, bx1, by1, bz + 6, m, 0.9),
          ];
          // page edges on whichever end of the page block faces the viewer
          let edges = '';
          for (const [X, n] of [
            [bx1 - 0.75, [1, 0, 0]],
            [bx0 + 0.75, [-1, 0, 0]],
          ] as [number, number[]][])
            if (vis(n))
              for (const zz of [bz + 2.3, bz + 3.6])
                edges += line(
                  [
                    [X, by0 + 4, zz],
                    [X, by1 - 2, zz],
                  ],
                  0.5,
                );
          return {
            box: [
              [bx0, by0, bz],
              [bx1, by1, bz + 6],
            ],
            svg: sort(parts) + edges + hullInk(boxCorners(bx0, by0, bz, bx1, by1, bz + 6), 2.2),
          };
        }),
      );
    },
  },
  chunker: {
    name: 'Chunker',
    label: 'CHUNKER',
    pal: PALS.tomato,
    ht: 26,
    sh: 12,
    draw: ({ x0, y0, z0, x1, y1, z1, m }) => {
      // a paper guillotine: a bed, a fence at the back, a stack of paper, and the blade arm hinged at the back corner,
      // raised, its handle up at the front
      const zb = z0 + 6,
        yc = y0 + 6,
        H = [x0 + 4, yc, zb + 1.6],
        T = [x1 - 5, yc, z1 - 4];
      const blade = shape([[x0 + 4, yc, zb + 0.6], T, [x1 - 5, yc, z1 - 9]], METAL.l, 0.9);
      const arm = {
        box: [
          [x0 + 1, yc - 2.6, zb],
          [x1 - 1, yc + 2.6, z1],
        ],
        svg:
          blade +
          rod(H, T, 1.3, DARK, toneI, 1.2) +
          rod([H[0], yc - 2.4, H[2]], [H[0], yc + 2.4, H[2]], 2, METAL, toneI, 0.9) +
          rod(T, [T[0] + 2, yc, z1], 2.2, m, toneI, 1.2),
      };
      return sort([
        slab(x0 + 1, y0 + 2, z0, x1 - 1, y1 - 2, zb, m, 2.4),
        slab(x0 + 1.5, yc + 3, zb, x0 + 4.5, y1 - 3, zb + 3.5, DARK, 1.2),
        slab(x0 + 7, yc + 3, zb, x1 - 8, y1 - 5, zb + 5, CERAMIC, 1.4),
        slab(x1 - 7, yc + 3, zb, x1 - 2, y1 - 9, zb + 0.8, CERAMIC, 0.9),
        arm,
      ]);
    },
  },
  embedder: {
    name: 'Embedder',
    label: 'EMBEDDER',
    pal: LILAC,
    ht: 20,
    sh: 14,
    draw: ({ x, y, x0, y0, z0, x1, y1, z1, m }) => {
      // a dial press: a column at the back, a head over the bed, a ram that presses each chunk into a vector (a row of
      // coloured studs), and a pressure dial on top of the head
      const zb = z0 + 5,
        dx = x0 + 9;
      const needle = line(
        [
          [dx, y, z1 + 0.1],
          [dx + 2.6, y + 3.2, z1 + 0.1],
        ],
        1,
      );
      return sort([
        slab(x0 + 1, y0 + 1, z0, x1 - 1, y1 - 1, zb, m, 2.4),
        slab(x0 + 3, y - 7, zb, x0 + 12, y + 7, z1 - 7, m, 1.8),
        slab(x0 + 3, y - 8, z1 - 7, x + 6, y + 8, z1 - 1.5, m, 1.8),
        drum(dx, y, z1 - 1.5, z1, 5.2, CERAMIC, 1, needle),
        drum(x + 1, y, zb + 5, z1 - 7, 2.2, METAL, 1),
        drum(x + 1, y, zb + 1, zb + 2.6, 5, METAL, 1),
        ...[PALS.mustard, PALS.mint, PALS.cobalt].map((c, i) => drum(x + 11, y - 9 + i * 9, zb, zb + 2.6, 2.6, c, 0.8)),
      ]);
    },
  },
  index: {
    name: 'Index',
    label: 'INDEX',
    pal: PALS.cobalt,
    ht: 40,
    sh: 30,
    draw: ({ x, y, y0, y1, z0, m }) => {
      // a rotary card file: a fan of cards on a drum between two uprights, a crank knob on one end
      const za = z0 + 22,
        parts: Part[] = [slab(x - 12, y0 + 1, z0, x + 12, y1 - 1, z0 + 4, m, 2.2)];
      for (const [a, b] of [
        [y0 + 2, y0 + 4.5],
        [y1 - 4.5, y1 - 2],
      ]) {
        const c = [
          [x - 8, a, z0 + 4],
          [x + 8, a, z0 + 4],
          [x + 8, b, z0 + 4],
          [x - 8, b, z0 + 4],
          [x - 3, a, za + 3],
          [x + 3, a, za + 3],
          [x + 3, b, za + 3],
          [x - 3, b, za + 3],
        ];
        parts.push({ box: span(c), svg: hexa(c, m, 0.9, tone) + hullInk(c, 1.6) });
      }
      parts.push(bar([x, y0 + 4.5, za], [x, y1 - 4.5, za], 4, DARK, 1.2));
      parts.push(bar([x, y1 - 2, za], [x, y1, za], 2.4, m, 0.9));
      for (let i = 0; i < 15; i++) {
        const t = ((12 + i * 11) * Math.PI) / 180,
          c = Math.cos(t),
          sn = Math.sin(t);
        const q = [
          [x + c * 4.2, y - 11, za + sn * 4.2],
          [x + c * 4.2, y + 11, za + sn * 4.2],
          [x + c * 16, y + 11, za + sn * 16],
          [x + c * 16, y - 11, za + sn * 16],
        ];
        // at, not box: neighbouring cards overlap, so they sort by how near their middle is
        parts.push({ at: avg(q), svg: shape(q, i % 4 === 1 ? PALS.mustard.l : CERAMIC.l, 0.6) });
      }
      return sort(parts);
    },
  },
  retriever: {
    name: 'Retriever',
    label: 'RETRIEVER',
    pal: PALS.mint,
    ht: 24,
    sh: 12,
    draw: ({ x, y, z0, z1, m, o }) => {
      // a grabber arm: a round base and turret, an upper arm and forearm jointed like a lamp, a claw at the wrist with a
      // lens that glows when it found something (and the card it picked up)
      const S = [x - 5, y - 5, z0 + 9.5],
        E = [x - 10, y - 1, z1 - 3],
        W = [x + 10, y + 8, z0 + 14];
      const joint = (p: number[]) => bar([p[0], p[1] - 2.2, p[2]], [p[0], p[1] + 2.2, p[2]], 2.4, DARK, 1);
      const lens = fill(pd(on(PZ(W[2] + 2.6), ellUV(W[0], W[1], 2, 2, 14))), o.lit ? ACC : CLEAR.m);
      const parts: Part[] = [
        drum(x - 5, y - 5, z0, z0 + 5, 11, m, 2.2),
        drum(x - 5, y - 5, z0 + 5, z0 + 8.5, 4.6, DARK, 1.2),
        bar(S, E, 2.2, m, 1.4),
        bar(E, W, 1.8, METAL, 1.3),
        joint(S),
        joint(E),
        drum(W[0], W[1], W[2] - 1, W[2] + 2.5, 3, METAL, 1, lens),
        bar([W[0] - 1.5, W[1] - 1.5, W[2] - 1], [W[0] - 3, W[1] - 3, z0 + 6], 1.1, DARK, 1.1),
        bar([W[0] + 1.5, W[1] + 1.5, W[2] - 1], [W[0] + 3, W[1] + 3, z0 + 6], 1.1, DARK, 1.1),
      ];
      if (o.lit) parts.push(slab(W[0] - 1.6, W[1] - 1.6, z0 + 5.5, W[0] + 1.6, W[1] + 1.6, z0 + 11, CERAMIC, 1));
      return sort(parts);
    },
  },
  rewrite: {
    name: 'Query rewrite',
    label: 'REWRITE',
    pal: CLEAR,
    ht: 22,
    sh: 14,
    draw: ({ x, y, x0, y0, z0, x1, y1, z1, m }) => {
      // a typewriter: a body sloping down to the keys at the front, the platen roller at the back with its knobs, a
      // sheet coming out of it and the carriage-return lever
      const body = prism(
        [
          [x0 + 3, z0],
          [x1 - 1, z0],
          [x1 - 1, z0 + 3],
          [x + 3, z0 + 10],
          [x0 + 3, z0 + 12],
        ],
        y0 + 3,
        y1 - 3,
        m,
      );
      // the keys sit on the slope, drawn only when the slope faces the viewer
      const a = [x1 - 1, z0 + 3],
        b = [x + 3, z0 + 10],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]),
        es = [(b[0] - a[0]) / L, 0, (b[1] - a[1]) / L],
        ns = [-es[2], 0, es[0]];
      if (vis(ns))
        for (const t of [0.25, 0.55, 0.85])
          for (let j = -2; j <= 2; j++)
            body.svg += shape(
              disc(
                [a[0] + (b[0] - a[0]) * t, y + j * 5 + (t > 0.5 ? 1.2 : 0), a[1] + (b[1] - a[1]) * t],
                [0, 1, 0],
                es,
                1.5,
              ),
              DARK.m,
              0.5,
            );
      const zp = z0 + 15.2,
        xp = x0 + 8;
      return sort([
        body,
        bar([xp, y0 + 3, zp], [xp, y1 - 3, zp], 3.2, DARK, 1.2),
        bar([xp, y0 + 0.5, zp], [xp, y0 + 3, zp], 2.3, PALS.mustard, 0.9),
        bar([xp, y1 - 3, zp], [xp, y1 - 0.5, zp], 2.3, PALS.mustard, 0.9),
        bar([xp + 1, y1 - 4, zp + 2.5], [xp + 5, y1 - 1, zp + 5], 0.7, METAL, 0.8),
        {
          box: [
            [x0 + 4, y - 9, zp + 3.21],
            [xp + 1, y + 9, z1],
          ],
          svg: shape(
            [
              [xp + 1, y - 9, zp + 3.21],
              [xp + 1, y + 9, zp + 3.21],
              [x0 + 4, y + 9, z1],
              [x0 + 4, y - 9, z1],
            ],
            CERAMIC.l,
            1,
          ),
        },
      ]);
    },
  },
  reranker: {
    name: 'Reranker',
    label: 'RERANKER',
    pal: PALS.mint,
    ht: 12,
    sh: 8,
    labelZ: 3.2,
    draw: ({ x, y0, y1, z0, m }) => {
      // a sliding-bead sorting frame: two posts on a plank, three wires, each row's beads slid to the left in rank order
      const parts: Part[] = [
        slab(x - 9, y0 + 1, z0, x + 9, y1 - 1, z0 + 2.5, m, 2),
        slab(x - 2, y0 + 2, z0 + 2.5, x + 2, y0 + 4.5, z0 + 12, m, 1.4),
        slab(x - 2, y1 - 4.5, z0 + 2.5, x + 2, y1 - 2, z0 + 12, m, 1.4),
      ];
      // a row is one part: its wire, then the beads threaded on it
      [5, 3, 1].forEach((n, r) => {
        const zw = z0 + 10.4 - r * 3.1,
          beads = Array.from({ length: n }, (_, i) =>
            bar([x, y0 + 4.7 + i * 3.2, zw], [x, y0 + 7.5 + i * 3.2, zw], 1.35, [PALS.mustard, METAL, WOOD][r], 0.8),
          );
        parts.push({
          box: [
            [x - 1.35, y0 + 4.5, zw - 1.35],
            [x + 1.35, y1 - 4.5, zw + 1.35],
          ],
          svg: rod([x, y0 + 4.5, zw], [x, y1 - 4.5, zw], 0.35, METAL, toneI, 0.5) + sort(beads),
        });
      });
      return sort(parts);
    },
  },
  assembler: {
    name: 'Context assembler',
    label: 'CONTEXT',
    pal: WOOD,
    ht: 12,
    sh: 7,
    labelZ: 3.2,
    draw: ({ x, y, x0, y0, z0, x1, y1, z1, m }) => {
      // a binding station: a wooden tray, the slips stacked into one prompt and bound with a coil along one edge, and
      // the punch lever at the back corner
      const zt = z0 + 3.5,
        parts: Part[] = [slab(x0 + 1, y0 + 1, z0, x1 - 1, y1 - 1, zt, m, 2.2)];
      // the slips, then the coil through their edge (its loops stand over the stack from every side)
      let book = sort(
        [0, 1, 2].map(i =>
          slab(x - 9 + i * 0.8, y - 9, zt + i * 1.6, x + 7 + i * 0.8, y + 10, zt + i * 1.6 + 1.6, CERAMIC, 0.8),
        ),
      );
      for (let i = 0; i < 7; i++)
        book += `<path d="${pd(disc([x - 7.5 + i * 2.4, y - 9, zt + 2.4], [0, 1, 0], [0, 0, 1], 2.5))}" fill="none" stroke="${DARK.m}" stroke-width="1"/>`;
      parts.push({
        box: [
          [x - 9, y - 11.6, zt],
          [x + 8.6, y + 10, zt + 4.9],
        ],
        svg: book,
      });
      const hinge = [x1 - 4, y1 - 5, zt + 3],
        grip = [x1 - 4, y0 + 7, z1 - 1];
      parts.push(slab(x1 - 7, y1 - 8, zt, x1 - 1.5, y1 - 2, zt + 3, DARK, 1.2));
      parts.push({
        box: span([hinge, grip], 1.6),
        svg:
          rod(hinge, grip, 0.9, METAL, toneI, 0.9) +
          cyl(grip[0], grip[1], grip[2] - 1.5, grip[2], 1.6, DARK, toneI, 0.9),
      });
      return sort(parts);
    },
  },
  llm: {
    name: 'LLM',
    label: 'LLM',
    pal: PALS.blush,
    ht: 32,
    labelZ: 3.5,
    draw: ({ x, y, o }) => modelMachine(x, y, 1, o.state).items[0].svg,
  },
  agent: {
    name: 'Agent',
    label: 'AGENT',
    pal: PALS.mustard,
    ht: 22,
    labelZ: 3,
    draw: ({ x, y, z0, m }) => {
      // the model machine (smaller, mustard) wearing a headset, holding up a clipboard on an arm
      const mx = x - 2,
        my = y - 2,
        k = 0.7,
        hf = HALF * k,
        mm = modelMachine(mx, my, k, undefined, 20, { pal: m });
      const zc = z0 + 17.5,
        cup = (a: number, b: number) => bar([mx, a, zc], [mx, b, zc], 3, DARK, 1.1);
      const band: number[][] = Array.from({ length: 9 }, (_, i) => {
        const t = (i / 8) * Math.PI;
        return [mx, my - Math.cos(t) * (hf + 2.2), zc + 1.6 + Math.sin(t) * (z0 + 22 - 0.9 - zc - 1.6)];
      });
      const cy = my + hf + 4.3;
      let board = box(x + 3, cy, z0 + 4, x + 15, cy + 1.2, z0 + 18, WOOD, toneI, 0.9);
      if (vis([0, 1, 0]))
        board +=
          shape(on(PY(cy + 1.25), rectUV(x + 4.2, z0 + 5, x + 13.8, z0 + 15.5)), CERAMIC.l, 0.6) +
          [0, 1, 2]
            .map(i =>
              line(
                on(PY(cy + 1.3), [
                  [x + 5.5, z0 + 13 - i * 2.6],
                  [x + 12, z0 + 13 - i * 2.6],
                ]),
                0.5,
              ),
            )
            .join('');
      board +=
        box(x + 6.5, cy - 0.3, z0 + 16, x + 11.5, cy + 1.6, z0 + 18.6, METAL, toneI, 0.8) +
        hullInk(boxCorners(x + 3, cy, z0 + 4, x + 15, cy + 1.6, z0 + 18.6), 1.6);
      return sort([
        ...mm.items,
        cup(my - hf - 2.6, my - hf),
        cup(my + hf, my + hf + 2.6),
        {
          box: span(band, 0.9),
          svg: band
            .slice(1)
            .map((p, i) => rod(band[i], p, 0.9, DARK, toneI, 0.8))
            .join(''),
        },
        bar([mx, my - hf - 2.6, zc - 1], [x + 7, my - hf - 1.5, z0 + 12], 0.6, DARK, 0.7),
        bar([mx + 4, my + hf, z0 + 9], [x + 8, cy, z0 + 9], 0.9, METAL, 0.9),
        {
          box: [
            [x + 3, cy, z0 + 4],
            [x + 15, cy + 1.6, z0 + 18.6],
          ],
          svg: board,
        },
      ]);
    },
  },
  graph: {
    name: 'Graph',
    label: 'GRAPH',
    pal: DARK,
    ht: 12,
    sh: 8,
    labelZ: 3.2,
    draw: ({ x, y, x0, y0, z0, x1, y1, m }) => {
      // a pinboard on a stand, tipped toward the front: entities pinned on it, joined by red string
      const xa = x0 + 2,
        xb = x1 - 2,
        top = (px: number) => z0 + 3 + 1.5 + ((xb - px) / (xb - xa)) * 7.4; // the cork face, high at the back
      const ring = (dz: number) => [
        [xa, y0 + 2, top(xa) - 1.5 + dz],
        [xb, y0 + 2, top(xb) - 1.5 + dz],
        [xb, y1 - 2, top(xb) - 1.5 + dz],
        [xa, y1 - 2, top(xa) - 1.5 + dz],
      ];
      const c = [...ring(0), ...ring(1.5)];
      const cork = [
        [xa + 2, y0 + 4, top(xa + 2) + 0.05],
        [xb - 2, y0 + 4, top(xb - 2) + 0.05],
        [xb - 2, y1 - 4, top(xb - 2) + 0.05],
        [xa + 2, y1 - 4, top(xa + 2) + 0.05],
      ];
      const nodes: [number, number, Mat][] = [
        [x - 9, y - 8, PALS.mustard],
        [x + 8, y - 10, PALS.mint],
        [x - 6, y + 9, PALS.tomato],
        [x + 9, y + 7, PALS.cobalt],
      ];
      const at = (i: number, dz = 0.3) => [nodes[i][0], nodes[i][1], top(nodes[i][0]) + dz];
      let s = hexa(c, m, 0.9, tone) + shape(cork, '#d8b07a', 0.8);
      for (const [a, b] of [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
        [0, 3],
      ])
        s += `<path d="${pd([at(a, 1.4), at(b, 1.4)], false)}" fill="none" stroke="${PALS.tomato.m}" stroke-width="1.1" stroke-linecap="round"/>`;
      s += byDepth(
        nodes.map(([nx, ny, nm], i) => ({
          at: at(i),
          svg:
            rod(at(i), at(i, 2.6), 0.4, METAL, toneI, 0.5) +
            cyl(nx, ny, top(nx) + 2.2, top(nx) + 3.6, 1.8, nm, toneI, 0.8, 14),
        })),
      );
      const legs = [y0 + 4, y1 - 4].flatMap(ly => [
        bar([xa + 2, ly, z0], [xa + 2, ly, top(xa + 2) - 1.5], 1, m, 0.9),
        bar([xb - 2, ly, z0], [xb - 2, ly, top(xb - 2) - 1.5], 1, m, 0.9),
      ]);
      return sort([...legs, { box: span(c), svg: s + hullInk(c, 2.2) }]);
    },
  },
  grader: {
    name: 'Evaluator',
    label: 'EVALUATOR',
    pal: METAL,
    ht: 26,
    sh: 14,
    labelZ: 2.5,
    draw: ({ x, y, x0, y0, z0, x1, y1, m, o }) => {
      // a stamp desk: a steel desk on four legs, an ink pad, a card, and the rubber stamp standing ready; the card
      // carries the stamp's mark once graded (mint pass, tomato fail)
      const zt = z0 + 14;
      // the desk is one part (legs, then the top): sorted apart, a leg could be ordered between the top and what
      // stands on it
      const legs = [
        [x0 + 2, y0 + 2],
        [x1 - 5, y0 + 2],
        [x0 + 2, y1 - 5],
        [x1 - 5, y1 - 5],
      ].map(([lx, ly]) => slab(lx, ly, z0, lx + 3, ly + 3, zt - 3, DARK, 1.2));
      const parts: Part[] = [
        {
          box: [
            [x0 + 1, y0 + 1, z0],
            [x1 - 1, y1 - 1, zt],
          ],
          svg: sort(legs) + slab(x0 + 1, y0 + 1, zt - 3, x1 - 1, y1 - 1, zt, m, 2.2).svg,
        },
      ];
      parts.push(slab(x - 13, y + 2, zt, x - 2, y + 13, zt + 1.5, DARK, 1.2));
      const mark = o.state === 'ok' ? PALS.mint.m : o.state === 'bad' ? PALS.tomato.m : null;
      parts.push({
        box: [
          [x + 2, y - 13, zt],
          [x + 14, y - 1, zt + 0.6],
        ],
        svg:
          box(x + 2, y - 13, zt, x + 14, y - 1, zt + 0.5, CERAMIC, toneI, 0.8) +
          (mark ? shape(on(PZ(zt + 0.55), rrUV(x + 4.5, y - 10.5, x + 11.5, y - 3.5, 2)), mark, 0.6) : ''),
      });
      // the stamp: rubber under a wooden mount, a neck and a round knob
      const sx = x - 6,
        sy = y - 6;
      parts.push(slab(sx - 4.5, sy - 4.5, zt, sx + 4.5, sy + 4.5, zt + 3.5, WOOD, 1.4));
      parts.push(drum(sx, sy, zt + 3.5, zt + 7.5, 1.4, WOOD, 1));
      parts.push(drum(sx, sy, zt + 7.5, zt + 12, 3.2, PALS.tomato, 1.2));
      return sort(parts);
    },
  },
};

export const BLOCK_TYPES = Object.keys(BLOCKS) as BlockType[];
const TALLEST = Math.max(...Object.values(BLOCKS).map(b => b.ht));

/** The 8 corners of an axis-aligned box: bottom face then top face, each x0y0, x1y0, x0y1, x1y1. */
export const boxCorners = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y0, z0],
  [x0, y1, z0],
  [x1, y1, z0],
  [x0, y0, z1],
  [x1, y0, z1],
  [x0, y1, z1],
  [x1, y1, z1],
];

function renderBlock(type: BlockType, o: BlockOpts): string {
  const spec = BLOCKS[type],
    m = spec.pal,
    x0 = o.x - HALF,
    x1 = o.x + HALF,
    y0 = o.y - HALF,
    y1 = o.y + HALF,
    z0 = BH,
    z1 = BH + spec.ht;
  // front-mounted parts (screen, dial, drawer knobs) go on the x face turned toward the viewer
  const sx = vis([1, 0, 0]) ? 1 : -1,
    fx = sx > 0 ? x1 : x0;
  const c: Ctx = { x: o.x, y: o.y, x0, x1, y0, y1, z0, z1, m, o, fx, sx };
  let s = o.selected
    ? `<path class="sel" d="${pd(on(PZ(BH + 0.3), rrUV(x0 - 4, y0 - 4, x1 + 4, y1 + 4, 5)))}" fill="none" stroke="${ACC}" stroke-width="2.4"/>`
    : '';
  // each block inks its own parts: a hull round the whole footprint would draw a box in the air round the silhouette
  s += spec.draw(c);
  // the name starts with the words shown for the block (WCAG 2.5.3: speech users say what they see): any text drawn
  // on it (the LLM screen), then its label pill (blockTag), then what it is
  const drawn = [...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].toLowerCase());
  const aria = `${[...drawn, spec.label.toLowerCase(), ...(o.stat ? [esc(o.stat).toLowerCase()] : [])].join(' ')}: ${spec.name} block${o.selected ? ', selected' : ''}`;
  // a space between the drawn words keeps the computed visible text "docs 47 docs", not "docs47 docs"
  return `<g class="block" role="button" tabindex="0" aria-label="${aria}" data-block="${type}">${s.replaceAll('</text><', '</text> <')}</g>`;
}

export const renderers = Object.fromEntries(BLOCK_TYPES.map(t => [t, (o: BlockOpts) => renderBlock(t, o)])) as Record<
  BlockType,
  (o: BlockOpts) => string
>;

/** The block's name (and live stat) in a label pill over its top, readable at any zoom; selected = accent pill.
 * Draw every tag after all blocks so none is hidden. Clicks pass through to whatever is under the pill. */
export function blockTag(type: BlockType, o: BlockOpts, scale = 1, even = true): string {
  const spec = BLOCKS[type],
    text = esc(spec.label + (o.stat ? ` · ${o.stat}` : ''));
  // even: every pill floats at the same height (above the tallest block), so neighbours sit in an even row; the
  // leader line still runs down to this block's top. Off for blocks out of the row (the track's side bays).
  const lift = even ? (TALLEST - spec.ht) / (inkK() * scale) : 0;
  return `<g class="block-tag" data-pick="${type}" aria-hidden="true" pointer-events="none">${tag([o.x, o.y, BH + spec.ht], 0, -16 - lift, text, !!o.selected, scale, o.pill)}</g>`;
}

/** A step's callout (KTD7): a lit pill over a point, above where its name pill sits (dy, as in tag()). */
export const sayTag = (p3: number[], text: string, scale = 1, dy = -34) =>
  `<g class="callout" aria-hidden="true" pointer-events="none">${tag(p3, 0, dy, esc(text), true, scale)}</g>`;

/** Whether a step's callout names this part and fits: on phones a callout over 16 characters is dropped, since the
 * narration already names it. phone defaults to scale > 1, for scenes whose desktop pills are not enlarged. */
export const sayFits = (say: { block: string; text: string } | undefined, part: string, phone: boolean) =>
  say?.block === part && (!phone || say.text.length <= 16);

/** A step's callout over a scene part: a row above that part’s name pill, clear of it (pillDy, as passed to tag()). */
export const sayAt = (
  say: { block: string; text: string } | undefined,
  part: string,
  p3: number[],
  pillDy: number,
  scale = 1,
  phone = scale > 1,
) => (say && sayFits(say, part, phone) ? sayTag(p3, say.text, scale, pillDy - 24) : '');

/** A scene's pill layer with any callout moved to the end, so no name pill drawn after it can hide it. */
export const calloutsLast = (pills: string[]) =>
  [
    ...pills.filter(p => !p.startsWith('<g class="callout"')),
    ...pills.filter(p => p.startsWith('<g class="callout"')),
  ].join('');

/** A block's callout, two rows above the even row of name pills, so it clears its neighbours' names and the
 * side bays' lower pills. */
export function calloutTag(type: BlockType, x: number, y: number, text: string, scale = 1): string {
  const lift = (TALLEST - BLOCKS[type].ht) / (inkK() * scale);
  return sayTag([x, y, BH + BLOCKS[type].ht], text, scale, -64 - lift);
}

// Shadow of a block on the board; draw all shadows before the blocks. clip = boardTop(...) so it stops at the edge.
export function blockShadow(type: BlockType, x: number, y: number, clip?: number[][]): string {
  const ht = BLOCKS[type].sh ?? BLOCKS[type].ht,
    x0 = x - HALF,
    x1 = x + HALF,
    y0 = y - HALF,
    y1 = y + HALF;
  return castShadow(boxCorners(x0, y0, BH, x1, y1, BH + ht), BH, clip);
}
