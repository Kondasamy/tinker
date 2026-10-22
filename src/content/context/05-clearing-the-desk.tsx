// Chapter 5: clearing the desk (R10.5). Mara's three questions with the search tool, the history kept in full, with old
// search results cleared, or as one summary (Agents chapter 5's compaction, recapped in one step). Token counts and
// answers are read off the runs; then the cache goes on (a breakpoint at the end, chapter 4) and the costs are computed:
// clearing changes text early in the window, so it breaks the cached prefix and can cost more than it saves.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS } from '../../lib/context/loop';
import { OUTPUT, READ, WRITE } from '../../lib/context/cache';
import { KEEP, type Form } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf } from './kit';

const MODULE = 'context',
  ID = '05-clearing-the-desk';
const D = DOMAINS[ID];
const SESSIONS = D.sessions![0];
export const FORMS = D.history!;
const FORM_NAME: Record<Form, string> = {
  full: 'Full history',
  cleared: 'Old results cleared',
  summary: 'One summary',
};

const R = (form: Form, cache: boolean) =>
  runOf({ sessions: SESSIONS, retrieval: 'fetch', history: form, breakpoints: cache ? ['end'] : [] });
/** What a history form sends over the conversation, its last window, its right answers, and its cost with or without the cache. */
export function measure(form: Form, cache: boolean) {
  const r = R(form, cache),
    last = r.meter[r.meter.length - 1];
  return {
    tokens: r.meter.reduce((n, m) => n + m.window.tokens, 0),
    last: last.window.tokens,
    right: r.answers.filter(a => a.right).length,
    of: r.answers.length,
    cost: r.meter.reduce((n, m) => n + m.cost, 0),
    written: r.meter.reduce((n, m) => n + m.hit.write, 0),
  };
}
const units = (x: number) => num(Math.round(x));

const FULL = measure('full', false),
  CLEARED = measure('cleared', false);
/** the history form the cache makes cheapest: the outcome of the second prediction */
export const CHEAPEST = FORMS.reduce((a, b) => (measure(b, true).cost < measure(a, true).cost ? b : a));

const P1 = {
  question: `The host clears old search results: it keeps the latest ${KEEP === 1 ? 'one' : KEEP} and every question and answer, and leaves a placeholder for the rest. What happens to Mara’s third answer?`,
  options: [
    'Still right, from a smaller window',
    'Wrong: the model needed the earlier search results',
    'Right, but the window is no smaller: the placeholders take the same room',
  ],
};
const OUT1 = !CLEARED.right ? 1 : CLEARED.last < FULL.last ? 0 : 2;

const P2 = {
  question:
    'Now the cache is on, with a breakpoint at the end of each call, as in chapter 4. Which history makes the whole conversation cheapest?',
  options: FORMS.map(f => FORM_NAME[f]),
};
const OUT2 = FORMS.indexOf(CHEAPEST);

const QUIZ = {
  question:
    'A coding assistant reads a big file with each tool call. The team plans to clear old file contents on every single turn, to keep the window as small as possible. What is the catch?',
  options: [
    'None: fewer tokens always means a smaller bill',
    'Each clear changes text early in the window, so the cached prefix breaks and everything after it is written to the cache again. Clear in batches, when the window nears its limit',
    'Clearing deletes the decisions the assistant made, so it will redo its work',
    'The model can’t read a placeholder, so the next call fails',
  ],
  correct: 1,
  explanation: fact('clear-breaks-cache').claim,
  why: [
    'With a cache, price depends on what is read back, not only on how many tokens are sent. In this chapter clearing sent fewer tokens and still cost more.',
    `Right. ${fact('clear-breaks-cache').claim}`,
    'Clearing drops the old tool results only. The questions, the calls and the answers stay, so the decisions are still in the window.',
    'A placeholder is ordinary text; it tells the model a call happened and its result was removed.',
  ],
};

