// Chapter 7: the workbench. The reader picks one of the module's five cases, sets the controls its chapters recorded
// (WORKBENCH_DOMAINS: only those, so every reachable run is recorded), runs it, and reads the picture, the Steps lanes
// and a short readout. The goal is to find all five ways a run can end. The case, the controls and the tab are step
// state, so a reload keeps them (as Tool calling's chapter 7 keeps its tab).
import { num as n } from '../../lib/format';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import {
  CONTEXT,
  DEFAULTS,
  WORKBENCH_DOMAINS,
  combos,
  run,
  stepsOf,
  totalTokens,
  type Domain,
  type Run,
  type Setup,
} from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { moduleOf, nextOf } from '../../lib/modules';
import { Messages } from '../tool-calling/kit';
import { AgentStage, Chips, Fact, Group, type View } from './kit';

const MODULE = 'agents',
  ID = '07-workbench';
export type CaseId = keyof typeof WORKBENCH_DOMAINS;
export const CASES = Object.keys(WORKBENCH_DOMAINS) as CaseId[];
export type Ending = Exclude<Run['status'], 'norecord'>;
export const ENDINGS: Ending[] = ['done', 'failed', 'waiting', 'stuck', 'out-of-budget'];
const CASE_NAMES: Record<CaseId, string> = {
  refund: 'Plain refund',
  damaged: 'Cracked printer',
  planted: 'Planted line',
  timeout: 'Carrier timeout',
  storm: 'Storm, five orders',
};
const ENDING_NAMES: Record<Ending, string> = {
  done: 'Done',
  failed: 'Failed',
  waiting: 'Waiting',
  stuck: 'Stuck',
  'out-of-budget': 'Out of budget',
};
const chapterName = (scenario: string) => {
  const cs = moduleOf(MODULE).chapters,
    i = cs.findIndex(c => c.id === scenario);
  return `Chapter ${i + 1}: ${cs[i].short}`;
};

/** Each control's label and the words for each of its values, in domain order. */
const NAMES: { [K in keyof Setup]?: [string, (v: Setup[K]) => string] } = {
  mode: ['Run as', v => (v === 'script' ? 'The script' : 'The agent')],
  stock: ['Printer stock', v => (v === 'in' ? 'Printer in stock' : 'Printer out of stock')],
  plan: ['Plan mode', v => `Plan mode: ${v ? 'on' : 'off'}`],
  approval: ['Approval', v => (v === 'plan' ? 'A person approves the plan' : 'No approval')],
  decide: [
    'The person’s answers',
    v =>
      v
        .map(d => (d === 'approve' ? 'approve' : 'reject'))
        .join(', then ')
        .replace(/^./, c => c.toUpperCase()),
  ],
  steps: ['Step budget', v => `${v} steps`],
  repeat: ['Repeat detector', v => (v === null ? 'Repeat detector: off' : `Repeat detector: stop after ${v}`)],
  mem: ['Memory', v => `Memory: ${v}`],
  helpers: ['Helpers', v => (v ? 'Lead + helpers' : 'Lead alone')],
};

const set = (s: S) => WORKBENCH_DOMAINS[s.kase][s.set];
/** The controls a case shows: the keys with a choice. The person's answers only matter with a plan to approve. */
export const shown = (d: Domain, setup: Partial<Setup>) =>
  (Object.keys(d) as (keyof Setup)[]).filter(
    k => d[k]!.length > 1 && (k !== 'decide' || (setup.plan && setup.approval === 'plan')),
  );
export const first = (d: Domain): Partial<Setup> =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [k, (v as unknown[])[0]]));

const runs = new Map<string, Run>();
/** The run for a case's set and setup; the same setup always gives the same run. */
export function play(kase: CaseId, i: number, setup: Partial<Setup>): Run {
  const { scenario } = WORKBENCH_DOMAINS[kase][i],
    key = JSON.stringify([scenario, setup]);
  if (!runs.has(key)) runs.set(key, run(RECORDINGS[scenario], setup));
  return runs.get(key)!;
}

