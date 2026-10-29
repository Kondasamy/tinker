// The Git module's picture: the crate yard (KTD15). Every commit is a sealed wooden crate stamped with the first seven
// characters of its real hash (in a pill), chained by a rail to its parent crate; a merge crate stands on two rails.
// Columns run left to right, oldest first; main's lane is the back row, each other branch a row in front of it, and crates
// no branch reaches any more (left behind by a rebase) stand pale in the front row. A branch is a flagpole on its crate, a
// flag in the branch's colour and its name in a pill; HEAD is a lantern lit on the pole of the branch you are on. A
// conflict crate stands with its lid off, a tomato tag on it and both sides' papers poking out. In the packing view
// (chapter 1) a page lies on a desk beside two crates: the saved version's and the one your typing re-stamps. Words
// only in pills; on phones (scale > 1.5) pills keep only hashes and branch names. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  depthOf,
  hullInk,
  line,
  matOf,
  norm,
  pd,
  rod,
  shape,
  ink,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { hexa, mini, person, type Piece, drawPieces } from '../../lib/iso/figures';
import { ancestors, type Repo } from '../../lib/git/graph';
import { short } from '../../lib/git/objects';
import type { Say } from '../story/steps';

/** Columns and lanes the yard holds; older crates fold into a count pill. */
export const COLS = 6,
  LANES = 4;
const DX = 38,
  DY = 44,
  HALF = 10,
  HT = 15,
  POLE = 36;
export const CRATE_BOARD: Board = [0, 0, COLS * DX, LANES * DY];
/** The packing view stands on a smaller board, so the desk and its two crates fill the frame. */
export const PACK_BOARD: Board = [24, 36, 196, 156];
export const boardOf = (o: Pick<CrateOpts, 'packing'>) => (o.packing ? PACK_BOARD : CRATE_BOARD);

export interface Crate {
  id: string;
  col: number;
  lane: number;
  parents: string[];
  /** lit: just made or re-stamped; ghost: no branch reaches it; conflict: a merge that met a conflict */
  state?: 'lit' | 'ghost' | 'conflict';
}
export interface Flag {
  name: string;
  at: string;
  head?: boolean;
}
export interface Packing {
  /** the page's file name */
  file: string;
  /** the saved version's blob id, and the one for what is typed now */
  saved: string;
  now: string;
}
export interface CrateOpts {
  crates: Crate[];
  flags: Flag[];
  /** the merge base, when a chapter points at it */
  base?: string;
  /** chapter 1's packing view instead of the yard */
  packing?: Packing;
  say?: Say;
  scale?: number;
}

/** The parts a callout may name: the yard's (the newest crate on HEAD's branch, the oldest shown, the lantern, the
 * merge base) and the packing view's (the page, the saved crate, your crate). */
export const YARD_PARTS = ['tip', 'root', 'head', 'base'] as const;
export const PACKING_PARTS = ['page', 'saved', 'blob'] as const;
export const CRATE_PARTS = [...YARD_PARTS, ...PACKING_PARTS] as const;

const FLAG_PAL: Record<string, { l: string; m: string; d: string }> = {
  main: PALS.cobalt,
  sale: PALS.mint,
  shelf: PALS.blush,
  hinge: PALS.mustard,
};
const flagPal = (name: string) => FLAG_PAL[name] ?? PALS.mint;
const LANTERN = { l: '#ffe39a', m: '#ffd27a', d: '#e8a93c' };
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const GHOST = { l: '#efe9dd', m: '#ddd5c4', d: '#bdb3a0' };
const TOMATO_PILL = '#f6c2b4',
  MINT_PILL = '#cdebd9',
  GHOST_PILL = '#ece7dc';

