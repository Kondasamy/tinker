// Chapter 6: run it twice. Three cases, each answered five times (data/evals/samples.json; the samples stand in for
// sampling a live model, KTD6). The reader predicts whether a case gives the same verdict every time, then picks k and
// the metric: pass@k (any of the first k tries passes) and pass^k (all of them pass), computed by graders.ts. Last, the
// suite size: what one flipped question does to the score over the whole test set, computed from its length.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { QUESTIONS, VERSIONS, passed } from '../../lib/evals/suite';
import { SAMPLES, isCorrect, passAtK, passHatK, type SampleCase } from '../../lib/evals/graders';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Chips } from '../agents/kit';
import { EvalStage, Fact, Mark, WithSuite, resultsOf, type Shown, type Suite } from './kit';

const MODULE = 'evals', ID = '06-run-it-twice';
const N = QUESTIONS.length, TRIES = SAMPLES[0].samples.length;
export const KS = [1, 3, 5] as const;
export type K = (typeof KS)[number];
export type Metric = 'at' | 'hat';
export const METRIC_NAME: Record<Metric, string> = { at: 'pass@k', hat: 'pass^k' };
export const metricOf = (m: Metric, c: SampleCase, k: number) => (m === 'at' ? passAtK(c, k) : passHatK(c, k));
const nameOf = (m: Metric, k: number) => METRIC_NAME[m].replace('k', String(k));
const at = (id: string) => QUESTIONS.findIndex(q => q.id === id);
/** the case whose verdict changes the most: the one the suite-size step flips */
const FLIP = SAMPLES.find(c => passAtK(c, TRIES) && !passHatK(c, 1))!;
const pct = (n: number) => `${((100 * n) / N).toFixed(1)}%`;
/** what one flipped question moves the score by, in percentage points */
export const SWING = `${(100 / N).toFixed(1)} points`;

interface S { p1: number | null; ran: boolean; k: K; metric: Metric; p2: number | null; flipped: boolean; quiz: number | null }

const P1 = {
  question: `Each of the ${SAMPLES.length} cases is asked ${TRIES} times, nothing changed between tries. How many cases get the same verdict every time?`,
  options: [
    'All of them: same question, same documents, same answer',
    'Some: a case can pass on one try and fail on the next',
    'None: every case flips at least once',
  ],
};
const steady = SAMPLES.filter(c => passHatK(c, TRIES) || !passAtK(c, TRIES)).length;
const OUT1 = steady === SAMPLES.length ? 0 : steady === 0 ? 2 : 1;

const P2 = {
  question: `Now ${nameOf('hat', 5)}: a case passes only if all ${TRIES} tries pass. How many of the ${SAMPLES.length} cases pass?`,
  options: SAMPLES.map((_, i) => `${SAMPLES.length - i} of ${SAMPLES.length}`).concat(`0 of ${SAMPLES.length}`),
};
const hat5 = SAMPLES.filter(c => passHatK(c, 5)).length;
const OUT2 = SAMPLES.length - hat5;

