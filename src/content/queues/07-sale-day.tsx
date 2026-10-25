// Chapter 7: run the sale day, the workbench. The reader sets the workers, the most tries and the lease; the simulator
// runs the whole morning (the courier's outage, the poison order, the pallet, a worker knocked over, with backoff,
// jitter and idempotent jobs) and the owner's rule is checked. The puzzle accepts every setting that meets the rule
// with the fewest workers (WINNERS, pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { DAY_CRASH, OUTAGE, POISON, WORKER_NAMES, clock, jobOf } from '../../lib/queues/sim';
import {
  BEST,
  LEASES,
  REASONS,
  RULE,
  START,
  TRIES,
  WAIT_LIMIT,
  WINNERS,
  WORKERS,
  benchOf,
  benchRun,
  lostOf,
  meets,
  wins,
  type Bench,
} from '../../lib/queues/workbench';
import { RAIL_PARTS, railAt } from '../../components/scenes/railScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Pick, QueuesStage, SimNote, type View } from './kit';

const MODULE = 'queues',
  ID = '07-sale-day';
export const PARTS = RAIL_PARTS;
const WHO = POISON.who;
const PALLET = benchRun(START).jobs.find(j => j.job.kind === 'pallet')!.job;

export const QUIZ = {
  question: 'A ticket site’s jobs take up to 3 minutes, and its workers sometimes crash. Which lease fits?',
  options: [
    'A little over 3 minutes',
    'One minute, so a crashed job comes back fast',
    'An hour, so no job ever runs twice',
  ],
  correct: 0,
  explanation: 'A lease must outlast the slowest job, and no more, so a crashed job returns soon.',
  why: [
    'Right: every job finishes inside its lease, and a crashed one is back within minutes.',
    'A lease shorter than the work runs every slow job again and again until it is given up.',
    'An hour-long lease leaves a crashed job hidden for an hour; jobs can still run twice anyway.',
  ],
};

interface S extends Bench {
  t: number;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The workbench runs the whole sale: the courier outage, ${WHO}’s bad address, the pallet and a crash.`,
    act: 'Meet the owner’s rule with the fewest workers.',
    say: { block: 'workers', text: 'Who to pay' },
    predicate: s => wins(benchOf(s)),
    hint: `The pallet takes the longest; a lease must outlast it. The outage needs enough tries.`,
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} workers is the fewest; yours is one of ${WINNERS.length} settings that work.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'A lease should outlast the slowest job, and not much more.',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    best = wins(b),
    ok = meets(b);
  return (
    <div role="status" data-workers={b.workers} data-best={best ? '1' : '0'}>
      <p className="qu-headline">
        <strong>{b.workers}</strong>
        {` worker${b.workers === 1 ? '' : 's'} `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `FEWEST IS ${BEST}` : 'RULE BROKEN'}
        </span>
      </p>
      <p className="note qu-note">{RULE}</p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    r = benchRun(b),
    lost = lostOf(b),
    moe = r.jobs.find(j => j.job.id === POISON.id)!;
  const rows: [string, string, boolean][] = [
    [
      'Good orders on the dead-letter shelf',
      lost.length ? lost.map(id => jobOf(id).who).join(', ') : 'none',
      !lost.length,
    ],
    [`Longest wait (limit ${WAIT_LIMIT} min)`, `${r.waitedMax} min`, r.waitedMax <= WAIT_LIMIT],
    [
      `${WHO}’s order`,
      moe.deadAt !== undefined ? `dead-lettered at ${clock(moe.deadAt)}` : `${moe.tries} tries, still retrying`,
      true,
    ],
    [
      `${PALLET.who}’s pallet`,
      r.jobs.find(j => j.job.id === PALLET.id)!.doneAt !== undefined ? 'packed' : 'never packed',
      r.jobs.find(j => j.job.id === PALLET.id)!.doneAt !== undefined,
    ],
    ['Orders shipped twice', String(r.doubleShipped), r.doubleShipped === 0],
  ];
  return (
    <div className="tc-bench">
      <section className="qu-bench" aria-label="Sale day settings">
        <Pick
          id="qu-b-workers"
          name="Workers"
          value={b.workers}
          values={WORKERS}
          unit="worker"
          onChange={workers => set({ ...s, workers })}
        />
        <p className="note qu-note">{REASONS.workers}</p>
        <Pick
          id="qu-b-tries"
          name="Most tries"
          value={b.maxTries}
          values={TRIES}
          unit="try"
          units="tries"
          onChange={maxTries => set({ ...s, maxTries })}
        />
        <p className="note qu-note">{REASONS.maxTries}</p>
        <Pick
          id="qu-b-lease"
          name="Lease"
          value={b.lease}
          values={LEASES}
          unit="minute"
          onChange={lease => set({ ...s, lease })}
        />
        <p className="note qu-note">{REASONS.lease}</p>
      </section>
      <table className="tc-ledger">
        <caption>{`The sale, ${clock(0)} to ${clock(benchRun(b).ticks.length - 1)}`}</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Today</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name} data-ok={ok ? 1 : 0}>
              <th scope="row">{name}</th>
              <td className={ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SimNote />
    </div>
  );
}

export default function SaleDay() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, t: OUTAGE.from, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          r = benchRun(b);
        return (
          <QueuesStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t, view: 'scene' })}
            show={{
              scene: railAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}. ${WORKER_NAMES[DAY_CRASH.worker]} gets knocked over at ${clock(DAY_CRASH.tick)}.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
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
