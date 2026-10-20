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
import { agentState } from '../../components/scenes/agentScene';
import { CASE_ORDERS, COMPACT_AT, DEFAULTS, DOMAINS, combos, run, stepsOf, totalTokens, type Run } from '../../lib/agents/loop';
import { RECORDINGS, type Mem } from '../../lib/agents/turns';
import { fact } from '../../lib/agents/facts';
import { BYTES_PER_TOKEN, TOKENS_SOURCE } from '../../lib/scale';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Chips, Fact } from './kit';

const MODULE = 'agents', ID = '05-memory';
const REC = RECORDINGS[ID];
const MODES = DOMAINS[ID].mem!, BUDGET = DOMAINS[ID].context![0];
const GAUGE = { steps: DEFAULTS.steps, context: BUDGET };
const RUNS = Object.fromEntries(combos(DOMAINS[ID]).map(c => [c.mem, run(REC, c)])) as Record<Mem, Run>;
const FULL = RUNS.full, SUMMARY = RUNS.summary, PINNED = RUNS.pinned;
// the one storm order with a customer's note
const NOTED = CASE_ORDERS.find(o => o.note)!, ORDER = NOTED.id, NOTE = NOTED.note!, WHO = NOTED.customer;
const mailTo = (r: Run) => r.mail.find(m => m.order_id === ORDER)!.body;
/** the email breaks the note's request (shortcut: matches the note's one subject, phone calls; fine for one recorded case) */
const offersCall = (r: Run) => /phone/i.test(mailTo(r));
const peak = (r: Run) => Math.max(...r.meter.map(m => m.input));
const compactOf = (r: Run) => stepsOf(r, 'compact')[0];
const COMPACT = compactOf(SUMMARY), PIN = compactOf(PINNED).pins[0];
// the turns the model had taken when the host compacted
const AFTER = new Set(stepsOf({ ...SUMMARY, steps: SUMMARY.steps.slice(0, SUMMARY.steps.indexOf(COMPACT)) }, 'proposal').map(p => p.turn)).size;
const PAPERS = agentState({ run: FULL }).tray.papers;
// the turn full memory could not send: its context, rebuilt by the loop's rule, and the host's words; and the turn that emailed
const NEED = agentState({ run: FULL, gauge: GAUGE }).context, STOP = stepsOf(FULL, 'budget')[0]?.text ?? '';
const EMAILED = stepsOf(FULL, 'proposal').find(p => p.call.name === 'send_email')!.turn + 1;
/** the biggest context a run needed: the turn that passed the budget, if one did */
const biggest = (r: Run) => r.status === 'out-of-budget' ? NEED : peak(r);

interface S { ran: boolean; mem: Mem; p1: number | null; p2: number | null; quiz: number | null }
const current = (s: S) => RUNS[s.mem];
/** the puzzle's goal: the host compacts, and the email to the noted order keeps the customer's request */
const fixed = (s: S) => { const r = current(s); return !!compactOf(r) && !offersCall(r); };

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

