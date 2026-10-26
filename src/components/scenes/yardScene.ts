// The Load balancing module's picture: the switchyard (KTD15). Requests ride in as carts on one track from the front left
// to the switch house (the balancer), whose points send each cart down a spur to one of the server sheds standing in a
// row on the right (at most six). The spur the switch points down is lit. Carts waiting at a shed sit on its spur (four
// at most drawn; the pill carries the count). Each shed has a roof by its state (wood fine, mustard slow, dark dead) and a
// health lamp on top (mint when it answers the check, tomato when it misses); a pulled shed has a barrier across its
// spur. Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  METAL,
  CERAMIC,
  WOOD,
  DARK,
  box,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
  line,
  cyl,
} from '../../lib/iso/core.js';
import { ASSUMPTIONS, SERVERS, stateOf, waitingAt, type Result, type ServerState } from '../../lib/load-balancing/sim';
import type { Say } from '../story/steps';

export const MAX_SHEDS = 6;
/** The parts a step's callout may name: the switch house and each shed. */
export const YARD_PARTS = ['switch', ...SERVERS.map(s => s.id)] as const;

export interface ShedView {
  id: string;
  name: string;
  state: ServerState;
  /** requests sent here and not yet answered or given up on */
  waiting: number;
  /** requests answered here so far */
  served: number;
  /** pulled from rotation by the health checks */
  pulled: boolean;
}
export interface YardOpts {
  sheds: ShedView[];
  /** the shed the switch points to now, if any */
  target: number | null;
  /** the rule's name for the switch house's pill */
  rule: string;
  say?: Say;
  scale?: number;
}

/** The yard as of time t (ms) of a run: a server shows its trouble only from the trouble time. */
export function yardAt(r: Result, t: number, rule: string): Omit<YardOpts, 'say' | 'scale'> {
  const p = r.policy,
    last = r.served.filter(s => s.t <= t).at(-1);
  return {
    sheds: SERVERS.slice(0, p.servers).map((s, i) => ({
      id: s.id,
      name: s.name,
      state: t >= ASSUMPTIONS.troubleAtMs ? stateOf(p, i) : 'fine',
      waiting: waitingAt(r, i, t),
      served: r.jobs.filter(j => j.server === i && j.ok && j.endAt <= t).length,
      pulled: t >= r.pulledAt[i],
    })),
    target: last ? last.server : null,
    rule,
  };
}
/** An idle yard over the first n servers, each in its given state. */
export const idleYard = (n: number, rule: string, states: Partial<Record<string, ServerState>> = {}) => ({
  sheds: SERVERS.slice(0, n).map(s => ({
    id: s.id,
    name: s.name,
    state: states[s.id] ?? 'fine',
    waiting: 0,
    served: 0,
    pulled: false,
  })),
  target: null,
  rule,
});

/** A shed's health lamp: dead and slow servers miss the check; slow-but-answering ones pass it. */
export const passesCheck = (s: ShedView) => s.state !== 'dead' && s.state !== 'slow';

/** What the yard shows. Pure, so the tests can check it without drawing. */
export function yardState(o: YardOpts) {
  const sheds = o.sheds.slice(0, MAX_SHEDS);
  return {
    sheds: sheds.length,
    carts: sheds.map(s => Math.min(4, s.waiting)),
    lamps: sheds.map(s => (passesCheck(s) ? 'pass' : 'miss')),
    barriers: sheds.filter(s => s.pulled).map(s => s.id),
  };
}

// Screen across is x − y and screen down is x + y: the switch house stands on the left, the sheds in a column on the
// right, one under another on screen.
const SWITCH = { x: 80, y: 130, h: 9, top: BH + 18 };
const SHED = { across: 100, down: 210, hx: 12 };
/** each shed's centre: a column at the same distance across, spread evenly down the screen */
const shedAt = (i: number, n: number) => {
  const gap = Math.min(64, 300 / n),
    d = SHED.down + (i - (n - 1) / 2) * gap;
  return [(d + SHED.across) / 2, (d - SHED.across) / 2];
};
const shedHalfY = (n: number) => Math.min(12, (300 / n) * 0.18);
/** the yard's board: room for the entry track, the switch house and this many sheds */
const boardFor = (n: number): Board => {
  const ends = [shedAt(0, n), shedAt(n - 1, n)];
  return [24, Math.min(...ends.map(p => p[1])) - 22, Math.max(...ends.map(p => p[0])) + 22, 196];
};
const ROOF: Record<ServerState, { l: string; m: string; d: string }> = {
  fine: WOOD,
  slow: PALS.mustard,
  gray: PALS.mustard,
  dead: DARK,
};
const LIT = '#ffb627';
export const YARD_BOARD: Board = boardFor(Math.min(MAX_SHEDS, SERVERS.length));

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;

