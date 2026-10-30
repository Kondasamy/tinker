// Chapter 3: where the skew comes from. The reader predicts what makes B's repayers score lower (the postcode, a
// proxy for the region that the record ties to fewer repaid accounts), shows the postcode counts, then predicts how far
// one more turned-down repayer moves B's rate (the thin sample: noise, not a fix). Counting B three times in the fit
// doesn't close the gap here, since both regions follow the same rule; the copy says so.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import { gapOf, type Bars } from '../../lib/fairness/metrics';
import { POSTCODE_MATCH, RIVER } from '../../lib/fairness/population';
import { APPLICANTS, REGION_NAMES, runOf } from '../../lib/fairness/story';
import { Outcome } from '../tool-calling/kit';
import { ApplicantsNote, Fact, GateStage, MARK, REGIONS, START_BARS, bar2, pct } from './kit';
import { TIMES } from './module';

const MODULE = 'fairness',
  ID = '03-where-skew-comes-from';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
const M = runOf();
const rows = (r: 'A' | 'B') => APPLICANTS.filter(a => a.region === r);
/** per region: applicants, river postcodes, repaid */
export const COUNT = Object.fromEntries(
  REGIONS.map(r => [
    r,
    {
      n: rows(r).length,
      river: rows(r).filter(a => RIVER.includes(a.postcode)).length,
      repaid: rows(r).filter(a => a.repaid).length,
    },
  ]),
) as Record<'A' | 'B', { n: number; river: number; repaid: number }>;
/** how many points one repayer is of each region's false-decline rate */
export const STEP_PTS = { A: 100 / COUNT.A.repaid, B: 100 / COUNT.B.repaid };
const one = (x: number) => x.toFixed(1);
const pts = (x: number) => Math.round(x * 100);
/** the gap before and after counting B more in the fit */
export const REWEIGHT = { before: gapOf(M), after: gapOf(runOf('all', 'reweight')) };

export interface S {
  bars: Bars;
  p1: number | null;
  shown: boolean;
  p2: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `What makes ${B}’s repayers score lower?`,
  options: [
    'Its river postcodes, which repaid less in the record',
    `The check was told to favour ${A}`,
    `${B}’s builders have traded for fewer years`,
  ],
};
export const OUTCOME1 = 0;
export const P2 = {
  question: `One more of ${B}’s ${COUNT.B.repaid} repayers is turned down. How far does its rate move?`,
  options: ['About 2 points', 'About half a point', 'Under a tenth of a point'],
};
/** 1 in the repayers count, in points (the chapter test checks the band) */
export const OUTCOME2 = 0;

export const QUIZ = {
  question: 'A team’s smallest group shows a 6-point jump in wrongful turn-downs this month. What first?',
  options: [
    'Count how many people the rate rests on before calling it real',
    'Retrain the model at once',
    'Leave the group out of the report',
  ],
  correct: 0,
  explanation: 'In a small group a few people move the rate a lot, so check the count before acting.',
  why: [
    'Right: in a small group, three or four people can make a 6-point jump by luck.',
    'Retraining on a jump that may be luck changes the model for no proven reason.',
    'Leaving a group out hides exactly the errors this module is about.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Years trading, late payments and order size are spread the same in both regions. The postcode isn’t.',
    act: 'Predict first.',
    say: { block: 'post-b', text: 'Lower scores' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'show',
    focus: 'show',
    visibleControls: ['show'],
    narration: 'Count who has a river postcode, and who repaid, in each region.',
    act: 'Show the postcodes.',
    predicate: s => s.shown,
  },
  {
    id: 'thin',
    focus: 'p2',
    visibleControls: ['out1', 'table', 'fact', 'p2'],
    narration: `${COUNT.B.river} of ${B}’s ${COUNT.B.n} have a river postcode, ${COUNT.A.river} of ${A}’s ${COUNT.A.n}: the postcode is a proxy for region.`,
    act: 'Predict again.',
    say: { block: 'lane-b', text: `${COUNT.B.n} applicants` },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'thin', 'quiz'],
    narration: `Base rates differ: ${pct(M.B.base)} of ${B} repaid, ${pct(M.A.base)} of ${A}. In a thin sample, one repayer moves ${B}’s rate ${Math.round(STEP_PTS.B)} points.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many people does a small group’s rate rest on?',
  },
];

function Table() {
  return (
    <table className="tc-ledger fr-table">
      <caption>Who has a river postcode, and who repaid</caption>
      <thead>
        <tr>
          <th scope="col">Region</th>
          <th scope="col">Applicants</th>
          <th scope="col">River postcode</th>
          <th scope="col">Repaid</th>
        </tr>
      </thead>
      <tbody>
        {REGIONS.map(r => (
          <tr key={r}>
            <th scope="row">
              <span aria-hidden="true">{MARK[r]}</span> {REGION_NAMES[r]}
            </th>
            <td>{COUNT[r].n}</td>
            <td>{COUNT[r].river}</td>
            <td>{`${COUNT[r].repaid} (${pct(COUNT[r].repaid / COUNT[r].n)})`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WhereSkewComesFrom() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bars: START_BARS, p1: null, shown: false, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus, say }) => (
        <GateStage
          bars={state.bars}
          linked
          onBars={bars => sync({ ...state, bars })}
          say={say}
          step={focus}
          caption={`${A}: ${COUNT.A.n} applicants. ${B}: ${COUNT.B.n}. Bar ${bar2(state.bars.A)} for both.`}
        >
          <ApplicantsNote />
        </GateStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        show: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, shown: true })}>
            Show the postcodes
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME1} />,
        table: () => <Table />,
        fact: () => (
          <>
            <Fact id="cfpb-proxy" />
            <p className="note">
              {`The made-up data gives ${Math.round(POSTCODE_MATCH * 10)} in 10 of each region its own side’s postcode, a hand-set rate. The CFPB finds place alone a weaker guess than place and surname together.`}
            </p>
          </>
        ),
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUTCOME2} />,
        thin: () => (
          <>
            <details className="fr-maths">
              <summary>The maths</summary>
              <p>
                {`One repayer is 1 in ${COUNT.B.repaid} of ${B}’s repayers: ${one(STEP_PTS.B)} points. In ${A}, 1 in ${COUNT.A.repaid}: ${one(STEP_PTS.A)} points. So ${B}’s rates swing about ${Math.round(STEP_PTS.B / STEP_PTS.A)} times as far with luck.`}
              </p>
            </details>
            <p className="note">
              {`Counting ${B}’s applicants ${TIMES} while the check learns doesn’t close the gap here (${pts(REWEIGHT.before)} points before, ${pts(REWEIGHT.after)} after): one rule made both regions’ records. More applicants would steady its rates; they can’t remove a real difference in the record.`}
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
