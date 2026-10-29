// The Dependencies module's picture: the crate tower (KTD13). In Larkspur's yard, every installed package is a crate
// (Git's crate drawing, from crateScene), stacked so each stands on the packages it needs: the ones that need nothing on
// the ground, the shop app's own crate on top. A nested second copy stands in its row like any other, its pill naming
// its place. A broken crate (a bad release, or one that lost something it needs) turns tomato and carries crossed
// planks, so "broken" never rests on colour alone; a hijacked release is a dark crate. A crate the reader pulled lies on
// the ground in front; the lockfile is a sheet on a post with a padlock. At most 12 crates stand; the deepest are
// folded into a count pill. Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption
// carries versions and counts. Every string is escaped (esc).
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  INK,
  METAL,
  PALS,
  PX,
  PY,
  PZ,
  WOOD,
  box,
  byDepth,
  castShadow,
  line,
  on,
  pd,
  rod,
  shape,
  tag,
  toneI,
  vis,
} from '../../lib/iso/core.js';
import { padlock, person } from '../../lib/iso/figures';
import { APP, auditOf, brokenOf, type Tree } from '../../lib/dependencies/resolve';
import type { Say } from '../story/steps';
import { count, crate } from './crateScene';

export const TOWER_BOARD: Board = [0, 0, 180, 180];
/** At most this many crates stand, the app's included; the deepest fold into a count pill (KTD13). */
export const MAX_CRATES = 12;
/** The parts a step's callout may name. */
export const TOWER_PARTS = ['app', 'lit', 'nested', 'broken', 'hijacked', 'pulled', 'lock'] as const;

export interface TowerCrate {
  /** node_modules path; "" is the app */
  path: string;
  name: string;
  version: string;
  broken?: boolean;
  hijacked?: boolean;
  lit?: boolean;
}
export interface TowerOpts {
  crates: TowerCrate[];
  /** for each crate, the paths it stands on */
  needs: Record<string, string[]>;
  /** crates pulled out by the reader, lying in front */
  pulled?: { path: string; name: string; version: string }[];
  /** the lockfile is in use */
  lock?: boolean;
  /** crates that broke on the reader's last action: they topple, where motion is allowed */
  fell?: string[];
  say?: Say;
  scale?: number;
}

/** The tower for an installed tree: what is broken and hijacked is read off the tree itself. */
export function towerOf(
  t: Tree,
  o: { lit?: string[]; pulled?: TowerOpts['pulled']; lock?: boolean } = {},
): Omit<TowerOpts, 'say' | 'scale' | 'fell'> {
  const broken = brokenOf(t),
    hijacked = new Set(auditOf(t).hijacked),
    lit = new Set(o.lit ?? []);
  const crate = (path: string, name: string, version: string): TowerCrate => ({
    path,
    name,
    version,
    ...(broken.has(path) ? { broken: true } : {}),
    ...(hijacked.has(path) ? { hijacked: true } : {}),
    ...(lit.has(path) ? { lit: true } : {}),
  });
  const needs: Record<string, string[]> = { '': [] };
  for (const n of t.nodes) needs[n.path] = [];
  for (const n of t.nodes) for (const by of n.by) needs[by]?.push(n.path);
  return {
    crates: [crate('', APP.name, ''), ...t.nodes.map(n => crate(n.path, n.name, n.version))],
    needs,
    ...(o.pulled?.length ? { pulled: o.pulled } : {}),
    ...(o.lock ? { lock: true } : {}),
  };
}

const S = 36, // crate spacing along a row
  HALF = 11,
  HT = 16,
  ROW = 5, // crates per row before a second row stands behind
  CX = 96,
  CY = 96;

/** What the picture shows. Pure, so the tests can check it without drawing: the crates in view (nearest the app first),
 * the level each stands at (0 on the ground), where, and how many deeper ones are folded away. */
