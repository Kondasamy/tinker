// Chapter 3: short codes for common letters (Huffman). The puzzle's words from the price list lie on the table, one pile
// per letter; the reader merges the two lightest piles until one is left (KTD15: the piles as a listbox, any two of the
// lowest weights accepted, a wrong pick told why), then reads each letter's code off the tree. One line names Tokens'
// BPE, a vocabulary built from merges too (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PUZZLE } from '../../lib/compression/files';
import { codesOf, costOf, countOf, treeOf, type Node } from '../../lib/compression/huffman';
import { PILE_PARTS } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, MergeBench, TreeView, enc, finish, forestOf, forestTable, type View } from './kit';

const MODULE = 'compression',
  ID = '03-short-codes';
export const PARTS = PILE_PARTS;
export const START = forestOf(PUZZLE);
/** the best total: the engine's own tree, in bits */
export const BEST_BITS = costOf(treeOf(countOf(enc(PUZZLE))));
const FIXED_BITS = enc(PUZZLE).length * 8;
const COMMON = [...countOf(enc(PUZZLE))].sort((a, b) => b[1] - a[1])[0][0];
const letter = (b: number) => (b === 32 ? 'the space' : String.fromCharCode(b));

export const P1 = {
  question: `Which letter of “${PUZZLE}” will get the shortest code?`,
  options: [
    `${letter(COMMON)}, the most common`,
    `${letter(enc(PUZZLE)[1])}, a letter used once`,
    'They all get the same length',
  ],
};
/** the most common letter's code is the shortest of all */
export const outcomeOf = () => {
  const codes = codesOf(treeOf(countOf(enc(PUZZLE))));
  const len = (b: number) => codes.get(b)!.length;
  return [...codes.keys()].every(b => b === COMMON || len(b) > len(COMMON)) ? 0 : 2;
};

export const QUIZ = {
  question: 'A shop’s orders mostly say “A1” and rarely “Z9”. Under Huffman’s rule, which gets the shorter code?',
  options: ['A1, the common one', 'Z9, so rare orders stand out', 'Both the same length, to be fair'],
  correct: 0,
  explanation: 'Common symbols are merged last, so they sit near the top of the tree with short codes.',
  why: [
    'Right: the common one is merged last, near the top, so its code is short.',
    'A rare symbol is merged early and ends up deep in the tree, with a long code.',
    'Equal lengths waste bits: the common symbol would pay as much as the rare one.',
  ],
};

interface S {
  view: View;
  forest: Node[];
  merges: number;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `“${PUZZLE}” lies on the table, a pile per letter. A Huffman code gives common letters short codes.`,
    act: 'Predict which letter gets the shortest code.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'merge',
    focus: 'bench',
    visibleControls: ['p1', 'bench'],
    narration: 'Your pick is locked. Each merge adds a bit to every letter inside it.',
    act: 'Merge the two lightest piles until one is left.',
    say: { block: 'tray', text: 'Newest merge' },
    // the reader's tree is checked by its total length: any lightest-first merges reach the engine's
    predicate: s => s.forest.length === 1 && costOf(s.forest[0]) === BEST_BITS,
    hint: 'Pick the two piles with the smallest weights; when weights tie, either one will do.',
    solution: s => ({ ...s, forest: finish(s.forest), merges: s.merges + 1 }),
  },
  {
    id: 'tree',
    focus: 'tree',
    visibleControls: ['out1', 'tree'],
    narration: `${BEST_BITS} bits instead of ${FIXED_BITS}. The code tree reads each code off its path: 0 left, 1 right.`,
    act: 'Open the Code tree tab.',
    predicate: s => s.view === 'detail',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'No code starts another, so codes need no gaps. Tokens builds its vocabulary from merges too.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which symbol would you rather spend fewer bits on?',
  },
];

export default function ShortCodes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ view: 'scene', forest: START, merges: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const done = state.forest.length === 1;
        return (
          <CompressionStage
            say={say}
            view={done ? state.view : 'scene'}
            onView={view => sync({ ...state, view })}
            show={{
              table: forestTable(state.forest, state.merges > 0),
              detail: done ? { name: 'Code tree', view: <TreeView root={state.forest[0]} /> } : undefined,
              caption: done
                ? `One tree: ${costOf(state.forest[0])} bits for “${PUZZLE}”, against ${FIXED_BITS} at eight bits a letter.`
                : `${state.forest.length} piles left to merge.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        bench: ({ state, apply }) => (
          <MergeBench
            forest={state.forest}
            onMerge={forest => apply({ ...state, forest, merges: state.merges + 1 })}
            onMiss={() => apply({ ...state })}
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tree: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, view: 'detail' })}>
            Open the Code tree tab
          </button>
        ),
        fact: () => (
          <>
            <Fact id="huffman" />
            <Fact id="bpe" />
            <p className="note">
              <a href="/tokens/">Tokens</a> shows how such a vocabulary is built.
            </p>
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
