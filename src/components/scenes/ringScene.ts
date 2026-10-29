// Many chips, one model's picture: the round table (U23). Fernhill Labs' chip workers (kit people) stand round a wooden
// table with a rack wall behind. Each worker's place is a dark chip mat with a bucket per chunk of the gradient; the
// sand in a bucket rises with the workers' shares it holds, and a full bucket carries a mound over its rim. A hop's
// sends are tomato arrows across the tabletop. In memory mode each worker holds one bin instead (its chip's memory),
// heaped beside when over. From chapter 4 the same workers stand in a line of workbenches (the pipeline): working
// stages reach over a bucket, idle ones sit behind an empty bench. Words only in pills; esc() on every pill.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, calloutsLast, esc, sayAt } from '../../lib/iso/blocks';
import { drawPieces, person, type Item, type Look, SKIN } from '../../lib/iso/figures';
import {
  CLEAR,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  castShadow,
  cyl,
  hullInk,
  matOf,
  pd,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { flatPill, lane as flatLane } from '../../lib/iso/flat';
import type { Send } from '../../lib/parallel-training/ring';
import type { Slot } from '../../lib/parallel-training/pipeline';
import type { Say } from '../story/steps';

export const RING_BOARD: Board = [0, 0, 208, 184];
/** At most this many workers (KTD10). */
export const MAX_WORKERS = 8;
/** The parts a ring-mode callout may name. */
export const RING_PARTS = ['table', 'worker', 'bucket', 'rack'] as const;
/** The parts a pipeline-mode callout may name; `idle` draws only at a slot with an idle stage. */
export const LINE_PARTS = ['line', 'worker', 'bucket', 'idle', 'rack'] as const;

export interface RingOpts {
  mode?: 'ring' | 'pipeline';
  /** workers (stages in pipeline mode), 1..8 */
  n: number;
  /** ring mode: [worker][chunk] bucket fills, 0..1 (fillsAfter) */
  fills?: number[][];
  /** ring mode: this hop's sends, drawn as arrows */
  sends?: Send[];
  /** memory mode: each worker's share of its chip's memory in use (over 1 spills) */
  load?: number[];
  /** a failed worker, fallen */
  down?: number;
  /** pipeline mode: each stage's slot now (null: idle) */
  slots?: Slot[];
  /** words on the table's pill (ring) or the line's (pipeline) */
  table?: string;
  /** words on the rack wall's pill */
  rack?: string;
  /** pill size; phones pass more */
  scale?: number;
  say?: Say;
}

const C = [104, 110],
  TABLE_R = 44,
  TOP = BH + 13,
  BUCKET_R = 37,
  WORKER_R = 56,
  RACK = { x0: 22, x1: 186, y0: 4, y1: 16, h: 46 },
  LINE = { y: 116, worker: 103, bench: [7, 6] as const },
  SAND = matOf('#e6c27a'),
  CHIP = DARK;
// the workers: kit people in work clothes, told apart by colour and cut (no story names them)
const CREW: Look[] = [
  { skin: SKIN[1], top: PALS.cobalt.l, legs: '#3b4566', hair: '#2b231c', cut: 'short' },
  { skin: SKIN[3], top: PALS.mint.l, legs: '#5a6f93', hair: '#2b231c', cut: 'bun' },
  { skin: SKIN[0], top: PALS.mustard.l, legs: '#4a4642', hair: '#a3482a', cut: 'curly' },
  { skin: SKIN[4], top: PALS.blush.l, legs: '#3b4566', hair: '#2b231c', cut: 'ponytail' },
  { skin: SKIN[2], top: '#b39ddb', legs: '#a8946a', hair: '#6a4426', cut: 'long' },
  { skin: SKIN[1], top: PALS.tomato.l, legs: '#4a4642', hair: '#bdb7ab', cut: 'bald' },
  { skin: SKIN[3], top: '#9fb3a0', legs: '#5a6f93', hair: '#2b231c', cut: 'short', hat: 'cap', hatCol: PALS.mustard.m },
  {
    skin: SKIN[0],
    top: '#ef8f3c',
    legs: '#3b4566',
    hair: '#d9b35c',
    cut: 'short',
    hat: 'beanie',
    hatCol: PALS.cobalt.m,
  },
];

const rad = (d: number) => (d * Math.PI) / 180;
const around = (deg: number, r: number) => [C[0] + r * Math.cos(rad(deg)), C[1] + r * Math.sin(rad(deg))];
/** Worker i's angle round the table: worker 1 nearest the viewer, the ring running round from there. */
const angleOf = (i: number, n: number) => 90 + (i * 360) / n;
const bucketSize = (n: number) => (n <= 2 ? 5 : n <= 4 ? 4 : 1.7);
/** Bucket (worker i, chunk c)'s angle: the worker's chunks side by side along the rim. */
const bucketAngle = (i: number, c: number, n: number) =>
  angleOf(i, n) + (((c - (n - 1) / 2) * bucketSize(n) * 2.5) / BUCKET_R) * (180 / Math.PI);
/** Stage s's x on the line, stage 1 on the left. */
const stageX = (s: number, n: number) => C[0] + (s - (n - 1) / 2) * Math.min(40, 136 / Math.max(1, n - 1));
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];
const round = (x: number) => Math.round(x * 1000) / 1000;

