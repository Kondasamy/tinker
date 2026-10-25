// Chapter 7: the workbench. One native control per host setting (screenshot size, the wait rule, the allow-list,
// confirmation); under them a row per case, both re-orders and both attacks, and a live token total against the best.
// The puzzle accepts every pinned winner (WINNERS); Show me applies one. The stage replays the first case that goes
// wrong under the policy, or the planted notice once nothing does.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ATTACKS, isAttack, metrics, TASKS, type Policy } from '../../lib/computer-use/loop';
import { SIZES, type Size } from '../../lib/computer-use/screens';
import { isWinner, policyOf, WINNERS } from '../../lib/computer-use/workbench';
import { PUPPET_PARTS } from '../../components/scenes/puppetScene';
import { beatsOf, CuStage, RecordedNote, thousands, type CuView } from './kit';

const MODULE = 'computer-use',
  ID = '07-workbench';
export const PARTS = PUPPET_PARTS;
/** where the team started: full-size screenshots and no host rules */
export const START: Policy = policyOf({ size: SIZES[SIZES.length - 1] });
export const BEST = metrics(WINNERS[0]).tokens;

export interface S {
  policy: Policy;
  tab: CuView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'A team’s agent fills in supplier forms. Which policy matches what the workbench showed?',
  options: [
    'Host rules for timing, sites and payments, and the smallest screenshot that still hits its targets',
    'The biggest screenshots, so the agent never misses, and no other rules',
    'A careful prompt telling the agent to wait, stay on the site and never pay for extras',
  ],
  correct: 0,
  explanation: 'Each failure had its own host rule, and the size is a trade between cost and aim.',
  why: [
    'Right: the wait rule, the allow-list and confirmation each close one failure, and the size is set by cost and aim.',
    'Big screenshots fix the aim but cost the most and stop no attack.',
    'A prompt is advice the page itself can override; the rules have to live in the host.',
  ],
};

const caseName = (id: string) =>
  isAttack(id) ? `Attack: ${ATTACKS.find(a => a.case === id)!.says}` : `Task: ${TASKS.find(t => t.case === id)!.says}`;

export const STEPS: Step<S>[] = [
  {
    id: 'policy',
    focus: 'policy',
    visibleControls: ['score', 'policy'],
    narration: `Start: ${START.size}-pixel screenshots, no host rules. The best policy finishes both re-orders and stops both attacks at ${thousands(BEST)} tokens.`,
    act: 'Change the policy on the workbench.',
    say: { block: 'screen', text: 'Your policy' },
    predicate: s => isWinner(s.policy),
    hint: 'Each chapter fixed one failure. Then try each size.',
    solution: s => ({ ...s, policy: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'policy', 'quiz'],
    narration: 'Every rule lives in the host, not in the agent. The size trades tokens against aim.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which fixes held whatever the page said?',
  },
];

function Score({ policy }: { policy: Policy }) {
  const m = metrics(policy),
    best = isWinner(policy);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-tokens={m.tokens}>
      <p className="cu-headline">
        <strong>
          {m.tasks - m.failed} of {m.tasks}
        </strong>{' '}
        re-orders right · {m.succeeded} of {m.attacks} attacks got through · {thousands(m.tokens)} tokens
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${thousands(BEST)}`}</span>
      </p>
      {best && <p className="cu-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your policy, case by case</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Result</th>
            <th scope="col">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {m.runs.map(r => {
            const ok = isAttack(r.case) ? !r.attackMet : r.caseDone;
            return (
              <tr key={r.case} data-case={r.case} data-ok={ok ? '1' : '0'}>
                <th scope="row">{caseName(r.case)}</th>
                <td>
                  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>
                    {isAttack(r.case) ? (ok ? 'STOPPED' : 'GOT THROUGH') : ok ? 'RIGHT' : 'WRONG'}
                  </span>
                </td>
                <td>{thousands(r.tokens)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <RecordedNote />
    </div>
  );
}

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const m = metrics(policyOf(state.policy)),
    bad = m.runs.find(r => (isAttack(r.case) ? r.attackMet : !r.caseDone)),
    r = bad ?? m.runs.find(x => x.case === ATTACKS[0].case)!;
  return (
    <CuStage
      run={r}
      at={beatsOf(r).length}
      say={say}
      view={state.tab}
      onView={tab => sync({ ...state, tab })}
      caption={`${caseName(r.case)}. ${bad ? 'This case goes wrong under your policy.' : 'Stopped, and every re-order is right.'}`}
      stamp={bad ? 'FAIL' : 'PASS'}
    />
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ policy: START, tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        score: ({ state }) => <Score policy={policyOf(state.policy)} />,
        // changing the policy is an attempt only while it is the puzzle
        policy: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = policyOf(state.policy);
          const change = (c: Partial<Policy>) => set({ ...state, policy: { ...p, ...c } });
          const box = (k: 'wait' | 'allow' | 'confirm', label: string) => (
            <label className="cu-check">
              <input type="checkbox" checked={p[k]} onChange={e => change({ [k]: e.currentTarget.checked })} /> {label}
            </label>
          );
          return (
            <div className="cu-bench">
              <label>
                Screenshot size{' '}
                <select value={p.size} onChange={e => change({ size: Number(e.currentTarget.value) as Size })}>
                  {SIZES.map(z => (
                    <option key={z} value={z}>
                      {z} px wide
                    </option>
                  ))}
                </select>
              </label>
              {box('wait', 'Wait for the page to settle')}
              {box('allow', 'Allow only Brightwater’s portal')}
              {box('confirm', 'Ask a person before paying')}
            </div>
          );
        },
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
