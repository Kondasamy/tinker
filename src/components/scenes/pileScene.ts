// The Compression module's picture: the sorting table (KTD15). A file's bytes lie sorted into piles on a workshop table,
// one pile per byte value, as tall as that byte is common: mustard tiles for one byte, cobalt on a tray for piles merged
// into the code tree, pale for "others" (the rest of a big file), tomato for pointer tickets. A parcel at the right is
// the file as sent: a wireframe crate for its raw size and a solid kraft box for its packed size, poking out of the
// crate when packing made it bigger. Words only in pills; on phones (scale > 1.5) pills keep short names and the
// caption carries the numbers. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { CERAMIC, PALS, WOOD, box, byDepth, castShadow, hullInk, line, tag, toneI } from '../../lib/iso/core.js';
import { countOf, type Node } from '../../lib/compression/huffman';
import { byteName } from '../../lib/compression/files';
import type { Say } from '../story/steps';

export const PILE_BOARD: Board = [0, 0, 240, 132];
/** The most piles the table shows; a bigger file's eighth is "others" (KTD15). */
export const MAX_PILES = 8;

export interface Pile {
  label: string;
  w: number;
  kind?: 'byte' | 'merged' | 'others' | 'pointer';
  /** the pile just made */
  lit?: boolean;
}
export interface PileOpts {
  piles: Pile[];
  /** the file as sent: bytes before packing and after */
  parcel?: { raw: number; packed: number };
  scale?: number;
  say?: Say;
}
/** The parts a callout may name: the first pile, the newest merged pile (or the first, with none) and the parcel. */
export const PILE_PARTS = ['piles', 'tray', 'parcel'] as const;

const GHOST = { l: '#efe9dd', m: '#ddd5c4', d: '#bdb3a0' };
const KRAFT = { l: '#e2b77a', m: '#c99a5c', d: '#7a5a32' };
const ROWS = [36, 78],
  X0 = 24,
  DX = 40,
  HALF = 7,
  TILE = 2.4,
  STEP = 3,
  MAX_TILES = 9,
  PARCEL = [208, 96] as const,
  P_HALF = 15,
  P_RAW = 34;

/** A file's bytes as piles: its seven most common bytes, then "others" for the rest (a read-only tree, KTD15). */
export function pilesOf(bytes: Uint8Array): Pile[] {
  const all = [...countOf(bytes)].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (all.length <= MAX_PILES) return all.map(([b, w]) => ({ label: byteName(b), w }));
  const top = all.slice(0, MAX_PILES - 1).map(([b, w]) => ({ label: byteName(b), w }));
  const rest = all.slice(MAX_PILES - 1).reduce((a, [, w]) => a + w, 0);
  return [...top, { label: 'others', w: rest, kind: 'others' as const }];
}

/** A pile's symbols in order, for its label: "l", or "o+r" once merged. */
export const symbolsOf = (n: Node): number[] =>
  n.kids ? [...symbolsOf(n.kids[0]), ...symbolsOf(n.kids[1])] : [n.sym!];
const short = (syms: number[]) => {
  const s = syms.map(byteName).join('');
  return s.length > 5 ? `${s.slice(0, 4)}…` : s;
};
/** The merge puzzle's piles: each root of the forest, merged ones on a tray, the last made lit. */
export const forestPiles = (roots: Node[], lit?: Node): Pile[] =>
  roots.map(n => ({ label: short(symbolsOf(n)), w: n.w, kind: n.kids ? 'merged' : 'byte', lit: n === lit }));

