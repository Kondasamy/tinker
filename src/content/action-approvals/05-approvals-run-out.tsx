// Chapter 5: approvals run out (R6b.5). Rosa's yes for Ada's saw leaves a full hourglass on the counter: a pass for order
// 41, for one hour. A letter for order 88 isn't covered and waits; the reader refuses it. An hour passes and the sand
// runs out. The reader predicts what a second order-41 refund does; the reveal delivers it and closes in on the
// barrier and the spent hourglass: it waits for a fresh yes. Cites Claude Code's permission docs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { PASS_HOURS, waiting, type Policy } from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, Fact, left, replay, rowsOf, tollOf, ToyNote, type Ev } from './kit';

const MODULE = 'action-approvals',
  ID = '05-approvals-run-out';
export const POLICY: Policy = { ask: 'dyed', budget: null, expiry: 'hour' };
export const QUEUE = ['saw-41', 'fake-88', 'reuse-41'];

interface S {
  log: Ev[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'A new letter asks to refund order 41 again. Rosa’s yes for order 41 has run out. What happens?',
  options: [
    'It waits at the barrier for a fresh yes',
    'It goes straight through: order 41 was approved',
    'It is stopped for good, with no one asked',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'You let a coding assistant run “delete the temp folder” without asking again. A week later it wants to run a different delete. What should happen?',
  options: [
    'It asks again: your yes named one command and should have run out',
    'It runs: you already approved deleting',
    'Every delete is blocked for good',
  ],
  correct: 0,
  explanation: fact('approval-lasts').claim,
  why: [
    'Right: a yes covers what it named, for as long as it says, and a new action needs a new yes.',
    'A yes for one command isn’t a yes for every command like it; that reuse is how an old approval gets abused.',
    'Blocking everything stops the safe deletes too; a fresh question is enough.',
  ],
};

export const PARTS = TOLL_PARTS;
const desk = (s: S) => replay(POLICY, s.log);
const waited = (s: S) => s.log.some(e => 'wait' in e);
const deliveredAll = (s: S, id: string) => s.log.some(e => 'l' in e && e.l === id);

export const STEPS: Step<S>[] = [
  {
    id: 'approve',
    focus: 'deliver',
    visibleControls: [],
    narration: `Ada’s saw arrived cracked. Rosa’s yes leaves a pass on the counter: order 41, for ${PASS_HOURS} hour.`,
    act: 'Deliver Ada’s letter, then flip the hourglass.',
    say: { block: 'hourglass', text: 'Order 41 only' },
    status: 'A full hourglass with order 41’s blue band stands on the counter; the blue-stickered saw refund is paid.',
    predicate: s => desk(s).passes.length > 0,
    hint: 'Press Deliver the next letter, then Approve.',
  },
  {
    id: 'other',
    focus: 'deliver',
    visibleControls: [],
    narration: 'The fake billing letter asks for order 88 within the hour. The pass names order 41 only.',
    act: 'Deliver it, then refuse it.',
    status:
      'The pink-stickered order-88 refund didn’t match the blue pass: it waited, and now lies in the stopped tray.',
    predicate: s => desk(s).slips.some(x => x.id === 'fake-88' && x.fate === 'stopped'),
    hint: 'Press Deliver the next letter, then Refuse.',
  },
  {
    id: 'wait',
    focus: 'wait',
    visibleControls: ['wait'],
    narration: 'Rosa takes her lunch. An hour passes.',
    act: 'Press Wait an hour.',
    say: { block: 'stopped', text: 'Not order 41' },
    status: 'The sand ran down: order 41’s hourglass is empty, with tomato ends.',
    predicate: waited,
    hint: 'Press Wait an hour under the step.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'A letter from a new address asks to refund order 41 again.',
    act: 'Predict: what happens at the barrier?',
    say: { block: 'hourglass', text: 'Run out' },
    status: 'The empty hourglass stands on the counter; nothing waits at the barrier.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The new letter is in the crate.',
    act: 'Deliver the letter, then check your prediction.',
    closeUp: ['gate', 'hourglass'],
    status: 'A blue-stickered order-41 refund waits at the barrier: its blue hourglass had run out.',
    predicate: s => s.revealed && deliveredAll(s, 'reuse-41'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A yes names one order and runs out, so an old one can’t wave a new refund through.',
    act: 'One question to finish.',
    status: 'The second order-41 refund still waits at the barrier for a fresh yes.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did your yes name, and for how long?',
  },
];

export default function ApprovalsRunOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ log: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const d = desk(state),
          rest = left(QUEUE, state.log);
        return (
          <ApprovalsStage
            scene={tollOf(d, { p: POLICY, dye: false, next: rest, tags: true })}
            rows={rowsOf(d, false)}
            deliver={() => {
              if (waiting(d)) return 'A refund already waits at the barrier: answer it first.';
              if (rest.length <= 1 && !waited(state)) return 'Wait an hour first.';
              if (rest.length <= 1 && state.prediction === null)
                return 'Predict first: what will happen at the barrier?';
              if (!rest.length) return 'Every letter is delivered.';
              apply({ ...state, log: [...state.log, { l: rest[0] }] });
              return undefined;
            }}
            approve={() => {
              if (!waiting(d)) return 'Nothing waits at the barrier: deliver a letter first.';
              if (waiting(d)!.order !== 41 || d.passes.length)
                return 'Rosa would not approve this one: it isn’t Ada’s refund.';
              apply({ ...state, log: [...state.log, { yes: true }] });
              return undefined;
            }}
            refuse={() => {
              if (!waiting(d)) return 'Nothing waits at the barrier: deliver a letter first.';
              apply({ ...state, log: [...state.log, { yes: false }] });
              return undefined;
            }}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        wait: ({ state, apply }) => (
          <button
            type="button"
            className="big"
            disabled={waited(state)}
            onClick={() => apply({ ...state, log: [...state.log, { wait: PASS_HOURS }] })}
          >
            Wait an hour
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) =>
          !deliveredAll(state, 'reuse-41') ? null : (
            <Reveal
              prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
              outcome={PREDICT.options[OUTCOME]}
              revealed={state.revealed}
              onReveal={() => apply({ ...state, revealed: true })}
              label="Watch the barrier"
            />
          ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="approval-lasts" />
              <ToyNote>The one-hour pass is hand-set.</ToyNote>
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
