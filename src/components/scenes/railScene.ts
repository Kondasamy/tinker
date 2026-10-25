// The Queues module's picture: the ticket rail (KTD15). Larkspur's till stands at the back left; each order it takes
// hangs a paper ticket on the order rail behind the packing benches (at most 12 drawn, a count pill for the rest). A
// ticket that was tried before is mustard; one whose lease is held by a worker who fell over hangs greyed, hidden from
// the others, until the lease runs out and it slides back into line. In front stand the benches, one per worker: idle,
// busy with a ticket and a parcel (tomato flag: this try fails), or knocked over, lying beside the bench. Tickets
// waiting out a retry hang on a short hook by the till. On the right, the dead-letter shelf holds the jobs that used up
// their tries, and the courier's booth takes the parcels (a tomato lamp while its site is down; a tomato parcel for an
// order booked twice). With the work done inside the request (inline) there is no rail: customers wait in line at the
// till. Words only in pills; on phones (scale > 1.5) pills keep just the names and the caption carries the counts.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  PALS,
  CERAMIC,
  DARK,
  METAL,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  cylX,
  hullInk,
  line,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import {
  CRASH_AT,
  SCENES,
  SHOWN_CRASH,
  WORKER_NAMES,
  plural,
  runOf,
  type Run,
  type WorkerView,
} from '../../lib/queues/sim';
import type { Say } from '../story/steps';

export const RAIL_BOARD: Board = [0, 10, 198, 100];

/** At most this many tickets hang on the rail; a count pill carries the rest (KTD15). */
export const MAX_TICKETS = 12;
export interface RailOpts {
  /** the work is done inside the request: a line at the till, no rail */
  inline?: boolean;
  /** visible tickets, oldest first, with their tries so far */
  waiting: { id: string; tries: number }[];
  /** tickets waiting out a retry */
  delayed: number;
  /** tickets hidden by a fallen worker's lease */
  hidden: number;
  workers: WorkerView[];
  dead: number;
  done: number;
  shipped: number;
  twice: number;
  /** the courier's site is struggling */
  outage: boolean;
  /** workers knocked over this minute (they topple; later minutes show them lying still) */
  fell?: number[];
  /** tickets that slid back onto the rail this minute */
  returned?: string[];
  /** the step's callout, over one of RAIL_PARTS */
  say?: Say;
  /** pill size; phones pass more */
  scale?: number;
}

/** The parts a step's callout may name. */
export const RAIL_PARTS = ['till', 'rail', 'workers', 'shelf', 'courier'] as const;

/** The rail as of minute t of a run. */
export function railAt(r: Run, t: number): Omit<RailOpts, 'say' | 'scale'> {
  const k = r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
  const onBench = new Set(k.workers.filter(w => w.state === 'down' && w.job).map(w => w.job)),
    before = r.ticks[k.t - 1];
  return {
    ...(r.policy.inline ? { inline: true } : {}),
    waiting: k.waiting.map(w => ({ ...w })),
    delayed: k.delayed.length,
    hidden: k.held.filter(id => !onBench.has(id)).length,
    workers: k.workers.map(w => ({ ...w })),
    fell: k.workers.flatMap((w, i) => (w.state === 'down' && before?.workers[i].state !== 'down' ? [i] : [])),
    dead: k.dead.length,
    done: k.done,
    shipped: k.shipped,
    twice: k.twice,
    outage: k.outage,
    returned: [...k.returned],
  };
}
/** Before the sale: nothing on the rail, every worker idle. */
export const idleRail = (workers: number): Omit<RailOpts, 'say' | 'scale'> => ({
  waiting: [],
  delayed: 0,
  hidden: 0,
  workers: Array.from({ length: workers }, () => ({ state: 'idle' as const })),
  dead: 0,
  done: 0,
  shipped: 0,
  twice: 0,
  outage: false,
});

