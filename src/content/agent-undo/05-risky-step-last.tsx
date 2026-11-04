// Chapter 5: do the risky step last (R6f.5). The reader predicts where the post box belongs, then drags it up the hill
// above the courier (or uses Move up and Move down). The courier fails again: the car undoes refund and stock and never
// reaches the post box, whose flag never flies and which holds no letter. The stage closes in on it. The reveal cites
// Garcia-Molina and Salem: the saga's last step needs no compensating step.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { ALL_UNDO, COURIER_FAILS, ORDER, policy, run, type StepId } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START } from './kit';

const MODULE = 'agent-undo',
  ID = '05-risky-step-last';
const OPP: Funi['opp'] = ['stock', 'refund', 'courier'];

interface S {
  prediction: number | null;
  order: StepId[];
  ran: boolean;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Where should the post box go so a courier failure never needs a second letter?',
  options: ['At the top, after the courier', 'At the bottom, before everything', 'Where it is, third'],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'An agent will charge a card, reserve a seat and text the customer a ticket. Which goes last?',
  options: ['Texting the ticket', 'Charging the card', 'Reserving the seat'],
  correct: 0,
  explanation: fact('last-step').claim,
  why: [
    'Right: a text can’t be unsent, so it waits until everything that can fail has worked.',
    'A charge can be refunded; the text is the one step with no opposite.',
    'A seat can be released; the text is the one step with no opposite.',
  ],
};

export const PARTS = FUNI_PARTS;

export function sceneOf(s: S): Funi {
  if (s.ran)
    return funiOf(
      run(policy({ order: s.order, undo: ALL_UNDO }), COURIER_FAILS),
      policy({ order: s.order, undo: ALL_UNDO }),
    );
  return { ...START, order: s.order, opp: OPP, lit: s.order.at(-1) === 'email' ? 'email' : null };
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The post box is the one station with no opposite. The courier, above it, is the one that fails.',
    act: 'Predict where the post box belongs.',
    say: { block: 'email', text: 'No opposite' },
    status: 'Stations bottom to top: stock, refund, post box, courier.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'order',
    focus: 'order',
    visibleControls: ['predict'],
    narration: 'Pick locked. Move the post box to the top of the hill.',
    act: 'Drag the post box up past the courier, or press its up arrow.',
    status: 'The post box now stands at the top, above the courier.',
    predicate: s => s.order.at(-1) === 'email',
    hint: 'Press Move Post box up under the picture.',
    solution: s => ({ ...s, order: ['stock', 'refund', 'courier', 'email'] }),
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'The courier is about to fail again, now third.',
    act: 'Press Run, or tap the car.',
    status: 'Courier failed; the car undid refund and stock and never reached the post box.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'The failure came before the email, so no email went out and no follow-up was needed.',
    act: 'Check your prediction.',
    closeUp: ['email'],
    say: { block: 'email', text: 'Never sent' },
    status: 'The post box at the top holds no letter; its flag never flew.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Give every step an opposite, and do the one you can’t undo last.',
    act: 'One question to finish.',
    status: 'Refund and stock undone; the post box untouched at the top.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which of the three has no opposite?',
  },
];

export default function RiskyStepLast() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ prediction: null, order: ORDER, ran: false, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <FuniStage
          scene={sceneOf(state)}
          twin={{
            order: o => {
              if (state.prediction === null) return 'Make your prediction first.';
              if (state.ran) return 'The run is over; the order is set.';
              apply({ ...state, order: o });
              return undefined;
            },
            buttons: [
              {
                label: 'Run',
                tap: 'car',
                act: () => {
                  if (state.order.at(-1) !== 'email') return 'Move the post box to the top first.';
                  if (state.ran) return 'The run is over: the car is back in the valley.';
                  return void apply({ ...state, ran: true });
                },
              },
            ],
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the post box"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="last-step" />
              <Fact id="second-letter" />
            </>
          ) : null,
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
