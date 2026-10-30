// Chapter 7: the workbench (R10.7). Larkspur's context policy over Mara's three-question conversation: how documents get
// in, how the history is kept, and whether the cache is on (WORKBENCH_DOMAINS, so every reachable run is recorded).
// Answer quality is the recorded verdicts; tokens and cost are computed, in relative units. The readout leads with one
// number, the cost against stuffing everything. The policy and the tab are step state, so a reload keeps them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { WINDOW_PARTS } from '../../components/scenes/windowScene';
import { totals, WORKBENCH_DOMAINS, type Retrieval, type Run } from '../../lib/context/loop';
import { OUTPUT, READ, WRITE } from '../../lib/context/cache';
import { caseOf, type Form } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf, type View } from './kit';

const MODULE = 'context',
  ID = '07-workbench';
const W = WORKBENCH_DOMAINS;
const SESSIONS = W.sessions![0];
type Fetch = Extract<Retrieval, 'stuff' | 'fetch'>;
export interface Policy {
  retrieval: Fetch;
  history: Form;
  cache: boolean;
}
const RETRIEVALS = W.retrieval as Fetch[],
  HISTORIES = W.history!,
  CACHES = W.breakpoints!.map(b => b.length > 0);
/** every policy the controls can make */
export const POLICIES: Policy[] = RETRIEVALS.flatMap(retrieval =>
  HISTORIES.flatMap(history => CACHES.map(cache => ({ retrieval, history, cache }))),
);
/** the team's first policy: every document up front, the full history, no cache */
export const STUFF_ALL: Policy = { retrieval: 'stuff', history: 'full', cache: false };

export const play = (p: Policy): Run =>
  runOf({ sessions: SESSIONS, retrieval: p.retrieval, history: p.history, breakpoints: p.cache ? ['end'] : [] });
export interface Score {
  right: number;
  of: number;
  tokens: number;
  cost: number;
}
export const score = (p: Policy): Score => ({ ...totals(play(p)), of: play(p).answers.length });
/** each question's share of a run: its calls' tokens and cost, and whether its answer was right */
export function byCase(r: Run): ({ case: string } & Score)[] {
  const ids = [...new Set(r.meter.map(m => m.case))];
  return ids.map(id => {
    const ms = r.meter.filter(m => m.case === id),
      as = r.answers.filter(a => a.case === id);
    return {
      case: id,
      tokens: ms.reduce((n, m) => n + m.window.tokens + m.output, 0),
      cost: ms.reduce((n, m) => n + m.cost, 0),
      right: as.filter(a => a.right).length,
      of: as.length,
    };
  });
}

/** the puzzle: every answer right for the lowest cost; every policy that reaches it is accepted */
const MOST = Math.max(...POLICIES.map(p => score(p).right));
const LOWEST = Math.min(...POLICIES.filter(p => score(p).right === MOST).map(p => score(p).cost));
export const WINNERS = POLICIES.filter(p => score(p).right === MOST && score(p).cost === LOWEST);
const same = (a: Policy, b: Policy) => a.retrieval === b.retrieval && a.history === b.history && a.cache === b.cache;
export const solved = (p: Policy) => WINNERS.some(w => same(w, p));

const BASE = score(STUFF_ALL);
const units = (x: number) => num(Math.round(x));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const RETRIEVAL_NAME: Record<Fetch, string> = { stuff: 'Every document up front', fetch: 'Search when needed' };
const HISTORY_NAME: Record<Form, string> = {
  full: 'Full history',
  cleared: 'Old results cleared',
  summary: 'One summary',
};
const policyName = (p: Policy) =>
  `${RETRIEVAL_NAME[p.retrieval]}, ${HISTORY_NAME[p.history].toLowerCase()}, cache ${p.cache ? 'on' : 'off'}`;

/** One change from stuffing everything: does it beat it on both answers and cost? */
const beats = (p: Policy) => {
  const s = score(p);
  return s.right > BASE.right && s.cost < BASE.cost;
};
const P1 = {
  question: `Stuffing everything got ${BASE.right} of ${BASE.of} answers right. Which single change do you expect to give better answers for less?`,
  options: [
    'Search when needed, instead of every document up front',
    'Keep every document, and summarise the history',
    'Neither: better answers need more text in the window, not less',
  ],
};
const OUT1 = beats({ ...STUFF_ALL, retrieval: 'fetch' }) ? 0 : beats({ ...STUFF_ALL, history: 'summary' }) ? 1 : 2;

export const QUIZ = {
  question:
    'Another team stuffs a 300-page product catalogue into every turn, because “more context is safer”. Their bill is high and some answers pick the wrong product. What should they change first?',
  options: [
    'Move to a model with a bigger window, so the catalogue has more room',
    'Fetch the pages each question needs, keep the stable parts first so the cache reads them, and measure answers, tokens and cost together',
    'Turn the cache off: cached text makes answers worse',
    'Summarise the catalogue once and send the summary every turn',
  ],
  correct: 1,
  explanation: fact('smallest-set').claim,
  why: [
    'Room isn’t their problem since the catalogue already fits, and a bigger window would hold more distractors, as in chapter 2.',
    'Right: send the smallest set that answers, cache the stable start, and read answers, tokens and cost side by side.',
    'Caching changes the price of re-sending the same start, not what the model reads, so the answers come out the same.',
    'A summary drops the details, such as prices and part numbers, that the questions need.',
  ],
};

