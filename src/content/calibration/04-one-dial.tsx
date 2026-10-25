// Chapter 4: one dial. Temperature scaling on the style fine-tune: the reader turns a native range over TEMPERATURES
// (the booth's dial mirrors it) and finds the setting with the lowest log loss on the fit half of the held-out guesses,
// then checks it on the test half, which played no part in choosing it. The top guesses never change with T.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import { TEMPERATURES, fitT, half, itemsAt, nll, report, type Guess } from '../../lib/calibration/measure';
import { accuracy, meanConf } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import {
  CalibrationStage,
  Fact,
  MiniNote,
  TemperatureRange,
  Waiting,
  guessesNow,
  loadAll,
  pct,
  three,
  useGuesses,
} from './kit';

const MODULE = 'calibration',
  ID = '04-one-dial';
export const PARTS = JAR_PARTS;
/** The fitted temperature, from the fine-tune's fit half (the tests pin it). */
export const fitted = (g: Guess[]) => fitT(half(g, 'fit'));

export interface S {
  p1: number | null;
  T: number;
  /** the measurement landed (the stage reports it), so the log loss can show */
  read: boolean;
  checked: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'Turn the temperature from 1 up to 2. What happens to the fine-tune’s top guesses?',
  options: [
    'The same guesses, stated less surely',
    'It picks different guesses',
    'The same guesses, stated more surely',
  ],
};
/** Dividing every score by the same T keeps their order, so the top guess is the same at every T. */
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'A team fits a temperature on its whole test set, then reports that set’s calibration as fixed. What is wrong?',
  options: [
    'The check used the same data as the fit, so it flatters the fix',
    'Nothing: more data makes a better fit',
    'Temperature can’t change calibration at all',
  ],
  correct: 0,
  explanation: 'Fit the dial on one set and check it on another, or the check repeats the fit.',
  why: [
    'Right: the setting was chosen to look good on that very data, so only fresh data can confirm it.',
    'More data helps the fit, but a check needs data the fit never saw.',
    'It changes every confidence; this chapter’s test half shows the jars come back near their rings.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Temperature: the model’s scores are divided by it before they become probabilities. Above 1, every confidence softens.',
    act: 'Predict first.',
    say: { block: 'dial', text: 'One number' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'fit',
    focus: 'dial',
    visibleControls: ['result', 'dial'],
    narration: 'Temperature scaling picks the setting with the lowest log loss on the fit half of the held-out text.',
    act: 'Find the lowest log loss.',
    say: { block: 'top', text: 'Watch the rings' },
    predicate: s => {
      const g = guessesNow('finetuned');
      return !!g && s.T === fitted(g);
    },
    hint: 'Slide the temperature and watch the log loss: it falls, then rises again.',
    solution: s => {
      const g = guessesNow('finetuned');
      return g ? { ...s, T: fitted(g) } : s;
    },
  },
  {
    id: 'check',
    focus: 'check',
    visibleControls: ['dial', 'check'],
    narration: 'The test half played no part in choosing it. Jars near their rings there mean the fix holds.',
    act: 'Check it on the test half.',
    predicate: s => s.checked,
    hint: 'Press “Check on the test half”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['checked', 'quiz'],
    narration:
      'One number, fitted after training, and the overconfidence is mostly gone. The top guesses never changed.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which data chose the setting, and which data can judge it?',
  },
];

function Stage({ state, say, sync }: { state: S; say?: Step<S>['say']; sync: (s: S) => void }) {
  const g = useGuesses('finetuned');
  useEffect(() => {
    if (g.guesses && !state.read) sync({ ...state, read: true });
  });
  const set = g.guesses ? half(g.guesses, state.checked ? 'test' : 'fit') : null;
  const r = set ? report(set, state.T) : null;
  const items = set ? itemsAt(set, state.T) : null;
  return (
    <CalibrationStage
      say={say}
      shown={{
        wait: !r ? (
          <Waiting failed={g.status === 'error'} retry={g.retry} done={g.model ? g.done : undefined} />
        ) : undefined,
        booth: { jars: r?.jars ?? [], T: state.T, temps: TEMPERATURES },
        caption:
          items && set
            ? `The fine-tune, ${state.checked ? 'test' : 'fit'} half (${num(set.length)} guesses) at temperature ${state.T}: ${pct(meanConf(items))} sure on average, right ${pct(accuracy(items))}.`
            : '',
      }}
    />
  );
}

export default function OneDial() {
  useEffect(() => {
    loadAll(['finetuned']).catch(() => {});
  }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, T: 1, read: false, checked: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, sync }) => <Stage state={state} say={say} sync={sync} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        result: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        // turning the dial is an attempt only while it is the puzzle
        dial: ({ state, apply, sync, focused }) => {
          const g = state.read ? guessesNow('finetuned') : undefined;
          return (
            <>
              <TemperatureRange value={state.T} onChange={T => (focused ? apply : sync)({ ...state, T })} />
              {g && (
                <p className="cb-note" data-loss={three(nll(half(g, 'fit'), state.T))}>
                  Log loss on the fit half at {state.T}: <strong>{three(nll(half(g, 'fit'), state.T))}</strong>
                </p>
              )}
            </>
          );
        },
        check: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, checked: true })}>
            Check on the test half
          </button>
        ),
        checked: ({ state }) => {
          const g = guessesNow('finetuned');
          if (!g) return null;
          const test = half(g, 'test');
          return (
            <>
              <table className="tc-ledger" style={{ marginTop: 10 }} data-check>
                <caption>The test half, {num(test.length)} guesses</caption>
                <thead>
                  <tr>
                    <th scope="col">Temperature</th>
                    <th scope="col">Sure, on average</th>
                    <th scope="col">Right</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, state.T].map(T => (
                    <tr key={T}>
                      <th scope="row">{T === 1 ? '1, as trained' : T}</th>
                      <td>{pct(meanConf(itemsAt(test, T)))}</td>
                      <td>{pct(accuracy(itemsAt(test, T)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <MiniNote />
              <Fact id="guo" />
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