/** Two rails over sleepers from a to b, lit when the switch points down them. */
function track(a: number[], b: number[], lit: boolean) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy),
    u = [dx / L, dy / L],
    n = [-u[1], u[0]],
    z = BH + 0.3,
    g = 2.6;
  let s = '';
  for (let k = 3; k < L - 1; k += 6) {
    const c = [a[0] + u[0] * k, a[1] + u[1] * k];
    s += line(
      [
        [c[0] + n[0] * (g + 1.6), c[1] + n[1] * (g + 1.6), z],
        [c[0] - n[0] * (g + 1.6), c[1] - n[1] * (g + 1.6), z],
      ],
      1.6,
    ).replace(/stroke="[^"]+"/, `stroke="${WOOD.d}"`);
  }
  for (const side of [1, -1])
    s += line(
      [
        [a[0] + n[0] * g * side, a[1] + n[1] * g * side, z + 0.4],
        [b[0] + n[0] * g * side, b[1] + n[1] * g * side, z + 0.4],
      ],
      lit ? 1.5 : 1.1,
    ).replace(/stroke="[^"]+"/, `stroke="${lit ? LIT : METAL.d}"`);
  return s;
}

/** A small cart at (x, y). */
const cart = (x: number, y: number) => ({
  at: [x, y, 1],
  svg: `<g class="cart">${box(x - 3, y - 2.6, BH + 0.8, x + 3, y + 2.6, BH + 4.8, PALS.cobalt, toneI, 0.8)}</g>`,
});

function switchHouse() {
  const { x, y, h, top } = SWITCH;
  let s = box(x - h, y - h, BH, x + h, y + h, top, CERAMIC, toneI, 1);
  s += box(x - h - 1, y - h - 1, top, x + h + 1, y + h + 1, top + 3, PALS.tomato, toneI, 0.9);
  // the lever on the front
  s += line(
    [
      [x + h + 1, y, BH + 4],
      [x + h + 6, y - 3, BH + 12],
    ],
    1.4,
  );
  s += cyl(x + h + 6, y - 3, BH + 11, BH + 13, 1.4, PALS.mustard, toneI, 0.8, 10);
  return {
    at: [x, y, 0],
    svg: `<g data-prop="switch">${s}${hullInk(boxCorners(x - h - 1, y - h - 1, BH, x + h + 1, y + h + 1, top + 3), 2.2)}</g>`,
  };
}

function shed(v: ShedView, i: number, n: number) {
  const [x, y] = shedAt(i, n),
    hy = shedHalfY(n),
    hx = SHED.hx,
    wall = BH + 13,
    dead = v.state === 'dead';
  let s = box(x - hx, y - hy, BH, x + hx, y + hy, wall, dead ? DARK : CERAMIC, toneI, 1);
  s += box(x - hx - 1, y - hy - 1, wall, x + hx + 1, y + hy + 1, wall + 3, ROOF[v.state], toneI, 0.9);
  // the door on the track side
  s += box(x - hx * 0.45, y + hy, BH, x + hx * 0.45, y + hy + 0.4, BH + 9, dead ? DARK : WOOD, toneI, 0.7);
  s += hullInk(boxCorners(x - hx - 1, y - hy - 1, BH, x + hx + 1, y + hy + 1, wall + 3), 2);
  const pass = passesCheck(v);
  s += `<g class="lamp" data-check="${pass ? 'pass' : 'miss'}">${cyl(x, y, wall + 3, wall + 7, 2, pass ? PALS.mint : PALS.tomato, toneI, 0.8, 12)}</g>`;
  return {
    at: [x, y, 0],
    svg: `<g data-prop="${esc(v.id)}" data-state="${v.state}" data-waiting="${v.waiting}" data-pulled="${v.pulled ? 1 : 0}">${s}</g>`,
  };
}

