// Chapter 1: named by its contents. The price page sits in an editor under the yard; the reader predicts what one new
// price does to its crate's name, edits the drill press price and watches the crate re-stamped with the page's real
// blob id, then puts the page back and sees the original name return.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { blobId } from '../../lib/git/objects';
import { DRILL, EDITED, SAVED } from '../../lib/git/story';
import { PACKING_PARTS } from '../../components/scenes/crateScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Commands, Editor, Fact, GitStage, packingOf } from './kit';

const MODULE = 'git',
  ID = '01-named-by-contents';
export const PARTS = PACKING_PARTS;
export { EDITED, SAVED };

export const P1 = {
  question: 'You change one price on the page. What happens to its crate’s name?',
  options: [
    'A whole new name',
    'The same name with a character or two changed',
    'The same name: it is still the same file',
  ],
};
/** how many of the 40 characters change for one changed price: most of them */
export const changedChars = (a: string, b: string) => [...blobId(a)].filter((c, i) => c !== blobId(b)[i]).length;
export const outcomeOf = () => {
  const n = changedChars(SAVED, EDITED);
  return n > 20 ? 0 : n > 0 ? 1 : 2;
};

export const QUIZ = {
  question:
    'Two colleagues each save an identical copy of the shop’s logo, in two different folders. How many blobs does Git store for it?',
  options: ['One: same bytes, same name', 'Two: one per folder', 'None until a branch is made'],
  correct: 0,
  explanation: 'A blob is named by its bytes alone, so identical bytes are one blob, stored once.',
  why: [
    'Right: both copies hash to the same name, so Git keeps one blob and points to it twice.',
    'Folders and file names live in the tree, not in the blob; the bytes are the same.',
    'Saving the files is what makes blobs; branches have nothing to do with it.',
  ],
};

interface S {
  text: string;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Git seals each version of the page in a crate, a blob, named by a hash of its bytes.',
    act: 'Predict what one new price does.',
    say: { block: 'saved', text: 'Named by bytes' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'edit',
    focus: 'editor',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. The editor under the picture holds the page.',
    act: 'Change the drill press price in the editor.',
    say: { block: 'blob', text: 'Watch this one' },
    predicate: s => s.p1 !== null && s.text !== SAVED,
    hint: `Click into the page under the picture and change ${DRILL} to another price.`,
  },
  {
    id: 'undo',
    focus: 'editor',
    visibleControls: ['out1', 'fact'],
    narration: 'One new price, a whole new name: the hash mixes every byte together.',
    act: 'Put the page back exactly as it was.',
    say: { block: 'blob', text: 'New name' },
    predicate: s => s.text === SAVED,
    hint: `Change the price back to ${DRILL}, with nothing else changed.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Same bytes, same name, on any computer. That is how Git knows a file it already has.',
    act: 'One question to finish.',
    say: { block: 'blob', text: 'Same name again' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is anything different about the two copies’ bytes?',
  },
];

export default function NamedByContents() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ text: SAVED, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <GitStage
          say={say}
          show={{
            yard: { crates: [], flags: [], packing: packingOf(SAVED, state.text) },
            caption: state.text === SAVED ? 'The page as saved.' : 'Your edit, re-stamped as you type.',
          }}
          editor={
            <Editor
              text={state.text}
              saved={SAVED}
              locked={state.p1 === null}
              onText={text => sync({ ...state, text })}
            />
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => (
          <>
            <Fact id="header" />
            <Fact id="abbrev" />
            <Commands lines={['git hash-object prices.txt']} />
            <p className="note in-note">
              How a hash fingerprints any text: <a href="/encryption/">Locks and keys</a>.
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
