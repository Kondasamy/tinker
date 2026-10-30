// Chapter 5: already squeezed (the pigeonhole). The reader predicts what packing the random file does, packs it and
// sees the parcel rise out of its crate, packs the already packed price list again and sees no gain, then meets the
// pigeonhole. Entropy, computed live, sits in a fold-away (KTD6).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { FILES, fileOf } from '../../lib/compression/files';
import { CODERS, sizeOf } from '../../lib/compression/coders';
import { entropyOf } from '../../lib/compression/huffman';
import { PILE_PARTS, pileAt } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, FilesNote, bytes } from './kit';

const MODULE = 'compression',
  ID = '05-already-squeezed';
export const PARTS = PILE_PARTS;
const RANDOM = fileOf('random'),
  PRICE = fileOf('price');
export const RANDOM_PACKED = sizeOf('pair', RANDOM.bytes, RANDOM.id);
/** the price list packed once by the pair: the "already squeezed" file */
export const ONCE = CODERS.pair.encode(PRICE.bytes);
export const TWICE = CODERS.pair.encode(ONCE).length;

export const P1 = {
  question: `What will packing the ${RANDOM.title.toLowerCase()} do to its size?`,
  options: ['It shrinks a little', 'It stays the same or grows', 'It shrinks by about half'],
};
export const outcomeOf = () =>
  RANDOM_PACKED >= RANDOM.bytes.length ? 1 : RANDOM_PACKED > RANDOM.bytes.length / 2 ? 0 : 2;

export const QUIZ = {
  question: 'A vendor promises a tool that shrinks any file by 10%, every time. What do you say?',
  options: [
    'Impossible: run it again and again and every file would vanish',
    'Plausible, with a big enough model behind it',
    'Fine for text, so fine for every file',
  ],
  correct: 0,
  explanation: 'There are fewer short files than long ones, so no lossless tool can shrink them all.',
  why: [
    'Right: shrinking every file, again and again, would squeeze all of them down to nothing.',
    'No model gets round counting: there are not enough shorter files to go round.',
    'Text shrinks because it repeats; random or packed bytes don’t, so “any file” fails.',
  ],
};

type Pack = 'none' | 'random' | 'twice';
interface S {
  packed: Pack;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The ${RANDOM.title.toLowerCase()} are ${bytes(RANDOM.bytes.length)} of noise. Their piles stand nearly level.`,
    act: 'Predict what packing does to them.',
    say: { block: 'piles', text: 'Nearly level' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'pack',
    focus: 'pack',
    visibleControls: ['p1', 'pack'],
    narration: 'Your pick is locked. The pair will look for repeats and common bytes.',
    act: 'Pack the random file.',
    predicate: s => s.packed === 'random',
  },
  {
    id: 'twice',
    focus: 'twice',
    visibleControls: ['out1', 'twice', 'worst'],
    narration: `${bytes(RANDOM_PACKED)}: no repeats to point at, no common bytes, and the code tables cost extra.`,
    act: 'Now pack the already packed price list again.',
    say: { block: 'parcel', text: 'Grew' },
    predicate: s => s.packed === 'twice',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration:
      'The pigeonhole: fewer short files exist than long ones, so no method shrinks every file. Entropy measures the room left.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens if you run such a tool on its own output, over and over?',
  },
];

export default function AlreadySqueezed() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ packed: 'none', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const twice = state.packed === 'twice';
        const table = twice
          ? pileAt(ONCE, TWICE)
          : pileAt(RANDOM.bytes, state.packed === 'random' ? RANDOM_PACKED : RANDOM.bytes.length);
        return (
          <CompressionStage
            say={say}
            show={{
              table,
              caption: twice
                ? `The packed price list, ${bytes(ONCE.length)}, packed again: ${bytes(TWICE)}.`
                : `${RANDOM.title}: ${bytes(RANDOM.bytes.length)}${state.packed === 'random' ? `, packed to ${bytes(RANDOM_PACKED)}` : ''}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        pack: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, packed: 'random' })}>
            Pack the random file
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        twice: ({ state, apply }) => (
          <>
            <FilesNote />
            <button type="button" className="big" onClick={() => apply({ ...state, packed: 'twice' })}>
              Pack the packed price list
            </button>
          </>
        ),
        worst: () => (
          <>
            <Fact id="deflate-worst" />
            <p className="note">
              Real DEFLATE can send a block as it is; our pair can’t, so the random file grew more.
            </p>
          </>
        ),
        fact: () => (
          <>
            <Fact id="no-universal" />
            <details className="cz-entropy">
              <summary>Entropy of each file, in bits per byte</summary>
              <ul>
                {[...FILES.map(f => [f.title, f.bytes] as const), ['The packed price list', ONCE] as const].map(
                  ([name, b]) => (
                    <li key={name}>{`${name}: ${entropyOf(b).toFixed(2)} of 8`}</li>
                  ),
                )}
              </ul>
              <Fact id="shannon" />
            </details>
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