/** The yard: shadows and tracks (floor), then the switch house, sheds, carts and barriers back to front, then pills. */
export const yardScene = (o: YardOpts) => (ctx: SceneCtx) => {
  const sheds = o.sheds.slice(0, MAX_SHEDS),
    n = sheds.length,
    scale = o.scale ?? 1,
    narrow = scale > 1.5,
    hy = shedHalfY(n),
    from = [SWITCH.x + SWITCH.h + 2, SWITCH.y - SWITCH.h - 2];
  let s = castShadow(
    boxCorners(SWITCH.x - SWITCH.h, SWITCH.y - SWITCH.h, BH, SWITCH.x + SWITCH.h, SWITCH.y + SWITCH.h, SWITCH.top),
    BH,
    ctx.top,
  );
  s += track([30, 180], [SWITCH.x - SWITCH.h - 2, SWITCH.y + SWITCH.h + 2], o.target !== null);
  const parts = [switchHouse()];
  sheds.forEach((v, i) => {
    const [x, y] = shedAt(i, n),
      to = [x, y + hy + 2];
    s += castShadow(boxCorners(x - SHED.hx, y - hy, BH, x + SHED.hx, y + hy, BH + 16), BH, ctx.top);
    s += `<g data-prop="spur" data-shed="${esc(v.id)}">${track(from, to, o.target === i)}</g>`;
    parts.push(shed(v, i, n));
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]),
      u = [(to[0] - from[0]) / L, (to[1] - from[1]) / L];
    for (let k = 0; k < Math.min(4, v.waiting); k++)
      parts.push(cart(to[0] - u[0] * (5 + k * 8), to[1] - u[1] * (5 + k * 8)));
    if (v.pulled) {
      // a bar across the spur on two posts
      const b = [from[0] + u[0] * 14, from[1] + u[1] * 14],
        nn = [-u[1], u[0]],
        end = (k: number) => [b[0] + nn[0] * 5 * k, b[1] + nn[1] * 5 * k];
      const post = (k: number) =>
        box(end(k)[0] - 0.8, end(k)[1] - 0.8, BH, end(k)[0] + 0.8, end(k)[1] + 0.8, BH + 6, METAL, toneI, 0.7);
      const bar = line(
        [
          [...end(-1.2), BH + 6],
          [...end(1.2), BH + 6],
        ],
        2.6,
      ).replace(/stroke="[^"]+"/, `stroke="${PALS.tomato.m}"`);
      parts.push({ at: [b[0], b[1], 2], svg: `<g class="barrier">${post(-1)}${post(1)}${bar}</g>` });
    }
  });
  if (o.target === null) parts.push(cart(46, 164));
  s += `<g data-prop="yard" data-target="${o.target ?? ''}">${byDepth(parts)}</g>`;
  let pills = pill(
    [SWITCH.x, SWITCH.y, SWITCH.top + 3],
    -8,
    -20,
    narrow ? 'BALANCER' : `BALANCER · ${o.rule.toUpperCase()}`,
    o.target !== null,
    scale,
  );
  sheds.forEach((v, i) => {
    const [x, y] = shedAt(i, n),
      name = v.name.toUpperCase(),
      extra = v.pulled ? ' · PULLED' : v.state === 'dead' ? ' · DOWN' : ` · ${v.waiting} WAITING`;
    pills += pill([x + SHED.hx, y, BH + 16], 16, 0, narrow ? name : name + extra, v.waiting > 0 && !v.pulled, scale);
  });
  pills += sayAt(o.say, 'switch', [SWITCH.x, SWITCH.y, SWITCH.top + 3], -20, scale);
  sheds.forEach((v, i) => {
    pills += sayAt(o.say, v.id, [...shedAt(i, n), BH + 20], -16, scale);
  });
  return s + pills;
};

const STATE_WORDS: Record<ServerState, string> = {
  fine: 'fine',
  slow: 'slow',
  dead: 'dead',
  gray: 'slow but answering its health check',
};
/** The yard in words, for its aria-label. */
export function yardLabel(o: YardOpts): string {
  const sheds = o.sheds.slice(0, MAX_SHEDS);
  return (
    `The switchyard: requests ride in as carts to the balancer (${o.rule}), which sends each down a track to one of ${sheds.length} server sheds. ` +
    sheds
      .map(
        (s, i) =>
          `${s.name}: ${STATE_WORDS[s.state]}, ${s.waiting} waiting, ${s.served} answered${s.pulled ? ', pulled from rotation' : ''}${o.target === i ? ', the switch points here' : ''}`,
      )
      .join('. ') +
    '.'
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export const yardReadouts = (o: YardOpts) => o.sheds.slice(0, MAX_SHEDS).map(s => `${s.name} ${s.waiting} waiting`);

/** The home hero's plot: a small switch house sending one lit track to the nearer of two sheds, a cart on it. */
export function yardPlot(x: number, y: number, top: SceneCtx['top']): string {
  const sx = x - 14,
    sy = y,
    h = 5;
  let sw = box(sx - h, sy - h, BH, sx + h, sy + h, BH + 10, CERAMIC, toneI, 1);
  sw += box(sx - h - 0.6, sy - h - 0.6, BH + 10, sx + h + 0.6, sy + h + 0.6, BH + 12, PALS.tomato, toneI, 0.8);
  sw += hullInk(boxCorners(sx - h - 0.6, sy - h - 0.6, BH, sx + h + 0.6, sy + h + 0.6, BH + 12), 1.6);
  const shedP = (cx: number, cy: number) => {
    let s = box(cx - 6, cy - 5, BH, cx + 6, cy + 5, BH + 8, CERAMIC, toneI, 1);
    s += box(cx - 6.6, cy - 5.6, BH + 8, cx + 6.6, cy + 5.6, BH + 10, WOOD, toneI, 0.8);
    s += cyl(cx, cy, BH + 10, BH + 12.5, 1.3, PALS.mint, toneI, 0.6, 10);
    return { at: [cx, cy, 0], svg: s + hullInk(boxCorners(cx - 6.6, cy - 5.6, BH, cx + 6.6, cy + 5.6, BH + 10), 1.5) };
  };
  const a = [x + 14, y - 9],
    b = [x + 14, y + 9];
  return (
    castShadow(boxCorners(sx - h, sy - h, BH, sx + h, sy + h, BH + 12), BH, top) +
    track([sx + h + 1, sy], [a[0] - 7, a[1]], false) +
    track([sx + h + 1, sy], [b[0] - 7, b[1]], true) +
    byDepth([{ at: [sx, sy, 0], svg: sw }, shedP(a[0], a[1]), shedP(b[0], b[1]), cart(x, y + 4.5)])
  );
}
