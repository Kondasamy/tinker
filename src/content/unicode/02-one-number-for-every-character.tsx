// Chapter 2: one number for every character. The reader predicts what Unicode gives ë, puts it on the punch, then a
// character far past one byte (中 or 🙂). The Bytes tab names each code point; the count of characters is a cited fact.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { glyphsOf, uplus } from '../../lib/unicode/bytes';
import { CODESPACE, TOTAL, VERSION } from '../../lib/unicode/facts';
import { SCRIPTS } from '../../lib/unicode/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PARTS as TAPE, Punch, TapeStage } from './kit';
import { num } from '../../lib/format';

const MODULE = 'unicode',
  ID = '02-one-number-for-every-character';
export const PARTS = TAPE;
const [E, , HAN, SMILE] = SCRIPTS;
const cp = (ch: string) => ch.codePointAt(0)!;

export const P1 = {
  question: `ASCII stops at 127. What does Unicode give ${E}?`,
  options: [
    'One number of its own, past 127',
    'No number: it is e with dots added',
    'A number only German programs know',
  ],
};
/** ë has a code point of its own, past ASCII's last */
export const outcomeOf = () => (glyphsOf(E).length === 1 && cp(E) > 127 ? 0 : 1);

export const QUIZ = {
  question: 'A customer in Kyiv types Ж into the delivery form. What does Unicode give it?',
  options: [
    'One code point, the same in every program',
    'A number that depends on the keyboard',
    'Nothing: Cyrillic needs a table of its own',
  ],
  correct: 0,
  explanation: 'Unicode numbers every character once, for every program and script.',
  why: [
    'Right: Ж is one code point, whatever keyboard or program typed it.',
    'Keyboards only choose which character; the number comes from Unicode’s one table.',
    'Separate tables per script were the old problem that Unicode replaced.',
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
    narration: `ASCII stops at 127, with no ${E}. Unicode keeps one big table for every script.`,
    act: `Predict what Unicode gives ${E}.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'punch',
    focus: 'punch',
    visibleControls: ['p1', 'punch'],
    narration: 'Your pick is locked. Each chip is a character from a different script.',
    act: `Put ${E} on the punch.`,
    say: { block: 'punch', text: 'Pick a chip' },
    predicate: s => s.text.includes(E),
    hint: `Press the ${E} chip.`,
  },
  {
    id: 'far',
    focus: 'punch',
    visibleControls: ['out1', 'fact', 'punch'],
    narration: `${E} is code point ${uplus(cp(E))}, number ${cp(E)}. Unicode ${VERSION} numbers ${num(TOTAL)} characters.`,
    act: `Now punch ${HAN} or ${SMILE}.`,
    say: { block: 'tape', text: 'More rows' },
    predicate: s => [...s.text].some(c => cp(c) > 0xfff),
    hint: `Press the ${HAN} chip or the ${SMILE} chip.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['punch', 'space', 'quiz'],
    narration: `${SMILE} is ${uplus(cp(SMILE))}, number ${num(cp(SMILE))}: far past one byte’s 255. Unicode has room for ${num(CODESPACE)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many tables does Unicode keep?',
  },
];

export default function OneNumberForEveryCharacter() {
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
          <Punch text={state.text} chips={SCRIPTS} onText={text => sync({ ...state, text })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => <Fact id="version" />,
        space: () => <Fact id="codespace" />,
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
