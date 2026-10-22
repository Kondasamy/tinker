// Chapter 4: order for the cache (R10.4). Mara's three questions in one conversation, every document stuffed. With a
// plain system prompt the prefix repeats and most of each call is a cache hit; with the ticket's time stamped into the
// system prompt, everything after the stamp misses. The puzzle: reorder the turn's five blocks for the best hit rate.
// Every ordering that reaches it is accepted (WINNERS, computed over all orderings). Hits are computed by the engine's
// cacheHit; costs use the dated multipliers in facts.json, in relative units (a fresh input token costs 1).
// shortcut: the block order isn't in the signature, so every order shows the house order's recorded answers; the
// chapter is about cost, and moving whole blocks keeps every fact in the window. Record per order if a lesson needs it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { DOMAINS, type Meter, type Run } from '../../lib/context/loop';
import { cacheHit, cost, entryOf, OUTPUT, READ, WRITE, type Cached, type Hit } from '../../lib/context/cache';
import { count, SYSTEM, type Part } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf } from './kit';

const MODULE = 'context',
  ID = '04-order-for-the-cache';
const D = DOMAINS[ID];
const SESSIONS = D.sessions![0],
  SESSION = SESSIONS[0];
export type Block = 'tools' | 'rules' | 'time' | 'docs' | 'chat';
export const BLOCK_NAME: Record<Block, string> = {
  tools: 'Tool definitions',
  rules: 'Instructions',
  time: 'Ticket time',
  docs: 'Every document',
  chat: 'Conversation',
};
/** the house order: tools → system (instructions, then the stamp) → messages (documents, then the conversation) */
export const HOUSE: Block[] = ['tools', 'rules', 'time', 'docs', 'chat'];
const LIFETIME = '5m' as const;
/** breakpoints the host may set (facts: up to 4); it closes the last four blocks, which also covers the first */
const MAX_MARKS = Number(fact('cache-breakpoints').value);

const runFor = (dated: boolean) =>
  runOf({ sessions: SESSIONS, tools: true, retrieval: 'stuff', system: dated ? 'dated' : 'plain' });

/** One call's window cut into blocks; the dated system prompt splits into the instructions and the stamp after them. */
function blocksOf(m: Meter): Record<Block, Part[]> {
  const parts = m.window.parts,
    sys = parts.find(p => p.kind === 'system')!;
  const stamp = sys.text.slice(SYSTEM.length).trim();
  return {
    tools: parts.filter(p => p.kind === 'tools'),
    rules: [{ kind: 'system', label: 'Instructions', text: SYSTEM, tokens: count(SYSTEM) }],
    time: stamp ? [{ kind: 'system', label: 'Ticket time', text: stamp, tokens: count(stamp) }] : [],
    docs: parts.filter(p => p.kind === 'docs'),
    chat: parts.filter(p => p.kind === 'history' || p.kind === 'message'),
  };
}

export interface Priced {
  run: Run;
  hits: Hit[];
  read: number;
  tokens: number;
  rate: number;
  cost: number;
  full: number;
}
/** The session's three calls with the blocks in this order: each call's hit, the hit rate and the cost. */
const priced = new Map<string, Priced>();
export function price(order: Block[], dated = true): Priced {
  const k = `${dated}:${order.join(',')}`;
  if (!priced.has(k)) priced.set(k, priceOf(order, dated));
  return priced.get(k)!;
}
function priceOf(order: Block[], dated: boolean): Priced {
  const r = runFor(dated);
  const live: Cached[] = []; // three calls a minute apart: every entry outlives the session
  const meter = r.meter.map(m => {
    const b = blocksOf(m),
      parts = order.flatMap(k => b[k]);
    const ends: number[] = [];
    order.forEach(k => {
      if (b[k].length) ends.push(order.slice(0, order.indexOf(k) + 1).reduce((n, j) => n + b[j].length, 0) - 1);
    });
    const hit = cacheHit(live, parts, ['end']);
    live.push(entryOf(hit, parts, ends.slice(-MAX_MARKS)));
    const tokens = parts.reduce((n, p) => n + p.tokens, 0);
    return { ...m, window: { parts, tokens }, hit, cost: cost(hit, m.output, LIFETIME) };
  });
  const tokens = meter.reduce((n, m) => n + m.window.tokens, 0),
    read = meter.reduce((n, m) => n + m.hit.read, 0);
  return {
    run: { ...r, meter },
    hits: meter.map(m => m.hit),
    read,
    tokens,
    rate: tokens ? read / tokens : 0,
    cost: meter.reduce((n, m) => n + m.cost, 0),
    full: meter.reduce((n, m) => n + m.window.tokens + m.output * OUTPUT, 0),
  };
}

