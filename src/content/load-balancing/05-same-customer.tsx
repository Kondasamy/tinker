// Chapter 5: same customer, same server. Each server keeps the carts it built; round robin moves customers around, so
// carts go missing. The reader predicts what sticky sessions do, turns them on, then lets Cedar die and counts the carts
// lost with it (health checks pull it after 2 misses, from chapter 4).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CUSTOMERS, SERVERS, policyOf, runOf } from '../../lib/load-balancing/sim';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LbStage, SimNote, StickySwitch, msOf, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '05-same-customer';
export const PARTS = YARD_PARTS;
const CEDAR = SERVERS[2];
/** health checks stay on, at chapter 4's pull after 2 misses */
export const CHECKS = 2;
export const runAt = (sticky: boolean, dies: boolean) =>
  runOf(policyOf({ sticky, checks: CHECKS, states: dies ? { [CEDAR.id]: 'dead' } : {} }));
const OFF = runAt(false, false),
  ON = runAt(true, false),
  DIES = runAt(true, true);

export const P1 = {
  question: 'With sticky sessions, how many times will a cart go missing?',
  options: [
    'None, while every server stays up',
    'About half as many',
    'Just as many: the carts are on the servers either way',
  ],
};
export const outcomeOf = () => (ON.cartsLost === 0 ? 0 : ON.cartsLost < OFF.cartsLost * 0.75 ? 1 : 2);

export const QUIZ = {
  question:
    'An online game keeps each match on the server the players joined, and sends them back there every time. That server crashes. What happens?',
  options: [
    'Those players lose their match; everyone else plays on',
    'Every player on every server loses their match',
    'Nothing: the balancer moves the match to another server',
  ],
  correct: 0,
  explanation: 'Stickiness ties a session to one server, so it lives and dies with that server.',
  why: [
    'Right: only the matches held on the crashed server are gone.',
    'The other servers hold their own matches and keep running.',
    'The balancer only picks servers for requests; it can’t move memory off a dead machine.',
  ],
};

interface S {
  sticky: boolean;
  dies: boolean;
  ran: boolean;
  plays: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'off',
    focus: 'run',
    visibleControls: ['run'],
    narration: `Each server keeps the session, the cart, of whoever it served. Round robin sends ${CUSTOMERS[0]} somewhere new each time.`,
    act: 'Run the sale.',
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${OFF.cartsLost} times, a request reached a server without that customer’s cart. Sticky sessions send each customer back.`,
    act: 'Predict the missing carts.',
    say: { block: 'switch', text: 'Same server' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sticky',
    focus: 'sticky',
    visibleControls: ['p1', 'sticky'],
    narration: 'Your pick is locked.',
    act: 'Turn on sticky sessions.',
    predicate: s => s.sticky,
  },
  {
    id: 'dies',
    focus: 'dies',
    visibleControls: ['out1', 'dies'],
    narration: `No cart missing, and p99 ${msOf(ON.p99)}: pinned customers spread less evenly. Each is now tied to one server.`,
    act: `Let ${CEDAR.name} die at the sale.`,
    say: { block: 'cedar', text: 'Carts in here' },
    predicate: s => s.dies,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `${DIES.cartsLost} carts went with ${CEDAR.name}, and ${DIES.failed} requests failed. A shared cart store would have kept them.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where did each match live?',
  },
];

export default function SameCustomer() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sticky: false, dies: false, ran: false, plays: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const run = state.ran ? runAt(state.sticky, state.dies) : undefined;
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
                ? `Sticky sessions ${state.sticky ? 'on' : 'off'}${state.dies ? `, ${CEDAR.name} dies` : ''}: ${run.cartsLost} missing carts, ${run.failed} failed requests.`
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
        sticky: ({ state, apply }) => (
          <StickySwitch
            on={state.sticky}
            onToggle={() => apply({ ...state, sticky: !state.sticky, ran: true, plays: state.plays + 1 })}
          />
        ),
        dies: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.dies}
            onClick={() => apply({ ...state, dies: true, ran: true, plays: state.plays + 1 })}
          >
            {`Let ${CEDAR.name} die`}
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <SimNote />
            <Fact id="sticky" />
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
