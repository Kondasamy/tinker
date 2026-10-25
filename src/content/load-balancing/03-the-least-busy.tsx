// Chapter 3: the least busy. Birch turns 5× slower as the sale starts. Round robin keeps feeding it till customers give up; the
// reader predicts Birch's share under least outstanding, picks it, then tries the power of two choices.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, SERVERS, policyOf, runOf } from '../../lib/load-balancing/sim';
import { RULE_NAME, type Rule } from '../../lib/load-balancing/rules';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LbStage, RulePick, SimNote, msOf, pct, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '03-the-least-busy';
export const PARTS = YARD_PARTS;
const BIRCH = SERVERS[1];
export const SLOW = { [BIRCH.id]: 'slow' } as const;
const RULES: Rule[] = ['round-robin', 'least', 'two'];
export const runAt = (rule: Rule) => runOf(policyOf({ rule, states: SLOW }));
const RR = runAt('round-robin'),
  LEAST = runAt('least'),
  TWO = runAt('two');

export const P1 = {
  question: `Under least outstanding, what share will ${BIRCH.name} get?`,
  options: [
    'Still about a quarter: every server gets its turn',
    'Well under a quarter: its requests pile up, so it looks busy',
    'None at all: the balancer knows it is slow',
  ],
};
export const outcomeOf = () => (LEAST.shares[1] > 0.2 ? 0 : LEAST.shares[1] > 0 ? 1 : 2);

export const QUIZ = {
  question:
    'A supermarket has twelve tills, one with a new cashier. Which way of picking a till keeps the longest waits shortest?',
  options: [
    'Look at two tills at random and join the shorter line',
    'Go to the next till in order, whatever its line',
    'Always pick till 1, so everyone knows where to go',
  ],
  correct: 0,
  explanation: 'Comparing even two lines steers people away from the slow one; taking turns never looks.',
  why: [
    'Right: the new cashier’s line grows, so it loses most comparisons and gets fewer people.',
    'Taking turns sends the slow till its full share however long its line gets.',
    'One till has a ceiling; the other eleven sit idle.',
  ],
};

interface S {
  rule: Rule;
  ran: Rule[];
  plays: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'rr',
    focus: 'run',
    visibleControls: ['run'],
    narration: `From one second in, ${BIRCH.name} is ${ASSUMPTIONS.slowFactor} times slower. Round robin still sends it every fourth request.`,
    act: 'Run the sale.',
    say: { block: 'birch', text: 'Slow now' },
    predicate: s => s.ran.includes('round-robin'),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${RR.failed} customers gave up after ${ASSUMPTIONS.timeoutMs / 1000} s. Least outstanding counts each server’s outstanding requests and picks the fewest.`,
    act: `Predict ${BIRCH.name}’s share.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'least',
    focus: 'rule',
    visibleControls: ['p1', 'rule'],
    narration: 'Your pick is locked.',
    act: 'Pick Least outstanding.',
    predicate: s => s.ran.includes('least'),
  },
  {
    id: 'two',
    focus: 'rule',
    visibleControls: ['out1', 'rule'],
    narration: `p99: ${msOf(LEAST.p99)}. Power of two choices asks just two servers at random and takes the less busy.`,
    act: 'Pick Power of two choices.',
    say: { block: 'switch', text: 'Asks two' },
    predicate: s => s.ran.includes('two'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['rule', 'quiz'],
    narration: `Two choices: p99 ${msOf(TWO.p99)}, close to least outstanding, while looking at two servers instead of all.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which way of choosing ever looks at how long a line is?',
  },
];

export default function TheLeastBusy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rule: 'round-robin', ran: [], plays: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const run = state.ran.length ? runAt(state.rule) : undefined;
        return (
          <LbStage
            say={say}
            run={run}
            play={state.plays}
            idle={idleYard(SERVERS.length, RULE_NAME[state.rule], SLOW)}
            rule={state.rule}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              run
                ? `${RULE_NAME[state.rule]}: ${BIRCH.name} got ${pct(run.shares[1])} of requests; ${run.failed} failed, p99 ${msOf(run.p99)}.`
                : `${BIRCH.name} slows down as the sale starts.`
            }
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() => apply({ ...state, ran: [...state.ran, state.rule], plays: state.plays + 1 })}
          >
            Run the sale
          </button>
        ),
        rule: ({ state, apply, sync, focused }) => (
          <RulePick
            rules={RULES}
            value={state.rule}
            onPick={rule =>
              (focused ? apply : sync)({ ...state, rule, ran: [...state.ran, rule], plays: state.plays + 1 })
            }
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`${BIRCH.name}: ${pct(RR.shares[1])} under round robin, ${pct(LEAST.shares[1])} under least outstanding.`}</p>
            <SimNote />
            <Fact id="least-connected" />
            <Fact id="envoy-p2c" />
            <Fact id="two-choices" />
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