/** What the picture shows. Pure, so the tests can check it without drawing. */
export function railState(o: RailOpts) {
  const shown = Math.min(MAX_TICKETS, o.waiting.length);
  return {
    tickets: shown,
    more: o.waiting.length - shown,
    retried: o.waiting.slice(0, shown).filter(w => w.tries > 0).length,
    hidden: Math.min(3, o.hidden),
    hooked: Math.min(4, o.delayed),
    busy: o.workers.filter(w => w.state === 'busy').length,
    down: o.workers.filter(w => w.state === 'down').length,
    shelf: Math.min(4, o.dead),
    parcels: Math.min(6, o.shipped),
  };
}

const RAIL = { y: 30, x0: 34, x1: 160, z: BH + 36 };
const BENCH_Y = 68,
  BENCH_X = [52, 84, 116, 148];
const TILL = [16, 40];
const SHELF = { x0: 172, x1: 188, y0: 22, y1: 50 };
const COURIER = [176, 82];
const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const OVER = '#f6c2b4';

/** A paper ticket hanging from the rail at x: its face toward the viewer. */
function ticket(x: number, m: { l: string; m: string; d: string }, cls: string, id = '') {
  const z = RAIL.z - 2,
    y = RAIL.y + 1.2;
  return `<g class="${cls}"${id ? ` data-ticket="${esc(id)}"` : ''}>${line(
    [
      [x, RAIL.y, RAIL.z],
      [x, y, z],
    ],
    0.6,
  )}${box(x - 3.8, y, z - 16, x + 3.8, y + 0.8, z, m, toneI, 0.9)}${line(
    [
      [x - 2, y + 0.75, z - 4],
      [x + 2, y + 0.75, z - 4],
    ],
    0.5,
  )}</g>`;
}

/** The order rail: two posts and a bar, the tickets hanging from it. */
function rail(o: RailOpts) {
  const st = railState(o),
    back = new Set(o.returned ?? []);
  let s =
    box(RAIL.x0 - 1.5, RAIL.y - 1.5, BH, RAIL.x0 + 1.5, RAIL.y + 1.5, RAIL.z + 1, METAL, toneI, 1) +
    box(RAIL.x1 - 1.5, RAIL.y - 1.5, BH, RAIL.x1 + 1.5, RAIL.y + 1.5, RAIL.z + 1, METAL, toneI, 1) +
    cylX(RAIL.x0, RAIL.x1, RAIL.y, RAIL.z, 1.2, METAL, toneI, 1, 10);
  const step = (RAIL.x1 - RAIL.x0 - 8) / MAX_TICKETS;
  o.waiting.slice(0, st.tickets).forEach((w, i) => {
    const x = RAIL.x1 - 6 - i * step;
    s += ticket(
      x,
      w.tries > 0 ? PALS.mustard : CERAMIC,
      `ticket${w.tries > 0 ? ' retried' : ''}${back.has(w.id) ? ' returned' : ''}`,
      w.id,
    );
  });
  // hidden tickets: still on the rail, but leased to a worker who fell over
  for (let i = 0; i < st.hidden; i++) s += ticket(RAIL.x0 + 5 + i * step, DARK, 'ticket hidden');
  return {
    at: [(RAIL.x0 + RAIL.x1) / 2, RAIL.y, 0],
    svg: `<g data-prop="rail" data-waiting="${o.waiting.length}" data-shown="${st.tickets}" data-hidden="${o.hidden}">${s}</g>`,
  };
}

/** The till, with the retry hook beside it (or, inline, the customers waiting in front of it). */
function till(o: RailOpts) {
  const [x, y] = TILL,
    st = railState(o);
  let s = box(x - 9, y - 9, BH, x + 9, y + 9, BH + 14, WOOD, toneI, 1);
  s += box(x - 4, y - 3, BH + 14, x + 3, y + 3, BH + 20, PALS.cobalt, toneI, 0.9);
  s += hullInk(boxCorners(x - 9, y - 9, BH, x + 9, y + 9, BH + 20), 2);
  if (!o.inline) {
    // the hook: tickets that wait out a retry hang here, off the rail
    s += box(x + 11, y - 1, BH, x + 13, y + 1, BH + 26, METAL, toneI, 0.8);
    for (let i = 0; i < st.hooked; i++)
      s += `<g class="ticket hooked">${box(x + 13.2, y - 6 + i * 3.4, BH + 10 + i * 2.5, x + 13.9, y - 1 + i * 3.4, BH + 22 + i * 2.5, PALS.mustard, toneI, 0.7)}</g>`;
  }
  return { at: [x, y, 0], svg: `<g data-prop="till" data-delayed="${o.delayed}">${s}</g>` };
}

