// Chapter 2: two buyers, one hinge. With every count at 1, Jo at North and Kim at West buy in the same minute; each
// warehouse reads its own 1 before either writes, and two receipts print for one hinge.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { EVENTS, MOMENTS, REP_NAME, STOCK, clock, policyOf, runOf } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Clock, ConsistencyStage, Receipts, SimNote, type View } from './kit';

const MODULE = 'consistency',
  ID = '02-two-buyers-one-hinge';
export const PARTS = STOCK_PARTS;
export const RUN = runOf(policyOf({ r: 1, w: 1, rule: 'lww' }));
const LAST = MOMENTS.lastHinge,
  /** East sells the second-to-last hinge two minutes before */
  EAST = LAST - 2,
  START = MOMENTS.priyaBuys;
const [A, B] = EVENTS.filter(e => e.t === LAST && e.kind === 'order');

export const P1 = {
  question: `At ${clock(LAST)} ${A.who} at ${REP_NAME[A.at]} and ${B.who} at ${REP_NAME[B.at]} buy in the same minute. Both counts say 1. How many receipts print?`,
  options: [
    'One: the second buyer finds it sold out',
    'Two: each warehouse sells from its own count',
    'None: the warehouses block each other',
  ],
};
const receiptsAt = (t: number) => RUN.ticks[t].outcomes.filter(o => o.result === 'sold').length;
export const outcomeOf = () => (receiptsAt(LAST) === 2 ? 1 : receiptsAt(LAST) === 1 ? 0 : 2);

export const QUIZ = {
  question:
    'Two ticket booths each show 1 seat left for a concert. Two fans pay at the two booths in the same second. What happens?',
  options: ['Both get a ticket for the same seat', 'The second booth sees zero and refuses', 'Both are refused'],
  correct: 0,
  explanation: 'Each booth checked its own count before either sale was recorded, so both sold the seat.',
  why: [
    'Right: both booths read 1 at the same moment, and neither knew about the other’s sale.',
    'The second booth would see zero only if the first sale reached it before it checked.',
    'Each booth had a seat on its count, so neither had a reason to refuse.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'east',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `East sells a hinge at ${clock(EAST)}, leaving one. The news reaches the others two minutes later.`,
    act: `Move the clock to ${clock(EAST)}.`,
    say: { block: 'east', text: 'One left' },
    predicate: s => s.t >= EAST,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Two customers want the last hinge, one at North, one at West, in the same minute.',
    act: 'Predict the receipts.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'buy',
    focus: 'clock',
    visibleControls: ['p1', 'clock'],
    narration: 'Your pick is locked.',
    act: `Move the clock to ${clock(LAST)}.`,
    say: { block: 'west', text: 'Two receipts' },
    predicate: s => s.p1 !== null && s.t === LAST,
    hint: `Set the clock to exactly ${clock(LAST)}.`,
  },
  {
    id: 'oversold',
    focus: 'tab',
    visibleControls: ['out1', 'receipts', 'tab'],
    narration: `${RUN.sold.hinge} hinges sold from ${STOCK.hinge}: oversold. The two orders were concurrent, each reading 1 before either wrote.`,
    act: 'Open the Timeline tab.',
    predicate: s => s.view === 'timeline',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Here the copies agreed, and it still went wrong: both read before either wrote.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When each booth checked, had the other’s sale reached it?',
  },
];

export default function TwoBuyersOneHinge() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: START, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <ConsistencyStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: stockAt(RUN, state.t),
            result: RUN,
            tick: state.t,
            caption: `${clock(state.t)}. Every warehouse sells from its own count.`,
          }}
        />
      )}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="cs-clock2" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        receipts: () => <Receipts run={RUN} t={LAST} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'timeline' })}>
            Open the Timeline tab
          </button>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <SimNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