/** Lay a repo out as crates: a column per generation, a lane per branch (main first), pale crates no branch reaches. */
export function yardOf(
  r: Repo,
  o: { lit?: string[]; conflict?: string; ghosts?: boolean; base?: string } = {},
): Omit<CrateOpts, 'say' | 'scale'> {
  const refs = Object.keys(r.refs).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
  const reach = new Set(refs.flatMap(x => [...ancestors(r, r.refs[x])]));
  const ids = r.order.filter(id => reach.has(id) || o.ghosts !== false);
  const col: Record<string, number> = {};
  for (const id of ids) col[id] = Math.max(-1, ...r.commits[id].parents.map(p => col[p] ?? -1)) + 1;
  // a lane per branch that has commits of its own, main's first
  const lane: Record<string, number> = {};
  let next = 0;
  for (const ref of refs) {
    let claimed = false;
    for (let id: string | undefined = r.refs[ref]; id && lane[id] === undefined; id = r.commits[id].parents[0]) {
      lane[id] = Math.min(next, LANES - 1);
      claimed = true;
    }
    if (claimed) next++;
  }
  const used = next - 1;
  return {
    crates: ids.map(id => ({
      id,
      col: col[id],
      lane: lane[id] ?? Math.min(used + 1, LANES - 1),
      parents: r.commits[id].parents,
      ...(id === o.conflict
        ? { state: 'conflict' as const }
        : o.lit?.includes(id)
          ? { state: 'lit' as const }
          : !reach.has(id)
            ? { state: 'ghost' as const }
            : {}),
    })),
    flags: refs.map(name => ({ name, at: r.refs[name], ...(name === r.head ? { head: true } : {}) })),
    ...(o.base ? { base: o.base } : {}),
  };
}

/** What the picture shows. Pure, so the tests can check it without drawing: the crates in view, where each stands,
 * how many older ones are folded away. */
