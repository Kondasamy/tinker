// Chapter 4: split by layers. The table becomes a line of four stages (pipeline mode); the reader steps one batch down
// and back and sees the bubble (gpipe in pipeline.ts), predicts what micro-batches do, then sets eight and steps again.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LINE_PARTS } from '../../components/scenes/ringScene';
import { MODEL } from '../../lib/parallel-training/facts';
import { bubble } from '../../lib/parallel-training/pipeline';
import { pct } from '../../lib/parallel-training/story';
import { Outcome } from '../tool-calling/kit';
import {
  Fact,
  lastOf,
  Maths,
  MICROS,
  PassControls,
  type PassState,
  RingStage,
  sceneOf,
  scheduleFor,
  timelineOf,
} from './kit';

const MODULE = 'parallel-training',
  ID = '04-pipeline';
export const PARTS = LINE_PARTS;
/** stages on the line */
export const P = 4;
/** micro-batches the reader sets */
export const M = MICROS[MICROS.length - 1];
export const ONE = scheduleFor(P, 1);
export const B1 = bubble(P, 1),
  BM = bubble(P, M);
const IDLE_ONE = 2 * (P - 1);

export interface S {
  pass: PassState;
  p1: number | null;
  quiz: number | null;
}
export const STARTS: PassState = { mode: 'pipeline', n: P, k: 0, m: 1 };

export const P1 = {
  question: `Cut the batch into ${M} micro-batches. What happens to the bubble?`,
  options: [`It stays at ${pct(B1)}`, 'It shrinks, but some stays', 'It goes away'],
};
export const OUTCOME = BM === B1 ? 0 : BM > 0 ? 1 : 2;

export const QUIZ = {
  question:
    'A four-bay car wash takes one car through every bay before the next car goes in. Why do bays sit idle most of the time?',
  options: [
    'Only one car is in the line at a time',
    'Each bay works slower than the one before',
    'Four bays are too many for one car wash',
  ],
  correct: 0,
  explanation: 'With one item in a line, only one station works; letting the next one in early fills the others.',
  why: [
    'Right: one car means one busy bay; sending cars in one after another keeps every bay busy.',
    'Even with equal bays, three wait while one car is in the fourth.',
    'More bays are fine once several cars are in the line at once.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'walk',
    focus: 'stage',
    visibleControls: [],
    narration: `${MODEL.layers} layers cut into ${P} stages: a pipeline. One batch goes down the line, then back.`,
    act: 'Press Step to the end.',
    say: { block: 'idle', text: 'Waiting' },
    predicate: s => s.pass.k >= lastOf(s.pass),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `With one batch, each stage sat idle ${IDLE_ONE} of ${ONE.slots} slots: a bubble of ${pct(B1)}.`,
    act: 'Predict first.',
    say: { block: 'idle', text: 'The bubble' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'micro',
    focus: 'stage',
    visibleControls: [],
    narration: 'Your pick is locked. Each micro-batch moves on when its stage is done.',
    act: `Set Micro-batches to ${M} and Step to the end.`,
    say: { block: 'line', text: 'Stage 1' },
    predicate: s => s.pass.m === M && s.pass.k >= lastOf(s.pass),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sum', 'quiz'],
    narration: `${pct(BM)} idle now. The line still fills and empties once a batch, so the bubble shrinks but stays.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many stations can work when only one thing is in the line?',
  },
];

export default function Pipeline() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pass: STARTS, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const { m, k } = state.pass,
          sch = scheduleFor(P, m);
        return (
          <RingStage
            say={say}
            scene={sceneOf(state.pass)}
            timeline={timelineOf(state.pass)}
            caption={`${P} stages of ${MODEL.layers / P} layers, ${m} micro-batch${m > 1 ? 'es' : ''}: slot ${k + 1} of ${sch.slots}, ${pct(bubble(P, m))} bubble.`}
          >
            <PassControls
              key={`${focus}-${say?.text ?? ''}`}
              state={state.pass}
              workers={false}
              onChange={pass => (focus === 'stage' ? apply : sync)({ ...state, pass })}
            />
          </RingStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sum: () => (
          <>
            <Fact id="gpipe-bubble" />
            <Maths>
              <p>
                {`Bubble = (p − 1) ÷ (m + p − 1) for p stages and m micro-batches: (${P} − 1) ÷ (1 + ${P} − 1) = ${pct(B1)}; (${P} − 1) ÷ (${M} + ${P} − 1) = ${pct(BM)}.`}
              </p>
            </Maths>
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
