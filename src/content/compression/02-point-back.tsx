// Chapter 2: point back (LZ77). The scanner names from the price list sit on the strip; the reader predicts how many
// pointers will stand in for their repeats, replaces them and watches the arcs, then packs the whole price list with
// pointers and sees the parcel shrink.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { fileOf } from '../../lib/compression/files';
import { sizeOf } from '../../lib/compression/coders';
import { MIN_MATCH } from '../../lib/compression/lz77';
import { SCANNERS } from '../../lib/compression/story';
import { pointerStrip } from '../../components/scenes/pointerStrip';
import { PILE_PARTS } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, StripView, bytes, enc, type View } from './kit';

const MODULE = 'compression',
  ID = '02-point-back';
export const PARTS = PILE_PARTS;
const PRICE = fileOf('price');
export const STRIP = pointerStrip(enc(SCANNERS));
export const LZ_SIZE = sizeOf('lz77', PRICE.bytes, PRICE.id);
const COPIED = STRIP.cells.filter(c => c.kind === 'copy').length;

export const P1 = {
  question: 'How many pointers will stand in for the repeats in the two names?',
  options: ['None: no line repeats exactly', 'Two: one per repeated stretch', 'One per repeated letter'],
};
export const outcomeOf = () => (STRIP.arcs.length === 2 ? 1 : STRIP.arcs.length === 0 ? 0 : 2);

export const QUIZ = {
  question: 'Which of these files would pointers shrink the most?',
  options: [
    'A log where the same line repeats all day',
    'A list of random serial numbers',
    'A short note with no repeated words',
  ],
  correct: 0,
  explanation: 'A pointer only helps where an earlier copy exists, and long repeats save the most.',
  why: [
    'Right: every repeat of the line becomes one short pointer back to the first.',
    `Random serial numbers rarely repeat for ${MIN_MATCH} bytes or more, so nearly every byte stays a literal.`,
    'With nothing repeated there is nothing to point back to, and literals cost a little extra.',
  ],
};

interface S {
  view: View;
  p1: number | null;
  pointed: boolean;
  packed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'LZ77 replaces a repeat with a pointer: go back this far, copy this many. The strip holds two scanner names.',
    act: 'Predict how many pointers.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'point',
    focus: 'point',
    visibleControls: ['p1', 'point'],
    narration: 'Your pick is locked. Every byte not covered by a pointer stays a literal, written out as it is.',
    act: 'Replace the repeats.',
    predicate: s => s.pointed,
  },
  {
    id: 'pack',
    focus: 'pack',
    visibleControls: ['out1', 'pack'],
    narration: `${STRIP.arcs.length} pointers stand in for ${COPIED} bytes. Each arc runs back to the copy it repeats.`,
    act: 'Pack the whole price list with pointers.',
    predicate: s => s.packed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: `${bytes(PRICE.bytes.length)} became ${bytes(LZ_SIZE)}. Unpacking follows each pointer and copies the bytes back, so nothing is lost.`,
    act: 'One question to finish.',
    say: { block: 'parcel', text: 'Smaller parcel' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does an earlier copy exist to point back to?',
  },
];

export default function PointBack() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ view: 'detail', p1: null, pointed: false, packed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <CompressionStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            table: {
              piles: [],
              parcel: { raw: PRICE.bytes.length, packed: state.packed ? LZ_SIZE : PRICE.bytes.length },
            },
            detail: { name: 'Pointers', view: <StripView text={SCANNERS} pointers={state.pointed} /> },
            caption: state.packed
              ? `The price list with pointers: ${bytes(LZ_SIZE)} of ${bytes(PRICE.bytes.length)}.`
              : state.pointed
                ? `${STRIP.arcs.length} pointers, ${STRIP.tokens - STRIP.arcs.length} literals.`
                : 'Two scanner names from the price list.',
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        point: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, pointed: true, view: 'detail' })}>
            Replace the repeats
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        pack: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, packed: true, view: 'scene' })}>
            Pack the price list
          </button>
        ),
        fact: () => <Fact id="lz77" />,
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
