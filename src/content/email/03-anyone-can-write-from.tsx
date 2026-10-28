// Chapter 3: anyone can write From. Two invoices with the same From line, one fake. The reader predicts what Hollis's
// server checked about the From line (nothing), peels the fake's postmarks back to the forger's server, and delivers
// it: the inbox, while Larkspur's real mail sits in junk (chapter 1). Its own domain vouched for it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import { envelopeOf, fromOf, hops, parse } from '../../lib/email/parse';
import { FORGER, MESSAGES, RECORDS, verdictOf, type MessageId } from '../../lib/email/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, MessagePick, type View } from './kit';

const MODULE = 'email',
  ID = '03-anyone-can-write-from';
export const PARTS = POST_PARTS;
const FAKE = parse(MESSAGES.forged);
export const FROM = fromOf(FAKE),
  HOPS = hops(FAKE),
  START = HOPS[0].from;
export const FATE = verdictOf('forged', RECORDS.nothing);

export const P1 = {
  question: 'Before delivering the fake, what did Hollis’s server check about its From line?',
  options: ['Nothing: no check was set up', 'That Larkspur sent it', 'That the bank account is Larkspur’s'],
};
/** with no records, DMARC has nothing to say about the From line */
export const outcomeOf = () => (FATE.dmarc === 'none' ? 0 : 1);

export const QUIZ = {
  question: 'A message says it is from your bank. Which part shows where it really came from?',
  options: [
    'The top postmarks, stamped by your own mail servers',
    'The From line',
    'The signature at the bottom of the text',
  ],
  correct: 0,
  explanation: 'Your own servers stamp the top postmarks; the sender writes everything else.',
  why: [
    'Right: lower postmarks can be faked too, but the ones your servers added are theirs.',
    'The sender writes the From line, so it shows only what they want you to see.',
    'A name typed at the bottom is text like the rest; anyone can type it.',
  ],
};

interface S {
  msg: MessageId;
  peeled: number;
  sorted: boolean;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'two',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: `Both invoices show From: ${FROM}. Same subject, same amount; one bank account differs.`,
    act: 'Pick the fake invoice.',
    say: { block: 'envelope', text: 'Same From' },
    predicate: s => s.msg === 'forged',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'SMTP, the protocol servers use to hand mail on, takes whatever From line the sender writes.',
    act: 'Predict what Hollis’s server checked.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'peel',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Writing another’s address is spoofing. The postmarks still show where it started.',
    act: 'Peel the postmarks.',
    say: { block: 'postmarks', text: 'Read these' },
    predicate: s => s.p1 !== null && s.msg === 'forged' && s.peeled >= HOPS.length,
  },
  {
    id: 'deliver',
    focus: 'deliver',
    visibleControls: ['out1', 'deliver'],
    narration: `It started at ${START}, and its envelope names ${FORGER}. That domain vouches for itself.`,
    act: 'Press Deliver.',
    say: { block: 'hops', text: 'Not Larkspur' },
    predicate: s => s.sorted,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Inbox. Larkspur’s real mail sat in junk while this walked in: nobody checks From yet.',
    act: 'One question to finish.',
    say: { block: 'inbox', text: 'The fake' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which postmarks did someone you trust add?',
  },
];

export default function AnyoneCanWriteFrom() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ msg: 'invoice', peeled: 0, sorted: false, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, apply, say }) => (
        <EmailStage
          id={state.msg}
          rec={RECORDS.nothing}
          show={{ sorted: state.sorted }}
          say={say}
          peeled={state.peeled}
          onPeel={state.p1 === null ? undefined : peeled => apply({ ...state, peeled })}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`Envelope: ${envelopeOf(parse(MESSAGES[state.msg]))}. From: ${FROM}.`}
        />
      )}
      controls={{
        pick: ({ state, apply }) => (
          <MessagePick
            ids={['invoice', 'forged']}
            value={state.msg}
            onPick={msg => apply({ ...state, msg, peeled: 0 })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <DemoNote />
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
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="received" />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
