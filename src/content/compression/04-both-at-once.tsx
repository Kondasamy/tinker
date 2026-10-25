// Chapter 4: both at once (the DEFLATE shape). The reader predicts which of four ways packs the price list smallest,
// tries each and watches the parcel, then measures real gzip on the same bytes in their own browser (KTD6).
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { fileOf } from '../../lib/compression/files';
import { CODERS, CODER_IDS, sizeOf, type CoderId } from '../../lib/compression/coders';
import { PILE_PARTS, pilesOf } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, GzipLine, bytes } from './kit';

const MODULE = 'compression',
  ID = '04-both-at-once';
export const PARTS = PILE_PARTS;
const PRICE = fileOf('price');
export const SIZE = Object.fromEntries(CODER_IDS.map(c => [c, sizeOf(c, PRICE.bytes, PRICE.id)])) as Record<
  CoderId,
  number
>;

export const P1 = {
  question: 'Which way packs the price list smallest?',
  options: CODER_IDS.map(c => CODERS[c].name),
};
/** the smallest of the four */
export const outcomeOf = () => CODER_IDS.indexOf([...CODER_IDS].sort((a, b) => SIZE[a] - SIZE[b])[0]);

export const QUIZ = {
  question: 'Real gzip packed the same price list a little smaller than our pair. Why?',
  options: [
    'It searches harder for repeats and stores its tables more tightly',
    'It drops bytes nobody reads, like spaces',
    'It ships a dictionary of English words in advance',
  ],
  correct: 0,
  explanation: 'gzip runs the same two steps; it finds better matches and writes its code tables more compactly.',
  why: [
    'Right: same pointers-then-codes shape, with a smarter search and a tighter table.',
    'gzip is lossless: every byte, spaces included, comes back exactly.',
    'DEFLATE starts each file from nothing; it learns only from the file itself.',
  ],
};

interface S {
  coder: CoderId;
  tried: CoderId[];
  p1: number | null;
  gz: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'DEFLATE runs both steps: pointers first, then short codes for what is left. Four ways are ready.',
    act: 'Predict which packs the price list smallest.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'try',
    focus: 'coder',
    visibleControls: ['p1', 'coder'],
    narration: 'Your pick is locked. The parcel shows each way’s size against the raw file.',
    act: 'Try all four ways.',
    say: { block: 'parcel', text: 'Packed size' },
    predicate: s => CODER_IDS.every(c => s.tried.includes(c)),
    hint: 'Pick each way in the list once.',
  },
  {
    id: 'gzip',
    focus: 'measure',
    visibleControls: ['out1', 'coder', 'measure'],
    narration: 'Both together win. Real gzip is DEFLATE inside a small header, and your browser can run it.',
    act: 'Measure real gzip on the same file.',
    predicate: s => s.gz !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['measure', 'fact', 'quiz'],
    narration: 'Close to ours: the same idea, with a smarter search for repeats and tighter tables.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does gzip lose anything, or just pack better?',
  },
];

export default function BothAtOnce() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ coder: 'store', tried: ['store'], p1: null, gz: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CompressionStage
          say={say}
          show={{
            table: { piles: pilesOf(PRICE.bytes), parcel: { raw: PRICE.bytes.length, packed: SIZE[state.coder] } },
            caption: `${CODERS[state.coder].name}: ${bytes(SIZE[state.coder])} of ${bytes(PRICE.bytes.length)}${state.gz && state.gz > 0 ? `; real gzip ${bytes(state.gz)}` : ''}.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        coder: ({ state, apply, sync, focused }) => (
          <fieldset className="cz-field">
            <legend>Way to pack</legend>
            {CODER_IDS.map(c => (
              <label key={c}>
                <input
                  type="radio"
                  name="cz-coder"
                  checked={state.coder === c}
                  onChange={() =>
                    (focused ? apply : sync)({
                      ...state,
                      coder: c,
                      tried: state.tried.includes(c) ? state.tried : [...state.tried, c],
                    })
                  }
                />{' '}
                {`${CODERS[c].name} · ${bytes(SIZE[c])}`}
              </label>
            ))}
          </fieldset>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        measure: ({ state, sync }) =>
          state.gz === null ? <MeasureGzip onSize={gz => sync({ ...state, gz })} /> : <MeasureGzip />,
        fact: () => (
          <>
            <Fact id="deflate" />
            <Fact id="gzip" />
            <Fact id="streams" />
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

/** Real gzip, once asked for: a button, then the line that measures and reports the size. */
function MeasureGzip({ onSize }: { onSize?: (n: number) => void }) {
  const [on, setOn] = useState(!onSize);
  return on ? (
    <GzipLine data={PRICE.bytes} onSize={onSize} />
  ) : (
    <button type="button" className="big" onClick={() => setOn(true)}>
      Measure real gzip
    </button>
  );
}
