// Chapter 1: letters are numbers. The reader predicts how many rows a word takes, types it into the punch and sees one
// row per letter, then types the customer's name without its dots: three ASCII bytes, each a number from the table.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { bytesOf } from '../../lib/unicode/bytes';
import { ASCII_SIZE } from '../../lib/unicode/facts';
import { CUSTOMER, FIRST, PLAIN } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PARTS as TAPE, Punch, TapeStage } from './kit';

const MODULE = 'unicode',
  ID = '01-letters-are-numbers';
export const PARTS = TAPE;
const code = (ch: string) => ch.codePointAt(0)!;

export const P1 = {
  question: `How many rows of holes will “${FIRST}” punch?`,
  options: [`${FIRST.length}, one per letter`, '1 for the whole word', '26, one per letter of the alphabet'],
};
/** one row per byte: the word's byte count against its letters */
export const outcomeOf = () => (bytesOf(FIRST).length === FIRST.length ? 0 : 1);

export const QUIZ = {
  question: 'An order file holds the word “bolt”. What is actually stored?',
  options: ['Four numbers, one per letter', 'A small picture of each letter', 'The word, with no numbers involved'],
  correct: 0,
  explanation: 'A computer stores numbers; a table says which number stands for which letter.',
  why: [
    'Right: in ASCII each of the four letters is one number, one byte.',
    'Pictures of letters come from a font when text is shown, not from the file.',
    'Underneath, a file holds only numbers; the table is what turns them into letters.',
  ],
};

interface S {
  text: string;
  p1: number | null;
  quiz: number | null;
}
const is = (s: S, want: string) => s.text.trim().toLowerCase() === want.toLowerCase();

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The tape punch turns each letter into a number, a byte, and punches it as a row of holes.',
    act: `Predict how many rows “${FIRST}” takes.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'type',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: 'Your pick is locked. The holes in a row spell the byte’s number in ones and zeros.',
    act: `Type ${FIRST} into the punch.`,
    say: { block: 'punch', text: 'Type here' },
    predicate: s => is(s, FIRST),
    hint: `Click the text field and type the word ${FIRST}.`,
  },
  {
    id: 'plain',
    focus: 'punch',
    visibleControls: ['out1', 'fact', 'punch'],
    narration: `One row per letter. ASCII numbers ${ASCII_SIZE} characters; Z is ${code('Z')} and z is ${code('z')}.`,
    act: `Now type the customer’s name without its dots: ${PLAIN}.`,
    say: { block: 'tape', text: 'One row a byte' },
    predicate: s => s.text.trim() === PLAIN,
    hint: `Type ${PLAIN}: capital Z, then o and e.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['punch', 'quiz'],
    narration: `Three rows: ${[...bytesOf(PLAIN)].join(', ')}. ASCII has no ë, so ${CUSTOMER} needs more than this table.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a computer keep underneath every letter?',
  },
];

export default function LettersAreNumbers() {
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
        punch: ({ state, sync }) => <Punch text={state.text} onText={text => sync({ ...state, text })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => <Fact id="ascii" />,
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