interface S extends Policy {
  ran: boolean;
  p1: number | null;
  quiz: number | null;
  view: View;
}

/** The parts of the window desk a step's callout may name. */
export const PARTS = WINDOW_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'baseline',
    focus: 'run',
    visibleControls: ['run'],
    narration:
      'A context policy is the host’s rules for every window. Larkspur’s first: every document, the full history, no cache.',
    act: 'Run it on Mara’s questions.',
    say: { block: 'window', text: 'Every document' },
    predicate: s => s.ran,
    hint: 'Press the run button.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['readout', 'p1'],
    narration: `${BASE.right} of ${BASE.of} answers right, for ${num(BASE.tokens)} tokens and a cost of ${units(BASE.cost)}. Each chapter gave you a lever.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'tune',
    focus: 'bench',
    visibleControls: ['out1', 'bench'],
    narration: 'The top line shows the cost against stuffing everything; the table splits it by question.',
    act: 'Get every answer right at the lowest cost.',
    broken: s => ({ ...s, ...STUFF_ALL }),
    verdict: s => solved(s),
    solution: s => ({ ...s, ...WINNERS[0] }),
    hint: 'Chapter 3 fixed the answers; chapter 4 made a growing history cheap; chapter 5 showed which history keeps the cache.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['readout', 'facts', 'quiz'],
    narration: `Every answer right for ${pct(LOWEST / BASE.cost)} of the first policy’s cost. Sending the most was neither the most right nor the cheapest.`,
    act: 'One question to finish.',
    say: { block: 'window', text: 'Small windows' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which policy sent the most text, and how did it do?',
  },
];

/** The policy's readout: the headline number first, then answers and tokens, then the run split by question. */
function Readout({ s, verdict }: { s: S; verdict?: boolean }) {
  const p: Policy = { retrieval: s.retrieval, history: s.history, cache: s.cache },
    sc = score(p),
    rows = byCase(play(p));
  return (
    <div role="status" data-right={sc.right} data-cost={Math.round(sc.cost)} data-solved={solved(p) ? '1' : '0'}>
      <p className="cx-headline">
        <strong>{pct(sc.cost / BASE.cost)}</strong> of the cost of stuffing everything
        {verdict && (
          <>
            {' '}
            <Verdict fixed={solved(p)} />
          </>
        )}
      </p>
      <p className="tc-status">
        {sc.right} of {sc.of} answers right · {num(sc.tokens)} tokens · cost {units(sc.cost)} against {units(BASE.cost)}
        .{verdict && solved(p) && WINNERS.length > 1 && ` This policy is one of ${WINNERS.length} that work.`}
      </p>
      <table className="tc-ledger">
        <caption>{policyName(p)}, by question</caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Answer</th>
            <th scope="col">Tokens</th>
            <th scope="col">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.case} data-case={r.case}>
              <th scope="row">{caseOf(r.case).topic}</th>
              <td>{r.right === r.of ? 'right' : 'wrong'}</td>
              <td>{num(r.tokens)}</td>
              <td>{units(r.cost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>
              {sc.right} of {sc.of}
            </td>
            <td>{num(sc.tokens)}</td>
            <td>{units(sc.cost)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="cx-note">
        Answers are recorded; tokens and cost are computed. Tokens count each window and its reply with this site’s own
        token counter. Costs are in relative units, not dollars: a fresh input token costs 1, a cache hit {READ}, a
        cache write {WRITE['5m']}, an output token {OUTPUT}.
      </p>
    </div>
  );
}

function Chips<T>({
  label,
  values,
  value,
  name,
  pick,
}: {
  label: string;
  values: T[];
  value: T;
  name: (v: T) => string;
  pick: (v: T) => void;
}) {
  return (
    <fieldset className="tc-pick">
      <legend>{label}</legend>
      <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {values.map(v => (
          <button key={String(v)} type="button" className="chip" aria-pressed={v === value} onClick={() => pick(v)}>
            {name(v)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...STUFF_ALL, ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = play(state);
        return (
          <ContextStage
            run={r}
            upTo={state.ran ? r.meter.length : 0}
            props={{ shelf: state.cache, tray: state.history !== 'full' }}
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, ...STUFF_ALL, ran: true })}>
            Run the policy
          </button>
        ),
        readout: ({ state }) => <Readout s={state} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        bench: ({ state, apply }) => (
          <div className="tc-bench">
            <Chips
              label="Documents"
              values={RETRIEVALS}
              value={state.retrieval}
              name={v => RETRIEVAL_NAME[v]}
              pick={retrieval => apply({ ...state, retrieval })}
            />
            <Chips
              label="History"
              values={HISTORIES}
              value={state.history}
              name={v => HISTORY_NAME[v]}
              pick={history => apply({ ...state, history })}
            />
            <Chips
              label="Cache"
              values={CACHES}
              value={state.cache}
              name={v => (v ? 'Cache on' : 'Cache off')}
              pick={cache => apply({ ...state, cache })}
            />
            <Readout s={state} verdict />
          </div>
        ),
        facts: () => (
          <>
            <Fact id="smallest-set" />
            <Fact id="context-rot" />
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
