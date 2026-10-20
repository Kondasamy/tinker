// Chapter 1: the team made the pieces of each document bigger (v2). The reader tries the two questions v2 fixes (both
// look better), predicts how the whole test set will go, runs all of it on v1 and v2, and finds the question v2 broke.
// The suite loads after the page does, so steps say nothing countable: every number, question and answer on screen is
// read off the suite by the controls and the stage, and the step predicates wait for it (suiteNow).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { QUESTIONS, VERSIONS, compare, passed } from '../../lib/evals/suite';
import { isCorrect } from '../../lib/evals/graders';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EvalStage, Mark, WithSuite, colsOf, resultsOf, suiteNow, useSuite, type Shown, type Suite, type View } from './kit';

const MODULE = 'evals', ID = '01-it-worked-when-i-tried-it';
const { v1: V1, v2: V2 } = VERSIONS, N = QUESTIONS.length;
const at = (id: string) => QUESTIONS.findIndex(q => q.id === id);
/** the questions the team tries: only ones v2 fixes, so both look better */
const triedOf = (s: Suite) => compare(s.v1, s.v2).fixed.slice(0, 2);
const brokenOf = (s: Suite) => compare(s.v1, s.v2).broken.map(at);

interface S { tried: string[]; p1: number | null; ran: boolean; view: View; pick: number | null; quiz: number | null }

const P1 = {
  question: `Both tried questions got better. Run all ${N} questions on ${V1.label} and ${V2.label}. How will ${V2.label} do?`,
  options: [
    `Better on every question: the two you tried were a fair sample`,
    `Better overall, but a question that passed on ${V1.label} now fails`,
    'Worse overall: the two you tried were luck',
    'The same score: two questions can’t move it',
  ],
};
// read off the suite: did the score go up, and did anything that passed before fail now
function outcome(s: Suite) {
  const up = passed(s.v2) - passed(s.v1), broke = compare(s.v1, s.v2).broken.length > 0;
  return up > 0 ? (broke ? 1 : 0) : up < 0 ? 2 : 3;
}

const QUIZ = {
  question: 'Larkspur’s team turns on a reranker for the parts catalogue. A colleague asks five questions about prices, and all five come back right. What should happen before it ships?',
  options: [
    'Ship it: five right answers in a row is strong evidence',
    'Run the whole test set on the old and the new setup, and compare them question by question',
    'Ask five more questions, about returns this time',
    'Run the test set and compare the totals: if the new total is higher, ship',
  ],
  correct: 1,
  explanation: fact('eval').claim,
  why: [
    `Questions someone thought to ask can all improve while one nobody asked breaks. ${V2.label} looked right on both tries and still broke a question.`,
    'Right. The same questions on both setups show what got fixed and what broke. A fixed test set, run on every change, is an eval.',
    'More hand-picked questions are still a sample of what someone thought to ask. The test set covers the questions the team chose to keep, every time.',
    `${V2.label}’s total went up and it still broke a question that used to pass. A total can hide a regression; compare each question.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'try', focus: 'try', visibleControls: ['try'],
    narration: `Larkspur’s assistant runs as ${V1.label}: ${V1.note}. The team built ${V2.label}. ${V2.note}; everything else stays the same. A version is one setup of the assistant. Before shipping ${V2.label}, someone tries a couple of questions on both. Try the two they picked.`,
    predicate: s => s.tried.length >= 2 && !!suiteNow(),
    hint: 'Press both question buttons.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['tried', 'p1'],
    narration: `It worked when they tried it. But Larkspur already has a test set: all ${N} questions from the RAG module, each with the answer it should get. Before you run it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run', focus: 'run', visibleControls: ['p1', 'run'],
    narration: `Run the whole test set on both versions. Each answer is checked against the answer it should get, and marked PASS or FAIL.`,
    predicate: s => s.ran && !!suiteNow(),
  },
  {
    id: 'find', focus: 'find', visibleControls: ['out1', 'score', 'find'],
    narration: 'The Results tab shows every question on both versions. A ⇄ marks a question whose result changed between them. Some changes are fixes. Find the one that went the other way.',
    predicate: s => { const suite = suiteNow(); return !!suite && s.pick !== null && brokenOf(suite).includes(s.pick); },
    hint: `Look down the ${V2.label} column for a FAIL with ⇄ beside it: that question passed on ${V1.label}.`,
    solution: s => { const suite = suiteNow(); return suite ? { ...s, pick: brokenOf(suite)[0] } : s; },
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['found', 'quiz'],
    narration: 'That is a regression: a change meant to make things better broke something that worked. Nobody tried that question, so nobody saw it. Running the same test set on every change, and comparing question by question, is an eval. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: `Which choice would have caught the question ${V2.label} broke?`,
  },
];