export function towerState(o: Pick<TowerOpts, 'crates' | 'needs'>) {
  // nearest the app first: breadth-first from the app over what each crate needs
  const order: string[] = [''],
    seen = new Set(['']);
  for (let i = 0; i < order.length; i++)
    for (const p of [...(o.needs[order[i]] ?? [])].sort())
      if (!seen.has(p) && o.crates.some(c => c.path === p)) {
        seen.add(p);
        order.push(p);
      }
  for (const c of o.crates) if (!seen.has(c.path)) order.push(c.path);
  const shown = new Set(order.slice(0, MAX_CRATES));
  const level: Record<string, number> = {};
  const lv = (p: string, stack = new Set<string>()): number => {
    if (level[p] !== undefined) return level[p];
    if (stack.has(p)) return 0;
    stack.add(p);
    const under = (o.needs[p] ?? []).filter(q => shown.has(q));
    level[p] = under.length ? 1 + Math.max(...under.map(q => lv(q, stack))) : 0;
    return level[p];
  };
  for (const p of shown) lv(p);
  const rows: Record<number, string[]> = {};
  for (const p of order) if (shown.has(p)) (rows[level[p]] ??= []).push(p);
  // top row down, each crate takes the free place nearest the crates that need it: first those needed by a crate in
  // the row just above (so a column stands on something it needs), then the rest
  const slot: Record<string, number> = {},
    back: Record<string, number> = {};
  const needers = (p: string) => order.filter(q => shown.has(q) && (o.needs[q] ?? []).includes(p));
  for (const l of Object.keys(rows)
    .map(Number)
    .sort((a, b) => b - a)) {
    const ps = rows[l];
    const places = ps.map((_, i) => {
      const b = Math.floor(i / ROW),
        inRow = Math.min(ROW, ps.length - b * ROW);
      return { t: (i % ROW) - (inRow - 1) / 2, b, free: true };
    });
    const want = ps.map(p => {
      const ns = needers(p).filter(q => slot[q] !== undefined),
        above = ns.find(q => level[q] === l + 1);
      return {
        p,
        prio: above !== undefined ? 0 : 1,
        pref: above !== undefined ? slot[above] : ns.length ? ns.reduce((a, q) => a + slot[q], 0) / ns.length : 0,
      };
    });
    want.sort((a, b) => a.prio - b.prio || a.pref - b.pref || (a.p < b.p ? -1 : 1));
    for (const w of want) {
      const best = places
        .filter(x => x.free)
        .reduce((a, x) => (Math.abs(x.t - w.pref) + x.b < Math.abs(a.t - w.pref) + a.b ? x : a));
      best.free = false;
      slot[w.p] = best.t;
      back[w.p] = best.b;
    }
  }
  const pos: Record<string, [number, number, number]> = {};
  // a row runs straight across the screen (x up, y down); a second row stands behind the first
  for (const p of Object.keys(slot))
    pos[p] = [CX + slot[p] * S - back[p] * S, CY - slot[p] * S - back[p] * S, BH + level[p] * HT];
  return {
    shown: order.filter(p => shown.has(p)),
    level,
    slot,
    pos,
    hidden: order.length - shown.size,
  };
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const TOMATO_PILL = '#f6c2b4',
  DARK_PILL = '#d9d4cc',
  GHOST_FILL = '#ece7dc',
  NESTED_PILL = '#cdebd9',
  PULLED_AT: [number, number] = [128, 170],
  LOCK_AT: [number, number] = [172, 128];

/** Crossed planks nailed over a broken crate's front face: the marker that does not rely on colour. */
function planks(x: number, y: number, z0: number) {
  const x1 = x + HALF + 0.3,
    a = z0 + 2,
    b = z0 + HT - 3;
  return `<g class="planks">${line(
    [
      [x1, y - HALF + 2, a],
      [x1, y + HALF - 2, b],
    ],
    1.6,
  )}${line(
    [
      [x1, y - HALF + 2, b],
      [x1, y + HALF - 2, a],
    ],
    1.6,
  )}</g>`;
}

/** The lockfile: a sheet of lines on a post, a padlock (round steel shackle) hung through its foot. */
function lockfile() {
  const [x, y] = LOCK_AT;
  let s = box(x - 1, y - 1, BH, x + 1, y + 1, BH + 22, WOOD, toneI, 0.8);
  s += box(x + 1, y - 8, BH + 8, x + 1.6, y + 8, BH + 24, CERAMIC, toneI, 0.9);
  for (let i = 0; i < 4; i++)
    s += line(
      [
        [x + 1.7, y - 6, BH + 21 - i * 3],
        [x + 1.7, y + 6 - (i % 2) * 4, BH + 21 - i * 3],
      ],
      0.5,
    );
  const lock = padlock({ x: x + 3.2, y, z: BH + 2, size: 0.75, facing: '+x' });
  s += byDepth(lock.items);
  const b = [
    [x - 1, y - 8, BH],
    [x + 5, y + 8, BH + 24],
  ];
  return {
    shadow: castShadow(boxCorners(x - 1, y - 1, BH, x + 1.6, y + 1, BH + 24), BH) + lock.shadow,
    part: { box: b, svg: `<g data-prop="lock">${s}</g>` },
  };
}

/** Crate variants, picked by the package's name so a crate keeps its look: plain slats, steel bands strapped round
 * it, or a stencilled "this way up" mark (two arrows, a mark, never words). */
const variantOf = (name: string) => [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
function dress(x: number, y: number, z0: number, v: number) {
  const x0 = x - HALF,
    x1 = x + HALF,
    y0 = y - HALF,
    y1 = y + HALF,
    zt = z0 + HT;
  let s = '';
  if (v === 1)
    // two steel straps over the lid and down both x ends
    for (const by of [y - 5.5, y + 5.5]) {
      const u0 = by - 0.8,
        u1 = by + 0.8;
      s += shape(
        on(PZ(zt + 0.05), [
          [x0 - 0.5, u0],
          [x1 + 0.5, u0],
          [x1 + 0.5, u1],
          [x0 - 0.5, u1],
        ]),
        METAL.l,
        0.6,
      );
      for (const [X, n] of [
        [x1 + 0.55, 1],
        [x0 - 0.55, -1],
      ])
        if (vis([n, 0, 0]))
          s += shape(
            on(PX(X), [
              [u0, z0 + 0.4],
              [u1, z0 + 0.4],
              [u1, zt],
              [u0, zt],
            ]),
            METAL.m,
            0.6,
          );
    }
  else if (v === 2) {
    // the stencil on whichever y side faces the viewer: two up arrows
    const n = vis([0, 1, 0]) ? 1 : -1,
      Y = n > 0 ? y1 + 0.3 : y0 - 0.3,
      zc = z0 + 3.4;
    for (const ax of [x - 3.6, x + 3.6])
      s += shape(
        on(PY(Y), [
          [ax - 0.9, zc],
          [ax + 0.9, zc],
          [ax + 0.9, zc + 5],
          [ax + 2.8, zc + 5],
          [ax, zc + 9.4],
          [ax - 2.8, zc + 5],
          [ax - 0.9, zc + 5],
        ]),
        DARK.d,
        0,
      );
    s += shape(
      on(PY(Y), [
        [x - 6.6, zc - 2],
        [x + 6.6, zc - 2],
        [x + 6.6, zc - 1],
        [x - 6.6, zc - 1],
      ]),
      DARK.d,
      0,
    );
  }
  return s;
}

/** a painted bar along pts: an ink stroke under a coloured one (a rod's look at a sliver of its SVG) */
const bar = (pts: number[][], w: number, col: string) => {
  const d = pd(pts, false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 1.3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
/** The crane that pulls a crate: a pillar jib crane in the empty front corner, its jib reaching back over the pulled
 * pile, the hook holding the crate the reader pulled (empty and higher when nothing is pulled). Real-object notes: a
 * concrete foot; a lattice mast (four mustard corner posts, cross braces on the faces toward the viewer); a control box
 * on the mast where the operator stands; a jib of three chords with a zigzag web, held by a tie rod from the mast top;
 * a trolley at the jib's end, a steel cable down to a hook block and a hook, slings from the hook to the crate's lid. */
const MAST: [number, number] = [158, 172],
  JIB = BH + 58;
function crane(load: boolean) {
  const [mx, my] = MAST,
    w = 3,
    top = JIB + 9,
    hx = PULLED_AT[0],
    hy = MAST[1],
    hookZ = load ? BH + 17 : BH + 22;
  const items: { box: number[][]; svg: string }[] = [];
  let m = box(mx - 4.5, my - 4.5, BH, mx + 4.5, my + 4.5, BH + 3, CERAMIC, toneI, 1);
  for (const [cx, cy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    m += bar(
      [
        [mx + cx * w, my + cy * w, BH + 3],
        [mx + cx * w, my + cy * w, top],
      ],
      1.6,
      PALS.mustard.m,
    );
  // the braces zigzag up the two faces toward the viewer
  for (const [n, f] of [
    [[1, 0, 0], (t: number, z: number) => [mx + w, my - w + 2 * w * t, z]],
    [[0, 1, 0], (t: number, z: number) => [mx - w + 2 * w * t, my + w, z]],
  ] as [number[], (t: number, z: number) => number[]][])
    if (vis(n))
      for (let z = BH + 3, k = 0; z < top - 4; z += 6, k++) m += line([f(k % 2, z), f((k + 1) % 2, z + 6)], 0.7);
  // the control box at hand height, on the mast's side toward the operator
  m += box(mx + w, my - 5.5, BH + 14, mx + w + 2, my - 2, BH + 19, PALS.tomato, toneI, 0.8);
  m += rod([mx, my, top], [mx, my, top + 2], 1.2, DARK, toneI, 0.8, 0.6, 8);
  // the counter-jib behind the mast, a concrete counterweight hung at its end
  m += bar(
    [
      [mx, my, JIB + 1.5],
      [mx + 13, my, JIB + 1.5],
    ],
    2.2,
    PALS.mustard.m,
  );
  m += line(
    [
      [mx, my, top + 2],
      [mx + 12, my, JIB + 2.5],
    ],
    0.9,
  );
  m += box(mx + 8, my - 2.6, JIB - 5, mx + 13, my + 2.6, JIB + 0.6, CERAMIC, toneI, 1);
  items.push({
    box: [
      [mx - 4.5, my - 5.6, BH],
      [mx + 13.2, my + 4.5, top + 2],
    ],
    svg: m,
  });
  // the jib in two sections back along -x (so the pulled pile beneath sorts against the right stretch)
  const N = 2,
    end = hx - 4,
    L = mx - end,
    tz = (x: number) => top + 2 - ((top + 2 - JIB - 3) * (mx - x)) / L;
  for (let i = 0; i < N; i++) {
    const a = mx - (L * i) / N,
      b = mx - (L * (i + 1)) / N;
    let j =
      bar(
        [
          [a, my - 1.6, JIB],
          [b, my - 1.6, JIB],
        ],
        1.5,
        PALS.mustard.m,
      ) +
      bar(
        [
          [a, my, JIB + 3],
          [b, my, JIB + 3],
        ],
        1.5,
        PALS.mustard.l,
      );
    j += line(
      [
        [a, my + 1.6, JIB],
        [(a + b) / 2, my, JIB + 3],
        [b, my + 1.6, JIB],
      ],
      0.6,
    );
    j += bar(
      [
        [a, my + 1.6, JIB],
        [b, my + 1.6, JIB],
      ],
      1.1,
      PALS.mustard.l,
    );
    // the tie rod falls from the mast top to the jib's tip
    j += line(
      [
        [a, my, tz(a)],
        [b, my, tz(b)],
      ],
      0.9,
    );
    items.push({
      box: [
        [b, my - 2.2, JIB - 0.6],
        [a, my + 2.2, i === 0 ? top + 2 : JIB + 3.6],
      ],
      svg: j,
    });
  }
  // trolley, cable, hook block and hook, slings to the crate's lid
  let h = box(hx - 2, hy - 2.5, JIB - 2.5, hx + 2, hy + 2.5, JIB - 0.6, DARK, toneI, 0.7);
  h += line(
    [
      [hx, hy, JIB - 2.5],
      [hx, hy, hookZ + 7],
    ],
    0.8,
  );
  h += box(hx - 2.2, hy - 2.2, hookZ + 3, hx + 2.2, hy + 2.2, hookZ + 7.5, PALS.mustard, toneI, 0.9);
  h += bar(
    [
      [hx, hy, hookZ + 3],
      [hx, hy, hookZ + 0.6],
      [hx + 0.9, hy, hookZ - 0.4],
      [hx + 2, hy, hookZ + 0.4],
      [hx + 2.1, hy, hookZ + 1.4],
    ],
    0.9,
    METAL.l,
  );
  if (load)
    for (const [dx, dy] of [
      [-6, -6],
      [6, -6],
      [-6, 6],
      [6, 6],
    ])
      h += line(
        [
          [hx + 0.9, hy, hookZ - 0.2],
          [PULLED_AT[0] + dx, PULLED_AT[1] + dy, BH + 10],
        ],
        0.6,
      );
  items.push({
    box: [
      [hx - 2.1, hy - 2.6, load ? BH + 10.2 : hookZ - 0.5],
      [hx + 2.2, hy + 2.6, JIB - 0.6],
    ],
    svg: `<g class="tw-hook">${h}</g>`,
  });
  const operator = person({ x: 170, y: 160, facing: 140, pose: 'reach', look: OPERATOR });
  return {
    shadow: castShadow(boxCorners(mx - 4.5, my - 4.5, BH, mx + 4.5, my + 4.5, top), BH) + operator.shadow,
    items: [...items, ...operator.items],
  };
}
/** The crane operator: a hard hat and a hi-vis vest over a grey shirt (not the sandbox operator's orange). */
const OPERATOR = {
  skin: '#c18456',
  top: '#d8e05a',
  legs: '#4a4642',
  hair: '#2b231c',
  cut: 'short' as const,
  hat: 'hard' as const,
  hatCol: '#f4f1e8',
};

/** The scene: shadows, the crates bottom row first, back to front, then the pills. */
export const towerScene = (o: TowerOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    st = towerState(o),
    by = new Map(o.crates.map(c => [c.path, c])),
    fell = new Set(o.fell ?? []);
  const cr = crane(!!o.pulled?.length),
    lock = o.lock ? lockfile() : undefined;
  let s = cr.shadow + (lock?.shadow ?? '');
  for (const p of st.shown) {
    const [x, y, z] = st.pos[p];
    if (z === BH) s += castShadow(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, BH + HT), BH, ctx.top);
  }
  (o.pulled ?? []).forEach((_, i) => {
    const x = PULLED_AT[0] - i * 6,
      y = PULLED_AT[1] + i * 6;
    s += castShadow(boxCorners(x - 8, y - 8, BH, x + 8, y + 8, BH + 10), BH, ctx.top);
  });
  const parts: { at?: number[]; box?: number[][]; svg: string }[] = [...cr.items];
  for (const p of st.shown) {
    const c = by.get(p)!,
      [x, y, z] = st.pos[p];
    const pal = c.hijacked ? DARK : c.broken ? PALS.tomato : p === '' ? PALS.cobalt : undefined;
    const body =
      crate(x, y, undefined, z, HALF, HT, pal) +
      (p === '' ? '' : dress(x, y, z, variantOf(c.name))) +
      (c.broken ? planks(x, y, z) : '');
    parts.push({
      box: [
        [x - HALF - 0.6, y - HALF - 0.6, z],
        [x + HALF + 0.6, y + HALF + 0.6, z + HT],
      ],
      svg: `<g class="tw-crate" data-crate="${esc(p || 'app')}"${c.broken ? ' data-broken="1"' : ''}${c.hijacked ? ' data-hijacked="1"' : ''}${c.lit ? ' data-lit="1"' : ''}${fell.has(p) ? ' data-fell="1"' : ''}>${body}</g>`,
    });
  }
  (o.pulled ?? []).forEach((c, i) => {
    const x = PULLED_AT[0] - i * 6,
      y = PULLED_AT[1] + i * 6;
    parts.push({
      box: [
        [x - 8.5, y - 8.5, BH],
        [x + 8.5, y + 8.5, BH + 10],
      ],
      svg: `<g class="tw-pulled" data-pulled="${esc(c.path)}">${crate(x, y, 'ghost', BH, 8, 10)}</g>`,
    });
  });
  if (lock) parts.push(lock.part);
  s += byDepth(parts);

  let pills = '';
  if (st.hidden) {
    const low = st.shown.filter(p => st.level[p] === 0).at(-1);
    const at = low ? st.pos[low] : [CX, CY, BH];
    pills += pill([at[0] + HALF, at[1] - HALF, BH], 14, 8, `+${st.hidden} DEEPER`, false, scale, DARK_PILL);
  }
  // pills sit on each crate's front edge, staggered within a row so neighbours never share a line
  const rowIndex: Record<string, number> = {};
  const rows: Record<number, string[]> = {};
  for (const p of st.shown) (rows[st.level[p]] ??= []).push(p);
  for (const ps of Object.values(rows))
    [...ps].sort((a, b) => st.slot[a] - st.slot[b]).forEach((p, i) => (rowIndex[p] = i));
  for (const p of st.shown) {
    const c = by.get(p)!,
      [x, y, z] = st.pos[p];
    // broken shows as tomato and crossed planks, so its pill stays short; a hijacked crate says so
    const text = narrow ? c.name : p === '' ? c.name : `${c.name} ${c.version}${c.hijacked ? ' · HIJACKED' : ''}`;
    // a nested copy's pill is mint; the tree tab and the label say "nested" in words
    const fill = c.hijacked ? DARK_PILL : c.broken ? TOMATO_PILL : p.includes('/') ? NESTED_PILL : undefined;
    // ground crates wear theirs in front, on the ground; a crate standing on others on its front edge, neighbours
    // staggered; the app's on its lid
    pills +=
      p === ''
        ? pill([x, y, z + HT], 0, -4, text, !!c.lit, scale, fill)
        : st.level[p] === 0
          ? pill([x + HALF, y + HALF, BH], 0, rowIndex[p] % 2 ? 28 : 10, text, !!c.lit, scale, fill)
          : pill([x + HALF, y + HALF, z + HT * 0.5], 0, rowIndex[p] % 2 ? 6 : -6, text, !!c.lit, scale, fill);
  }
  (o.pulled ?? []).forEach((c, i) => {
    pills += pill(
      [PULLED_AT[0] - i * 6, PULLED_AT[1] + i * 6, BH + 10],
      12,
      14,
      narrow ? 'PULLED' : `PULLED · ${c.name}`,
      false,
      scale,
      GHOST_FILL,
    );
  });
  // under the post, clear of the front row's staggered pills
  if (o.lock) pills += pill([LOCK_AT[0], LOCK_AT[1], BH], 0, 16, 'LOCKFILE', false, scale);
  // callouts: a row above the pill they point at
  const first = (f: (c: TowerCrate) => boolean) => st.shown.find(p => f(by.get(p)!));
  const top = (p?: string) => (p === undefined ? undefined : [st.pos[p][0], st.pos[p][1], st.pos[p][2] + HT]);
  const anchors: [string, number[] | undefined][] = [
    ['app', top('')],
    ['lit', top(first(c => !!c.lit))],
    ['nested', top(first(c => c.path.includes('/')))],
    ['broken', top(first(c => !!c.broken && c.path !== '') ?? first(c => !!c.broken))],
    ['hijacked', top(first(c => !!c.hijacked))],
    ['pulled', o.pulled?.length ? [PULLED_AT[0], PULLED_AT[1], BH + 10] : undefined],
    ['lock', o.lock ? [LOCK_AT[0], LOCK_AT[1], BH + 24] : undefined],
  ];
  for (const [part, p] of anchors) {
    if (!p) continue;
    if (part !== 'lock' && part !== 'pulled') s += `<g data-prop="${part}"></g>`;
    pills += sayAt(o.say, part, p, -6, scale);
  }
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function towerLabel(o: TowerOpts): string {
  const st = towerState(o),
    by = new Map(o.crates.map(c => [c.path, c]));
  const pkgs = st.shown.filter(p => p !== '').map(p => by.get(p)!);
  const broken = pkgs.filter(c => c.broken).map(c => c.name),
    hijacked = pkgs.filter(c => c.hijacked).map(c => `${c.name} ${c.version}`);
  return (
    `A tower of ${count(o.crates.length - 1, 'package')} under ${APP.name}` +
    `${st.hidden ? `, ${st.hidden} deeper out of view` : ''}: ` +
    pkgs.map(c => `${c.name} ${c.version}${c.path.includes('/') ? ' (nested)' : ''}`).join(', ') +
    '.' +
    (by.get('')?.broken ? ` ${APP.name} is broken.` : '') +
    (broken.length ? ` Broken: ${broken.join(', ')}.` : '') +
    (hijacked.length ? ` Hijacked: ${hijacked.join(', ')}.` : '') +
    (o.pulled?.length ? ` Pulled out: ${o.pulled.map(c => c.name).join(', ')}.` : '') +
    (o.lock ? ' The lockfile is in use.' : '')
  );
}

/** What the caption carries (phones show only the names in the pills). */
export function towerReadouts(o: TowerOpts): string[] {
  const pkgs = o.crates.filter(c => c.path !== '');
  const broken = o.crates.filter(c => c.broken).length,
    hijacked = pkgs.filter(c => c.hijacked).length;
  return [
    count(pkgs.length, 'package'),
    ...(broken ? [`${broken} broken`] : []),
    ...(hijacked ? [`${hijacked} hijacked`] : []),
    ...(o.lock ? ['lockfile on'] : []),
  ];
}

/** The home hero's plot: a small tower of five crates, the top one tomato and planked, one pulled out beside it. */
export function towerPlot(x: number, y: number, top: SceneCtx['top']): string {
  const h = 5,
    ht = 7;
  const at: [number, number, number][] = [
    [x - 6, y + 6, BH],
    [x + 6, y - 6, BH],
    [x + 18, y - 18, BH],
    [x, y, BH + ht],
    [x + 12, y - 12, BH + ht],
    [x + 6, y - 6, BH + 2 * ht],
  ];
  let s = at
    .filter(p => p[2] === BH)
    .map(([cx, cy]) => castShadow(boxCorners(cx - h, cy - h, BH, cx + h, cy + h, BH + ht), BH, top))
    .join('');
  s += castShadow(boxCorners(x + 10, y + 10, BH, x + 18, y + 18, BH + 5), BH, top);
  const parts = at.map(([cx, cy, z], i) => ({
    at: [cx, cy, z],
    svg:
      crate(cx, cy, undefined, z, h, ht, i === at.length - 1 ? PALS.tomato : undefined) +
      (i === at.length - 1
        ? line(
            [
              [cx + h + 0.3, cy - h + 1, z + 1],
              [cx + h + 0.3, cy + h - 1, z + ht - 1.5],
            ],
            1,
          )
        : ''),
  }));
  parts.push({ at: [x + 14, y + 14, BH], svg: crate(x + 14, y + 14, 'ghost', BH, 4, 5) });
  return s + byDepth(parts);
}
