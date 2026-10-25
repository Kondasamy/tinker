// Coding agents' picture: the agent's desk (KTD15). A file cabinet holds the repo, a drawer per file: a search lights the
// drawers it hit, a read pulls one open, and a padlock hangs on the tests drawer while test files are protected. On the
// desk lies the patch, a stripe per hunk (mint kept, grey dropped, a tomato stamp when the host refused it), beside a
// terminal whose screen shows the last command's fate. On the wall a lamp board has a lamp per test, lit by the live
// result of the last run. Words only in pills: the code itself is in the Code tab (codePanel.ts, React text nodes).
// On phones (scale > 1.5) the pills keep their names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import {
  CERAMIC,
  DARK,
  METAL,
  PALS,
  WOOD,
  box,
  byDepth,
  castShadow,
  cyl,
  ellUV,
  hullInk,
  on,
  PY,
  PZ,
  rod,
  shape,
  tag,
  toneI,
} from '../../lib/iso/core.js';
import { run as runLoop, type Run, type Step } from '../../lib/coding-agents/loop';
import { FILES, fullOf, hunkCount, patchOf, version } from '../../lib/coding-agents/repo';
import { RECORDING } from '../../lib/coding-agents/turns';
import { TEST_IDS } from '../../lib/coding-agents/tests';
import type { Say } from '../story/steps';

export const DESK_BOARD: Board = [0, 14, 200, 100];
/** The parts a step's callout may name. */
export const DESK_PARTS = ['agent', 'cabinet', 'patch', 'lamps', 'terminal'] as const;

export type DrawerState = 'shut' | 'hit' | 'read' | 'open';
export type LampState = 'pass' | 'fail' | 'off';
export interface DeskOpts {
  /** a drawer per repo file, in FILES order */
  drawers?: DrawerState[];
  /** a padlock on the tests drawer: the host protects test files */
  locked?: boolean;
  /** what the agent is doing now, for its pill */
  doing?: string;
  /** the patch on the desk: each hunk kept or dropped; absent: no patch yet */
  hunks?: boolean[];
  /** the host refused the patch */
  refused?: boolean;
  /** a lamp per test, by the last run's live result */
  lamps?: LampState[];
  /** the last command and how the host took it */
  term?: { cmd: string; outcome: 'ok' | 'refused' | 'denied' };
  /** tokens read so far */
  tokens?: number;
  scale?: number;
  say?: Say;
}

// the cabinet: drawers on its +y face (u = x, v = z), the tests drawer last (lowest)
const CAB = { x0: 14, x1: 42, y0: 22, y1: 46, z1: BH + 62 },
  DRAWER_H = (CAB.z1 - BH - 4) / FILES.length;
const DESK = { x0: 72, x1: 146, y0: 60, y1: 88, z1: BH + 14 };
const AGENT = [108, 48];
const SHEET = { x0: 84, x1: 116, y0: 66, y1: 84 };
const TERM = { x0: 124, x1: 140, y0: 70, y1: 74 };
const LAMPS = { x0: 158, x1: 192, y0: 28, y1: 32, z0: BH + 24, z1: BH + 48 };

const faceY = (y: number, pts: number[][], fill: string, w = 0.6) => shape(on(PY(y), pts), fill, w);
const rectY = (y: number, x0: number, z0: number, x1: number, z1: number, fill: string, w = 0.6) =>
  faceY(
    y,
    [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ],
    fill,
    w,
  );

const DRAWER_FILL: Record<DrawerState, string> = {
  shut: WOOD.l,
  hit: PALS.mustard.l,
  read: PALS.mint.l,
  open: PALS.mint.l,
};

function cabinet(o: DeskOpts) {
  const { x0, x1, y0, y1, z1 } = CAB,
    states = o.drawers ?? FILES.map(() => 'shut' as DrawerState);
  let s = box(x0, y0, BH, x1, y1, z1, WOOD, toneI, 1);
  let open = '';
  states.forEach((st, i) => {
    const top = z1 - 2 - i * DRAWER_H,
      bot = top - DRAWER_H + 1.2;
    s += `<g data-drawer="${esc(FILES[i].path)}" data-state="${st}">${rectY(y1 + 0.05, x0 + 2, bot, x1 - 2, top, DRAWER_FILL[st])}${rectY(y1 + 0.1, (x0 + x1) / 2 - 3, (top + bot) / 2 - 0.6, (x0 + x1) / 2 + 3, (top + bot) / 2 + 0.6, METAL.d, 0.4)}</g>`;
    if (st === 'open')
      open +=
        box(x0 + 3, y1, bot, x1 - 3, y1 + 12, top - 0.5, WOOD, toneI, 0.9) +
        box(x0 + 6, y1 + 2, top - 0.5, x1 - 6, y1 + 10, top + 2, CERAMIC, toneI, 0.6);
  });
  if (o.locked) {
    const i = FILES.findIndex(f => f.path.startsWith('tests/')),
      top = z1 - 2 - i * DRAWER_H,
      cz = top - DRAWER_H / 2;
    s += `<g data-lock="1">${box((x0 + x1) / 2 + 5, y1, cz - 3, (x0 + x1) / 2 + 10, y1 + 2, cz + 1, PALS.mustard, toneI, 0.8)}</g>`;
  }
  return `<g data-part="cabinet">${s}${hullInk(boxCorners(x0, y0, BH, x1, y1, z1), 1.6)}${open}</g>`;
}

