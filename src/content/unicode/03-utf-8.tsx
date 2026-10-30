// Chapter 3: UTF-8, one to four bytes. The reader predicts how many bytes the customer's name takes, punches it (a chip
// adds the ë a keyboard may lack), then adds a 3-byte and a 4-byte character. The bit layout folds away; Tokens is
// linked where bytes meet tokens.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { bitsOf, bytesOf, glyphsOf } from '../../lib/unicode/bytes';
import { nfc } from '../../lib/unicode/normalise';
import { CUSTOMER, WIDTHS } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PARTS as TAPE, Punch, TapeStage } from './kit';

const MODULE = 'unicode',
  ID = '03-utf-8';
export const PARTS = TAPE;
const NAME_BYTES = bytesOf(CUSTOMER).length,
  NAME_CHARS = [...CUSTOMER].length,
  WIDE = WIDTHS.map(c => bytesOf(c).length);
const [, E, HAN, SMILE] = WIDTHS;

export const P1 = {
  question: `“${CUSTOMER}” is ${NAME_CHARS} characters. How many bytes does UTF-8 punch?`,
  options: [`${NAME_BYTES}: ${E} takes two`, `${NAME_CHARS}: one per character`, `${NAME_CHARS * 2}: two for each`],
};
/** the option whose number is the name's real byte count */
export const outcomeOf = () => [NAME_BYTES, NAME_CHARS, NAME_CHARS * 2].indexOf(bytesOf(CUSTOMER).length);

export const QUIZ = {
  question: 'A product page in plain English is saved as UTF-8 instead of ASCII. How big is it now?',
  options: ['The same size: ASCII letters stay one byte', 'Twice the size', 'Four times the size'],
  correct: 0,
  explanation: 'UTF-8 writes every ASCII character as the same single byte.',
  why: [
    'Right: UTF-8 keeps ASCII’s bytes as they are, one per letter.',
    'Two bytes each is UTF-16, a different way to write code points, not UTF-8.',
    'Four bytes is the most UTF-8 ever uses, and only past U+FFFF.',
  ],
};

interface S {
  text: string;
  p1: number | null;
  quiz: number | null;
}
const widths = (s: string) => new Set(glyphsOf(s).map(g => g.bytes.length));

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A byte holds up to 255. The punch writes UTF-8, which spends more bytes on bigger numbers.`,
    act: `Predict how many bytes “${CUSTOMER}” takes.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'type',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: `Your pick is locked. No ${E} on your keyboard? The chip adds one.`,
    act: `Type ${CUSTOMER} into the punch.`,
    say: { block: 'punch', text: 'Type here' },
    predicate: s => nfc(s.text.trim()) === CUSTOMER,
    hint: `Clear the field, type Zo, then press the + ${E} chip.`,
  },
  {
    id: 'wide',
    focus: 'punch',
    visibleControls: ['out1', 'punch'],
    narration: `${NAME_BYTES} bytes. Z and o stay one byte each, as in ASCII; ${E} takes ${WIDE[1]}.`,
    act: `Add ${HAN} and ${SMILE} to see the longest.`,
    say: { block: 'tape', text: `${E}: ${WIDE[1]} rows` },
    predicate: s => widths(s.text).has(3) && widths(s.text).has(4),
    hint: `Press + ${HAN}, then + ${SMILE}.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['punch', 'layout', 'quiz'],
    narration: `${HAN} takes ${WIDE[2]}, ${SMILE} ${WIDE[3]}. UTF-8 spends one to four bytes; each lead byte says how many follow.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does UTF-8 do to an ASCII letter?',
  },
];

/** The bit layout, optional: each byte of the customer's name in bits. */
function Layout() {
  return (
    <>
      <Fact id="utf8" />
      <Fact id="web" />
      <details className="uc-more">
        <summary>The bit layout (optional)</summary>
        <p>
          {glyphsOf(CUSTOMER)
            .map(g => `${g.ch}: ${g.bytes.map(bitsOf).join(' ')}`)
            .join(' · ')}
        </p>
        <p>
          A byte starting 0 is ASCII on its own. A lead byte starts 110, 1110 or 11110 for two, three or four bytes;
          every byte after it starts 10.
        </p>
      </details>
      <Fact id="bytes-to-tokens" />
      <p className="note">
        Tokenizers build on these bytes: <a href="/tokens/02-how-the-vocabulary-is-learned/">Tokens, chapter 2</a>.
      </p>
    </>
  );
}

export default function Utf8() {
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
          <Punch text={state.text} chips={[E, HAN, SMILE]} append onText={text => sync({ ...state, text })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        layout: () => <Layout />,
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
