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
import { DOMAINS, REFUND_POLICY, metrics, stepsOf, type CaseId, type Run, type Setup } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, GuardStage, email, guardProps, runCached, says, sender } from './kit';

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
    'Over-refusal is a failure too. A setting is judged on attacks stopped and on fair requests refused, both counted over the same suite.',
  why: [
    `Only one side is counted. In this chapter the strict setting stopped every push and refused ${sender(REFUND)}’s fair refund: a customer left without their money is a failure too.`,
    'Right. A refusal is cheap to count when it is wrong for an attacker and easy to miss when it is wrong for a customer. Count both, over the same suite, and the cost of being strict shows.',
    `The discount push scored ${email(DISCOUNT).score}: it isn’t an injection at all, so an injection detector has nothing to catch. And a filter doesn’t change what the refund check refuses.`,
    'The model was helpful: it asked for the refund. The host’s check refused it. A rule in the prompt can’t override a host setting.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'discount',
    focus: 'p1',
    visibleControls: ['mail', 'p1'],
    narration: `No planted note this time. The customer writing is the attacker: ${sender(DISCOUNT)} pushes for money they are not owed, and with no checks the assistant pays it. ${fact('direct-injection').claim} This one doesn’t even look like an attack: it asks politely. Before you add a check:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'output-check',
    focus: 'output',
    visibleControls: ['out1', 'output', 'status'],
    narration: `An output policy check runs in the host, after the model asks for a refund and before it is paid. Larkspur’s rule: ${REFUND_POLICY} The model never sees the rule; it only hears that the refund was stopped. Turn the check on.`,
    predicate: s => s.outputPolicy === 'on',
    hint: 'Press “Output policy check: on”.',
  },
  {
    id: 'off-topic',
    focus: 'open',
    visibleControls: ['status', 'open'],
    narration: `The refund was stopped, and the model told ${sender(DISCOUNT)} it had passed the request on. But the output check only looks at refunds. ${sender(OFFTOPIC)} asks for something else entirely. Open their email.`,
    predicate: s => s.kase === OFFTOPIC,
    hint: `Press “Open ${sender(OFFTOPIC)}’s email”.`,
  },
  {
    id: 'input-check',
    focus: 'input',
    visibleControls: ['mail', 'input', 'status'],
    narration:
      'The assistant wrote their newsletter. The words are harmless, but it isn’t Larkspur’s job, and every reply goes out in Larkspur’s name. An input policy check reads each email before the model does and turns away anything outside what the assistant is for. The model then sees only that the email was refused, and answers politely. Turn it on.',
    predicate: s => s.kase === OFFTOPIC && s.inputPolicy,
    hint: 'Press “Input policy check: on”.',
  },
  {
    id: 'strict',
    focus: 'p2',
    visibleControls: ['status', 'p2'],
    narration: 'Turned away before the model read a word of it. Both pushes are stopped. Now finance asks for more.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'over-refusal',
    focus: 'output',
    visibleControls: ['out2', 'mail', 'output', 'status'],
    narration: `${sender(REFUND)}’s email is open, with the output check on. Set it to strict and watch the fair refund.`,
    setup: s => ({ ...s, kase: REFUND }),
    predicate: s => s.kase === REFUND && s.outputPolicy === 'strict',
    hint: 'Press “Strict: every refund to a person”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['cost', 'quiz'],
    narration: `Strict stopped the discount, and it refused ${sender(REFUND)}’s fair refund too. Nobody attacked; a real customer was turned away. That is a false block, and it counts like any other: the table runs all three emails under each setting. One question to finish.`,
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
      stage={({ state, inspect }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps(state)} inspect={inspect} />;
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
                <Fact id="owasp-llm01" />
              </>
            );
          },
        },
      }}
    />
  );
}
