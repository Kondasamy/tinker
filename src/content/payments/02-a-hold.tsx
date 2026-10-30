// Chapter 2: a hold, not a payment. Mona's bank says yes and holds her basket's price; the reader predicts what
// Larkspur charges on the day only part of it ships, moves the clock to the second parcel, then watches Finn's
// cancelled order's hold lapse on its day.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { HOLD_DAYS, cardAt, clock, eur, orderOf, policyOf, runOf } from '../../lib/payments/sim';
import { TUBE_PARTS, hopAt, journeyOf, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, Clock, Fact, PaymentsStage, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '02-a-hold';
export const PARTS = TUBE_PARTS;
export const RUN = runOf(policyOf({ sca: 'risk', capture: 'shipment', key: true }));
const MONA = orderOf('N14'),
  FINN = orderOf('F6');
const monaRun = RUN.orders.find(o => o.order.id === MONA.id)!;
/** the tick the vice ships, and the tick Finn's hold lapses */
export const SECOND = MONA.ships[1].day * 2;
export const LAPSE = HOLD_DAYS * 2;

export const P1 = {
  question: `Only the brackets (${eur(MONA.ships[0].cents)}) ship today. What does Larkspur charge Mona today?`,
  options: [
    `${eur(MONA.cents)}: the whole basket`,
    `${eur(MONA.ships[0].cents)}: only what shipped`,
    'Nothing until it all ships',
  ],
};
export const outcomeOf = () => {
  const c = cardAt(RUN, 0, [MONA.id]).charged;
  return c === MONA.cents ? 0 : c === MONA.ships[0].cents ? 1 : 2;
};

export const QUIZ = {
  question: 'A hotel holds €200 on your card at check-in, and your stay comes to €150. What happens to the other €50?',
  options: [
    'It is never charged: the hold is released or lapses',
    'It is charged, then refunded later',
    'The hotel keeps it as a fee',
  ],
  correct: 0,
  explanation: 'A hold only sets money aside; the shop captures what it is owed, and the rest is freed.',
  why: [
    'Right: only the captured €150 is charged, and the rest of the hold is let go.',
    'Nothing beyond the capture is ever charged, so there is nothing to refund.',
    'A hold isn’t money the shop has; it can only capture what the stay cost.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  who: 'mona' | 'finn';
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'hold',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Mona orders shelf brackets and a bench vice. Her bank says yes and puts a hold on ${eur(MONA.cents)}.`,
    act: 'Predict what Larkspur charges today.',
    say: { block: 'wallet', text: 'Held, not paid' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'capture',
    focus: 'clock',
    visibleControls: ['out1', 'clock'],
    narration: 'Larkspur captures only what shipped. The rest stays on hold, still Mona’s money.',
    act: `Move the clock to ${clock(SECOND)}.`,
    say: { block: 'till', text: 'Captures' },
    predicate: s => s.t >= SECOND,
    hint: `Slide the clock to ${clock(SECOND)}, when the vice ships.`,
  },
  {
    id: 'finn',
    focus: 'finn',
    visibleControls: ['finn'],
    narration: 'The vice shipped, so Larkspur captured the rest. Now Finn: he cancelled his brass hooks.',
    act: 'Show Finn’s order.',
    predicate: s => s.who === 'finn',
  },
  {
    id: 'lapse',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: 'Nobody captures Finn’s hold. It waits until it lapses.',
    act: `Move the clock to ${clock(LAPSE)}.`,
    say: { block: 'wallet', text: 'Free again' },
    predicate: s => s.who === 'finn' && s.t >= LAPSE,
    hint: `Slide the clock to ${clock(LAPSE)}.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A yes is a promise, not a payment. Money moves only when the shop captures it.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a hold take money, or set it aside?',
  },
];

export default function AHold() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, who: 'mona', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const ids = [state.who === 'mona' ? MONA.id : FINN.id];
        // before the pick: the moment Mona's bank said yes
        const scene = state.p1 === null ? hopAt(monaRun, journeyOf(monaRun).length - 1) : tubeAt(RUN, state.t, ids);
        const c = cardAt(RUN, state.t, ids);
        return (
          <PaymentsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene,
              result: RUN,
              tick: state.t,
              ids,
              caption:
                state.p1 === null
                  ? 'The yes is back at the till.'
                  : `${clock(state.t)}. ${state.who === 'mona' ? 'Mona' : 'Finn'}: ${eur(c.held)} held, ${eur(c.charged)} charged.`,
            }}
          />
        );
      }}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="pm-clock2" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        finn: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, who: 'finn' })}>
            Show Finn’s order
          </button>
        ),
        fact: () => (
          <>
            <Fact id="hold" />
            <Fact id="hold-days" />
            <Assumed k="hold" />
            <SimNote />
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
