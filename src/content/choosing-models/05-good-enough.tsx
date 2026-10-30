// Chapter 5: good enough is enough. Support's bar (questions passed of the 20) ropes off every machine under it; past
// the bar the steelyard weighs cost alone, and the cheapest machine that clears it wins (pinned, checked by the chapter
// test). Before the bar, quality alone tips to the top scorer.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { BAR, IDS, QUESTIONS, REPLY, machineOf, passesOf } from '../../lib/choosing-models/machines';
import { money, per1000 } from '../../lib/choosing-models/price';
import { rowsOf, type Weights } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import pinned from '../../../data/choosing-models/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { MachinesNote, SteelyardStage } from './kit';

const MODULE = 'choosing-models',
  ID = '05-good-enough';
export const PARTS = STEELYARD_PARTS;
const N = QUESTIONS.length;
const ROWS = rowsOf('larkspur');
const Q = qualityText('larkspur');
/** machines under the bar */
export const UNDER = IDS.filter(id => passesOf(id) < BAR);
export const CHEAPEST = pinned.cheapest as 'A' | 'B' | 'C';
/** quality alone before the bar; once past it, cost alone */
export const BEFORE: Weights = { quality: 2, cost: 0, wait: 0 },
  AFTER: Weights = { quality: 0, cost: 2, wait: 0 };
const price = (id: 'A' | 'B' | 'C') => money(per1000(machineOf(id), REPLY));

export interface S {
  barred: boolean;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Which machine should Support pick?',
  options: [
    `Machine ${CHEAPEST}: the cheapest that clears the bar`,
    'Machine A: it passes the most',
    `Machine ${UNDER[0]}: it is cheaper than A`,
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: `Your bar is ${BAR} of ${N}. Machine X passes 19, Machine Y passes 17 and costs a tenth as much. Pick?`,
  options: [
    'Y, and keep checking it against the bar',
    'X: more is always better',
    `Neither: wait for a model that passes all ${N}`,
  ],
  correct: 0,
  explanation: 'Both clear the bar, so the rest is price and wait; keep testing that the pick still clears it.',
  why: [
    'Right: past the bar, extra quality buys nothing the team needs, and Y costs a tenth.',
    'Past the bar, the two extra passes cost ten times as much for drafts an agent checks anyway.',
    'No model passes everything; a bar is set so you can ship before that day.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Support’s bar: ${BAR} of the ${N} questions. A machine past the bar is good enough to draft replies.`,
    act: 'Predict first.',
    say: { block: 'machine-a', text: 'Most passes' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bar',
    focus: 'bar',
    visibleControls: ['bar'],
    narration: 'Machines under the bar are roped off. Past it, only cost is weighed.',
    act: 'Apply Support’s bar.',
    predicate: s => s.barred,
    solution: s => ({ ...s, barred: true }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `${CHEAPEST} clears it for ${price(CHEAPEST)} per 1,000 answers, against A’s ${price('A')}. ${UNDER.join(', ')}, under the bar, is out.`,
    act: 'One question to finish.',
    say: { block: `machine-${CHEAPEST.toLowerCase()}`, text: 'Good enough' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Do both clear the bar? Then what is left to weigh?',
  },
];

export default function GoodEnough() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ barred: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, focus }) => (
        <SteelyardStage
          rows={ROWS}
          weights={state.barred ? AFTER : BEFORE}
          out={state.barred ? UNDER : undefined}
          quality={Q}
          pills={Q.pills}
          say={say}
          step={focus}
          caption={
            state.barred
              ? `Bar ${BAR} of ${N}: ${UNDER.join(', ')} out; weighed on cost alone.`
              : `Bar ${BAR} of ${N}, not yet applied; weighed on quality alone.`
          }
        >
          <MachinesNote />
        </SteelyardStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        bar: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, barred: true })}>
            Apply Support’s bar
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
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