const perms = <T,>(xs: T[]): T[][] =>
  xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
/** every order of the five blocks, the best hit rate any reaches, and every order that reaches it */
export const ORDERS = perms(HOUSE);
export const BEST = Math.max(...ORDERS.map(o => price(o).read));
export const WINNERS = ORDERS.filter(o => price(o).read === BEST);
export const solved = (o: Block[]) => price(o).read === BEST;

const PLAIN = price(
    HOUSE.filter(b => b !== 'time'),
    false,
  ),
  DATED = price(HOUSE);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const units = (x: number) => num(Math.round(x));
const TOOLS_RULES = DATED.hits[1].read;
const P1 = {
  question:
    'The team stamps each ticket’s time into the system prompt, right after the instructions, so the assistant knows when each question arrived. What happens to the cache?',
  options: [
    'Almost nothing: only one short line changes each call',
    'Hits stop at the stamp: the documents and the conversation after it are written again on every call',
    'Every hit is lost, the tool definitions included',
  ],
};
const OUT1 = TOOLS_RULES === 0 ? 2 : DATED.rate < PLAIN.rate / 2 ? 1 : 0;

const QUIZ = {
  question:
    'An assistant’s prompt starts with the user’s name and today’s date, then 5,000 tokens of fixed instructions and a product list. How should the team reorder it?',
  options: [
    'Leave it: the name and date are short, so they can’t matter',
    'Fixed instructions and the product list first, then the conversation, and the name and date last',
    'Put the date first and everything else after it, so the model reads the date before anything else',
    'Split it into two calls, one for the date and one for the rest',
  ],
  correct: 1,
  explanation: fact('openai-static-first').claim,
  why: [
    'A short line that changes still breaks the prefix: everything after it misses. In this chapter one time stamp cost almost all the hits.',
    `Right. ${fact('openai-static-first').claim}`,
    `That is the layout that lost the hits here. ${fact('cache-invalidate').claim}`,
    'Two calls don’t share a window: the model would answer without the date. Ordering one call fixes it.',
  ],
};

interface S {
  sent: boolean;
  order: Block[];
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'plain',
    focus: 'send',
    visibleControls: ['send'],
    narration: `${SESSION.length} questions from Mara Quill in one conversation, a minute apart. Every call re-sends the tool definitions, the instructions, every document and the conversation so far. Prompt caching lets the provider keep the start of a call, its prefix, and read it back on the next call for a fraction of the price, as long as the next call begins exactly the same way. The host marks where a cached prefix may end with cache breakpoints. Send the conversation.`,
    predicate: s => s.sent,
    hint: 'Press the send button.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['calls', 'p1'],
    narration: `${pct(PLAIN.rate)} of the tokens sent were read from the cache: everything up to the newest question matched the call before. Those tokens cost ${READ} of the normal price; the rest were written to the cache at ${WRITE[LIFETIME]} times. Now the team wants a time stamp in the turn. Before you send it:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'reorder',
    focus: 'order',
    visibleControls: ['out1', 'order', 'verdict'],
    narration: `With the stamp in the system prompt, only the tool definitions and the instructions before it were hits: ${pct(DATED.rate)} of the tokens. ${fact('cache-invalidate').claim} The stamp has to stay; where it sits is up to the host. Move the blocks so the stable ones come first and as much as possible is read from the cache.`,
    broken: s => ({ ...s, order: HOUSE }),
    verdict: s => solved(s.order),
    solution: s => ({ ...s, order: WINNERS[0] }),
    hint: 'The ticket time changes every call, and the conversation grows at its end. Which of them should come last?',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['order-done', 'facts', 'quiz'],
    narration: `${pct(price(WINNERS[0]).rate)} of the tokens are hits again. The blocks that never change come first, in any order; then the conversation, which only grows at its end; then the stamp, which changes every call. ${WINNERS.length} orders reach that, and any of them works. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which part changes each call, and where did it have to go?',
  },
];

