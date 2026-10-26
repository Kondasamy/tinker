// Chapter 6: the slow tail. Dogwood is slow but answering and least outstanding sends it little, yet its customers set
// the p99. The reader predicts what a hedged request after 100 ms does, sets it, then hedges sooner and counts the copies.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { HEDGES, SERVERS, policyOf, runOf } from '../../lib/load-balancing/sim';
import { RULE_NAME } from '../../lib/load-balancing/rules';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, HedgeWait, LbStage, SimNote, msOf, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '06-the-slow-tail';
export const PARTS = YARD_PARTS;
const DOG = SERVERS[3];
export const GRAY = { [DOG.id]: 'gray' } as const;
/** the hedge the chapter teaches, and the too-early one */
export const [, EARLY, HEDGE] = HEDGES;
export const runAt = (hedgeMs: number) => runOf(policyOf({ rule: 'least', states: GRAY, hedgeMs }));
const NONE = runAt(0),
  MID = runAt(HEDGE),
  SOON = runAt(EARLY);
const extra = (r: ReturnType<typeof runAt>) => r.sent - r.served.length;

export const P1 = {
  question: `A hedged request goes to a second server after ${HEDGE} ms. What happens to p99?`,
  options: [
    'Much lower: the copy rescues the requests stuck on the slow server',
    'Higher: the copies make more work for everyone',
    'No change: the slow server is just as slow',
  ],
};
export const outcomeOf = () => (MID.p99 < NONE.p99 * 0.75 ? 0 : MID.p99 > NONE.p99 ? 1 : 2);

export const QUIZ = {
  question:
    'A search service answers half its queries within 20 ms and 99 in 100 within 400 ms. When should a hedged copy go out?',
  options: [
    'Once a query has waited longer than most do, near the 95th percentile',
    'At once, for every query',
    'Never: copies always add load',
  ],
  correct: 0,
  explanation: 'A hedge late enough copies only the stragglers, so it cuts the tail for little extra work.',
  why: [
    'Right: only the few slow queries get a copy, and those are the ones that set p99.',
    'Copying every query doubles the work, and the extra load slows everyone.',
    'A late hedge adds only a few copies, and those few cut the slowest waits a lot.',
  ],
};

interface S {
  hedgeMs: number;
  ran: boolean;
  plays: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'tail',
    focus: 'run',
    visibleControls: ['run'],
    narration: `Most requests land on fine servers. The few on ${DOG.name} take five times as long: they are the tail.`,
    act: 'Run the sale.',
    say: { block: 'dogwood', text: 'The tail' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `p50 is ${msOf(NONE.p50)}, p99 ${msOf(NONE.p99)}. A hedged request sends a copy elsewhere if no answer comes.`,
    act: 'Predict p99 with hedging.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'hedge',
    focus: 'hedge',
    visibleControls: ['p1', 'hedge'],
    narration: 'Your pick is locked.',
    act: `Set the hedge to ${HEDGE} ms.`,
    predicate: s => s.hedgeMs === HEDGE,
  },
  {
    id: 'early',
    focus: 'hedge',
    visibleControls: ['out1', 'hedge'],
    narration: `p99 ${msOf(MID.p99)}, for ${extra(MID)} extra copies. Sooner should cut it further.`,
    act: `Set the hedge to ${EARLY} ms.`,
    predicate: s => s.hedgeMs === EARLY,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['hedge', 'quiz'],
    narration: `p99 ${msOf(SOON.p99)}, but ${extra(SOON)} extra copies: so early, ordinary requests get copied too.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which choice copies only the slow few?',
  },
];

export default function TheSlowTail() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hedgeMs: 0, ran: false, plays: 0, p1: null, view: 'board', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const run = state.ran ? runAt(state.hedgeMs) : undefined;
        return (
          <LbStage
            say={say}
            run={run}
            play={state.plays}
            idle={idleYard(SERVERS.length, RULE_NAME.least, GRAY)}
            rule="least"
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              run
                ? `Hedge ${state.hedgeMs ? `after ${state.hedgeMs} ms` : 'off'}: ${run.sent} copies for ${run.served.length} requests.`
                : `${RULE_NAME.least}, ${DOG.name} slow but answering.`
            }
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, ran: true, plays: state.plays + 1 })}>
            Run the sale
          </button>
        ),
        hedge: ({ state, apply, sync, focused }) => (
          <HedgeWait
            id="lb-hedge"
            value={state.hedgeMs}
            onChange={hedgeMs => (focused ? apply : sync)({ ...state, hedgeMs, ran: true, plays: state.plays + 1 })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <SimNote />
            <Fact id="tail-at-scale" />
            <Fact id="hedged" />
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