interface S {
  kase: CaseId;
  set: number;
  setup: Partial<Setup>;
  ran: boolean;
  seen: Ending[];
  view: View;
}
const current = (s: S) => play(s.kase, s.set, s.setup);
const complete = (s: S) => ENDINGS.every(e => s.seen.includes(e));
const ran = (s: S): S => {
  const st = current(s).status as Ending;
  return { ...s, ran: true, seen: s.seen.includes(st) ? s.seen : [...s.seen, st] };
};
/** The first setup, in case order, that ends each way: what "Show me" runs for an ending not found yet. */
const WAYS = Object.fromEntries(
  ENDINGS.map(e => [
    e,
    CASES.flatMap(kase =>
      WORKBENCH_DOMAINS[kase].flatMap((d, i) => combos(d.domain).map(setup => ({ kase, set: i, setup }))),
    ).find(x => play(x.kase, x.set, x.setup).status === e)!,
  ]),
) as Record<Ending, Pick<S, 'kase' | 'set' | 'setup'>>;

function says(r: Run): string {
  const budget = stepsOf(r, 'budget')[0],
    halt = stepsOf(r, 'halt')[0];
  switch (r.status) {
    case 'done':
      return 'The model said the case was finished.';
    case 'failed':
      return halt.text;
    case 'waiting':
      return 'A plan, or a call outside it, is waiting for a person, and the answers you set ran out.';
    case 'stuck':
      return 'The repeat detector stopped a failing call, and the agent used its last turn to tell the customer.';
    case 'out-of-budget':
      return budget.text;
    default:
      return 'No recording for this setup.';
  }
}