/** One question's answer on each version, stamped, with what went wrong for a failed one. */
function Answers({ suite, q }: { suite: Suite; q: number }) {
  return (
    <div className="tc-def ev-answers">
      <p className="lbl">{`Q${q + 1}`}</p><p>{QUESTIONS[q].query}</p>
      {(['v1', 'v2'] as const).map(v => {
        const r = suite[v][q], ok = isCorrect(r.verdict);
        return (
          <div key={v} className="ev-answer">
            <p><Mark ok={ok} /> <strong>{VERSIONS[v].label}</strong> “{r.answer.text}”</p>
            {!ok && r.answer.why && <p className="note">{r.answer.why}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** The two tried questions: a button each, and their answers once tried. Waits for the suite. */
function Try({ s, sync, buttons }: { s: S; sync: (next: S) => void; buttons: boolean }) {
  const { suite } = useSuite();
  const tried = suite ? triedOf(suite) : [];
  return (
    <>
      {buttons && (
        <div role="group" aria-label="Try a question" className="ev-try">
          {!suite && <p className="tc-status" role="status">Preparing the test suite…</p>}
          {tried.map(id => (
            <button key={id} type="button" className="big" disabled={s.tried.includes(id)}
              onClick={() => sync({ ...s, tried: [...s.tried, id] })}>Try: “{QUESTIONS[at(id)].query}”</button>
          ))}
        </div>
      )}
      {suite && s.tried.map(id => <Answers key={id} suite={suite} q={at(id)} />)}
    </>
  );
}

/** Each version's score over the whole set, and what changed. */
function Score({ suite }: { suite: Suite }) {
  const { fixed, broken } = compare(suite.v1, suite.v2);
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>All {N} questions</caption>
      <thead><tr><th scope="col">Version</th><th scope="col">Passed</th></tr></thead>
      <tbody>
        <tr><th scope="row">{V1.label}</th><td>{passed(suite.v1)} of {N}</td></tr>
        <tr><th scope="row">{V2.label}</th><td>{passed(suite.v2)} of {N}: {fixed.length} fixed, {broken.length} broken</td></tr>
      </tbody>
    </table>
  );
}

/** What the stage shows: before the run, the tried cards on v2's bench; after it, the whole set on v2 and both columns. */
const show = (s: S) => (suite: Suite): Shown => {
  if (!s.ran) {
    const results = s.tried.map(id => isCorrect(suite.v2[at(id)].verdict));
    return {
      scene: { results, version: V2.label }, cols: [],
      caption: s.tried.length ? `Tried on ${V2.label}: ${results.filter(Boolean).length} of ${results.length} passed. Results fill in when the whole test set runs.` : `The test bench, with ${V2.label} loaded. Nothing tried yet.`,
    };
  }
  return {
    scene: { results: resultsOf(suite.v2), version: V2.label }, cols: colsOf(suite, ['v1', 'v2']),
    caption: `All ${N} questions. ${V1.label} passed ${passed(suite.v1)}; ${V2.label} passed ${passed(suite.v2)}.`,
  };
};

export default function ItWorkedWhenITriedIt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ tried: [], p1: null, ran: false, view: 'scene', pick: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => <EvalStage show={show(state)} view={state.view} onView={view => sync({ ...state, view })} />}
      controls={{
        try: ({ state, sync }) => <Try s={state} sync={sync} buttons />,
        tried: ({ state, sync }) => <Try s={state} sync={sync} buttons={false} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <WithSuite>{() => (
            <button type="button" className="big" onClick={() => sync({ ...state, ran: true, view: 'grid' })}>
              Run all {N} questions on {V1.label} and {V2.label}
            </button>
          )}</WithSuite>
        ),
        out1: ({ state }) => <WithSuite>{suite => <Outcome {...P1} prediction={state.p1} outcome={outcome(suite)} />}</WithSuite>,
        score: () => <WithSuite>{suite => <Score suite={suite} />}</WithSuite>,
        find: ({ state, apply }) => <WithSuite>{suite => {
          const pick = state.pick, ok = (v: 'v1' | 'v2', q: number) => isCorrect(suite[v][q].verdict);
          return (
            <>
              <div role="group" aria-label={`Which question did ${V2.label} break?`} className="ev-find">
                {QUESTIONS.map((q, i) => (
                  <button key={q.id} type="button" className="chip" aria-pressed={pick === i} onClick={() => apply({ ...state, pick: i })}>Q{i + 1}: {q.query}</button>
                ))}
              </div>
              {pick !== null && !brokenOf(suite).includes(pick) && (
                <p className="tc-status" role="status">
                  Q{pick + 1} {ok('v1', pick) && ok('v2', pick) ? 'passes on both versions.'
                    : !ok('v1', pick) && !ok('v2', pick) ? `fails on both: ${V2.label} didn’t break it, it never worked.`
                    : `failed on ${V1.label} and passes on ${V2.label}: a fix, not a regression.`}
                </p>
              )}
            </>
          );
        }}</WithSuite>,
        found: ({ state }) => <WithSuite>{suite => state.pick !== null && <Answers suite={suite} q={state.pick} />}</WithSuite>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