/** Customers waiting at the till while it does the work (inline): a figure each, at most 12, in a line. */
function line_(o: RailOpts) {
  const n = Math.min(MAX_TICKETS, o.waiting.length);
  return Array.from({ length: n }, (_, i) => {
    const x = TILL[0] - 4 + Math.floor(i / 6) * 8,
      y = TILL[1] + 15 + (i % 6) * 7;
    return {
      at: [x, y, 0],
      svg: `<g class="customer">${cyl(x, y, BH, BH + 9, 2.6, PALS.blush, toneI, 1, 14)}${cyl(x, y, BH + 9, BH + 12.5, 1.9, CERAMIC, toneI, 0.9, 12)}</g>`,
    };
  });
}

/** A worker at their bench: standing behind it, or knocked over beside it. */
function bench(w: WorkerView, i: number, fell = false) {
  const x = BENCH_X[i],
    y = BENCH_Y;
  let s = box(x - 11, y - 6, BH, x + 11, y + 6, BH + 10, WOOD, toneI, 1);
  s += hullInk(boxCorners(x - 11, y - 6, BH, x + 11, y + 6, BH + 10), 1.8);
  let person = '';
  if (w.state === 'down') {
    // lying on the floor in front of the bench
    person = `<g class="fallen">${cylX(x - 9, x + 4, y + 11, BH + 3, 3, PALS.cobalt, toneI, 1, 14)}${cylX(x + 4, x + 8, y + 11, BH + 3, 2.2, CERAMIC, toneI, 0.9, 12)}</g>`;
  } else {
    const py = y - 11;
    person = `<g class="standing">${cyl(x, py, BH, BH + 15, 3.4, PALS.cobalt, toneI, 1.1, 16)}${cyl(x, py, BH + 15, BH + 20, 2.5, CERAMIC, toneI, 1, 14)}</g>`;
  }
  let top = '';
  if (w.job) {
    // the ticket on the bench, and the parcel being packed
    top += box(
      x - 8,
      y - 3,
      BH + 10,
      x - 2,
      y + 3,
      BH + 10.6,
      w.tries && w.tries > 1 ? PALS.mustard : CERAMIC,
      toneI,
      0.6,
    );
    if (w.state === 'busy') top += box(x + 1, y - 4, BH + 10, x + 9, y + 4, BH + 16, WOOD, toneI, 0.9);
    if (w.failing)
      top += `<g class="fail-flag">${line(
        [
          [x + 9, y + 4, BH + 16],
          [x + 9, y + 4, BH + 25],
        ],
        0.9,
      )}${box(x + 9, y + 3.6, BH + 20, x + 15, y + 4.2, BH + 25, PALS.tomato, toneI, 0.8)}</g>`;
  }
  const parts = [
    { at: [x, y - 11, 0], svg: w.state === 'down' ? '' : person },
    { at: [x, y, 0], svg: s + top },
    { at: [x, y + 11, 0], svg: w.state === 'down' ? person : '' },
  ];
  return {
    at: [x, y, 0],
    svg: `<g class="worker" data-worker="${i}" data-state="${w.state}"${fell ? ' data-fell="1"' : ''}${w.job ? ` data-job="${esc(w.job)}"` : ''}${w.stale ? ' data-stale="1"' : ''}>${byDepth(parts)}</g>`,
  };
}

