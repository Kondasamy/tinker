// Chapter 6: sub-agents. The storm case again, two ways: the lead alone, holding all five orders in one history, or the
// lead handing each order to a helper (the host's delegate tool, KTD7). Each helper starts with a clean context and
// sends back one line, so the lead's biggest turn shrinks; but every helper re-sends its own instructions and tools on
// every turn, so the total grows. Every count is read off the runs; the advice on when it pays comes from facts.json.
import StepRunner from '../../components/story/StepRunner';
import { num as n } from '../../lib/format';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import {
  CONTEXT,
  DEFAULTS,
  DOMAINS,
  answerOf,
  combos,
  run,
  stepsOf,
  totalTokens,
  type Run,
} from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { fact } from '../../lib/agents/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Chips, Fact, ToyNote } from './kit';
import { AGENT_PARTS } from '../../components/scenes/agentScene';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '06-sub-agents';
const REC = RECORDINGS[ID];
type Setup = 'alone' | 'helpers';
const SETUPS: Setup[] = DOMAINS[ID].helpers!.map(h => (h ? 'helpers' : 'alone'));
const RUNS = Object.fromEntries(combos(DOMAINS[ID]).map(c => [c.helpers ? 'helpers' : 'alone', run(REC, c)])) as Record<
  Setup,
  Run
>;
const ALONE = RUNS.alone,
  HELPED = RUNS.helpers;
const GAUGE = { steps: DEFAULTS.steps, context: CONTEXT };
/** the biggest context one of this run's own turns sent (helpers' turns are in their own runs) */
const peak = (r: Run) => Math.max(...r.meter.map(m => m.input));
const HELPERS = stepsOf(HELPED, 'helper'),
  ORDERS = HELPERS.map(h => h.call.arguments.order_id as number);
const HELPER_FIRST = Math.min(...HELPERS.map(h => h.run.meter[0].input));
const RATIO = (totalTokens(HELPED) / totalTokens(ALONE)).toFixed(1);
// the helper that found its order out of stock
const OUT = HELPERS.find(h => stepsOf(h.run, 'result').some(x => x.key.endsWith(':out')))!;
const OUT_ORDER = OUT.call.arguments.order_id as number;
/** what the lead's last turn could see: its history, outcomes only (the signature's `hist` field) */
const LEAD_HIST = HELPED.signatures
  .at(-1)!
  .split('|')
  .find(f => f.startsWith('hist='))!
  .slice('hist='.length)
  .split(',');
const ended = (r: Run) => (r.status === 'done' ? 'Done' : r.status);