export function crateState(o: CrateOpts) {
  const last = Math.max(0, ...o.crates.map(c => c.col)),
    first = Math.max(0, last - COLS + 1);
  const shown = o.crates.filter(c => c.col >= first);
  // the crates in view stand in the middle of the yard, main's lane at the back
  const cols = last - first + 1,
    lanes = Math.max(1, ...o.crates.map(c => c.lane + 1));
  const ox = ((COLS - cols) / 2) * DX,
    oy = ((LANES - lanes) / 2) * DY;
  const at = (c: Crate): [number, number] => [ox + (c.col - first) * DX + DX / 2, oy + c.lane * DY + DY / 2];
  const pos = Object.fromEntries(shown.map(c => [c.id, at(c)]));
  const head = o.flags.find(f => f.head);
  return {
    shown,
    pos,
    hidden: o.crates.length - shown.length,
    edges: shown.flatMap(c => c.parents.map(p => ({ from: c.id, to: p, inView: p in pos }))),
    tip: head && head.at in pos ? head.at : undefined,
    root: shown.reduce<Crate | undefined>((a, c) => (!a || c.col < a.col ? c : a), undefined)?.id,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** A sealed crate: slats on its two front faces, a lid, a wax seal; pale for a ghost, lid off for a conflict. Exported
 * for Dependencies' crate tower, which may paint it another colour (pal). Real-object notes: horizontal planks with
 * gaps between them on every side; a square post down each corner, standing just proud of the planks and a shade
 * darker; a lid of the same planks overhanging the posts. Faces and posts draw only where they face the viewer. */
export function crate(
  x: number,
  y: number,
  state?: Crate['state'],
  z0 = BH,
  half = HALF,
  ht = HT,
  pal?: { l: string; m: string; d: string },
) {
  const m = pal ?? (state === 'ghost' ? GHOST : WOOD),
    x0 = x - half,
    x1 = x + half,
    y0 = y - half,
    y1 = y + half,
    z1 = z0 + ht,
    zt = z1 - 1.6,
    // posts a shade darker than the planks; on a small crate (a hero plot, a pulled ghost) they thin out
    pm = matOf(m.m),
    pw = Math.min(2.2, half * 0.22);
  let s = box(x0 + 0.3, y0 + 0.3, z0, x1 - 0.3, y1 - 0.3, zt, m, toneI, 1);
  // the gaps between planks on each side that faces the viewer
  const sides: [number[], (u: number, z: number) => number[]][] = [
    [[1, 0, 0], (u, z) => [x1 - 0.25, u, z]],
    [[-1, 0, 0], (u, z) => [x0 + 0.25, u, z]],
    [[0, 1, 0], (u, z) => [u, y1 - 0.25, z]],
    [[0, -1, 0], (u, z) => [u, y0 + 0.25, z]],
  ];
  const gaps = half > 6 ? [0.25, 0.5, 0.75] : [0.5];
  for (const [n, at] of sides) {
    if (!vis(n)) continue;
    const [u0, u1] = n[0] ? [y0 + pw, y1 - pw] : [x0 + pw, x1 - pw];
    for (const k of gaps) s += line([at(u0, z0 + (zt - z0) * k), at(u1, z0 + (zt - z0) * k)], 0.6);
  }
  // corner posts: every corner but the one hidden behind the crate, far ones first
  const corners = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ].sort((a, b) => depthOf([a[0], a[1], 0]) - depthOf([b[0], b[1], 0]));
  for (const [cx, cy] of corners.slice(1)) {
    const px = cx === x0 ? x0 : x1 - pw,
      py = cy === y0 ? y0 : y1 - pw;
    s += box(px, py, z0, px + pw, py + pw, zt, pm, toneI, 0.8);
  }
  if (state === 'conflict') {
    // lid off and leaning behind, both sides' papers poking out, a tomato tag on the front
    s += box(x0 + 1, y0 + 1, zt, x1 - 1, y1 - 1, z1 - 1.4, PALS.tomato, toneI, 0.5);
    s += box(x0 + 2, y0 + 2, zt, x0 + 3, y1 - 6, z1 + 6, PALS.cobalt, toneI, 0.6);
    s += box(x0 + 5, y0 + 2, zt, x0 + 6, y1 - 3, z1 + 8, PALS.mint, toneI, 0.6);
    s += box(x0 - 3, y0, zt, x0 - 2, y1, z1 + 9, m, toneI, 0.8);
    s += box(x1, y + 1, z0 + 3, x1 + 0.4, y + 5, z0 + 8, PALS.tomato, toneI, 0.7);
  } else {
    s += box(x0 - 0.5, y0 - 0.5, zt, x1 + 0.5, y1 + 0.5, z1, m, toneI, 0.9);
    // the lid's planks run along x
    if (half > 6)
      s += line(
        [
          [x0 - 0.5, y, z1 + 0.02],
          [x1 + 0.5, y, z1 + 0.02],
        ],
        0.5,
      );
    // the wax seal on the front face: the stamp its hash pill reads out
    s += box(
      x1,
      y - 2,
      z0 + ht * 0.42,
      x1 + 0.3,
      y + 2,
      z0 + ht * 0.42 + 3.4,
      state === 'ghost' ? GHOST : PALS.tomato,
      toneI,
      0.5,
    );
  }
  return s + hullInk(boxCorners(x0, y0, z0, x1, y1, z1), state === 'ghost' ? 1 : 1.6);
}

/** A rail from a crate to its parent. Real-object notes: wooden sleepers laid across the line, two steel rails
 * running along their tops (a dark edge under a bright head); a ghost's line is pale and thin. */
function rail(a: [number, number], b: [number, number], ghost: boolean) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = Math.hypot(dx, dy) || 1,
    ux = dx / len,
    uy = dy / len,
    nx = -uy * 2.4,
    ny = ux * 2.4,
    z = BH + 0.2;
  let s = '';
  const n = Math.floor(len / 5),
    sl = ghost ? GHOST.m : WOOD.m;
  for (let i = 1; i < n; i++) {
    const t = i / n,
      x = a[0] + dx * t,
      y = a[1] + dy * t,
      w = 0.8;
    s += shape(
      [
        [x - nx * 1.5 - ux * w, y - ny * 1.5 - uy * w, z],
        [x + nx * 1.5 - ux * w, y + ny * 1.5 - uy * w, z],
        [x + nx * 1.5 + ux * w, y + ny * 1.5 + uy * w, z],
        [x - nx * 1.5 + ux * w, y - ny * 1.5 + uy * w, z],
      ],
      sl,
      ghost ? 0.3 : 0.5,
    );
  }
  for (const k of [-1, 1]) {
    const d = pd(
      [
        [a[0] + nx * k, a[1] + ny * k, z + 0.4],
        [b[0] + nx * k, b[1] + ny * k, z + 0.4],
      ],
      false,
    );
    s += ghost
      ? `<path d="${d}" fill="none" stroke="${GHOST.d}" stroke-width=".7"/>`
      : `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${METAL.l}" stroke-width=".8" stroke-linecap="round"/>`;
  }
  return s;
}