const QUIZ = {
  question: 'Larkspur’s returns assistant will answer every customer on its own, with nobody checking. Its new version passes a hard case on one try in five. Which number tells the team whether to trust it?',
  options: [
    'pass@5: it found the right answer, so it can',
    'pass^k over several tries: does it pass every time it is asked?',
    'The result of one run, since the next will match it',
    'The score over the whole test set, from one run per case',
  ],
  correct: 1,
  explanation: fact('pass-hat-k').claim,
  why: [
    `pass@5 says it can get it right, once in five. Each customer gets one try, not the best of five. ${fact('pass-at-k').claim}`,
    `Right. A customer gets whatever this try says. ${fact('pass-hat-k').claim}`,
    'The next run need not match: the same case passed and failed across tries here, with nothing changed.',
    `One run per case hides cases that flip. And with ${N} questions, one flip moves the score by ${SWING}.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `Until now each question was asked once. A model can answer the same question differently each time it is asked. Each attempt at a case is called a trial. The team asked ${SAMPLES.length} cases ${TRIES} times each. These recorded answers stand in for asking a live model again and again. Before you look:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run', focus: 'run', visibleControls: ['p1', 'run'],
    narration: `Show the ${TRIES} trials of every case, each graded PASS or FAIL.`,
    predicate: s => s.ran,
  },
  {
    id: 'pass-at-k', focus: 'k', visibleControls: ['out1', 'k', 'trials'],
    narration: `So one try says little. pass@k counts a case as passing if any of its first k trials passes. With k = 1 it is one try. Raise k to 5 and watch the cases that flip.`,
    predicate: s => s.metric === 'at' && s.k === 5,
    hint: 'Press “k = 5”.',
  },
  {
    id: 'predict-hat', focus: 'p2', visibleControls: ['trials', 'p2'],
    narration: `Under pass@5 every case that passed once passes. That measures whether the assistant can answer, not whether it will. pass^k turns it round.`,
    predicate: s => s.p2 !== null,
  },
  {
    id: 'pass-hat-k', focus: 'metric', visibleControls: ['p2', 'metric', 'k', 'trials'],
    narration: 'Switch the metric to pass^k, with k = 5.',
    predicate: s => s.metric === 'hat' && s.k === 5,
    hint: 'Press “pass^k”, and keep k = 5.',
  },
  {
    id: 'small-suite', focus: 'flip', visibleControls: ['out2', 'flip'],
    narration: `A case that flips also moves the test set’s score. Larkspur’s test set has ${N} questions, so each one is a big share of the score. Flip one question the way a flaky case flips. A flaky case is one that passes on some tries and fails on others.`,
    predicate: s => s.flipped,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['flipped', 'quiz'],
    narration: `One flipped question moved the score by ${SWING}. With a test set this small, a score that moves by one question may be one flaky case, not a better or worse version. Run each case more than once before you believe it. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'A customer gets one try. Which number counts every try?',
  },
];

/** Each case's trials, the first k marked, and the metric's verdict per case. */
function Trials({ s }: { s: S }) {
  return (
    // focusable: on a phone the table scrolls sideways, and a keyboard reader must reach it
    <div className="ev-hscroll" tabIndex={0} role="region" aria-label="Trials">
      <table className="tc-ledger ev-trials">
        <caption>{nameOf(s.metric, s.k)}: the first {s.k} trial{s.k === 1 ? '' : 's'} of each case</caption>
        <thead><tr><th scope="col">Case</th>{SAMPLES[0].samples.map((_, i) => <th key={i} scope="col">Try {i + 1}</th>)}<th scope="col">{nameOf(s.metric, s.k)}</th></tr></thead>
        <tbody>
          {SAMPLES.map(c => (
            <tr key={c.id} data-case={c.id}>
              <th scope="row">Q{at(c.question) + 1} · {VERSIONS[c.version as keyof typeof VERSIONS].label}<span className="ev-said"> {QUESTIONS[at(c.question)].query}</span></th>
              {c.samples.map((x, i) => (
                <td key={i} data-in={i < s.k ? '' : undefined}><Mark ok={isCorrect(x.verdict)} /></td>
              ))}
              <td data-metric data-pass={metricOf(s.metric, c, s.k) ? '1' : '0'}><Mark ok={metricOf(s.metric, c, s.k)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The test set's score for the flipped case's version, and what one flipped question does to it. */
function Flip({ suite, flipped }: { suite: Suite; flipped: boolean }) {
  const rows = suite[FLIP.version as keyof Suite], q = at(FLIP.question), was = passed(rows);
  const now = isCorrect(rows[q].verdict) ? was - 1 : was + 1;
  return (
    <table className="tc-ledger ev-swing" style={{ marginTop: 10 }}>
      <caption>{VERSIONS[FLIP.version as keyof typeof VERSIONS].label} over all {N} questions</caption>
      <thead><tr><th scope="col">Run</th><th scope="col">Passed</th><th scope="col">Score</th></tr></thead>
      <tbody>
        <tr><th scope="row">As recorded</th><td>{was} of {N}</td><td data-score="was">{pct(was)}</td></tr>
        {flipped && <tr data-changed=""><th scope="row">Q{q + 1} flipped</th><td>{now} of {N}</td><td data-score="now">{pct(now)}</td></tr>}
      </tbody>
      {flipped && <tfoot><tr><th scope="row">One question</th><td colSpan={2} data-swing>{SWING}</td></tr></tfoot>}
    </table>
  );
}

/** The stage: the bench grades the cases under the chosen metric; in the suite step, the whole test set. */
const show = (s: S) => (suite: Suite): Shown => {
  const table = <Trials s={s} />;
  if (s.flipped) {
    const v = FLIP.version as keyof Suite, results = resultsOf(suite[v]), q = at(FLIP.question);
    results[q] = !results[q];
    return { scene: { results, version: VERSIONS[v].label }, cols: [], table,
      caption: `${VERSIONS[v].label} with Q${q + 1} flipped: ${results.filter(Boolean).length} of ${N} passed. One question is ${SWING} of the score.` };
  }
  if (!s.ran) return { scene: { results: SAMPLES.map(() => true), graded: 0, board: `${SAMPLES.length} CASES · ${TRIES} TRIES` }, cols: [], table,
    caption: `${SAMPLES.length} cases, each to be asked ${TRIES} times.` };
  const results = SAMPLES.map(c => metricOf(s.metric, c, s.k)), n = results.filter(Boolean).length;
  return { scene: { results, board: `${nameOf(s.metric, s.k).toUpperCase()} ${n}/${SAMPLES.length}` }, cols: [], table,
    caption: `Under ${nameOf(s.metric, s.k)}, ${n} of ${SAMPLES.length} cases pass.` };
};

export default function RunItTwice() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, k: 1, metric: 'at', p2: null, flipped: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <EvalStage show={show(state)} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>Show every trial</button>,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUT1} />
            <ul className="ev-misses">
              {SAMPLES.flatMap(c => c.samples.map((x, i) => ({ c, x, i }))).filter(({ x }) => !isCorrect(x.verdict)).map(({ c, x, i }) => (
                <li key={`${c.id}-${i}`}><Mark ok={false} /> Q{at(c.question) + 1}, try {i + 1}: “{x.text}”</li>
              ))}
            </ul>
            <Fact id="trial" />
          </>
        ),
        trials: ({ state }) => <Trials s={state} />,
        k: ({ state, sync }) => <Chips label="k: trials counted" values={[...KS]} value={state.k} name={k => `k = ${k}`} pick={k => sync({ ...state, k })} />,
        metric: ({ state, sync }) => <Chips label="Metric" values={['at', 'hat'] as Metric[]} value={state.metric} name={m => METRIC_NAME[m]} pick={metric => sync({ ...state, metric })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => <><Outcome {...P2} prediction={state.p2} outcome={OUT2} /><Fact id="pass-hat-k" /><Fact id="pass-hat-k-tau-bench" /></>,
        flip: ({ state, sync }) => (
          <WithSuite>{suite => (
            <>
              <Flip suite={suite} flipped={state.flipped} />
              <button type="button" className="big" style={{ marginTop: 10 }} onClick={() => sync({ ...state, flipped: true })}>Flip Q{at(FLIP.question) + 1}, as its trials did</button>
            </>
          )}</WithSuite>
        ),
        flipped: ({ state }) => <WithSuite>{suite => <Flip suite={suite} flipped={state.flipped} />}</WithSuite>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
