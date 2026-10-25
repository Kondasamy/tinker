// Chapter 1: one count, three copies. Every warehouse keeps a replica of the stock count; the reader moves the clock to
// North's first sale, predicts what West shows a minute later, sees the old count, then the timeline's arrivals.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { LAG, MOMENTS, STOCK, clock, policyOf, runOf } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Clock, ConsistencyStage, SimNote, type View } from './kit';

const MODULE = 'consistency',
  ID = '01-one-count-three-copies';
export const PARTS = STOCK_PARTS;
/** reads and writes reach one copy, the morning with no outage */
export const RUN = runOf(policyOf({ r: 1, w: 1, rule: 'lww' }));
const { firstSale: SALE, staleLook: LOOK } = MOMENTS;

export const P1 = {
  question: `North sold a hinge at ${clock(SALE)}. What does West’s board show at ${clock(LOOK)}?`,
  options: [
    `${STOCK.hinge - 1}: every copy changes at once`,
    `${STOCK.hinge}: the news is still on its way`,
    'Nothing until the news arrives',
  ],
};
export const outcomeOf = () => (RUN.ticks[LOOK].boards.west.hinge === STOCK.hinge ? 1 : 0);

export const QUIZ = {
  question:
    'A bank keeps your balance in Paris and in Berlin. You deposit in Paris; a second later your phone, served from Berlin, shows the old balance. Why?',
  options: [
    'The deposit hasn’t reached Berlin’s copy yet',
    'The deposit failed and will be returned',
    'Berlin keeps a different account for you',
  ],
  correct: 0,
  explanation: 'A change reaches the other copies after a delay; until then they answer with what they have.',
  why: [
    'Right: Berlin’s replica answers from what it has, and the deposit is still on its way.',
    'Nothing failed: Paris took the deposit, and Berlin will show it once the change arrives.',
    'It is one account kept in two places; the copies just haven’t caught up.',
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
    id: 'sale',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: `Each warehouse keeps a replica of the stock count. All three say ${STOCK.hinge} hinges.`,
    act: `Move the clock to ${clock(SALE)}.`,
    say: { block: 'north', text: 'Sale here' },
    predicate: s => s.t >= SALE,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'North sold one and sent the news down the line to East and West.',
    act: `Predict West’s board at ${clock(LOOK)}.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'look',
    focus: 'clock',
    visibleControls: ['p1', 'clock'],
    narration: 'Your pick is locked.',
    act: `Move the clock to ${clock(LOOK)}.`,
    say: { block: 'west', text: 'Old count' },
    predicate: s => s.p1 !== null && s.t === LOOK,
    hint: `Set the clock to exactly ${clock(LOOK)}.`,
  },
  {
    id: 'lag',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `News takes ${LAG} minutes to arrive: replication lag. Until then West’s count is stale.`,
    act: 'Open the Timeline tab.',
    predicate: s => s.view === 'timeline',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Each blue tick is news arriving. Every copy catches up; in between, each answers from what it has.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the deposit fail, or has the news not reached Berlin yet?',
  },
];

export default function OneCountThreeCopies() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
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
            caption: `${clock(state.t)}. Each warehouse’s board is its own copy of the count.`,
          }}
        />
      )}
      controls={{
        clock: ({ state, sync }) => (
          <>
            <Clock id="cs-clock1" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
            {state.p1 === null && (
              <p className="note cs-note">
                New to databases? <a href="/databases/">Databases &amp; indexes</a> comes first.
              </p>
            )}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
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