/** A cloth flag hung off a pole at p (its top corner), flying along +x: a strip in waves, each panel shaded by which way
 * it turns, under one silhouette. */
function cloth(p: number[], len: number, h: number, pal: { l: string; m: string; d: string }) {
  const N = 4,
    pts = Array.from({ length: N + 1 }, (_, i) => [
      p[0] + (len * i) / N,
      p[1] + Math.sin((i / N) * Math.PI * 1.6) * 1.4 * (i / N + 0.3),
      p[2] - (i / N) * 0.8,
    ]);
  let s = '';
  for (let i = 0; i < N; i++) {
    const A = pts[i],
      B = pts[i + 1];
    let nrm = norm([-(B[1] - A[1]), B[0] - A[0], 0]);
    if (!vis(nrm)) nrm = nrm.map((v: number) => -v);
    s += shape([A, B, [B[0], B[1], B[2] - h], [A[0], A[1], A[2] - h]], toneI(nrm, pal), 0);
  }
  return s + ink(pd([...pts, ...[...pts].reverse().map(q => [q[0], q[1], q[2] - h])]), 1);
}

/** A flagpole on a crate's back corner: a round pole with a ball on top, a cloth flag in the branch's colour; HEAD is a
 * lit lantern hanging off a hook on the pole. Real-object notes (lantern): a bracket arm out from the pole ending in a
 * hook; a dark pyramid cap, a lit glass box, a base plate. */
function pole(x: number, y: number, i: number, f: Flag, z0 = BH + HT) {
  const [px, py] = [
    [x - HALF + 1.5, y - HALF + 1.5],
    [x + HALF - 1.5, y - HALF + 1.5],
    [x - HALF + 1.5, y + HALF - 1.5],
  ][i % 3];
  const top = z0 + POLE;
  let s = rod([px, py, z0], [px, py, top], 0.7, CERAMIC, toneI, 0.9, 0.55, 10);
  s += cyl(px, py, top, top + 1.4, 1, PALS.mustard, toneI, 0.7, 10);
  s += cloth([px + 0.6, py, top - 1], 9, 7, flagPal(f.name));
  if (f.head) {
    // the bracket reaches toward the viewer's left (+y), and the lantern hangs off its hook
    const hy = py + 6,
      hz = top - 10;
    let l = rod([px, py, hz + 1.5], [px, hy, hz + 1.5], 0.4, DARK, toneI, 0.6, 0.4, 8);
    l += line(
      [
        [px, hy, hz + 1.5],
        [px, hy + 0.6, hz + 0.6],
        [px, hy, hz - 0.2],
      ],
      0.8,
    );
    const g0 = hz - 7.2,
      g1 = hz - 2;
    l += box(px - 2.2, hy - 2.2, g0 - 0.8, px + 2.2, hy + 2.2, g0, DARK, toneI, 0.7);
    l += box(px - 1.8, hy - 1.8, g0, px + 1.8, hy + 1.8, g1, LANTERN, toneI, 0.8);
    l += hexa(
      [
        [px - 2.3, hy - 2.3, g1],
        [px + 2.3, hy - 2.3, g1],
        [px + 2.3, hy + 2.3, g1],
        [px - 2.3, hy + 2.3, g1],
        [px - 0.5, hy - 0.5, hz - 0.2],
        [px + 0.5, hy - 0.5, hz - 0.2],
        [px + 0.5, hy + 0.5, hz - 0.2],
        [px - 0.5, hy + 0.5, hz - 0.2],
      ],
      DARK,
      0.8,
    );
    s += `<g class="lantern">${l}</g>`;
  }
  return {
    at: [px, py, top + (f.head ? 5.5 : 0)],
    svg: s,
    box: span(px - 1.2, py - 2.4, z0, px + 10, py + (f.head ? 8.5 : 2.4), top + 1.4),
  };
}

