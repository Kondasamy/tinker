// Chapter 3: how close is the student. The reader predicts how often the student's top pick is the teacher's, then runs
// both over the held-out documents in the browser: agreement and KL divergence per document and in all. The pooled
// agreement is the one meta.json recorded when the student was trained (the tests prove it).
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { compare, HELDOUT } from '../../lib/small-models/compare';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BothGate, SmallStage, bothNow, loadBoth } from './kit';

const MODULE = 'small-models', ID = '03-how-close-is-the-student';
const pct = (x: number) => `${Math.round(x * 100)}%`;
const POSITIONS = HELDOUT.ids.reduce((n, d) => n + d.length - 1, 0);

interface S { p1: number | null; measured: boolean; quiz: number | null }

export const P1 = {
  question: `Run both models over ${HELDOUT.docs.length} of Larkspur’s documents that neither trained on: ${num(POSITIONS)} places to guess the next piece. How often will the student’s top pick be the teacher’s?`,
  options: ['Almost always: over 90% of the time', 'Somewhere in between: 30% to 90% of the time', 'Rarely: under 30% of the time'],
};
export const agreeOutcome = (a: number) => (a > 0.9 ? 0 : a >= 0.3 ? 1 : 2);

const QUIZ = {
  question: 'A distilled legal-search model agrees with its teacher’s top pick 95% of the time on held-out text. Can it replace the teacher?',
  options: [
    'Not yet: agreement shows it copies the teacher; whether its answers are right needs an eval',
    'Yes: 95% agreement means 95% of its answers are right',
    'No: anything short of 100% agreement is unusable',
    'Yes, as long as it agrees on its training text too',
  ],
  correct: 0,
  explanation: 'Agreement and KL measure closeness to the teacher. Whether the answers are right is a question for the eval, which the next chapters run.',
  why: [
    'Right. Closeness to the teacher is a good sign, but the teacher can be wrong, and one changed piece can change an answer.',
    'Agreement is per piece of text and against the teacher, not per answer against the truth.',
    'A smaller model never matches exactly; what matters is whether the differences change the answers.',
    'It trained on that text, so agreement there flatters it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['heldout', 'p1'],
    narration: 'The student copied the teacher’s odds on the training text. The fair test is text neither model trained on: held-out text. At every place in it, both models pick their most likely next piece. Before you run them:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'measure', focus: 'measure', visibleControls: ['p1', 'measure'],
    narration: 'Run both models over the held-out documents, in your browser. It takes a moment.',
    predicate: s => s.measured && !!bothNow(),
    hint: 'Press “Compare them on held-out text”.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['results', 'quiz'],
    narration: 'Agreement counts how often the top picks match. KL divergence looks at the whole set of odds: even where the top pick matches, the student spreads its bets differently, and KL adds that up (0 would mean the same odds everywhere). These are Larkspur mini’s numbers, not any provider’s. Neither number says whether an answer is right. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is agreement measured against: the teacher, or the truth?',
  },
];

function Results() {
  return (
    <BothGate>{m => {
      const c = compare(m.teacher, m.student);
      return (
        <table className="tc-ledger" data-closeness>
          <caption>Held-out text, computed in your browser</caption>
          <thead><tr><th scope="col">Document</th><th scope="col">Places</th><th scope="col">Same top pick</th><th scope="col">KL per place</th></tr></thead>
          <tbody>
            {c.docs.map(d => (
              <tr key={d.doc}><th scope="row">{d.doc}</th><td>{num(d.positions)}</td><td>{pct(d.same / d.positions)}</td><td>{(d.kl / d.positions).toFixed(2)}</td></tr>
            ))}
            <tr data-total><th scope="row">All</th><td>{num(c.positions)}</td><td><strong>{pct(c.agreement)}</strong></td><td><strong>{c.kl.toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
      );
    }}</BothGate>
  );
}

export default function HowCloseIsTheStudent() {
  useEffect(() => { loadBoth().catch(() => {}); }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, measured: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <SmallStage models show={() => {
          const m = bothNow(), c = state.measured && m ? compare(m.teacher, m.student) : null;
          return {
            scene: { mode: 'distill', lit: c ? 'both' : null, lessons: false },
            caption: c ? `Over the held-out text the student picks what the teacher picks ${pct(c.agreement)} of the time; KL ${c.kl.toFixed(2)} per place.`
              : 'Teacher and student, ready to read the held-out documents.',
          };
        }} />
      )}
      controls={{
        heldout: () => (
          <div className="tc-def">
            <p className="lbl">Held-out documents</p>
            <p>{HELDOUT.docs.join(', ')}</p>
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        measure: ({ state, sync }) => (
          <BothGate>{() => <button type="button" className="big" onClick={() => sync({ ...state, measured: true })}>Compare them on held-out text</button>}</BothGate>
        ),
        results: ({ state }) => (
          <>
            <BothGate>{m => <Outcome {...P1} prediction={state.p1} outcome={agreeOutcome(compare(m.teacher, m.student).agreement)} />}</BothGate>
            <Results />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
