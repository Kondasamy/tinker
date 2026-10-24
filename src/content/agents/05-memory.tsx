// Chapter 5: memory. Monday's storm damaged five orders. With full memory every result stays in the history and is
// re-sent each turn: the context grows until the last turn passes the host's budget (a Larkspur setting, KTD12) and
// the run stops before the agent reports done. Summary memory compacts the history and fits, but drops order 2101's "no phone calls" note, so its email offers a call. Pinned memory
// compacts too and keeps the note. Every outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import { num as n } from '../../lib/format';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { Source } from '../../components/scenes/Source';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { AGENT_PARTS, agentState } from '../../components/scenes/agentScene';
import { CASE_ORDERS, COMPACT_AT, DEFAULTS, DOMAINS, combos, run, stepsOf, type Run } from '../../lib/agents/loop';
import { RECORDINGS, type Mem } from '../../lib/agents/turns';
import { fact } from '../../lib/agents/facts';
import { BYTES_PER_TOKEN, TOKENS_SOURCE } from '../../lib/scale';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Chips, Fact } from './kit';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '05-memory';
const REC = RECORDINGS[ID];
const MODES = DOMAINS[ID].mem!,
  BUDGET = DOMAINS[ID].context![0];
const GAUGE = { steps: DEFAULTS.steps, context: BUDGET };
const RUNS = Object.fromEntries(combos(DOMAINS[ID]).map(c => [c.mem, run(REC, c)])) as Record<Mem, Run>;
const FULL = RUNS.full,
  SUMMARY = RUNS.summary,
  PINNED = RUNS.pinned;
// the one storm order with a customer's note
const NOTED = CASE_ORDERS.find(o => o.note)!,
  ORDER = NOTED.id,
  NOTE = NOTED.note!,
  WHO = NOTED.customer;
const mailTo = (r: Run) => r.mail.find(m => m.order_id === ORDER)!.body;
/** the email breaks the note's request (shortcut: matches the note's one subject, phone calls; fine for one recorded case) */
const offersCall = (r: Run) => /phone/i.test(mailTo(r));
const peak = (r: Run) => Math.max(...r.meter.map(m => m.input));
const compactOf = (r: Run) => stepsOf(r, 'compact')[0];
const COMPACT = compactOf(SUMMARY);
// the turns the model had taken when the host compacted
const AFTER = new Set(
  stepsOf({ ...SUMMARY, steps: SUMMARY.steps.slice(0, SUMMARY.steps.indexOf(COMPACT)) }, 'proposal').map(p => p.turn),
).size;
// the turn full memory could not send: its context, rebuilt by the loop's rule
const NEED = agentState({ run: FULL, gauge: GAUGE }).context;
/** the biggest context a run needed: the turn that passed the budget, if one did */
const biggest = (r: Run) => (r.status === 'out-of-budget' ? NEED : peak(r));

