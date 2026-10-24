// Chapter 1: the smallest full loop. The reader sends a question (act), predicts the reply, sees it (observe, with
// their prediction beside it), then answers a checkpoint quiz with a `why` per option and "I'm not sure".
// Text in the picture is short; anything long belongs in the story column or a drawer panel.
// What the reader does now goes in `act`, drawn as its own highlighted line, never buried at the end of the narration.
// Copy budgets (tests/unit/copy-budget.test.ts): a step's narration and act together are at most 25 words, each quiz `why` one sentence,
// and every chapter term appears in the narration so it is defined where it is used. Let the picture show what happened;
// a step's `say` pins a short callout (at most 5 words) on the stage when the stage draws one.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import FlatStage from '../../components/scenes/FlatStage';
import type { Lane, Msg } from '../../lib/iso/flat';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import DATA from '../../../data/__ID__/facts.json' with { type: 'json' };

const MODULE = '__ID__',
  ID = '01-first-step';
const fact = (id: string) => DATA.facts.find(f => f.id === id)!;

export const LANES: Lane[] = [
  { id: 'you', name: 'You' },
  { id: 'sys', name: 'System' },
];
export const MSGS: Msg[] = [
  { from: 'you', to: 'sys', kind: 'request', text: 'A question' },
  { from: 'sys', to: 'you', kind: 'result', text: 'Its reply' },
];

interface S {
  asked: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

const PREDICT = {
  question: 'What will the system send back?',
  options: ['What really happens', 'A plausible misconception', 'Another plausible misconception'],
};
const OUTCOME = 0; // the option that matches what the picture shows

export const QUIZ = {
  question: 'A checkpoint question, asked in a new situation?',
  options: ['The right answer', 'A plausible misconception', 'Another plausible misconception'],
  correct: 0,
  explanation: fact('core-idea').claim,
  why: [
    `Right: ${fact('core-idea').claim}`,
    'Name the misconception behind this pick.',
    'And the one behind this pick.',
  ],
};

// The parts of the picture a step's `say` may name: a scene's exported list (e.g. OFFICE_PARTS), or none for this flat
// chart. tests/unit/say-targets.test.ts holds every callout to it.
export const PARTS: readonly string[] = [];

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'Orient: what the system does, and why it matters here.',
    act: 'Send the question.',
    predicate: s => s.asked,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The question is on its way.',
    act: 'Before you look, predict the reply.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal'],
    narration: 'Locked in.',
    act: 'See what comes back.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: fact('reply').claim,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'A hint that points at the idea, not the answer.',
  },
];

export default function FirstStep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <FlatStage lanes={LANES} msgs={MSGS} upTo={state.revealed ? 2 : state.asked ? 1 : 0} />}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Send the question
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Show the reply"
          />
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
