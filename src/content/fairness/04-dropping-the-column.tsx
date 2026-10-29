// Chapter 4: dropping the column. The reader predicts what dropping the region field does to the gap, drops it (most
// of the gap stays: the postcode carries the region back in), then drops the postcode too: the gap goes, and wrong
// decisions rise, since in this record the postcode really did go with repaying.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import type { Features } from '../../lib/fairness/fit';
import { gapOf, type Bars } from '../../lib/fairness/metrics';
import { REGION_NAMES, runOf } from '../../lib/fairness/story';
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, FIELD_NAMES, Fact, FieldPick, GateStage, START_BARS, bar2, pct } from './kit';

const MODULE = 'fairness',
  ID = '04-dropping-the-column';
export const PARTS = GATE_PARTS;
const { B } = REGION_NAMES;
const ALL = runOf('all'),
  NO_REGION = runOf('no-region'),
  NEITHER = runOf('neither');
/** a gap in points, one decimal, with a real minus sign */
const pts = (x: number) => (x * 100).toFixed(1).replace('-', '−');
/** the share of the gap left once the region field is gone */
export const KEPT = gapOf(NO_REGION) / gapOf(ALL);

export interface S {
  bars: Bars;
  features: Features;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'The check is refitted without the region field. What happens to the gap?',
  options: ['Most of it stays', 'It closes', 'It grows'],
};
/** most of it stays (the chapter test checks the kept share) */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A team drops the store field from a model, yet each store still gets different results. Most likely why?',
  options: [
    'Other fields, such as the town, still carry the store',
    'Dropping a field never changes a model',
    'The model remembers the field from before',
  ],
  correct: 0,
  explanation: 'A dropped field comes back through any field that goes with it.',
  why: [
    'Right: a field that goes with the store, like its town, lets the model find the store anyway.',
    'Dropping a field does change the model; here it changed it only a little, because a proxy stayed.',
    'A refitted model learns only from the fields it is given; the store comes back through a proxy.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The gap today: ${B}’s repayers are turned down ${pts(gapOf(ALL))} points more often.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'drop',
    focus: 'fields',
    visibleControls: ['fields'],
    narration: 'Each choice refits the check on the field set it may read.',
    act: `Choose ${FIELD_NAMES['no-region']}.`,
    say: { block: 'check', text: 'No region' },
    predicate: s => s.features === 'no-region',
  },
  {
    id: 'both',
    focus: 'fields',
    visibleControls: ['out1', 'fields'],
    narration: `Gap ${pts(gapOf(NO_REGION))} points, ${pct(KEPT)} of before: the postcode is a proxy, and carries the region back in.`,
    act: `Choose ${FIELD_NAMES.neither}.`,
    say: { block: 'out-b', text: 'Fewer bags' },
    predicate: s => s.features === 'neither',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['cost', 'quiz'],
    narration: `Gap ${pts(gapOf(NEITHER))} points, but wrong decisions rise from ${pct(ALL.all.error)} to ${pct(NEITHER.all.error)}: here the postcode also went with repaying.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What else in an application can tell you where it came from?',
  },
];

export default function DroppingTheColumn() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: START_BARS, features: 'all', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus, say }) => {
        const m = runOf(state.features, 'none', state.bars);
        return (
          <GateStage
            features={state.features}
            bars={state.bars}
            linked
            onBars={bars => sync({ ...state, bars })}
            say={say}
            step={focus}
            caption={`${FIELD_NAMES[state.features]}, bar ${bar2(state.bars.A)}: gap ${pts(gapOf(m))} points, ${pct(m.all.error)} wrong overall.`}
          >
            <ApplicantsNote />
          </GateStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        fields: ({ state, apply }) => (
          <FieldPick value={state.features} onPick={features => apply({ ...state, features })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        cost: () => <Fact id="unawareness" />,
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