interface S {
  form: Form;
  cache: boolean;
  seen: Form[];
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'full',
    focus: 'send',
    visibleControls: ['send'],
    narration: `Mara Quill asks ${SESSIONS[0].length} questions in one conversation, and the assistant searches for each, as in chapter 3. Every search leaves its results in the history, and the history is sent again with every call. Send the conversation and watch the window grow.`,
    predicate: s => s.seen.includes('full'),
    hint: 'Press the send button.',
  },
  {
    id: 'recap',
    focus: 'p1',
    visibleControls: ['table', 'recap', 'p1'],
    narration: `The last call’s window was ${num(FULL.last)} tokens, most of it old search results the model no longer needs. In AI agents chapter 5 you met one fix: the host replaces the history with a short summary. A lighter fix is clearing: drop only the old tool results, and keep every question and answer, the decisions. Before you try it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'clear',
    focus: 'pick',
    visibleControls: ['out1', 'pick', 'table'],
    narration: `Cleared, the last window was ${num(CLEARED.last)} tokens against ${num(FULL.last)}, and ${CLEARED.right} of ${CLEARED.of} answers were still right. Now try the summary too, and compare the three.`,
    predicate: s => FORMS.every(f => s.seen.includes(f)),
    hint: 'Pick each way of keeping the history in turn.',
  },
  {
    id: 'cache',
    focus: 'p2',
    visibleControls: ['table', 'p2'],
    narration:
      'Fewer tokens, and every answer still right. But Larkspur also caches, as in chapter 4: each call reads back the longest start it shares with a recent call, as long as that call’s cache entry still lives. Before you turn the cache on:',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'table', 'facts', 'quiz'],
    narration: `With the cache on, the cheapest was: ${FORM_NAME[CHEAPEST].toLowerCase()}. The full history only grows at its end, so each call reads the last one back. Clearing changes an old result in the middle of the window, so everything after it misses and is written again at ${WRITE['5m']} times the price. Clearing is for when the window nears its limit or the old results crowd out the question; then clear a lot at once. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Look at the cost column: which history never changes its earlier text?',
  },
];

/** Every history tried so far: tokens over the conversation, the last window, the answers, and with the cache on, the cost. */
function Table({ s }: { s: S }) {
  const rows = FORMS.filter(f => s.seen.includes(f));
  if (!rows.length) return null;
  return (
    <>
      <table className="tc-ledger">
        <caption>Mara’s conversation, each way of keeping the history</caption>
        <thead>
          <tr>
            <th scope="col">History</th>
            <th scope="col">Tokens sent</th>
            <th scope="col">Last window</th>
            <th scope="col">Right</th>
            {s.cache && <th scope="col">Cost, cache on</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(f => {
            const m = measure(f, false);
            return (
              <tr key={f} data-form={f}>
                <th scope="row">{FORM_NAME[f]}</th>
                <td>{num(m.tokens)}</td>
                <td>{num(m.last)}</td>
                <td>
                  {m.right} of {m.of}
                </td>
                {s.cache && <td>{units(measure(f, true).cost)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {s.cache && (
        <p className="cx-note">
          Costs are in relative units, not dollars: a fresh input token costs 1, a cache hit {READ}, a cache write{' '}
          {WRITE['5m']}, an output token {OUTPUT}. Token counts are this site’s own.
        </p>
      )}
    </>
  );
}

export default function ClearingTheDesk() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ form: 'full', cache: false, seen: [], p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => {
        const r = R(state.form, state.cache);
        return (
          <ContextStage
            run={r}
            upTo={state.seen.length ? r.meter.length : 0}
            props={{ tray: true, shelf: state.cache }}
          />
        );
      }}
      controls={{
        send: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, form: 'full', seen: ['full'] })}>
            Send the conversation
          </button>
        ),
        recap: () => (
          <p className="tc-fact">
            Recap from <a href="/agents/05-memory/">AI agents, chapter 5</a>: when a history grows past a set size, the
            host can compact it into one summary. The summary keeps the decisions and drops the detail, and the model
            works on from it.
          </p>
        ),
        p1: ({ state, apply }) => (
          <Predict
            {...P1}
            value={state.p1}
            onPredict={i =>
              apply({ ...state, p1: i, form: 'cleared', seen: [...new Set([...state.seen, 'cleared' as Form])] })
            }
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        pick: ({ state, apply }) => (
          <div role="group" aria-label="How the history is kept" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FORMS.map(f => (
              <button
                key={f}
                type="button"
                className="chip"
                aria-pressed={state.form === f}
                onClick={() => apply({ ...state, form: f, seen: [...new Set([...state.seen, f])] })}
              >
                {FORM_NAME[f]}
              </button>
            ))}
          </div>
        ),
        table: ({ state }) => <Table s={state} />,
        p2: ({ state, apply }) => (
          <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i, cache: true })} />
        ),
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        facts: () => (
          <>
            <Fact id="clear-tool-results" />
            <Fact id="clear-breaks-cache" />
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
