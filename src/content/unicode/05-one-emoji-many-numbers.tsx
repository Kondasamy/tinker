// Chapter 5: one emoji, many numbers. The reader predicts what JavaScript's length says for a family emoji, punches it,
// and sees four different lengths (code units, code points, graphemes from Intl.Segmenter, bytes), then a thumbs-up
// with a skin tone.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { lengthsOf } from '../../lib/unicode/graphemes';
import { FAMILY, THUMBS } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Lengths, PARTS as TAPE, Punch, TapeStage } from './kit';

const MODULE = 'unicode',
  ID = '05-one-emoji-many-numbers';
export const PARTS = TAPE;
const F = lengthsOf(FAMILY),
  T = lengthsOf(THUMBS);

export const P1 = {
  question: `What does JavaScript’s .length say for ${FAMILY}?`,
  options: [String(F.graphemes), String(F.codePoints), String(F.units)],
};
export const outcomeOf = () => P1.options.indexOf(String(lengthsOf(FAMILY).units));

export const QUIZ = {
  question: 'A gift-note box says “20 characters max”. A customer types 20 flag emoji and is refused. Why?',
  options: [
    'The box counted code units, not what people see',
    'Flags are not allowed in text',
    'The customer must have typed 21',
  ],
  correct: 0,
  explanation: 'Each flag is one grapheme but two code points and four code units.',
  why: [
    'Right: a flag is two code points, four code units, so twenty flags count as eighty.',
    'Flags are ordinary Unicode text, made of two regional-indicator code points.',
    'Twenty is what the customer sees; the box counted something else.',
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
    narration: `The family emoji ${FAMILY} looks like one character. Forms often count with JavaScript’s .length.`,
    act: 'Predict what .length says.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'punch',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: 'Your pick is locked. Watch how many rows one picture takes.',
    act: 'Put the family on the punch.',
    say: { block: 'tape', text: 'One picture' },
    predicate: s => s.text === FAMILY,
    hint: `Press the ${FAMILY} chip.`,
  },
  {
    id: 'thumbs',
    focus: 'punch',
    visibleControls: ['out1', 'lengths', 'punch'],
    narration: `${F.bytes} bytes, ${F.codePoints} code points, ${F.units} code units, one grapheme. Zero-width joiners glue three people into one.`,
    act: 'Now try the thumbs-up with a skin tone.',
    say: { block: 'tape', text: 'Joiners inside' },
    predicate: s => s.text === THUMBS,
    hint: `Press the ${THUMBS} chip.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['lengths', 'facts', 'quiz'],
    narration: `${T.codePoints} code points, a thumb and a tone, one grapheme. Count graphemes when you count what people see.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the box count, and what did the customer count?',
  },
];

export default function OneEmojiManyNumbers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ text: '', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <TapeStage text={state.text} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        punch: ({ state, sync }) => (
          <Punch text={state.text} chips={[FAMILY, THUMBS]} onText={text => sync({ ...state, text })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        lengths: ({ state }) => <Lengths text={state.text} />,
        facts: () => (
          <>
            <Fact id="utf16" />
            <Fact id="graphemes" />
            <Fact id="segmenter" />
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