/** Mira in front of the oldest crate in view, Tom past the newest: off the yard's columns and lanes, so they never
 * stand on a crate or its rail. */
const keepers = (pos: [number, number][]): Piece[] => {
  const xs = pos.map(p => p[0]),
    ys = pos.map(p => p[1]),
    x0 = Math.min(...xs, CRATE_BOARD[2] / 2),
    x1 = Math.max(...xs, CRATE_BOARD[2] / 2),
    y0 = Math.min(...ys, CRATE_BOARD[3] / 2),
    y1 = Math.max(...ys, CRATE_BOARD[3] / 2);
  return [
    person({ x: Math.max(8, x0), y: Math.min(CRATE_BOARD[3] - 7, y1 + 19), facing: -40, look: 'mira' }),
    person({ x: Math.min(CRATE_BOARD[2] - 7, x1 + 22), y: Math.max(7, y0 - 4), facing: 160, look: 'tom' }),
  ];
};

/** The packing view: the page on a desk, the saved version's crate and yours, each stamped with its blob id. */
function packing(p: Packing, o: CrateOpts) {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    same = p.now === p.saved;
  const desk: [number, number] = [52, 120],
    saved: [number, number] = [128, 60],
    mine: [number, number] = [172, 128];
  let ground = '';
  for (const [x, y] of [saved, mine])
    ground += castShadow(boxCorners(x - 13, y - 13, BH, x + 13, y + 13, BH + 20), BH, undefined);
  ground += castShadow(boxCorners(desk[0] - 22, desk[1] - 16, BH, desk[0] + 22, desk[1] + 16, BH + 12), BH, undefined);
  const [dx, dy] = desk,
    dz = BH + 12;
  let d = box(dx - 22, dy - 16, dz - 2, dx + 22, dy + 16, dz, WOOD, toneI, 1);
  for (const [lx, ly] of [
    [-20, -14],
    [20, -14],
    [-20, 14],
    [20, 14],
  ])
    d += box(dx + lx - 1, dy + ly - 1, BH, dx + lx + 1, dy + ly + 1, dz - 2, WOOD, toneI, 0.7);
  // the page: a sheet with a ruled line per price
  d += box(dx - 12, dy - 10, dz, dx + 12, dy + 10, dz + 0.4, CERAMIC, toneI, 0.8);
  for (let i = 0; i < 5; i++)
    d += line(
      [
        [dx - 9 + i * 4, dy - 7, dz + 0.5],
        [dx - 9 + i * 4, dy + 6 - (i % 2) * 4, dz + 0.5],
      ],
      0.5,
    );
  // Mira writes the page at the desk (one person: a second would break the view's size budget)
  const folk = [person({ x: 40, y: 95, facing: 90, look: 'mira', holding: null })];
  ground += folk.map(f => f.shadow).join('');
  const parts: { at?: number[]; box?: number[][]; svg: string }[] = [
    ...folk.flatMap(f => f.items),
    { box: span(dx - 22, dy - 16, BH, dx + 22, dy + 16, dz + 0.5), svg: `<g data-prop="page">${d}</g>` },
    {
      box: span(saved[0] - 13, saved[1] - 13, BH, saved[0] + 13, saved[1] + 13, BH + 20),
      svg: `<g data-prop="saved" data-id="${p.saved}">${crate(saved[0], saved[1], undefined, BH, 13, 20)}</g>`,
    },
    {
      box: span(mine[0] - 13, mine[1] - 13, BH, mine[0] + 13, mine[1] + 13, BH + 20),
      svg: `<g data-prop="blob" data-id="${p.now}">${crate(mine[0], mine[1], same ? undefined : 'lit', BH, 13, 20)}</g>`,
    },
  ];
  let s = ground + byDepth(parts);
  // the stamp re-presses (a CSS animation keyed by the hash) each time the typed text changes
  s += pill([dx, dy, dz], 0, 26, narrow ? p.file : `PAGE · ${p.file}`, false, scale);
  s += pill([...saved, BH + 20], 0, -16, narrow ? short(p.saved) : `SAVED · ${short(p.saved)}`, false, scale);
  s += `<g class="restamp" data-stamp="${p.now}">${pill([...mine, BH + 20], 0, -16, narrow ? short(p.now) : `YOURS · ${short(p.now)}`, !same, scale, same ? MINT_PILL : undefined)}</g>`;
  s += sayAt(o.say, 'page', [dx, dy, dz], 26, scale);
  s += sayAt(o.say, 'saved', [...saved, BH + 20], -16, scale);
  s += sayAt(o.say, 'blob', [...mine, BH + 20], -16, scale);
  return s;
}

