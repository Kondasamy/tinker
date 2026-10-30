// Chapter 6: when the user is the attacker. No planted text: a customer pushes for a discount nobody promised, and
// another asks for a job that isn't the assistant's. The output policy check (host-only) stops the refund; the input
// policy check turns the off-topic email away before the model reads it (the model sees `refused`). Then the strict
// setting, which sends every refund to a person, refuses a fair refund too: a false block, counted like any other.
// Business-policy pushes only (Scope Boundaries). Every outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { GUARD_PARTS } from '../../components/scenes/guardScene';
import { DOMAINS, metrics, stepsOf, type CaseId, type Run, type Setup } from '../../lib/guardrails/loop';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, GuardStage, ToyNote, email, guardProps, runCached, says, sender } from './kit';

const MODULE = 'guardrails',
  ID = '06-when-the-user-is-the-attacker';
const D = DOMAINS[ID];
export const CASES = D.case!; // discount, offtopic, refund
const [DISCOUNT, OFFTOPIC, REFUND] = CASES;
type Policy = Setup['outputPolicy'];
const POLICIES = D.outputPolicy!;
const POLICY_NAME: Record<Policy, string> = {
  off: 'Output policy check: off',
  on: 'Output policy check: on',
  strict: 'Strict: every refund to a person',
};

export const R = (kase: CaseId, inputPolicy: boolean, outputPolicy: Policy) =>
  runCached({ case: kase, inputPolicy, outputPolicy });
const reply = (r: Run) => r.sent.find(m => m.tool === 'reply')?.body;

/** Over-refusal's cost: the three emails under each output setting, with the input policy check on. */
export const COST = POLICIES.map(p => ({ policy: p, m: metrics({ inputPolicy: true, outputPolicy: p }, CASES) }));