/** The dead-letter shelf: a tomato ticket per job that used up its tries (at most 4 drawn). */
function shelf(o: RailOpts) {
  const { x0, x1, y0, y1 } = SHELF,
    n = railState(o).shelf;
  let s = box(x0, y0, BH, x1, y1, BH + 3, WOOD, toneI, 1);
  s += box(x0, y0, BH + 3, x0 + 2, y1, BH + 30, WOOD, toneI, 0.9);
  s += box(x0, y0, BH + 18, x1, y1, BH + 20, WOOD, toneI, 0.9);
  for (let i = 0; i < n; i++)
    s += `<g class="dead">${box(x0 + 4, y0 + 3 + i * 6.5, BH + 20, x0 + 12, y0 + 8 + i * 6.5, BH + 20.8, PALS.tomato, toneI, 0.7)}</g>`;
  s += hullInk(boxCorners(x0, y0, BH, x1, y1, BH + 30), 1.8);
  return { at: [(x0 + x1) / 2, (y0 + y1) / 2, 0], svg: `<g data-prop="shelf" data-dead="${o.dead}">${s}</g>` };
}

/** The courier's booth and the parcels it took (a tomato one when an order shipped twice). */
function courier(o: RailOpts) {
  const [x, y] = COURIER,
    st = railState(o);
  let s = box(x - 9, y - 8, BH, x + 9, y + 8, BH + 18, METAL, toneI, 1);
  s += box(x - 10, y - 9, BH + 18, x + 10, y + 9, BH + 20, PALS.cobalt, toneI, 0.9);
  s += hullInk(boxCorners(x - 10, y - 9, BH, x + 10, y + 9, BH + 20), 2);
  s += `<g class="lamp${o.outage ? ' down' : ''}">${cyl(x, y, BH + 20, BH + 24, 2.4, o.outage ? PALS.tomato : PALS.mint, toneI, 0.9, 14)}</g>`;
  let parcels = '';
  for (let i = 0; i < st.parcels; i++) {
    const px = x - 22 + (i % 3) * 7,
      pz = BH + Math.floor(i / 3) * 6,
      red = i < Math.min(o.twice, st.parcels);
    parcels += `<g class="parcel${red ? ' twice' : ''}">${box(px - 3, y + 2, pz, px + 3, y + 8, pz + 6, red ? PALS.tomato : WOOD, toneI, 0.8)}</g>`;
  }
  return {
    at: [x, y, 0],
    svg: `<g data-prop="courier" data-outage="${o.outage ? 1 : 0}" data-shipped="${o.shipped}" data-twice="${o.twice}">${parcels}${s}</g>`,
  };
}

