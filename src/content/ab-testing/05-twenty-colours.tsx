// Chapter 5: twenty colours. Twenty Buy-button colours, none truly different, each tested against today's blue. One wins;
// the reader predicts how often some colour wins over 100 runs, runs them, then turns on a Bonferroni correction.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import {
  ASSUMPTIONS,
  COLOURS,
  SCENARIOS,
  SEEDS,
  falseWinRate,
  resultAt,
  runOf,
  verdicts,
} from '../../lib/ab-testing/sim';
import { bonferroni } from '../../lib/ab-testing/stats';
import { IDLE, SPLIT_PARTS, splitAt } from '../../components/scenes/splitScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { AbStage, Fact, Maths, SimNote, Tally, pts, type View } from './kit';

const MODULE = 'ab-testing',
  ID = '05-twenty-colours';
export const PARTS = SPLIT_PARTS;
export const PLAN = SCENARIOS.colours;
export const RUN = runOf(PLAN);
const END = PLAN.days - 1,
  LEVEL = ASSUMPTIONS.level,
  K = COLOURS.length,
  N = SEEDS.length,
  of = (r: number) => `${Math.round(r * N)} of ${N}`;
/** The colour that beat blue in the pinned run (its arm index). */
export const WINNER = PLAN.arms.findIndex((_, a) => a > 0 && resultAt(RUN, END, LEVEL, a).significant);
export const NAME = PLAN.arms[WINNER].name;
export const RATE = falseWinRate(PLAN, 'fixed');
export const CORRECTED = falseWinRate(PLAN, 'corrected');

export const P1 = {
  question: `Over ${N} runs of all ${K} colours, how often will some colour beat blue?`,
  options: [
    `About ${Math.round(N * LEVEL)} times, like a single test`,
    `Far more often: ${K} chances in every run`,
    'Never: no colour truly differs',
  ],
};
export const outcomeOf = () => (RATE === 0 ? 2 : RATE > LEVEL * 2 ? 1 : 0);

export const QUIZ = {
  question:
    'A marketer checks an email’s results in 30 customer groups and finds that one group, left-handed buyers in Ohio, responded strongly. What should come first?',
  options: [
    'Suspect luck: with 30 looks, one striking group is likely by chance',
    'Send that group more emails right away',
    'Check 30 more groups to find others like it',
  ],
  correct: 0,
  explanation: 'With many comparisons, one striking winner is what luck alone tends to produce.',
  why: [
    'Right: each group is another chance for luck, so a lone standout among 30 needs a fresh test before anyone acts.',
    'Acting on one lucky group among many is the twenty-colours mistake.',
    'More groups add more chances for luck, not more certainty.',
  ],
};

interface S {
  ran: boolean;
  p1: number | null;
  many: boolean;
  corrected: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['run'],
    narration: `None of the ${K} colours truly changes buying; the simulation knows. Each is compared with blue.`,
    act: 'Run the colour test.',
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${NAME} beat blue, significant. Now picture ${N} runs of all ${K} colours.`,
    act: 'Predict how often a colour wins.',
    say: { block: 'scoreboard', text: 'Lucky colour?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'many',
    focus: 'many',
    visibleControls: ['p1', 'many'],
    narration: 'Multiple comparisons: every extra colour is another chance for luck to win.',
    act: `Run ${N} colour tests.`,
    predicate: s => s.many,
  },
  {
    id: 'correct',
    focus: 'correct',
    visibleControls: ['out1', 'correct'],
    narration: `${of(RATE)} runs crowned a colour. A correction holds each colour to a bar ${K} times stricter.`,
    act: 'Turn on the stricter bar.',
    say: { block: 'scoreboard', text: 'Higher bar' },
    predicate: s => s.corrected,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['correct', 'quiz'],
    narration: `Now luck crowns a colour in ${of(CORRECTED)} runs. Many tests, one winner: suspect luck first.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many groups were checked before one stood out?',
  },
];

function Correct({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <div>
      <button
        type="button"
        className="chip"
        aria-pressed={s.corrected}
        onClick={() => set({ ...s, corrected: !s.corrected })}
      >
        Stricter bar per colour
      </button>
      <Tally
        verdicts={verdicts(PLAN, s.corrected ? 'corrected' : 'fixed')}
        label={`runs crowned some colour${s.corrected ? ', corrected' : ''}`}
      />
      <Maths>
        <p>
          {`Bonferroni: with ${K} comparisons, each is held to the level ÷ ${K}: ${LEVEL} ÷ ${K} = ${bonferroni(LEVEL, K)}.`}
        </p>
        <Fact id="fdr" />
      </Maths>
      <Fact id="multiple" />
      <SimNote />
    </div>
  );
}

export default function TwentyColours() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, many: false, corrected: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const res = resultAt(RUN, END, state.corrected ? bonferroni(LEVEL, K) : LEVEL, WINNER);
        const scene = state.ran
          ? {
              ...splitAt(RUN, PLAN, END, { arm: WINNER, name: NAME }),
              ...(state.corrected && !res.significant ? { verdict: 'NO WINNER', tone: 'none' as const } : {}),
            }
          : { ...IDLE, arms: [IDLE.arms[0], { ...IDLE.arms[1], name: `${K} colours` }] as typeof IDLE.arms };
        return (
          <AbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene,
              chart: state.ran ? { run: RUN, arm: WINNER, name: NAME } : undefined,
              at: END,
              caption: state.ran
                ? `${NAME} against blue: ${pts(res.diff)}${state.corrected ? ', held to the stricter bar' : ''}.`
                : `${K} colours, one turnstile.`,
            }}
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.ran} onClick={() => apply({ ...state, ran: true })}>
            Run the colour test
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        many: ({ state, apply }) => (
          <button type="button" className="chip" disabled={state.many} onClick={() => apply({ ...state, many: true })}>
            {`Run ${N} colour tests`}
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        correct: ({ state, apply, sync, focused }) => <Correct s={state} set={focused ? apply : sync} />,
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
