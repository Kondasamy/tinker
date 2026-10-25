// Chapter 3: after the polish. The same held-out text, read by Larkspur mini and by its style fine-tune (both live).
// The fine-tune, scored on text it was not tuned for, is less calibrated: surer on average and right less often
// (pinned in data/calibration/pinned.json; KTD8's bar). GPT-4's report is cited apart, as OpenAI's finding about a far
// larger model after post-training.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { itemsAt, report } from '../../lib/calibration/measure';
import { SIGNOFF } from '../../lib/fine-tuning/engine';
import { accuracy, meanConf } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import { CalibrationStage, Fact, MiniNote, NAMES, Waiting, guessesNow, loadAll, pct, useGuesses } from './kit';

const MODULE = 'calibration',
  ID = '03-after-the-polish';
export const PARTS = JAR_PARTS;
type W = 'base' | 'finetuned';
export const WEIGHTS: W[] = ['base', 'finetuned'];

export interface S {
  p1: number | null;
  show: W;
  seen: Partial<Record<W, boolean>>;
  quiz: number | null;
}

export const P1 = {
  question: 'The same held-out text, read by the style fine-tune. How do its jars compare?',
  options: ['About as honest as before', 'Overconfident: rings above the mint', 'Underconfident: mint above the rings'],
};
/** Over, under or about the same: the fine-tune's average confidence against how often it is right. */
export function outcomeOf(gap: number) {
  return Math.abs(gap) < 0.05 ? 0 : gap > 0 ? 1 : 2;
}
const summary = (w: W) => {
  const g = guessesNow(w);
  if (!g) return null;
  const items = itemsAt(g);
  return { conf: meanConf(items), acc: accuracy(items), jars: report(g).jars };
};

export const QUIZ = {
  question:
    'A vendor fine-tunes a model to sound friendlier, then reports its confidence scores as unchanged. What should you ask?',
  options: [
    'Were they measured again on held-out text after the fine-tune?',
    'Nothing: tone can’t change confidence',
    'Whether the friendlier model uses more words',
  ],
  correct: 0,
  explanation:
    'A fine-tune for style can move a model’s confidence too; only a fresh check on held-out text shows whether it did.',
  why: [
    'Right: here a fine-tune for a sign-off made Larkspur mini surer and less right at once.',
    'Larkspur mini’s style fine-tune changed its confidence a lot, on text that had nothing to do with style.',
    'Length is a separate question; what matters is whether stated confidence still matches the hit rate.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The fine-tune learned only to sign off “${SIGNOFF}”. Score it on held-out text it was not tuned for.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'compare',
    focus: 'weights',
    visibleControls: ['p1', 'weights'],
    narration: 'Same held-out text, same jars. Only the weights differ.',
    act: 'Measure both: Larkspur mini, then the fine-tune.',
    say: { block: 'top', text: 'Rings above mint' },
    predicate: s => !!s.seen.base && !!s.seen.finetuned,
    hint: 'Press each button and wait for its jars to fill.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration:
      'The fine-tune is overconfident: it says more than it gets right, in nearly every jar. Polishing style moved its confidence too.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the style fine-tune leave the confidence alone?',
  },
];

function Stage({ state, say, sync }: { state: S; say?: Step<S>['say']; sync: (s: S) => void }) {
  const g = useGuesses(state.show);
  const r = g.guesses ? report(g.guesses) : null;
  useEffect(() => {
    if (r && !state.seen[state.show]) sync({ ...state, seen: { ...state.seen, [state.show]: true } });
  });
  const items = g.guesses ? itemsAt(g.guesses) : null;
  return (
    <CalibrationStage
      say={say}
      shown={{
        wait: !r ? (
          <Waiting failed={g.status === 'error'} retry={g.retry} done={g.model ? g.done : undefined} />
        ) : undefined,
        booth: { jars: r?.jars ?? [] },
        caption: items
          ? `${NAMES[state.show][0].toUpperCase()}${NAMES[state.show].slice(1)}: ${pct(meanConf(items))} sure on average, right ${pct(accuracy(items))} of the time.`
          : '',
      }}
    />
  );
}

export default function AfterThePolish() {
  useEffect(() => {
    loadAll(WEIGHTS).catch(() => {});
  }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, show: 'base', seen: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, sync }) => <Stage state={state} say={say} sync={sync} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        weights: ({ state, sync }) => (
          <div className="cb-picks" role="group" aria-label="Weights">
            {WEIGHTS.map(w => (
              <button
                key={w}
                type="button"
                className="chip"
                aria-pressed={state.show === w}
                onClick={() => sync({ ...state, show: w })}
              >
                {w === 'base' ? 'Larkspur mini' : 'The style fine-tune'}
                {state.seen[w] ? ' ✓' : ''}
              </button>
            ))}
          </div>
        ),
        result: ({ state }) => {
          const b = summary('base'),
            t = summary('finetuned');
          if (!b || !t) return null;
          return (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(t.conf - t.acc)} />
              <table className="tc-ledger" style={{ marginTop: 10 }} data-compare>
                <caption>Held-out text, measured in your browser</caption>
                <thead>
                  <tr>
                    <th scope="col">Weights</th>
                    <th scope="col">Sure, on average</th>
                    <th scope="col">Right</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['Larkspur mini', b],
                      ['The style fine-tune', t],
                    ] as const
                  ).map(([name, x]) => (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td>{pct(x.conf)}</td>
                      <td>{pct(x.acc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <MiniNote />
              <p className="cb-note">A separate finding, about a far larger model:</p>
              <Fact id="gpt4" />
            </>
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
