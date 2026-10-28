// Chapter 6: sign in with another site. OAuth's authorization code flow with state and PKCE, then OpenID Connect's ID
// token, signed with Locks and keys' demo ECDSA key and verified live (src/lib/logins/oidc.ts). The reader sends a
// builder to the Guild, checks the state that comes back, tries to redeem a stolen code without the verifier, and
// checks a genuine, a changed and another app's token: each fails its own check. The second view is the flow as lanes.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { useAsync } from '../encryption/kit';
import { CLOAK_PARTS, type Card, type CloakOpts } from '../../components/scenes/cloakScene';
import type { Lane, Msg } from '../../lib/iso/flat';
import { accountOf, firstName } from '../../lib/logins/store';
import { CHALLENGE, OTHER_TOKEN, TOKEN, challengeOf, checkSignIn, tamper } from '../../lib/logins/oidc';
import { COMPANY, GUILD, OTHER_CLIENT, SIGNER, STATE, THIEF_VERIFIER, VERIFIER } from '../../lib/logins/story';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, drawersOf } from './kit';

const MODULE = 'logins',
  ID = '06-sign-in-with-another-site';
export const PARTS = CLOAK_PARTS;
const ESME = firstName(accountOf(SIGNER)),
  US = COMPANY.split(' ')[0],
  G = GUILD.short,
  SEAL = moduleOf('encryption').chapters[3];

export type TokenPick = 'genuine' | 'tampered' | 'other';
export const TOKENS: Record<TokenPick, { name: string; token: string }> = {
  genuine: { name: `The token the ${G} sent`, token: TOKEN },
  tampered: { name: 'The same token, one letter changed', token: tamper(TOKEN) },
  other: { name: `A ${G} token made for ${OTHER_CLIENT}`, token: OTHER_TOKEN },
};
/** The thief's verifier doesn't hash to the challenge Larkspur sent. */
export const THIEF_FAILS = challengeOf(THIEF_VERIFIER) !== CHALLENGE;

export const P1 = {
  question: 'A thief grabs the code on its way back. Can she swap it for a token?',
  options: ['No: she lacks the PKCE verifier', 'Yes: the code is all it takes', 'Only before the state is checked'],
};
export const outcomeOf = () => (THIEF_FAILS ? 0 : 1);

export const QUIZ = {
  question: `A ${G} token names a different app as its audience. Its signature is good. Should ${US} accept it?`,
  options: [`No: it was made for another app`, `Yes: the ${G} signed it`, 'Yes, if the state matched'],
  correct: 0,
  explanation: 'A genuine token for someone else is still not a sign-in to you.',
  why: [
    'Right: the audience says which site the token is for, and it isn’t this one.',
    'The signature proves who made the token, not which site it was made for.',
    'The state ties the return to this sign-in; it says nothing about whose token this is.',
  ],
};

interface S {
  redirected: boolean;
  checked: boolean;
  p1: number | null;
  stolen: boolean;
  token: TokenPick;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'redirect',
    focus: 'redirect',
    visibleControls: ['redirect'],
    narration: `${US} sends ${ESME} to the ${G} with a random state and a PKCE challenge, the hash of a kept secret.`,
    act: `Sign in with the ${G}.`,
    say: { block: 'guild', text: 'Signs you in' },
    predicate: s => s.redirected,
  },
  {
    id: 'code',
    focus: 'check',
    visibleControls: ['check'],
    narration: `${ESME} signs in at the ${G}. It sends her back with an authorisation code and the same state.`,
    act: 'Check the state.',
    say: { block: 'desk', text: 'Code and state' },
    predicate: s => s.checked,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['state', 'p1'],
    narration: `The state matches, so this return is the one ${US} started.`,
    act: 'Predict what a thief does with a stolen code.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'steal',
    focus: 'steal',
    visibleControls: ['p1', 'steal'],
    narration: 'Your pick is locked.',
    act: 'Redeem the stolen code.',
    say: { block: 'thief', text: 'Stolen code' },
    predicate: s => s.stolen,
  },
  {
    id: 'token',
    focus: 'token',
    visibleControls: ['out1', 'pkce', 'token'],
    narration: `${US} swaps the code with its own verifier and gets an ID token the ${G} signed.`,
    act: 'Check the token with one letter changed.',
    say: { block: 'desk', text: 'ID token' },
    predicate: s => s.token === 'tampered',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['token', 'link', 'fact', 'quiz'],
    narration:
      'One changed letter breaks the signature. A genuine token made for another app fails its audience check.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which site is the token for?',
  },
];

