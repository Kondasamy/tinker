// Chapter 5: a fingerprint, hashes. SHA-256 (computed here, src/lib/encryption/sha256.ts) turns the invoice into 64 hex
// characters; the reader predicts what one changed digit does, changes it, and counts the bits that flipped. Git's
// crates are named the same way (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PAINT_PARTS, type PaintOpts } from '../../components/scenes/paintScene';
import { bitsDiffer, hashText } from '../../lib/encryption/sha256';
import { EDITED, INVOICE } from '../../lib/encryption/story';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EncryptionStage, Fact, Hex } from './kit';

const MODULE = 'encryption',
  ID = '05-a-fingerprint';
export const PARTS = PAINT_PARTS;
const GIT1 = moduleOf('git').chapters[0];
export const BEFORE = hashText(INVOICE),
  AFTER = hashText(EDITED);
/** how many of the 256 bits one changed digit flips */
export const FLIPPED = bitsDiffer(BEFORE, AFTER);

export const P1 = {
  question: 'Change one digit of the invoice. How much of its SHA-256 fingerprint changes?',
  options: ['About half of its 256 bits', 'One character of it', 'Nothing: the change is too small'],
};
export const outcomeOf = () => (FLIPPED > 64 ? 0 : FLIPPED > 0 ? 1 : 2);

export const QUIZ = {
  question:
    'Larkspur keeps the hash of each signed contract. A year on, how can it tell whether a stored copy changed?',
  options: [
    'Hash the copy again and compare',
    'Run the hash backwards into the text',
    'Check the file is the same size',
  ],
  correct: 0,
  explanation: 'The same text always gives the same hash, and any change gives a different one.',
  why: [
    'Right: if the new hash matches the kept one, not one byte has changed.',
    'A hash only runs one way; there is no going back from it to the text.',
    'Swapping one digit for another keeps the size and still changes the text.',
  ],
};

interface S {
  edited: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['hash', 'p1'],
    narration: 'A hash is a fingerprint: SHA-256 turns the whole invoice into 64 hex characters. Signatures sign it.',
    act: 'Predict what one changed digit does.',
    say: { block: 'counter', text: 'Fingerprint' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'edit',
    focus: 'edit',
    visibleControls: ['p1', 'edit'],
    narration: 'Your pick is locked. Same length, one digit different.',
    act: 'Change one digit of the amount.',
    say: { block: 'us', text: 'One digit' },
    predicate: s => s.edited,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'hash', 'git', 'fact', 'quiz'],
    narration: `${FLIPPED} of 256 bits flipped: nothing of the old fingerprint survives. Git names every crate by such a hash.`,
    act: 'One question to finish.',
    say: { block: 'counter', text: `${FLIPPED} bits flipped` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the same text always give the same hash?',
  },
];

export function sceneOf(s: Pick<S, 'edited'>): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const card = (label: string, lit = false) => ({
    kind: 'card' as const,
    label: `HASH ${label.slice(0, 8)}`,
    short: label.slice(0, 6),
    lit,
    fresh: lit,
  });
  return {
    us: [{ kind: 'card', label: s.edited ? 'EDITED INVOICE' : 'INVOICE', short: s.edited ? 'EDITED' : 'INVOICE' }],
    counter: s.edited ? [card(BEFORE), card(AFTER, true)] : [card(BEFORE, true)],
    them: [],
  };
}

export default function AFingerprint() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ edited: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <EncryptionStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.edited
              ? `One digit changed; ${FLIPPED} of 256 bits flipped.`
              : 'The invoice and its SHA-256 fingerprint.',
          }}
        />
      )}
      controls={{
        hash: ({ state }) => (
          <>
            <Hex label={`SHA-256 of “${INVOICE}”`} value={BEFORE} />
            {state.edited && <Hex label={`SHA-256 of “${EDITED}”`} value={AFTER} />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        edit: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, edited: true })}>
            Change one digit
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        git: () => (
          <p className="tc-fact">
            The same idea names Git’s crates: <a href={chapterHref('git', GIT1.id)}>Git chapter 1, {GIT1.title}</a>
          </p>
        ),
        fact: () => <Fact id="sha256" />,
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
