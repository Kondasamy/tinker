// Chapter 1: an envelope and a letter. The order confirmation on the post room's desk: the reader opens its raw
// headers, predicts whether the envelope's sender must match the From line, sees that they differ in Larkspur's own
// mail, and delivers it: junk, since nothing vouches for it yet (the receiver's rule, a labelled stand-in).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import { envelopeOf, fromOf, parse } from '../../lib/email/parse';
import { MESSAGES, RECEIVER_RULE, RECORDS } from '../../lib/email/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, type View } from './kit';

const MODULE = 'email',
  ID = '01-envelope-and-letter';
export const PARTS = POST_PARTS;
const ORDER = parse(MESSAGES.order);
export const ENVELOPE = envelopeOf(ORDER),
  FROM = fromOf(ORDER);

export const P1 = {
  question: 'Must the envelope’s sender match the From line?',
  options: ['No: nothing checks that they match', 'Yes: servers refuse a mismatch', 'Yes: From is copied from it'],
};
/** Larkspur's own confirmation already differs, and it was delivered */
export const outcomeOf = () => (ENVELOPE !== FROM ? 0 : 1);

export const QUIZ = {
  question: 'An email shows From: payroll@yourcompany.example. What does that line prove on its own?',
  options: ['Nothing: the sender typed it', 'That your company’s server sent it', 'That the envelope says the same'],
  correct: 0,
  explanation: 'The From line is text the sender writes, like a name on a letter.',
  why: [
    'Right: until a check ties it to the domain, anyone can write it.',
    'Any server can send a message with that line; nothing so far checks it.',
    'The envelope can name a different address, and often does.',
  ],
};

interface S {
  view: View;
  p1: number | null;
  sorted: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'stage',
    visibleControls: [],
    narration: 'Mail is like a letter: an envelope the servers deliver by, and the letter inside with its headers.',
    act: 'Open the Headers tab.',
    say: { block: 'envelope', text: 'The envelope' },
    predicate: s => s.view === 'headers',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Return-Path holds the envelope’s sender, ${ENVELOPE}. From is what Hollis reads: ${FROM}.`,
    act: 'Predict: must the two match?',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'deliver',
    focus: 'deliver',
    visibleControls: ['p1', 'out1', 'deliver'],
    narration: 'They differ even in Larkspur’s own mail, and no server minded.',
    act: 'Press Deliver.',
    predicate: s => s.p1 !== null && s.sorted,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['rule', 'quiz'],
    narration: 'Junk: Hollis’s mail provider junks mail that nothing vouches for. Chapters 4 to 6 add the vouching.',
    act: 'One question to finish.',
    say: { block: 'junk', text: 'Nothing vouched' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who writes the From line?',
  },
];

export default function EnvelopeAndLetter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ view: 'scene', p1: null, sorted: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <EmailStage
          id="order"
          rec={RECORDS.nothing}
          show={{ sorted: state.sorted }}
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`Envelope: ${ENVELOPE}. From: ${FROM}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="from" />
          </>
        ),
        deliver: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            disabled={state.sorted}
            onClick={() => apply({ ...state, sorted: true })}
          >
            Deliver
          </button>
        ),
        rule: () => (
          <>
            <p className="note em-note">{`${RECEIVER_RULE} A stand-in rule for this module.`}</p>
            <DemoNote />
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
