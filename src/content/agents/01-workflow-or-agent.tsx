// Chapter 1: the support lead hands over whole cases. The reader runs each one two ways: as Larkspur's script (a
// workflow: fixed calls, no model turns) and as an agent (the model picks every step). On the plain refund both end the
// same and the script spends no model tokens; on the damaged delivery with the printer out of stock the script halts
// and the agent adapts. Every outcome, count and token figure is read off the runs, so the copy and the runs agree.
import StepRunner from '../../components/story/StepRunner';
import { num as n } from '../../lib/format';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { answerOf, run, stepsOf, totalTokens, type Run } from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { fact } from '../../lib/agents/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Fact, ToyNote } from './kit';
import { AGENT_PARTS } from '../../components/scenes/agentScene';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '01-workflow-or-agent';
const REC = RECORDINGS[ID];
type Case = 'refund' | 'damaged';
type Stock = 'in' | 'out';
type Mode = 'script' | 'agent';
const MODES: Mode[] = ['script', 'agent'];
const key = (c: Case, st: Stock, m: Mode) => `${c}:${st}:${m}`;
const RUNS: Record<string, Run> = Object.fromEntries(
  (['refund', 'damaged'] as Case[]).flatMap(c =>
    (['in', 'out'] as Stock[]).flatMap(st =>
      MODES.map(m => [key(c, st, m), run(REC, { case: c, stock: st, mode: m })]),
    ),
  ),
);
const R = (c: Case, st: Stock, m: Mode) => RUNS[key(c, st, m)];

const calls = (r: Run) => stepsOf(r, 'call').length;
const names = (r: Run) =>
  stepsOf(r, 'call')
    .map(c => c.call.name)
    .join(', ');
/** what the run ended with, in words: the agent's answer, or the step where the script stopped */
const ending = (r: Run) =>
  r.status === 'failed' ? stepsOf(r, 'halt')[0].text : answerOf(r) || `${calls(r)} calls, all ran.`;
const firstCall = (r: Run) => stepsOf(r, 'call')[0]?.call.arguments.order_id;

const REFUND = { script: R('refund', 'in', 'script'), agent: R('refund', 'in', 'agent') };
const IN = { script: R('damaged', 'in', 'script'), agent: R('damaged', 'in', 'agent') };
const OUT = { script: R('damaged', 'out', 'script'), agent: R('damaged', 'out', 'agent') };
const FAILED = stepsOf(OUT.script, 'halt')[0].call.name;
const CHECK = stepsOf(OUT.agent, 'call').find(c => !stepsOf(OUT.script, 'call').some(s => s.call.name === c.call.name))!
  .call.name;

