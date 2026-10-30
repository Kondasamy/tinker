// Chapter 1: seen once, seen often. Pre-training's recorded runs (data/pre-training/runs.json, cited, not retrained):
// the clean run and the run with one policy copied ten times finish the same prompt. The reader predicts, then shows
// both endings: the duplicated run recites a line of the policy.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { PROMPTS, RUNS as PT, sampleOf } from '../../lib/pre-training/engine';
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { fact } from '../../lib/memorisation/facts';
import { Fact, RecitalStage } from './kit';

const MODULE = 'memorisation',
  ID = '01-seen-once-seen-often';
export const PARTS = RECITAL_PARTS;
const PROMPT = PROMPTS[0].text,
  COPIES = PT.duplicated.copies;
/** Each run's ending of the prompt, as recorded. */
export const ENDINGS = { clean: sampleOf('clean', 0).trim(), duplicated: sampleOf('duplicated', 0).trim() };

export const P1 = {
  question: `The run with the policy copied ${COPIES} times finishes “${PROMPT}”. What does it write?`,
  options: [
    'The same as the clean run: one document among dozens changes nothing',
    'A line from the copied policy, though the prompt is about something else',
    'A better description of what Larkspur sells',
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question: 'A team pastes the same welcome email into a model’s training text hundreds of times. What is the risk?',
  options: [
    'The model recites the email word for word, even where it doesn’t fit',
    'None: a model only learns patterns, never exact text',
    'The model ignores it, since repeats add nothing new',
  ],
  correct: 0,
  explanation: 'Text seen many times is memorised: it comes back word for word.',
  why: [
    'Right: every duplicate pushes the same exact words, so the model learns to recite them.',
    'Models learn patterns, but text they see often enough they also store exactly.',
    'Repeats add no information, yet each copy is trained on, so its words weigh more.',
  ],
};

export interface S {
  p1: number | null;
  shown: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Pre-training’s chapter trained two toy models, one clean and one with a duplicate: a company policy copied ${COPIES} times into its text.`,
    act: 'Predict first.',
    say: { block: 'ledger', text: `Policy ×${COPIES}` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'show',
    focus: 'show',
    visibleControls: ['p1', 'show'],
    narration: 'Both runs get the same opening line about what Larkspur sells.',
    act: 'Show both endings.',
    predicate: s => s.shown,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'endings', 'quiz'],
    narration:
      'The copied run recites its policy: memorisation. Text seen often is stored word for word, and comes back unasked.',
    act: 'One question to finish.',
    say: { block: 'reply', text: 'Recited' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a model do with words it saw again and again?',
  },
];

function Endings() {
  return (
    <>
      <ul className="mem-replies">
        <li>
          Clean run: <q>{`${PROMPT} ${ENDINGS.clean}`}</q>
        </li>
        <li>
          Policy ×{COPIES}: <q>{`${PROMPT} ${ENDINGS.duplicated}`}</q>
        </li>
      </ul>
      <p className="mem-note">
        Recorded runs of Larkspur mini, from{' '}
        <a href="/pre-training/04-data-is-the-curriculum/">Pre-training’s data chapter</a>.
      </p>
      <Fact id="lee-2021-repeats" />
      <p className="mem-note">{`The toy recited after ${COPIES} copies; real web text repeats one sentence over ${Number(fact('lee-2021-repeats').value).toLocaleString('en')} times.`}</p>
    </>
  );
}

export default function SeenOnceSeenOften() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, shown: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RecitalStage
          say={say}
          desk={{
            ledger: { label: `POLICY ×${COPIES}`, lit: COPIES },
            model: 'PRE-TRAINING RUN',
            reply: state.shown ? { text: 'RECITES POLICY', leak: true } : null,
          }}
          readout={state.shown ? [`Policy ×${COPIES}: “${ENDINGS.duplicated}”`] : []}
          caption={`One policy copied ${COPIES} times into the training text.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        show: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, shown: true })}>
            Show both endings
          </button>
        ),
        out: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        endings: () => <Endings />,
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
