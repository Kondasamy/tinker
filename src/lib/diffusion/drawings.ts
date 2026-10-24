// Larkspur's part drawings (KTD8): twelve exact 32×32 bitmaps in three classes, filled here in plain TypeScript (no
// canvas), so every browser and Node see the same pixels. Both the ideal denoiser and the tests read these pixels; the
// pages only display them.

export const SIZE = 32;
export const LABELS = ['hinge', 'drill', 'bracket'] as const;
export type Label = (typeof LABELS)[number];
/** A filled rectangle [x0, y0, x1, y1] or circle [cx, cy, r] in pixel units (y down); `clear` cuts a hole. */
type Shape =
  | { rect: [number, number, number, number]; clear?: true }
  | { circle: [number, number, number]; clear?: true };
export interface Drawing {
  id: string;
  label: Label;
  /** SIZE × SIZE, row by row: 1 ink, -1 paper (the range the noise is added in). */
  pixels: Float64Array;
}

const hole = (cx: number, cy: number, r = 1.6): Shape => ({ circle: [cx, cy, r], clear: true });
const r = (x0: number, y0: number, x1: number, y1: number): Shape => ({ rect: [x0, y0, x1, y1] });
const SHAPES: { id: string; label: Label; shapes: Shape[] }[] = [
  {
    id: 'hinge-square',
    label: 'hinge',
    shapes: [r(4, 8, 28, 24), r(14, 5, 18, 27), hole(8, 12), hole(8, 20), hole(24, 12), hole(24, 20)],
  },
  {
    id: 'hinge-tall',
    label: 'hinge',
    shapes: [r(8, 4, 24, 28), r(14.5, 2, 17.5, 30), ...[9, 16, 23].flatMap(y => [hole(11, y), hole(21, y)])],
  },
  {
    id: 'hinge-strap',
    label: 'hinge',
    shapes: [r(2, 12, 30, 20), r(14, 9, 18, 23), ...[6, 10, 22, 26].map(x => hole(x, 16, 1.4))],
  },
  {
    id: 'hinge-split',
    label: 'hinge',
    shapes: [
      r(5, 9, 15, 23),
      r(17, 9, 27, 23),
      r(14.5, 7, 17.5, 25),
      hole(9, 13),
      hole(9, 19),
      hole(23, 13),
      hole(23, 19),
    ],
  },
  {
    id: 'drill-pistol',
    label: 'drill',
    shapes: [r(6, 8, 22, 15), r(22, 10, 25, 13), r(25, 11, 30, 12), r(11, 15, 16, 26), r(9, 26, 18, 29)],
  },
  {
    id: 'drill-long',
    label: 'drill',
    shapes: [r(3, 6, 20, 14), r(20, 8, 24, 12), r(24, 9, 30, 11), r(9, 14, 14, 24)],
  },
  {
    id: 'drill-stubby',
    label: 'drill',
    shapes: [r(8, 9, 20, 17), r(20, 11, 23, 15), r(23, 12, 28, 14), r(10, 17, 15, 25), r(8, 25, 17, 29)],
  },
  {
    id: 'drill-low',
    label: 'drill',
    shapes: [r(4, 14, 18, 21), r(18, 16, 21, 19), r(21, 17, 29, 18), r(6, 21, 11, 29)],
  },
  {
    id: 'bracket-left',
    label: 'bracket',
    shapes: [r(6, 6, 11, 26), r(6, 21, 26, 26), hole(8.5, 10), hole(8.5, 16), hole(16, 23.5), hole(22, 23.5)],
  },
  {
    id: 'bracket-right',
    label: 'bracket',
    shapes: [r(21, 4, 25, 27), r(5, 23, 25, 27), hole(23, 8), hole(23, 15), hole(10, 25)],
  },
  {
    id: 'bracket-tee',
    label: 'bracket',
    shapes: [r(14, 4, 18, 28), r(6, 4, 26, 8), hole(10, 6), hole(22, 6), hole(16, 16), hole(16, 23)],
  },
  {
    id: 'bracket-shelf',
    label: 'bracket',
    shapes: [
      r(6, 4, 10, 28),
      r(6, 4, 28, 8),
      ...Array.from({ length: 7 }, (_, k) => r(10 + 2 * k, 22 - 2 * k, 13 + 2 * k, 25 - 2 * k)),
      hole(8, 20),
      hole(22, 6),
    ],
  },
];

function fill(shapes: Shape[]): Float64Array {
  const px = new Float64Array(SIZE * SIZE).fill(-1);
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const x = i + 0.5,
        y = j + 0.5;
      for (const s of shapes) {
        const inside =
          'rect' in s
            ? x >= s.rect[0] && x < s.rect[2] && y >= s.rect[1] && y < s.rect[3]
            : (x - s.circle[0]) ** 2 + (y - s.circle[1]) ** 2 <= s.circle[2] ** 2;
        if (inside) px[j * SIZE + i] = s.clear ? -1 : 1;
      }
    }
  return px;
}

export const DRAWINGS: Drawing[] = SHAPES.map(({ id, label, shapes }) => ({ id, label, pixels: fill(shapes) }));
export const drawing = (id: string): Drawing => {
  const d = DRAWINGS.find(x => x.id === id);
  if (!d) throw new Error(`unknown drawing: ${id}`);
  return d;
};

export const sqDist = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
};

/** The drawing closest to x, and the root-mean-square distance per pixel to it (0 is a clean copy). */
export function nearest(x: ArrayLike<number>, pool: Drawing[] = DRAWINGS): { drawing: Drawing; rms: number } {
  let best = pool[0],
    d = Infinity;
  for (const p of pool) {
    const e = sqDist(x, p.pixels);
    if (e < d) [best, d] = [p, e];
  }
  return { drawing: best, rms: Math.sqrt(d / x.length) };
}
