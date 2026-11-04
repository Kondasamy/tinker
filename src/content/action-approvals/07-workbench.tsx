// Chapter 7: the workbench (R6b.7). Three rules over a hand-written week of eight letters: who waits for a yes, the day's
// budget and how long a yes lasts. Each change replays the week with the hand-set approver deciding, and the bench
// scores harm stopped, good refunds paid and prompts shown. The puzzle: stop all harm and pay every good refund with
// the fewest prompts; "Show me" applies one of WINNERS (computed in gate.ts, pinned in tests). Settings are step state.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { TOLL_PARTS } from '../../components/scenes/tollScene';
import { fact } from '../../lib/action-approvals/facts';
import {
  ASKS,
  BUDGETS,
  EXPIRIES,
  FATIGUE,
  WEEK,
  WINNERS,
  isWinner,
  simulate,
  type Ask,
  type Expiry,
  type Policy,
} from '../../lib/action-approvals/gate';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ApprovalsStage, Fact, rowsOf, tollOf, ToyNote } from './kit';

const MODULE = 'action-approvals',
  ID = '07-workbench';
interface S extends Policy {
  quiz: number | null;
}
export const START: Policy = { ask: 'all', budget: null, expiry: 'forever' };
/** every rule set that wins (tests/unit/action-approvals.test.ts recomputes them); Show me applies the first */
export { WINNERS };
export const SOLUTION = WINNERS[0];
const HARM = WEEK.filter(l => l.harm).map(l => l.id);
const ASK_NAME: Record<Ask, string> = { none: 'Nobody waits', dyed: 'Dyed refunds wait', all: 'Every refund waits' };
const EXPIRY_NAME: Record<Expiry, string> = { forever: 'Forever', hour: 'One hour, one order' };
const budgetName = (b: number | null) => (b === null ? 'No limit' : `£${b} a day`);
const policy = (s: S): Policy => ({ ask: s.ask, budget: s.budget, expiry: s.expiry });
const START_RUN = simulate(START);

export const QUIZ = {
  question:
    'A team’s assistant asks a person about every action, and harm still gets through. What is the best next step?',
  options: [
    'Ask only about actions carrying outside text, and cap the day’s total',
    'Ask about every action twice',
    'Stop asking: people don’t read the prompts anyway',
  ],
  correct: 0,
  explanation: fact('human-loop').claim,
  why: [
    'Right: fewer, sharper prompts get read, and the cap stops what no single prompt shows.',
    'Twice the prompts wear people out twice as fast, so even less gets read.',
    'With no one asked and no limits, every order in outside text runs.',
  ],
};

export const PARTS = TOLL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['bench', 'readout'],
    narration: `A hand-written week: ${WEEK.length} refunds, ${HARM.length} of them harm. With every refund waiting, ${START_RUN.harm.total - START_RUN.harm.stopped} still get through.`,
    act: 'Change any rule to start.',
    say: { block: 'paid', text: 'Harm got paid' },
    status: 'The week replays under your rules: harm marked red wherever it landed.',
    predicate: s => s.ask !== START.ask || s.budget !== START.budget || s.expiry !== START.expiry,
    hint: 'Pick a different choice in any of the three menus.',
  },
  {
    id: 'tune',
    focus: 'bench',
    visibleControls: ['bench', 'readout'],
    narration: 'Score: harm stopped, good refunds paid, and prompts Rosa must answer.',
    act: 'Stop all harm and pay every good refund, with the fewest prompts.',
    say: { block: 'stopped', text: 'All harm here' },
    status: 'Every harmful refund lies in the stopped tray, every good one in the paid bin.',
    predicate: s => isWinner(policy(s)),
    hint: 'Ask only about dyed refunds, cap the day at the size of a normal day’s refunds, and let a yes last an hour.',
    solution: s => ({ ...s, ...SOLUTION }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'readout', 'fact', 'quiz'],
    narration:
      'Dye picks which refunds need a person, the budget catches what adds up, and short passes can’t be reused.',
    act: 'One question to finish.',
    status: 'The week ends with all harm stopped and Rosa asked as little as possible.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What made the prompts get read again?',
  },
];

function Readout({ s }: { s: S }) {
  const r = simulate(policy(s)),
    win = isWinner(policy(s));
  return (
    <div data-harm={r.harm.stopped} data-good={r.good.paid} data-prompts={r.prompts} data-win={win ? '1' : '0'}>
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>The week under your rules</caption>
        <tbody>
          <tr>
            <th scope="row">Harm stopped</th>
            <td>
              {r.harm.stopped} of {r.harm.total}
            </td>
          </tr>
          <tr>
            <th scope="row">Good refunds paid</th>
            <td>
              {r.good.paid} of {r.good.total}
            </td>
          </tr>
          <tr>
            <th scope="row">Prompts for Rosa</th>
            <td>{r.prompts}</td>
          </tr>
        </tbody>
      </table>
      <p className="tc-status">
        <strong>
          {win
            ? `All harm stopped, every good refund paid, with the fewest prompts: ${r.prompts}.`
            : r.harm.stopped < r.harm.total
              ? `${r.harm.total - r.harm.stopped} harmful refunds got paid.`
              : r.good.paid < r.good.total
                ? `${r.good.total - r.good.paid} good refunds were stopped.`
                : `Clean, but ${r.prompts} prompts: fewer is possible.`}
        </strong>
      </p>
      <ToyNote>The week’s approver reads only the first {FATIGUE} prompts of a day closely.</ToyNote>
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, closeUp }) => {
        const r = simulate(policy(state));
        return (
          <ApprovalsStage
            scene={tollOf(r.desk, { p: policy(state), dye: true, next: [], bad: HARM, marked: HARM, up: false })}
            rows={rowsOf(r.desk, true)}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        bench: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <div className="ap-bench">
              <label>
                <span>Who waits for a yes</span>
                <Select
                  aria-label="Who waits for a yes"
                  value={state.ask}
                  onChange={e => set({ ...state, ask: e.target.value as Ask })}
                >
                  {ASKS.map(a => (
                    <option key={a} value={a}>
                      {ASK_NAME[a]}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>Day’s budget</span>
                <Select
                  aria-label="Day’s budget"
                  value={String(state.budget)}
                  onChange={e => set({ ...state, budget: e.target.value === 'null' ? null : Number(e.target.value) })}
                >
                  {BUDGETS.map(b => (
                    <option key={String(b)} value={String(b)}>
                      {budgetName(b)}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>A yes lasts</span>
                <Select
                  aria-label="A yes lasts"
                  value={state.expiry}
                  onChange={e => set({ ...state, expiry: e.target.value as Expiry })}
                >
                  {EXPIRIES.map(x => (
                    <option key={x} value={x}>
                      {EXPIRY_NAME[x]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          );
        },
        readout: ({ state }) => <Readout s={state} />,
        fact: () => <Fact id="human-loop" />,
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
