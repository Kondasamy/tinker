// Chapter 4: is it alive? Cedar dies as the sale starts. Without health checks its turns fail; with them it is pulled
// after N misses (fewer failures the fewer misses). Then Dogwood turns slow but answering: the reader predicts what the
// checks do, and sees it pass them and keep its share: a gray failure.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, SERVERS, policyOf, runOf, type ServerState } from '../../lib/load-balancing/sim';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LbStage, MissCount, SimNote, msOf, pct, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '04-is-it-alive';
export const PARTS = YARD_PARTS;
const CEDAR = SERVERS[2],
  DOG = SERVERS[3];
export const runAt = (checks: number, gray: boolean) =>
  runOf(policyOf({ checks, states: { [CEDAR.id]: 'dead', ...(gray ? { [DOG.id]: 'gray' as ServerState } : {}) } }));
const GRAY = runAt(1, true);
const fails = (n: number) => runAt(n, false).failed;
const pulledMs = (n: number) => runAt(n, false).pulledAt[2] - ASSUMPTIONS.troubleAtMs;

export const P1 = {
  question: `${DOG.name} turns slow but still answers its health check. What will the checks do?`,
  options: [
    `Pull ${DOG.name}, as they pulled ${CEDAR.name}`,
    `Leave ${DOG.name} in: it answers every check`,
    'Slow every server’s checks down',
  ],
};
export const outcomeOf = () => (GRAY.pulledAt[3] === Infinity ? 1 : 0);

export const QUIZ = {
  question:
    'A café’s card reader answers “online” to every ping, but each payment now takes a minute. What would have caught it?',
  options: ['Watching how long real payments take', 'Pinging it twice as often', 'Restarting it every night'],
  correct: 0,
  explanation: 'A ping checks that it is alive; only real payments show that it is slow.',
  why: [
    'Right: the slowness is only visible in real work, so measure real work.',
    'A faster ping still gets “online” every time: it asks the wrong question more often.',
    'A nightly restart might hide it for a while, but nothing would notice when it comes back.',
  ],
};

interface S {
  checks: number;
  gray: boolean;
  ran: boolean;
  plays: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'dead',
    focus: 'run',
    visibleControls: ['run'],
    narration: `${CEDAR.name} is down from one second in, and the balancer keeps sending it every fourth request.`,
    act: 'Run the sale.',
    say: { block: 'cedar', text: 'Down' },
    predicate: s => s.ran,
  },
  {
    id: 'checks',
    focus: 'checks',
    visibleControls: ['checks'],
    narration: `${fails(0)} requests failed after waiting ${ASSUMPTIONS.timeoutMs / 1000} s. A health check asks each server every ${ASSUMPTIONS.checkEveryMs} ms.`,
    act: 'Set health checks to 3 misses.',
    predicate: s => s.checks === 3,
  },
  {
    id: 'fewer',
    focus: 'checks',
    visibleControls: ['checks'],
    narration: `${CEDAR.name} was pulled ${msOf(pulledMs(3))} after it died; ${fails(3)} requests failed first.`,
    act: 'Set it to 1 miss.',
    say: { block: 'cedar', text: 'Pulled' },
    predicate: s => s.checks === 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${fails(1)} failed. Now ${DOG.name} turns slow too, but still answers its health check: a gray failure.`,
    act: 'Predict what the checks do.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'gray',
    focus: 'gray',
    visibleControls: ['p1', 'gray'],
    narration: 'Your pick is locked.',
    act: `Make ${DOG.name} slow but answering.`,
    predicate: s => s.gray,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `${DOG.name} keeps its ${pct(GRAY.shares[3])} share; ${GRAY.failed} requests failed. A check asks “alive?”, never “fast?”.`,
    act: 'One question to finish.',
    say: { block: 'dogwood', text: 'Passes checks' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which option measures the thing that went wrong?',
  },
];

export default function IsItAlive() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ checks: 0, gray: false, ran: false, plays: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const run = state.ran ? runAt(state.checks, state.gray) : undefined;
        return (
          <LbStage
            say={say}
            run={run}
            play={state.plays}
            idle={idleYard(SERVERS.length, 'Round robin')}
            rule="round-robin"
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              run
                ? `Health checks ${state.checks ? `pull after ${state.checks}` : 'off'}: ${run.failed} failed requests, p99 ${msOf(run.p99)}.`
                : 'Round robin over four servers, before the sale.'
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
        checks: ({ state, apply }) => (
          <MissCount
            id="lb-checks"
            value={state.checks}
            onChange={checks => apply({ ...state, checks, ran: true, plays: state.plays + 1 })}
          />
        ),
        gray: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.gray}
            onClick={() => apply({ ...state, gray: true, ran: true, plays: state.plays + 1 })}
          >
            {`Make ${DOG.name} slow but answering`}
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <SimNote />
            <p className="note lb-note">
              {`The sale lasts seconds, so checks here run every ${ASSUMPTIONS.checkEveryMs} ms; real ones run seconds apart.`}
            </p>
            <Fact id="health-checks" />
            <Fact id="gray-failure" />
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