/** The rack wall: cabinets with unit lines and status lights on the faces toward the viewer. */
function rackWall(): Item {
  const { x0, x1, y0, y1, h } = RACK,
    w = (x1 - x0) / 6,
    fy = y1 + 0.05;
  // the faces' unit bays and lights, each kind one path
  let bays = '',
    mint = '',
    mustard = '',
    s = '';
  for (let k = 0; k < 6; k++) {
    const a = x0 + k * w + 0.6,
      b = a + w - 1.2;
    s += box(a, y0, BH, b, y1, BH + h, DARK, toneI, 1);
    for (let z = BH + 6; z < BH + h - 2; z += 8) {
      bays += pd([
        [a + 2, fy, z],
        [b - 2, fy, z],
        [b - 2, fy, z + 5],
        [a + 2, fy, z + 5],
      ]);
      const led = pd([
        [b - 5, fy + 0.05, z + 1.5],
        [b - 3.4, fy + 0.05, z + 1.5],
        [b - 3.4, fy + 0.05, z + 3],
        [b - 5, fy + 0.05, z + 3],
      ]);
      if ((k + z) % 3) mint += led;
      else mustard += led;
    }
  }
  s +=
    `<path d="${bays}" fill="${DARK.l}" stroke="#231e16" stroke-width=".4"/>` +
    `<path d="${mint}" fill="${PALS.mint.l}"/><path d="${mustard}" fill="${PALS.mustard.l}"/>`;
  s += hullInk(boxCorners(x0, y0, BH, x1, y1, BH + h), 1.8);
  return { box: span(x0, y0, BH, x1, y1, BH + h), svg: `<g data-part="rack">${s}</g>` };
}