/** Each call's tokens: read from the cache, written to it, and sent fresh. */
function Calls({ p }: { p: Priced }) {
  return (
    <table className="tc-ledger">
      <caption>Each call’s tokens</caption>
      <thead>
        <tr>
          <th scope="col">Call</th>
          <th scope="col">Window</th>
          <th scope="col">Cache hit</th>
          <th scope="col">Written</th>
        </tr>
      </thead>
      <tbody>
        {p.run.meter.map((m, i) => (
          <tr key={i}>
            <th scope="row">{i + 1}</th>
            <td>{num(m.window.tokens)}</td>
            <td>{num(m.hit.read)}</td>
            <td>{num(m.hit.write)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Cost in relative units: what the session costs, against no cache at all. */
function Readout({ p, fixed }: { p: Priced; fixed?: boolean }) {
  return (
    <>
      <p className="tc-status" role="status" data-rate={Math.round(p.rate * 100)}>
        {fixed !== undefined && (
          <>
            <Verdict fixed={fixed} />{' '}
          </>
        )}
        Cache hits: {pct(p.rate)} of {num(p.tokens)} tokens · cost {units(p.cost)} against {units(p.full)} with no
        cache.
        {fixed && ` This order is one of ${WINNERS.length} that work.`}
      </p>
      <p className="cx-note">
        Costs are in relative units, not dollars: a fresh input token costs 1, a cache hit {READ}, a cache write{' '}
        {WRITE[LIFETIME]}, an output token {OUTPUT}. Token counts are this site’s own. Larkspur’s windows are kept small
        to show the mechanism: a real model caches nothing shorter than its minimum, so windows this size may not be
        cached at all.
      </p>
    </>
  );
}

function Order({ s, apply }: { s: S; apply?: (s: S) => void }) {
  const move = (i: number, by: number) => {
    const o = [...s.order];
    [o[i], o[i + by]] = [o[i + by], o[i]];
    apply?.({ ...s, order: o });
  };
  const b = blocksOf(price(s.order).run.meter[0]);
  return (
    <ol className="cx-order" aria-label="The turn’s blocks, first to last">
      {s.order.map((k, i) => (
        <li key={k}>
          <div>
            <span>
              <strong>{BLOCK_NAME[k]}</strong> ·{' '}
              {k === 'chat'
                ? 'grows each call'
                : k === 'time'
                  ? 'changes each call'
                  : `${num(b[k].reduce((n, p) => n + p.tokens, 0))} tokens, never changes`}
            </span>
            {apply && (
              <span className="cx-moves">
                <button
                  type="button"
                  className="chip"
                  disabled={i === 0}
                  aria-label={`Move ${BLOCK_NAME[k]} up`}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="chip"
                  disabled={i === s.order.length - 1}
                  aria-label={`Move ${BLOCK_NAME[k]} down`}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function OrderForTheCache() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sent: false, order: HOUSE.filter(b => b !== 'time'), p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => {
        const p = state.order.includes('time') ? price(state.order) : PLAIN;
        return <ContextStage run={p.run} upTo={state.sent ? p.run.meter.length : 0} props={{ shelf: true }} />;
      }}
      controls={{
        send: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, sent: true })}>
            Send the conversation
          </button>
        ),
        calls: () => (
          <>
            <Calls p={PLAIN} />
            <Readout p={PLAIN} />
          </>
        ),
        p1: ({ state, apply }) => (
          <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i, order: HOUSE })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        order: ({ state, apply }) => <Order s={state} apply={apply} />,
        verdict: ({ state }) => {
          const p = price(state.order);
          return (
            <>
              <Calls p={p} />
              <Readout p={p} fixed={solved(state.order)} />
            </>
          );
        },
        'order-done': ({ state }) => (
          <>
            <Order s={state} />
            <Readout p={price(state.order)} fixed={solved(state.order)} />
          </>
        ),
        facts: () => (
          <>
            <Fact id="cache-order" />
            <Fact id="cache-read" />
            <Fact id="cache-write-5m" />
            <Fact id="openai-static-first" />
            <Fact id="cache-minimum" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
    />
  );
}
