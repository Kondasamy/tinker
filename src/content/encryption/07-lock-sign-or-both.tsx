// Chapter 7: lock, sign or both, the workbench. One native select per supplier message (lock, sign, both or neither)
// against the attackers on the line; a result table, one row per message, and a live count of what is lost against
// the best (nothing). The puzzle accepts every plan that loses nothing (WINNERS, pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { PAINT_PARTS, type Item, type PaintOpts } from '../../components/scenes/paintScene';
import {
  ATTACKERS,
  CHOICES,
  CHOICE_NAME,
  MESSAGES,
  START,
  WINNERS,
  benchPlan,
  lostBy,
  runPlan,
  wins,
  type Choice,
  type MessageId,
  type Plan,
} from '../../lib/encryption/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EncryptionStage, Fact } from './kit';

const MODULE = 'encryption',
  ID = '07-lock-sign-or-both';
export const PARTS = PAINT_PARTS;
const nameOf = (id: MessageId) => MESSAGES.find(m => m.id === id)!.name;

export const QUIZ = {
  question: 'A shop posts its opening hours for everyone. What should it do with them?',
  options: [
    'Sign them so nobody can fake them, and leave them unlocked',
    'Lock them, so only customers can read them',
    'Nothing: public facts need no protection',
  ],
  correct: 0,
  explanation: 'Public isn’t the same as unprotected: sign what must be genuine, lock only what must be secret.',
  why: [
    'Right: everyone must read them, so no lock, and a signature stops a fake set of hours.',
    'A lock means only one key opens it, and the hours are for everyone.',
    'Anyone could post fake hours in the shop’s name; a signature is what stops that.',
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
    narration: 'Each attacker waits on the line: one reads, one changes, one fakes the sender.',
    act: 'Pick lock, sign or both for each message.',
    say: { block: 'counter', text: 'On the line' },
    predicate: s => wins(benchPlan(s)),
    hint: 'Which message must every shop read? Which must stay secret?',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} plans that lose nothing. Only a signature stops a forger.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who must read the hours?',
  },
];

export function sceneOf(p: Plan): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const counter: Item[] = runPlan(p).map(r => ({
    kind: 'card',
    label: `${MESSAGES.find(m => m.id === r.id)!.short}${r.losses.length ? ' ✗' : ' ✓'}`,
    sealed: r.choice === 'sign' || r.choice === 'both',
    locked: r.choice === 'lock' || r.choice === 'both',
    owner: 'us',
    lit: r.losses.length > 0,
  }));
  return {
    us: [],
    counter,
    them: [{ kind: 'lock', label: 'PADLOCK', open: true }],
    eve: `${ATTACKERS.length} ATTACKERS`,
  };
}

function Score({ s }: { s: S }) {
  const p = benchPlan(s),
    lost = lostBy(p),
    best = wins(p);
  return (
    <div role="status" data-lost={lost} data-fits={best ? '1' : '0'}>
      <p className="ek-headline">
        <strong>{`${lost} lost`}</strong>
        {' · the best loses nothing '}
        <span className={`stamp ${best ? 'correct' : 'wrong'}`}>{best ? 'SAFE' : 'NOT YET'}</span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} plans that work.`}</p>}
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPlan(s);
  return (
    <div className="tc-bench">
      {MESSAGES.map(m => (
        <div className="ek-field ek-select" key={m.id}>
          <label htmlFor={`ek-${m.id}`}>{m.name}</label>
          <select
            id={`ek-${m.id}`}
            value={p[m.id as MessageId]}
            onChange={e => set({ ...s, [m.id]: e.target.value as Choice })}
          >
            {CHOICES.map(c => (
              <option key={c} value={c}>
                {CHOICE_NAME[c]}
              </option>
            ))}
          </select>
        </div>
      ))}
      <table className="tc-ledger">
        <caption>What each attacker gets</caption>
        <thead>
          <tr>
            <th scope="col">Message</th>
            <th scope="col">Sent</th>
            <th scope="col">Lost</th>
          </tr>
        </thead>
        <tbody>
          {runPlan(p).map(r => (
            <tr key={r.id} data-message={r.id}>
              <th scope="row">{nameOf(r.id)}</th>
              <td>{CHOICE_NAME[r.choice]}</td>
              <td className={r.losses.length ? 'bad' : 'ok'}>{r.losses.length ? r.losses.join('; ') : 'Nothing'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note ek-note">The messages and attackers are written for this site.</p>
    </div>
  );
}

export default function LockSignOrBoth() {
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
          <EncryptionStage
            say={say}
            show={{
              scene: sceneOf(p),
              caption: `${MESSAGES.length} messages in the open: ${lostBy(p)} lost.`,
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
            <Fact id="ml-kem" />
            <Fact id="ir8547" />
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
