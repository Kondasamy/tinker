// Chapter 5: one bar or two. The ranges split. The reader predicts which way B's bar must go to even out false
// declines, moves the bars until they match within a point (any such pair passes; Show me applies the pinned pair),
// then reads the cost: more of B's approvals go unrepaid, and the regions are treated differently on purpose, which is
// where the law on credit decisions comes in (the one place the copy names the protected-class setting).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import { gapOf, type Bars } from '../../lib/fairness/metrics';
import { REGION_NAMES, runOf, SHARED } from '../../lib/fairness/story';
import pinned from '../../../data/fairness/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, Fact, GateStage, START_BARS, bar2, pct } from './kit';

const MODULE = 'fairness',
  ID = '05-one-bar-or-two';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
/** the pinned pair that evens false declines with the fewest wrong decisions */
export const EVEN = pinned.even.bars as Bars;
const E = runOf('all', 'none', EVEN);
/** false declines within a point of each other (with A's bar where it started, every such pair is EVEN: tested) */
export const even = (bars: Bars) => Math.abs(gapOf(runOf('all', 'none', bars))) <= 0.01;

export interface S {
  bars: Bars;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Which way should ${B}’s bar go?`,
  options: ['Down', 'Up', `It stays at ${bar2(START_BARS.B)}`],
};
/** down: the pinned pair's B bar is below the shared one (the chapter test checks it) */
export const OUTCOME = 0;

export const QUIZ = {
  question: `Two bars evened out wrongful turn-downs. What did Larkspur trade for it?`,
  options: [
    `More approvals in ${B} that aren’t repaid, and regions treated differently on purpose`,
    'Nothing: every number improved',
    `${A}’s repayers are now turned down twice as often`,
  ],
  correct: 0,
  explanation: `A lower bar lets more of ${B}’s non-repayers through, and a bar per group is a choice someone must own.`,
  why: [
    `Right: more of ${B}’s approvals go unrepaid, and the bars differ by region by design.`,
    'Wrong decisions overall went up, as the table shows.',
    `${A}’s bar never moved, so its rate stayed at ${pct(E.A.falseDecline)}.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Now each region has a per-group bar. To turn down ${B}’s repayers as rarely as ${A}’s, which way should its bar go?`,
    act: 'Predict first.',
    say: { block: 'post-b', text: `${B} bar` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'even',
    focus: 'bars',
    visibleControls: ['out1'],
    narration: 'Equal opportunity: repayers in both regions are turned down equally often.',
    act: `Move ${B}’s bar until both regions’ false declines match.`,
    say: { block: 'post-b', text: 'Lower bar' },
    predicate: s => s.bars.A === START_BARS.A && even(s.bars),
    hint: `Lower ${B}’s bar below ${bar2(0.3)}, a step at a time.`,
    solution: s => ({ ...s, bars: EVEN }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['cost', 'law', 'quiz'],
    narration: `False declines now match. The cost: more of ${B}’s approvals go unrepaid, and more wrong decisions overall.`,
    act: 'One question to finish.',
    say: { block: 'post-a', text: `${A} bar` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Look at the second pair of bars, and at what the two bars mean.',
  },
];

/** One bar against the reader's two: the cost of evening out false declines. */
function Cost({ bars }: { bars: Bars }) {
  const one = runOf(),
    two = runOf('all', 'none', bars);
  const rows: [string, (m: typeof one) => number][] = [
    [`${B}’s repayers turned down`, m => m.B.falseDecline],
    [`${B}’s non-repayers approved`, m => m.B.falseApprove],
    ['Wrong decisions overall', m => m.all.error],
  ];
  return (
    <table className="tc-ledger fr-table">
      <caption>One bar against two</caption>
      <thead>
        <tr>
          <th scope="col">Measure</th>
          <th scope="col">{`One bar, ${bar2(SHARED)}`}</th>
          <th scope="col">{`Two bars, ${bar2(bars.A)} · ${bar2(bars.B)}`}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, of]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{pct(of(one))}</td>
            <td>{pct(of(two))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OneBarOrTwo() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: START_BARS, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const m = runOf('all', 'none', state.bars);
        return (
          <GateStage
            bars={state.bars}
            linked={false}
            onBars={bars => (focus === 'bars' ? apply : sync)({ ...state, bars })}
            say={say}
            step={focus}
            caption={`Repayers turned down: ${A} ${pct(m.A.falseDecline)} at ${bar2(state.bars.A)}, ${B} ${pct(m.B.falseDecline)} at ${bar2(state.bars.B)}.`}
          >
            <ApplicantsNote />
          </GateStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        cost: ({ state }) => <Cost bars={state.bars} />,
        law: () => (
          <>
            <Fact id="hardt" />
            <p className="note">
              {`A bar per region treats the regions differently on purpose. ${A} and ${B} are made up; where the groups are a protected class, such as race or sex, credit law applies, and a bar per group is a legal question first.`}
            </p>
            <Fact id="ecoa" />
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