/** A flat arc on the tabletop from angle a0 to a1 (degrees, increasing), with a head at a1. */
function arc(a0: number, a1: number, r: number, z: number) {
  const steps = Math.max(4, Math.ceil((a1 - a0) / 8)),
    pts = Array.from({ length: steps + 1 }, (_, j) => {
      const [x, y] = around(a0 + ((a1 - a0) * j) / steps, r);
      return [x, y, z];
    });
  const [hx, hy] = around(a1, r),
    t = rad(a1),
    // tangent (direction of travel) and the inward normal
    tx = -Math.sin(t),
    ty = Math.cos(t),
    nx = Math.cos(t),
    ny = Math.sin(t);
  const head = [
    [hx + tx * 2.6, hy + ty * 2.6, z],
    [hx - tx * 1.4 + nx * 2, hy - ty * 1.4 + ny * 2, z],
    [hx - tx * 1.4 - nx * 2, hy - ty * 1.4 - ny * 2, z],
  ];
  return (
    `<path d="${pd(pts, false)}" stroke="${PALS.tomato.m}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    shape(head, PALS.tomato.m, 0.6)
  );
}

/** The round table: a pedestal, a wooden top, each worker's chip mat, and this hop's arrows. */
function table(n: number, sends: Send[]): Item {
  const [x, y] = C;
  let s = cyl(x, y, BH, BH + 1.5, 9, WOOD, toneI, 1) + cyl(x, y, BH + 1.5, TOP - 2, 4, WOOD, toneI, 1);
  s += cyl(x, y, TOP - 2, TOP, TABLE_R, WOOD, toneI, 1.6);
  const z = TOP + 0.05,
    b = bucketSize(n);
  for (let i = 0; i < n; i++) {
    // the mat spans the worker's buckets along the rim
    const half = ((n - 1) / 2) * b * 2.5 + b * 1.6,
      a = rad(angleOf(i, n)),
      tx = -Math.sin(a),
      ty = Math.cos(a),
      [mx, my] = around(angleOf(i, n), BUCKET_R),
      d = b * 1.7;
    s += shape(
      [
        [mx - tx * half - Math.cos(a) * d, my - ty * half - Math.sin(a) * d, z],
        [mx + tx * half - Math.cos(a) * d, my + ty * half - Math.sin(a) * d, z],
        [mx + tx * half + Math.cos(a) * d, my + ty * half + Math.sin(a) * d, z],
        [mx - tx * half + Math.cos(a) * d, my - ty * half + Math.sin(a) * d, z],
      ],
      CHIP.m,
      0.6,
    );
  }
  for (const sd of sends) {
    let a0 = bucketAngle(sd.from, sd.chunk, n),
      a1 = bucketAngle(sd.to, sd.chunk, n);
    while (a1 <= a0) a1 += 360;
    // leave the buckets themselves clear
    const gap = ((b * 1.4) / (BUCKET_R - 8)) * (180 / Math.PI);
    s += arc(a0 + gap, a1 - gap, BUCKET_R - 8, z + 0.02);
  }
  return {
    box: span(x - TABLE_R, y - TABLE_R, BH, x + TABLE_R, y + TABLE_R, TOP),
    svg: `<g data-part="table" data-sends="${sends.map(d => `${d.from}>${d.to}:${d.chunk}`).join(' ')}">${s}</g>`,
  };
}

/** One bucket of gradient sand, fill 0..1 (or more: a bin in memory mode, heaped beside). */
function bucket(x: number, y: number, z: number, r: number, h: number, fill: number, attrs: string): Item[] {
  const f = Math.max(0, Math.min(1, fill)),
    full = fill >= 1 - 1e-9;
  // a glass jar, cheap (8 sides, 64 of them at 8 workers): a column of sand as tall as the fill, clear glass above it
  const top = z + f * h;
  let svg = f > 0 ? cyl(x, y, z, top, r, SAND, toneI, 0.8, 8) : '';
  if (f < 1) svg += cyl(x, y, top, z + h, r, CLEAR, toneI, 0.8, 8);
  // a full jar's mound sits proud of the rim: full by shape as well as height
  if (full) svg += cyl(x, y, z + h, z + h + r * 0.35, r * 0.55, SAND, toneI, 0.5, 8);
  const items: Item[] = [{ box: span(x - r, y - r, z, x + r, y + r, z + h), svg: `<g ${attrs}>${svg}</g>` }];
  if (fill > 1)
    items.push({
      box: span(x + r, y - r, z, x + r * 2.6, y + r, z + r),
      svg: `<g class="spill">${cyl(x + r * 1.8, y, z, z + r * 0.5, r * 0.8, SAND, toneI, 0.6)}${cyl(x + r * 1.8, y, z + r * 0.5, z + r, r * 0.4, SAND, toneI, 0.5)}</g>`,
    });
  return items;
}

/** A workbench on the line: a wooden top on legs; empty when its stage is idle. */
function bench(x: number, s: number, slot: Slot): Item[] {
  const [hw, hd] = LINE.bench,
    y = LINE.y,
    zt = BH + 12;
  let t = '';
  for (const [dx, dy] of [
    [-hw + 1, -hd + 1],
    [hw - 1, -hd + 1],
    [-hw + 1, hd - 1],
    [hw - 1, hd - 1],
  ])
    t += box(x + dx - 0.8, y + dy - 0.8, BH, x + dx + 0.8, y + dy + 0.8, zt - 1.5, WOOD, toneI, 0.7);
  t += box(x - hw, y - hd, zt - 1.5, x + hw, y + hd, zt, WOOD, toneI, 1.1);
  if (slot) {
    // the pass's direction on the bench: right for forward, left for backward
    const d = slot.kind === 'F' ? 1 : -1,
      z = zt + 0.05;
    t += shape(
      [
        [x - d * 5, y + hd - 1.6, z],
        [x + d * 3, y + hd - 1.6, z],
        [x + d * 3, y + hd - 2.6, z],
        [x + d * 5.6, y + hd - 1.1, z],
        [x + d * 3, y + hd + 0.4 - 1, z],
        [x + d * 3, y + hd - 0.6, z],
        [x - d * 5, y + hd - 0.6, z],
      ],
      PALS.tomato.m,
      0.4,
    );
  }
  const items: Item[] = [
    {
      box: span(x - hw, y - hd, BH, x + hw, y + hd, zt),
      svg: `<g class="bench" data-stage="${s}"${slot ? ` data-work="${slot.kind}${slot.micro + 1}"` : ' data-idle="1"'}>${t}</g>`,
    },
  ];
  if (slot) items.push(...bucket(x - 1, y - 1.5, zt, 3, 6.5, 1, `data-micro="${slot.micro + 1}"`));
  return items;
}

const pill = (p: number[], dy: number, text: string, lit: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, 0, dy, esc(text), lit, scale)}</g>`;
const times = (x: number) => (x >= 10 ? `${Math.round(x)}×` : `${Math.round(x * 10) / 10}×`);

/** What the table shows. Pure, so the tests can read it without drawing. */
export function ringState(o: RingOpts) {
  const n = Math.max(1, Math.min(MAX_WORKERS, o.n)),
    mode = o.mode ?? 'ring';
  const idle = mode === 'pipeline' ? Array.from({ length: n }, (_, s) => !o.slots?.[s]) : [];
  return { n, mode, idle, firstIdle: idle.indexOf(true), firstWork: idle.indexOf(false) };
}

/** The round table, or the line. Shadows, one sort over every piece, then the pills (callouts last). */
export const ringScene = (o: RingOpts) => (ctx: SceneCtx) => {
  const st = ringState(o),
    { n } = st,
    scale = o.scale ?? 1,
    narrow = scale > 1.5;
  const pieces: { shadow: string; items: Item[] }[] = [
    {
      shadow: castShadow(boxCorners(RACK.x0, RACK.y0, BH, RACK.x1, RACK.y1, BH + RACK.h), BH, ctx.top),
      items: [rackWall()],
    },
  ];
  const pills: string[] = [],
    rackAt = [(RACK.x0 + RACK.x1) / 2, RACK.y1, BH + RACK.h];
  pills.push(pill(rackAt, -12, o.rack ?? 'RACK', false, scale), sayAt(o.say, 'rack', rackAt, -12, scale, narrow));
  // worker pills: their number; none at 8 on phones (the caption carries them); short at 8 on desktop
  const named = !narrow || n <= 4,
    short = narrow || n > 4;
  if (st.mode === 'ring') {
    const sends = o.sends ?? [],
      tableAt = [C[0], C[1] + TABLE_R, TOP];
    pieces.push({
      shadow: castShadow(
        // the round top's rim, not its bounding box
        Array.from({ length: 24 }, (_, j) => [...around(j * 15, TABLE_R), TOP]).concat([[C[0], C[1], BH]]),
        BH,
        ctx.top,
      ),
      items: [table(n, sends)],
    });
    const b = bucketSize(n);
    for (let i = 0; i < n; i++) {
      const deg = angleOf(i, n),
        [px, py] = around(deg, WORKER_R),
        down = o.down === i;
      const who = down
        ? person({ x: px, y: py, facing: deg + 90, pose: 'fallen', look: CREW[i] })
        : person({ x: px, y: py, facing: deg + 180, pose: sends.length ? 'reach' : 'stand', look: CREW[i] });
      who.items[0] = { ...who.items[0], svg: `<g data-worker="${i}">${who.items[0].svg}</g>` };
      pieces.push(who);
      const items: Item[] = [];
      if (o.load) {
        const [x, y] = around(deg, BUCKET_R - 1),
          l = down ? 0 : (o.load[i] ?? 0);
        items.push(...bucket(x, y, TOP, 4.4, 14, l, `data-bin="${i}" data-load="${round(l)}"`));
      } else if (o.fills)
        for (let c = 0; c < n; c++) {
          const [x, y] = around(bucketAngle(i, c, n), BUCKET_R),
            f = down ? 0 : (o.fills[i]?.[c] ?? 0);
          items.push(...bucket(x, y, TOP, b, b * 2.1, f, `data-bucket="${i},${c}" data-fill="${round(f)}"`));
        }
      pieces.push({ shadow: '', items });
      const head = [px, py, BH + 34],
        over = o.load && (o.load[i] ?? 0) > 1 && !down;
      if (named)
        pills.push(
          pill(
            head,
            i % 2 ? -10 : -24,
            `${short ? '' : 'CHIP '}${i + 1}${over && !short ? ` · ${times(o.load![i])}` : ''}`,
            !!over,
            scale,
          ),
        );
    }
    const firstAt = (() => {
      if (o.load) {
        const [x, y] = around(angleOf(0, n), BUCKET_R - 1);
        return [x, y, TOP + 14];
      }
      const [x, y] = around(bucketAngle(0, 0, n), BUCKET_R);
      return [x, y, TOP + b * 2.1];
    })();
    const w0 = around(angleOf(0, n), WORKER_R);
    if (o.table) pills.push(pill(tableAt, 26, o.table, false, scale));
    pills.push(
      sayAt(o.say, 'table', tableAt, 26, scale, narrow),
      sayAt(o.say, 'worker', [w0[0], w0[1], BH + 34], -24, scale, narrow),
      sayAt(o.say, 'bucket', firstAt, -40, scale, narrow),
    );
  } else {
    for (let s = 0; s < n; s++) {
      const x = stageX(s, n),
        slot = o.slots?.[s] ?? null,
        down = o.down === s;
      const who = person({
        x,
        y: LINE.worker,
        facing: 90,
        pose: down ? 'fallen' : slot ? 'reach' : 'sit',
        look: CREW[s],
      });
      who.items[0] = { ...who.items[0], svg: `<g data-worker="${s}">${who.items[0].svg}</g>` };
      const stool: Item[] =
        slot || down
          ? []
          : [
              {
                box: span(x - 3, LINE.worker - 3, BH, x + 3, LINE.worker + 3, BH + 6.8),
                svg: cyl(x, LINE.worker, BH, BH + 6.8, 3, WOOD, toneI, 0.9),
              },
            ];
      pieces.push(
        {
          shadow: castShadow(boxCorners(x - 7, LINE.y - 6, BH, x + 7, LINE.y + 6, BH + 12), BH, ctx.top),
          items: bench(x, s, slot),
        },
        { shadow: '', items: stool },
        who,
      );
      if (named)
        pills.push(
          pill(
            [x, LINE.y + LINE.bench[1], BH + 12],
            s % 2 ? 18 : 52,
            `${short ? '' : `${s + 1} · `}${slot ? `${slot.kind}${slot.micro + 1}` : 'IDLE'}`,
            !!slot,
            scale,
          ),
        );
    }
    const lineAt = [stageX(0, n) - 8, LINE.y, BH + 12],
      wk = Math.max(0, st.firstWork);
    if (o.table) pills.push(pill([C[0], LINE.y + 8, BH], 54, o.table, false, scale));
    pills.push(
      sayAt(o.say, 'line', lineAt, -30, scale, narrow),
      sayAt(o.say, 'worker', [stageX(0, n), LINE.worker, BH + 34], -24, scale, narrow),
      sayAt(o.say, 'bucket', [stageX(wk, n), LINE.y, BH + 18], -30, scale, narrow),
    );
    if (st.firstIdle >= 0)
      pills.push(sayAt(o.say, 'idle', [stageX(st.firstIdle, n), LINE.worker, BH + 28], -24, scale, narrow));
  }
  return drawPieces(pieces) + calloutsLast(pills);
};

/** The picture in words, for its aria-label. */
export function ringLabel(o: RingOpts): string {
  const st = ringState(o),
    n = st.n;
  const down = o.down !== undefined && o.down < n ? ` Worker ${o.down + 1} has failed and lies on the floor.` : '';
  if (st.mode === 'pipeline') {
    const work = (o.slots ?? [])
      .slice(0, n)
      .flatMap((x, s) =>
        x ? [`stage ${s + 1} ${x.kind === 'F' ? 'forward' : 'backward'} on micro-batch ${x.micro + 1}`] : [],
      );
    const idle = st.idle.flatMap((x, s) => (x ? [s + 1] : []));
    return (
      `A line of ${n} workbenches, one worker each, a rack wall behind. ` +
      `${work.length ? `${work.join('; ').replace(/^s/, 'S')}.` : 'No stage is working.'}` +
      `${idle.length ? ` Idle: stage${idle.length > 1 ? 's' : ''} ${idle.join(', ')}.` : ''}${down}`
    );
  }
  const head = `A round table with ${n} chip worker${n > 1 ? 's' : ''} and a rack wall behind.`;
  if (o.load)
    return `${head} Each holds a bin for its chip’s memory: ${o.load
      .slice(0, n)
      .map((l, i) =>
        l > 1
          ? `worker ${i + 1} ${times(l)} its memory, spilling over`
          : `worker ${i + 1} ${Math.round(l * 100)}% full`,
      )
      .join('; ')}.${down}`;
  if (!o.fills) return head + down;
  const full = o.fills.slice(0, n).map(r => r.filter(f => f >= 1 - 1e-9).length);
  return (
    `${head} Each has ${n} buckets of gradient sand, one per chunk.` +
    `${o.sends?.length ? ` This hop each worker passes one bucket to the next.` : ''}` +
    ` Full buckets: ${full.map((k, i) => `worker ${i + 1} ${k}`).join(', ')}.${down}`
  );
}

/** The home hero's plot (heroScene): a small round table with four buckets, one full. */
export function ringPlot(x: number, y: number, top: SceneCtx['top']): string {
  const z = BH + 6;
  const t = cyl(x, y, BH, z - 1, 3, WOOD, toneI, 0.9) + cyl(x, y, z - 1, z, 16, WOOD, toneI, 1.2);
  const items: Item[] = [{ box: span(x - 16, y - 16, BH, x + 16, y + 16, z), svg: `<g>${t}</g>` }];
  [0.25, 0.5, 1, 0.75].forEach((f, i) => {
    const a = rad(45 + i * 90);
    items.push(...bucket(x + 10 * Math.cos(a), y + 10 * Math.sin(a), z, 3, 6, f, 'class="plot-bucket"'));
  });
  return drawPieces([{ shadow: castShadow(boxCorners(x - 16, y - 16, BH, x + 16, y + 16, z), BH, top), items }]);
}

// ---- the Timeline tab: a lane per worker, a column per slot (flat.ts lanes) ----

export type CellKind = 'compute' | 'wait' | 'bubble';
export interface TimelineCell {
  lane: number;
  col: number;
  kind: CellKind;
  /** F1, B3 in pipeline mode */
  text: string;
  done: boolean;
  now: boolean;
}
/** ring: n workers, k hops done; pipeline: the schedule's grid, k the slot shown */
export type TimelineOpts = { mode: 'ring'; n: number; k: number } | { mode: 'pipeline'; grid: Slot[][]; k: number };

const TL = { w: 600, pad: 10, head: 66, row: 26, gap: 6, fs: 9.5, legend: 30 },
  TL_PHONE = { w: 340, pad: 6, head: 30, row: 24, gap: 5, fs: 10, legend: 30 };
const CELL_FILL: Record<CellKind, string> = { compute: PALS.mint.l, wait: PALS.cobalt.l, bubble: METAL.l };
const LANE_PALS = [PALS.cobalt, PALS.mint, PALS.mustard, PALS.blush, PALS.tomato, PALS.cobalt, PALS.mint, PALS.mustard];

/** The timeline's cells: ring mode one compute cell then a wait cell per hop; pipeline mode the schedule's slots. */
export function timelineCells(o: TimelineOpts): TimelineCell[] {
  if (o.mode === 'ring') {
    const hops = 2 * (o.n - 1);
    return Array.from({ length: o.n }, (_, lane) => [
      { lane, col: 0, kind: 'compute' as const, text: '', done: true, now: o.k === 0 },
      ...Array.from({ length: hops }, (_, j) => ({
        lane,
        col: j + 1,
        kind: 'wait' as const,
        text: '',
        done: j < o.k,
        now: j === o.k - 1,
      })),
    ]).flat();
  }
  return o.grid.flatMap((row, lane) =>
    row.map((slot, col) => ({
      lane,
      col,
      kind: slot ? ('compute' as const) : ('bubble' as const),
      text: slot ? `${slot.kind}${slot.micro + 1}` : '',
      done: col <= o.k,
      now: col === o.k,
    })),
  );
}

const n1 = (x: number) => x.toFixed(1);
/** The timeline as an SVG string (every text escaped) and its size. */
export function ringTimeline(o: TimelineOpts, { phone = false }: { phone?: boolean } = {}) {
  const L = phone ? TL_PHONE : TL,
    cells = timelineCells(o),
    lanes = o.mode === 'ring' ? o.n : o.grid.length,
    cols = cells.reduce((a, c) => Math.max(a, c.col + 1), 0),
    ring = o.mode === 'ring',
    // ring mode: the compute cell is two slots wide
    x0 = L.pad + L.head + 6,
    u = (L.w - L.pad - x0) / (ring ? cols + 1 : cols),
    xOf = (col: number) => x0 + (ring && col > 0 ? col + 1 : col) * u,
    wOf = (col: number) => (ring && col === 0 ? 2 * u : u),
    yOf = (lane: number) => L.pad + L.legend + lane * (L.row + L.gap);
  let s = '';
  for (let i = 0; i < lanes; i++)
    s += flatLane(
      `w${i}`,
      phone ? `${i + 1}` : `CHIP ${i + 1}`,
      LANE_PALS[i],
      L.pad,
      yOf(i),
      L.head,
      L.row,
      L.fs,
      true,
    );
  for (const c of cells) {
    const x = xOf(c.col) + 1,
      y = yOf(c.lane) + 2,
      w = wOf(c.col) - 2,
      h = L.row - 4;
    const dash = c.kind === 'wait' ? ' stroke-dasharray="3 2"' : '';
    let g = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="3" fill="${c.done ? CELL_FILL[c.kind] : '#fffdf6'}" stroke="#231e16" stroke-width="${c.now ? 2.4 : 0.8}"${dash}/>`;
    // the bubble is hatched: idle by pattern, not only by colour
    if (c.kind === 'bubble') {
      let d = '';
      for (let j = 0; j < w; j += 5) {
        const step = Math.min(5, w - j);
        d += `M${n1(x + j)} ${n1(y + h)}l${n1(step)} ${n1((-step * h) / 5)}`;
      }
      g += `<path d="${d}" stroke="#8f989b" stroke-width=".8" fill="none"/>`;
    }
    if (c.text && !phone && w >= 14)
      g += `<text x="${n1(x + w / 2)}" y="${n1(y + h / 2 + L.fs * 0.36)}" font-size="${L.fs}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="#231e16"${c.done ? '' : ' opacity=".45"'}>${esc(c.text)}</text>`;
    s += `<g class="tl-cell" data-lane="${c.lane}" data-col="${c.col}" data-kind="${c.kind}"${c.done ? ' data-done="1"' : ''}${c.now ? ' data-now="1"' : ''}>${g}</g>`;
  }
  // the legend: a pill per kind this view has
  const kinds: CellKind[] = ring ? ['compute', 'wait'] : ['compute', 'bubble'],
    words: Record<CellKind, string> = { compute: 'COMPUTE', wait: 'WAITING', bubble: 'BUBBLE' };
  kinds.forEach((k, i) => {
    s += flatPill(L.pad + (phone ? 50 : 60) + i * (phone ? 110 : 130), L.pad + 10, words[k], L.fs * 0.9);
  });
  return { svg: s, w: L.w, h: yOf(lanes) + L.pad, cells };
}

/** The timeline in words, for its label. */
export function timelineLabel(o: TimelineOpts): string {
  if (o.mode === 'ring')
    return `Timeline, a lane per worker: compute, then ${2 * (o.n - 1)} hops waiting on the ring, ${o.k} done.`;
  const cells = timelineCells(o),
    idle = cells.filter(c => c.kind === 'bubble').length;
  return `Timeline, a lane per stage over ${o.grid[0]?.length ?? 0} slots: ${idle} of ${cells.length} stage-slots idle, the bubble. Showing slot ${o.k + 1}.`;
}