const QUIZ = {
  question: 'Larkspur’s purchasing agent reads a long supplier contract, page by page, and the host compacts the history as it goes. On page 2 the supplier wrote: “Prices are fixed until March.” What makes sure the agent still knows that when it drafts the order on page 40?',
  options: [
    'Nothing: the model remembers what it read earlier in the run',
    'A bigger context budget, so the host never compacts',
    'Pin the line, so the host sends it every turn and never compacts it',
    'A shorter summary, so the line has room',
  ],
  correct: 2,
  explanation: 'Compaction keeps what the summary says and drops the rest. A line that has to survive must sit outside the summary: pinned.',
  why: [
    `The model sees only what the host sends it that turn. In the storm case, summary memory dropped order ${ORDER}’s note, and the email offered a call.`,
    `It might fit this contract, but every turn would re-send everything: in the storm case, full memory’s last turn needed ${n(NEED)} tokens, where pinned memory never needed more than ${n(peak(PINNED))}. A longer case still runs out.`,
    `Right. ${fact('compaction').claim}`,
    'A shorter summary keeps less, not more. The storm summary listed outcomes only, and the customer’s note was not an outcome.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-fit', focus: 'p1', visibleControls: ['p1'], opensDrawer: 'case',
    narration: `A new case: ${REC.asks.storm} One order, ${ORDER}, carries a note from ${WHO}: “${NOTE}” The host keeps the whole history and re-sends it every turn, as in chapter 4. It also sets a context budget: one turn may send the model at most ${n(BUDGET)} tokens. That number is Larkspur’s setting for this host, not the context window of any model. Before you run it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-full', focus: 'run', visibleControls: ['p1', 'run'],
    narration: 'Run the case. Watch the in-tray on the host’s desk: each result adds a paper. The gauge beside it shows how much of the context budget each turn uses.',
    predicate: s => s.ran,
    hint: 'Press “Run the case”.',
  },
  {
    id: 'predict-summary', focus: 'p2', visibleControls: ['out1', 'p2'], opensDrawer: null,
    narration: `Turn 1 sent ${n(FULL.meter[0].input)} tokens. Turn ${EMAILED} sent ${n(FULL.meter[EMAILED - 1].input)} and emailed the five customers. The last turn, where the agent reports the case done, needed ${n(NEED)}, and the host stopped the run: “${STOP}” The tray held ${PAPERS} papers, every one re-sent each turn. The work got done this time, just, but the agent never reported back, and a bigger storm would pass the budget in the middle of the work. ${fact('context-finite').claim} The host has a second memory setting, summary: once the history passes ${n(COMPACT_AT)} tokens, the host swaps the papers for one short summary and drops the rest. Before you switch:`,
    predicate: s => s.p2 !== null,
  },
  {
    id: 'summary', focus: 'mem', visibleControls: ['mem'],
    narration: 'Switch the host’s memory to summary. The case runs again from the start.',
    predicate: s => s.mem === 'summary',
    hint: 'Press “Memory: summary”.',
  },
  puzzle<S>({
    id: 'pin', focus: 'mem', visibleControls: ['out2', 'email', 'mem', 'verdict'], opensDrawer: 'memory',
    narration: `After turn ${AFTER} the history passed ${n(COMPACT_AT)} tokens, and the host compacted it: ${COMPACT.dropped.length} results dropped, one line of outcomes kept (the drawer shows it). One dropped result was order ${ORDER}’s, with its note: “${NOTE}” So the email offers ${WHO} a call. The summary fit: no turn needed more than ${n(peak(SUMMARY))} tokens, so the run finished. But it lost the line that mattered. The third setting, pinned, copies a customer’s note to a line the host sends every turn and never compacts. Pick the setting that compacts and keeps the request.`,
    broken: s => ({ ...s, ran: true, mem: 'summary' }),
    verdict: fixed,
    solution: s => ({ ...s, ran: true, mem: 'pinned' }),
    hint: 'Full memory keeps the note but never compacts. Try the setting that keeps notes through compaction.',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['compare', 'quiz'], opensDrawer: null,
    narration: `Pinned: the host compacted after the same turn, and sent this line every turn after it: “${PIN}” So the email to ${WHO} kept to email: “${mailTo(PINNED)}” The run used ${n(totalTokens(PINNED))} tokens in all, close to the summary’s ${n(totalTokens(SUMMARY))}. Compaction is a choice of what to keep. Whatever the summary leaves out, the agent no longer knows. One question to finish.`,
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
      stage={({ state, inspect }) => {
        const r = current(state);
        return <AgentStage run={r} upTo={state.ran ? r.steps.length : 1} props={{ gauge: GAUGE, tray: true }} inspect={inspect} />;
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        run: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>Run the case</button>,
        mem: ({ state, apply }) => <Chips label="Memory" values={MODES} value={state.mem} name={v => `Memory: ${v}`} pick={v => apply({ ...state, ran: true, mem: v })} />,
        email: ({ state }) => <p className="tc-status" data-email><strong>The email to {WHO}:</strong> {mailTo(current(state))}</p>,
        verdict: ({ state }) => {
          const r = current(state);
          return (
            <p className="tc-status" role="status">
              <Verdict fixed={fixed(state)} />{' '}
              {!compactOf(r) ? `Full memory keeps the note, but it never compacts: a turn needed ${n(biggest(r))} tokens, over the budget, so the run never finished.`
                : offersCall(r) ? `The host compacted, and the note went with the old results: the email offers a call.`
                : `The host compacted, and the pinned note came through: the email keeps to email.`}
            </p>
          );
        },
        // three rows, four short columns: readable on a phone
        compare: () => (
          <table className="tc-ledger" style={{ marginTop: 10 }}>
            <caption>The storm case, three memory settings</caption>
            <thead><tr><th scope="col">Memory</th><th scope="col">Ended</th><th scope="col">Biggest turn</th><th scope="col">Note kept</th></tr></thead>
            <tbody>
              {MODES.map(m => (
                <tr key={m} data-mem={m}>
                  <th scope="row">{NAMES[m]}</th><td>{RUNS[m].status === 'done' ? 'Done' : 'Over budget'}</td><td>{n(biggest(RUNS[m]))}</td><td>{offersCall(RUNS[m]) ? 'No' : 'Yes'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        case: {
          title: 'The case',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The task</p><p>{REC.asks.storm}</p>
              <p className="lbl">The agent’s tools</p><p>{REC.tools.join(', ')}</p>
              <p className="lbl">The host’s rules</p>
              <p>A context budget of {n(BUDGET)} tokens per turn. Larkspur’s team chose it for this host; a model’s own <a href="/rag/02-why-not-stuff-it/">context window</a> is a different, fixed limit. Memory: full keeps every result; summary compacts the history once it passes {n(COMPACT_AT)} tokens; pinned compacts too, and keeps customers’ notes in a pinned line.</p>
              <p className="lbl">Counting tokens</p><p>Bytes of text ÷ {BYTES_PER_TOKEN}, the rule from RAG chapter 2. <Source e={TOKENS_SOURCE} /></p>
              <Fact id="context-finite" />
            </div>
          ),
        },
        memory: {
          title: 'Memory',
          render: s => {
            const r = current(s), c = compactOf(r);
            return (
              <div className="tc-def">
                <p className="lbl">Memory: {s.mem}</p>
                {!c ? <p>Nothing is dropped: every turn sends every result so far. The last turn, the agent’s report, needed {n(NEED)} tokens, over the budget of {n(BUDGET)}.</p> : <>
                  <p className="lbl">Dropped after turn {AFTER}</p><p>{c.dropped.length} results, each replaced by its outcome in the summary.</p>
                  <p className="lbl">Kept: the summary</p><p>{c.summary}</p>
                  <p className="lbl">Pinned</p><p>{c.pins.length ? c.pins.join(' ') : 'Nothing.'}</p>
                </>}
                <Fact id="compaction" />
              </div>
            );
          },
        },
        messages: {
          title: 'Steps',
          render: s => { const r = current(s); return <><Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={s.ran ? r.steps.length : 1} /><Fact id="tool-result-clearing" /></>; },
        },
      }}
    />
  );
}
