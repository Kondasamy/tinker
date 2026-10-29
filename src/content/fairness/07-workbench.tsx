// Chapter 7: the workbench (KTD9). The reader picks the fields the check reads, the sample fix and a bar per region
// (over BENCH_BARS, in the stage) against the credit team's rule: false declines within gapMax of each other, then the
// fewest wrong decisions. The puzzle accepts every setting in WINNERS (pinned, recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GATE_PARTS } from '../../components/scenes/gateScene';
import { FIXES, type Fix } from '../../lib/fairness/fit';
import { REGION_NAMES, runOf } from '../../lib/fairness/story';
import {
  BENCH_BARS,
  LEAST,
  RULES,
  START,
  WINNERS,
  benchOf,
  benchScore,
  meets,
  wins,
  type Bench,
} from '../../lib/fairness/workbench';
import { ApplicantsNote, Caveat, FIELD_NAMES, Fact, FieldPick, GateStage, bar2, pct, type View } from './kit';
import { TIMES } from './module';

const MODULE = 'fairness',
  ID = '07-workbench';
export const PARTS = GATE_PARTS;
const { A, B } = REGION_NAMES;
const GAP_MAX = Math.round(RULES.gapMax * 100);
/** a gap in points, one decimal, with a real minus sign */
const pts = (x: number) => (x * 100).toFixed(1).replace('-', '−');
const FIX_NAMES: Record<Fix, string> = { none: 'None', reweight: `Count ${B} ${TIMES}` };
/** the shared-bar start's wrong decisions, the "no rule" baseline */
const BEFORE = runOf().all.error;

export const QUIZ = {
  question: 'The winning setting uses a bar per region. What should the team do before shipping it?',
  options: [
    'Test it on applicants the fit never saw, and check the law for the groups involved',
    'Nothing: the bench proved it fair',
    'Drop the gap rule to cut wrong decisions',
  ],
  correct: 0,
  explanation: 'The bench scored the same applicants the check learned from, and two bars treat groups differently.',
  why: [
    'Right: these rates come from the fit’s own applicants, and a bar per group can be a legal question.',
    'It met one rule on the applicants it learned from, which is not proof on new ones.',
    'Dropping the rule brings the gap back; the rule was the point.',
  ],
};

interface S extends Bench {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Workbench: fields, the sample fix and a bar per region. The rule: false declines within ${GAP_MAX} points.`,
    act: 'Keep the rule with the fewest wrong decisions.',
    say: { block: 'out-b', text: 'Gap rule' },
    predicate: s => wins(s),
    hint: `Drop the region field, count ${B} more, and give each region its own bar.`,
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${pct(LEAST)} wrong with the gap kept: none here does better. With one bar and no rule it was ${pct(BEFORE)}.`,
    act: 'One question to finish.',
    say: { block: 'check', text: 'Refitted' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose applicants were these rates measured on?',
  },
];

function Score({ s }: { s: Bench }) {
  const { error, gap } = benchScore(s),
    best = wins(s),
    ok = meets(s);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-ok={ok ? '1' : '0'}>
      <p className="fr-headline">
        <strong>{pct(error)}</strong>
        {` wrong, gap ${pts(gap)} points `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? 'MORE WRONG' : 'BREAKS THE RULE'}
        </span>
      </p>
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const { error, gap } = benchScore(s);
  const rows: [string, string, boolean | null][] = [
    [`False-decline gap (rule: within ${GAP_MAX})`, `${pts(gap)} points`, meets(s)],
    ['Wrong decisions overall', pct(error), null],
  ];
  return (
    <div className="tc-bench">
      <section className="fr-bench" aria-label="Check setting">
        <FieldPick value={s.features} onPick={features => set({ ...s, features })} />
        <fieldset>
          <legend>Sample fix</legend>
          {FIXES.map(f => (
            <label key={f}>
              <input type="radio" name="fr-fix" checked={s.fix === f} onChange={() => set({ ...s, fix: f })} />
              {FIX_NAMES[f]}
            </label>
          ))}
        </fieldset>
      </section>
      <table className="tc-ledger fr-table">
        <caption>{`${FIELD_NAMES[s.features]}, fix: ${FIX_NAMES[s.fix].toLowerCase()}, bars ${bar2(s.barA)} and ${bar2(s.barB)}`}</caption>
        <tbody>
          {rows.map(([name, v, good]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={good === null ? undefined : good ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">{`Two bars treat ${A} and ${B} differently on purpose; with a protected class that is a legal question.`}</p>
      <Fact id="ecoa" />
      <Caveat />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const s = { ...state, ...benchOf(state) };
        const set = focus === 'bench' ? apply : sync;
        return (
          <GateStage
            features={s.features}
            fix={s.fix}
            bars={{ A: s.barA, B: s.barB }}
            linked={false}
            list={BENCH_BARS}
            onBars={b => set({ ...s, barA: b.A, barB: b.B })}
            view={s.view}
            onView={view => sync({ ...s, view })}
            say={say}
            step={focus}
            caption={`${FIELD_NAMES[s.features]}; bars ${A} ${bar2(s.barA)}, ${B} ${bar2(s.barB)}.`}
          >
            <ApplicantsNote />
          </GateStage>
        );
      }}
      controls={{
        score: ({ state }) => <Score s={benchOf(state)} />,
        // changing the setting is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => (
          <BenchControls s={{ ...state, ...benchOf(state) }} set={focused ? apply : sync} />
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
