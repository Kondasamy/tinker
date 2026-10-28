// Chapter 2: who takes it next. The reader predicts which postmark is the first hop, peels the order confirmation's
// postmarks bottom-up (KTD13's mechanic: each lights its server on the back wall), sees the MX lookup that chose the
// second hop, then peels the longer road of a copy forwarded through an old address. Opening a web page teaches DNS
// itself, one link away (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import { hops, parse } from '../../lib/email/parse';
import { CUSTOMER, FORWARDER, MESSAGES, RECEIVER_MX, RECORDS, type MessageId } from '../../lib/email/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EmailStage, Fact, MessagePick, type View } from './kit';

const MODULE = 'email',
  ID = '02-who-takes-it-next';
export const PARTS = POST_PARTS;
export const HOPS = { order: hops(parse(MESSAGES.order)), forwarded: hops(parse(MESSAGES.forwarded)) };

export const P1 = {
  question: 'Which postmark shows the message’s first hop?',
  options: [
    'The bottom one: each new one goes on top',
    'The top one: it is read first',
    'No order: servers stamp anywhere',
  ],
};
/** the bottom Received header is the hop that left Larkspur's app */
export const outcomeOf = () => {
  const received = parse(MESSAGES.order).headers.filter(h => h.name === 'Received');
  return received.at(-1)!.value.includes(`by ${HOPS.order[0].by}`) ? 0 : 1;
};

export const QUIZ = {
  question: 'A message’s postmarks read, top to bottom: C took it from B, B from A. Which server had it first?',
  options: ['A, named at the bottom', 'C, named at the top', 'You can’t tell from postmarks'],
  correct: 0,
  explanation: 'Each server stamps on top, so the bottom postmark is the oldest.',
  why: [
    'Right: the bottom postmark was stamped first, and A handed it to B.',
    'C stamped last, so it sits on top; it had the message most recently.',
    'Each postmark names who handed it over and when, so the order is there.',
  ],
};

interface S {
  msg: MessageId;
  peeled: number;
  view: View;
  p1: number | null;
  quiz: number | null;
}
const all = (s: S, id: 'order' | 'forwarded') => s.msg === id && s.peeled >= HOPS[id].length;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Each server that takes the message stamps a postmark, a Received header, on top of the rest.',
    act: 'Predict which postmark is the first hop.',
    say: { block: 'postmarks', text: 'Postmarks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'peel',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Each peel shows one handover: who took it, from where, and when.',
    act: 'Peel the postmarks, bottom first.',
    say: { block: 'hops', text: 'One per hop' },
    predicate: s => s.p1 !== null && all(s, 'order'),
  },
  {
    id: 'mx',
    focus: 'pick',
    visibleControls: ['out1', 'pick', 'mx'],
    narration: `The second hop crossed the internet. Larkspur’s server asked DNS for ${CUSTOMER.domain}’s MX record and got ${RECEIVER_MX}.`,
    act: 'Pick the forwarded copy.',
    predicate: s => s.msg === 'forwarded',
  },
  {
    id: 'forward',
    focus: 'stage',
    visibleControls: ['pick'],
    narration: `Hollis’s old address at ${FORWARDER} passes mail on to the new one, so this copy took a longer road.`,
    act: 'Peel all its postmarks.',
    say: { block: 'hops', text: 'A longer road' },
    predicate: s => all(s, 'forwarded'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `${HOPS.forwarded.length} hops instead of ${HOPS.order.length}. The top postmark is always the newest, stamped by Hollis’s own server.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does each new postmark go?',
  },
];

export default function WhoTakesItNext() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ msg: 'order', peeled: 0, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, apply, say }) => (
        <EmailStage
          id={state.msg}
          rec={RECORDS.nothing}
          show={{}}
          say={say}
          peeled={state.peeled}
          // the postmarks wait for the prediction, so a peel can't answer it first
          onPeel={state.p1 === null ? undefined : peeled => apply({ ...state, peeled })}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`${HOPS[state.msg as 'order' | 'forwarded']?.length ?? 0} postmarks, read bottom first.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="received" />
          </>
        ),
        pick: ({ state, apply }) => (
          <MessagePick
            ids={['order', 'forwarded']}
            value={state.msg}
            onPick={msg => apply({ ...state, msg, peeled: 0 })}
          />
        ),
        mx: () => (
          <>
            <Fact id="mx" />
            <p className="note em-note">
              How DNS answers a name:{' '}
              <a href="/web-requests/01-a-name-to-a-number/">a name to a number, in Opening a web page</a>.
            </p>
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