const NOTE = 'Helpers always start with full memory and no plan: the memory and plan settings apply to the lead only.';

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['bench', 'run'],
    opensDrawer: 'case',
    narration: `Last stop: the workbench. Here are the module’s ${CASES.length} cases, from the plain refund to Monday’s storm. Pick one, set the controls its chapters used, and run it. The picture shows the back office, the Steps tab the run turn by turn, and a readout says how it ended. Run any case to start.`,
    predicate: s => s.ran,
    hint: 'Press “Run the case”.',
  },
  {
    id: 'endings',
    focus: 'endings',
    visibleControls: ['bench', 'run', 'endings', 'readout'],
    narration: `A run can end ${ENDINGS.length} ways. Done: the model says the case is finished. Failed: the script hit a step it had no code for. Waiting: a person has not answered yet. Stuck: the host stopped a failing call. Out of budget: the host ran out of steps or context for it. Find all ${ENDINGS.length}, in any order. Each case shows only the controls its chapter recorded.`,
    predicate: complete,
    hint: 'Each ending lives in a different case: the script on an out-of-stock printer, a plan nobody answered, the carrier timeout with and without the detector.',
    solution: s => ran({ ...s, ...WAYS[ENDINGS.find(e => !s.seen.includes(e))!] }),
  },
];

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        kase: CASES[0],
        set: 0,
        setup: first(WORKBENCH_DOMAINS[CASES[0]][0].domain),
        ran: false,
        seen: [],
        view: 'scene',
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = current(state),
          { domain } = set(state);
        const props = {
          gauge:
            state.setup.mode === 'script'
              ? undefined
              : { steps: state.setup.steps ?? DEFAULTS.steps, context: state.setup.context ?? CONTEXT },
          clipboard: !!state.setup.plan,
          tray: 'mem' in domain,
          helpers: 'helpers' in domain,
        };
        return (
          <AgentStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={props}
            inspect={inspect}
            view={state.view}
            onView={view => sync({ ...state, view })}
          />
        );
      }}
      controls={{
        // choosing is never a miss; a changed setup waits for the next run
        bench: ({ state, sync }) => {
          const sets = WORKBENCH_DOMAINS[state.kase],
            { domain } = set(state);
          const pick = (patch: Partial<S>) => sync({ ...state, ...patch, ran: false });
          return (
            <div className="tc-bench">
              <Group label="Case">
                <Chips
                  label="Case"
                  values={CASES}
                  value={state.kase}
                  name={c => CASE_NAMES[c]}
                  pick={kase => pick({ kase, set: 0, setup: first(WORKBENCH_DOMAINS[kase][0].domain) })}
                />
              </Group>
              {sets.length > 1 && (
                <Group label="Controls from">
                  <Chips
                    label="Controls from"
                    values={sets.map((_, i) => i)}
                    value={state.set}
                    name={i => chapterName(sets[i].scenario)}
                    pick={i => pick({ set: i, setup: first(sets[i].domain) })}
                  />
                </Group>
              )}
              {shown(domain, state.setup).map(k => {
                const vals = domain[k] as unknown[],
                  [label, name] = NAMES[k] as [string, (v: unknown) => string];
                const at = vals.findIndex(v => JSON.stringify(v) === JSON.stringify(state.setup[k]));
                return (
                  <Group key={k} label={label}>
                    <Chips
                      label={label}
                      values={vals.map((_, i) => i)}
                      value={at}
                      name={i => name(vals[i])}
                      pick={i => pick({ setup: { ...state.setup, [k]: vals[i] } })}
                    />
                  </Group>
                );
              })}
              {'helpers' in domain && <p className="tc-status">{NOTE}</p>}
            </div>
          );
        },
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync(ran(state))}>
            Run the case
          </button>
        ),
        readout: ({ state }) => {
          const r = current(state);
          if (!state.ran)
            return (
              <p className="tc-status" role="status">
                Setup changed. Run the case to see how it ends.
              </p>
            );
          return (
            <div role="status" data-ending={r.status}>
              <p className="tc-status">
                <strong>{ENDING_NAMES[r.status as Ending]}.</strong> {says(r)}
              </p>
              <table className="tc-ledger" style={{ marginTop: 10 }}>
                <caption>This run, counted by the host</caption>
                <thead>
                  <tr>
                    <th scope="col">Ended</th>
                    <th scope="col">Model turns</th>
                    <th scope="col">Tokens</th>
                    <th scope="col">Emails</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-total={totalTokens(r)}>
                    <th scope="row">{ENDING_NAMES[r.status as Ending]}</th>
                    <td>{r.meter.length}</td>
                    <td>{n(totalTokens(r))}</td>
                    <td>{r.mail.length}</td>
                  </tr>
                </tbody>
              </table>
              <p className="tc-status" style={{ marginTop: 10 }}>
                <strong>The sent-mail ledger</strong>
              </p>
              {r.mail.length ? (
                <ul className="tc-ledger-mail" data-mail={r.mail.length}>
                  {r.mail.map((m, i) => (
                    <li key={i}>
                      <strong>
                        Order {m.order_id}, to {m.to}:
                      </strong>{' '}
                      {m.body}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tc-status" data-mail={0}>
                  No email sent: the customer heard nothing.
                </p>
              )}
            </div>
          );
        },
        endings: ({ state }) => (
          <p className="tc-status" data-found={state.seen.length}>
            Endings found: {state.seen.length} of {ENDINGS.length}
            {state.seen.length
              ? `: ${ENDINGS.filter(e => state.seen.includes(e))
                  .map(e => ENDING_NAMES[e])
                  .join(', ')}`
              : ''}
            .
          </p>
        ),
      }}
      inspectPanel="messages"
      panels={{
        case: {
          title: 'The case',
          render: s => {
            const { scenario } = set(s),
              rec = RECORDINGS[scenario];
            return (
              <div className="tc-def">
                <p className="lbl">The task</p>
                <p>{rec.asks[s.kase]}</p>
                <p className="lbl">The agent’s tools</p>
                <p>
                  {rec.tools.join(', ')}
                  {'helpers' in set(s).domain ? ', and with helpers on, delegate' : ''}
                </p>
                <p className="lbl">Recorded in</p>
                <p>
                  {chapterName(scenario)}. Only that chapter’s controls are offered, so every run here was recorded.
                </p>
                {s.kase === 'storm' && <p>{NOTE}</p>}
                <Fact id="stopping-conditions" />
              </div>
            );
          },
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return <Messages lanes={agentLanes(r)} msgs={agentMessages(r)} upTo={s.ran ? r.steps.length : 0} />;
          },
        },
      }}
    />
  );
}
