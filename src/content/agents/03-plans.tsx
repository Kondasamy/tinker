// Chapter 3: plans. The cracked printer again, stock out: with plan mode on the model writes its steps on the clipboard
// first, and the stock-out makes it change course (one item struck, one added). With approval on, a person approves the
// plan once instead of every call, and the change comes back to them. Then a planted line in a customer's email asks for
// a second refund: the plan shows it, and the reader approves or rejects it. Every outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { AGENT_PARTS, agentState } from '../../components/scenes/agentScene';
import { answerOf, keyOf, run, stepsOf, type Decision, type Run } from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { money } from '../../lib/format';
import { moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Ledger, Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Fact } from './kit';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '03-plans';
const REC = RECORDINGS[ID];
type Case = 'damaged' | 'planted';
// every sequence of answers a reader can give here: each run ends waiting, or done, within two
const SEQS: Decision[][] = [
  [],
  ['approve'],
  ['reject'],
  ['approve', 'approve'],
  ['approve', 'reject'],
  ['reject', 'approve'],
  ['reject', 'reject'],
];
const OFF = run(REC, { case: 'damaged', stock: 'out' });
const ON = run(REC, { case: 'damaged', stock: 'out', plan: true });
const RUNS: Record<string, Run> = Object.fromEntries(
  (['damaged', 'planted'] as Case[]).flatMap(c =>
    SEQS.map(d => [`${c}:${d}`, run(REC, { case: c, stock: 'out', plan: true, approval: 'plan', decide: d })]),
  ),
);
const R = (c: Case, d: Decision[]) => RUNS[`${c}:${d}`];
const PLAIN = run(REC, { case: 'planted' }); // the planted email with no plan and no approver

/** `issue_refund:1043` → `issue_refund for order 1043` */
const item = (k: string) => k.replace(':', ' for order ');
const refunded = (r: Run, id: number) => r.orders.find(o => o.id === id)!.refunds.reduce((s, x) => s + x.amount, 0);
const pending = (r: Run) => (r.status === 'waiting' ? stepsOf(r, 'approval').at(-1)!.items : []);

const PLAN = stepsOf(ON, 'plan')[0];
const CHANGE = stepsOf(ON, 'proposal').find(p => !PLAN.items.includes(keyOf(p.call)))!;
const STRUCK = agentState({ run: ON })
  .plan!.rows.filter(r => r.struck)
  .map(r => r.item);
const ASKED = pending(R('damaged', ['approve']))[0];
const PLANTED = stepsOf(R('planted', []), 'plan')[0];
const EXTRA = 1043,
  GUARD = moduleOf('guardrails');

interface S {
  plan: boolean;
  ran: boolean;
  approval: boolean;
  kase: Case;
  dd: Decision[];
  pd: Decision[];
  p1: number | null;
  p2: number | null;
  p3: number | null;
  quiz: number | null;
}
const current = (s: S): Run =>
  s.kase === 'planted' ? R('planted', s.pd) : s.approval ? R('damaged', s.dd) : s.plan ? ON : OFF;
// before the plain runs play, the picture shows their first turn: a call with plan mode off, the plan with it on
const shownOf = (s: S) => (s.kase === 'damaged' && !s.approval && !s.ran ? 2 : current(s).steps.length);

const P1 = {
  question: `The plan says “${item(PLAN.items[2])}”. Then check_stock says the printer is out. What does the agent do?`,
  options: [
    'Sticks to the plan: it tries the replacement anyway',
    'Stops: the plan can no longer be followed',
    'Changes the plan: drops the replacement and does something else',
    'Throws the plan away and carries on with none',
  ],
};
const OUT1 = stepsOf(ON, 'call').some(c => c.call.name === 'create_replacement')
  ? 0
  : ON.status !== 'done'
    ? 1
    : CHANGE
      ? 2
      : 3;

const P2 = {
  question:
    'Now a person approves the plan before it runs. They approve this same plan, and the stock is still out. What happens when the agent changes course?',
  options: [
    'The change just runs: the person already approved the plan',
    'The change comes back to the person: it was not in the plan they approved',
    'The host blocks the change: approved plans cannot change',
    'The agent asks the person about every call from then on',
  ],
};
const A = R('damaged', ['approve']);
const OUT2 =
  A.status === 'waiting' && !PLAN.items.includes(ASKED)
    ? 1
    : stepsOf(A, 'call').some(c => !PLAN.items.includes(keyOf(c.call)))
      ? 0
      : 2;

