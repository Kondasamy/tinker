// Chapter 3: the link goes down. The reader cuts the line to West, predicts what North does with the drill press West
// has already sold, sees it sell twice, then chooses to stay right (reads and writes must reach two warehouses), and
// West refuses instead: the CAP choice.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { MOMENTS, PARTITIONS, clock, policyOf, runOf, type Policy } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Clock, ConsistencyStage, Fact, Receipts, SimNote, type View } from './kit';

const MODULE = 'consistency',
  ID = '03-the-link-goes-down';
export const PARTS = STOCK_PARTS;
export type Mode = 'open' | 'right';
/** stay open: each warehouse sells from its own count; stay right: a read and a write must each reach two */
export const MODES: Record<Mode, Policy> = {
  open: policyOf({ r: 1, w: 1, rule: 'lww' }, { partition: true }),
  right: policyOf({ r: 2, w: 2, rule: 'lww' }, { partition: true }),
};
const CALM = policyOf({ r: 1, w: 1, rule: 'lww' });
export const runFor = (cut: boolean, mode: Mode) => runOf(cut ? MODES[mode] : CALM);
const { westSells: WEST, northSells: NORTH } = MOMENTS,
  OUT = PARTITIONS[0];

export const P1 = {
  question: `Dev bought the drill press at West at ${clock(WEST)}. At ${clock(NORTH)} Eve orders it at North. What happens?`,
  options: ['Refused: it’s already sold', 'Sold: North’s count still says 1', 'Eve waits until the line is back'],
};
const eve = (mode: Mode) => runFor(true, mode).outcomes.find(o => o.t === NORTH && o.kind === 'order')!;
export const outcomeOf = () => (eve('open').result === 'sold' ? 1 : 0);
/** under stay right: Dev's order at West is refused and the drill press sells once */
export const devRefused = () => runFor(true, 'right').outcomes.find(o => o.t === WEST)!.result === 'refused';

export const QUIZ = {
  question:
    'A ride-share app runs in two data centres, and the link between them drops. A rider in the cut-off centre books the last shuttle seat. What is the real choice?',
  options: [
    'Refuse the booking until the link is back, or risk selling the seat twice',
    'Book it: the counts will merge later with no harm',
    'Nothing to choose: a partition only slows bookings down',
  ],
  correct: 0,
  explanation: 'While the sides can’t talk, each can answer and risk disagreeing, or refuse and stay right.',
  why: [
    'Right: the cut-off side can’t know if the other sold the seat, so it must refuse or risk a double sale.',
    'Merging later can’t undo two riders holding the same seat: that is the double sale.',
    'Messages across a partition are lost, not slow, so the cut-off side must decide without them.',
  ],
};

interface S {
  cut: boolean;
  p1: number | null;
  t: number;
  mode: Mode;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'cut',
    focus: 'cut',
    visibleControls: ['cut'],
    narration: `At ${clock(OUT.from)} the line to West goes down: a partition. Each side still takes orders.`,
    act: 'Cut the line.',
    say: { block: 'line', text: 'No messages' },
    predicate: s => s.cut,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'There is one drill press. Every warehouse sells from its own count, and West can’t send its news.',
    act: 'Predict Eve’s order.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'twice',
    focus: 'clock',
    visibleControls: ['p1', 'clock'],
    narration: 'Your pick is locked.',
    act: `Move the clock to ${clock(NORTH)}.`,
    say: { block: 'north', text: 'Sold again' },
    predicate: s => s.p1 !== null && s.t >= NORTH,
  },
  {
    id: 'right',
    focus: 'mode',
    visibleControls: ['out1', 'mode'],
    narration:
      'West stayed available: it answered every order. Staying consistent means refusing what it can’t check with another warehouse.',
    act: 'Choose Stay right.',
    predicate: s => s.mode === 'right',
  },
  {
    id: 'cap',
    focus: 'quiz',
    visibleControls: ['receipts', 'quiz'],
    narration:
      'Dev is refused, and the drill press sells once. In a partition you pick one: answer everyone, or stay right.',
    act: 'One question to finish.',
    say: { block: 'west', text: 'Refused' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can the cut-off centre know whether the other one sold the seat?',
  },
];

export default function TheLinkGoesDown() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ cut: false, p1: null, t: WEST, mode: 'open', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.cut, state.mode);
        return (
          <ConsistencyStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: stockAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}. ${state.cut ? `Line to West down ${clock(OUT.from)}–${clock(OUT.to)}` : 'Line up'}; ${state.mode === 'open' ? 'every warehouse sells from its own count' : 'a sale must reach two warehouses'}.`,
            }}
          />
        );
      }}
      controls={{
        cut: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, cut: true })}>
            Cut the line
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        clock: ({ state, sync }) => (
          <Clock id="cs-clock3" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Receipts run={runFor(true, 'open')} t={NORTH} />
          </>
        ),
        mode: ({ state, apply }) => (
          <div className="cs-row" role="group" aria-label="During the outage">
            <button
              type="button"
              className="chip"
              aria-pressed={state.mode === 'open'}
              onClick={() => apply({ ...state, mode: 'open' })}
            >
              Stay open
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={state.mode === 'right'}
              onClick={() => apply({ ...state, mode: 'right', t: WEST, view: 'scene' })}
            >
              Stay right
            </button>
          </div>
        ),
        receipts: ({ state }) => <Receipts run={runFor(true, state.mode)} t={WEST} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="cap" />
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
