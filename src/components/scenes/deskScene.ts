// Coding agents' picture: the agent's desk (KTD15). The agent is a rounded robot at a workbench, its hands on the
// patch. A file cabinet holds the repo, a drawer per file: a search lights the drawers it hit, a read pulls one open,
// and a padlock hangs on the tests drawer while test files are protected. On the bench lies the patch, a stripe per
// hunk (mint kept, grey dropped, a tomato stamp when the host refused it), beside a rounded terminal whose screen shows
// the last command's fate. A traffic light on a pole has a lamp per test, lit by the live result of the last run.
// Words only in pills: the code itself is in the Code tab (codePanel.ts, React text nodes).
// On phones (scale > 1.5) the pills keep their names and the caption carries the numbers.
import type { Board, SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, sayAt } from '../../lib/iso/blocks';
import { padlock } from '../../lib/iso/figures';
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
  extrude,
  hullInk,
  on,
  PX,
  PY,
  PZ,
  rectUV,
  rod,
  rrUV,
  shape,
  tag,
  toneI,
  vis,
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
const LAMPS = { x0: 158, x1: 192, y0: 28, y1: 32, z0: BH + 24, z1: BH + 48 },
  LAMP_X = (LAMPS.x0 + LAMPS.x1) / 2;

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

/** The cabinet. Real-object notes: a wooden filing cabinet on a dark plinth under a lipped top; each drawer a raised
 * front with a card-holder and a bar pull; an open drawer slides out with its papers. */
function cabinet(o: DeskOpts) {
  const { x0, x1, y0, y1, z1 } = CAB,
    states = o.drawers ?? FILES.map(() => 'shut' as DrawerState),
    mx = (x0 + x1) / 2;
  let s =
    box(x0 + 1, y0 + 1, BH, x1 - 1, y1 - 1, BH + 2, DARK, toneI, 0.9) +
    box(x0, y0, BH + 2, x1, y1, z1 - 1.5, WOOD, toneI, 1) +
    box(x0 - 0.6, y0 - 0.6, z1 - 1.5, x1 + 0.6, y1 + 0.6, z1, WOOD, toneI, 1);
  let open = '';
  // a drawer's handle: a steel bar on two stand-offs, out from the face at y
  const pull = (y: number, cz: number) =>
    rod([mx - 4, y + 1.3, cz], [mx + 4, y + 1.3, cz], 0.7, METAL, toneI, 0.8, 0.7, 8) +
    rod([mx - 4, y, cz], [mx - 4, y + 1.3, cz], 0.45, METAL, toneI, 0.6, 0.45, 6) +
    rod([mx + 4, y, cz], [mx + 4, y + 1.3, cz], 0.45, METAL, toneI, 0.6, 0.45, 6);
  states.forEach((st, i) => {
    const top = z1 - 2.5 - i * DRAWER_H,
      bot = top - DRAWER_H + 1.4,
      cz = (top + bot) / 2;
    s += `<g data-drawer="${esc(FILES[i].path)}" data-state="${st}">${rectY(y1 + 0.05, x0 + 2, bot, x1 - 2, top, DRAWER_FILL[st])}${st === 'open' ? '' : rectY(y1 + 0.1, mx - 3, top - 3, mx + 3, top - 1.4, CERAMIC.l, 0.4) + pull(y1, cz - 0.6)}</g>`;
    if (st === 'open')
      open +=
        rectY(y1 + 0.1, x0 + 3, bot + 0.4, x1 - 3, top - 0.6, DARK.d, 0.5) +
        box(x0 + 3, y1, bot, x1 - 3, y1 + 12, top - 0.5, WOOD, toneI, 0.9) +
        box(x0 + 6, y1 + 2, top - 0.5, x1 - 6, y1 + 10, top + 2, CERAMIC, toneI, 0.6) +
        pull(y1 + 12, cz - 0.6);
  });
  if (o.locked) {
    const i = FILES.findIndex(f => f.path.startsWith('tests/')),
      cz = z1 - 2.5 - i * DRAWER_H - DRAWER_H / 2;
    s += `<g data-lock="1">${padlock({ x: mx + 9, y: y1 + 2.2, z: cz - 4, size: 0.75, facing: '+y' })
      .items.map(it => it.svg)
      .join('')}</g>`;
  }
  return `<g data-part="cabinet">${s}${hullInk(boxCorners(x0 - 0.6, y0 - 0.6, BH, x1 + 0.6, y1 + 0.6, z1), 1.8)}${open}</g>`;
}

