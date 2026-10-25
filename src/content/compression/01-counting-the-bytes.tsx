// Chapter 1: counting the bytes. The reader predicts how common the price list's commonest byte is, sorts its bytes
// into piles on the table (its seven commonest and "others"), then sorts the picture's and sees flatter piles.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { fileOf } from '../../lib/compression/files';
import { PICTURE_TOP, PRICE_TOP } from '../../lib/compression/story';
import { PILE_PARTS, pileAt } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, FilesNote, bytes } from './kit';

const MODULE = 'compression',
  ID = '01-counting-the-bytes';
export const PARTS = PILE_PARTS;
type Shown = 'price' | 'picture';
const FILES: Shown[] = ['price', 'picture'];

export const P1 = {
  question: 'In the price list, how common is the commonest byte?',
  options: ['Many times more common than the average byte', 'About as common as any other', 'It appears only once'],
};
/** the commonest byte against the average: many times, or about the same */
export const outcomeOf = () => (PRICE_TOP.ratio > 3 ? 0 : PRICE_TOP.ratio > 1.5 ? 1 : 2);

export const QUIZ = {
  question: 'A warehouse note is written in plain English. Which byte would you expect in its tallest pile?',
  options: ['The space between words', 'The letter z', 'All bytes tie in plain text'],
  correct: 0,
  explanation: 'Plain English spends a space between every pair of words, more than any one letter.',
  why: [
    'Right: every word ends in a space, so it outnumbers any single letter.',
    'z is one of the rarest letters in English, so its pile is among the shortest.',
    'Letters in a language are far from even; that unevenness is what compression uses.',
  ],
};

interface S {
  file: Shown;
  sorted: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Each letter of the price list is one byte: eight bits, a number from 0 to 255.',
    act: 'Predict how common the commonest byte is.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sort',
    focus: 'sort',
    visibleControls: ['p1', 'sort'],
    narration: 'Your pick is locked. Each pile will hold one byte value, as tall as that byte is common.',
    act: 'Sort the price list into piles.',
    say: { block: 'parcel', text: 'The whole file' },
    predicate: s => s.sorted,
  },
  {
    id: 'picture',
    focus: 'file',
    visibleControls: ['out1', 'fact', 'file'],
    narration: `The tallest pile is ${PRICE_TOP.word}: ${PRICE_TOP.n} times. A few common bytes fill much of a text.`,
    act: 'Now sort the scanner picture.',
    say: { block: 'piles', text: 'The commonest' },
    predicate: s => s.file === 'picture',
    hint: 'Pick the picture in the list of files.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['file', 'quiz'],
    narration: 'The picture’s bytes are shades, spread over many values: flatter piles, and less to squeeze.',
    act: 'One question to finish.',
    say: { block: 'piles', text: 'Flatter piles' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which mark sits between every two words?',
  },
];

export default function CountingTheBytes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ file: 'price', sorted: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const f = fileOf(state.file);
        const table = state.sorted
          ? pileAt(f.bytes)
          : { piles: [], parcel: { raw: f.bytes.length, packed: f.bytes.length } };
        return (
          <CompressionStage
            say={say}
            show={{
              table,
              caption: state.sorted
                ? `${f.title}: ${bytes(f.bytes.length)}, sorted by value.`
                : `${f.title}: ${bytes(f.bytes.length)}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sort: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, sorted: true })}>
            Sort into piles
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => <Fact id="utf8" />,
        file: ({ state, apply }) => (
          <fieldset className="cz-field">
            <legend>File on the table</legend>
            {FILES.map(id => (
              <label key={id}>
                <input
                  type="radio"
                  name="cz-file"
                  checked={state.file === id}
                  onChange={() => apply({ ...state, file: id, sorted: true })}
                />{' '}
                {fileOf(id).title}
              </label>
            ))}
            {state.file === 'picture' && (
              <>
                <p className="note">{`Its commonest byte, ${PICTURE_TOP.word}, appears ${PICTURE_TOP.n} times.`}</p>
                <FilesNote />
              </>
            )}
          </fieldset>
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