function agent() {
  const [x, y] = AGENT;
  return (
    `<g data-part="agent">` +
    cyl(x, y, BH, BH + 32, 7, PALS.cobalt, toneI, 1.1, 18) +
    box(x - 6, y - 5.5, BH + 32, x + 6, y + 5.5, BH + 42, METAL, toneI, 1) +
    rectY(y + 5.55, x - 4, BH + 36, x - 1.5, BH + 38.5, DARK.m, 0) +
    rectY(y + 5.55, x + 1.5, BH + 36, x + 4, BH + 38.5, DARK.m, 0) +
    rod([x, y, BH + 42], [x, y, BH + 47], 0.6, METAL) +
    cyl(x, y, BH + 47, BH + 49, 1.6, PALS.mustard, toneI, 0.8, 10) +
    '</g>'
  );
}

function desk(o: DeskOpts) {
  const { x0, x1, y0, y1, z1 } = DESK;
  const s = box(x0, y0, BH, x1, y1, z1, WOOD, toneI, 1) + hullInk(boxCorners(x0, y0, BH, x1, y1, z1), 1.6);
  // the patch: a sheet with a stripe per hunk
  let sheet = '';
  if (o.hunks) {
    const z = z1 + 0.2,
      { x0: a, x1: b, y0: c, y1: d } = SHEET;
    sheet += shape(
      on(PZ(z), [
        [a, c],
        [b, c],
        [b, d],
        [a, d],
      ]),
      CERAMIC.l,
      0.8,
    );
    const n = o.hunks.length,
      gap = (d - c) / (n + 1);
    o.hunks.forEach((kept, i) => {
      const yy = c + gap * (i + 1);
      sheet += `<g data-hunk="${i}" data-kept="${kept ? 1 : 0}">${shape(
        on(PZ(z + 0.05), [
          [a + 3, yy - 2],
          [b - 3, yy - 2],
          [b - 3, yy + 2],
          [a + 3, yy + 2],
        ]),
        kept && !o.refused ? PALS.mint.l : CERAMIC.d,
        0.4,
      )}</g>`;
    });
    if (o.refused)
      sheet += `<g data-refused="1">${shape(on(PZ(z + 0.1), ellUV((a + b) / 2, (c + d) / 2, 9, 6, 16)), PALS.tomato.l, 0.9)}</g>`;
  }
  // the terminal: its screen on the +y face
  const t = TERM,
    scr = o.term === undefined ? DARK.l : o.term.outcome === 'ok' ? PALS.mint.l : PALS.tomato.l;
  const term =
    box(t.x0, t.y0, z1, t.x1, t.y1, z1 + 13, DARK, toneI, 1) +
    rectY(t.y1 + 0.05, t.x0 + 1.5, z1 + 1.5, t.x1 - 1.5, z1 + 11.5, scr, 0.5);
  return {
    desk: s,
    patch: `<g data-part="patch"${o.hunks ? ` data-hunks="${o.hunks.length}"` : ''}>${sheet}</g>`,
    terminal: `<g data-part="terminal"${o.term ? ` data-outcome="${o.term.outcome}"` : ''}>${term}</g>`,
  };
}

