// Chapter 7: the workbench. One native control per host rule (protected test files, the allow-list, ask first); under
// them a row per ticket in the queue, and a live count of questions to a person against the best. The puzzle accepts
// every pinned winner (WINNERS); Show me applies one. The stage replays the first ticket that goes wrong under the
// rules, or the push once none does.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { metrics, ticketOf, type Policy } from '../../lib/coding-agents/loop';
import { isWinner, policyOf, WINNERS } from '../../lib/coding-agents/workbench';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { beatsOf, CaStage, Fact, RecordedNote, type CaView } from './kit';

const MODULE = 'coding-agents',
  ID = '07-workbench';
export const PARTS = DESK_PARTS;
/** where the team started: no host rules */
export const START: Policy = policyOf({});
export const BEST = metrics(WINNERS[0]).prompts;
const TICKETS = metrics(START).tickets;

export interface S {
  policy: Policy;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'A team’s coding agent works through tickets overnight. Which setup matches what the workbench showed?',
  options: [
    'Protected tests, an allow-list, and ask first for anything that leaves the machine',
    'A prompt telling the agent never to cheat or force push',
    'Ask a person about every command it runs',
  ],
  correct: 0,
  explanation: 'Each failure had its own host rule, and asking only where it matters keeps people’s time for those.',
  why: [
    'Right: each rule closes one failure, and only the push needs a person.',
    'A prompt is advice the agent can talk itself out of; the rules have to live in the host.',
    'Asking about every command buries people in prompts, and they stop reading them.',
  ],
};

const caseName = (c: string) => {
  const t = ticketOf(c);
  return `${t.id} (${t.from}): ${t.says}`;
};

export const STEPS: Step<S>[] = [
  {
    id: 'policy',
    focus: 'policy',
    visibleControls: ['score', 'policy'],
    narration: `Start: no host rules. The best rules get all ${TICKETS} tickets really done, asking a person ${BEST} time${BEST === 1 ? '' : 's'}.`,
    act: 'Set the host rules on the workbench.',
    say: { block: 'lamps', text: 'Your rules' },
    predicate: s => isWinner(s.policy),
    hint: 'Each of chapters 5 and 6 added one rule. Try all of them.',
    solution: s => ({ ...s, policy: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'policy', 'facts', 'quiz'],
    narration:
      'Every rule lives in the host, not the agent. Ask rarely: real people stop reading prompts they see often.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which fixes held whatever the agent decided?',
  },
];

function Score({ policy }: { policy: Policy }) {
  const m = metrics(policy),
    best = isWinner(policy);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-prompts={m.prompts}>
      <p className="ca-headline">
        <strong>
          {m.right} of {m.tickets}
        </strong>{' '}
        tickets really done · {m.prompts} question{m.prompts === 1 ? '' : 's'} to a person
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST ASKS ${BEST}`}</span>
      </p>
      {best && <p className="ca-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your rules, ticket by ticket</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Result</th>
            <th scope="col">Asked</th>
          </tr>
        </thead>
        <tbody>
          {m.runs.map(r => (
            <tr key={r.case} data-case={r.case} data-ok={r.right ? '1' : '0'}>
              <th scope="row">{caseName(r.case)}</th>
              <td>
                <span className={`stamp ${r.right ? 'correct' : 'wrong'}`}>{r.right ? 'DONE' : 'NOT DONE'}</span>
              </td>
              <td>{r.prompts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <RecordedNote />
    </div>
  );
}

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const m = metrics(policyOf(state.policy)),
    bad = m.runs.find(r => !r.right),
    r = bad ?? m.runs.at(-1)!;
  return (
    <CaStage
      run={r}
      at={beatsOf(r).length}
      say={say}
      view={state.tab}
      onView={tab => sync({ ...state, tab })}
      caption={`${ticketOf(r.case).id}: ${bad ? 'not really done under your rules.' : 'done, and so is every other ticket.'}`}
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
        // changing the rules is an attempt only while it is the puzzle
        policy: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = policyOf(state.policy);
          const box = (k: keyof Policy, label: string) => (
            <label className="tc-check">
              <input
                type="checkbox"
                checked={p[k]}
                onChange={e => set({ ...state, policy: { ...p, [k]: e.currentTarget.checked } })}
              />{' '}
              {label}
            </label>
          );
          return (
            <div className="ca-bench">
              {box('protect', 'Protect test files')}
              {box('allow', 'Allow-list: refuse the never list')}
              {box('ask', 'Ask a person before the rest')}
            </div>
          );
        },
        facts: () => <Fact id="approvals" />,
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
