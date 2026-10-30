// Chapter 6: measure before you train. The shipped RAG version is the baseline; prompted and fine-tuned are candidates
// through Evals' release gate (decide, read-only), graded by Evals' key-fact check on the recorded answers. The Results
// tab is Evals' grid, a column per version. The tab is step state, so a reload keeps it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import type { Gate } from '../../lib/evals/graders';
import {
  BASELINE,
  gateVersion,
  gradeVersion,
  QUESTION_IDS,
  VERSIONS,
  type VersionId,
} from '../../lib/fine-tuning/engine';
import { TRAIN_PARTS } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, FineTuneStage, RecordedNote, versionCols, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '06-measure-before-you-train';
const label = (v: VersionId) => VERSIONS.find(x => x.id === v)!.label;
/** The gate: Evals' rule, a pass-rate bar and no question the baseline passed may fail. */
export const GATE: Gate = { threshold: 75, noRegressions: true };
const CANDIDATES: VersionId[] = ['prompted', 'finetuned'];
const BASE = label(BASELINE),
  N = QUESTION_IDS.length;
const REGRESSED = gateVersion('finetuned', GATE).regressed.length;
const facts = (v: VersionId) => gradeVersion(v, QUESTION_IDS).filter(g => g.fact).length;
const signed = (v: VersionId) => gradeVersion(v, QUESTION_IDS).filter(g => g.signed).length;

interface S {
  base: boolean;
  p1: number | null;
  gated: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `The gate: a candidate ships at ${GATE.threshold}% or more, and no question ${BASE} passes may fail. Run ${label('prompted')} and ${label('finetuned')} through it. Which ships?`,
  options: [`Both`, `Only ${label('finetuned')}`, `Only ${label('prompted')}`, 'Neither'],
};
/** read off Evals' decide on both candidates */
export function gateOutcome() {
  const [p, f] = CANDIDATES.map(v => gateVersion(v, GATE).ship);
  return p && f ? 0 : f ? 1 : p ? 2 : 3;
}

export const QUIZ = {
  question:
    'A team is sure a fine-tune will fix its assistant’s answers. Training is booked for next week. What should happen first?',
  options: [
    'Train first, then write tests to show the improvement',
    'Write the test set and score today’s version on it, so the fine-tune has a baseline to beat',
    'Ask a few colleagues whether the fine-tuned replies sound better',
    'Nothing: a fine-tune is always at least as good as the model it started from',
  ],
  correct: 1,
  explanation:
    'Without a baseline there is nothing to beat: the same tests, run before and after, are what show whether training helped.',
  why: [
    'Tests written after training tend to fit what the new model does well, and with no score from before there is no improvement to show.',
    'Right: score the shipped version first, then measure the fine-tune, the prompt change and better documents against the same bar.',
    'Sounding better is what fine-tuning is good at, yet here every version signed off and the gate still held two back on facts.',
    'A fine-tune can forget (chapter 5) and carry stale facts (chapter 4), so it can be worse than where it started.',
  ],
};

/** the bench's parts a callout can point at */
export const PARTS = TRAIN_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'baseline',
    focus: 'baseline',
    visibleControls: ['baseline'],
    narration: `A baseline is what a new version must beat: here ${BASE}, which ships. Its recorded answers are graded live.`,
    act: `Run it on ${N} test questions.`,
    say: { block: 'documents', text: 'Ships today' },
    predicate: s => s.base,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['baseScore', 'p1'],
    narration:
      'That is the bar. A release gate decides from a test run whether a candidate ships; this is Evals’ own, unchanged.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'gate',
    focus: 'gate',
    visibleControls: ['p1', 'gate'],
    narration: `Two candidates, one bar: ${BASE}’s score.`,
    act: `Run ${label('prompted')} and ${label('finetuned')} through the gate.`,
    predicate: s => s.gated,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['calls', 'facts', 'quiz'],
    narration: `Every version signs off; the gate checks facts. ${label('finetuned')} also broke ${REGRESSED} question${REGRESSED === 1 ? '' : 's'} ${BASE} gets right. The cheaper levers won, measured.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a fine-tune need to be measured against?',
  },
];

export default function MeasureBeforeYouTrain() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ base: false, p1: null, gated: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <FineTuneStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={() => ({
            scene: {
              lit: state.gated ? 'weights' : state.base ? 'documents' : null,
              weights: state.gated ? 'finetuned' : 'base',
            },
            results: state.gated
              ? { cols: versionCols([BASELINE, ...CANDIDATES]) }
              : state.base
                ? { cols: versionCols([BASELINE]) }
                : undefined,
            caption: state.gated
              ? CANDIDATES.map(v => `${label(v)}: ${gateVersion(v, GATE).ship ? 'ships' : 'held back'}`).join('. ') +
                `. ${BASE} stays.`
              : state.base
                ? `The baseline: ${BASE} passes ${facts(BASELINE)} of ${N}.`
                : 'The bench, before anyone trains again.',
            stamp: state.gated ? (CANDIDATES.some(v => gateVersion(v, GATE).ship) ? 'APPROVED' : 'DENIED') : undefined,
          })}
        />
      )}
      controls={{
        baseline: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, base: true, view: 'results' })}>
            Run the baseline: {BASE}
          </button>
        ),
        baseScore: () => (
          <>
            <p className="tc-status" role="status">
              {BASE} passes the key-fact check on{' '}
              <strong>
                {facts(BASELINE)} of {N}
              </strong>{' '}
              questions.
            </p>
            <Fact id="evals-first" />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        gate: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, gated: true, view: 'results' })}>
            Run both through the release gate
          </button>
        ),
        calls: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={gateOutcome()} />
            <table className="tc-ledger" style={{ marginTop: 10 }} data-gate>
              <caption>The gate’s call, against {BASE}</caption>
              <thead>
                <tr>
                  <th scope="col">Version</th>
                  <th scope="col">Signs off</th>
                  <th scope="col">Key fact</th>
                  <th scope="col">Call</th>
                </tr>
              </thead>
              <tbody>
                {CANDIDATES.map(v => {
                  const d = gateVersion(v, GATE);
                  return (
                    <tr key={v} data-version={v} data-ship={d.ship ? '1' : '0'}>
                      <th scope="row">{label(v)}</th>
                      <td>
                        {signed(v)} of {N}
                      </td>
                      <td>
                        {d.passed} of {N}
                      </td>
                      <td>
                        <strong>{d.ship ? 'Ship' : 'Hold back'}</strong>: {d.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ),
        facts: () => (
          <>
            <Fact id="prompt-first" />
            <Fact id="fine-tune-for" />
            <RecordedNote bar={GATE.threshold} />
            <p className="note">
              Teaching a smaller, cheaper model from a big one, and routing to it:{' '}
              <a href="/small-models/">the Small models module</a>.
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
