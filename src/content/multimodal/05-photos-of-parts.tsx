// Chapter 5: photos of parts. A customer sends a photo of a broken bracket. The reader predicts what the assistant should
// say when one angle can't settle it (the pick locks), reads the front photo (the recorded reading names both parts and
// asks for another angle), then the side photo, which names the part; graded live against the reference.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { grade, reading } from '../../lib/multimodal/readings';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { MultimodalStage, ReadingCard, RecordedNote } from './kit';

const MODULE = 'multimodal',
  ID = '05-photos-of-parts';
const SIZE = 1600;

interface S {
  p1: number | null;
  front: boolean;
  side: boolean;
  quiz: number | null;
}

const P1 = {
  question:
    'Two brackets in Larkspur’s catalogue look the same from the front; only the far side of the upright arm tells them apart. If the photo doesn’t show it, what should the assistant reply?',
  options: [
    'Name the more common one',
    'Say it could be either, and ask for a photo from the other side',
    'Say it can’t identify parts from photos',
  ],
};
/** What the recorded front reading did: named no part (it asked), or named one. */
export const outcome = () => (reading('part-front', SIZE, 'vision').fields.part === null ? 1 : 0);

const QUIZ = {
  question:
    'A customer photographs a lamp. Larkspur sells two models that differ only in the switch on the cord, which is out of shot. What should the assistant reply?',
  options: [
    'Ask for a photo that shows the switch on the cord',
    'Name the cheaper model',
    'Ask for the same photo at a higher resolution',
  ],
  correct: 0,
  explanation: 'The deciding detail isn’t in the photo; only a new angle can show it.',
  why: [
    'Right. Say what would settle it, and the next photo settles it.',
    'A guess sends the wrong lamp about half the time.',
    'More pixels of the same view still don’t show the switch.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'A customer’s shelf bracket snapped. They don’t know its part number, the catalogue’s code for one exact part, so they send a photo. Before the assistant reads it:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'front',
    focus: 'front',
    visibleControls: ['p1', 'front'],
    narration: 'Read the customer’s photo with vision.',
    predicate: s => s.front,
  },
  {
    id: 'side',
    focus: 'side',
    visibleControls: ['frontReading', 'side'],
    narration:
      'The photo is ambiguous: it fits more than one part. The reading says so and asks for another angle, instead of guessing. The customer turns the bracket round and sends a second photo.',
    predicate: s => s.side,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['sideReading', 'quiz'],
    narration:
      'From the other side the third hole shows, and the part is certain. A sharper photo of the first side would not have helped: the detail that decided it was out of sight, not too small.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Would more pixels of the same view show the switch?',
  },
];

export default function PhotosOfParts() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, front: false, side: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => {
        const im = state.side ? 'part-side' : 'part-front',
          read = state.side || state.front,
          g = read ? grade(im, SIZE, 'vision') : null;
        return (
          <MultimodalStage
            shown={{
              image: im,
              size: SIZE,
              method: read ? 'vision' : null,
              caption: !g
                ? 'The customer’s photo of the broken bracket.'
                : g.right
                  ? `The part: ${g.fields[0].value}.`
                  : 'Two parts fit: the reading asks for another angle.',
              stamp: g ? (g.right ? 'PASS' : 'WAITING') : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        front: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, front: true })}>
            Read the photo
          </button>
        ),
        frontReading: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <ReadingCard image="part-front" size={SIZE} method="vision" />
          </>
        ),
        side: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, side: true })}>
            Read the second photo
          </button>
        ),
        sideReading: () => (
          <>
            <ReadingCard image="part-side" size={SIZE} method="vision" />
            <RecordedNote />
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