const P3 = {
  question: `You are the person approving. If you approve this plan as written, what happens to order ${EXTRA}?`,
  options: [
    `It is refunded: the agent does what the approved plan says`,
    'It is not refunded: the host can tell the line came from the email',
    'It is not refunded: the model spots the trick when it acts',
    `You are asked again before order ${EXTRA} is refunded`,
  ],
};
const PA = R('planted', ['approve']);
const OUT3 = refunded(PA, EXTRA) > 0 ? 0 : stepsOf(PA, 'approval').length > 1 ? 3 : 1;

export const QUIZ = {
  question:
    'Larkspur’s buying agent plans a restock: check three suppliers’ prices, then order from the cheapest. The buyer approves the plan. Halfway through, one supplier’s site is down, and the agent wants to try a fourth supplier the plan did not name. Approval is on. What should the host do?',
  options: [
    'Run it: the buyer approved the plan, and this is close enough',
    'Bring it back to the buyer: the call is outside the plan they approved',
    'Stop the run: an approved plan can never change',
    'Let the model decide whether the change needs the buyer',
  ],
  correct: 1,
  explanation: 'Approving a plan approves those steps. A step outside it goes back to the person before it runs.',
  why: [
    `Close enough is how a planted line gets through: in the printer case the host brought ${item(ASKED)} back to you before it ran.`,
    'Right: the person approves the plan once instead of every call, and anything new comes back to them.',
    `Plans have to change when a result surprises the agent, as the stock-out made it drop ${item(STRUCK[0])}, so the host lets it change and asks the person first.`,
    'The model is the one asking for the change, so it cannot be the one who signs it off.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan-on',
    focus: 'plan',
    visibleControls: ['plan'],
    opensDrawer: 'plan',
    narration: 'Plan mode asks the model to write its steps on the clipboard before it calls anything.',
    act: 'Turn plan mode on.',
    say: { block: 'model', text: 'Plans first' },
    predicate: s => s.plan,
    hint: 'Press “Plan mode: on”.',
  },
  {
    id: 'predict-surprise',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The first turn is now a plan of ${PLAN.items.length} items, written before any tool ran. It does not know the printer is out.`,
    act: 'Predict first.',
    say: { block: 'plan', text: 'Written first' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-plan',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Each item gets a tick on the clipboard when its call comes back.',
    act: 'Run the plan.',
    predicate: s => s.ran,
    hint: 'Press “Run the plan”.',
  },
  {
    id: 'predict-approval',
    focus: 'p2',
    visibleControls: ['out1', 'p2'],
    opensDrawer: null,
    narration: `Stock was out, so the agent had to re-plan: ${item(STRUCK[0])} struck, ${item(keyOf(CHANGE.call))} added. Nobody checked the change.`,
    act: 'Predict first.',
    say: { block: 'plan', text: 'Re-planned' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'approve-plan',
    focus: 'approval',
    visibleControls: ['p2', 'approval'],
    narration: 'Plan approval is on, and you are the person. The same plan comes to you before anything runs.',
    act: 'Read it, then approve it.',
    say: { block: 'plan', text: 'Waits for you' },
    predicate: s => s.dd.length > 0,
    hint: 'Press “Approve”.',
  },
  {
    id: 'back-for-approval',
    focus: 'approval',
    visibleControls: ['out2', 'approval'],
    narration: `The agent changed course again, and ${item(ASKED)} came back to you: it is not in the approved plan.`,
    act: 'Approve or reject it.',
    say: { block: 'plan', text: 'Not in the plan' },
    predicate: s => R('damaged', s.dd).status !== 'waiting',
    hint: 'Press “Approve” or “Reject”.',
  },
  {
    id: 'approved-once',
    focus: 'next',
    visibleControls: ['approval', 'next'],
    narration: 'You approved one plan and one change, not every call. Anything outside the plan goes back to a person.',
    act: 'Next case.',
    predicate: s => s.kase === 'planted',
  },
  {
    id: 'predict-planted',
    focus: 'p3',
    visibleControls: ['p3'],
    opensDrawer: 'email',
    narration: `A new email hides a line telling the agent to refund order ${EXTRA} too: prompt injection. With no plan, it refunded ${money(refunded(PLAIN, EXTRA))} unseen.`,
    act: 'Predict first.',
    say: { block: 'plan', text: 'Planted item' },
    predicate: s => s.p3 !== null,
  },
  {
    id: 'decide-planted',
    focus: 'approval',
    visibleControls: ['p3', 'approval'],
    narration: 'If you reject the plan, the agent writes a new one and asks you again.',
    act: 'Approve it as written, or reject it.',
    predicate: s => R('planted', s.pd).status !== 'waiting',
    hint: 'Press “Approve” or “Reject”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out3', 'approval', 'ledger', 'other', 'guard', 'quiz'],
    narration: `Approved, order ${EXTRA} is refunded; rejected, it keeps its money. Approval helped only because a person read the plan.`,
    act: 'Try the other choice, then answer.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the person approve: the plan, or every step the agent might take?',
  },
];

/** The plan waiting on the person, with the answers they can give. The first plan in the printer case is approve-only:
 * the reader has just seen it work. */
function Approval({ s, sync }: { s: S; sync: (s: S) => void }) {
  const r = current(s),
    items = pending(r),
    field = s.kase === 'planted' ? 'pd' : 'dd';
  const decide = (d: Decision) => sync({ ...s, [field]: [...s[field], d] });
  if (!items.length)
    return (
      <p className="tc-status" role="status">
        The agent: “{answerOf(r)}”
      </p>
    );
  const reject = !(s.kase === 'damaged' && s.dd.length === 0);
  return (
    <div className="tc-status">
      <p style={{ margin: 0 }}>
        <strong>{items.length === 1 ? 'A change, waiting for you:' : 'The plan, waiting for you:'}</strong>
      </p>
      <ol style={{ margin: '4px 0 10px' }}>
        {items.map(i => (
          <li key={i}>{item(i)}</li>
        ))}
      </ol>
      <div role="group" aria-label="Your decision" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="big" onClick={() => decide('approve')}>
          Approve
        </button>
        {reject && (
          <button type="button" className="big" onClick={() => decide('reject')}>
            Reject
          </button>
        )}
      </div>
    </div>
  );
}

export default function Plans() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        plan: false,
        ran: false,
        approval: false,
        kase: 'damaged',
        dd: [],
        pd: [],
        p1: null,
        p2: null,
        p3: null,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <AgentStage
          run={current(state)}
          upTo={shownOf(state)}
          props={{ clipboard: true }}
          inspect={inspect}
          say={say}
        />
      )}
      controls={{
        plan: ({ state, sync }) => (
          <div role="group" aria-label="Plan mode" style={{ display: 'flex', gap: 8 }}>
            {[false, true].map(on => (
              <button
                key={String(on)}
                type="button"
                className="chip"
                aria-pressed={state.plan === on}
                onClick={() => sync({ ...state, plan: on })}
              >
                Plan mode: {on ? 'on' : 'off'}
              </button>
            ))}
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => (
          <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i, approval: true })} />
        ),
        p3: ({ state, apply }) => <Predict {...P3} value={state.p3} onPredict={i => apply({ ...state, p3: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        out3: ({ state }) => <Outcome {...P3} prediction={state.p3} outcome={OUT3} />,
        run: ({ state, sync }) => (
          <>
            {!state.ran && (
              <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
                Run the plan
              </button>
            )}
            {state.ran && (
              <p className="tc-status" role="status">
                The agent: “{answerOf(ON)}”
              </p>
            )}
          </>
        ),
        approval: ({ state, sync }) => <Approval s={state} sync={sync} />,
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, kase: 'planted' })}>
            Next case: an email with a planted line →
          </button>
        ),
        ledger: ({ state }) => <Ledger after={current(state).orders} ids={[1042, EXTRA]} />,
        other: ({ state, sync }) => {
          const approved = state.pd[0] === 'approve';
          return (
            <button
              type="button"
              className="big"
              onClick={() => sync({ ...state, pd: approved ? ['reject', 'approve'] : ['approve'] })}
            >
              Try the other choice: {approved ? 'reject the plan' : 'approve it as written'}
            </button>
          );
        },
        guard: () => (
          <p className="tc-status">
            One planted line is the simplest kind of prompt injection, and a person reading plans is only one defence.
            They get a module of their own: <a href={`/${GUARD.id}/`}>{GUARD.title}</a>.
          </p>
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
      inspectPanel="messages"
      panels={{
        plan: {
          title: 'The plan',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The task</p>
              <p>{REC.asks.damaged}</p>
              <p className="lbl">The plan, written before any tool ran</p>
              <ol>
                {PLAN.items.map(i => (
                  <li key={i}>{item(i)}</li>
                ))}
              </ol>
              <Fact id="ground-truth" />
            </div>
          ),
        },
        email: {
          title: 'The email',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The customer’s email, as the agent reads it</p>
              <p>{REC.asks.planted}</p>
              <p className="lbl">The agent’s plan</p>
              <ol>
                {PLANTED.items.map(i => (
                  <li key={i}>{item(i)}</li>
                ))}
              </ol>
              <Fact id="human-checkpoints" />
            </div>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={shownOf(s)} />
                <Fact id="agent-costs" />
              </>
            );
          },
        },
      }}
    />
  );
}