/** The coding agent: a rounded robot. Real-object notes: a domed pedestal on the floor; a rounded torso with a chest
 * panel; a rounded head with a dark visor and two lit eyes; an antenna with a bulb; jointed arms (shoulder, elbow, a
 * round hand) reaching forward. k scales it; reach: where the hands rest. */
function robot(x: number, y: number, z: number, k: number, reach: number[]) {
  const R = (u0: number, v0: number, u1: number, v1: number, r: number) =>
    rrUV(y + u0 * k, z + v0 * k, y + u1 * k, z + v1 * k, r * k, 4);
  const shell = (prof: number[][], xa: number, xb: number, m: typeof METAL) => {
    let s = '';
    for (const [cx, n] of [
      [x + xa * k, [-1, 0, 0]],
      [x + xb * k, [1, 0, 0]],
    ] as [number, number[]][])
      if (vis(n)) s += shape(on(PX(cx), prof), toneI(n, m), 1);
    return (
      s +
      extrude(prof, x + xa * k, x + xb * k, m, toneI) +
      hullInk([...on(PX(x + xa * k), prof), ...on(PX(x + xb * k), prof)], 2.2)
    );
  };
  const fy = y + 6 * k + 0.05,
    TORSO = R(-6, 9, 6, 30, 4.5),
    HEAD = R(-5.5, 33, 5.5, 43, 3.5);
  let body =
    cyl(x, y, z, z + 3 * k, 6 * k, DARK, toneI, 1, 18) +
    rod([x, y, z + 3 * k], [x, y, z + 9 * k], 2.4 * k, METAL, toneI, 1) +
    shell(TORSO, -7, 7, PALS.cobalt);
  if (vis([0, 1, 0]))
    body +=
      shape(
        on(PY(y + 6 * k + 0.05), rrUV(x - 4 * k, z + 16 * k, x + 4 * k, z + 25 * k, 1.5 * k, 3)),
        PALS.cobalt.l,
        0.8,
      ) +
      [0, 1, 2]
        .map(i =>
          shape(
            on(PY(y + 6 * k + 0.1), ellUV(x - 2.4 * k + i * 2.4 * k, z + 19 * k, 0.8 * k, 0.8 * k, 8)),
            i === 1 ? PALS.mustard.l : DARK.l,
            0.4,
          ),
        )
        .join('');
  body += rod([x, y, z + 30 * k], [x, y, z + 33 * k], 1.6 * k, DARK, toneI, 0.9) + shell(HEAD, -6, 6, METAL);
  if (vis([0, 1, 0]))
    body +=
      shape(on(PY(fy), rrUV(x - 4.5 * k, z + 36 * k, x + 4.5 * k, z + 40.5 * k, 1.8 * k, 3)), '#1d2a26', 0.9) +
      [-1, 1]
        .map(sx => shape(on(PY(fy + 0.05), ellUV(x + sx * 2 * k, z + 38.2 * k, 0.9 * k, 0.9 * k, 10)), PALS.mint.l, 0))
        .join('');
  body +=
    rod([x, y, z + 43 * k], [x, y, z + 47 * k], 0.6 * k, METAL) +
    cyl(x, y, z + 47 * k, z + 49 * k, 1.6 * k, PALS.mustard, toneI, 0.8, 10);
  // arms: from each shoulder, down and forward to an elbow, then to the hand where it rests
  let arms = '';
  for (const sx of [-1, 1]) {
    const sh = [x + sx * 7.6 * k, y, z + 27 * k],
      hand = [reach[0] + sx * 6 * k, reach[1], reach[2]],
      el = [x + sx * 9 * k, (y + hand[1]) / 2 - 1 * k, z + 19 * k];
    arms +=
      cyl(sh[0], sh[1], sh[2] - 1.6 * k, sh[2] + 1.6 * k, 2 * k, METAL, toneI, 0.9, 12) +
      rod(sh, el, 1.2 * k, METAL, toneI, 1) +
      rod(el, hand, 1.1 * k, METAL, toneI, 1) +
      cyl(hand[0], hand[1], hand[2], hand[2] + 1.8 * k, 1.8 * k, DARK, toneI, 0.9, 12);
  }
  return { body, arms };
}

