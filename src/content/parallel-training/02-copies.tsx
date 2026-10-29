// Chapter 2: copies and slices of data. Four chip workers each hold a copy and their own stand-in gradients; the reader
// steps the ring all-reduce (ring.ts, real numbers) until every bucket is full and every copy holds the mean, predicts
// what eight chips send, then runs eight: each still sends under twice its gradient.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import { Outcome } from '../tool-calling/kit';
import {
  lastOf,
  Maths,
  PassControls,
  type PassState,
  ringFor,
  RingStage,
  SimNote,
  START,
  sceneOf,
  timelineOf,
} from './kit';

const MODULE = 'parallel-training',
  ID = '02-copies';
export const PARTS = RING_PARTS;
const num = (x: number) => String(Math.round(x * 1000) / 1000);
const FOUR = ringFor(START.n),
  EIGHT = ringFor(8);
/** bytes of one chip's gradient (8 a number) */
const vector = (n: number) => ringFor(n).bounds[n] * 8;
export const MEAN = [...FOUR.result[0]].map(num).join(', ');
export const RATIO = EIGHT.sent[0] / vector(8);

export interface S {
  pass: PassState;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'With 8 chips, how much does each one send, against the size of its own gradient?',
  options: ['Under twice its size', 'Eight times its size: once per chip', 'Half its size'],
};
export const OUTCOME = RATIO < 2 ? 0 : 1;

export const QUIZ = {
  question:
    'A team grows a data-parallel run from 64 chips to 512. What happens to the bytes each chip sends per all-reduce?',
  options: [
    'They stay under twice the gradient',
    'They grow eight times: one share for each chip',
    'They drop eight times, as the work is shared',
  ],
  correct: 0,
  explanation: 'A ring sends each chunk on once to add and once to share, so each chip sends under twice its gradient.',
  why: [
    'Right: more chips mean more, smaller chunks and more hops, but the same bytes each.',
    'Nobody sends to every chip; each passes only to its neighbour in the ring.',
    'Each chip still needs every other chip’s share of the sum, so its sending does not shrink.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'pass',
    focus: 'stage',
    visibleControls: [],
    narration: `${START.n} chips each train a copy on their own slice of the batch: data parallel. Their gradients differ.`,
    act: 'Press Step until every bucket is full.',
    say: { block: 'bucket', text: 'One share' },
    predicate: s => s.pass.k >= lastOf(s.pass),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A ring all-reduce: every copy now holds the mean, ${MEAN}. Each chip sent ${FOUR.sent[0]} bytes.`,
    act: 'Predict first.',
    say: { block: 'table', text: 'The ring' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'eight',
    focus: 'stage',
    visibleControls: [],
    narration: 'Your pick is locked. More chips mean more hops round the ring, and smaller buckets.',
    act: 'Pick 8 workers, then Step to the end.',
    say: { block: 'worker', text: 'Chip 1' },
    predicate: s => s.pass.n === 8 && s.pass.k >= lastOf(s.pass),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sum', 'quiz'],
    narration: `${EIGHT.sent[0]} bytes of a ${vector(8)}-byte gradient: under twice, however many chips. Only the hops grow.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Each chip passes only to its neighbour. How many times does each chunk leave it?',
  },
];

export default function Copies() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pass: START, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <RingStage
          say={say}
          scene={sceneOf(state.pass)}
          timeline={timelineOf(state.pass)}
          caption={`${state.pass.n} copies, hop ${state.pass.k} of ${lastOf(state.pass)}: stand-in gradients, ${vector(state.pass.n)} bytes each.`}
        >
          <PassControls
            key={`${focus}-${say?.text ?? ''}`}
            state={state.pass}
            workers={state.p1 !== null}
            onChange={pass => (focus === 'stage' ? apply : sync)({ ...state, pass })}
          />
        </RingStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sum: () => (
          <>
            <Maths>
              <p>
                {`Each chip sends 2(N − 1)/N of its gradient: N − 1 hops to add, N − 1 to share. For N = 8, ${EIGHT.sent[0]} ÷ ${vector(8)} = ${RATIO}.`}
              </p>
            </Maths>
            <SimNote />
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
