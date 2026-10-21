// Chapter 2: more isn't better (R10.2, KTD8). The needed fact goes in alone, then early, in the middle or late among
// related passages that don't hold it. The reader predicts where it is safest, then tries every place at two counts.
// The answers are recorded to illustrate the sourced findings, not measured: each one's note is shown, and the reveal
// cites the facts (Liu et al. 2023 on position; Chroma 2025 and Anthropic on context rot).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, type Place } from '../../lib/context/loop';
import { caseOf, DOCS } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf } from './kit';

const MODULE = 'context', ID = '02-more-isnt-better';
const D = DOMAINS[ID];
const SESSION = D.sessions!.find(s => s[0][0] === 'refund-window')!, CASE = caseOf(SESSION[0][0]);
const PLACES = D.place!;
const [, ...COUNTS] = D.distractors!;   // 0 is the fact alone; the rest are what the reader tries
const PLACE_NAME: Record<Place, string> = { early: 'At the start', middle: 'In the middle', late: 'At the end' };

interface S { n: number; place: Place; seen: string[]; p1: number | null; quiz: number | null }
const key = (n: number, place: Place) => (n ? `${n}:${place}` : '0');
const R = (n: number, place: Place) => runOf({ sessions: SESSION, retrieval: 'top', distractors: n, place });
const turnOf = (n: number, place: Place) => R(n, place).meter[0].turn;
const current = (s: S) => R(s.n, s.place);

/** the places where the fact is answered right at every count */
const SAFE = PLACES.filter(p => COUNTS.every(n => turnOf(n, p).right));
const P1 = {
  question: `Larkspur adds ${COUNTS[0]} related passages next to the refund policy, so the model has more to go on. Where should the fact sit to be safest?`,
  options: ['At the start, before the other passages', 'In the middle of them', 'At the end, just before the question', 'Anywhere: once it is in the window, the model sees it'],
};
const OUT1 = SAFE.length === 1 ? PLACES.indexOf(SAFE[0]) : 3;
const WRONG = turnOf(COUNTS[0], 'middle');

const QUIZ = {
  question: 'A support team pastes the 30 most relevant help articles into every prompt, ranked by a search score. Answers that the articles plainly hold sometimes come back wrong. What should they try first?',
  options: [
    'Paste more articles, so the right one is always included',
    'Send fewer articles, with the best match first, so the fact isn’t buried among look-alikes',
    'Nothing: if the article is in the prompt, the model must have seen it',
    'Put the best match in the middle, where the model pays most attention',
  ],
  correct: 1,
  explanation: fact('lost-in-the-middle').claim,
  why: [
    `More passages are more distractors. Here the same fact with ${COUNTS[COUNTS.length - 1]} passages around it slipped even at the end.`,
    `Right. ${fact('context-rot').claim} Fewer, better passages keep the fact in view, and the start is where it is found most reliably.`,
    'Being in the window isn’t the same as being found. In this chapter the fact was always in the window, and some answers were still wrong.',
    `The middle is the weak spot. ${fact('lost-in-the-middle').claim}`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'alone', focus: 'alone', visibleControls: ['alone'],
    narration: `${CASE.customer} asks: “${CASE.question}” Chapter 1 put the one passage that answers it in the window, alone. Send it that way first.`,
    predicate: s => s.seen.includes('0'),
    hint: 'Press the send button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['grid', 'p1'],
    narration: `“${turnOf(0, 'early').text}” Right. But Larkspur has ${DOCS.length} policy passages, and the team can’t always tell which one a customer needs. The idea: send more. Each extra passage is a distractor: related to the question, but not holding the answer. Before you try it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'try', focus: 'try', visibleControls: ['p1', 'grid', 'try'],
    narration: `Try the fact at each place with ${COUNTS[0]} distractors, then with ${COUNTS[1]}. Each answer fills a cell of the table.`,
    predicate: s => COUNTS.every(n => PLACES.every(p => s.seen.includes(key(n, p)))),
    hint: 'Every cell of the table needs an answer: pick a count, then each place.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'grid', 'notes', 'facts', 'quiz'],
    narration: `In the middle, the model answered “${WRONG.text}” That is a distractor’s fact given as the answer. With ${COUNTS[1]} distractors even the end slipped, while the start held. These answers are recorded, written to illustrate published findings, not measured on a model; each one’s note says why it reads that way. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which place held at both counts, and what did more passages do?',
  },
];

/** Every count and place tried so far: right, wrong or not yet. */
function Grid({ s }: { s: S }) {
  const cell = (n: number, p: Place) => (s.seen.includes(key(n, p)) ? (turnOf(n, p).right ? 'Right' : 'Wrong') : '—');
  return (
    <table className="tc-ledger">
      <caption>The refund answer, by where the fact sits</caption>
      <thead><tr><th scope="col">Distractors</th>{PLACES.map(p => <th key={p} scope="col">{PLACE_NAME[p]}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">None (alone)</th><td colSpan={PLACES.length}>{s.seen.includes('0') ? (turnOf(0, 'early').right ? 'Right' : 'Wrong') : '—'}</td></tr>
        {COUNTS.map(n => <tr key={n}><th scope="row">{n}</th>{PLACES.map(p => <td key={p}>{cell(n, p)}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

const Chips = <T extends string | number>({ label, items, name, value, pick }: { label: string; items: readonly T[]; name: (x: T) => string; value?: T; pick: (x: T) => void }) => (
  <div className="gr-toggles" role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {items.map(x => <button key={String(x)} type="button" className="chip" aria-pressed={value === x} onClick={() => pick(x)}>{name(x)}</button>)}
  </div>
);

export default function MoreIsntBetter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ n: 0, place: 'early', seen: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <ContextStage run={current(state)} upTo={state.seen.length ? 1 : 0} />}
      controls={{
        alone: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, n: 0, seen: ['0'] })}>Send with the fact alone</button>,
        grid: ({ state }) => <Grid s={state} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        try: ({ state, apply }) => {
          const go = (n: number, place: Place) => apply({ ...state, n, place, seen: [...new Set([...state.seen, key(n, place)])] });
          const n = state.n || COUNTS[0];
          return (
            <div className="tc-bench" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Chips label="Distractors" items={COUNTS} name={c => `${c} distractors`} value={state.n} pick={c => go(c, state.place)} />
              <Chips label="Where the fact sits" items={PLACES} name={p => PLACE_NAME[p]} value={state.n ? state.place : undefined} pick={p => go(n, p)} />
              {state.n > 0 && <p className="tc-status" role="status">{state.n} distractors, fact {PLACE_NAME[state.place].toLowerCase()}: {turnOf(state.n, state.place).right ? 'right' : 'wrong'}. “{turnOf(state.n, state.place).text}”</p>}
            </div>
          );
        },
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        notes: () => (
          <div className="tc-def">
            <p className="lbl">Why each recorded answer reads as it does</p>
            <ul>
              {COUNTS.flatMap(n => PLACES.map(p => <li key={key(n, p)}>{n} distractors, {PLACE_NAME[p].toLowerCase()}: {turnOf(n, p).note}</li>))}
            </ul>
          </div>
        ),
        facts: () => <><Fact id="lost-in-the-middle" /><Fact id="chroma-distractors" /><Fact id="chroma-rot" /></>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
