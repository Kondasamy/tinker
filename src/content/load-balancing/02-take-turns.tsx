// Chapter 2: take turns. The reader predicts Ash's share under round robin, runs the sale and sees four equal shares
// though Ash is twice as big, then picks weighted round robin and sees Ash's share and the p99 move.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SERVERS, policyOf, runOf } from '../../lib/load-balancing/sim';
import { RULE_NAME, type Rule } from '../../lib/load-balancing/rules';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LbStage, RulePick, SimNote, msOf, pct, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '02-take-turns';
export const PARTS = YARD_PARTS;
const [ASH, SMALL] = SERVERS;
const RULES: Rule[] = ['round-robin', 'weighted'];
export const runAt = (rule: Rule) => runOf(policyOf({ rule }));
const RR = runAt('round-robin'),
  W = runAt('weighted');

export const P1 = {
  question: `Under round robin, what share of the requests will ${ASH.name} get?`,
  options: [
    'About a quarter, like each of the others',
    `About two fifths: it has twice the slots`,
    'Most of them: it is the biggest',
  ],
};
export const outcomeOf = () => (RR.shares[0] < 0.3 ? 0 : RR.shares[0] < 0.5 ? 1 : 2);

export const QUIZ = {
  question:
    'A team runs two servers behind round robin. One has twice the processors of the other. What one change makes the most of the big one?',
  options: [
    'Give the bigger server weight 2',
    'Add a third small server',
    'Switch round robin off and send everything to the big one',
  ],
  correct: 0,
  explanation: 'Round robin gives equal turns; a weight gives a bigger server more of them.',
  why: [
    'Right: with weight 2 it gets two of every three requests, in line with its size.',
    'A third small server adds capacity, but the big one still gets only an equal turn.',
    'One server alone has a ceiling; the small one’s capacity would go unused.',
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
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Round robin sends each request to the next server in order. ${ASH.name} has ${ASH.slots} slots; the others ${SMALL.slots}.`,
    act: `Predict ${ASH.name}’s share.`,
    say: { block: 'switch', text: 'Next in turn' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Your pick is locked.',
    act: 'Run the sale.',
    predicate: s => s.ran.includes('round-robin'),
  },
  {
    id: 'weighted',
    focus: 'rule',
    visibleControls: ['out1', 'rule'],
    narration: `Equal turns leave ${ASH.name} half idle. Weighted round robin gives it weight ${ASH.weight}: ${ASH.weight} turns per round.`,
    act: 'Pick Weighted round robin.',
    say: { block: 'ash', text: 'More turns' },
    predicate: s => s.ran.includes('weighted'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['rule', 'quiz'],
    narration: `${ASH.name} now gets ${pct(W.shares[0])}, and p99 moves from ${msOf(RR.p99)} to ${msOf(W.p99)}. Weights are set by hand.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which change gives the bigger server more turns?',
  },
];

const sharesText = (r: ReturnType<typeof runAt>) => SERVERS.map((s, i) => `${s.name} ${pct(r.shares[i])}`).join(', ');

export default function TakeTurns() {
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
            idle={idleYard(SERVERS.length, RULE_NAME[state.rule])}
            rule={state.rule}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={run ? `${RULE_NAME[state.rule]}. Shares: ${sharesText(run)}.` : 'Four servers, before the sale.'}
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
            <p className="tc-status">{`Round robin: ${sharesText(RR)}.`}</p>
            <SimNote />
            <Fact id="weights" />
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
