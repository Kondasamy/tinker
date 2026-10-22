// Chapter 1: big model, small model. The reader weighs Larkspur mini and its student (counted from the shapes in
// meta.json), predicts how the student's top 5 compares, then asks both to continue a sentence: the top 5 side by side,
// computed live in the browser. The page fetches both weight sets on load, so it plays on offline.
import { useEffect } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { layoutOf, multsPerToken, paramCount, PROMPTS, top5 } from '../../lib/small-models/compare';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BothGate, META, SmallStage, TopFive, bothNow, loadBoth } from './kit';

const MODULE = 'small-models',
  ID = '01-big-model-small-model';
const SIZE = { teacher: paramCount(layoutOf(META, 'teacher')), student: paramCount(layoutOf(META, 'student')) };
const WORK = { teacher: multsPerToken(layoutOf(META, 'teacher')), student: multsPerToken(layoutOf(META, 'student')) };
const share = (a: number, b: number) => `${Math.round((100 * a) / b)}%`;
/** the picked prompt; a saved index past the list falls back to the first */
const promptAt = (i: number) => PROMPTS[i] ?? PROMPTS[0];

interface S {
  weighed: boolean;
  p1: number | null;
  prompt: number;
  asked: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `The student has ${share(SIZE.student, SIZE.teacher)} of Larkspur mini’s weights. Ask both to continue the same sentence. How will the student’s top 5 compare?`,
  options: [
    'The same five pieces, with the same odds',
    'Mostly the same pieces, less sure, and on some sentences a different top pick',
    'Different pieces altogether: a smaller model learns different words',
  ],
};
/** read off every prompt the chapter offers: identical odds, overlapping pieces, or nothing shared */
export function outcome(t: Parameters<typeof top5>[0], s: Parameters<typeof top5>[0]) {
  const pairs = PROMPTS.map(p => [top5(t, p.text), top5(s, p.text)]);
  if (pairs.every(([a, b]) => a.every((c, i) => c.id === b[i].id && Math.abs(c.p - b[i].p) < 1e-6))) return 0;
  return pairs.some(([a, b]) => a.some(c => b.some(d => d.id === c.id))) ? 1 : 2;
}

const QUIZ = {
  question:
    'A support team swaps its 70-billion-weight model for an 8-billion-weight one of the same design. What changes for each token it writes?',
  options: [
    'About a ninth of the work, and odds that are less sure',
    'The same work, since a token is a token',
    'More work, since the smaller model has to try harder',
    'Nothing until it is retrained on new words',
  ],
  correct: 0,
  explanation:
    'Work per token follows the weights, and a model with fewer weights holds less, so its odds are flatter.',
  why: [
    'Right. Each token costs about one multiplication per weight, and fewer weights hold less of what the text taught.',
    'Every token runs through all the weights; fewer weights, fewer multiplications.',
    'A model does not choose its effort: its shape fixes the multiplications per token.',
    'The smaller model reads the same pieces of text; it just knows less about them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'weigh',
    focus: 'weigh',
    visibleControls: ['weigh'],
    narration:
      'On the bench: Larkspur mini, the tiny model from the Fine-tuning module, and its student, a smaller model taught by it. Both run in your browser. Their numbers teach the mechanism; they are not any provider’s. Weigh them first.',
    predicate: s => s.weighed,
    hint: 'Press “Weigh both models”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['sizes', 'p1'],
    narration: `Fewer weights means less work for every piece of text: the student does ${share(WORK.student, WORK.teacher)} of the multiplications per token. What does it give up? Before you ask:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Pick a sentence and ask both models for their top 5 next pieces.',
    predicate: s => s.asked && !!bothNow(),
    hint: 'Press “Ask both”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['answers', 'ask', 'quiz'],
    narration:
      'The student knows the same pieces of text, and its top picks are mostly the teacher’s. But its odds are flatter: with fewer weights it holds less, so it is less sure, and on some sentences its first pick slips. Try the other sentences. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What follows the number of weights?',
  },
];

export default function BigModelSmallModel() {
  // fetch both weight sets on load, so the chapter plays on with the network gone
  useEffect(() => {
    loadBoth().catch(() => {});
  }, []);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ weighed: false, p1: null, prompt: 0, asked: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <SmallStage
          models
          show={() => {
            const m = bothNow(),
              p = promptAt(state.prompt),
              same = m && top5(m.teacher, p.text)[0].id === top5(m.student, p.text)[0].id;
            return {
              scene: { mode: 'distill', lit: state.asked ? 'both' : null },
              caption: state.asked
                ? `Both asked to continue “${p.text}”: their top picks ${same ? 'match' : 'differ'}.`
                : state.weighed
                  ? `Larkspur mini: ${num(SIZE.teacher)} weights. The student: ${num(SIZE.student)}.`
                  : 'Larkspur mini at the back, its student in front.',
            };
          }}
        />
      )}
      controls={{
        weigh: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, weighed: true })}>
            Weigh both models
          </button>
        ),
        sizes: () => (
          <table className="tc-ledger" data-sizes>
            <caption>Counted from each model’s shapes</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Weights</th>
                <th scope="col">Work per token</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Larkspur mini</th>
                <td>{num(SIZE.teacher)}</td>
                <td>{num(WORK.teacher)} multiplications</td>
              </tr>
              <tr>
                <th scope="row">Student</th>
                <td>{num(SIZE.student)}</td>
                <td>{num(WORK.student)} multiplications</td>
              </tr>
            </tbody>
          </table>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, sync }) => (
          <BothGate>
            {() => (
              <>
                <div role="group" aria-label="Pick a sentence" className="ft-row">
                  {PROMPTS.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className="chip"
                      aria-pressed={state.prompt === i}
                      onClick={() => sync({ ...state, prompt: i })}
                    >
                      “{p.text}…”
                    </button>
                  ))}
                </div>
                {!state.asked && (
                  <button
                    type="button"
                    className="big"
                    style={{ marginTop: 10 }}
                    onClick={() => sync({ ...state, asked: true })}
                  >
                    Ask both
                  </button>
                )}
                {state.asked && (
                  <BothGate>
                    {m => (
                      <TopFive
                        teacher={top5(m.teacher, promptAt(state.prompt).text)}
                        student={top5(m.student, promptAt(state.prompt).text)}
                      />
                    )}
                  </BothGate>
                )}
              </>
            )}
          </BothGate>
        ),
        answers: ({ state }) => (
          <BothGate>{m => <Outcome {...P1} prediction={state.p1} outcome={outcome(m.teacher, m.student)} />}</BothGate>
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