/** The scene: shadows, then the parts back to front, then the pills. */
export const railScene = (o: RailOpts) => (ctx: SceneCtx) => {
  const st = railState(o),
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  let s = castShadow(boxCorners(TILL[0] - 9, TILL[1] - 9, BH, TILL[0] + 9, TILL[1] + 9, BH + 20), BH, ctx.top);
  s += castShadow(boxCorners(SHELF.x0, SHELF.y0, BH, SHELF.x1, SHELF.y1, BH + 30), BH, ctx.top);
  s += castShadow(
    boxCorners(COURIER[0] - 10, COURIER[1] - 9, BH, COURIER[0] + 10, COURIER[1] + 9, BH + 20),
    BH,
    ctx.top,
  );
  o.workers.forEach(
    (_, i) =>
      (s += castShadow(
        boxCorners(BENCH_X[i] - 11, BENCH_Y - 6, BH, BENCH_X[i] + 11, BENCH_Y + 6, BH + 10),
        BH,
        ctx.top,
      )),
  );
  const parts = [
    till(o),
    ...(o.inline ? line_(o) : [rail(o)]),
    ...o.workers.slice(0, BENCH_X.length).map((w, i) => bench(w, i, !!o.fell?.includes(i))),
    shelf(o),
    courier(o),
  ];
  s += byDepth(parts);
  const railTop = [RAIL.x1, RAIL.y, RAIL.z + 1],
    lastTicket = [RAIL.x0 + 8, RAIL.y, RAIL.z - 2];
  let pills = pill(
    [TILL[0], TILL[1], BH + 20],
    0,
    -16,
    narrow
      ? 'TILL'
      : o.inline
        ? `TILL · ${o.waiting.length} IN LINE`
        : o.delayed
          ? `TILL · ${o.delayed} TO RETRY`
          : 'TILL',
    false,
    scale,
  );
  if (!o.inline)
    pills += pill(railTop, 0, -18, narrow ? 'QUEUE' : `QUEUE · ${o.waiting.length}`, st.tickets > 0, scale);
  if (!o.inline && st.more > 0) pills += pill(lastTicket, 0, 18, `+${st.more}`, true, scale);
  if (o.inline && st.more > 0) pills += pill([TILL[0], TILL[1] + 58, BH + 12], -10, 10, `+${st.more}`, true, scale);
  o.workers.slice(0, BENCH_X.length).forEach((w, i) => {
    const name = (WORKER_NAMES[i] ?? `W${i + 1}`).toUpperCase(),
      what =
        w.state === 'down'
          ? 'DOWN'
          : w.state === 'busy'
            ? `TRY ${w.tries}${w.failing ? ' · FAILS' : ''}`
            : o.inline
              ? 'FREE'
              : 'IDLE';
    pills += pill(
      [BENCH_X[i], BENCH_Y + 6, BH],
      0,
      i % 2 ? 30 : 20,
      narrow ? name : `${name} · ${what}`,
      w.state === 'busy',
      scale,
      w.state === 'down' ? OVER : undefined,
    );
  });
  pills += pill(
    [SHELF.x1, (SHELF.y0 + SHELF.y1) / 2, BH + 30],
    narrow ? 0 : 6,
    -14,
    narrow ? 'SHELF' : `DEAD LETTERS · ${o.dead}`,
    false,
    scale,
    o.dead ? OVER : undefined,
  );
  pills += pill(
    [COURIER[0], COURIER[1] + 9, BH],
    0,
    22,
    narrow ? 'COURIER' : o.outage ? 'COURIER · SITE DOWN' : `COURIER · ${o.shipped} SHIPPED`,
    false,
    scale,
    o.outage || o.twice ? OVER : undefined,
  );
  // the callout stands over its part, a row above the part's pill
  pills +=
    sayAt(o.say, 'till', [TILL[0], TILL[1], BH + 20], -16, scale) +
    sayAt(o.say, 'rail', railTop, -18, scale) +
    sayAt(o.say, 'workers', [BENCH_X[1], BENCH_Y - 11, BH + 20], -10, scale) +
    sayAt(o.say, 'shelf', [SHELF.x1, (SHELF.y0 + SHELF.y1) / 2, BH + 30], -14, scale) +
    sayAt(o.say, 'courier', [COURIER[0], COURIER[1], BH + 24], -14, scale);
  return s + pills;
};

/** The picture in words, for its aria-label. */
export function railLabel(o: RailOpts): string {
  const st = railState(o);
  const who = o.workers
    .map((w, i) => {
      const n = WORKER_NAMES[i] ?? `Worker ${i + 1}`;
      return w.state === 'down'
        ? `${n} is knocked over`
        : w.state === 'busy'
          ? `${n} is on try ${w.tries}${w.failing ? ', which will fail' : ''}`
          : `${n} is free`;
    })
    .join('; ');
  const where = o.inline
    ? `Larkspur’s till does each order’s work itself; ${plural(o.waiting.length, 'customer')} waiting in line.`
    : `Larkspur’s order rail: ${plural(o.waiting.length, 'ticket')} waiting${st.more ? ` (${st.tickets} drawn)` : ''}` +
      `${o.hidden ? `, ${o.hidden} hidden by a fallen worker’s lease` : ''}${o.delayed ? `, ${o.delayed} waiting to retry` : ''}.`;
  return (
    `${where} ${who}. Dead-letter shelf: ${o.dead}. ` +
    `The courier ${o.outage ? 'site is down' : 'is up'}; ${plural(o.shipped, 'parcel')} shipped` +
    `${o.twice ? `, ${plural(o.twice, 'order')} twice` : ''}.`
  );
}

