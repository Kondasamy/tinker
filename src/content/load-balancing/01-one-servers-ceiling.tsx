// Chapter 1: one server's ceiling. Ash alone serves the morning, the reader predicts the sale's p99, runs it and watches
// the queue push the p99 marker right, then runs the sale on four servers behind a balancer.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, PHASES, SALE, SERVERS, policyOf, runOf } from '../../lib/load-balancing/sim';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LbStage, SimNote, msOf, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '01-one-servers-ceiling';
export const PARTS = YARD_PARTS;
const ASH = SERVERS[0];
/** Ash's capacity: requests a second with every slot busy on an average request */
export const CAPACITY = Math.round((ASH.slots * 1000) / ASSUMPTIONS.serviceMs);
export const RUNS = {
  morning: runOf(policyOf({ servers: 1, until: PHASES[0].toMs })),
  sale: runOf(policyOf({ servers: 1 })),
  four: runOf(policyOf({})),
};
type Ran = keyof typeof RUNS;

export const P1 = {
  question: `The sale brings ${SALE.perSecond} requests a second to ${ASH.name}. What happens to p99?`,
  options: [
    `About the same: ${ASH.name} still has free slots`,
    'About double: twice the requests, twice the wait',
    'Far more than double: a queue builds and keeps growing',
  ],
};
export const outcomeOf = () => {
  const k = RUNS.sale.p99 / RUNS.morning.p99;
  return k > 3 ? 2 : k > 1.5 ? 1 : 0;
};

export const QUIZ = {
  question: 'A ticket booth sells 2 tickets a minute, and 3 people a minute join its line. What happens over the hour?',
  options: [
    'The wait keeps growing: the line gains a person every minute',
    'The wait stays about the same: the booth works flat out',
    'The wait shrinks once the booth gets into its stride',
  ],
  correct: 0,
  explanation: 'Past capacity, the line grows for as long as arrivals outpace the booth.',
  why: [
    'Right: one more person joins than leaves each minute, so each newcomer waits behind a longer line.',
    'Working flat out is exactly the problem: it still serves fewer than arrive, so the line grows.',
    'The booth’s pace is fixed at 2 a minute; nothing in the story makes it faster.',
  ],
};

interface S {
  ran: Ran | null;
  plays: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'morning',
    focus: 'run',
    visibleControls: ['run'],
    narration: `${ASH.name} works on ${ASH.slots} requests at once. The board shows every wait; p99 marks the slowest edge.`,
    act: 'Run the morning.',
    say: { block: 'ash', text: `${ASH.slots} at once` },
    predicate: s => s.ran === 'morning',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Morning p99: ${msOf(RUNS.morning.p99)}. ${ASH.name}’s capacity is about ${CAPACITY} requests a second.`,
    act: 'Predict the sale’s p99.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sale',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Your pick is locked.',
    act: 'Run the sale.',
    predicate: s => s.ran === 'sale',
  },
  {
    id: 'four',
    focus: 'run',
    visibleControls: ['out1', 'run'],
    narration:
      'Past capacity a queue grows, and each new request waits behind it. Larkspur puts three more servers in.',
    act: 'Run the sale on four.',
    say: { block: 'switch', text: 'Picks a server' },
    predicate: s => s.ran === 'four',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Four servers: p99 ${msOf(RUNS.four.p99)}. Something must pick a server per request: the load balancer.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the line lose people faster than it gains them?',
  },
];

const LABEL: Record<Ran, string> = { morning: 'Run the morning', sale: 'Run the sale', four: 'Run the sale on four' };
/** the run each Run button makes next: the morning, then the sale, then the sale on four servers */
const nextRun = (ran: Ran | null): Ran => (ran === null ? 'morning' : ran === 'morning' ? 'sale' : 'four');

export default function OneServersCeiling() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: null, plays: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const run = state.ran ? RUNS[state.ran] : undefined;
        return (
          <LbStage
            say={say}
            run={run}
            play={state.plays}
            idle={idleYard(state.ran === 'four' ? 4 : 1, 'Round robin')}
            rule="round-robin"
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              run
                ? `${run.policy.servers === 1 ? `${ASH.name} alone` : 'Four servers'}, ${run.policy.until <= PHASES[0].toMs ? 'the morning' : 'the morning and the sale'}: p99 ${msOf(run.p99)}.`
                : `${ASH.name} alone, before any request.`
            }
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => {
          const r = nextRun(state.ran);
          return (
            <button
              type="button"
              className="chip"
              onClick={() =>
                apply({ ...state, ran: r, plays: state.plays + 1, view: r === 'morning' ? state.view : 'board' })
              }
            >
              {LABEL[r]}
            </button>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`${ASH.name}: p50 ${msOf(RUNS.sale.p50)}, p99 ${msOf(RUNS.sale.p99)}.`}</p>
            <SimNote />
            <Fact id="overload-queue" />
            <p className="note lb-note">
              What one server does inside, batch by batch: <a href="/inference/">Inference engineering</a>’s serving
              floor.
            </p>
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