/** What the table shows. Pure, so the tests can check it without drawing. */
export function pileState(o: PileOpts) {
  const shown = o.piles.slice(0, MAX_PILES),
    // "others" is the rest of a big file: it stands full height, so it never flattens the piles beside it
    max = Math.max(1, ...shown.filter(p => p.kind !== 'others').map(p => p.w));
  const at = (i: number): [number, number] => [X0 + (i % 4) * DX, ROWS[Math.floor(i / 4)]];
  return {
    shown,
    tiles: shown.map(p => Math.max(1, Math.min(MAX_TILES, Math.round((p.w / max) * MAX_TILES)))),
    at,
    tray: Math.max(
      0,
      shown.findIndex(p => p.lit),
      shown.findIndex(p => p.kind === 'merged'),
    ),
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** One pile: a stack of tiles, on a tray when merged. */
function pile(x: number, y: number, n: number, p: Pile) {
  const m = p.lit
    ? PALS.mint
    : p.kind === 'merged'
      ? PALS.cobalt
      : p.kind === 'others'
        ? GHOST
        : p.kind === 'pointer'
          ? PALS.tomato
          : PALS.mustard;
  let s = '',
    z = BH;
  if (p.kind === 'merged' || p.lit) {
    s += box(x - HALF - 3, y - HALF - 3, z, x + HALF + 3, y + HALF + 3, z + 1.4, WOOD, toneI, 0.8);
    z += 1.4;
  }
  for (let i = 0; i < n; i++)
    s += box(x - HALF, y - HALF, z + i * STEP, x + HALF, y + HALF, z + i * STEP + TILE, m, toneI, 0.7);
  const top = z + (n - 1) * STEP + TILE;
  return { svg: s + hullInk(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, top), 1.4), top };
}

/** The parcel: the raw size as a wireframe crate, the packed size as a solid box that may rise out of it. */
function parcel(raw: number, packed: number) {
  const [x, y] = PARCEL,
    hp = Math.min(P_RAW * 1.6, (P_RAW * packed) / Math.max(1, raw)),
    x0 = x - P_HALF,
    x1 = x + P_HALF,
    y0 = y - P_HALF,
    y1 = y + P_HALF;
  let s = box(x0 + 2, y0 + 2, BH, x1 - 2, y1 - 2, BH + Math.max(1, hp), KRAFT, toneI, 1);
  // a strip of tape across the box's lid
  s += box(x - 1.5, y0 + 2, BH + Math.max(1, hp), x + 1.5, y1 - 2, BH + Math.max(1, hp) + 0.3, CERAMIC, toneI, 0.4);
  const zt = BH + P_RAW,
    corners: [number, number][] = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
  s += line([...corners.map(([a, b]) => [a, b, zt]), [x0, y0, zt]], 0.9);
  for (const [a, b] of corners)
    s += line(
      [
        [a, b, BH],
        [a, b, zt],
      ],
      0.7,
    );
  s += line(
    [
      [x0, y1, BH],
      [x1, y1, BH],
      [x1, y0, BH],
    ],
    0.7,
  );
  return {
    svg: `<g data-prop="parcel" data-raw="${raw}" data-packed="${packed}">${s}</g>`,
    top: BH + Math.max(hp, P_RAW),
  };
}

export const bytesWord = (n: number) => `${n} B`;

/** The table: shadows, piles back to front, the parcel, then the pills. */
export const pileScene = (o: PileOpts) => (ctx: SceneCtx) => {
  const st = pileState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = '';
  const parts: { at: number[]; svg: string }[] = [];
  const tops: number[] = [];
  st.shown.forEach((p, i) => {
    const [x, y] = st.at(i),
      d = pile(x, y, st.tiles[i], p);
    tops.push(d.top);
    s += castShadow(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, d.top), BH, ctx.top);
    parts.push({
      at: [x, y, 0],
      svg: `<g data-pile="${i}" data-w="${p.w}"${p.kind ? ` data-kind="${p.kind}"` : ''}${p.lit ? ' data-lit="1"' : ''}>${d.svg}</g>`,
    });
  });
  let ptop = 0;
  if (o.parcel) {
    const pc = parcel(o.parcel.raw, o.parcel.packed);
    ptop = pc.top;
    s += castShadow(
      boxCorners(PARCEL[0] - P_HALF, PARCEL[1] - P_HALF, BH, PARCEL[0] + P_HALF, PARCEL[1] + P_HALF, ptop),
      BH,
      ctx.top,
    );
    parts.push({ at: [PARCEL[0], PARCEL[1], 0], svg: pc.svg });
  }
  s += byDepth(parts);
  if (st.shown.length) s += `<g data-prop="piles"></g><g data-prop="tray"></g>`;
  let pills = '';
  // the back row's pills ride higher, so they clear the front row's
  const lift = (i: number) => (i < 4 ? -30 : -12);
  st.shown.forEach((p, i) => {
    const [x, y] = st.at(i);
    const text = narrow ? p.label : `${p.label} · ${p.w}`;
    pills += pill([x, y, tops[i]], 0, lift(i), text, !!p.lit, scale, p.kind === 'others' ? '#ece7dc' : undefined);
  });
  if (o.parcel) {
    const { raw, packed } = o.parcel,
      top = [PARCEL[0], PARCEL[1], ptop];
    pills += pill(
      top,
      0,
      -14,
      narrow ? bytesWord(packed) : `${bytesWord(packed)} OF ${bytesWord(raw)}`,
      packed !== raw,
      scale,
    );
    pills += sayAt(o.say, 'parcel', top, -14, scale);
  }
  if (st.shown.length) {
    const first = st.at(0),
      t = st.at(st.tray);
    pills += sayAt(o.say, 'piles', [...first, tops[0]], lift(0), scale);
    pills += sayAt(o.say, 'tray', [...t, tops[st.tray]], lift(st.tray), scale);
  }
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function pileLabel(o: PileOpts): string {
  const st = pileState(o);
  const piles = st.shown.length
    ? `A sorting table with ${st.shown.length} pile${st.shown.length === 1 ? '' : 's'}: ${st.shown.map(p => `${p.label} (${p.w})`).join(', ')}.`
    : 'An empty sorting table.';
  const box = o.parcel
    ? ` The parcel holds ${bytesWord(o.parcel.packed)} of the ${bytesWord(o.parcel.raw)} file${o.parcel.packed > o.parcel.raw ? ', bigger than it started' : ''}.`
    : '';
  return piles + box;
}

/** What the caption carries (phones show only short names in the pills). */
export function pileReadouts(o: PileOpts): string[] {
  const st = pileState(o);
  return [
    ...(st.shown.length ? [`${st.shown.length} pile${st.shown.length === 1 ? '' : 's'}`] : []),
    ...(o.parcel ? [`${bytesWord(o.parcel.packed)} of ${bytesWord(o.parcel.raw)}`] : []),
  ];
}

/** The reader: a file's bytes on the table, with its packed size in the parcel. */
export const pileAt = (bytes: Uint8Array, packed = bytes.length): PileOpts => ({
  piles: pilesOf(bytes),
  parcel: { raw: bytes.length, packed },
});

/** The home hero's plot: three piles of tiles, tall to short, and a taped parcel beside them. */
export function pilePlot(x: number, y: number, top: SceneCtx['top']): string {
  const h = 4.5;
  const stacks: [number, number, number, typeof PALS.mustard][] = [
    [x - 14, y - 6, 5, PALS.mustard],
    [x - 2, y - 6, 3, PALS.mustard],
    [x - 8, y + 8, 2, PALS.cobalt],
  ];
  let s = stacks
    .map(([sx, sy, n]) => castShadow(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, BH + n * 2.2), BH, top))
    .join('');
  s += castShadow(boxCorners(x + 6, y + 2, BH, x + 18, y + 14, BH + 9), BH, top);
  const parts = stacks.map(([sx, sy, n, m]) => {
    let c = '';
    for (let i = 0; i < n; i++)
      c += box(sx - h, sy - h, BH + i * 2.2, sx + h, sy + h, BH + i * 2.2 + 1.8, m, toneI, 0.5);
    return { at: [sx, sy, 0], svg: c + hullInk(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, BH + n * 2.2), 1.1) };
  });
  parts.push({
    at: [x + 12, y + 8, 0],
    svg:
      box(x + 6, y + 2, BH, x + 18, y + 14, BH + 9, KRAFT, toneI, 0.8) +
      box(x + 11, y + 2, BH + 9, x + 13, y + 14, BH + 9.3, CERAMIC, toneI, 0.4) +
      hullInk(boxCorners(x + 6, y + 2, BH, x + 18, y + 14, BH + 9), 1.1),
  });
  return s + byDepth(parts);
}
