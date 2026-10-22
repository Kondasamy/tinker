// Module 3's picture: the back office from module 2 (officeScene, composed, not forked) with the agent's four props,
// each turned on by a chapter flag (KTD8): a clipboard by the model (the plan, one tick per finished item), a step and
// context gauge on the host's desk, an in-tray of history papers that becomes one binder when the host compacts, and
// small helper desks for sub-agents. Everything is read off one run, up to the current step, through agentMessages.
import type { SceneCtx } from '../../lib/iso/IsoStage';
import { BH, boxCorners, esc, glassCase } from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  METAL,
  CERAMIC,
  CLEAR,
  DARK,
  WOOD,
  box,
  rod,
  shape,
  line,
  castShadow,
  hullInk,
  on,
  PX,
  toneI,
  tag,
  byDepth,
} from '../../lib/iso/core.js';
import { officeScene, officeLabel, type OfficeOpts } from './officeScene';
import { agentMessages } from './agentSequence';
import { keyOf, tokens, type Run, type Step } from '../../lib/agents/loop';

export { OFFICE_BOARD as AGENT_BOARD } from './officeScene';

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
const LIT = '#ffb627'; // the busy helper's screen
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

/** A clipboard standing on a small easel, facing the viewer (+y): a row per plan item, ticked when done, struck when dropped. */
export function clipboard(x: number, y: number, rows: { done: boolean; struck: boolean }[]): Part {
  const x0 = x - 13,
    x1 = x + 13,
    z0 = BH + 3,
    z1 = z0 + 30,
    Y = y + 1.5,
    F = Y + 0.1;
  const at = (pts: number[][]) => pts.map(([u, z]) => [u, F, z]); // a point on the paper: (x, z)
  let s =
    rod([x - 9, y - 5, BH], [x - 9, y, z0 + 12], 0.8, WOOD) +
    rod([x + 9, y - 5, BH], [x + 9, y, z0 + 12], 0.8, WOOD) +
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
    box(x - 5, Y, z1 - 6, x + 5, Y + 1.4, z1 - 2, METAL, toneI, 0.8);
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

const PAPER_MAX = 14; // shortcut: the stack stops growing here; the pill and caption still count every paper
/** A wooden in-tray: the history as a stack of papers; after compaction, one binder at the bottom. */
export function trayProp(x: number, y: number, papers: number, binder: boolean): Part {
  let s = box(x - 11, y - 8, BH, x + 11, y + 8, BH + 2, WOOD, toneI, 1),
    z = BH + 2;
  if (binder) {
    s += `<g class="binder">${box(x - 9, y - 6.5, z, x + 9, y + 6.5, z + 4, PALS.cobalt, toneI, 1) + box(x + 9, y - 6.5, z, x + 9.8, y + 6.5, z + 4, PALS.cobalt, toneI, 0.7)}</g>`;
    z += 4;
  }
  const drawn = Math.min(papers, PAPER_MAX);
  for (let i = 0; i < drawn; i++) {
    const j = (((i * 7) % 5) - 2) * 0.5; // a loose, hand-stacked pile
    s += `<g class="paper">${box(x - 8 + j, y - 6 - j * 0.6, z, x + 8 + j, y + 6 - j * 0.6, z + 0.9, CERAMIC, toneI, 0.5)}</g>`;
    z += 0.9;
  }
  return { at: [x, y, 0], svg: `<g data-prop="tray" data-papers="${papers}" data-binder="${binder ? 1 : 0}">${s}</g>` };
}

/** A small helper's desk with its own little model; lit while it works, a sheet on the desk once it has replied. */
export function helperDesk(x: number, y: number, busy: boolean, done: boolean): Part {
  const z1 = BH + 9;
  let s =
    box(x - 9, y - 7, BH, x + 9, y + 7, z1, WOOD, toneI, 1) +
    box(x - 6, y - 4, z1, x + 2, y + 4, z1 + 8, PALS.blush, toneI, 1) +
    shape(
      on(PX(x + 2.05), [
        [y - 2.6, z1 + 2],
        [y + 2.6, z1 + 2],
        [y + 2.6, z1 + 6.5],
        [y - 2.6, z1 + 6.5],
      ]),
      busy ? LIT : '#1d2a26',
      0.6,
    );
  if (done) s += box(x + 3, y - 1, z1, x + 8, y + 5, z1 + 0.6, CERAMIC, toneI, 0.5);
  return { at: [x, y, 0], svg: `<g data-prop="helper"${busy ? ' data-busy="1"' : ''}>${s}</g>` };
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
const PILLS = /<g class="(block|check|msg)-tag"/;

/** The office with the props turned on. Words go only in pills; on phones (scale > 1) the caption carries the readouts. */
export const agentScene = (o: AgentOpts) => (ctx: SceneCtx) => {
  const { run, upTo = run.steps.length, scale = 1 } = o,
    narrow = scale > 1;
  const st = agentState(o);
  const office = officeScene({ ...o, msgs: agentMessages(run), upTo, tools: toolsOf(o) })(ctx);
  // draw the props over the office's art but under its name pills, so no prop hides a pill
  const cut = office.search(PILLS),
    art = cut < 0 ? office : office.slice(0, cut),
    names = cut < 0 ? '' : office.slice(cut);
  const parts: Part[] = [],
    pills: string[] = [],
    shadows: string[] = [];
  const shade = (x0: number, y0: number, x1: number, y1: number, h: number, z = BH) =>
    shadows.push(castShadow(boxCorners(x0, y0, z, x1, y1, z + h), z, ctx.top));
  if (o.clipboard && st.plan) {
    parts.push(clipboard(CLIP[0], CLIP[1], st.plan.rows));
    shade(CLIP[0] - 13, CLIP[1] - 5, CLIP[0] + 13, CLIP[1] + 2, 33);
    if (!narrow)
      pills.push(
        pill([CLIP[0] + 13, CLIP[1] + 2, BH + 26], 34, -2, `PLAN ${st.plan.ticks}/${st.plan.items}`, false, scale),
      );
  }
  if (o.gauge && st.gauge) {
    parts.push(gaugeProp(GAUGE[0], GAUGE[1], st.gauge.steps, st.gauge.context, st.over));
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
  }
  return art + shadows.join('') + byDepth(parts) + names + pills.join('');
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