/** The scene: rails, then crates and poles back to front, then the pills. */
export const crateScene = (o: CrateOpts) => (ctx: SceneCtx) => {
  if (o.packing) return packing(o.packing, o);
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    st = crateState(o);
  const ghostOf = new Set(st.shown.filter(c => c.state === 'ghost').map(c => c.id));
  const folk = keepers(Object.values(st.pos));
  let s = folk.map(f => f.shadow).join('');
  for (const c of st.shown) {
    const [x, y] = st.pos[c.id];
    s += castShadow(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, BH + HT), BH, ctx.top);
  }
  for (const e of st.edges) {
    const a = st.pos[e.from],
      // a parent folded away: the rail runs off the left edge
      b = e.inView ? st.pos[e.to] : ([2, a[1]] as [number, number]);
    s += `<g class="rail" data-from="${e.from}" data-to="${e.to}">${rail(a, b, ghostOf.has(e.from))}</g>`;
  }
  const byCrate = new Map<string, Flag[]>();
  for (const f of o.flags) byCrate.set(f.at, [...(byCrate.get(f.at) ?? []), f]);
  const parts: { at?: number[]; box?: number[][]; svg: string }[] = folk.flatMap(f => f.items);
  const poles: Record<string, number[]> = {};
  for (const c of st.shown) {
    const [x, y] = st.pos[c.id];
    const kind = c.parents.length > 1 ? 'merge' : 'commit';
    parts.push({
      box: span(x - HALF - (c.state === 'conflict' ? 3 : 0), y - HALF, BH, x + HALF, y + HALF, BH + HT),
      svg: `<g data-crate="${c.id}" data-kind="${kind}"${c.state ? ` data-state="${c.state}"` : ''}>${crate(x, y, c.state)}</g>`,
    });
    (byCrate.get(c.id) ?? []).forEach((f, i) => {
      const p = pole(x, y, i, f);
      poles[f.name] = p.at;
      parts.push({
        box: p.box,
        svg: `<g data-flag="${esc(f.name)}"${f.head ? ' data-head="1"' : ''}>${p.svg}</g>`,
      });
    });
  }
  s += byDepth(parts);
  let pills = '';
  if (st.hidden && st.root) {
    pills += pill([2, st.pos[st.root][1], BH], 0, -14, `+${st.hidden} OLDER`, false, scale, GHOST_PILL);
  }
  const flagged = new Set(o.flags.map(f => f.at));
  for (const c of st.shown) {
    // phones stamp only the crates a branch names or the step lights; the caption carries the count
    if (narrow && !flagged.has(c.id) && (!c.state || c.state === 'ghost')) continue;
    const [x, y] = st.pos[c.id];
    const fill = c.state === 'conflict' ? TOMATO_PILL : c.state === 'ghost' ? GHOST_PILL : undefined;
    // the stamp sits on the crate itself, over its front edge, so no two stamps meet
    pills += pill([x + HALF, y + HALF, BH + HT * 0.45], 0, 0, short(c.id), c.state === 'lit', scale, fill);
  }
  for (const f of o.flags) {
    if (!poles[f.name]) continue;
    pills += pill(poles[f.name], 0, -12, narrow || !f.head ? f.name : `${f.name} · HEAD`, false, scale);
  }
  const top = (id?: string) => (id && st.pos[id] ? [...st.pos[id], BH + HT] : undefined);
  const head = o.flags.find(f => f.head);
  // a callout sits a row above the pill it would cover: the flag's on a flagged crate, else the stamp's
  const over = (id?: string): [number[] | undefined, number] => {
    const f = o.flags.find(x => x.at === id && poles[x.name]);
    return f ? [poles[f.name], -12] : [top(id), -6];
  };
  const anchors: [string, number[] | undefined, number][] = [
    ['tip', ...over(st.tip)],
    ['root', ...over(st.root)],
    ['head', head ? poles[head.name] : undefined, -12],
    ['base', ...over(o.base)],
  ];
  for (const [part, p, dy] of anchors) {
    if (!p) continue;
    s += `<g data-prop="${part}"></g>`;
    pills += sayAt(o.say, part, p, dy, scale);
  }
  return s + pills;
};

