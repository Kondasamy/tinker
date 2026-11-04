// Chapter 4: budgets and stuck loops. The carrier's tracking lookup for order 1051 times out every time. With only the
// step budget, the agent retries until the budget ends the run, and the customer hears nothing; the token meter shows
// each retry costs more than the last. Then a puzzle: set the step budget and the repeat detector so the run stops early
// and the agent's last turn tells the customer the lookup failed. Every outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import { num as n } from '../../lib/format';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { CONTEXT, DOMAINS, combos, run, stepsOf, totalTokens, type Run } from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Chips, Fact, ToyNote } from './kit';
import { AGENT_PARTS } from '../../components/scenes/agentScene';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '04-budgets';
const REC = RECORDINGS[ID];
const DOMAIN = DOMAINS[ID],
  BUDGETS = DOMAIN.steps!,
  DETECTOR = DOMAIN.repeat!;
const [WIDE, , TIGHT] = BUDGETS; // 12, 8, 4: highest first
const RUNS: Record<string, Run> = Object.fromEntries(combos(DOMAIN).map(c => [`${c.steps}:${c.repeat}`, run(REC, c)]));
const R = (budget: number, detector: number | null) => RUNS[`${budget}:${detector}`];
const ON = DETECTOR.find(d => d !== null)!;
const OPEN = R(WIDE, null),
  SHORT = R(TIGHT, null);
// the "lookup failed" email, as recorded: the one send_email the model ever asks for in this case
const EMAIL = Object.values(REC.turns)
  .flatMap(t => t.calls ?? [])
  .find(c => c.name === 'send_email')!.arguments.body as string;
const ORDER = stepsOf(OPEN, 'call')[0].call.arguments.order_id as number;
const tries = (r: Run) => stepsOf(r, 'call').filter(c => c.call.name === 'track_shipment').length;
const ended = (r: Run) =>
  r.status === 'stuck' ? 'Stuck, customer told' : r.status === 'out-of-budget' ? 'Out of steps' : r.status;