interface S {
  ran: boolean;
  setup: Setup;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const current = (s: S) => RUNS[s.setup];

const P1 = {
  question: 'The same five storm orders, two ways. Which setup uses more tokens in total, helpers included?',
  options: [
    'The lead alone: one history holding all five orders, re-sent every turn',
    'The lead with helpers: five more agents, each re-sending its own instructions and tools every turn',
    'About the same: it is the same work either way',
  ],
};
const OUT1 =
  totalTokens(HELPED) > totalTokens(ALONE) * 1.1 ? 1 : totalTokens(ALONE) > totalTokens(HELPED) * 1.1 ? 0 : 2;

const P2 = {
  question: `Helper ${OUT_ORDER} looks up its order, finds the item out of stock, issues a refund and emails the customer. What reaches the lead’s history from all that work?`,
  options: [
    'Every call and result the helper made, so the lead can check them',
    'Only the helper’s one-line report',
    'Nothing: the lead never hears back',
  ],
};
// the lead's history holds no helper's lookups, only one delegate outcome per helper
const OUT2 = LEAD_HIST.some(k => !k.startsWith('delegate:')) ? 0 : LEAD_HIST.length === HELPERS.length ? 1 : 2;

export const QUIZ = {
  question:
    'Larkspur’s buyer asks the agent one thing: today’s price for a box of deck screws from its usual supplier. It is one lookup and one answer. Should the agent hand the job to a helper?',
  options: [
    'Yes: a helper’s clean context always makes the run better',
    'No: a single lookup has no long history to keep clean, and a helper adds its own instructions, tools and turns to the bill',
    'Yes: two agents finish sooner than one',
    'It makes no difference: the tokens are the same either way',
  ],
  correct: 1,
  explanation:
    'Helpers pay when a case splits into separate pieces, each with a long history of its own. One short lookup has nothing to split.',
  why: [
    `A clean context helps when the lead’s history is long, and here it is one result: in the storm case each helper’s first turn sent ${n(HELPER_FIRST)} tokens before doing anything.`,
    `Right: ${fact('simplest-first').claim}`,
    'One lookup has nothing to work on in parallel, and parallel pieces are what helpers are for.',
    `Helpers re-send their own instructions and tools: in the storm case the total went from ${n(totalTokens(ALONE))} tokens to ${n(totalTokens(HELPED))}.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-total',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'case',
    narration:
      'The host can offer a delegate tool: the lead agent hands one order to a sub-agent, a helper with a clean context.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-alone',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'First the lead alone, with chapter 5’s full memory. The gauge shows how much context each turn sends.',
    act: 'Run the case.',
    say: { block: 'gauge', text: 'Context per turn' },
    predicate: s => s.ran,
    hint: 'Press “Run the case”.',
  },
  {
    id: 'helpers',
    focus: 'setup',
    visibleControls: ['p1', 'setup'],
    narration: `The lead alone took ${ALONE.meter.length} turns, every result in one history; its biggest turn sent ${n(peak(ALONE))} tokens.`,
    act: 'Switch to the lead with helpers.',
    say: { block: 'gauge', text: 'One big history' },
    predicate: s => s.setup === 'helpers',
    hint: 'Press “Lead + helpers”.',
  },
  {
    id: 'predict-report',
    focus: 'p2',
    visibleControls: ['out1', 'compare', 'p2'],
    opensDrawer: 'helpers',
    narration: `The lead’s biggest turn shrank to ${n(peak(HELPED))} tokens, but the total grew ${RATIO} times: each handoff re-sends instructions and tools.`,
    act: 'Predict first.',
    say: { block: 'helpers', text: 'Fresh contexts' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'quiz'],
    opensDrawer: null,
    narration:
      'The lead saw one line per helper. Helpers pay when a case splits into long separate pieces, else they cost extra.',
    act: 'One question to finish.',
    say: { block: 'helpers', text: 'One line back' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is there a long history here for a helper to keep out of the lead’s context?',
  },
];

const NAMES: Record<Setup, string> = { alone: 'Lead alone', helpers: 'Lead + helpers' };

export default function SubAgents() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, setup: 'alone', p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return (
          <AgentStage
            run={r}
            upTo={state.ran ? r.steps.length : 1}
            props={{ gauge: GAUGE, helpers: true }}
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
        setup: ({ state, apply }) => (
          <Chips
            label="Setup"
            values={SETUPS}
            value={state.setup}
            name={v => NAMES[v]}
            pick={v => apply({ ...state, ran: true, setup: v })}
          />
        ),
        // two rows, four short columns: readable on a phone
        compare: () => (
          <>
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>The storm case, counted from this module’s hand-written recordings</caption>
              <thead>
                <tr>
                  <th scope="col">Setup</th>
                  <th scope="col">Ended</th>
                  <th scope="col">Lead’s biggest turn</th>
                  <th scope="col">Tokens in all</th>
                </tr>
              </thead>
              <tbody>
                {SETUPS.map(k => (
                  <tr key={k} data-setup={k} data-peak={peak(RUNS[k])} data-total={totalTokens(RUNS[k])}>
                    <th scope="row">{NAMES[k]}</th>
                    <td>{ended(RUNS[k])}</td>
                    <td>{n(peak(RUNS[k]))}</td>
                    <td>{n(totalTokens(RUNS[k]))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Fact id="multi-agent-tokens" />
            <p className="note">{`Here helpers cost ${RATIO} times the lead alone, on hand-written turns; Anthropic’s ${fact('multi-agent-tokens').value} times is real runs, measured against chat.`}</p>
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
        case: {
          title: 'The case',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The task</p>
              <p>{REC.asks.storm}</p>
              <p className="lbl">The agent’s tools</p>
              <p>{REC.tools.join(', ')}, and with helpers on, delegate</p>
              <p className="lbl">What a helper is asked</p>
              <p>{REC.asks[`order-${ORDERS[0]}`]}</p>
              <p className="lbl">The host’s rules</p>
              <p>
                Full memory, as in chapter 5: every result stays in the history. A helper has its own history; the lead
                gets back only its reply.
              </p>
              <Fact id="subagent-parallel" />
            </div>
          ),
        },
        helpers: {
          title: 'The helpers',
          render: s => {
            const hs = stepsOf(current(s), 'helper');
            return (
              <div className="tc-def">
                {!hs.length ? (
                  <p>The lead alone: no helpers. Every result stays in its one history.</p>
                ) : (
                  <>
                    <table className="tc-ledger" data-helpers={hs.length}>
                      <caption>One row per helper, its own turns only</caption>
                      <thead>
                        <tr>
                          <th scope="col">Order</th>
                          <th scope="col">Turns</th>
                          <th scope="col">Biggest turn</th>
                          <th scope="col">Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hs.map(h => (
                          <tr key={h.call.id}>
                            <th scope="row">{String(h.call.arguments.order_id)}</th>
                            <td>{h.run.meter.length}</td>
                            <td>{n(peak(h.run))}</td>
                            <td>{n(totalTokens(h.run))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="lbl">What each one sent the lead</p>
                    <ul>
                      {hs.map(h => (
                        <li key={h.call.id}>{answerOf(h.run)}</li>
                      ))}
                    </ul>
                  </>
                )}
                <Fact id="subagent-clean-context" />
              </div>
            );
          },
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={s.ran ? r.steps.length : 1} />
                <Fact id="multi-agent-performance" />
              </>
            );
          },
        },
      }}
    />
  );
}