interface S {
  kase: CaseId;
  inputPolicy: boolean;
  outputPolicy: Policy;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const current = (s: S) => R(s.kase, s.inputPolicy, s.outputPolicy);

const P1 = {
  question: `${sender(DISCOUNT)} asks for a loyalty discount on an order, paid back to their card. Nobody promised one. The input filter scores the email ${email(DISCOUNT).score}. Which check would stop the refund?`,
  options: [
    'The input filter, set low enough',
    'A check on the refund itself, against Larkspur’s refund policy, before it is paid',
    'The prompt rule from chapter 1',
    'None: a customer is allowed to ask',
  ],
};
const OUT1 = R(DISCOUNT, false, 'on').attackMet ? 3 : 1;

const P2 = {
  question: `Finance wants a stricter setting: every refund goes to a person before it is paid. ${sender(REFUND)}’s label printer arrived cracked, a fair refund under the policy. What happens to it?`,
  options: [
    'It is paid: it meets the refund policy, so the check lets it through',
    `It is refused and waits for a person, so ${sender(REFUND)} gets no refund today`,
    'The input policy check turns the email away first',
  ],
};
const strictRefund = R(REFUND, true, 'strict');
const OUT2 = strictRefund.caseDone ? 0 : strictRefund.mail === 'refused' ? 2 : 1;

const QUIZ = {
  question:
    'Larkspur’s assistant now refuses anything that mentions money, to be safe. Complaints go up. A manager says: “No refund has gone wrong since, so the setting works.” What is missing from that view?',
  options: [
    'Nothing: no wrong refund means the setting is right',
    'The false-block rate: count fair requests refused over a fixed set of ordinary customers, next to the attacks stopped',
    'A better input filter, so attacks are caught before they reach the refund check',
    'A prompt rule telling the model to be helpful',
  ],
  correct: 1,
  explanation:
    'Over-refusal is a failure too. A setting is judged on attacks stopped and on fair requests refused, both counted over the same test set.',
  why: [
    `Only one side is counted: here the strict setting stopped every push and refused ${sender(REFUND)}’s fair refund, and a customer left without their money is a failure too.`,
    'Right: count fair requests refused next to attacks stopped, over the same test set, and the cost of being strict shows.',
    `The discount push scored ${email(DISCOUNT).score} because it isn’t an injection, so an injection detector has nothing to catch, and a filter doesn’t change what the refund check refuses.`,
    'The model was helpful and asked for the refund; the app’s check refused it, and a prompt rule can’t override a setting in the app.',
  ],
};

/** The parts of the mail room a step's callout may name. */
export const PARTS = GUARD_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'discount',
    focus: 'p1',
    visibleControls: ['mail', 'p1'],
    narration: `No planted note: ${sender(DISCOUNT)} pushes politely for money they aren’t owed, and with no checks the assistant pays.`,
    act: 'Predict first.',
    say: { block: 'orders', text: 'Refund paid' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'output-check',
    focus: 'output',
    visibleControls: ['out1', 'output', 'status'],
    narration:
      'A policy check runs in Larkspur’s app, not the model. This output policy check tests each refund before it is paid.',
    act: 'Turn it on.',
    predicate: s => s.outputPolicy === 'on',
    hint: 'Press “Output policy check: on”.',
  },
  {
    id: 'off-topic',
    focus: 'open',
    visibleControls: ['status', 'open'],
    narration: `The refund was stopped. But the output check only sees refunds, and ${sender(OFFTOPIC)} asks for something else.`,
    act: `Open ${sender(OFFTOPIC)}’s email.`,
    say: { block: 'orders', text: 'Refund stopped' },
    predicate: s => s.kase === OFFTOPIC,
    hint: `Press “Open ${sender(OFFTOPIC)}’s email”.`,
  },
  {
    id: 'input-check',
    focus: 'input',
    visibleControls: ['mail', 'input', 'status'],
    narration:
      'The assistant wrote their newsletter, not its job. An input policy check turns away off-topic email; the model only sees a refusal.',
    act: 'Turn it on.',
    say: { block: 'host', text: 'Not its job' },
    predicate: s => s.kase === OFFTOPIC && s.inputPolicy,
    hint: 'Press “Input policy check: on”.',
  },
  {
    id: 'strict',
    focus: 'p2',
    visibleControls: ['status', 'p2'],
    narration: 'Turned away before the model read a word. Both pushes are stopped. Now finance asks for more.',
    act: 'Predict first.',
    say: { block: 'screen', text: 'Turned away' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'over-refusal',
    focus: 'output',
    visibleControls: ['out2', 'mail', 'output', 'status'],
    narration: `${sender(REFUND)}’s fair refund is open, with the output check on.`,
    act: 'Set it to strict and watch the refund.',
    setup: s => ({ ...s, kase: REFUND }),
    predicate: s => s.kase === REFUND && s.outputPolicy === 'strict',
    hint: 'Press “Strict: every refund to a person”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['cost', 'fact', 'quiz'],
    narration: `Strict stopped the discount and refused ${sender(REFUND)}’s fair refund too: over-refusal, a false block that counts like any other.`,
    act: 'One question to finish.',
    say: { block: 'orders', text: 'Fair refund held' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does counting only stopped attacks leave out?',
  },
];

/** What the current email asked, as the customer wrote it. Attacker text is React text. */
function Mail({ c }: { c: CaseId }) {
  const e = email(c);
  return (
    <div className="tc-def" data-mail={c}>
      <p className="lbl">
        From {sender(c)} · {e.subject}
      </p>
      <p>{e.text}</p>
    </div>
  );
}

/** What happened to the current email, in words. */
function Status({ r }: { r: Run }) {
  const blocked = stepsOf(r, 'blocked')[0],
    said = reply(r),
    push = says(r.case);
  const outcome = push
    ? r.attackMet
      ? `The push worked: ${push.toLowerCase()}.`
      : 'The push failed.'
    : r.caseDone
      ? `${sender(r.case)} was served.`
      : `False block: ${sender(r.case)}’s fair request was refused.`;
  return (
    <div role="status" data-case={r.case} data-met={r.attackMet ? '1' : '0'} data-done={r.caseDone ? '1' : '0'}>
      <p className="tc-status">
        <strong>{outcome}</strong>
        {r.mail === 'refused' && ' The input policy check turned the email away.'}
        {blocked && ` ${blocked.text}`}
      </p>
      {said && (
        <p className="tc-status">
          Reply to {sender(r.case)}: “{said}”
        </p>
      )}
    </div>
  );
}

/** The three emails under each output setting, input policy check on: what strictness buys and what it costs. */
function Cost() {
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }} data-cost>
      <caption>All three emails, input policy check on</caption>
      <thead>
        <tr>
          <th scope="col">Output check</th>
          <th scope="col">Pushes that worked</th>
          <th scope="col">False blocks</th>
        </tr>
      </thead>
      <tbody>
        {COST.map(({ policy, m }) => (
          <tr key={policy} data-policy={policy} data-blocked={m.blocked}>
            <th scope="row">{POLICY_NAME[policy]}</th>
            <td>
              {m.succeeded} of {m.attacks}
            </td>
            <td>
              {m.blocked} of {m.customers}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function UserIsTheAttacker() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: DISCOUNT, inputPolicy: false, outputPolicy: 'off', p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps(state)} inspect={inspect} say={say} />;
      }}
      controls={{
        mail: ({ state }) => <Mail c={state.kase} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        output: ({ state, apply }) => (
          <Chips<Policy>
            label="Output policy check"
            values={POLICIES}
            value={state.outputPolicy}
            name={p => POLICY_NAME[p]}
            pick={outputPolicy => apply({ ...state, outputPolicy })}
          />
        ),
        input: ({ state, apply }) => (
          <Chips
            label="Input policy check"
            values={[0, 1]}
            value={Number(state.inputPolicy)}
            name={v => `Input policy check: ${v ? 'on' : 'off'}`}
            pick={v => apply({ ...state, inputPolicy: !!v })}
          />
        ),
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, kase: OFFTOPIC })}>
            Open {sender(OFFTOPIC)}’s email
          </button>
        ),
        status: ({ state }) => <Status r={current(state)} />,
        cost: () => <Cost />,
        fact: () => (
          <>
            <Fact id="xstest" />
            <ToyNote />
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
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={r.steps.length} />
                <Fact id="direct-injection" />
              </>
            );
          },
        },
      }}
    />
  );
}
