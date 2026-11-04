// Chapter 7: release day, the workbench. v1 is what ships today; the reader picks a candidate (v0, v2, v3), what grades
// it (the recorded verdict, or the judge under r1 or r2) and a release gate (a pass-rate bar, and whether a question
// v1 passed may fail). The stage shows the grid against v1 and the gate's call. Every control is step state, so a
// reload keeps the bench as it was (as Agents' workbench does). WORKBENCH_DOMAINS lists every value, so the unit tests
// grade every combination.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { BASELINE, VERSIONS, WORKBENCH_DOMAINS, type ReleaseGrader, type VersionId } from '../../lib/evals/suite';
import { decide, gradeRows, type Decision, type Gate } from '../../lib/evals/graders';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Chips, Group } from '../agents/kit';
import { EvalStage, Fact, SuiteNote, WithSuite, suiteNow, useSuite, type Shown, type Suite, type View } from './kit';
import { EVAL_PARTS } from '../../components/scenes/evalScene';

export const PARTS = EVAL_PARTS;

const MODULE = 'evals',
  ID = '07-release-day';
const { versions: CANDIDATES, graders: GRADERS, thresholds: BARS } = WORKBENCH_DOMAINS;
export const GRADER_NAME: Record<ReleaseGrader, string> = {
  verdict: 'The recorded verdict',
  r1: 'Model judge, rubric r1',
  r2: 'Model judge, rubric r2',
};
const base = VERSIONS[BASELINE].label;

export interface S {
  version: VersionId;
  grader: ReleaseGrader;
  threshold: number;
  noRegressions: boolean;
  view: View;
  quiz: number | null;
}

/** The gate's call on a candidate against the baseline, both graded the same way. */
export const release = (suite: Suite, v: VersionId, g: ReleaseGrader, gate: Gate): Decision =>
  decide(gradeRows(suite[BASELINE], g), gradeRows(suite[v], g), gate);
const call = (d: Decision) => `${d.ship ? 'Ship' : 'Do not ship'}: ${d.reason}.`;
/** the puzzle: under the recorded verdict, the gate ships v3 and blocks v2 */
export const solved = (suite: Suite, s: Pick<S, 'grader' | 'threshold' | 'noRegressions'>) =>
  s.grader === 'verdict' && release(suite, 'v3', 'verdict', s).ship && !release(suite, 'v2', 'verdict', s).ship;