/** The workbench. Real-object notes: a thick wooden top on four square legs, a steel vice bolted to the near corner. */
function desk(o: DeskOpts) {
  const { x0, x1, y0, y1, z1 } = DESK,
    zt = z1 - 3;
  let s = '';
  for (const [lx, ly] of [
    [x0 + 2, y0 + 2],
    [x1 - 5, y0 + 2],
    [x0 + 2, y1 - 5],
    [x1 - 5, y1 - 5],
  ].sort((a, b) => a[0] + a[1] - b[0] - b[1]))
    s += box(lx, ly, BH, lx + 3, ly + 3, zt, WOOD, toneI, 0.9);
  s += box(x0 - 1, y0 - 1, zt, x1 + 1, y1 + 1, z1, WOOD, toneI, 1.4);
  // the vice on the near-right corner: a fixed jaw, a sliding jaw, the screw and its tommy bar
  const vx = x1 - 6,
    vy = y1 - 2;
  s +=
    box(vx - 4, vy - 6, z1, vx + 4, vy - 3, z1 + 5, METAL, toneI, 0.9) +
    box(vx - 4, vy - 1, z1, vx + 4, vy + 1.5, z1 + 5, METAL, toneI, 0.9) +
    rod([vx, vy + 1.5, z1 + 2.5], [vx, vy + 4.5, z1 + 2.5], 0.7, DARK, toneI, 0.8) +
    rod([vx - 3, vy + 4.5, z1 + 2.5], [vx + 3, vy + 4.5, z1 + 2.5], 0.5, METAL, toneI, 0.7);
  // the patch: a sheet with a stripe per hunk
  let sheet = '';
  if (o.hunks) {
    const z = z1 + 0.2,
      { x0: a, x1: b, y0: c, y1: d } = SHEET;
    sheet += shape(on(PZ(z), rectUV(a, c, b, d)), CERAMIC.l, 0.8);
    const n = o.hunks.length,
      gap = (d - c) / (n + 1);
    o.hunks.forEach((kept, i) => {
      const yy = c + gap * (i + 1);
      sheet += `<g data-hunk="${i}" data-kept="${kept ? 1 : 0}">${shape(on(PZ(z + 0.05), rectUV(a + 3, yy - 2, b - 3, yy + 2)), kept && !o.refused ? PALS.mint.l : CERAMIC.d, 0.4)}</g>`;
    });
    if (o.refused)
      sheet += `<g data-refused="1">${shape(on(PZ(z + 0.1), ellUV((a + b) / 2, (c + d) / 2, 9, 6, 16)), PALS.tomato.l, 0.9)}</g>`;
  }
  // the terminal: a rounded cream monitor on a short neck, its screen on the +y face showing the last command's fate
  const t = TERM,
    scr = o.term === undefined ? DARK.l : o.term.outcome === 'ok' ? PALS.mint.l : PALS.tomato.l,
    PROF = rrUV(t.y0 - 3, z1 + 3, t.y1, z1 + 14, 3, 4);
  let term =
    box(t.x0 + 3, t.y0 - 3, z1, t.x1 - 3, t.y1, z1 + 1, DARK, toneI, 0.8) +
    rod([(t.x0 + t.x1) / 2, t.y0 - 1, z1 + 1], [(t.x0 + t.x1) / 2, t.y0 - 1, z1 + 3.5], 1.4, DARK, toneI, 0.8);
  for (const [cx, n] of [
    [t.x0, [-1, 0, 0]],
    [t.x1, [1, 0, 0]],
  ] as [number, number[]][])
    if (vis(n)) term += shape(on(PX(cx), PROF), toneI(n, CERAMIC), 1);
  term += extrude(PROF, t.x0, t.x1, CERAMIC, toneI) + hullInk([...on(PX(t.x0), PROF), ...on(PX(t.x1), PROF)], 1.8);
  if (vis([0, 1, 0]))
    term += shape(on(PY(t.y1 + 0.05), rrUV(t.x0 + 1.8, z1 + 4.8, t.x1 - 1.8, z1 + 12.2, 1.8, 3)), scr, 0.8);
  return {
    desk: s,
    patch: `<g data-part="patch"${o.hunks ? ` data-hunks="${o.hunks.length}"` : ''}>${sheet}</g>`,
    terminal: `<g data-part="terminal"${o.term ? ` data-outcome="${o.term.outcome}"` : ''}>${term}</g>`,
  };
}

