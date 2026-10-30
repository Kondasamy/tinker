// Chapter 7: set the limits, the workbench. The reader sets the barrel size, the drip and one barrel per key; the
// simulator runs the hand-made sale day (Oakmoor, the web shop's rush, Birchfield's bursts, Quickfix's runaway script)
// and the team's rule is checked. The puzzle accepts every setting that meets it (WINNERS, pinned and recomputed).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { CAPACITY, busiestSecond, clock, nameOf, tally } from '../../lib/rate-limits/sim';
import {
  DRIPS,
  REASONS,
  RULE,
  SIZES,
  START,
  WINNERS,
  benchOf,
  benchRun,
  lostOf,
  meets,
  wins,
  type Bench,
} from '../../lib/rate-limits/workbench';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '07-set-the-limits';
export const PARTS = BARREL_PARTS;
const LOOK = 25_000;

export const QUIZ = {
  question: 'A barrel far bigger than the server can take is full when a burst arrives. What happens?',
  options: [
    'The burst gets through, and the server falls over',
    'The barrel turns the burst away',
    'Nothing: a bigger barrel is always safer',
  ],
  correct: 0,
  explanation: 'The barrel’s size is the biggest burst it lets through, so it must fit what the server can answer.',
  why: [
    'Right: a full barrel serves its whole size at once, past what the server can answer in a second.',
    'A full barrel has tokens for the whole burst, so it lets every one through.',
    'Too big a barrel lets bursts through that the server can’t take.',
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
    narration:
      'The workbench runs sale day: Oakmoor, the web shop’s rush, Birchfield’s bursts and Quickfix’s runaway script.',
    act: 'Meet the team’s rule.',
    say: { block: 'barrel', text: 'Your barrels' },
    predicate: s => wins(benchOf(s)),
    hint: 'Give each partner a barrel, sized for Birchfield’s bursts, dripping fast enough for the web shop’s rush.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} settings that work. Real APIs set the same two: a steady rate and a burst size.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many does a full barrel let through at once?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    ok = meets(b);
  return (
    <div role="status" data-best={ok ? '1' : '0'}>
      <p className="rl-headline">
        <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'RULE MET' : 'RULE BROKEN'}</span>
      </p>
      <p className="note rl-note">{RULE}</p>
      {ok && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    r = benchRun(b);
  const rows: [string, string, boolean][] = [
    [
      'The stock API',
      r.downs.length ? `fell over ${r.downs.length} time${r.downs.length === 1 ? '' : 's'}` : 'stayed up',
      !r.downs.length,
    ],
    [
      `Busiest second (it takes ${CAPACITY})`,
      String(busiestSecond(r)),
      busiestSecond(r) <= CAPACITY && !r.downs.length,
    ],
    ...lostOf(r).map(({ key, lost }) => [`${nameOf(key)} lost`, String(lost), lost === 0] as [string, string, boolean]),
    ['Quickfix served', String(tally(r, 0, r.ms + 1, 'quickfix').ok), true],
  ];
  return (
    <div className="tc-bench">
      <section className="rl-bench" aria-label="Sale day limits">
        <Pick
          id="rl-b-size"
          name="Barrel size"
          value={b.size}
          values={SIZES}
          unit="tokens"
          onChange={size => set({ ...s, size })}
        />
        <p className="note rl-note">{REASONS.size}</p>
        <Pick
          id="rl-b-drip"
          name="Drip"
          value={b.refill}
          values={DRIPS}
          unit="a second"
          onChange={refill => set({ ...s, refill })}
        />
        <p className="note rl-note">{REASONS.refill}</p>
        <label className="rl-row">
          <input type="checkbox" checked={b.perKey} onChange={e => set({ ...s, perKey: e.target.checked })} /> One
          barrel per key
        </label>
        <p className="note rl-note">{REASONS.perKey}</p>
      </section>
      <table className="tc-ledger">
        <caption>{`Sale day, ${clock(0)} to ${clock(r.ms)}`}</caption>
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

export default function SetTheLimits() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, t: LOOK, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTime={t => sync({ ...state, t, view: 'scene' })}
          step={500}
          show={{
            run: benchRun(benchOf(state)),
            t: state.t,
            caption: `${clock(state.t)}. Sale day, every partner at once.`,
          }}
        />
      )}
      controls={{
        score: ({ state }) => <Score s={state} />,
        fact: () => <Fact id="aws-quota" />,
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
