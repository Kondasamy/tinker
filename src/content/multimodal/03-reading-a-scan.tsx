// Chapter 3: reading a scan. The reader predicts which method keeps the packing slip's table straight, then reads the slip
// and the handwritten note with OCR and with vision (all four readings, recorded, graded live). OCRBench is cited for
// handwriting staying a weak spot even for vision models.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { METHODS, METHOD_NAME, grade, type Method } from '../../lib/multimodal/readings';
import { image } from '../../lib/multimodal/images';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MultimodalStage, ReadingCard, RecordedNote } from './kit';

const MODULE = 'multimodal',
  ID = '03-reading-a-scan';
const DOCS = ['slip', 'note'] as const;
type Doc = (typeof DOCS)[number];
const SIZE = 1600,
  ALL = DOCS.flatMap(d => METHODS.map(m => `${d}|${m}`));

interface S {
  p1: number | null;
  doc: Doc;
  method: Method | null;
  seen: string[];
  quiz: number | null;
}

const P1 = {
  question:
    'The packing slip is a table: SKU, item, ordered, shipped. Which reading keeps each quantity with its own line?',
  options: [
    'OCR: it copies every character exactly',
    'Vision: the model sees the rows and columns',
    'Both the same: the numbers are the numbers',
  ],
};
export const outcome = () => (grade('slip', SIZE, 'vision').right > grade('slip', SIZE, 'ocr').right ? 1 : 0);

const QUIZ = {
  question: 'A delivery form is a printed table with handwritten quantities. How should Larkspur read it?',
  options: [
    'Vision, with a person checking the handwritten numbers',
    'OCR: it is mostly printed text',
    'Neither can read forms',
  ],
  correct: 0,
  explanation:
    'The table needs its layout and the quantities are handwriting: vision handles both better, and handwriting still deserves a check.',
  why: [
    'Right. Vision keeps the rows together and reads handwriting better than OCR; handwriting is still a known weak spot, so a person checks the numbers.',
    'OCR flattens the table and turns handwriting into near-words: the two things this form depends on.',
    'Vision read the slip’s table and the note in this chapter.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'There are two ways to read a scan. OCR (optical character recognition) turns the image into plain text, and the model reads only the text. Vision sends the image itself, and the model reads its patches. Before you try both:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'read',
    focus: 'read',
    visibleControls: ['p1', 'read'],
    narration: `Read both documents both ways, at ${SIZE.toLocaleString('en-US')} px: the packing slip and the handwritten note, with OCR and with vision. Each reading is graded field by field.`,
    predicate: s => ALL.every(k => s.seen.includes(k)),
    hint: 'Pick a document, then press both read buttons; then the other document.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['found', 'quiz'],
    narration:
      'OCR got the slip’s words right but lost its layout: it read the table column by column, and the extraction paired the brackets with the wrong column. On the note it turned handwriting into near-words. Vision kept the rows together and read the note, though handwriting stays a weak spot for vision models too.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which method kept the table’s rows, and which one copes better with handwriting?',
  },
];

export default function ReadingAScan() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, doc: 'slip', method: null, seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => {
        const g = state.method && grade(state.doc, SIZE, state.method);
        return (
          <MultimodalStage
            shown={{
              image: state.doc,
              size: SIZE,
              method: state.method,
              caption: g
                ? `${image(state.doc).title}, ${METHOD_NAME[state.method!]}: ${g.right} of ${g.of} fields right.`
                : `${image(state.doc).title}, not read yet.`,
              stamp: g ? (g.right === g.of ? 'PASS' : 'FAIL') : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        read: ({ state, sync }) => {
          const go = (doc: Doc, method: Method | null) =>
            sync({
              ...state,
              doc,
              method,
              seen: method ? [...new Set([...state.seen, `${doc}|${method}`])] : state.seen,
            });
          return (
            <>
              <div className="mm-row" role="group" aria-label="Document">
                {DOCS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className="chip"
                    aria-pressed={state.doc === d}
                    onClick={() => go(d, null)}
                  >
                    {image(d).title}
                  </button>
                ))}
              </div>
              <div className="mm-row">
                {METHODS.map(m => (
                  <button key={m} type="button" className="big" onClick={() => go(state.doc, m)}>
                    Read with {m === 'ocr' ? 'OCR' : 'vision'}
                  </button>
                ))}
              </div>
              <p className="mm-note">
                Read so far: {ALL.filter(k => state.seen.includes(k)).length} of {ALL.length}.
              </p>
              {state.method && <ReadingCard image={state.doc} size={SIZE} method={state.method} />}
              <RecordedNote />
            </>
          );
        },
        found: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Fact id="ocrbench" />
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
