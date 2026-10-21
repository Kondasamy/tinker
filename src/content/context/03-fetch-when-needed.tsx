// Chapter 3: fetch it when you need it (R10.3). Every document stuffed up front against a search tool the model calls
// just in time, for each of Mara's three questions. Window sizes are counted live; the answers are recorded; the
// outcome of the prediction is read off the runs, so the copy and the runs agree.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, type Retrieval } from '../../lib/context/loop';
import { caseOf, DOCS } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf } from './kit';

const MODULE = 'context', ID = '03-fetch-when-needed';
type Mode = Extract<Retrieval, 'stuff' | 'fetch'>;
export const CASES = DOMAINS[ID].sessions!.map(s => s[0][0]);
export const FIRST = CASES[0];
const MODE_NAME: Record<Mode, string> = { stuff: 'Every document up front', fetch: 'Search when needed' };

interface S { kase: string; mode: Mode; seen: string[]; p1: number | null; quiz: number | null }
const key = (c: string, m: Mode) => `${c}:${m}`;
const R = (c: string, m: Mode) => runOf({ sessions: [[c]], retrieval: m });
const current = (s: S) => R(s.kase, s.mode);
/** what a question costs in window tokens: every call's window added up */
export const sent = (c: string, m: Mode) => R(c, m).meter.reduce((n, x) => n + x.window.tokens, 0);
export const answer = (c: string, m: Mode) => R(c, m).answers[0];

const STUFF = sent(FIRST, 'stuff'), FETCH = sent(FIRST, 'fetch');
const P1 = {
  question: 'Instead of every document, the model gets a search tool and looks up what the question needs. What happens to the refund question?',
  options: [
    'Fewer tokens, and the answer comes out right',
    'Fewer tokens, but the answer gets worse: the model sees fewer documents',
    'More tokens: the search tool, the extra call and its results add up',
  ],
};
const OUT1 = FETCH >= STUFF ? 2 : answer(FIRST, 'fetch').right ? 0 : 1;

const QUIZ = {
  question: 'An IT help desk assistant has a 200-page manual. Most questions need one page. Which setup should the team start with?',
  options: [
    'All 200 pages in every turn, so the answer is always there',
    'A search tool over the manual, so each question brings in the pages it needs',
    'The first 20 pages in every turn, since the window can’t fit the rest',
    'No manual at all: the model already knows how IT works',
  ],
  correct: 1,
  explanation: fact('just-in-time').claim,
  why: [
    `Every turn would pay for all 200 pages and bury the one that matters. Here, stuffing Larkspur’s ${DOCS.length} passages took ${num(STUFF)} tokens and still answered the refund question wrong.`,
    `Right. ${fact('just-in-time').claim} The window stays small and the needed page stays in view.`,
    'The first 20 pages won’t hold most answers, and they are still mostly distractors.',
    'The model doesn’t know this company’s manual. Without the page, it can only guess or say it doesn’t know, as in chapter 1.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'stuff', focus: 'run', visibleControls: ['run'],
    narration: `Larkspur doesn’t know which passage a question needs, so the simplest plan is stuffing: send all ${DOCS.length} passages up front, every turn. ${caseOf(FIRST).customer} asks: “${caseOf(FIRST).question}” Send it with every document.`,
    predicate: s => s.seen.includes(key(FIRST, 'stuff')),
    hint: 'Press the send button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['table', 'p1'],
    narration: `“${answer(FIRST, 'stuff').text}” Wrong, from a window of ${num(STUFF)} tokens. The refund passage was in there, in the middle of ${DOCS.length} others: chapter 2’s trap. Larkspur’s other idea is just in time: give the model a search tool, and let it fetch passages when the question needs them. Before you try it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'fetch', focus: 'run', visibleControls: ['p1', 'table', 'run'],
    narration: 'The model now has a search tool and no documents up front. Send the same question.',
    predicate: s => s.seen.includes(key(FIRST, 'fetch')),
    hint: 'Press the send button.',
  },
  {
    id: 'compare', focus: 'pick', visibleControls: ['out1', 'table', 'pick'],
    narration: `The first call had no documents, so the model asked for a search. The host ran it and sent back two passages, and the second call answered from them. Both calls together came to ${num(FETCH)} tokens, against ${num(STUFF)} stuffed. Now ask ${caseOf(FIRST).customer}’s other two questions both ways.`,
    predicate: s => CASES.every(c => s.seen.includes(key(c, 'stuff')) && s.seen.includes(key(c, 'fetch'))),
    hint: 'Each question needs a row in both columns: pick a question, then each way.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['table', 'facts', 'quiz'],
    narration: 'Stuffing paid for every passage on every question, and answered right only when the fact happened to sit near the start or end. Searching cost two calls but far fewer tokens, and each answer came from a short window with the fact in view. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the two columns: tokens, and right or wrong.',
  },
];

/** Every question tried so far, both ways: tokens sent and whether the answer was right. */
function Table({ s }: { s: S }) {
  const cell = (c: string, m: Mode) => (s.seen.includes(key(c, m)) ? `${num(sent(c, m))} tokens, ${answer(c, m).right ? 'right' : 'wrong'}` : '—');
  const rows = CASES.filter(c => s.seen.some(k => k.startsWith(`${c}:`)));
  if (!rows.length) return null;
  return (
    <table className="tc-ledger">
      <caption>Tokens sent per question, all calls added up</caption>
      <thead><tr><th scope="col">Question</th>{(['stuff', 'fetch'] as Mode[]).map(m => <th key={m} scope="col">{MODE_NAME[m]}</th>)}</tr></thead>
      <tbody>{rows.map(c => <tr key={c}><th scope="row">{caseOf(c).topic}</th><td>{cell(c, 'stuff')}</td><td>{cell(c, 'fetch')}</td></tr>)}</tbody>
    </table>
  );
}

export default function FetchWhenNeeded() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: FIRST, mode: 'stuff', seen: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => { const r = current(state); return <ContextStage run={r} upTo={state.seen.length ? r.meter.length : 0} />; }}
      controls={{
        run: ({ state, apply }) => {
          const m: Mode = state.seen.includes(key(FIRST, 'stuff')) ? 'fetch' : 'stuff';
          return <button type="button" className="big" onClick={() => apply({ ...state, kase: FIRST, mode: m, seen: [...state.seen, key(FIRST, m)] })}>{m === 'stuff' ? 'Send with every document' : 'Send with the search tool'}</button>;
        },
        pick: ({ state, apply }) => {
          const go = (kase: string, mode: Mode) => apply({ ...state, kase, mode, seen: [...new Set([...state.seen, key(kase, mode)])] });
          return (
            <div className="tc-bench" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div role="group" aria-label="Question" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CASES.map(c => <button key={c} type="button" className="chip" aria-pressed={state.kase === c} onClick={() => go(c, state.mode)}>{caseOf(c).topic}</button>)}
              </div>
              <div role="group" aria-label="How documents get in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['stuff', 'fetch'] as Mode[]).map(m => <button key={m} type="button" className="chip" aria-pressed={state.mode === m} onClick={() => go(state.kase, m)}>{MODE_NAME[m]}</button>)}
              </div>
              <p className="tc-status" role="status">{caseOf(state.kase).topic}, {MODE_NAME[state.mode].toLowerCase()}: “{answer(state.kase, state.mode).text}”</p>
            </div>
          );
        },
        table: ({ state }) => <Table s={state} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        facts: () => <><Fact id="just-in-time" /><Fact id="smallest-set" /></>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