const QUIZ = {
  question:
    'Larkspur’s warehouse assistant has a release gate: a judge grades one run of each test question, and a version ships at 90% with nothing regressed. A new version clears it. What should the team fix about the gate first?',
  options: [
    'Raise the bar to 100%, so only a perfect version ships',
    'Check the judge against people’s labels, and grade each question over several trials before trusting a pass',
    'Nothing: a high pass rate with nothing regressed proves the version is better',
    'Drop the no-regressions rule: it blocks too many versions',
  ],
  correct: 1,
  explanation: `A gate is only as good as what grades it and how often each case runs. ${fact('pass-hat-k').claim}`,
  why: [
    'A higher bar doesn’t help if the grader passes bad answers: rubric r1 passed every answer from the model with no documents.',
    'Right: an unchecked judge can pass made-up answers, and one run can pass a flaky case.',
    'Both numbers come from one run graded by an unchecked judge, which a flaky case or a lenient rubric can clear.',
    'That rule is what caught v2 breaking a question v1 answered, which a higher total would hide.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'gate',
    focus: 'gate',
    visibleControls: ['bench', 'gate', 'decision'],
    narration: `${base} is the baseline. This release gate ships any candidate reaching its threshold, so v2 ships despite its regression.`,
    act: 'Make it ship v3, block v2.',
    predicate: s => {
      const suite = suiteNow();
      return !!suite && solved(suite, s);
    },
    hint: 'Keep the recorded verdict as the grader. Turn on “No question that passed may fail”, or raise the bar above v2’s pass rate.',
    solution: s => ({ ...s, grader: 'verdict', threshold: BARS[0], noRegressions: true }),
  },
  {
    id: 'judge',
    focus: 'bench',
    visibleControls: ['bench', 'gate', 'decision'],
    narration: 'A gate trusts its grader, and chapter 3’s judge, under rubric r1, passed a made-up policy.',
    act: 'Grade with it, and pick v0: no documents.',
    predicate: s => s.grader === 'r1' && s.version === 'v0',
    hint: 'Pick “v0” and “Model judge, rubric r1”.',
    solution: s => ({ ...s, grader: 'r1', version: 'v0' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'gate', 'decision', 'once', 'quiz'],
    narration:
      'Rubric r1 passes every no-documents answer, so no threshold stops v0. Check the judge against people first. The bench is yours.',
    act: 'One question to finish.',
    say: { block: 'board', text: 'v0 ships' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did chapters 4 and 6 check before trusting a pass?',
  },
];

/** The gate's call on every candidate, so the reader sees what a setting ships and blocks. */
function Decisions({ suite, s }: { suite: Suite; s: S }) {
  const d = release(suite, s.version, s.grader, s);
  return (
    <div role="status" data-ship={d.ship ? '1' : '0'}>
      <p className="tc-status">
        <strong>{d.ship ? 'Ship' : 'Do not ship'}</strong> {VERSIONS[s.version].label}: {d.reason}.
      </p>
      <table className="tc-ledger ev-gate" style={{ marginTop: 10 }}>
        <caption>Your gate on every candidate, graded by {GRADER_NAME[s.grader].toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Passed</th>
            <th scope="col">Regressed</th>
            <th scope="col">Call</th>
          </tr>
        </thead>
        <tbody>
          {CANDIDATES.map(v => {
            const x = release(suite, v, s.grader, s);
            return (
              <tr key={v} data-version={v} data-ship={x.ship ? '1' : '0'}>
                <th scope="row">{VERSIONS[v].label}</th>
                <td>{x.rate}%</td>
                <td>{x.regressed.length}</td>
                <td>
                  <span className={`stamp ${x.ship ? 'correct' : 'wrong'}`}>{x.ship ? 'SHIP' : 'BLOCK'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const show =
  (s: S) =>
  (suite: Suite): Shown => {
    const d = release(suite, s.version, s.grader, s),
      label = VERSIONS[s.version].label;
    return {
      scene: {
        results: gradeRows(suite[s.version], s.grader),
        version: label,
        board: `${label} · ${d.passed}/${suite[s.version].length} · ${d.ship ? 'SHIP' : 'DO NOT SHIP'}`,
      },
      cols: [BASELINE, s.version].map(v => ({
        id: v,
        label: VERSIONS[v].label,
        results: gradeRows(suite[v], s.grader),
      })),
      caption: `${label} against ${base}, graded by ${GRADER_NAME[s.grader].toLowerCase()}. ${call(d)}`,
      stamp: d.ship ? 'APPROVED' : 'DENIED',
    };
  };

export default function ReleaseDay() {
  const { suite } = useSuite(); // Show me waits for the suite: the step's predicate reads it
  return (
    <StepRunner<S>
      ready={!!suite}
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ version: 'v2', grader: 'verdict', threshold: BARS[0], noRegressions: false, view: 'grid', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <EvalStage show={show(state)} view={state.view} onView={view => sync({ ...state, view })} say={say} />
      )}
      controls={{
        // picking what to look at is never a miss; changing the gate is an attempt only in the puzzle step
        bench: ({ state, sync }) => (
          <div className="tc-bench">
            <Group label="Candidate">
              <Chips
                label="Candidate"
                values={CANDIDATES}
                value={state.version}
                name={v => VERSIONS[v].label}
                pick={version => sync({ ...state, version })}
              />
            </Group>
            <p className="tc-status">
              {VERSIONS[state.version].label}: {VERSIONS[state.version].note}. Baseline {base}:{' '}
              {VERSIONS[BASELINE].note}.
            </p>
            <Group label="Grader">
              <Chips
                label="Grader"
                values={GRADERS}
                value={state.grader}
                name={g => GRADER_NAME[g]}
                pick={grader => sync({ ...state, grader })}
              />
            </Group>
          </div>
        ),
        // shown once the suite is loaded: the puzzle's predicate reads it, so an earlier press could never advance
        gate: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <WithSuite>
              {() => (
                <div className="tc-bench">
                  <Group label="Threshold">
                    <Chips
                      label="Threshold"
                      values={BARS}
                      value={state.threshold}
                      name={t => `${t}%`}
                      pick={threshold => set({ ...state, threshold })}
                    />
                  </Group>
                  <Group label="Regressions">
                    <Chips
                      label="Regressions"
                      values={[0, 1]}
                      value={+state.noRegressions}
                      name={x => (x ? 'No question that passed may fail' : 'Allowed')}
                      pick={x => set({ ...state, noRegressions: !!x })}
                    />
                  </Group>
                </div>
              )}
            </WithSuite>
          );
        },
        decision: ({ state }) => <WithSuite>{suite => <Decisions suite={suite} s={state} />}</WithSuite>,
        once: () => (
          <div className="tc-def">
            <p>
              This gate grades one run per question. Chapter 6 showed a case can pass one try and fail the next, so a
              real gate would grade several trials of each and use pass^k: ship only what passes every time.
            </p>
            <Fact id="pass-hat-k" />
            <p className="note">
              When one case fails, find the step that caused it:{' '}
              <a href="/causal-evals/03-replay-one-change/">Why did it fail?</a>
            </p>
            <SuiteNote />
          </div>
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
