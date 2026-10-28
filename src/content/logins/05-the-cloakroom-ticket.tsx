// Chapter 5: the cloakroom ticket. After sign-in the site hands the browser a session cookie; the reader predicts what
// a thief with a copy needs, copies it, watches the site let her in, then signs the session out and the copy dies.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { accountOf, firstName } from '../../lib/logins/store';
import { COOKIE_VICTIM, SESSION, SITE } from '../../lib/logins/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, drawersOf } from './kit';

const MODULE = 'logins',
  ID = '05-the-cloakroom-ticket';
export const PARTS = CLOAK_PARTS;
const JO = firstName(accountOf(COOKIE_VICTIM));

export const P1 = {
  question: `A thief copies ${JO}’s cookie. What else does she need to get in?`,
  options: ['Nothing: the cookie is enough', `${JO}’s password`, `${JO}’s code from her phone`],
};
/** The desk checks only the ticket: a copy gets in. */
export const outcomeOf = () => 0;

export const QUIZ = {
  question: 'A shop’s session cookie is stolen from a laptop. What makes the stolen copy useless?',
  options: [
    'Ending that session on the shop’s side',
    'Changing the account’s password, and nothing else',
    'Clearing the laptop’s browser history',
  ],
  correct: 0,
  explanation: 'A cookie works until the site stops honouring it; only the site can end the session.',
  why: [
    'Right: once the shop forgets the session, every copy of its cookie is turned away.',
    'A new password doesn’t end a session the shop still honours, unless the shop signs sessions out too.',
    'That clears the owner’s copy; the thief’s copy still works.',
  ],
};

interface S {
  signedIn: boolean;
  p1: number | null;
  stolen: boolean;
  signedOut: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'signin',
    focus: 'signin',
    visibleControls: ['signin'],
    narration: `${JO} signs in once. The site hands her browser a session cookie: a random ticket it shows on every request.`,
    act: `Sign ${JO} in.`,
    say: { block: 'desk', text: 'Hands a ticket' },
    predicate: s => s.signedIn,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['cookie', 'p1'],
    narration: 'Malware on her laptop copies the ticket and sends it to a thief.',
    act: 'Predict what the thief needs to get in.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'steal',
    focus: 'steal',
    visibleControls: ['p1', 'steal'],
    narration: 'Your pick is locked.',
    act: 'Show the copied ticket at the desk.',
    say: { block: 'thief', text: 'Copied ticket' },
    predicate: s => s.stolen,
  },
  {
    id: 'signout',
    focus: 'signout',
    visibleControls: ['out1', 'signout'],
    narration:
      'The desk let her in: it checks the ticket, not the person. Ending the session makes the site forget it.',
    act: `Sign ${JO} out.`,
    say: { block: 'desk', text: 'Checks tickets' },
    predicate: s => s.signedOut,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration:
      'The copy is worthless now. Short sessions shrink the window; HttpOnly cookies keep page scripts off the ticket.',
    act: 'One question to finish.',
    say: { block: 'thief', text: 'Turned away' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who decides whether a ticket still works?',
  },
];

export function sceneOf(s: Pick<S, 'signedIn' | 'stolen' | 'signedOut'>): Omit<CloakOpts, 'scale' | 'say'> {
  return {
    drawers: drawersOf('pbkdf2'),
    table: 'SLOW, SALTED',
    tableShort: 'PBKDF2',
    desk: s.signedOut ? 'SESSION ENDED' : s.stolen ? 'LETS HER IN' : 'LARKSPUR',
    ticket: s.signedIn
      ? { label: s.signedOut ? 'VOID' : `${JO.toUpperCase()}’S TICKET`, void: s.signedOut, lit: !s.signedOut }
      : undefined,
    thief: s.stolen
      ? { label: s.signedOut ? 'TURNED AWAY' : `SIGNED IN AS ${JO.toUpperCase()}`, short: 'THIEF', holds: 'ticket' }
      : undefined,
  };
}

export default function TheCloakroomTicket() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ signedIn: false, p1: null, stolen: false, signedOut: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.signedOut
              ? 'Session ended: the site no longer honours the ticket.'
              : state.stolen
                ? `Two copies of one ticket; ${SITE} lets both in.`
                : 'The cloakroom desk and its tickets.',
          }}
        />
      )}
      controls={{
        signin: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, signedIn: true })}>
            {`Sign ${JO} in`}
          </button>
        ),
        cookie: () => (
          <p className="ek-line">
            <code>{`Set-Cookie: session=${SESSION}; HttpOnly; Secure`}</code>
            <span className="note ek-note"> A demo session id.</span>
          </p>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        steal: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stolen: true })}>
            Show the copied ticket
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        signout: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, signedOut: true })}>
            {`Sign ${JO} out`}
          </button>
        ),
        fact: () => <Fact id="rfc6265" />,
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
