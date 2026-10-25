// Chapter 5: keeping score. ECE and the Brier score for three forecasters over the same held-out guesses: Larkspur mini,
// its style fine-tune, and one that always states Larkspur mini's overall hit rate. The last is perfectly calibrated
// (ECE 0) and no help; the Brier score, which also rewards being sure and right, ranks Larkspur mini above it.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { MIN_BIN, itemsAt, type Guess } from '../../lib/calibration/measure';
import { accuracy, bins, brier, ece, type Item } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import { CalibrationStage, Fact, MiniNote, Waiting, guessesNow, loadAll, pct, three, useGuesses } from './kit';
import pinned from '../../../data/calibration/pinned.json' with { type: 'json' };

const MODULE = 'calibration',
  ID = '05-keeping-score';
export const PARTS = JAR_PARTS;
export type Who = 'base' | 'finetuned' | 'constant';
export const WHO: Who[] = ['base', 'finetuned', 'constant'];
/** Larkspur mini's overall hit rate, which the constant forecaster always states. */
export const HIT = pinned.models.base.right / pinned.models.base.positions;
export const LABEL: Record<Who, string> = {
  base: 'Larkspur mini',
  finetuned: 'The style fine-tune',
  constant: `Always ${pct(HIT)}`,
};
/** A forecaster's items: the model's own, or the base's outcomes with the hit rate stated every time. */
export const itemsOf = (who: Who, g: Guess[]): Item[] =>
  who === 'constant' ? itemsAt(g).map(x => ({ c: HIT, ok: x.ok })) : itemsAt(g);
export const scoreOf = (items: Item[]) => ({ ece: ece(items, MIN_BIN), brier: brier(items), acc: accuracy(items) });

export interface S {
  p1: number | null;
  show: Who;
  seen: Partial<Record<Who, boolean>>;
  quiz: number | null;
}

export const P1 = {
  question: `A forecaster always says ${pct(HIT)}, Larkspur mini’s overall hit rate, for every guess. What is its ECE?`,
  options: ['Zero: perfectly calibrated', 'High: it never commits', 'It can’t be scored'],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'Two models have the same ECE. One is far more often sure and right. Which score tells them apart?',
  options: [
    'The Brier score: it rewards confident right answers',
    'ECE again, with more jars',
    'Accuracy alone',
  ],
  correct: 0,
  explanation: 'ECE checks honesty; the Brier score checks honesty and sharpness together.',
  why: [
    'Right: being sure and right shrinks each squared gap, so the sharper model scores lower.',
    'ECE only asks whether each jar keeps its promise, and both models’ jars do.',
    'Accuracy ignores the confidences, which is the very thing being scored.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'ECE adds up each jar’s gap between its ring and its mint, weighted by how full it is. 0 is honest.',
    act: 'Predict first.',
    say: { block: 'slate', text: 'One number' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'score',
    focus: 'who',
    visibleControls: ['p1', 'who'],
    narration:
      'The Brier score averages the squared gap between each confidence and what happened. Sure and right scores best.',
    act: 'Score all three forecasters.',
    say: { block: 'slate', text: 'Lower is better' },
    predicate: s => WHO.every(w => s.seen[w]),
    hint: 'Press each forecaster’s button in turn.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration: `“Always ${pct(HIT)}” is honest and no help. Track ECE for honesty, and the Brier score for honest and useful.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which score cares whether a sure answer was right?',
  },
];

function Stage({ state, say, sync }: { state: S; say?: Step<S>['say']; sync: (s: S) => void }) {
  const g = useGuesses(state.show === 'finetuned' ? 'finetuned' : 'base');
  const items = g.guesses ? itemsOf(state.show, g.guesses) : null;
  const sc = items ? scoreOf(items) : null;
  useEffect(() => {
    if (sc && !state.seen[state.show]) sync({ ...state, seen: { ...state.seen, [state.show]: true } });
  });
  return (
    <CalibrationStage
      say={say}
      shown={{
        wait: !items ? (
          <Waiting failed={g.status === 'error'} retry={g.retry} done={g.model ? g.done : undefined} />
        ) : undefined,
        booth: {
          jars: items ? bins(items, MIN_BIN) : [],
          slate: sc ? `ECE ${three(sc.ece)} · BRIER ${three(sc.brier)}` : undefined,
        },
        caption: sc ? `${LABEL[state.show]}: ECE ${three(sc.ece)}, Brier score ${three(sc.brier)}.` : '',
      }}
    />
  );
}

export default function KeepingScore() {
  useEffect(() => {
    loadAll(['base', 'finetuned']).catch(() => {});
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
        who: ({ state, sync }) => (
          <div className="cb-picks" role="group" aria-label="Forecaster">
            {WHO.map(w => (
              <button
                key={w}
                type="button"
                className="chip"
                aria-pressed={state.show === w}
                onClick={() => sync({ ...state, show: w })}
              >
                {LABEL[w]}
                {state.seen[w] ? ' ✓' : ''}
              </button>
            ))}
          </div>
        ),
        result: ({ state }) => {
          const b = guessesNow('base'),
            t = guessesNow('finetuned');
          if (!b || !t) return null;
          const rows = WHO.map(w => [w, scoreOf(itemsOf(w, w === 'finetuned' ? t : b))] as const);
          return (
            <>
              <Outcome
                {...P1}
                prediction={state.p1}
                outcome={rows.find(([w]) => w === 'constant')![1].ece < 0.005 ? OUTCOME : 1}
              />
              <table className="tc-ledger" style={{ marginTop: 10 }} data-scores>
                <caption>The same held-out guesses, three ways to state them</caption>
                <thead>
                  <tr>
                    <th scope="col">Forecaster</th>
                    <th scope="col">ECE</th>
                    <th scope="col">Brier score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([w, x]) => (
                    <tr key={w} data-who={w}>
                      <th scope="row">{LABEL[w]}</th>
                      <td>{three(x.ece)}</td>
                      <td>{three(x.brier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <MiniNote />
              <Fact id="brier" />
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
