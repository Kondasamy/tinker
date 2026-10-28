// Chapter 7: guard every account, the workbench. One native select for the store, and a second factor and a session
// length for each account type, against four attackers (src/lib/logins/workbench.ts); a table of break-ins per
// attacker and a live count against the best. The puzzle accepts every best plan (WINNERS, pinned and recomputed in a
// test). The phishing page relays TOTP codes, so its row names the passkey fact as the fix outside the bench.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { useAsync } from '../encryption/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { ACCOUNTS, TYPES, accountOf, firstName } from '../../lib/logins/store';
import { DEMO_TOTP, totp } from '../../lib/logins/totp';
import {
  ATTACKERS,
  BEST,
  FACTORS,
  FACTOR_NAME,
  SESSIONS,
  START,
  STORES,
  WINNERS,
  benchPlan,
  breakIns,
  frictionOf,
  wins,
  type AttackerId,
  type Plan,
} from '../../lib/logins/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, drawersOf } from './kit';
import { fact } from '../../lib/logins/facts';
import Cite from '../../components/story/Cite';

const MODULE = 'logins',
  ID = '07-guard-every-account';
export const PARTS = CLOAK_PARTS;

export const QUIZ = {
  question: 'Staff keep typing codes into a lookalike sign-in page. What stops that?',
  options: ['Passkeys, which answer only the real site', 'Longer one-time codes', 'A slower password hash'],
  correct: 0,
  explanation: 'A relayed code works for the attacker; a passkey is bound to the real site’s name.',
  why: [
    'Right: a passkey checks which site is asking, so a lookalike page gets nothing it can use.',
    'The page relays any code in real time, however long it is.',
    'The hash protects the stored table; the victim is typing the password straight to the attacker.',
  ],
};

interface S extends Plan {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'Each defence stops some attackers and costs builders or staff a little friction at sign-in.',
    act: 'Find the fewest break-ins for the least friction.',
    say: { block: 'thief', text: 'Four attackers' },
    predicate: s => wins(benchPlan(s)),
    hint: 'Which attacker targets staff only? Which defence does each one beat?',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} best plans. A phishing page relays TOTP codes live, so a second factor never stops it.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a lookalike page do with a code?',
  },
];

export function sceneOf(p: Plan): Omit<CloakOpts, 'scale' | 'say'> {
  const st = STORES.find(s => s.id === p.store)!,
    lost = breakIns(p);
  return {
    drawers: drawersOf(
      st.form,
      lost.filter(b => b.attacker === 'breach').map(b => b.account),
    ),
    table: st.name.toUpperCase(),
    tableShort: st.form === 'pbkdf2' ? 'PBKDF2' : st.form === 'plain' ? 'PLAIN' : 'SHA-256',
    desk: 'LARKSPUR',
    ticket: { label: `STAFF: ${SESSIONS.find(s => s.id === p.staffSession)!.name.toUpperCase()}` },
    thief: { label: `${lost.length} BREAK-INS`, short: `${lost.length}`, holds: 'table' },
  };
}

function Score({ s }: { s: S }) {
  const p = benchPlan(s),
    n = breakIns(p).length,
    f = frictionOf(p),
    best = wins(p);
  return (
    <div role="status" data-lost={n} data-friction={f} data-fits={best ? '1' : '0'}>
      <p className="ek-headline">
        <strong>{`${n} break-ins · ${f} sign-in steps a month`}</strong>
        <span className={`stamp ${best ? 'correct' : 'wrong'}`}>{best ? 'BEST' : 'NOT YET'}</span>
      </p>
      <p className="tc-status">{`The best: ${BEST.breakIns} break-ins, ${BEST.friction} steps.`}</p>
    </div>
  );
}

/** Today's demo code, computed here from the demo secret at the demo time. */
function TotpLine() {
  const code = useAsync(() => totp(DEMO_TOTP.key, DEMO_TOTP.time), 'demo');
  return (
    <p className="ek-line" data-totp={code ?? ''}>
      {code ? `A TOTP code, computed here from a demo secret at a demo time: ${code}` : 'Computing a TOTP code…'}
    </p>
  );
}

const names = (ids: string[]) => ids.map(id => firstName(accountOf(id))).join(', ');

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPlan(s),
    lost = breakIns(p),
    phish = fact('nist-phishing');
  const pick = (id: string, label: string, value: string, options: [string, string][]) => (
    <div className="ek-field ek-select" key={id}>
      <label htmlFor={`lg-${id}`}>{label}</label>
      <select id={`lg-${id}`} value={value} onChange={e => set({ ...s, [id]: e.target.value })}>
        {options.map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="tc-bench">
      {pick(
        'store',
        'Store every password as',
        p.store,
        STORES.map(x => [x.id, x.name]),
      )}
      {TYPES.map(t => (
        <div key={t.id}>
          {pick(
            `${t.id}2fa`,
            `${t.name}: sign in with`,
            t.id === 'builder' ? p.builder2fa : p.staff2fa,
            FACTORS.map(f => [f, FACTOR_NAME[f]]),
          )}
          {pick(
            `${t.id}Session`,
            `${t.name}: session lasts`,
            t.id === 'builder' ? p.builderSession : p.staffSession,
            SESSIONS.map(x => [x.id, x.name]),
          )}
        </div>
      ))}
      {(p.builder2fa === 'totp' || p.staff2fa === 'totp') && <TotpLine />}
      <table className="tc-ledger">
        <caption>Who gets in</caption>
        <thead>
          <tr>
            <th scope="col">Attacker</th>
            <th scope="col">Accounts</th>
          </tr>
        </thead>
        <tbody>
          {ATTACKERS.map(a => {
            const got = lost.filter(b => b.attacker === (a.id as AttackerId)).map(b => b.account);
            return (
              <tr key={a.id} data-attacker={a.id} data-lost={got.length}>
                <th scope="row">{`${a.name}: ${a.does}`}</th>
                <td className={got.length ? 'bad' : 'ok'}>
                  {got.length ? names(got) : 'Nobody'}
                  {a.id === 'phish' && (
                    <span className="note">
                      {' '}
                      Passkeys stop this, outside this bench.{' '}
                      <Cite title={new URL(phish.source).hostname} href={phish.source} checked={phish.accessed} />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note ek-note">
        {`${ACCOUNTS.length} demo accounts. The attackers, their timings and the sign-in counts are planning numbers written for this site.`}
      </p>
    </div>
  );
}

export default function GuardEveryAccount() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = benchPlan(state);
        return (
          <LoginsStage
            say={say}
            show={{
              scene: sceneOf(p),
              caption: `${breakIns(p).length} break-ins; the breach cracks the red drawers.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
        fact: () => (
          <>
            <Fact id="nist-phishing" />
            <Fact id="rfc6238" />
            <Fact id="nist-rate-limit" />
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