/** The test lamps: a traffic light on a pole. Real-object notes: a weighted base, a steel pole, a tall rounded dark
 * housing on top with a lamp per test stacked down its face, each under a hooded visor. */
function lamps(o: DeskOpts) {
  const { y0, y1, z0, z1 } = LAMPS,
    cx = LAMP_X,
    states = o.lamps ?? TEST_IDS.map(() => 'off' as LampState),
    hw = 4.5,
    PROF = rrUV(y0, z0, y1, z1, 1.8, 3);
  let s =
    cyl(cx, (y0 + y1) / 2, BH, BH + 1.6, 3.4, DARK, toneI, 1, 16) +
    rod([cx, (y0 + y1) / 2, BH + 1.6], [cx, (y0 + y1) / 2, z0], 1, METAL);
  for (const [x, n] of [
    [cx - hw, [-1, 0, 0]],
    [cx + hw, [1, 0, 0]],
  ] as [number, number[]][])
    if (vis(n)) s += shape(on(PX(x), PROF), toneI(n, DARK), 1);
  s +=
    extrude(PROF, cx - hw, cx + hw, DARK, toneI) + hullInk([...on(PX(cx - hw), PROF), ...on(PX(cx + hw), PROF)], 1.8);
  const step = (z1 - z0) / states.length;
  states.forEach((st, i) => {
    const fill = st === 'pass' ? PALS.mint.l : st === 'fail' ? PALS.tomato.l : CERAMIC.m,
      cz = z1 - step * (i + 0.5);
    s += `<g data-lamp="${esc(TEST_IDS[i])}" data-state="${st}">${faceY(y1 + 0.05, ellUV(cx, cz, 2.6, 2.6, 18), fill, 0.8)}</g>`;
    // the hood: a short visor over the lamp, open below
    s += shape(
      [
        [cx - 3.2, y1, cz + 2.9],
        [cx + 3.2, y1, cz + 2.9],
        [cx + 3.2, y1 + 3, cz + 1.8],
        [cx - 3.2, y1 + 3, cz + 1.8],
      ],
      DARK.l,
      0.8,
    );
  });
  return `<g data-part="lamps">${s}</g>`;
}

const pill = (p: number[], dx: number, dy: number, text: string, lit: boolean, scale: number, fill?: string) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), lit, scale, fill)}</g>`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 'S'}`;
const span = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [
  [x0, y0, z0],
  [x1, y1, z1],
];

