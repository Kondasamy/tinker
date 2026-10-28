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
import { CERAMIC, DARK, PALS, WOOD, box, byDepth, castShadow, cyl, line, tag, toneI } from '../../lib/iso/core.js';
import { APP, auditOf, brokenOf, type Tree } from '../../lib/dependencies/resolve';
import type { Say } from '../story/steps';
import { crate } from './crateScene';

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

/** The lockfile: a sheet of lines on a post, a padlock hanging from it. */
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
  s += cyl(x + 3, y, BH + 2, BH + 7, 2.6, PALS.mustard, toneI, 0.9, 14);
  return { at: [x, y, 0], svg: `<g data-prop="lock">${s}</g>` };
}

/** The scene: shadows, the crates bottom row first, back to front, then the pills. */
export const towerScene = (o: TowerOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    st = towerState(o),
    by = new Map(o.crates.map(c => [c.path, c])),
    fell = new Set(o.fell ?? []);
  let s = '';
  for (const p of st.shown) {
    const [x, y, z] = st.pos[p];
    if (z === BH) s += castShadow(boxCorners(x - HALF, y - HALF, BH, x + HALF, y + HALF, BH + HT), BH, ctx.top);
  }
  const parts: { at: number[]; svg: string }[] = [];
  for (const p of st.shown) {
    const c = by.get(p)!,
      [x, y, z] = st.pos[p];
    const pal = c.hijacked ? DARK : c.broken ? PALS.tomato : p === '' ? PALS.cobalt : undefined;
    const body = crate(x, y, undefined, z, HALF, HT, pal) + (c.broken ? planks(x, y, z) : '');
    parts.push({
      at: [x, y, z],
      svg: `<g class="tw-crate" data-crate="${esc(p || 'app')}"${c.broken ? ' data-broken="1"' : ''}${c.hijacked ? ' data-hijacked="1"' : ''}${c.lit ? ' data-lit="1"' : ''}${fell.has(p) ? ' data-fell="1"' : ''}>${body}</g>`,
    });
  }
  (o.pulled ?? []).forEach((c, i) => {
    const x = PULLED_AT[0] - i * 6,
      y = PULLED_AT[1] + i * 6;
    parts.push({
      at: [x, y, 0],
      svg: `<g class="tw-pulled" data-pulled="${esc(c.path)}">${castShadow(boxCorners(x - 8, y - 8, BH, x + 8, y + 8, BH + 10), BH, ctx.top)}${crate(x, y, 'ghost', BH, 8, 10)}</g>`,
    });
  });
  if (o.lock) parts.push(lockfile());
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

const count = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
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