/** The counts the caption carries (phones show only the names in the pills). */
export function railReadouts(o: RailOpts): string[] {
  const st = railState(o);
  return [
    o.inline ? `${o.waiting.length} in line` : `${o.waiting.length} waiting`,
    `${st.busy} busy`,
    ...(st.down ? [`${st.down} down`] : []),
    ...(o.delayed ? [`${o.delayed} to retry`] : []),
    `${o.done} done`,
    ...(o.dead ? [`${o.dead} dead-lettered`] : []),
    ...(o.twice ? [`${plural(o.twice, 'order')} shipped twice`] : []),
    ...(o.outage ? ['courier down'] : []),
  ];
}

/** The home hero's plot: a short rail with three tickets, one bench with its worker busy, and a fallen worker beside a
 * second bench, the dropped ticket on it. */
export function railPlot(x: number, y: number, top: SceneCtx['top']): string {
  const ry = y - 12,
    rz = BH + 22;
  let r =
    box(x - 18, ry - 1, BH, x - 16, ry + 1, rz, METAL, toneI, 0.8) +
    box(x + 14, ry - 1, BH, x + 16, ry + 1, rz, METAL, toneI, 0.8) +
    cylX(x - 17, x + 15, ry, rz, 0.8, METAL, toneI, 0.8, 8);
  for (let i = 0; i < 3; i++) {
    const tx = x + 10 - i * 7;
    r += box(tx - 2.2, ry + 0.8, rz - 10, tx + 2.2, ry + 1.3, rz - 1, i === 2 ? PALS.mustard : CERAMIC, toneI, 0.6);
  }
  const b = (bx: number, by: number, busy: boolean) => {
    let s = box(bx - 7, by - 4, BH, bx + 7, by + 4, BH + 7, WOOD, toneI, 0.9);
    s += hullInk(boxCorners(bx - 7, by - 4, BH, bx + 7, by + 4, BH + 7), 1.4);
    s += box(bx - 5, by - 2, BH + 7, bx - 1, by + 2, BH + 7.4, CERAMIC, toneI, 0.5);
    if (busy) s += box(bx + 1, by - 2.5, BH + 7, bx + 6, by + 2.5, BH + 11, WOOD, toneI, 0.7);
    return s;
  };
  const stand =
    cyl(x - 8, y - 2, BH, BH + 10, 2.4, PALS.cobalt, toneI, 0.9, 12) +
    cyl(x - 8, y - 2, BH + 10, BH + 13.5, 1.8, CERAMIC, toneI, 0.8, 10);
  const fall =
    cylX(x + 6, x + 15, y + 12, BH + 2.2, 2.2, PALS.cobalt, toneI, 0.9, 10) +
    cylX(x + 15, x + 18, y + 12, BH + 2.2, 1.6, CERAMIC, toneI, 0.8, 8);
  return (
    castShadow(boxCorners(x - 15, y + 1, BH, x + 19, y + 9, BH + 7), BH, top) +
    byDepth([
      { at: [x, ry, 0], svg: r },
      { at: [x - 8, y - 2, 0], svg: stand },
      { at: [x - 8, y + 5, 0], svg: b(x - 8, y + 5, true) },
      { at: [x + 12, y + 5, 0], svg: b(x + 12, y + 5, false) },
      { at: [x + 12, y + 12, 0], svg: fall },
    ])
  );
}

/** The home card's picture (and the intro's hero): chapter 5's minute, Rosa knocked over mid-job, her ticket on the
 * bench while the lease holds it. */
export const railCard = (scale = 1.7): RailOpts => ({
  ...railAt(runOf({ ...SCENES.crash, crashes: [SHOWN_CRASH] }), CRASH_AT),
  scale,
});
