// Chapter 3: the opposite step (R6f.3). Stock and courier already carry a round return sign (their opposite); the reader
// picks the refund's opposite from three (only "charge it back" cancels what the refund meant). The courier fails
// again: the car runs back down the hill, lowering the refund's flag and then the stock's, newest first, and the email's
// flag stays up. The stage closes in on refund and stock. The reveal cites the saga guarantee and semantic undo.
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { FUNI_PARTS, type Funi } from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { COURIER_FAILS, policy, REFUND_OPPOSITES, run } from '../../lib/agent-undo/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FuniStage, funiOf, START } from './kit';

const MODULE = 'agent-undo',
  ID = '03-the-opposite-step';
const P = policy({ undo: { stock: true, refund: true, email: false, courier: true } });
const RUN = run(P, COURIER_FAILS);

interface S {
  /** the refund's opposite, once a right one is set */
  opp: string | null;
  prediction: number | null;
  ran: boolean;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'The courier fails again. In what order do the opposite steps run?',
  options: [
    'Newest first: the refund, then the stock',
    'Oldest first: the stock, then the refund',
    'Both at the same time',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A bot booked a meeting room, then the meeting fell through. What is the opposite step?',
  options: ['Cancel the booking', 'Put back yesterday’s copy of the calendar', 'Book the room a second time'],
  correct: 0,
  explanation: fact('semantic-undo').claim,
  why: [
    'Right: it cancels what the booking meant, and leaves everyone else’s changes alone.',
    'An old copy would wipe every booking others made since: undo the meaning, not the whole state.',
    'That repeats the step instead of cancelling it.',
  ],
};

export const PARTS = FUNI_PARTS;

export function sceneOf(s: S): Funi {
  if (s.ran) return funiOf(RUN, P);
  return { ...START, opp: s.opp ? ['stock', 'refund', 'courier'] : ['stock', 'courier'], lit: s.opp ? null : 'refund' };
}

export const STEPS: Step<S>[] = [
  {
    id: 'pick',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: 'An opposite step cancels a step. Stock and courier carry theirs: a round blue sign.',
    act: 'Pick the refund’s opposite step, then press Set.',
    say: { block: 'refund', text: 'No opposite' },
    status: 'The refund now carries a blue return sign: charge the $89 back.',
    predicate: s => s.opp !== null,
    hint: 'Which one puts the money back where it was?',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Three opposites set; a job built this way is a saga. The courier is about to fail again.',
    act: 'Predict the order the opposites run in.',
    status: 'Three stations carry blue return signs; the post box has none.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'Pick locked. Watch which flag comes down first.',
    act: 'Press Run, or tap the car.',
    status: 'Courier failed; the car ran down lowering refund, then stock; the post box flag stays up.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Newest first, back down the hill: the $89 charged back, then the drill off the shelf.',
    act: 'Check your prediction.',
    closeUp: ['refund', 'stock'],
    status: 'Blue flags, lowered, at the refund and the stock.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The post box flag still flies: that email went out. The next chapter deals with it.',
    act: 'One question to finish.',
    status: 'Refund and stock undone; the email still stands.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Undo what the booking meant.',
  },
];

function Pick({ onSet }: { onSet: (id: string) => string | undefined }) {
  const [v, setV] = useState(REFUND_OPPOSITES[1].id);
  const [why, setWhy] = useState<string | undefined>();
  return (
    <>
      <div className="au-pick">
        <Select value={v} onChange={e => setV(e.target.value)} aria-label="Opposite for the refund">
          {REFUND_OPPOSITES.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
        <button type="button" className="big" onClick={() => setWhy(onSet(v))}>
          Set
        </button>
      </div>
      {why && (
        <p className="au-why" role="status">
          {why}
        </p>
      )}
    </>
  );
}

export default function TheOppositeStep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ opp: null, prediction: null, ran: false, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <FuniStage
          scene={sceneOf(state)}
          twin={{
            buttons: [
              {
                label: 'Run',
                tap: 'car',
                act: () => {
                  if (!state.opp) return 'Set the refund’s opposite first.';
                  if (state.prediction === null) return 'Make your prediction first.';
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
        pick: ({ state, apply }) => (
          <Pick
            onSet={id => {
              const o = REFUND_OPPOSITES.find(x => x.id === id)!;
              if (o.ok) apply({ ...state, opp: id });
              else apply({ ...state });
              return o.why;
            }}
          />
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
            label="See the undo order"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="reverse-order" />
              <Fact id="saga" />
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