interface S {
  kase: Case;
  stock: Stock;
  mode: Mode;
  ran: boolean;
  seen: string[];
  opened: boolean;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const current = (s: S) => R(s.kase, s.stock, s.mode);
const seenBoth = (s: S, c: Case, st: Stock) => MODES.every(m => s.seen.includes(key(c, st, m)));

const P1 = {
  question: `Run the refund for order ${firstCall(REFUND.script)} both ways. How will the two runs compare?`,
  options: [
    'Same result; the script uses fewer model tokens',
    'Same result; the agent uses fewer model tokens',
    'The agent does a better refund: it thinks about the case',
    'The script fails: it cannot read the order',
  ],
};
// read off the runs: same refunds and emails, and fewer tokens for the script
const sameEnd = (a: Run, b: Run) =>
  a.status === 'done' &&
  b.status === 'done' &&
  a.mail.length === b.mail.length &&
  JSON.stringify(a.orders.map(o => o.refunds.length)) === JSON.stringify(b.orders.map(o => o.refunds.length));
const OUT1 = !sameEnd(REFUND.script, REFUND.agent) ? 2 : totalTokens(REFUND.script) < totalTokens(REFUND.agent) ? 0 : 1;

const P2 = {
  question: 'The printer is now out of stock. Which run copes with the case?',
  options: [
    'Both: the script ships a replacement anyway',
    'Only the agent: it sees the stock and changes course',
    'Only the script: it follows a path someone tested',
    'Neither: nobody wrote a step for this',
  ],
};
const copes = (r: Run) => r.status === 'done';
const OUT2 = copes(OUT.script) ? (copes(OUT.agent) ? 0 : 2) : copes(OUT.agent) ? 1 : 3;

export const QUIZ = {
  question:
    'Larkspur’s billing team updates a customer’s card on file thousands of times a week: look up the account, save the new card, send a receipt. Always those three steps. What should run it?',
  options: [
    'An agent: a model that picks each step always does the job better',
    'A workflow: the steps are known in advance, so fixed code does the job for less, the same way every time',
    'An agent: only an agent can call tools',
    'A workflow: an agent cannot be trusted near payment details',
  ],
  correct: 1,
  explanation: fact('simplest-first').claim,
  why: [
    'On the refund the agent got the same result as the script for more tokens: picking each step pays only when the steps are not known in advance.',
    `Right: ${fact('simplest-first').claim}`,
    'The script called the same tools as the agent; the only difference is who picks the next one.',
    'Trust is not the question, since the agent handled the refund correctly; the question is whether the path can be written down in advance, and here it can.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'meet',
    focus: 'open',
    visibleControls: ['open'],
    narration: 'A workflow runs fixed calls in order. An agent picks its own steps toward a goal.',
    act: 'Read the case.',
    say: { block: 'host', text: 'Runs the script' },
    predicate: s => s.opened,
  },
  {
    id: 'predict-refund',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'case',
    narration: `The refund script runs ${names(REFUND.script)}. The agent gets the same tools and the goal.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-refund',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Same case, two ways: once as the script, once as the agent.',
    act: 'Run it both ways.',
    predicate: s => seenBoth(s, 'refund', 'in'),
    hint: 'Press “Run as the script”, then “Run as an agent”.',
  },
  {
    id: 'refund',
    focus: 'next',
    visibleControls: ['out1', 'tally', 'fact', 'next'],
    narration: `Same refund and email, but the script asked the model nothing; the agent spent ${n(totalTokens(REFUND.agent))} tokens. A foreseen case suits a script.`,
    act: 'Next case.',
    say: { block: 'model', text: 'Script skips it' },
    predicate: s => s.kase === 'damaged',
  },
  {
    id: 'run-damaged',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'case',
    narration: `A harder case: a printer arrived cracked. The damage script runs ${names(IN.script)}, and the printer is in stock.`,
    act: 'Run it both ways.',
    predicate: s => seenBoth(s, 'damaged', 'in'),
    hint: 'Press “Run as the script”, then “Run as an agent”.',
  },
  {
    id: 'predict-out',
    focus: 'p2',
    visibleControls: ['tally', 'p2'],
    opensDrawer: null,
    narration: `Both shipped a replacement; the script spent fewer tokens. The agent also called ${CHECK}, a step the script skips. Now stock runs out.`,
    act: 'Predict first.',
    say: { block: 'orders', text: 'Out of stock' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'run-out',
    focus: 'run',
    visibleControls: ['p2', 'run'],
    narration: 'The same case, with the printer out of stock.',
    act: 'Run it both ways again.',
    predicate: s => seenBoth(s, 'damaged', 'out'),
    hint: 'Press “Run as the script”, then “Run as an agent”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'tally', 'quiz'],
    narration: `The script halted at ${FAILED}, with no step for that answer. The agent read ${CHECK} and changed course.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can someone write this job’s steps down in advance?',
  },
];

const label = (m: Mode) => (m === 'script' ? 'the script' : 'an agent');

/** The runs of the case on screen, side by side in words: how each ended, its calls and its model tokens. */
function Tally({ s }: { s: S }) {
  const rows = MODES.filter(m => s.seen.includes(key(s.kase, s.stock, m)));
  if (!rows.length) return null;
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>
        {s.kase === 'refund' ? 'The refund' : `The cracked printer, ${s.stock === 'in' ? 'in stock' : 'out of stock'}`}
      </caption>
      <thead>
        <tr>
          <th scope="col">Run as</th>
          <th scope="col">Ended</th>
          <th scope="col">Tool calls</th>
          <th scope="col">Model tokens</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(m => {
          const r = R(s.kase, s.stock, m);
          return (
            <tr key={m}>
              <th scope="row">{m === 'script' ? 'Script' : 'Agent'}</th>
              <td>{r.status === 'done' ? 'Done' : 'Stopped'}</td>
              <td>{calls(r)}</td>
              <td>{n(totalTokens(r))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function WorkflowOrAgent() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        kase: 'refund',
        stock: 'in',
        mode: 'script',
        ran: false,
        seen: [],
        opened: false,
        p1: null,
        p2: null,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return <AgentStage run={r} upTo={state.ran ? r.steps.length : 0} inspect={inspect} say={say} />;
      }}
      controls={{
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>
            Read the refund case
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => (
          <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i, stock: 'out', ran: false })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        run: ({ state, sync }) => (
          <>
            <div role="group" aria-label="Run the case" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MODES.map(m => (
                <button
                  key={m}
                  type="button"
                  className="big"
                  onClick={() =>
                    sync({
                      ...state,
                      mode: m,
                      ran: true,
                      seen: [...new Set([...state.seen, key(state.kase, state.stock, m)])],
                    })
                  }
                >
                  Run as {label(m)}
                </button>
              ))}
            </div>
            {state.ran && (
              <p className="tc-status" role="status">
                {state.mode === 'script' ? 'Script' : 'Agent'}: {ending(current(state))}
              </p>
            )}
            <Tally s={state} />
          </>
        ),
        tally: ({ state }) => <Tally s={state} />,
        fact: () => (
          <>
            <Fact id="multi-agent-tokens" />
            <p className="note">{`Here the agent spent ${n(totalTokens(REFUND.agent))} tokens on one hand-written refund and the script none; Anthropic’s figures come from real runs, measured against chat.`}</p>
            <ToyNote />
          </>
        ),
        next: ({ state, apply }) => (
          <button
            type="button"
            className="big"
            onClick={() => apply({ ...state, kase: 'damaged', stock: 'in', mode: 'script', ran: false })}
          >
            Next case: a cracked printer →
          </button>
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
          render: s => (
            <div className="tc-def">
              <p className="lbl">The task</p>
              <p>{REC.asks[s.kase]}</p>
              <p className="lbl">The script’s steps</p>
              <p>{names(R(s.kase, 'in', 'script'))}</p>
              <p className="lbl">The agent’s tools</p>
              <p>{REC.tools.join(', ')}</p>
              <Fact id="workflow-vs-agent" />
            </div>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={s.ran ? r.steps.length : 0} />
                <Fact id="simplest-first" />
                <Fact id="when-agent" />
              </>
            );
          },
        },
      }}
    />
  );
}
