// Chapter 1: a film is many pictures. The reader scrubs the pinned route's real frames, predicts what a second of
// 1080p video weighs unpacked (Compression's bytes a pixel, Movie Gen's frame rate), then packs the toy's frames with
// Compression's own coder: frames repeat, so they pack small.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { PICTURE } from '../../lib/compression/files';
import { fact } from '../../lib/video-models/facts';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { Outcome } from '../tool-calling/kit';
import { DreamStage, Fact, n, PIN, ROUTE, StepRange } from './kit';

const MODULE = 'video-models',
  ID = '01-many-pictures';
export const PARTS = DREAM_PARTS;
const LAST = ROUTE.frames.length - 1;
/** Compression's bytes a pixel: its picture's bytes over its pixels. */
export const PER_PIXEL = PICTURE.rgb.length / (PICTURE.w * PICTURE.h);
const [W, H] = fact('hd').value!.split('x').map(Number);
const FPS = Number(fact('movie-gen').value);
export const FRAME_BYTES = W * H * PER_PIXEL,
  SECOND_BYTES = FRAME_BYTES * FPS;
const mb = (b: number) => `${(b / 1e6).toFixed(1)} MB`;

export interface S {
  at: number;
  p1: number | null;
  packed: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `A second of 1080p video at ${FPS} frames a second, stored raw. About how big is it?`,
  options: [mb(FRAME_BYTES), mb(SECOND_BYTES), mb(SECOND_BYTES * 10)],
};

export const QUIZ = {
  question: 'A shop camera films an empty aisle all night. Why does its video pack so small?',
  options: [
    'Each frame repeats almost all of the last one',
    'Night frames hold fewer pixels',
    'The camera skips frames when nothing moves',
  ],
  correct: 0,
  explanation: 'A coder can point back to what it already sent, and an empty aisle sends the same picture again.',
  why: [
    'Right: almost nothing changes, so each frame is mostly a repeat a coder can point back to.',
    'A frame has the same pixels day or night; darkness changes their values, not their count.',
    'The frame rate stays fixed; it is the repeats inside the frames that pack away.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'scrub',
    focus: 'frame',
    visibleControls: ['frame'],
    narration: 'Larkspur’s test floor, simulated: a robot, racks, and a crate riding the belt. Each tick is one frame.',
    act: 'Drag Frame to 8 or later.',
    say: { block: 'belt', text: 'The belt' },
    predicate: s => s.at >= 8,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Real video is far bigger: 1080p frames, at a frame rate of ${FPS} a second, ${PER_PIXEL} bytes a pixel.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'pack',
    focus: 'pack',
    visibleControls: ['out1', 'sum', 'pack'],
    narration: `${mb(SECOND_BYTES)} a second, before any packing. The toy’s ${PIN.bytes.frames} frames are tiny by comparison.`,
    act: 'Pack them with Compression’s coder.',
    say: { block: 'floor', text: 'One frame' },
    predicate: s => s.packed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['packed', 'quiz'],
    narration: `${n(PIN.bytes.raw)} bytes pack to ${n(PIN.bytes.packed)}: each frame repeats most of the one before.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How much of the aisle changes from one frame to the next?',
  },
];

export default function ManyPictures() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: 0, p1: null, packed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <DreamStage
          say={say}
          real={ROUTE.frames[state.at]}
          step={state.at}
          caption={`Frame ${state.at} of ${LAST}: one still picture of the floor, ${n(PIN.bytes.raw / PIN.bytes.frames)} cells.`}
        />
      )}
      controls={{
        frame: ({ state, apply, sync, focused }) => (
          <StepRange
            label="Frame"
            value={state.at}
            last={LAST}
            onChange={at => (focused ? apply : sync)({ ...state, at })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={1} />,
        sum: () => (
          <>
            <p className="note">
              {`${W} × ${H} pixels × ${PER_PIXEL} bytes = ${mb(FRAME_BYTES)} a frame, × ${FPS} frames. `}
              <a href="/compression/01-counting-the-bytes/">Counting bytes is Compression’s chapter 1.</a>
            </p>
            <Fact id="movie-gen" />
          </>
        ),
        pack: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, packed: true })}>
            Pack the frames
          </button>
        ),
        packed: () => (
          <table className="tc-ledger vm-table">
            <caption>{`The toy route’s ${PIN.bytes.frames} frames`}</caption>
            <tbody>
              <tr>
                <th scope="row">Raw, a byte a cell</th>
                <td>{`${n(PIN.bytes.raw)} bytes`}</td>
              </tr>
              <tr>
                <th scope="row">Packed (Compression’s pointers and short codes)</th>
                <td className="ok">{`${n(PIN.bytes.packed)} bytes`}</td>
              </tr>
            </tbody>
          </table>
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