const LANES: Lane[] = [
  { id: 'browser', name: `${ESME}’s browser` },
  { id: 'us', name: US },
  { id: 'guild', name: G },
  { id: 'thief', name: 'Thief' },
];
/** The flow so far, as lanes: what crossed, and each check's stamp. */
export function flowOf(s: Pick<S, 'redirected' | 'checked' | 'stolen' | 'token'>): Msg[] {
  const msgs: Msg[] = [];
  if (s.redirected)
    msgs.push(
      { from: 'us', to: 'browser', kind: 'request', text: `Go to the ${G}: state, challenge` },
      { from: 'browser', to: 'guild', kind: 'request', text: 'Sign in: state, challenge' },
    );
  if (s.checked)
    msgs.push(
      { from: 'guild', to: 'browser', kind: 'result', text: 'Back: code, state' },
      { from: 'browser', to: 'us', kind: 'result', text: 'Code, state', stamp: 'PASS' },
    );
  if (s.stolen)
    msgs.push(
      { from: 'thief', to: 'guild', kind: 'error', text: 'Stolen code, wrong verifier', stamp: 'DENIED' },
      { from: 'us', to: 'guild', kind: 'request', text: 'Code, verifier' },
      {
        from: 'guild',
        to: 'us',
        kind: s.token === 'genuine' ? 'result' : 'error',
        text: 'ID token',
        stamp: s.token === 'genuine' ? 'PASS' : 'FAIL',
      },
    );
  return msgs;
}

export function sceneOf(s: Pick<S, 'redirected' | 'checked' | 'stolen' | 'token'>): Omit<CloakOpts, 'scale' | 'say'> {
  const card: Card | undefined = s.stolen
    ? {
        label: s.token === 'genuine' ? 'ID TOKEN' : s.token === 'tampered' ? 'CHANGED TOKEN' : 'OTHER APP’S',
        short: 'TOKEN',
        at: 'desk',
        sealed: s.token !== 'tampered',
        broken: s.token === 'tampered',
        lit: s.token !== 'genuine',
      }
    : s.checked
      ? { label: 'CODE + STATE', short: 'CODE', at: 'desk' }
      : s.redirected
        ? { label: 'STATE + CHALLENGE', short: 'STATE', at: 'belt' }
        : undefined;
  return {
    drawers: drawersOf('pbkdf2'),
    table: 'SLOW, SALTED',
    tableShort: 'PBKDF2',
    desk: US.toUpperCase(),
    guild: { label: G.toUpperCase(), card },
    thief: s.stolen ? { label: 'CODE REFUSED', short: 'THIEF', holds: 'code' } : undefined,
  };
}

/** Every check run here on one token: the state, the verifier, the signature (real ECDSA) and the audience. */
function TokenChecks({ pick }: { pick: TokenPick }) {
  const checks = useAsync(() => checkSignIn({ state: STATE, verifier: VERIFIER, token: TOKENS[pick].token }), pick);
  return (
    <div role="status" data-checked={checks ? pick : ''}>
      {checks === undefined ? (
        <p className="ek-line">Checking with real ECDSA…</p>
      ) : checks === null ? (
        <p className="ek-line">This browser can’t run ECDSA here.</p>
      ) : (
        <ul className="lg-checks">
          {checks.map(c => (
            <li key={c.id} data-check={c.id} data-ok={c.ok ? '1' : '0'}>
              {c.said}
            </li>
          ))}
        </ul>
      )}
      <p className="note ek-note">Signed with a demo key, made for this site and public on purpose.</p>
    </div>
  );
}

export default function SignInWithAnotherSite() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ redirected: false, checked: false, p1: null, stolen: false, token: 'genuine', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            flow: { lanes: LANES, msgs: flowOf(state) },
            caption: state.stolen
              ? `${TOKENS[state.token].name}.`
              : state.redirected
                ? `${ESME} goes to the ${G} and comes back with a code.`
                : `${US}’s desk and the ${G}’s booth.`,
          }}
        />
      )}
      controls={{
        redirect: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, redirected: true })}>
            {`Sign in with the ${G}`}
          </button>
        ),
        check: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, checked: true })}>
            Check the state
          </button>
        ),
        state: () => (
          <ul className="lg-checks">
            <li data-check="state" data-ok="1">{`State sent and returned: ${STATE}`}</li>
          </ul>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        steal: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stolen: true })}>
            Redeem the stolen code
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        pkce: () => (
          <ul className="lg-checks">
            <li data-check="pkce" data-ok={THIEF_FAILS ? '0' : '1'}>
              {`Thief’s verifier hashes to ${challengeOf(THIEF_VERIFIER).slice(0, 10)}…, not ${CHALLENGE.slice(0, 10)}…`}
            </li>
          </ul>
        ),
        token: ({ state, sync }) => (
          <>
            <fieldset className="ek-field">
              <legend>Token to check</legend>
              {(Object.keys(TOKENS) as TokenPick[]).map(k => (
                <label key={k}>
                  <input
                    type="radio"
                    name="lg-token"
                    checked={state.token === k}
                    onChange={() => sync({ ...state, token: k })}
                  />
                  {TOKENS[k].name}
                </label>
              ))}
            </fieldset>
            <TokenChecks pick={state.token} />
          </>
        ),
        link: () => (
          <p className="tc-fact">
            How a signature works: <a href={chapterHref('encryption', SEAL.id)}>Locks and keys, {SEAL.title}</a>
          </p>
        ),
        fact: () => (
          <>
            <Fact id="rfc7636" />
            <Fact id="rfc9700" />
            <Fact id="oidc-core" />
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
