// Module 3's picture: the back office from module 2 (officeScene, composed, not forked) with the agent's four props,
// each turned on by a chapter flag (KTD8): a clipboard on a stand by the model (the plan, one tick per finished item), a
// pair of dials on the host's machine (steps and context), an in-tray of history papers that becomes one ring binder when
// the host compacts, and small helper desks for sub-agents, a clerk at the one working. The support lead stands at the
// counter in the employee's place, handing the case across it in a manila folder (the hero). Everything is read off one
// run, up to the current step, through agentMessages.
import type { SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, glassCase, sayAt } from '../../lib/iso/blocks';
import { SKIN, hexa, modelIn, person, type Look } from '../../lib/iso/figures';
import {
  INK,
  PALS,
  METAL,
  CERAMIC,
  CLEAR,
  DARK,
  WOOD,
  box,
  cyl,
  rod,
  shape,
  line,
  fill as paint,
  pd,
  on,
  PX,
  ellUV,
  vis,
  castShadow,
  hullInk,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { OFFICE_PARTS, officeScene, officeLabel, type OfficeOpts } from './officeScene';
import { EMPLOYEE, officeLayers, withoutPerson } from './officeLayers';
import { crate } from './crateScene';
import { agentMessages } from './agentSequence';
import { keyOf, tokens, type Run, type Step } from '../../lib/agents/loop';

export { OFFICE_BOARD as AGENT_BOARD } from './officeScene';

/** The parts a step's callout may name: the office's, then the props (clipboard, gauge, in-tray, helper desks). */
export const AGENT_PARTS = [...OFFICE_PARTS, 'plan', 'gauge', 'tray', 'helpers'] as const;

export interface AgentOpts extends Omit<OfficeOpts, 'msgs' | 'upTo' | 'tools'> {
  run: Run;
  /** run steps shown so far (default all); the last one is the current step */
  upTo?: number;
  /** tool definitions on the model (default: what the run sent it) */
  tools?: number;
  /** the plan on a clipboard by the model */
  clipboard?: boolean;
  /** the host's budgets, drawn as a gauge on its desk: model turns per run, and tokens per turn's input */
  gauge?: { steps: number; context: number };
  /** the history as papers in an in-tray; a binder once compacted */
  tray?: boolean;
  /** helper desks, one per delegated order (one desk and a count pill on phones) */
  helpers?: boolean;
}

const fill = (used: number, budget: number) => (budget > 0 ? Math.min(1, used / budget) : 0);
const DONE = /:(ok|in|out)$/; // result outcomes that finish a step; error, invalid, rejected and stopped do not

/** What the props show after `upTo` steps. Pure, so the tests can check it without drawing. */
export function agentState({ run, upTo = run.steps.length, gauge }: Pick<AgentOpts, 'run' | 'upTo' | 'gauge'>) {
  const shown = run.steps.slice(0, upTo),
    last = shown.at(-1);
  const of = <K extends Step['kind']>(k: K) => shown.filter((s): s is Extract<Step, { kind: K }> => s.kind === k);

  // the plan: every item any plan named, in first-seen order; items the latest plan dropped are struck. A call outside
  // the plan is a change of plan on the spot: it is added after the next unfinished item, which it replaces (struck).
  const plans = of('plan'),
    finished = new Set<string>(),
    rows: { item: string; done: boolean; struck: boolean }[] = [];
  for (const s of shown) {
    if (s.kind === 'plan') {
      // a new item goes in after the one before it in its plan
      s.items.forEach(
        (item, i) =>
          rows.some(r => r.item === item) ||
          rows.splice(rows.findIndex(r => r.item === s.items[i - 1]) + 1, 0, { item, done: false, struck: false }),
      );
      for (const r of rows) r.struck = !s.items.includes(r.item);
    } else if (s.kind === 'proposal' && rows.length && !rows.some(r => r.item === keyOf(s.call))) {
      const next = rows.findIndex(r => !r.struck && !finished.has(r.item));
      if (next >= 0) rows[next].struck = true;
      rows.splice(next < 0 ? rows.length : next + 1, 0, { item: keyOf(s.call), done: false, struck: false });
    } else if (s.kind === 'result' && DONE.test(s.key)) finished.add(s.key.slice(0, s.key.lastIndexOf(':')));
  }
  for (const r of rows) r.done = finished.has(r.item);
  const live = rows.filter(r => !r.struck);
  const plan = plans.length ? { rows, ticks: live.filter(r => r.done).length, items: live.length } : null;

  // model turns so far, and the latest turn's input (the context the model read)
  let turn = -1;
  for (const s of shown) if ('turn' in s) turn = s.turn;
  const turns = turn + 1,
    metered = run.meter.find(m => m.turn === turn);
  let context = metered?.input ?? 0;
  // a budget stop before the step budget ran out is the context budget: the turn that would have gone over, rebuilt by the
  // loop's own rule (full history: the last context, then its reply and everything added after it)
  const stopped = last?.kind === 'budget' && !!gauge && turns < gauge.steps;
  if (stopped) {
    const m = run.meter.at(-1)!,
      from = shown.findIndex(s => 'turn' in s && s.turn === m.turn) + 1,
      after = shown.slice(from);
    const added = after.flatMap(s => (s.kind === 'result' ? [s.result.content[0].text] : []));
    const decided =
      shown[from - 1]?.kind === 'plan'
        ? [`The plan was ${after.find(s => s.kind === 'approval')?.decision === 'reject' ? 'rejected' : 'approved'}.`]
        : [];
    // shortcut: a compaction after the last turn resets the history; no recording overflows after one, so show it as full
    context =
      after.some(s => s.kind === 'compact') && gauge
        ? gauge.context
        : tokens([m.context, m.reply, ...decided, ...added].join('\n'));
  }

  const over = stopped || (!!gauge && gauge.context > 0 && context > gauge.context);

  // the history the model re-reads each turn: one paper per model reply and per result; compaction binds them into one
  let papers = 0,
    binder = false;
  const seen = new Set<number>();
  shown.forEach((s, i) => {
    if (s.kind === 'compact') {
      papers = 0;
      binder = true;
      return;
    }
    if ('turn' in s && !seen.has(s.turn)) {
      seen.add(s.turn);
      papers++;
    }
    const next = run.steps[i + 1];
    if (
      s.kind === 'result' ||
      (s.kind === 'plan' && next?.kind !== 'approval') ||
      (s.kind === 'approval' && s.decision !== 'pending' && shown[i - 1]?.kind === 'plan')
    )
      papers++;
  });

  const helpers = run.steps.filter(s => s.kind === 'helper').length;
  return {
    last,
    plan,
    turns,
    context,
    over,
    gauge: gauge && { steps: fill(turns, gauge.steps), context: over ? 1 : fill(context, gauge.context) },
    tray: { papers, binder },
    helpers: { total: helpers, sent: of('helper').length, busy: last?.kind === 'helper' },
  };
}

type Part = { at: number[]; svg: string };
const CLIP = [232, 180],
  GAUGE = [150, 120],
  TRAY = [186, 196];
const DESKS = [
  [208, 30],
  [240, 30],
  [272, 30],
  [208, 64],
  [240, 64],
  [272, 64],
];

/** A clipboard on a stand, facing the viewer (+y): a row per plan item, ticked when done, struck when dropped.
 * Real-object notes: an A-frame easel (two splayed front legs, a back prop) with a ledge the board rests on. */
export function clipboard(x: number, y: number, rows: { done: boolean; struck: boolean }[]): Part {
  const x0 = x - 13,
    x1 = x + 13,
    z0 = BH + 3,
    z1 = z0 + 30,
    Y = y + 1.5,
    F = Y + 0.1;
  const at = (pts: number[][]) => pts.map(([u, z]) => [u, F, z]); // a point on the paper: (x, z)
  let s =
    rod([x, y - 9, BH], [x, y - 0.4, z1 - 5], 0.8, WOOD) +
    rod([x - 12, y - 1, BH], [x - 8, y - 0.4, z1 - 3], 0.9, WOOD) +
    rod([x + 12, y - 1, BH], [x + 8, y - 0.4, z1 - 3], 0.9, WOOD) +
    box(x0, y, z0, x1, Y, z1, WOOD, toneI, 1) +
    shape(
      at([
        [x0 + 2, z0 + 2],
        [x1 - 2, z0 + 2],
        [x1 - 2, z1 - 4],
        [x0 + 2, z1 - 4],
      ]),
      CERAMIC.l,
      0.7,
    ) +
    box(x - 5, Y, z1 - 6, x + 5, Y + 1.4, z1 - 2, METAL, toneI, 0.8) +
    box(x0 - 1.5, y - 0.6, z0 - 1.6, x1 + 1.5, Y + 2.4, z0, WOOD, toneI, 0.8);
  const n = Math.max(rows.length, 4),
    gap = Math.min(5, 22 / n);
  rows.forEach((r, i) => {
    const z = z1 - 9 - i * gap;
    s +=
      shape(
        at([
          [x0 + 4, z - 1.5],
          [x0 + 7, z - 1.5],
          [x0 + 7, z + 1.5],
          [x0 + 4, z + 1.5],
        ]),
        '#fff',
        0.5,
      ) +
      line(
        at([
          [x0 + 9, z],
          [x1 - 4, z],
        ]),
        0.6,
      ).replace(INK, DARK.l);
    if (r.done)
      s += `<g class="tick">${line(
        at([
          [x0 + 3.6, z + 0.3],
          [x0 + 5.2, z - 1.7],
          [x0 + 8.2, z + 2.8],
        ]),
        1.5,
      ).replace(INK, PALS.mint.d)}</g>`;
    if (r.struck)
      s += `<g class="struck">${line(
        at([
          [x0 + 3, z],
          [x1 - 3, z],
        ]),
        1.5,
      ).replace(INK, PALS.tomato.m)}</g>`;
  });
  return {
    at: [x, y, 0],
    svg: `<g data-prop="clipboard" data-rows="${rows.length}" data-ticks="${rows.filter(r => r.done && !r.struck).length}">${s}</g>`,
  };
}

/** Two glass tubes on the host's desk: model turns used of the step budget, and this turn's context of the context budget. */
export function gaugeProp(x: number, y: number, steps: number, context: number, over: boolean): Part {
  const z0 = BH + 16,
    z1 = z0 + 18,
    tube = (yy: number, k: number, m: typeof DARK) =>
      glassCase(
        x - 3,
        yy - 3,
        z0,
        x + 3,
        yy + 3,
        z1,
        CLEAR,
        k > 0 ? box(x - 2.4, yy - 2.4, z0 + 0.1, x + 2.4, yy + 2.4, z0 + 0.1 + (z1 - z0 - 0.4) * k, m, toneI, 0.6) : '',
      ) + hullInk(boxCorners(x - 3, yy - 3, z0, x + 3, yy + 3, z1), 1.4);
  const s =
    box(x - 4.5, y - 11, z0, x + 4.5, y + 3, z0 + 1.5, DARK, toneI, 0.8) +
    tube(y - 7, steps, PALS.cobalt) +
    tube(y, context, over ? PALS.tomato : PALS.mustard);
  return {
    at: [x, y, 1],
    svg: `<g data-prop="gauge" data-steps="${steps.toFixed(3)}" data-context="${context.toFixed(3)}">${s}</g>`,
  };
}

/** The host's budgets as two round dials on a post (the agents scene's gauge): turns used of the step budget (cobalt
 * needle) and this turn's context of the context budget (mustard, tomato once over). Real-object notes: a steel bezel,
 * a white face with a red zone at the top of its sweep, a needle from a centre hub, no numerals. z0: what it stands on. */
export function dialGauge(x: number, y: number, steps: number, context: number, over: boolean, z0 = BH + 26): Part {
  const zc = z0 + 9,
    sx = vis([1, 0, 0]) ? 1 : -1,
    R = 3.9;
  const dial = (yy: number, k: number, needle: string) => {
    const F = x + sx * 1.05,
      at = (a: number, r: number) => [F, yy + Math.cos(a) * r, zc + Math.sin(a) * r];
    // the sweep runs from lower left (empty) over the top to lower right (full); the needle's angle is the fill
    const ang = (t: number) => ((225 - 270 * t) * Math.PI) / 180;
    const zone: number[][] = [];
    for (let i = 0; i <= 6; i++) zone.push(at(ang(0.8 + (0.2 * i) / 6), R - 0.6));
    for (let i = 6; i >= 0; i--) zone.push(at(ang(0.8 + (0.2 * i) / 6), R - 1.8));
    return (
      rod([x - 1, yy, zc], [x + 1, yy, zc], R + 0.7, METAL, toneI, 0.9, R + 0.7, 18) +
      paint(pd(on(PX(F), ellUV(yy, zc, R, R, 18))), CERAMIC.l) +
      paint(pd(zone), PALS.tomato.l) +
      `<path d="${pd([[F, yy, zc], at(ang(k), R - 0.9)], false)}" fill="none" stroke="${needle}" stroke-width="1.1" stroke-linecap="round"/>` +
      paint(pd(on(PX(F + sx * 0.05), ellUV(yy, zc, 0.7, 0.7, 8))), INK)
    );
  };
  const s =
    box(x - 3, y - 11.5, z0, x + 3, y + 5.5, z0 + 1.2, DARK, toneI, 0.8) +
    rod([x, y - 7, z0 + 1.2], [x, y - 7, zc - 3], 0.6, DARK) +
    rod([x, y + 1.6, z0 + 1.2], [x, y + 1.6, zc - 3], 0.6, DARK) +
    dial(y - 7, steps, PALS.cobalt.d) +
    dial(y + 1.6, context, over ? PALS.tomato.m : PALS.mustard.d);
  return {
    at: [x, y, 1],
    svg: `<g data-prop="gauge" data-steps="${steps.toFixed(3)}" data-context="${context.toFixed(3)}">${s}</g>`,
  };
}

const PAPER_MAX = 14; // shortcut: the stack stops growing here; the pill and caption still count every paper
/** A wooden in-tray with low walls: the history as a stack of papers; after compaction, one ring binder at the bottom. */
export function trayProp(x: number, y: number, papers: number, binder: boolean): Part {
  const x0 = x - 11,
    x1 = x + 11,
    y0 = y - 8,
    y1 = y + 8,
    zw = BH + 4.5;
  // the near walls (toward the viewer in this turn) go on after the papers
  const nx = vis([1, 0, 0]) ? x1 : x0,
    ny = vis([0, 1, 0]) ? y1 : y0;
  const wallX = (X: number) => box(X - 0.6, y0, BH + 1, X + 0.6, y1, zw, WOOD, toneI, 0.7),
    wallY = (Y: number) => box(x0, Y - 0.6, BH + 1, x1, Y + 0.6, zw, WOOD, toneI, 0.7);
  let s = box(x0, y0, BH, x1, y1, BH + 1, WOOD, toneI, 1) + wallX(x0 + x1 - nx) + wallY(y0 + y1 - ny),
    z = BH + 1;
  if (binder) {
    // a closed ring binder lying flat: card covers, a round spine toward the viewer with a finger hole and a label
    const sx = nx === x1 ? 1 : -1,
      sp = x + sx * 8.6,
      face = sp + sx * 2.15;
    s += `<g class="binder">${
      box(x - 9, y - 6.5, z, x + 9, y + 6.5, z + 4, PALS.cobalt, toneI, 1) +
      rod([sp, y - 6.5, z + 2], [sp, y + 6.5, z + 2], 2.1, PALS.cobalt, toneI, 1, 2.1, 12) +
      shape(
        on(PX(face), [
          [y - 4.5, z + 1.2],
          [y + 1, z + 1.2],
          [y + 1, z + 2.8],
          [y - 4.5, z + 2.8],
        ]),
        CERAMIC.l,
        0.5,
      ) +
      paint(pd(on(PX(face), ellUV(y + 3.6, z + 2, 0.9, 0.9, 10))), DARK.d)
    }</g>`;
    z += 4;
  }
  const drawn = Math.min(papers, PAPER_MAX);
  for (let i = 0; i < drawn; i++) {
    const j = (((i * 7) % 5) - 2) * 0.5; // a loose, hand-stacked pile
    s += `<g class="paper">${box(x - 8 + j, y - 6 - j * 0.6, z, x + 8 + j, y + 6 - j * 0.6, z + 0.9, CERAMIC, toneI, 0.5)}</g>`;
    z += 0.9;
  }
  s += wallX(nx) + wallY(ny);
  return { at: [x, y, 0], svg: `<g data-prop="tray" data-papers="${papers}" data-binder="${binder ? 1 : 0}">${s}</g>` };
}

/** A small helper's desk with its own little model; lit while it works, a sheet on the desk once it has replied. */
export function helperDesk(x: number, y: number, busy: boolean, done: boolean): Part {
  const z1 = BH + 9;
  let s =
    box(x - 9, y - 7, BH, x + 9, y + 7, z1, WOOD, toneI, 1) +
    modelIn([x - 6, y - 4, z1, x + 2, y + 4, z1 + 8], busy ? 'ok' : undefined).items[0].svg;
  if (done) s += box(x + 3, y - 1, z1, x + 8, y + 5, z1 + 0.6, CERAMIC, toneI, 0.5);
  return { at: [x, y, 0], svg: `<g data-prop="helper"${busy ? ' data-busy="1"' : ''}>${s}</g>` };
}

type Item = { at?: number[]; box: number[][]; svg: string };
const corners = (c: number[][]) => [0, 1].map(e => [0, 1, 2].map(k => (e ? Math.max : Math.min)(...c.map(p => p[k]))));
/** The support lead stands at the counter's far corner, side-on to the viewer, holding the case out over it (the
 * folder 17 above the floor, in both hands). Once helpers take over, the lead has gone and the case lies on the counter. */
const LEAD = { x: 167, y: 222, facing: 140 };
const HELD = { ...LEAD, z: 17 },
  LEFT = { x: 161, y: 243, facing: 172, z: 14 };

/** The hero: the case in a manila folder. Real-object notes: two card covers with a tab on the back edge, the papers'
 * edges showing, a red tie round the middle. It runs 3 to 18 along `facing` from (x, y), its underside z above BH. */
function caseFolder(o: { x: number; y: number; facing: number; z: number }): Item {
  const t = (o.facing * Math.PI) / 180,
    F = [Math.cos(t), Math.sin(t)],
    S = [-F[1], F[0]];
  const at = (a: number, b: number, c: number) => [
    o.x + F[0] * a + S[0] * b,
    o.y + F[1] * a + S[1] * b,
    BH + o.z - 17 + c,
  ];
  const slab = (a0: number, a1: number, b0: number, b1: number, c0: number, c1: number) => [
    at(a0, b0, c0),
    at(a1, b0, c0),
    at(a1, b1, c0),
    at(a0, b1, c0),
    at(a0, b0, c1),
    at(a1, b0, c1),
    at(a1, b1, c1),
    at(a0, b1, c1),
  ];
  const MANILA = { l: '#f1d89c', m: '#dcbc72', d: '#a8884a' };
  const body = slab(3, 18, -6, 6, 17, 18.1);
  const s =
    hexa(slab(3.5, 17.5, -5.6, 6.4, 17.3, 17.8), CERAMIC, 0.5) +
    hexa(body, MANILA, 1) +
    hexa(slab(17, 19.6, -5, -1, 17.1, 18), MANILA, 0.8) +
    hexa(slab(9.8, 11.4, -6.2, 6.2, 16.9, 18.25), PALS.tomato, 0.8);
  return { box: corners(body), svg: `<g data-prop="case">${s}</g>` };
}

/** A helper clerk: seated on a stool on the near side of the working helper's desk, facing it, below the helpers'
 * pill (which floats over the third desk). */
const CLERK: Look = { skin: SKIN[3], top: PALS.mustard.l, legs: '#4a4642', hair: '#2b231c', cut: 'ponytail' };
function clerk(x: number, y: number, top: SceneCtx['top']): { shadow: string; items: Item[] } {
  const py = y + 13.5,
    p = person({ x, y: py, facing: '-y', pose: 'sit', look: CLERK, holding: null });
  return {
    shadow: castShadow(boxCorners(x - 2.6, py - 2.6, BH, x + 2.6, py + 2.6, BH + 7), BH, top) + p.shadow,
    items: [
      {
        box: [
          [x - 3, py - 3, BH],
          [x + 3, py + 3, BH + 7],
        ],
        svg: cyl(x, py, BH, BH + 7, 2.6, DARK, toneI, 0.8, 12),
      },
      ...p.items,
    ],
  };
}

/** tool definitions on the model: what the run sent it, or for a script (no model) the tools it called */
const toolsOf = ({ run, tools }: AgentOpts) => {
  const send = run.steps.find(s => s.kind === 'send');
  return (
    tools ??
    (send?.kind === 'send'
      ? send.tools.length
      : new Set(run.steps.flatMap(s => (s.kind === 'call' ? [s.call.name] : []))).size)
  );
};
const pill = (p: number[], dx: number, dy: number, text: string, on: boolean, scale: number) =>
  `<g class="block-tag" aria-hidden="true" pointer-events="none">${tag(p, dx, dy, esc(text), on, scale)}</g>`;

/** The office with the props turned on. Words go only in pills; on phones (scale > 1) the caption carries the readouts. */
export const agentScene = (o: AgentOpts) => (ctx: SceneCtx) => {
  const { run, upTo = run.steps.length, scale = 1 } = o,
    narrow = scale > 1;
  const st = agentState(o);
  // the support lead takes the employee's place: behind the counter, handing the case across it
  const office = withoutPerson(
    officeScene({ ...o, msgs: agentMessages(run), upTo, tools: toolsOf(o) })(ctx),
    'employee',
  );
  // the props' shadows join the office's floor layer; their bodies go over its art but under its name pills
  const layers = officeLayers(office),
    { art, names, callout } = layers,
    floor = layers.floor.replace(person(EMPLOYEE).shadow, ''); // the employee's spot stays empty
  // with helpers on, the lead has handed the case over and gone (the support lead's look is the kit's heaviest
  // person, and the five helper desks leave no room for it in the scene's size budget)
  const handing = !(o.helpers && st.helpers.total),
    lead = handing ? person({ ...LEAD, look: 'supportLead', pose: 'carry', holding: null }) : null;
  const parts: (Part | Item)[] = [...(lead?.items ?? []), caseFolder(handing ? HELD : LEFT)],
    pills: string[] = [],
    calls: string[] = [],
    shadows: string[] = lead ? [lead.shadow] : [];
  const shade = (x0: number, y0: number, x1: number, y1: number, h: number, z = BH) =>
    shadows.push(castShadow(boxCorners(x0, y0, z, x1, y1, z + h), z, ctx.top));
  if (o.clipboard && st.plan) {
    parts.push(clipboard(CLIP[0], CLIP[1], st.plan.rows));
    shade(CLIP[0] - 13, CLIP[1] - 5, CLIP[0] + 13, CLIP[1] + 2, 33);
    calls.push(sayAt(o.say, 'plan', [CLIP[0] + 13, CLIP[1] + 2, BH + 26], -2, scale));
    if (!narrow)
      pills.push(
        pill([CLIP[0] + 13, CLIP[1] + 2, BH + 26], 34, -2, `PLAN ${st.plan.ticks}/${st.plan.items}`, false, scale),
      );
  }
  if (o.gauge && st.gauge) {
    parts.push(dialGauge(GAUGE[0], GAUGE[1], st.gauge.steps, st.gauge.context, st.over));
    calls.push(sayAt(o.say, 'gauge', [GAUGE[0] + 3, GAUGE[1] - 3, BH + 30], 14, scale));
    if (!narrow)
      pills.push(
        pill(
          [GAUGE[0] + 3, GAUGE[1] - 3, BH + 30],
          52,
          14,
          `STEP ${st.turns}/${o.gauge.steps} · CONTEXT ${st.over ? 'OVER' : `${Math.round(st.gauge.context * 100)}%`}`,
          st.over,
          scale,
        ),
      );
  }
  if (o.tray) {
    parts.push(trayProp(TRAY[0], TRAY[1], st.tray.papers, st.tray.binder));
    shade(TRAY[0] - 11, TRAY[1] - 8, TRAY[0] + 11, TRAY[1] + 8, 3 + Math.min(st.tray.papers, PAPER_MAX) * 0.9);
    calls.push(sayAt(o.say, 'tray', [TRAY[0], TRAY[1] + 6, BH + 4], 24, scale));
    if (!narrow)
      pills.push(
        pill(
          [TRAY[0], TRAY[1] + 6, BH + 4],
          6,
          24,
          st.tray.binder ? `SUMMARY + ${st.tray.papers}` : `HISTORY ${st.tray.papers}`,
          false,
          scale,
        ),
      );
  }
  if (o.helpers && st.helpers.total) {
    const desks = narrow ? 1 : Math.min(st.helpers.total, DESKS.length);
    for (let i = 0; i < desks; i++) {
      const [x, y] = DESKS[i];
      // a phone's one desk stands for them all: busy while any helper works, a sheet once one has replied
      const busy = narrow ? st.helpers.busy : st.helpers.busy && st.helpers.sent - 1 === i,
        done = narrow ? st.helpers.sent > 0 && !busy : i < st.helpers.sent - (st.helpers.busy ? 1 : 0);
      parts.push(helperDesk(x, y, busy, done));
      shade(x - 9, y - 7, x + 9, y + 7, 17);
      // shortcut: a clerk sits only at the working desk; one at every desk would break the scene's size budget
      if (busy) {
        const c = clerk(x, y, ctx.top);
        parts.push(...c.items);
        shadows.push(c.shadow);
      }
    }
    const [x, y] = DESKS[narrow ? 0 : Math.min(desks, 3) - 1];
    pills.push(
      pill(
        [x, y, BH + 17],
        0,
        -16,
        narrow ? `HELPERS ×${st.helpers.total}` : `HELPERS ${st.helpers.sent}/${st.helpers.total}`,
        st.helpers.busy,
        scale,
      ),
    );
    calls.push(sayAt(o.say, 'helpers', [x, y, BH + 17], -16, scale));
  }
  // the stock's crates stand in front of the clipboard: draw them again over it (the office sorts its own parts alone)
  const front =
    o.clipboard && st.plan
      ? crate(236, 214, undefined, BH, 9, 14) +
        crate(236, 214, undefined, BH + 14, 9, 14) +
        crate(256, 214, undefined, BH, 9, 14)
      : '';
  return floor + shadows.join('') + art + byDepth(parts) + front + names + pills.join('') + callout + calls.join('');
};

/** The picture in words, for its aria-label: the office, then each prop that is on. */
export function agentLabel(o: AgentOpts): string {
  const st = agentState(o),
    msgs = agentMessages(o.run);
  const say = [officeLabel({ ...o, msgs, upTo: o.upTo ?? msgs.length, tools: toolsOf(o) })];
  if (o.clipboard && st.plan)
    say.push(
      `A clipboard holds the plan: ${st.plan.ticks} of ${st.plan.items} items ticked${st.plan.rows.some(r => r.struck) ? `, ${st.plan.rows.filter(r => r.struck).length} struck out` : ''}.`,
    );
  if (o.gauge)
    say.push(
      `The host's gauge: turn ${st.turns} of ${o.gauge.steps}; this turn's context ${st.over ? 'over' : `${st.context} of`} the ${o.gauge.context}-token budget.`,
    );
  if (o.tray)
    say.push(
      st.tray.binder
        ? `The in-tray: one binder of summarised history and ${st.tray.papers} new papers.`
        : `The in-tray: ${st.tray.papers} papers of history.`,
    );
  if (o.helpers && st.helpers.total)
    say.push(`${st.helpers.sent} of ${st.helpers.total} orders handed to helper desks.`);
  return say.join(' ');
}
