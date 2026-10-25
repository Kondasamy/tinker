// Chapter 7: the workbench. For each kind of question, a temperature (rescaling the confidence shown to customers) and
// a hand-over line (on the assistant's stated confidence): one native select each. Under them, a row per kind against
// the desk's rules, and a live total against the fewest hand-overs that keep every rule. The puzzle accepts every plan
// tied for the fewest (WINNERS, pinned); Show me applies one of them. The stage shows the chosen kind's jars at its
// temperature and the help desk's count.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import {
  KINDS,
  KIND_IDS,
  MIN_ANSWERS,
  THRESHOLDS,
  itemsOf,
  ofKind,
  type KindId,
  type Threshold,
} from '../../lib/calibration/answers';
import { TEMPERATURES, type Temperature } from '../../lib/calibration/measure';
import { bins } from '../../lib/calibration/score';
import { LEAST, RULES, WINNERS, solved, totals, type Choice, type Plan } from '../../lib/calibration/workbench';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { CalibrationStage, StandIn, pct, thresholdWords } from './kit';

const MODULE = 'calibration',
  ID = '07-workbench';
export const PARTS = JAR_PARTS;
/** Where the meeting started: the assistant's confidences as written, nothing handed over. */
export const START = Object.fromEntries(KIND_IDS.map(k => [k, { T: 1, threshold: 0 }])) as Plan;
const valid = (c: Partial<Choice> | undefined): c is Choice =>
  !!c && TEMPERATURES.includes(c.T as Temperature) && THRESHOLDS.includes(c.threshold as Threshold);
/** the plan in a run's state; a missing or unknown choice falls back to START's */
export const planOf = (p: Partial<Plan> | undefined): Plan =>
  Object.fromEntries(KIND_IDS.map(k => [k, valid(p?.[k]) ? p![k] : START[k]])) as Plan;

export interface S {
  plan: Plan;
  show: KindId;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A team sets one hand-over line for every kind of question, and the help desk is swamped. What does the workbench suggest?',
  options: [
    'A line per kind: high where the assistant is often wrong, lower where it is reliable',
    'Lower the line everywhere until the desk copes',
    'Turn the temperature up: it hands fewer answers over',
  ],
  correct: 0,
  explanation: 'Each kind has its own error rate, so each gets the lowest line that keeps it safe.',
  why: [
    'Right: the reliable kinds need few hand-overs, which leaves the desk room for the shaky ones.',
    'A lower line everywhere lets the shaky kinds send too many wrong answers.',
    'Here the line reads the stated confidence, so the dial changes what customers see, not who is handed over.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `Rules: at most ${pct(RULES.wrongRate)} wrong per kind, honest confidence shown, ${RULES.capacity} hand-overs a day. Best: ${LEAST}.`,
    act: 'Change the plan on the workbench.',
    say: { block: 'desk', text: `Room for ${RULES.capacity}` },
    predicate: s => solved(planOf(s.plan)),
    hint: 'Take one kind at a time: chapter 4 set a dial for honesty, chapter 6 a line for safety.',
    solution: s => ({ ...s, plan: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'quiz'],
    narration: 'The dial makes each confidence honest; the line decides who meets a person. Each kind needs its own.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Are the three kinds equally reliable?',
  },
];

function Score({ s }: { s: S }) {
  const p = planOf(s.plan),
    t = totals(p),
    best = solved(p);
  return (
    <div role="status" data-handed={t.handed} data-best={best ? '1' : '0'}>
      <p className="cb-headline">
        <strong>
          {t.rows.filter(r => r.safe && r.honest).length} of {KINDS.length}
        </strong>{' '}
        kinds keep the rules · {t.handed} of {RULES.capacity} hand-overs
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${LEAST}`}</span>
      </p>
      {best && <p className="cb-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your plan, kind by kind</caption>
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Wrong sent</th>
            <th scope="col">Shown, right</th>
            <th scope="col">Handed over</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.kind.id} data-kind={r.kind.id} data-safe={r.safe ? '1' : '0'} data-honest={r.honest ? '1' : '0'}>
              <th scope="row">
                {r.kind.label}
                <span className="cb-why">
                  T {r.choice.T}, {thresholdWords(r.choice.threshold)}
                </span>
              </th>
              <td>
                {r.wrong} of {r.kept} {r.safe ? '✓' : '✗'}
              </td>
              <td>
                {pct(r.shownMean)} vs {pct(r.rightShare)} {r.honest ? '✓' : '✗'}
              </td>
              <td>{r.handed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cb-note">
        {RULES.wrongWhy} {RULES.honestWhy} {RULES.capacityWhy}
      </p>
      <StandIn />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ plan: START, show: 'orders', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = planOf(state.plan),
          k = KIND_IDS.includes(state.show) ? state.show : KIND_IDS[0],
          c = p[k],
          row = totals(p).rows.find(r => r.kind.id === k)!;
        return (
          <CalibrationStage
            say={say}
            shown={{
              booth: {
                jars: bins(itemsOf(ofKind(k), c.T), MIN_ANSWERS),
                T: c.T,
                temps: TEMPERATURES,
                handed: totals(p).handed,
              },
              caption: `${row.kind.label} at T ${c.T}: shown ${pct(row.shownMean)} sure on average, right ${pct(row.rightShare)}; ${row.handed} handed over. Plan total: ${totals(p).handed} of ${RULES.capacity}.`,
              stamp: solved(p) ? 'APPROVED' : undefined,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state.plan);
          const change = (k: KindId, c: Partial<Choice>) =>
            set({ ...state, show: k, plan: { ...p, [k]: { ...p[k], ...c } } });
          return (
            <div className="cb-bench">
              {KINDS.map(k => (
                <fieldset key={k.id} data-kind={k.id}>
                  <legend>{k.label}</legend>
                  <label>
                    Temperature{' '}
                    <select
                      value={p[k.id].T}
                      onChange={e => change(k.id, { T: Number(e.currentTarget.value) as Temperature })}
                    >
                      {TEMPERATURES.map(T => (
                        <option key={T} value={T}>
                          {T}
                        </option>
                      ))}
                    </select>
                  </label>{' '}
                  <label>
                    Hand over{' '}
                    <select
                      value={p[k.id].threshold}
                      onChange={e => change(k.id, { threshold: Number(e.currentTarget.value) as Threshold })}
                    >
                      {THRESHOLDS.map(t => (
                        <option key={t} value={t}>
                          {t === 0 ? 'none' : `below ${pct(t)}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              ))}
            </div>
          );
        },
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
