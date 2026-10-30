// Chapter 4: the wrong table. The customer's name is on the tape in UTF-8; the reader predicts what a Latin-1 reader
// prints, switches the reader's table (a real TextDecoder, windows-1252), tries a word of their own, then sets it back.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { bytesOf } from '../../lib/unicode/bytes';
import { readAs, type Table } from '../../lib/unicode/mojibake';
import { CUSTOMER, MOJI } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PARTS as TAPE, Punch, TapeStage, printedOf } from './kit';

const MODULE = 'unicode',
  ID = '04-the-wrong-table';
export const PARTS = TAPE;
const LAST = [...CUSTOMER].at(-1)!,
  LAST_BYTES = [...bytesOf(LAST)],
  LAST_READ = readAs(bytesOf(LAST), 'windows-1252'),
  CAFE = 'café';

export const P1 = {
  question: `The tape holds “${CUSTOMER}” in UTF-8. What does a Latin-1 reader print?`,
  options: [
    `“${MOJI}”: one character per byte`,
    `“${CUSTOMER}”: bytes are bytes`,
    `“${[...CUSTOMER].slice(0, -1).join('')}?” with a question mark`,
  ],
};
export const outcomeOf = () => (printedOf(CUSTOMER, 'windows-1252') === MOJI ? 0 : 1);

export const QUIZ = {
  question: `A spreadsheet export shows “${readAs(bytesOf(CAFE), 'windows-1252')}” where the menu says “${CAFE}”. What went wrong?`,
  options: ['UTF-8 bytes were read as Latin-1', 'The file lost the accent', 'Someone typed it wrong'],
  correct: 0,
  explanation: 'Ã followed by another sign is the mark of UTF-8 read with a Latin-1 table.',
  why: [
    'Right: é’s two UTF-8 bytes were read as two Latin-1 characters.',
    'Nothing was lost: the bytes are all there, read with the wrong table.',
    'A typing slip wouldn’t turn one letter into a pair as regular as Ã and ©.',
  ],
};

interface S {
  text: string;
  table: Table;
  p1: number | null;
  quiz: number | null;
}
const accented = (s: string) => [...s].some(c => c.codePointAt(0)! > 127);

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Rosa punched ${CUSTOMER} in UTF-8. Tom’s label printer reads with an old table, Latin-1: one character per byte.`,
    act: 'Predict what the label prints.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'switch',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: 'Your pick is locked. The tape stays the same; only the reader’s table changes.',
    act: 'Set the reader’s table to Latin-1.',
    say: { block: 'reader', text: 'Its table' },
    predicate: s => s.table === 'windows-1252',
    hint: 'Open “The reader’s table” and pick Latin-1.',
  },
  {
    id: 'own',
    focus: 'punch',
    visibleControls: ['out1', 'latin1', 'punch'],
    narration: `Mojibake: ${LAST}’s bytes, ${LAST_BYTES.join(' and ')}, became ${[...LAST_READ].join(' and ')}. Ã before another sign: UTF-8 read as Latin-1.`,
    act: 'Type an accented word of your own.',
    say: { block: 'label', text: 'Garbled' },
    predicate: s => s.table === 'windows-1252' && accented(s.text) && s.text.trim() !== CUSTOMER,
    hint: `Try ${CAFE}, or any word with an accent.`,
  },
  {
    id: 'fix',
    focus: 'punch',
    visibleControls: ['punch'],
    narration: 'The bytes on the tape were never wrong. The reader used a different table from the writer.',
    act: 'Set the reader back to UTF-8.',
    say: { block: 'reader', text: 'Match the punch' },
    predicate: s => s.table === 'utf-8',
    hint: 'Open “The reader’s table” and pick UTF-8.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['punch', 'quiz'],
    narration: 'Same bytes, same table, right word. Writer and reader must agree, and today that means UTF-8.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which letter pair shows up every time?',
  },
];

export default function TheWrongTable() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ text: CUSTOMER, table: 'utf-8', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <TapeStage text={state.text} table={state.table} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        punch: ({ state, apply, sync }) => (
          <Punch
            text={state.text}
            onText={text => sync({ ...state, text })}
            table={state.table}
            onTable={table => apply({ ...state, table })}
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        latin1: () => <Fact id="latin1" />,
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
