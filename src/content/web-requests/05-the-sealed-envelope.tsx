// Chapter 5: the sealed envelope. TLS seals the line and shows the shop's certificate (the seal office lights). Tomas
// is returning, so the reader predicts what resuming his session saves, turns it on, then sees 0-RTT refused for an
// order (a POST). The chapter closes on what the padlock proves and what it doesn't.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SITE, customerOf, runOf } from '../../lib/web-requests/sim';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, SimNote, WebStage, msOf } from './kit';

const MODULE = 'web-requests',
  ID = '05-the-sealed-envelope';
export const PARTS = TOWN_PARTS;
const TOMAS = customerOf('tomas');
type Method = 'GET' | 'POST';
export const runWith = (resume: boolean, method: Method = 'GET') =>
  runOf('tomas', { http: '2', ttl: 60, resume, method });
export const SAVED = runWith(false).total - runWith(true).total;

export const P1 = {
  question: `${TOMAS.name} came ${TOMAS.lastVisitMin} minutes ago and kept the keys from that visit. What can resuming save him?`,
  options: [
    'Nothing: every visit needs the full handshake again',
    'One round trip: his request rides along with his first message',
    'Both handshakes: the TCP one is skipped too',
  ],
};
export const outcomeOf = () => (SAVED <= 0 ? 0 : SAVED > runWith(false).rtt + 1e-6 ? 2 : 1);

export const QUIZ = {
  question: 'A site called cheap-hinges.example shows the padlock. What does the padlock tell you?',
  options: [
    'Your line to it is private, and you really reached cheap-hinges.example',
    'The shop is honest and will deliver what you pay for',
    'A bank has checked the shop’s accounts',
  ],
  correct: 0,
  explanation: 'The padlock vouches for the line and the name, nothing about the business behind it.',
  why: [
    'Right: the certificate matches the name you asked for, and the line is sealed.',
    'Anyone can get a certificate for a name they control, honest or not.',
    'A certificate authority checks control of the name, not a business’s books.',
  ],
};

interface S {
  checked: boolean;
  resume: boolean;
  method: Method;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'seal',
    focus: 'check',
    visibleControls: ['check'],
    narration:
      'TLS seals the line: one more round trip agrees keys and shows a certificate, signed by a certificate authority.',
    act: 'Check the certificate.',
    say: { block: 'seal', text: 'Signed it' },
    predicate: s => s.checked,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The seal held: the certificate names ${SITE}. ${TOMAS.name} is returning, though.`,
    act: 'Predict what resuming saves.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'resume',
    focus: 'resume',
    visibleControls: ['p1', 'resume'],
    narration: 'Your pick is locked.',
    act: 'Turn on session resumption.',
    predicate: s => s.resume && s.p1 !== null,
  },
  {
    id: 'post',
    focus: 'method',
    visibleControls: ['out1', 'resume', 'method'],
    narration: 'An attacker can resend 0-RTT data. So the shop accepts it to open a page, never for an order.',
    act: 'Switch to Place an order.',
    say: { block: 'shop', text: 'Not for orders' },
    predicate: s => s.method === 'POST',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['method', 'quiz'],
    narration: `The padlock proves the line is private and the certificate matches ${SITE}. It can’t prove the shop is honest.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the certificate authority actually check?',
  },
];

export default function TheSealedEnvelope() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ checked: false, resume: false, method: 'GET', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runWith(state.resume, state.method);
        return (
          <WebStage
            say={say}
            show={{
              town: { ...townAt(r), seal: state.checked },
              run: r,
              caption: r.zeroRtt
                ? `Resumed: the request rode with the first message (0-RTT). Page in ${msOf(r.total)}.`
                : r.refused
                  ? `An order: 0-RTT refused, so it waits for the full handshake. ${msOf(r.total)}.`
                  : `Full handshake. Page in ${msOf(r.total)}.`,
            }}
          />
        );
      }}
      controls={{
        check: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, checked: true })}>
            Check the certificate
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        resume: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.resume}
            onClick={() => apply({ ...state, resume: !state.resume })}
          >
            Session resumption
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`Resuming saved ${msOf(SAVED)}: one round trip.`}</p>
            <Fact id="zero-rtt" />
          </>
        ),
        method: ({ state, apply }) => (
          <>
            <div className="wr-row" role="group" aria-label="What the first request does">
              {(
                [
                  ['GET', 'Open the page'],
                  ['POST', 'Place an order'],
                ] as const
              ).map(([m, name]) => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  aria-pressed={state.method === m}
                  onClick={() => apply({ ...state, method: m })}
                >
                  {name}
                </button>
              ))}
            </div>
            <Fact id="zero-rtt-replay" />
            <Fact id="https-proves" />
            <p className="note in-note">
              How the padlock and the certificate work: <a href="/encryption/">Locks and keys</a>.
            </p>
            <SimNote />
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
