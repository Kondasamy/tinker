// Chapter 3: graders. Three answers from the suite go one at a time through every grader: the three code checks (live,
// graders.ts), the model judge under rubric r1 (recorded) and a person (the team's label). Before each, the reader
// predicts which grader gets it wrong; the matrix fills in from the live results, beside the right verdict (the recorded
// answer's). The answers are picked off the suite by what they show, so every verdict on screen is computed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, VERSIONS, type Row, type VersionId } from '../../lib/evals/suite';
import { RUBRICS, REFERENCES, exactMatch, grade, isCorrect, judged, keyFact, label } from '../../lib/evals/graders';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EvalStage, Fact, Mark, QUESTION_TEXT, WithSuite, suiteNow, useSuite, type Shown, type Suite } from './kit';
import { EVAL_PARTS } from '../../components/scenes/evalScene';

export const PARTS = EVAL_PARTS;

const MODULE = 'evals',
  ID = '03-graders';
const {
  versions: [ALONE, SHIPPED],
  rubrics: [RUBRIC],
} = DOMAINS[ID];

export type Grader = 'exact' | 'fact' | 'citation' | 'judge' | 'person';
export const GRADERS: Grader[] = ['exact', 'fact', 'citation', 'judge', 'person'];
export const GRADER_NAME: Record<Grader, string> = {
  exact: 'Exact match',
  fact: 'Contains the key fact',
  citation: 'Has a citation',
  judge: 'Model judge (rubric r1)',
  person: 'A person',
};

export interface Case {
  row: Row;
  version: VersionId;
  q: number;
}
const caseOf = (s: Suite, v: VersionId, ok: (r: Row) => boolean): Case => {
  const q = s[v].findIndex(ok);
  return { row: s[v][q], version: v, q };
};
/** The three answers, picked off the suite by what each shows: a right answer in other words; a made-up policy from the
 * model alone, citing nothing; a wrong answer that cites a passage. */
export function casesOf(s: Suite): Case[] {
  const para = caseOf(
    s,
    SHIPPED,
    r => isCorrect(r.verdict) && !exactMatch(r.question, r.answer.text) && keyFact(r.question, r.answer.text),
  );
  return [
    para,
    caseOf(
      s,
      ALONE,
      r =>
        r.question !== para.row.question &&
        r.verdict === 'madeup' &&
        r.answer.citation === null &&
        !keyFact(r.question, r.answer.text) &&
        judged(r.question, r.signature, RUBRIC)?.pass === true &&
        label(r.question, r.signature)?.pass === false,
    ),
    caseOf(
      s,
      SHIPPED,
      r =>
        r.verdict === 'wrong' &&
        r.answer.citation !== null &&
        !keyFact(r.question, r.answer.text) &&
        label(r.question, r.signature)?.pass === false,
    ),
  ];
}
/** Every grader's verdict on one answer: code checks run live, the judge and the person are recorded. */
export function gradesOf({ row: r }: Case): Record<Grader, boolean> {
  return {
    exact: grade('exact', r.question, r.answer),
    fact: grade('fact', r.question, r.answer),
    citation: grade('citation', r.question, r.answer),
    judge: judged(r.question, r.signature, RUBRIC)!.pass,
    person: label(r.question, r.signature)!.pass,
  };
}

interface S {
  p: (number | null)[];
  graded: number;
  quiz: number | null;
}

const PREDICTS = [
  {
    question: 'Answer 1 is right, in its own words. Which grader fails it anyway?',
    graders: ['exact', 'fact', 'citation', 'judge'] as Grader[],
    none: 'None: a right answer passes every grader',
  },
  {
    question: 'Answer 2 states a policy no document has, and cites nothing. Which grader passes it?',
    graders: ['exact', 'fact', 'citation', 'judge'] as Grader[],
    none: 'None: a made-up policy fails every grader',
  },
  {
    question: 'Answer 3 is wrong, and it cites a passage from the documents. Which code check passes it?',
    graders: ['exact', 'fact', 'citation'] as Grader[],
    none: 'None: a wrong answer fails every code check',
  },
].map(p => ({ ...p, options: [...p.graders.map(g => GRADER_NAME[g]), p.none] }));
/** the first offered grader whose verdict differs from the right one, else "none" */
function outcome(c: Case, i: number) {
  const g = gradesOf(c),
    ok = isCorrect(c.row.verdict),
    at = PREDICTS[i].graders.findIndex(x => g[x] !== ok);
  return at < 0 ? PREDICTS[i].graders.length : at;
}