export const count = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** The picture in words, for its aria-label. */
export function crateLabel(o: CrateOpts): string {
  if (o.packing) {
    const p = o.packing;
    return `The page ${p.file} on a desk beside two crates: the saved version stamped ${short(p.saved)}, and yours stamped ${short(p.now)}${p.now === p.saved ? ', the same name' : ', a new name'}.`;
  }
  const st = crateState(o);
  const merges = st.shown.filter(c => c.parents.length > 1).length,
    ghosts = st.shown.filter(c => c.state === 'ghost').length,
    conflict = st.shown.some(c => c.state === 'conflict');
  const head = o.flags.find(f => f.head);
  return (
    `A yard of ${count(st.shown.length, 'crate')} chained by rails${st.hidden ? `, ${st.hidden} older out of view` : ''}` +
    `${merges ? `, ${count(merges, 'merge crate')}` : ''}${conflict ? ', one with a conflict' : ''}` +
    `${ghosts ? `, ${count(ghosts, 'crate')} no branch reaches` : ''}. ` +
    o.flags.map(f => `${f.name} flies on ${short(f.at)}`).join('; ') +
    (head ? `. HEAD is on ${head.name}.` : '.')
  );
}

/** What the caption carries (phones show only hashes and names in the pills). */
export function crateReadouts(o: CrateOpts): string[] {
  if (o.packing) return [o.packing.now === o.packing.saved ? 'same name as saved' : 'new name'];
  const st = crateState(o),
    head = o.flags.find(f => f.head);
  return [
    count(st.shown.length + st.hidden, 'commit'),
    ...(head ? [`on ${head.name}`] : []),
    ...(st.shown.some(c => c.state === 'conflict') ? ['conflict'] : []),
  ];
}

/** The home hero's plot: four crates on their rails, the newest two flying their branch flags (main's with HEAD's
 * lantern hung on its pole), Mira and Tom beside the yard. */
export function cratePlot(x: number, y: number, top: SceneCtx['top']): string {
  const at: [number, number][] = [
    [x - 18, y + 4],
    [x - 4, y + 4],
    [x + 10, y + 4],
    [x + 2, y - 12],
  ];
  const k = 0.5,
    flags: (Flag | null)[] = [null, null, { name: 'main', at: '', head: true }, { name: 'sale', at: '' }];
  let s = line(
    [
      [at[0][0], at[0][1], BH + 0.2],
      [at[2][0], at[2][1], BH + 0.2],
    ],
    0.8,
  );
  s += line(
    [
      [at[1][0], at[1][1], BH + 0.2],
      [at[3][0], at[3][1], BH + 0.2],
    ],
    0.8,
  );
  const pieces = [
    ...at.map(([cx, cy], i) => {
      const f = flags[i],
        p = f ? pole(0, 0, 1, f) : null,
        b = span(-HALF, -HALF, BH, HALF, HALF, BH + HT);
      return mini(
        {
          shadow: castShadow(boxCorners(-HALF, -HALF, BH, HALF, HALF, BH + HT), BH),
          items: [
            { box: p ? [b[0], p.box[1].map((v, j) => Math.max(v, b[1][j]))] : b, svg: crate(0, 0) + (p?.svg ?? '') },
          ],
        },
        [0, 0, BH],
        [cx, cy, BH],
        k,
      );
    }),
    mini(person({ x: 0, y: 0, facing: -40, look: 'mira' }), [0, 0, BH], [x - 22, y + 16, BH], k),
    mini(person({ x: 0, y: 0, facing: 160, look: 'tom' }), [0, 0, BH], [x + 20, y - 14, BH], k),
  ];
  return s + drawPieces(pieces, top);
}
