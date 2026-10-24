// Chapter 3: held out. The reader predicts how held-out loss moves against training loss, scores the last checkpoint on
// the held-out documents (live, in the browser), then opens both recorded curves and reads the gap as it widens.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { LAST, STEPS as SHELF, checkpoint, gapAt, heldoutScore } from '../../lib/pre-training/engine';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { CKPT_SERIES, CkptGate, PreTrainingStage, ckptNow, type View } from './kit';

const MODULE = 'pre-training',
  ID = '03-held-out';
/** the checkpoint the gap is first read at: a third of the way along the shelf */
export const EARLY = SHELF[Math.floor(SHELF.length / 3)];
const T = checkpoint(LAST).train.loss;

interface S {
  p1: number | null;
  scored: boolean;
  curve: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: 'Over the run, how does held-out loss move compared with training loss?',
  options: [
    'It falls just as far: text is text',
    'It falls too, but less, and the gap between them grows',
    'It rises from the very start',
  ],
};
/** what the recorded curves show: held-out fell, the gap grew */
export const OUTCOME = checkpoint(LAST).heldout.loss < checkpoint(0).heldout.loss && gapAt(LAST) > gapAt(EARLY) ? 1 : 0;

export const QUIZ = {
  question:
    'A model scores far better on the documents it trained on than on new ones, and the difference grows the longer it trains. What is happening?',
  options: [
    'It is memorising its training text, and that part doesn’t carry over to new text',
    'The new documents must be harder, so the scores can’t be compared',
    'It is learning faster on new text than on old',
    'Nothing to worry about: a growing gap always means better quality',
  ],
  correct: 0,
  explanation: 'A widening gap between training and held-out loss is the signature of memorising.',
  why: [
    'Right: the training score keeps improving on text it has seen, while text it hasn’t seen gains far less.',
    'The held-out documents were picked from the same collection, so the growing gap comes from the model.',
    'It is the other way round: the training text improves fastest, since that is what each step is fitted to.',
    'Only the held-out score says how the model will do on new text, and a growing gap means more of each gain doesn’t carry over.',
  ],
};

/** the foundry's parts a callout can point at (the Loss tab takes none) */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The team kept some documents back as held-out text: never trained on, only used to score the model.',
    act: 'Predict first.',
    say: { block: 'crates', text: 'Some kept back' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'score',
    focus: 'score',
    visibleControls: ['p1', 'score'],
    narration: `Its training loss ended at ${loss(T)}. Now score it on text it never saw, live in your browser.`,
    act: `Score step ${LAST} on held-out text.`,
    say: { block: 'shelf', text: 'Last checkpoint' },
    predicate: s => s.scored && !!ckptNow(LAST),
  },
  {
    id: 'curve',
    focus: 'curve',
    visibleControls: ['scores', 'curve'],
    narration: 'Higher: text it never saw surprises it more. One number can’t say how that changed over the run.',
    act: 'Show both curves.',
    predicate: s => s.curve,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['outcome', 'quiz'],
    narration: `The gap grew from ${loss(gapAt(EARLY))} at step ${EARLY} to ${loss(gapAt(LAST))}: more and more of each step went into memorising.`,
    act: 'One question to finish.',
    say: { block: 'model', text: 'Memorising' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which score tells you how the model does on text it has never seen?',
  },
];

export default function HeldOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, scored: false, curve: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <PreTrainingStage
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          show={() => ({
            scene: { step: LAST },
            chart: state.curve ? { series: CKPT_SERIES } : undefined,
            caption: state.curve
              ? `Training and held-out loss at each of the ${SHELF.length} checkpoints, as the run recorded them.`
              : `Step ${LAST}, the last checkpoint: training loss ${loss(T)}.`,
          })}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        score: ({ state, sync }) => (
          <CkptGate step={LAST}>
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, scored: true })}>
                Score step {LAST} on held-out text
              </button>
            )}
          </CkptGate>
        ),
        scores: () => (
          <CkptGate step={LAST}>
            {m => (
              <table className="tc-ledger" data-scores>
                <caption>Step {LAST}, lower is better</caption>
                <tbody>
                  <tr>
                    <th scope="row">Training loss (recorded)</th>
                    <td>{loss(T)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Held-out loss (live, in your browser)</th>
                    <td>{loss(heldoutScore(m).loss)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </CkptGate>
        ),
        outcome: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        curve: ({ state, sync }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.curve}
            onClick={() => sync({ ...state, curve: true, view: 'chart' })}
          >
            Show both curves
          </button>
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
