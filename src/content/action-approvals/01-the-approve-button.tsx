// Chapter 1: the approve button (R6b.1). Every refund stops at the barrier until Rosa flips the hourglass. The reader
// delivers the morning's three letters and approves each, as Rosa does forty times a day; one was a fake refund to
// order 88. The reveal closes in on it in the paid bin and cites Anthropic on approval fatigue and Willison on clicking
// OK. Letters and amounts are a hand-written example week (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { TOLL_PARTS } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import { PROMPTS_PER_DAY, waiting, type Policy } from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, decided, Fact, left, replay, rowsOf, tollOf, ToyNote, type Ev } from './kit';

const MODULE = 'action-approvals',
  ID = '01-the-approve-button';
export const POLICY: Policy = { ask: 'all', budget: null, expiry: 'forever' };
export const QUEUE = ['saw-41', 'kettle-52', 'fake-88'];

interface S {
  log: Ev[];
  /** the fake refund is marked (set on entering the reveal) */
  found: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Rosa answers about ${PROMPTS_PER_DAY} of these a day. What happens to how closely she reads them?`,
  options: [
    'She stops reading and clicks yes',
    'She gets better at spotting the bad ones',
    'Nothing changes: she reads each one the same',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A finance team must approve every expense claim an assistant files, about 60 a day. What is the likely result?',
  options: [
    'They approve most without reading, so a bad claim slips through',
    'Every bad claim is caught, since a person checks each one',
    'The assistant files fewer claims, knowing someone checks',
  ],
  correct: 0,
  explanation: fact('approval-fatigue').claim,
  why: [
    'Right: a yes asked for everything becomes a reflex, and the bad claim looks like the other fifty-nine.',
    'A check only works while it is read, and sixty alike a day wear the reading down.',
    'The assistant doesn’t change what it files because someone approves it later.',
  ],
};

export const PARTS = TOLL_PARTS;
const desk = (s: S) => replay(POLICY, s.log);

export const STEPS: Step<S>[] = [
  {
    id: 'deliver',
    focus: 'deliver',
    visibleControls: [],
    narration: 'Every refund the assistant writes stops at the barrier for an approval: Rosa’s yes.',
    act: 'Drag a letter into the in-tray, or press Deliver.',
    say: { block: 'gate', text: 'Waits for a yes' },
    status: 'A refund waits at the barrier beside an hourglass for Rosa’s yes.',
    predicate: s => s.log.length > 0,
    hint: 'Press Deliver the next letter under the picture.',
  },
  {
    id: 'approve',
    focus: 'approve',
    visibleControls: [],
    narration: 'Her yes is a flip of the hourglass.',
    act: 'Approve: tap the hourglass, or press Approve.',
    say: { block: 'hourglass', text: 'Her yes' },
    status: 'The barrier rose: the saw refund lies in the paid bin, and a pass stands on the counter.',
    predicate: s => decided(s.log) > 0,
    hint: 'Press Approve under the picture.',
  },
  {
    id: 'rush',
    focus: 'deliver',
    visibleControls: [],
    narration: `It’s busy: Rosa answers about ${PROMPTS_PER_DAY} of these a day.`,
    act: 'Deliver and approve the other two letters.',
    say: { block: 'paid', text: 'All approved' },
    status: 'All three of the morning’s refunds lie in the paid bin.',
    predicate: s => decided(s.log) >= QUEUE.length,
    hint: 'Deliver a letter, approve it, then do the same again.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Every prompt looks the same: a refund, an hourglass, a yes.',
    act: 'Predict: how closely does Rosa read them?',
    status: 'The paid bin holds three refunds; the barrier is down.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. One refund was for order 88, asked by a fake billing address.',
    act: 'Check your prediction.',
    closeUp: ['paid'],
    say: { block: 'paid', text: 'A fake refund' },
    status: 'The fake order-88 refund is ringed and marked red in the paid bin.',
    setup: s => ({ ...s, found: true }),
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A yes asked for everything stops being read, and the bad one goes through with the rest.',
    act: 'One question to finish.',
    status: 'The fake refund stays in the paid bin with the good ones.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the sixtieth check of the day look like to the person doing it?',
  },
];

export default function TheApproveButton() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ log: [], found: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const d = desk(state),
          rest = left(QUEUE, state.log),
          found = state.found;
        return (
          <ApprovalsStage
            scene={tollOf(d, {
              p: POLICY,
              dye: false,
              next: rest,
              bad: found ? ['fake-88'] : [],
              lit: found ? 'fake-88' : null,
              litZoom: !state.revealed,
            })}
            rows={rowsOf(d, false)}
            deliver={() => {
              if (waiting(d)) return 'A refund already waits at the barrier: approve it first.';
              if (!rest.length) return 'The crate is empty: every letter is delivered.';
              apply({ ...state, log: [...state.log, { l: rest[0] }] });
              return undefined;
            }}
            approve={() => {
              if (!waiting(d)) return 'Nothing waits at the barrier: deliver a letter first.';
              apply({ ...state, log: [...state.log, { yes: true }] });
              return undefined;
            }}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
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
            label="Look in the paid bin"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="approval-fatigue" />
              <Fact id="click-ok" />
              <p className="note">
                Fewer, better prompts help:{' '}
                <a href="/sandboxing/06-fewer-prompts/">Agent sandboxing’s “Fewer prompts”</a> cuts them by walling the
                assistant in.
              </p>
              <ToyNote>The {PROMPTS_PER_DAY} a day is hand-set too.</ToyNote>
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