interface S {
  ran: boolean;
  budget: number;
  detector: number | null;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const current = (s: S) => R(s.budget, s.detector);
/** the puzzle's goal: the run ends stuck, before the budget runs out, having sent the recorded email */
const fixed = (s: S) => {
  const r = current(s);
  return r.status === 'stuck' && r.meter.length < s.budget && r.mail.length === 1 && r.mail[0].body === EMAIL;
};
const WIN = Object.values(RUNS).find(r => r.status === 'stuck')!,
  FIRED = stepsOf(WIN, 'repeat')[0];

const P1 = {
  question: `The carrier’s lookup for order ${ORDER} times out, every time. The host has a step budget of ${WIDE} turns and no other rule. What does the agent do?`,
  options: [
    'Tries once, then tells the customer the lookup failed',
    'Tries a few times, then gives up and tells the customer',
    'Keeps retrying until the step budget stops it, and the customer hears nothing',
    'Waits until the carrier answers',
  ],
};
const OUT1 = OPEN.status === 'out-of-budget' && !OPEN.mail.length ? 2 : tries(OPEN) === 1 ? 0 : 1;

const P2 = {
  question: 'Every retry is the same call, and it fails the same way. How many tokens does each turn send the model?',
  options: [
    'The same each turn: it is the same call',
    'More each turn: every turn re-sends everything so far, the failed tries included',
    'Fewer each turn: the model already knows the tools',
  ],
};
const INPUTS = OPEN.meter.map(m => m.input);
const OUT2 = INPUTS.every((x, i) => i === 0 || x > INPUTS[i - 1]) ? 1 : INPUTS.every(x => x === INPUTS[0]) ? 0 : 2;

export const QUIZ = {
  question:
    'Larkspur’s restock agent asks a supplier’s price feed for today’s prices. The feed answers “server busy”, again and again. The buyer wants the run to stop wasting tokens and to hear that the prices are missing. Which host setting does that?',
  options: [
    'A smaller step budget, so the run ends sooner',
    'A repeat detector, with enough steps left for one more turn after it fires',
    'None: the model will notice it is stuck and stop by itself',
    'A bigger step budget, so the feed has time to come back',
  ],
  correct: 1,
  explanation:
    'A step budget ends a run with no last word. A repeat detector stops the failing call and gives the model one more turn to say what went wrong.',
  why: [
    `A smaller budget stops sooner, and silently: with ${TIGHT} steps, order ${ORDER}’s run used ${n(totalTokens(SHORT))} tokens instead of ${n(totalTokens(OPEN))}, and the customer still got no email.`,
    'Right: the detector turns the same failure, again and again, into one “stopped” result, and the model uses its last turn to tell someone.',
    `The model did not notice: on turn ${OPEN.meter.length} of the order ${ORDER} run it was still retrying the carrier.`,
    `More steps means more retries, and each one costs more than the last: the order ${ORDER} run’s last turn sent ${n(INPUTS.at(-1)!)} tokens, its first ${n(INPUTS[0])}.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-retry',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'case',
    narration: `Marlow Builders asks where order ${ORDER} is, but every carrier lookup ends in a timeout. The host’s only rule: a ${WIDE}-turn step budget.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-open',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'The gauge on the host’s desk counts turns against the budget.',
    act: 'Run the case.',
    say: { block: 'gauge', text: 'Turns vs budget' },
    predicate: s => s.ran,
    hint: 'Press “Run the case”.',
  },
  {
    id: 'predict-cost',
    focus: 'p2',
    visibleControls: ['out1', 'p2'],
    opensDrawer: null,
    narration: `The agent tried the carrier ${tries(OPEN)} times, until the budget stopped it. Marlow Builders got no email. That is a stuck loop.`,
    act: 'Predict first.',
    say: { block: 'gauge', text: 'Out of steps' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'tighter',
    focus: 'budget',
    visibleControls: ['out2', 'meter', 'fact', 'budget'],
    narration: `Each turn re-sends the whole case: turn 1 sent ${n(INPUTS[0])} tokens, turn ${INPUTS.length} sent ${n(INPUTS.at(-1)!)}, ${n(totalTokens(OPEN))} in all.`,
    act: `Set the budget to ${TIGHT} steps.`,
    say: { block: 'gauge', text: 'Grows each turn' },
    predicate: s => s.budget === TIGHT,
    hint: `Press “${TIGHT} steps”.`,
  },
  puzzle<S>({
    id: 'stop-early',
    focus: 'detector',
    visibleControls: ['meter', 'budget', 'detector', 'verdict'],
    narration: `${TIGHT} steps: sooner, still silent. A repeat detector stops a call that fails the same way ${ON} times running.`,
    act: 'Make the run tell the customer.',
    say: { block: 'gauge', text: 'Stops silently' },
    broken: s => ({ ...s, ran: true, budget: TIGHT, detector: null }),
    verdict: fixed,
    solution: s => ({ ...s, ran: true, budget: BUDGETS[1], detector: ON }),
    hint: `Turn the repeat detector on. Then leave the agent at least one turn after it fires: that turn is the email.`,
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['email', 'compare', 'quiz'],
    narration: `The detector stopped ${FIRED.call.name} after ${FIRED.times} failures; the model’s last turn emailed the customer. Stuck, not done: a person follows up.`,
    act: 'One question to finish.',
    say: { block: 'model', text: 'Last turn: email' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which rule leaves the model a turn to say what went wrong?',
  },
];

/** Tokens per turn for the run on screen; the total is the engine's own sum. */
function Meter({ r }: { r: Run }) {
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }} data-total={totalTokens(r)}>
      <caption>Token meter: what each turn sent and got back</caption>
      <thead>
        <tr>
          <th scope="col">Turn</th>
          <th scope="col">Sent</th>
          <th scope="col">Reply</th>
        </tr>
      </thead>
      <tbody>
        {r.meter.map(m => (
          <tr key={m.turn} data-tokens={m.input + m.output}>
            <th scope="row">{m.turn + 1}</th>
            <td>{n(m.input)}</td>
            <td>{n(m.output)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">In all</th>
          <td colSpan={2}>
            <strong>{n(totalTokens(r))}</strong> tokens
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default function Budgets() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, budget: WIDE, detector: null, p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return (
          <AgentStage
            run={r}
            upTo={state.ran ? r.steps.length : 1}
            props={{ gauge: { steps: state.budget, context: CONTEXT } }}
            inspect={inspect}
            say={say}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
            Run the case
          </button>
        ),
        meter: ({ state }) => <Meter r={current(state)} />,
        fact: () => (
          <>
            <Fact id="agent-costs" />
            <p className="note">
              The meter counts the toy’s hand-written turns. A real model is sent the whole conversation each turn too,
              so retries cost more as the history grows.
            </p>
            <ToyNote />
            <p className="note">
              Why the step blamed last is often not the one that broke the run:{' '}
              <a href="/causal-evals/02-blame-the-last-step/">Why did it fail?</a>
            </p>
          </>
        ),
        budget: ({ state, apply }) => (
          <Chips
            label="Step budget"
            values={BUDGETS}
            value={state.budget}
            name={v => `${v} steps`}
            pick={v => apply({ ...state, budget: v })}
          />
        ),
        detector: ({ state, apply }) => (
          <Chips
            label="Repeat detector"
            values={DETECTOR}
            value={state.detector}
            name={v => (v === null ? 'Repeat detector: off' : `Repeat detector: stop after ${v}`)}
            pick={v => apply({ ...state, detector: v })}
          />
        ),
        verdict: ({ state }) => {
          const r = current(state),
            fired = stepsOf(r, 'repeat').length > 0;
          return (
            <p className="tc-status" role="status">
              <Verdict fixed={fixed(state)} />{' '}
              {r.status === 'stuck'
                ? `The detector fired, and the agent emailed ${r.mail[0].to} on turn ${r.meter.length} of ${state.budget}.`
                : fired
                  ? `The detector fired on turn ${r.meter.length}, the last one the budget allowed, so the agent had no turn left to tell the customer.`
                  : `Out of steps after ${r.meter.length} turns. No email.`}
            </p>
          );
        },
        email: () => (
          <p className="tc-status" data-email>
            <strong>The email the agent sent to {WIN.mail[0].to}:</strong> {WIN.mail[0].body}
          </p>
        ),
        compare: ({ state }) => (
          <table className="tc-ledger" style={{ marginTop: 10 }}>
            <caption>The same case, two hosts</caption>
            <thead>
              <tr>
                <th scope="col">Host rules</th>
                <th scope="col">Ended</th>
                <th scope="col">Turns</th>
                <th scope="col">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[
                [`${WIDE} steps, no detector`, OPEN],
                [`${state.budget} steps, detector at ${state.detector}`, current(state)],
              ].map(([k, r]) => (
                <tr key={k as string}>
                  <th scope="row">{k as string}</th>
                  <td>{ended(r as Run)}</td>
                  <td>{(r as Run).meter.length}</td>
                  <td>{n(totalTokens(r as Run))}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        case: {
          title: 'The case',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The task</p>
              <p>{REC.asks.timeout}</p>
              <p className="lbl">The agent’s tools</p>
              <p>{REC.tools.join(', ')}</p>
              <p className="lbl">The host’s rules</p>
              <p>
                A step budget: the most turns one run may take. A repeat detector, when it is on: stop a call that
                failed the same way several times in a row.
              </p>
              <Fact id="stopping-conditions" />
            </div>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={s.ran ? r.steps.length : 1} />
                <Fact id="agent-costs" />
              </>
            );
          },
        },
      }}
    />
  );
}
