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
import { CERAMIC, PALS, WOOD, box, byDepth, castShadow, cyl, hullInk, line, tag, toneI } from '../../lib/iso/core.js';
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
 * for Dependencies' crate tower, which may paint it another colour (pal). */
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
    z1 = z0 + ht;
  let s = box(x0, y0, z0, x1, y1, z1 - 1.6, m, toneI, 1);
  for (const k of [0.33, 0.66]) {
    const z = z0 + (ht - 1.6) * k;
    s += line(
      [
        [x1, y0 + 0.8, z],
        [x1, y1, z],
        [x0 + 0.8, y1, z],
      ],
      0.6,
    );
  }
  if (state === 'conflict') {
    // lid off and leaning behind, both sides' papers poking out, a tomato tag on the front
    s += box(x0 + 1, y0 + 1, z1 - 1.6, x1 - 1, y1 - 1, z1 - 1.4, PALS.tomato, toneI, 0.5);
    s += box(x0 + 2, y0 + 2, z1 - 1.6, x0 + 3, y1 - 6, z1 + 6, PALS.cobalt, toneI, 0.6);
    s += box(x0 + 5, y0 + 2, z1 - 1.6, x0 + 6, y1 - 3, z1 + 8, PALS.mint, toneI, 0.6);
    s += box(x0 - 3, y0, z1 - 1.6, x0 - 2, y1, z1 + 9, m, toneI, 0.8);
    s += box(x1, y + 1, z0 + 3, x1 + 0.4, y + 5, z0 + 8, PALS.tomato, toneI, 0.7);
  } else {
    s += box(x0 - 0.5, y0 - 0.5, z1 - 1.6, x1 + 0.5, y1 + 0.5, z1, m, toneI, 0.9);
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

/** A rail from a crate to its parent: two steel lines on sleepers. */
function rail(a: [number, number], b: [number, number], ghost: boolean) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    len = Math.hypot(dx, dy) || 1,
    nx = (-dy / len) * 2.4,
    ny = (dx / len) * 2.4,
    z = BH + 0.2;
  let s = '';
  const n = Math.floor(len / 5);
  for (let i = 1; i < n; i++) {
    const t = i / n,
      x = a[0] + dx * t,
      y = a[1] + dy * t;
    s += line(
      [
        [x - nx * 1.4, y - ny * 1.4, z],
        [x + nx * 1.4, y + ny * 1.4, z],
      ],
      ghost ? 0.5 : 1.1,
    );
  }
  for (const k of [-1, 1])
    s += line(
      [
        [a[0] + nx * k, a[1] + ny * k, z],
        [b[0] + nx * k, b[1] + ny * k, z],
      ],
      ghost ? 0.5 : 0.9,
    );
  return s;
}

/** A flagpole on a crate's back corner, its flag in the branch's colour, a lantern at the top when HEAD is here. */
function pole(x: number, y: number, i: number, f: Flag, z0 = BH + HT) {
  const [px, py] = [
    [x - HALF + 1.5, y - HALF + 1.5],
    [x + HALF - 1.5, y - HALF + 1.5],
    [x - HALF + 1.5, y + HALF - 1.5],
  ][i % 3];
  const top = z0 + POLE;
  let s = box(px - 0.6, py - 0.6, z0, px + 0.6, py + 0.6, top, WOOD, toneI, 0.7);
  s += box(px + 0.6, py - 0.3, top - 8, px + 9, py + 0.3, top - 1, flagPal(f.name), toneI, 0.8);
  if (f.head)
    s += `<g class="lantern">${cyl(px, py, top, top + 4, 2.2, PALS.mustard, toneI, 0.9, 14)}${box(px - 0.4, py - 0.4, top + 4, px + 0.4, py + 0.4, top + 5.5, WOOD, toneI, 0.5)}</g>`;
  return { at: [px, py, top + (f.head ? 5.5 : 0)], svg: s };
}

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
  const parts = [
    { at: [dx, dy, 0], svg: `<g data-prop="page">${d}</g>` },
    {
      at: [...saved, 0],
      svg: `<g data-prop="saved" data-id="${p.saved}">${crate(saved[0], saved[1], undefined, BH, 13, 20)}</g>`,
    },
    {
      at: [...mine, 0],
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
  let s = '';
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
  const parts: { at: number[]; svg: string }[] = [];
  const poles: Record<string, number[]> = {};
  for (const c of st.shown) {
    const [x, y] = st.pos[c.id];
    const kind = c.parents.length > 1 ? 'merge' : 'commit';
    parts.push({
      at: [x, y, 0],
      svg: `<g data-crate="${c.id}" data-kind="${kind}"${c.state ? ` data-state="${c.state}"` : ''}>${crate(x, y, c.state)}</g>`,
    });
    (byCrate.get(c.id) ?? []).forEach((f, i) => {
      const p = pole(x, y, i, f);
      poles[f.name] = p.at;
      parts.push({
        at: [x - HALF + 1, y - HALF + 1, 1],
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

const count = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
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

/** The home hero's plot: three crates on a rail, the newest with a flag and a lit lantern, a branch crate behind. */
export function cratePlot(x: number, y: number, top: SceneCtx['top']): string {
  const at: [number, number][] = [
    [x - 18, y + 4],
    [x - 4, y + 4],
    [x + 10, y + 4],
    [x + 2, y - 12],
  ];
  const h = 5,
    ht = 8;
  let s = at.map(([cx, cy]) => castShadow(boxCorners(cx - h, cy - h, BH, cx + h, cy + h, BH + ht), BH, top)).join('');
  s += line(
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
  const parts = at.map(([cx, cy], i) => {
    let c = box(cx - h, cy - h, BH, cx + h, cy + h, BH + ht, WOOD, toneI, 0.9);
    c += box(cx + h, cy - 1.2, BH + 3, cx + h + 0.3, cy + 1.2, BH + 5, PALS.tomato, toneI, 0.4);
    c += hullInk(boxCorners(cx - h, cy - h, BH, cx + h, cy + h, BH + ht), 1.2);
    if (i === 2 || i === 3) {
      const px = cx - h + 1,
        py = cy - h + 1,
        z = BH + ht,
        t = z + 13;
      c += box(px - 0.4, py - 0.4, z, px + 0.4, py + 0.4, t, WOOD, toneI, 0.5);
      c += box(px + 0.4, py - 0.2, t - 5, px + 6, py + 0.2, t - 1, i === 2 ? PALS.cobalt : PALS.mint, toneI, 0.6);
      if (i === 2) c += cyl(px, py, t, t + 2.6, 1.5, PALS.mustard, toneI, 0.7, 12);
    }
    return { at: [cx, cy, 0], svg: c };
  });
  return s + byDepth(parts);
}
