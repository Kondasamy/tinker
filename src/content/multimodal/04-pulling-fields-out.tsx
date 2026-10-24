// Chapter 4: pulling fields out. The reader predicts whether OCR or vision gets more of the invoice's fields at 1,600 px,
// extracts with both (same fields, OCR far cheaper), then drops both to 800 px, where grading field by field shows the
// one field that fails. Links Structured outputs for getting the fields back in a fixed form.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { METHODS, METHOD_NAME, costOf, grade, type Method } from '../../lib/multimodal/readings';
import { thousands } from '../../lib/multimodal/patches';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { SCAN_PARTS } from '../../components/scenes/scanScene';
import { MultimodalStage, ReadingCard, RecordedNote, px } from './kit';

const MODULE = 'multimodal',
  ID = '04-pulling-fields-out';
export const PARTS = SCAN_PARTS;
const BIG = 1600,
  SMALL = 800;
type Sz = typeof BIG | typeof SMALL;
const key = (m: Method, z: Sz) => `${m}|${z}`;
const N = grade('invoice', BIG, 'ocr').of;
const cost = (m: Method) => thousands(costOf('invoice', BIG, m));

interface S {
  p1: number | null;
  method: Method | null;
  size: Sz;
  seen: string[];
  quiz: number | null;
}

const P1 = {
  question: `At ${px(BIG)}, OCR hands the model ${cost('ocr')} text tokens and vision ${cost('vision')} image tokens. Which gets more of the invoice’s ${N} fields right?`,
  options: ['Vision: it sees more', 'OCR: text is exact', 'The same: both read clean print'],
};
export const outcome = () => {
  const [o, v] = METHODS.map(m => grade('invoice', BIG, m).right);
  return o === v ? 2 : v > o ? 0 : 1;
};

export const QUIZ = {
  question:
    'An extraction of 200 delivery notes scores 92% of fields right overall. What does grading each field on its own add?',
  options: [
    'It shows whether one field (say, the date) fails on most notes, so you fix that one thing',
    'Nothing: 92% is the answer',
    'It makes the extraction more accurate',
  ],
  correct: 0,
  explanation: 'An overall score can hide one field that fails every time.',
  why: [
    'Right: 92% overall can hide one field that is wrong on most notes, and per field you see which.',
    'The overall number can’t tell you where to look.',
    'Grading measures what the model reads; it doesn’t change it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Extraction pulls named fields into a fixed form. Each field is graded against a reference, the right value a person wrote.',
    act: 'Predict first.',
    say: { block: 'sheet', text: `${N} fields to read` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'big',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Your pick is locked.',
    act: `Extract the fields at ${px(BIG)}, once with OCR and once with vision.`,
    predicate: s => METHODS.every(m => s.seen.includes(key(m, BIG))),
  },
  {
    id: 'small',
    focus: 'run',
    visibleControls: ['same', 'run'],
    narration: 'Clean print: both are right, and OCR reads a fraction of the tokens.',
    act: `Drop to ${px(SMALL)} and extract with both again.`,
    setup: s => ({ ...s, size: SMALL, method: null }),
    predicate: s => METHODS.every(m => s.seen.includes(key(m, SMALL))),
    hint: `Both buttons, at ${px(SMALL)}.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['links', 'quiz'],
    narration:
      'An overall score says “mostly right”. Field by field, the same one fails both times: the terms, so fix the size.',
    act: 'One question to finish.',
    say: { block: 'sheet', text: 'Terms unreadable' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What can a per-field grade show that an overall score can’t?',
  },
];

export default function PullingFieldsOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, method: null, size: BIG, seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const g = state.method && grade('invoice', state.size, state.method);
        return (
          <MultimodalStage
            say={say}
            shown={{
              image: 'invoice',
              size: state.size,
              method: state.method,
              caption: g
                ? `${METHOD_NAME[state.method!]} at ${px(state.size)}: ${g.right} of ${g.of} fields right, ${thousands(costOf('invoice', state.size, state.method!))} tokens read.`
                : `The invoice at ${px(state.size)}, not read yet.`,
              stamp: g ? (g.right === g.of ? 'PASS' : 'FAIL') : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <>
            <div className="mm-row">
              {METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  className="big"
                  onClick={() => sync({ ...state, method: m, seen: [...new Set([...state.seen, key(m, state.size)])] })}
                >
                  Extract with {m === 'ocr' ? 'OCR' : 'vision'} at {px(state.size)}
                </button>
              ))}
            </div>
            {state.method && <ReadingCard image="invoice" size={state.size} method={state.method} />}
            <RecordedNote />
          </>
        ),
        same: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcome()} />,
        links: () => (
          <p className="tc-fact">
            To get the fields back in the same form every time, ask for them as JSON that must match a schema. The{' '}
            <a href="/structured-outputs/">Structured outputs</a> module shows how.
          </p>
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