function lamps(o: DeskOpts) {
  const { x0, x1, y0, y1, z0, z1 } = LAMPS,
    states = o.lamps ?? TEST_IDS.map(() => 'off' as LampState);
  let s =
    rod([x0 + 4, y0 + 2, BH], [x0 + 4, y0 + 2, z0], 1, METAL) +
    rod([x1 - 4, y0 + 2, BH], [x1 - 4, y0 + 2, z0], 1, METAL) +
    box(x0, y0, z0, x1, y1, z1, DARK, toneI, 1);
  const step = (x1 - x0) / (states.length + 1),
    cz = (z0 + z1) / 2;
  states.forEach((st, i) => {
    const fill = st === 'pass' ? PALS.mint.l : st === 'fail' ? PALS.tomato.l : CERAMIC.m;
    s += `<g data-lamp="${esc(TEST_IDS[i])}" data-state="${st}">${faceY(y1 + 0.05, ellUV(x0 + step * (i + 1), cz, 3.2, 3.2, 18), fill, 0.8)}</g>`;
  });
  return `<g data-part="lamps">${s}${hullInk(boxCorners(x0, y0, z0, x1, y1, z1), 1.4)}</g>`;
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 'S'}`;

/** The agent's desk. Shadows, then the parts back to front, then the pills. */
export const deskScene = (o: DeskOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    d = desk(o);
  let s =
    castShadow(boxCorners(CAB.x0, CAB.y0, BH, CAB.x1, CAB.y1, CAB.z1), BH, ctx.top) +
    castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), BH, ctx.top) +
    castShadow(boxCorners(LAMPS.x0, LAMPS.y0, BH, LAMPS.x1, LAMPS.y1, LAMPS.z1), BH, ctx.top);
  s += byDepth([
    { at: [(CAB.x0 + CAB.x1) / 2, CAB.y0, 0], svg: cabinet(o) },
    { at: [LAMPS.x0 + 10, LAMPS.y0, 0], svg: lamps(o) },
    { at: [AGENT[0], AGENT[1], 0], svg: agent() },
    { at: [(DESK.x0 + DESK.x1) / 2, DESK.y0, 0], svg: `<g>${d.desk}${d.patch}${d.terminal}</g>` },
  ]);
  const cabAt = [(CAB.x0 + CAB.x1) / 2, CAB.y1, CAB.z1],
    agentAt = [AGENT[0], AGENT[1], BH + 49],
    patchAt = [(SHEET.x0 + SHEET.x1) / 2, SHEET.y1, DESK.z1],
    termAt = [(TERM.x0 + TERM.x1) / 2, TERM.y1, DESK.z1 + 13],
    lampAt = [(LAMPS.x0 + LAMPS.x1) / 2, LAMPS.y1, LAMPS.z1];
  const lit = o.lamps ?? [],
    passed = lit.filter(x => x === 'pass').length,
    ran = lit.some(x => x !== 'off');
  const cab = narrow ? 'FILES' : o.tokens ? `${o.tokens} TOKENS READ` : plural(FILES.length, 'FILE');
  const kept = o.hunks?.filter(Boolean).length ?? 0;
  const patch = !o.hunks
    ? 'NO PATCH'
    : o.refused
      ? 'REFUSED'
      : narrow
        ? 'PATCH'
        : `${plural(o.hunks.length, 'HUNK')} · ${kept} KEPT`;
  const lamp = narrow || !ran ? 'TESTS' : `${passed} OF ${lit.length} PASS`;
  const term = !o.term
    ? 'TERMINAL'
    : o.term.outcome !== 'ok'
      ? o.term.outcome.toUpperCase()
      : narrow
        ? 'RAN'
        : o.term.cmd.toUpperCase();
  return (
    s +
    pill(cabAt, -6, -22, cab, false, scale) +
    pill(agentAt, -4, -16, narrow ? 'AGENT' : (o.doing ?? 'AGENT'), !!o.doing, scale) +
    pill(patchAt, -14, 22, patch, !!o.hunks && !o.refused, scale, o.refused ? PALS.tomato.l : undefined) +
    pill(termAt, 16, 24, term, !!o.term, scale, o.term && o.term.outcome !== 'ok' ? PALS.tomato.l : undefined) +
    pill(lampAt, 4, -24, lamp, ran, scale, ran && passed < lit.length ? PALS.tomato.l : undefined) +
    sayAt(o.say, 'cabinet', cabAt, -22, scale, narrow) +
    sayAt(o.say, 'agent', agentAt, -16, scale, narrow) +
    sayAt(o.say, 'patch', patchAt, 22 - 48, scale, narrow) +
    sayAt(o.say, 'terminal', termAt, 24 - 48, scale, narrow) +
    sayAt(o.say, 'lamps', lampAt, -24, scale, narrow)
  );
};

/** The picture in words, for its aria-label. */
export function deskLabel(o: DeskOpts): string {
  const open = FILES.filter((_, i) => o.drawers?.[i] === 'open').map(f => f.path);
  const lit = o.lamps ?? [];
  const parts = [
    `A coding agent at a desk, beside a file cabinet of ${FILES.length} files${o.locked ? ', its tests drawer padlocked' : ''}.`,
    open.length ? `It is reading ${open.join(', ')}.` : '',
    o.hunks
      ? `A patch of ${o.hunks.length} hunks lies on the desk, ${o.refused ? 'refused by the host' : `${o.hunks.filter(Boolean).length} kept`}.`
      : '',
    o.term ? `The terminal ran ${o.term.cmd}: ${o.term.outcome}.` : '',
    lit.some(x => x !== 'off')
      ? `The test lamps: ${lit.filter(x => x === 'pass').length} of ${lit.length} pass.`
      : 'The test lamps are off.',
  ];
  return parts.filter(Boolean).join(' ');
}

// ---- reading a run ----

export type Beat = Exclude<Step, { kind: 'norecord' }>;
export const beatsOf = (r: Run) => r.steps.filter((s): s is Beat => s.kind !== 'norecord');
const short = (p: string) => p.slice(p.lastIndexOf('/') + 1).toUpperCase();

/** What the desk shows `at` beats into a run (0: the ticket in, nothing done yet). */
export function deskAt(r: Run, at: number): Omit<DeskOpts, 'scale' | 'say'> {
  const beats = beatsOf(r).slice(0, Math.max(0, at)),
    cur = beats.at(-1);
  const drawers: DrawerState[] = FILES.map(() => 'shut');
  let tokens = 0,
    hunks: boolean[] | undefined,
    refused = false,
    lamps: LampState[] | undefined,
    term: DeskOpts['term'];
  for (const b of beats) {
    if (b.kind === 'search') {
      tokens += b.tokens;
      for (const h of b.hits) drawers[FILES.findIndex(f => f.path === h.path)] = 'hit';
    } else if (b.kind === 'read') {
      tokens += b.tokens;
      drawers.forEach((s, i) => s === 'open' && (drawers[i] = 'read'));
      drawers[FILES.findIndex(f => f.path === b.path)] = 'open';
    } else if (b.kind === 'edit') {
      const n = hunkCount(version(b.path, b.from).text, version(b.path, fullPatchOf(b)).text);
      hunks = Array.from({ length: n }, (_, i) => Boolean((b.mask >> i) & 1) || b.outcome === 'refused');
      refused = b.outcome === 'refused';
    } else if (b.kind === 'run') {
      term = { cmd: b.cmd, outcome: b.outcome };
      if (b.tests) lamps = b.tests.map(t => (t.pass ? 'pass' : 'fail'));
    }
  }
  if (cur?.kind !== 'read') drawers.forEach((s, i) => s === 'open' && (drawers[i] = 'read'));
  const doing = !cur
    ? undefined
    : cur.kind === 'search'
      ? 'SEARCH'
      : cur.kind === 'read'
        ? `READ ${short(cur.path)}`
        : cur.kind === 'edit'
          ? `EDIT ${short(cur.path)}`
          : cur.kind === 'run'
            ? `RUN ${cur.cmd.toUpperCase()}`
            : 'DONE';
  return { drawers, locked: r.setup.protect, doing, hunks, refused, lamps, term, tokens };
}
const fullPatchOf = (b: Extract<Beat, { kind: 'edit' }>) => fullOf(patchOf(b.patch));

/** The home card's picture (and the intro's hero): chapter 4's moment, the drive-by hunk turning a lamp red. */
export function deskCard(scale = 1.7): DeskOpts {
  const r = runLoop(RECORDING, { case: 'bulk' });
  return { ...deskAt(r, beatsOf(r).findIndex(b => b.kind === 'run') + 1), scale };
}

/** The home hero's plot: a small desk with a patch on it, and a lamp board with a red and a green lamp. */
export function agentDeskPlot(x: number, y: number, top: SceneCtx['top']): string {
  const d = box(x - 12, y - 2, BH, x + 10, y + 8, BH + 8, WOOD, toneI, 1);
  const sheet = shape(
    on(PZ(BH + 8.2), [
      [x - 8, y],
      [x + 2, y],
      [x + 2, y + 6],
      [x - 8, y + 6],
    ]),
    CERAMIC.l,
    0.5,
  );
  const stripe = shape(
    on(PZ(BH + 8.3), [
      [x - 6, y + 2],
      [x, y + 2],
      [x, y + 3.5],
      [x - 6, y + 3.5],
    ]),
    PALS.mint.l,
    0.3,
  );
  const board = box(x - 6, y - 12, BH + 10, x + 10, y - 10, BH + 20, DARK, toneI, 1);
  const lamp = (lx: number, c: string) => faceY(y - 9.95, ellUV(lx, BH + 15, 2.2, 2.2, 14), c, 0.6);
  const bot =
    cyl(x - 4, y - 6, BH, BH + 9, 2.6, PALS.cobalt, toneI, 1, 14) +
    box(x - 6.5, y - 8, BH + 9, x - 1.5, y - 4, BH + 13, METAL, toneI, 0.9);
  return (
    castShadow(boxCorners(x - 12, y - 2, BH, x + 10, y + 8, BH + 8), BH, top) +
    byDepth([
      { at: [x + 2, y - 11, 0], svg: `<g>${board}${lamp(x - 1, PALS.tomato.l)}${lamp(x + 5, PALS.mint.l)}</g>` },
      { at: [x - 4, y - 6, 0], svg: `<g>${bot}</g>` },
      { at: [x, y + 3, 0], svg: `<g>${d}${sheet}${stripe}</g>` },
    ])
  );
}
