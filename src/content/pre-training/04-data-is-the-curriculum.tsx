// Chapter 4: data is the curriculum. Two recorded runs on the same prompt: the clean run, and the run with one document
// (the environmental policy) copied ten times into its data. The duplicated run finishes a prompt about what Larkspur
// sells with a sentence from the copied policy (the engine test proves it is the policy's own words).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { LAST, PROMPTS, RUNS, runOf, sampleOf } from '../../lib/pre-training/engine';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, PreTrainingStage, Says, runSeries, type View } from './kit';

const MODULE = 'pre-training',
  ID = '04-data-is-the-curriculum';
/** “Larkspur Supply Co. sells office and warehouse” */
export const PROMPT = 0;
const COPIES = RUNS.duplicated.copies;
const DUP = sampleOf('duplicated', PROMPT).trim();

interface S {
  p1: number | null;
  compared: boolean;
  curve: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Both runs finish “${PROMPTS[PROMPT].text}”. What will the run with the copied policy write?`,
  options: [
    'The same as the clean run: one document among dozens changes nothing',
    'A line lifted from the copied policy, even though the prompt is about something else',
    'Better facts about what Larkspur sells',
  ],
};

export const QUIZ = {
  question:
    'A support team pastes its refund policy into the training data fifty times so the model “really learns it”. What is the likely result?',
  options: [
    'The model memorises the policy’s wording and repeats it, even where it doesn’t fit',
    'The model understands refunds fifty times better',
    'Nothing: training ignores repeated text',
    'The model forgets the policy, because repeats cancel out',
  ],
  correct: 0,
  explanation: 'Repeated text gets memorised: the model learns the words, and they leak into unrelated replies.',
  why: [
    'Right: seeing the same words again and again teaches the model to reproduce them, as the duplicated run did.',
    'Repeats add no new information to understand; they add weight to one exact string of words.',
    'Every copy is trained on like any other text, so repeats count many times over.',
    'Repeats push the same way every time, so the policy is learnt more strongly, word for word.',
  ],
};

/** the foundry's parts a callout can point at (the Loss tab takes none) */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Same model, same steps; only the data mix changed. One duplicate document, ${COPIES} copies in all.`,
    act: 'Predict first.',
    say: { block: 'crates', text: `Copied ×${COPIES}` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'compare',
    focus: 'compare',
    visibleControls: ['p1', 'compare'],
    narration: 'These two runs trained ahead of time; their replies were saved at the last step.',
    act: 'Compare the two runs.',
    predicate: s => s.compared,
  },
  {
    id: 'curve',
    focus: 'curve',
    visibleControls: ['replies', 'curve'],
    narration: `“${DUP}” is the policy’s own sentence. Seen ${COPIES} times, it was memorised and leaks into other prompts.`,
    act: 'Show its loss.',
    say: { block: 'model', text: 'Parrots policy' },
    predicate: s => s.curve,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `Held-out loss ended at ${loss(runOf('duplicated').heldout.loss)}, worse than the clean run’s ${loss(runOf('clean').heldout.loss)}: steps spent on copies taught it less.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the run with ten copies do with the copied words?',
  },
];

export default function DataIsTheCurriculum() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, compared: false, curve: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <PreTrainingStage
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          show={() => ({
            scene: { step: LAST, mix: 'duplicated' },
            chart: state.curve ? { series: runSeries('duplicated') } : undefined,
            caption: state.compared
              ? `With the copies: “${PROMPTS[PROMPT].text} ${DUP}”`
              : `The run with one document copied ${COPIES} times into its data.`,
          })}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        compare: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, compared: true })}>
            Compare the two runs
          </button>
        ),
        replies: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <Says who="Clean run" prompt={PROMPT} text={sampleOf('clean', PROMPT)} live={false} />
            <Says who={`Policy copied ×${COPIES}`} prompt={PROMPT} text={DUP} live={false} />
          </>
        ),
        curve: ({ state, sync }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.curve}
            onClick={() => sync({ ...state, curve: true, view: 'chart' })}
          >
            Show its loss
          </button>
        ),
        facts: () => (
          <>
            <Fact id="dedup-copying" />
            <Fact id="dedup-less-memorised" />
            <p className="note in-note">
              When a model writes its own training data:{' '}
              <a href="/synthetic-data/06-keep-the-real-data/">Synthetic data</a>.
            </p>
            <p className="note in-note">
              When copies leak private data: <a href="/memorisation/">What a model remembers</a>.
            </p>
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