const QUIZ = {
  question:
    'Larkspur’s safety assistant must never tell staff to skip a step. A bad answer is worded differently every time. Which grader can catch one?',
  options: [
    'Exact match against the reference answer',
    'A check that the answer contains the step’s key phrase',
    'A model judge with a rubric about skipped steps, checked against people’s labels first',
    'A check that the answer cites the safety handbook',
  ],
  correct: 2,
  explanation: fact('model-graders').claim,
  why: [
    'Exact match fails every right answer that isn’t worded like the reference, and the bad answers don’t share any wording to match.',
    'A bad answer can mention the step and still say to skip it, so the phrase being there proves nothing.',
    'Right: only reading for meaning catches a skipped step in new words, once the judge is checked against people.',
    'A citation shows the answer names a passage, not that it follows it, as answer 3 showed.',
  ],
};

const N_CASES = PREDICTS.length;
const ordinal = (i: number) => `answer ${i + 1}`,
  ORDINAL = (i: number) => `Answer ${i + 1}`;
export const STEPS: Step<S>[] = [
  {
    id: 'predict-1',
    focus: 'p1',
    visibleControls: ['case1', 'p1'],
    narration: `A grader marks an answer pass or fail: code checks, a model judge, or a person. Here is ${ordinal(0)}.`,
    act: 'Predict first.',
    predicate: s => s.p[0] !== null,
  },
  {
    id: 'grade-1',
    focus: 'grade',
    visibleControls: ['p1', 'grade'],
    narration: `The model judge’s rubric, r1, asks: “${RUBRICS.r1}” Verdicts fill the Results table.`,
    act: `Run ${ordinal(0)} through every grader.`,
    predicate: s => s.graded >= 1 && !!suiteNow(),
  },
  {
    id: 'predict-2',
    focus: 'p2',
    visibleControls: ['out1', 'matrix', 'case2', 'p2'],
    narration:
      'Exact match failed a right answer worded differently. The key fact check looks only for the phrase that matters.',
    act: `Predict for ${ordinal(1)}.`,
    say: { block: 'fail', text: 'Exact match' },
    predicate: s => s.p[1] !== null,
  },
  {
    id: 'grade-2',
    focus: 'grade',
    visibleControls: ['p2', 'grade'],
    narration: `${ORDINAL(1)} came from the model with no documents.`,
    act: `Run ${ordinal(1)} through every grader.`,
    predicate: s => s.graded >= 2 && !!suiteNow(),
  },
  {
    id: 'predict-3',
    focus: 'p3',
    visibleControls: ['out2', 'matrix', 'case3', 'p3'],
    narration:
      'Code checks failed the made-up policy; the judge passed it, since rubric r1 asks how answers sound. The person caught it.',
    act: `Predict for ${ordinal(2)}.`,
    say: { block: 'pass', text: 'Judge passed it' },
    predicate: s => s.p[2] !== null,
  },
  {
    id: 'grade-3',
    focus: 'grade',
    visibleControls: ['p3', 'grade'],
    narration: `${ORDINAL(2)} is wrong, and cites a real passage.`,
    act: `Run ${ordinal(2)} through every grader.`,
    predicate: s => s.graded >= N_CASES && !!suiteNow(),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out3', 'matrix', 'kinds', 'quiz'],
    narration:
      'Has a citation passed a wrong answer: the named passage doesn’t say that. Each grader catches some failures and misses others.',
    act: 'One question to finish.',
    say: { block: 'pass', text: 'Citation passed' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which grader reads what the answer means, not its words?',
  },
];

/** One answer as the graders see it: the question, the reference answer, the answer and its citation. */
function CaseCard({ i }: { i: number }) {
  const { suite } = useSuite();
  if (!suite)
    return (
      <p className="tc-status" role="status">
        Preparing the test suite…
      </p>
    );
  const c = casesOf(suite)[i],
    r = c.row;
  return (
    <div className="tc-def ev-case-card" data-case={i} data-question={r.question} data-signature={r.signature}>
      <p className="lbl">
        Answer {i + 1} · {VERSIONS[c.version].label}, Q{c.q + 1}
      </p>
      <p>{QUESTION_TEXT[c.q]}</p>
      <p className="lbl">Reference answer</p>
      <p>{REFERENCES[r.question].answer}</p>
      <p className="lbl">The assistant’s answer</p>
      <p>“{r.answer.text}”</p>
      <p className="lbl">Citation</p>
      <p>{r.answer.citation ? `“${r.answer.citation}”` : 'none'}</p>
      <p className="lbl">The model judge’s rubric, r1</p>
      <p>“{RUBRICS.r1}”</p>
    </div>
  );
}

/** Graders × answers: each grader's verdict for every graded answer, with the right verdict on top. A grader that
 * disagrees with it is marked wrong in words, not colour alone. */
export function Matrix({ suite, graded }: { suite: Suite; graded: number }) {
  const cases = casesOf(suite);
  return (
    <table className="tc-ledger ev-matrix">
      <caption>Graders × answers</caption>
      <thead>
        <tr>
          <th scope="col">Grader</th>
          {cases.map((c, i) => (
            <th key={i} scope="col" data-case={i} data-question={c.row.question} data-signature={c.row.signature}>
              Answer {i + 1}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="ev-right">
          <th scope="row">The right verdict</th>
          {cases.map((c, i) => (
            <td key={i}>{i < graded ? <Mark ok={isCorrect(c.row.verdict)} /> : 'not yet'}</td>
          ))}
        </tr>
        {GRADERS.map(g => (
          <tr key={g} data-grader={g}>
            <th scope="row">{GRADER_NAME[g]}</th>
            {cases.map((c, i) => {
              if (i >= graded) return <td key={i}>not yet</td>;
              const ok = gradesOf(c)[g],
                wrong = ok !== isCorrect(c.row.verdict);
              return (
                <td key={i} data-case={i} data-pass={ok ? 1 : 0} data-wrong={wrong ? '' : undefined}>
                  <Mark ok={ok} />
                  {wrong && <span className="ev-wrong"> wrong</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const show =
  (s: S) =>
  (suite: Suite): Shown => {
    const cases = casesOf(suite),
      last = s.graded > 0 ? cases[s.graded - 1] : null;
    const g = last && gradesOf(last),
      n = g ? GRADERS.filter(x => g[x]).length : 0;
    return {
      scene: g
        ? { results: GRADERS.map(x => g[x]), board: `ANSWER ${s.graded} · ${n} OF ${GRADERS.length} PASS` }
        : { results: cases.map(() => true), graded: 0, board: `${cases.length} ANSWERS TO GRADE` },
      cols: [],
      caption: g
        ? `Answer ${s.graded}, through every grader: ${GRADERS.map(x => `${GRADER_NAME[x]} ${g[x] ? 'PASS' : 'FAIL'}`).join(', ')}. The right verdict: ${isCorrect(last!.row.verdict) ? 'PASS' : 'FAIL'}.`
        : `${cases.length} answers wait at the bench. Each goes through ${GRADERS.length} graders.`,
      table: <Matrix suite={suite} graded={s.graded} />,
    };
  };

const predict =
  (i: number) =>
  ({ state, apply }: { state: S; apply: (n: S) => void }) => (
    <Predict
      question={PREDICTS[i].question}
      options={PREDICTS[i].options}
      value={state.p[i]}
      onPredict={k => apply({ ...state, p: state.p.map((x, j) => (j === i ? k : x)) })}
    />
  );
const out =
  (i: number) =>
  ({ state }: { state: S }) => (
    <WithSuite>
      {suite => (
        <Outcome options={PREDICTS[i].options} prediction={state.p[i]} outcome={outcome(casesOf(suite)[i], i)} />
      )}
    </WithSuite>
  );

export default function Graders() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p: [null, null, null], graded: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <EvalStage show={show(state)} say={say} />}
      controls={{
        case1: () => <CaseCard i={0} />,
        case2: () => <CaseCard i={1} />,
        case3: () => <CaseCard i={2} />,
        p1: predict(0),
        p2: predict(1),
        p3: predict(2),
        out1: out(0),
        out2: out(1),
        out3: out(2),
        grade: ({ state, sync }) => (
          <WithSuite>
            {() => (
              <button
                type="button"
                className="big"
                onClick={() => sync({ ...state, graded: Math.min(N_CASES, state.graded + 1) })}
              >
                Grade answer {Math.min(N_CASES, state.graded + 1)}
              </button>
            )}
          </WithSuite>
        ),
        matrix: ({ state }) => <WithSuite>{suite => <Matrix suite={suite} graded={state.graded} />}</WithSuite>,
        kinds: () => (
          <div className="tc-def">
            <Fact id="code-graders" />
            <Fact id="model-graders" />
            <Fact id="human-graders" />
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
