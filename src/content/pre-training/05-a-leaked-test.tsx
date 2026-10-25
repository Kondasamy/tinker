// Chapter 5: a leaked test. A recorded run trained with the team's test questions (and their answers) in its data.
// The reader predicts, then scores it beside the clean run on the test questions and on held-out text: the test score
// improves, held-out text does not. Both scores were recorded when the runs trained.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { LAST, RUNS, runOf, type RunId } from '../../lib/pre-training/engine';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, PreTrainingStage } from './kit';

const MODULE = 'pre-training',
  ID = '05-a-leaked-test';
const [C, L] = [runOf('clean'), runOf('leaked')];

interface S {
  p1: number | null;
  scored: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'Compared with the clean run, how will the run that saw the test questions score?',
  options: [
    'Better on the test questions and better on held-out text',
    'Better on the test questions, no better on held-out text',
    'The same on both: a few questions are too few to matter',
  ],
};
/** what the recorded scores show */
export const OUTCOME = L.leaked.loss < C.leaked.loss ? (L.heldout.loss < C.heldout.loss ? 0 : 1) : 2;

export const QUIZ = {
  question:
    'A new model tops a public benchmark, far ahead of the last one, but customers say it is no better at their own tasks. What should the team check first?',
  options: [
    'Whether the benchmark’s questions were in the model’s training data',
    'Whether customers are using it wrong',
    'Whether the benchmark is too easy for any model',
    'Nothing: a benchmark score can’t be wrong',
  ],
  correct: 0,
  explanation: 'A test the model trained on measures memory, not skill, so check for contamination first.',
  why: [
    'Right: a contaminated benchmark rewards having seen the questions, which helps nothing else, as the leaked run showed.',
    'The gap between a high test score and no real gain points at the test, not the users.',
    'An easy benchmark would flatter every model alike, not one model far ahead of the rest.',
    'A score is only as good as its test, and a test the model trained on stops measuring what it was built for.',
  ],
};

/** the foundry's parts a callout can point at */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A leak: the test questions sat in the training data. Score the run on them, and on held-out text.',
    act: 'Predict first.',
    say: { block: 'crates', text: 'Test Qs mixed in' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'score',
    focus: 'score',
    visibleControls: ['p1', 'score'],
    narration: 'Both runs were scored when they trained. Lower loss is better.',
    act: 'Score both runs.',
    predicate: s => s.scored,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scores', 'quiz'],
    narration: `Test loss fell from ${loss(C.leaked.loss)} to ${loss(L.leaked.loss)}; held-out text got no better. Contamination makes a test look passed.`,
    act: 'One question to finish.',
    say: { block: 'model', text: 'Saw the test' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If a model has seen the questions, what is a test of those questions measuring?',
  },
];

const RUN_NAME: Partial<Record<RunId, string>> = { clean: 'Clean run', leaked: 'Saw the test questions' };

export default function ALeakedTest() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, scored: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <PreTrainingStage
          say={say}
          show={() => ({
            scene: { step: LAST, mix: 'leaked' },
            caption: state.scored
              ? `Test questions: loss ${loss(L.leaked.loss)}, against ${loss(C.leaked.loss)} clean. Held-out text: ${loss(L.heldout.loss)}, against ${loss(C.heldout.loss)}.`
              : `${RUNS.leaked.length} test questions, answers included, in the training data.`,
          })}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        score: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, scored: true })}>
            Score both runs
          </button>
        ),
        scores: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <table className="tc-ledger" data-scores>
              <caption>Loss at step {LAST}, recorded (lower is better)</caption>
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Test questions</th>
                  <th scope="col">Held-out text</th>
                </tr>
              </thead>
              <tbody>
                {(['clean', 'leaked'] as RunId[]).map(id => (
                  <tr key={id} data-run={id}>
                    <th scope="row">{RUN_NAME[id]}</th>
                    <td>{loss(runOf(id).leaked.loss)}</td>
                    <td>{loss(runOf(id).heldout.loss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Fact id="contamination" />
            <Fact id="dedup-overlap" />
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