interface S {
  ran: boolean;
  mem: Mem;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const current = (s: S) => RUNS[s.mem];
/** the puzzle's goal: the host compacts, and the email to the noted order keeps the customer's request */
const fixed = (s: S) => {
  const r = current(s);
  return !!compactOf(r) && !offersCall(r);
};

const P1 = {
  question: `Five orders, and every result kept. Will each turn fit in the host’s budget of ${n(BUDGET)} tokens?`,
  options: [
    'Easily: even the last turn uses under half of it',
    'Yes, but the last turn uses most of it',
    'No: a turn passes the budget, and the host stops the run before it ends',
  ],
};
const OUT1 = FULL.status === 'out-of-budget' ? 2 : peak(FULL) > BUDGET / 2 ? 1 : 0;

const P2 = {
  question: `With summary memory, what will the agent’s email to order ${ORDER} say about phone calls?`,
  options: [
    'Nothing about calls: it keeps to email, as the note asks',
    'It offers to phone: the note was dropped with the old results',
    'It asks the customer how they would like to be contacted',
  ],
};
const OUT2 = offersCall(SUMMARY) ? 1 : 0;

export const QUIZ = {
  question:
    'Larkspur’s purchasing agent reads a long supplier contract, page by page, and the host compacts the history as it goes. On page 2 the supplier wrote: “Prices are fixed until March.” What makes sure the agent still knows that when it drafts the order on page 40?',
  options: [
    'Nothing: the model remembers what it read earlier in the run',
    'A bigger context budget, so the host never compacts',
    'Pin the line, so the host sends it every turn and never compacts it',
    'A shorter summary, so the line has room',
  ],
  correct: 2,
  explanation:
    'Compaction keeps what the summary says and drops the rest. A line that has to survive must sit outside the summary: pinned.',
  why: [
    `The model sees only what the host sends it that turn: in the storm case, summary memory dropped order ${ORDER}’s note, and the email offered a call.`,
    `It might fit this contract, but every turn would re-send everything: in the storm case full memory’s last turn needed ${n(NEED)} tokens, pinned memory at most ${n(peak(PINNED))}.`,
    `Right: ${fact('compaction').claim}`,
    'A shorter summary keeps less, not more: the storm summary listed outcomes only, and the customer’s note was not an outcome.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-fit',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'case',
    narration: `${CASE_ORDERS.length} storm-damaged orders. The host re-sends the whole history each turn, within a context budget: its own setting, not any model’s context window.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-full',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: `Each result adds a paper to the in-tray. Note: order ${ORDER}’s customer asked for no phone calls.`,
    act: 'Run the case.',
    say: { block: 'tray', text: 'A paper a result' },
    predicate: s => s.ran,
    hint: 'Press “Run the case”.',
  },
  {
    id: 'predict-summary',
    focus: 'p2',
    visibleControls: ['out1', 'p2'],
    opensDrawer: null,
    narration: `The last turn needed ${n(NEED)} tokens, over budget, so the host stopped the run. Summary memory swaps old papers for one short summary.`,
    act: 'Predict first.',
    say: { block: 'gauge', text: 'Over budget' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'summary',
    focus: 'mem',
    visibleControls: ['mem'],
    narration: 'The case runs again from the start.',
    act: 'Switch the memory to summary.',
    predicate: s => s.mem === 'summary',
    hint: 'Press “Memory: summary”.',
  },
  puzzle<S>({
    id: 'pin',
    focus: 'mem',
    visibleControls: ['out2', 'email', 'mem', 'verdict'],
    opensDrawer: 'memory',
    narration: `Compaction after turn ${AFTER} dropped ${COMPACT.dropped.length} results, order ${ORDER}’s no-calls note too, so the email offers a call.`,
    act: 'Compact, but keep the note.',
    say: { block: 'tray', text: 'Compacted' },
    broken: s => ({ ...s, ran: true, mem: 'summary' }),
    verdict: fixed,
    solution: s => ({ ...s, ran: true, mem: 'pinned' }),
    hint: 'Full memory keeps the note but never compacts. Try the setting that keeps notes through compaction.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['email', 'compare', 'quiz'],
    opensDrawer: null,
    narration:
      'Pinning sent the note every turn, outside the summary, so the email kept to email, for about the same tokens.',
    act: 'One question to finish.',
    say: { block: 'tray', text: 'Note pinned' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting keeps a line outside the summary?',
  },
];

const NAMES: Record<Mem, string> = { full: 'Full', summary: 'Summary', pinned: 'Pinned' };

export default function Memory() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, mem: 'full', p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return (
          <AgentStage
            run={r}
            upTo={state.ran ? r.steps.length : 1}
            props={{ gauge: GAUGE, tray: true }}
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
        mem: ({ state, apply }) => (
          <Chips
            label="Memory"
            values={MODES}
            value={state.mem}
            name={v => `Memory: ${v}`}
            pick={v => apply({ ...state, ran: true, mem: v })}
          />
        ),
        email: ({ state }) => (
          <p className="tc-status" data-email>
            <strong>The email to {WHO}:</strong> {mailTo(current(state))}
          </p>
        ),
        verdict: ({ state }) => {
          const r = current(state);
          return (
            <p className="tc-status" role="status">
              <Verdict fixed={fixed(state)} />{' '}
              {!compactOf(r)
                ? `Full memory keeps the note, but it never compacts: a turn needed ${n(biggest(r))} tokens, over the budget, so the run never finished.`
                : offersCall(r)
                  ? `The host compacted, and the note went with the old results: the email offers a call.`
                  : `The host compacted, and the pinned note came through: the email keeps to email.`}
            </p>
          );
        },
        // three rows, four short columns: readable on a phone
        compare: () => (
          <table className="tc-ledger" style={{ marginTop: 10 }}>
            <caption>The storm case, three memory settings</caption>
            <thead>
              <tr>
                <th scope="col">Memory</th>
                <th scope="col">Ended</th>
                <th scope="col">Biggest turn</th>
                <th scope="col">Note kept</th>
              </tr>
            </thead>
            <tbody>
              {MODES.map(m => (
                <tr key={m} data-mem={m}>
                  <th scope="row">{NAMES[m]}</th>
                  <td>{RUNS[m].status === 'done' ? 'Done' : 'Over budget'}</td>
                  <td>{n(biggest(RUNS[m]))}</td>
                  <td>{offersCall(RUNS[m]) ? 'No' : 'Yes'}</td>
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
              <p>{REC.asks.storm}</p>
              <p className="lbl">
                Order {ORDER}’s note, from {WHO}
              </p>
              <p>{NOTE}</p>
              <p className="lbl">The agent’s tools</p>
              <p>{REC.tools.join(', ')}</p>
              <p className="lbl">The host’s rules</p>
              <p>
                A context budget of {n(BUDGET)} tokens per turn. Larkspur’s team chose it for this host; a model’s own{' '}
                <a href="/rag/02-why-not-stuff-it/">context window</a> is a different, fixed limit. Memory: full keeps
                every result; summary compacts the history once it passes {n(COMPACT_AT)} tokens; pinned compacts too,
                and keeps customers’ notes in a pinned line.
              </p>
              <p className="lbl">Counting tokens</p>
              <p>
                Bytes of text ÷ {BYTES_PER_TOKEN}, the rule from RAG chapter 2. <Source e={TOKENS_SOURCE} />
              </p>
              <Fact id="context-finite" />
            </div>
          ),
        },
        memory: {
          title: 'Memory',
          render: s => {
            const r = current(s),
              c = compactOf(r);
            return (
              <div className="tc-def">
                <p className="lbl">Memory: {s.mem}</p>
                {!c ? (
                  <p>
                    Nothing is dropped: every turn sends every result so far. The last turn, the agent’s report, needed{' '}
                    {n(NEED)} tokens, over the budget of {n(BUDGET)}.
                  </p>
                ) : (
                  <>
                    <p className="lbl">Dropped after turn {AFTER}</p>
                    <p>{c.dropped.length} results, each replaced by its outcome in the summary.</p>
                    <p className="lbl">Kept: the summary</p>
                    <p>{c.summary}</p>
                    <p className="lbl">Pinned</p>
                    <p>{c.pins.length ? c.pins.join(' ') : 'Nothing.'}</p>
                  </>
                )}
                <Fact id="compaction" />
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
                <Fact id="tool-result-clearing" />
              </>
            );
          },
        },
      }}
    />
  );
}