/** The agent's desk. Shadows, then one sort over every part, then the pills. */
export const deskScene = (o: DeskOpts) => (ctx: SceneCtx) => {
  const scale = o.scale ?? 1,
    narrow = scale > 1.5,
    d = desk(o),
    [ax, ay] = AGENT,
    bot = robot(ax, ay, BH, 1, [ax, DESK.y0 + 4, DESK.z1 + 0.5]);
  let s =
    castShadow(boxCorners(CAB.x0, CAB.y0, BH, CAB.x1, CAB.y1, CAB.z1), BH, ctx.top) +
    castShadow(boxCorners(DESK.x0, DESK.y0, BH, DESK.x1, DESK.y1, DESK.z1), BH, ctx.top) +
    castShadow(boxCorners(ax - 7, ay - 6, BH, ax + 7, ay + 6, BH + 43), BH, ctx.top) +
    castShadow(boxCorners(LAMP_X - 1, LAMPS.y0 + 1, BH, LAMP_X + 1, LAMPS.y1 - 1, LAMPS.z0), BH, ctx.top) +
    castShadow(boxCorners(LAMP_X - 4.5, LAMPS.y0, LAMPS.z0, LAMP_X + 4.5, LAMPS.y1, LAMPS.z1), BH, ctx.top);
  s += byDepth([
    { box: span(CAB.x0 - 0.6, CAB.y0 - 0.6, BH, CAB.x1 + 0.6, CAB.y1 + 12, CAB.z1), svg: cabinet(o) },
    { box: span(LAMP_X - 4.5, LAMPS.y0, BH, LAMP_X + 4.5, LAMPS.y1 + 3, LAMPS.z1), svg: lamps(o) },
    { box: span(ax - 8, ay - 6, BH, ax + 8, ay + 6, BH + 49), svg: `<g data-part="agent">${bot.body}</g>` },
    { box: span(ax - 17, ay, DESK.z1 + 0.45, ax + 17, DESK.y0 + 6, BH + 33), svg: `<g class="arms">${bot.arms}</g>` },
    {
      box: span(DESK.x0 - 1, DESK.y0 - 1, BH, DESK.x1 + 1, DESK.y1 + 1, DESK.z1 + 0.4),
      svg: `<g>${d.desk}${d.patch}</g>`,
    },
    { box: span(TERM.x0, TERM.y0 - 3, DESK.z1, TERM.x1, TERM.y1, DESK.z1 + 14), svg: d.terminal },
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
        : // the pill names the command; its arguments live in the description, so it never covers the patch pill
          o.term.cmd.split(' ').slice(0, 2).join(' ').toUpperCase();
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

/** The home hero's plot: a small workbench with a patch on it, the robot behind it, and a traffic light with a red and
 * a green lamp. */
export function agentDeskPlot(x: number, y: number, top: SceneCtx['top']): string {
  const d = box(x - 12, y - 2, BH, x + 10, y + 8, BH + 8, WOOD, toneI, 1);
  const sheet = shape(on(PZ(BH + 8.2), rectUV(x - 8, y, x + 2, y + 6)), CERAMIC.l, 0.5);
  const stripe = shape(on(PZ(BH + 8.3), rectUV(x - 6, y + 2, x, y + 3.5)), PALS.mint.l, 0.3);
  const lx = x + 6,
    ly = y - 11,
    housing = box(lx - 2.6, ly - 1, BH + 10, lx + 2.6, ly + 1, BH + 21, DARK, toneI, 1);
  const lamp = (cz: number, c: string) => faceY(ly + 1.05, ellUV(lx, cz, 1.6, 1.6, 12), c, 0.6);
  const light =
    rod([lx, ly, BH], [lx, ly, BH + 10], 0.6, METAL) +
    housing +
    lamp(BH + 18, PALS.tomato.l) +
    lamp(BH + 13, PALS.mint.l);
  const bot = robot(x - 4, y - 7, BH, 0.36, [x - 4, y - 1, BH + 8.3]);
  return (
    castShadow(boxCorners(x - 12, y - 2, BH, x + 10, y + 8, BH + 8), BH, top) +
    byDepth([
      { at: [lx, ly, 0], svg: `<g>${light}</g>` },
      { at: [x - 4, y - 7, 0], svg: `<g>${bot.body}</g>` },
      { at: [x, y + 3, 0], svg: `<g>${d}${sheet}${stripe}</g>` },
      { at: [x - 4, y + 4, 0], svg: `<g>${bot.arms}</g>` },
    ])
  );
}
