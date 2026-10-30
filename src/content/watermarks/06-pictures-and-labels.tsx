// Chapter 6: pictures and labels. Larkspur's toy catalogue picture leaves with a toy pixel mark (pixels.ts) and a
// C2PA-shaped label (label.ts), signed once in a test with Locks and keys' demo key and verified here. The reader sends
// it on each trip in TRIPS; under the print sits the precise view: the pixel checker's z and the label's verdict, both
// computed live (the label's check is async ECDSA).
import { useEffect, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { detect } from '../../lib/watermarks/pixels';
import { checkLabel, LABEL, travel, TRIPS, type LabelCheck, type Trip } from '../../lib/watermarks/label';
import { MARKED_PICTURE, PICTURE_INFO } from '../../lib/watermarks/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, PIN, signed, UvStage } from './kit';

const MODULE = 'watermarks',
  ID = '06-pictures-and-labels';
export const PARTS = UV_PARTS;
const NAMES: Record<Trip, string> = {
  'as sent': 'As sent',
  'one pixel': 'One pixel',
  screenshot: 'Screenshot',
  crop: 'Crop',
  blur: 'Blur',
};
const tripZ = (t: Trip) => PIN.pixels.trips[t].z;
/** The picture and its label after a trip, and what the pixel checker finds. */
export function arrived(trip: Trip) {
  const { pic, label } = travel(MARKED_PICTURE, LABEL, trip);
  return { pic, label, mark: detect(pic, PICTURE_INFO.seed) };
}

export interface S {
  trip: Trip;
  tried: Trip[];
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'After a screenshot, what can a checker still find?',
  options: ['The pixel mark only', 'The label only', 'Both', 'Neither'],
};
/** A screenshot keeps the pixels and drops the label (asserted in the chapters test). */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A news desk wants to know which photos a model made. Why check for both a mark and a label?',
  options: [
    'Each survives trips the other doesn’t',
    'The label holds the secret number the mark needs',
    'A mark alone proves who made the photo',
  ],
  correct: 0,
  explanation:
    'A screenshot drops the label but keeps the mark; a crop or blur fades the mark while the signed label still travels with the file.',
  why: [
    'Right: screenshots strip labels, crops and blurs fade marks, so two checks catch more.',
    'That number stays with the checker; the label carries a signed claim and the file’s hash.',
    'A mark says only that one maker’s pattern is there; the signed label names the maker and the file.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'This catalogue picture left with a pixel mark, toy-sized here, and a signed label. Then someone takes a screenshot.',
    act: 'Predict first.',
    say: { block: 'print', text: 'Hidden mark' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'screenshot',
    focus: 'trip',
    visibleControls: ['trip'],
    narration: 'Your pick is locked. A screenshot copies the pixels into a brand new file.',
    act: 'Choose Screenshot.',
    predicate: s => s.trip === 'screenshot',
  },
  {
    id: 'pixel',
    focus: 'trip',
    visibleControls: ['out1', 'trip'],
    narration: 'The pixels kept the mark; the label stayed behind with the old file. Now change a single pixel.',
    act: 'Choose One pixel.',
    say: { block: 'print', text: 'No label' },
    predicate: s => s.trip === 'one pixel',
  },
  {
    id: 'crop',
    focus: 'trip',
    visibleControls: ['trip'],
    narration: 'One grey level on one pixel: the mark holds, but the label’s hash no longer matches the picture.',
    act: 'Try Crop, then Blur.',
    say: { block: 'label', text: 'Hash differs' },
    predicate: s => s.tried.includes('crop') && s.tried.includes('blur'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['trip', 'facts', 'quiz'],
    narration: `A crop shifts the picture off the pattern (z ${signed(tripZ('crop'))}); a blur smooths it away (z ${signed(tripZ('blur'))}).`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which check did the screenshot beat, and which did the crop beat?',
  },
];

function Trips({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <fieldset className="wm-radios">
      <legend>The picture’s trip</legend>
      {TRIPS.map(t => (
        <label key={t}>
          <input
            type="radio"
            name="wm-trip"
            checked={s.trip === t}
            onChange={() => set({ ...s, trip: t, tried: s.tried.includes(t) ? s.tried : [...s.tried, t] })}
          />
          {NAMES[t]}
        </label>
      ))}
    </fieldset>
  );
}

/** The precise view: the pixel checker's score and the label's verdict for the picture as it arrived. */
function Findings({ trip }: { trip: Trip }) {
  const { mark } = arrived(trip);
  const [lab, setLab] = useState<LabelCheck | null>(null);
  useEffect(() => {
    let live = true;
    const { pic, label } = arrived(trip);
    setLab(null);
    checkLabel(pic, label).then(c => live && setLab(c));
    return () => {
      live = false;
    };
  }, [trip]);
  return (
    <dl className="wm-findings" data-trip={trip} data-label={lab?.verdict ?? 'checking'}>
      <div>
        <dt>Pixel mark (toy)</dt>
        <dd>{`z ${signed(mark.z)}, ${mark.verdict}`}</dd>
      </div>
      <div>
        <dt>Label</dt>
        <dd>{lab ? lab.verdict : 'checking…'}</dd>
      </div>
    </dl>
  );
}

export default function PicturesAndLabels() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ trip: 'as sent', tried: ['as sent'], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const { pic, label, mark } = arrived(state.trip);
        return (
          <UvStage
            say={say}
            lamp="all"
            print={{ pic, label: !!label, found: mark.verdict === 'marked' }}
            caption={`${PICTURE_INFO.title}, ${NAMES[state.trip].toLowerCase()}: a toy ${pic.w} × ${pic.h} grey picture.`}
          >
            <Findings trip={state.trip} />
          </UvStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        trip: ({ state, apply, sync, focused }) => <Trips s={state} set={focused ? apply : sync} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <p className="note">
              {
                'The label is C2PA-shaped and was signed once, in a test, with Locks and keys’ demo key; this page only checks it. '
              }
              <a href="/encryption/04-sealed-with-your-key/">
                How a signature is checked is Locks and keys’ chapter 4.
              </a>
            </p>
            <Fact id="c2pa" />
            <Fact id="c2pa-stripped" />
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
