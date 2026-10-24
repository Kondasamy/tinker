// Chapter 6: from trace to test (R12.6, R13). The reader turns failed traces into eval cases (every trace of the mode
// chapter 5 chose, and any others), runs them on the current version (each trace's own reply) and, after a
// prediction, on the fixed version (the recorded answers in data/observability/fixed.json). Grading is live, by Evals'
// code graders: the key fact against the case's reference, and the citation. Evals' offline suite is recapped in one line
// and linked.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, FAILED, modeOf, traceOf } from '../../lib/observability/traces';
import { TOP } from '../../lib/observability/coding';
import { FIXED_VERSION, evalCase, gradeCase, type Version } from '../../lib/observability/cases';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODULE, Mark, ObsStage, modeName, wallOf, type View } from './kit';
import { TRACE_PARTS } from '../../components/scenes/traceScene';

export const PARTS = TRACE_PARTS;

const ID = '06-trace-to-test';
const OFFERED = DOMAINS[ID].traces.map(traceOf);
const TARGET = OFFERED.filter(t => TOP.includes(t.mode!)).map(t => t.id);
export const P1 = {
  question: `The fixed version rebuilt the policy index (“${FIXED_VERSION}”). How many of your cases will pass on it?`,
  options: ['All of them', `Only the ones whose mode is “${modeName(TOP[0])}”`, 'None: the graders are too strict'],
};
/** what the fixed version will show for the cases chosen */
export const outcomeFor = (cases: string[]) => {
  const pass = cases.filter(id => gradeCase(id, 'fixed').pass).length;
  return pass === cases.length ? 0 : pass === 0 ? 2 : 1;
};

export const QUIZ = {
  question:
    'A support team fixed a bug where the bot quoted the wrong shipping fee. Why add the customer’s conversation to the eval suite as well?',
  options: [
    'So a later change that brings the wrong fee back fails the suite before customers see it',
    'Because a bigger suite always means a better bot',
    'No need: the bug is fixed',
  ],
  correct: 0,
  explanation: 'A case from a real failure guards that fix for good.',
  why: [
    'Right: the case stays in the suite, and any version that brings the failure back fails it.',
    'Size isn’t the point: cases drawn from real failures test what really goes wrong.',
    'Fixed today isn’t fixed for good: a later prompt, model or index change can bring it back.',
  ],
};

interface S {
  cases: string[];
  ran: Version[];
  p1: number | null;
  view: View;
  quiz: number | null;
}
const has = (s: S) => TARGET.every(id => s.cases.includes(id));

export const STEPS: Step<S>[] = [
  {
    id: 'pick',
    focus: 'pick',
    visibleControls: ['evals', 'pick'],
    narration: 'Each failed trace can become an eval case: its question, a reference answer and Evals’ graders.',
    act: 'Add every trace of the fixed mode.',
    say: { block: 'wall', text: 'Traces to cases' },
    predicate: has,
    hint: `Add each trace whose mode is “${modeName(TOP[0])}”.`,
  },
  {
    id: 'current',
    focus: 'run',
    visibleControls: ['pick', 'run'],
    narration: 'Current replies are the traces’ own. Evals’ code graders check each for the key fact and a citation.',
    act: 'Run the cases on the current version.',
    predicate: s => s.ran.includes('current'),
    hint: 'Press the run button.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['results', 'p1'],
    narration:
      'Every case fails on the current version. The old-passage answers miss the key fact, though they cite a passage: last year’s.',
    act: 'Predict first.',
    say: { block: 'wall', text: 'Every case fails' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'fixed',
    focus: 'run',
    visibleControls: ['p1', 'results', 'run'],
    narration: 'Your pick is locked.',
    act: 'Run the same cases on the fixed version.',
    predicate: s => s.ran.includes('fixed'),
    hint: 'Press the run button.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'results', 'facts', 'quiz'],
    narration:
      'Its cases pass; other modes’ cases still fail until their own fix. All join the suite to catch a regression.',
    act: 'One question to finish.',
    say: { block: 'wall', text: 'Now in the suite' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a case from a real failure guard against?',
  },
];

function Results({ s }: { s: S }) {
  if (!s.ran.length) return null;
  return (
    <div className="ob-hscroll">
      <table className="tc-ledger" data-ran={s.ran.join(' ')}>
        <caption>Eval cases from failed traces</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            {s.ran.map(v => (
              <th key={v} scope="col">
                {v === 'current' ? 'Current' : 'Fixed'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.cases.map(id => {
            const c = evalCase(id);
            return (
              <tr key={id} data-case={id}>
                <th scope="row">
                  {c.question}
                  <span className="ob-why">
                    Key fact:{' '}
                    {Object.values(c.reference.facts)
                      .map(p => p[0])
                      .join(', ')}
                  </span>
                </th>
                {s.ran.map(v => {
                  const g = gradeCase(id, v);
                  return (
                    <td key={v}>
                      <Mark ok={g.pass} />
                      <span className="ob-why">
                        fact {g.fact ? '✓' : '✗'} · citation {g.citation ? '✓' : '✗'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TraceToTest() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ cases: [], ran: [], p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const last = state.cases.at(-1),
          v = state.ran.at(-1);
        const pass = v ? state.cases.filter(id => gradeCase(id, v).pass).length : 0;
        return (
          <ObsStage
            say={say}
            room={{
              cards: wallOf(FAILED, last),
              board: v
                ? `${v === 'fixed' ? 'FIXED' : 'CURRENT'} · PASS ${pass}/${state.cases.length}`
                : `CASES ${state.cases.length}`,
            }}
            trace={last ? traceOf(last) : null}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              last ? (
                <>
                  <span className="lbl">Latest case · trace {last}</span>
                  <span>“{traceOf(last).question}”</span>
                </>
              ) : (
                'Yesterday’s failed traces on the wall.'
              )
            }
          />
        );
      }}
      controls={{
        evals: () => (
          <p className="tc-status">
            In <a href="/evals/">Evals</a> you graded a suite written before launch. Here the cases come from what
            customers really asked.
          </p>
        ),
        pick: ({ state, sync }) => (
          <ol className="ob-list">
            {OFFERED.map((t, i) => {
              const on = state.cases.includes(t.id);
              return (
                <li key={t.id} className="ob-trace" data-ok={0}>
                  <p className="ob-q">
                    <b>{t.customer}:</b> “{t.question}”
                  </p>
                  <p className="ob-why">
                    {modeName(t.mode!)} · {t.note}
                  </p>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    disabled={state.ran.length > 0}
                    aria-label={`${on ? 'Added' : 'Add'} trace ${i + 1} as a test case`}
                    onClick={() =>
                      sync({ ...state, cases: on ? state.cases.filter(id => id !== t.id) : [...state.cases, t.id] })
                    }
                  >
                    {on ? 'Added' : 'Add as a test case'}
                  </button>
                </li>
              );
            })}
          </ol>
        ),
        run: ({ state, apply }) => {
          const v: Version = state.ran.includes('current') ? 'fixed' : 'current';
          return (
            <button
              type="button"
              className="big"
              onClick={() => apply({ ...state, ran: [...new Set([...state.ran, v])] })}
            >
              {v === 'current' ? 'Run on the current version' : 'Run on the fixed version'}
            </button>
          );
        },
        results: ({ state }) => <Results s={state} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeFor(state.cases)} />,
        facts: () => (
          <>
            <p className="tc-fact">
              The answers are recorded; the grading runs live, with the same graders as the Evals module.
            </p>
            <Fact id="evals-from-errors" />
            <p className="tc-status">The harm this fix removed was rated {modeOf(TOP[0]).harm} of 3 by the team.</p>
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
