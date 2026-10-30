// Chapter 7: plan the delivery day, the workbench. The reader picks the search (fewest roads, Dijkstra or A*) and A*'s
// weight; the whole day of deliveries runs under each drop's closures and jams, and the rule is checked: minutes
// within the slack of the fastest, then the fewest junctions looked at. The puzzle accepts every setting that wins
// (WINNERS, pinned and recomputed in a test). Drop chips put any delivery on the stage.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { closedOf, nameOf } from '../../lib/routes/graph';
import {
  ALGOS,
  ALGO_NAME,
  BEST,
  DELIVERIES,
  FASTEST,
  RULE,
  SLACK,
  START,
  WEIGHTS,
  WINNERS,
  benchOf,
  dayOf,
  meets,
  route,
  wins,
  type Algo,
  type Bench,
} from '../../lib/routes/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, TableStage, TownNote, type View } from './kit';

const MODULE = 'routes',
  ID = '07-delivery-day';
export const PARTS = TABLE_PARTS;
const nameOfBench = (b: Bench) => (b.algo === 'astar' ? `A* at weight ${b.weight}` : ALGO_NAME[b.algo]);
const W = WINNERS[0];

export const QUIZ = {
  question: 'A delivery app answers a million routes a day, and drivers accept a minute’s slack. What do you pick?',
  options: [
    'A* with a small weight, checked against the slack',
    'Dijkstra: exact is always best',
    'The heaviest weight: fewest junctions wins',
  ],
  correct: 0,
  explanation: 'Pick the lightest search that still meets the rule, and check it on real trips.',
  why: [
    'Right: a small weight looks at much less and stays within the slack on a day of trips.',
    'Exact is safe but looks at the most junctions; with slack allowed, that is work you pay for a million times.',
    'The heaviest weight broke the slack on this day: fewer junctions, but lost minutes.',
  ],
};

interface S extends Bench {
  drop: number;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The workbench runs all ${DELIVERIES.length} drops, each under its own closures and jams, with your search.`,
    act: 'Meet the rule, looking at the fewest junctions.',
    say: { block: 'route', text: 'Your route' },
    predicate: s => wins(benchOf(s)),
    hint: 'Exact searches look at a lot. Lean on the guess, but watch the day’s minutes.',
    solution: s => ({ ...s, ...W }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${nameOfBench(W)} wins: ${BEST} junctions over the day, within ${SLACK} minutes of the fastest.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting met the rule while doing the least looking?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    d = dayOf(b),
    best = wins(b),
    ok = meets(b);
  return (
    <div role="status" data-looked={d.looked} data-best={best ? '1' : '0'}>
      <p className="rt-headline">
        <strong>{d.looked}</strong>
        {' junctions looked at '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `FEWEST IS ${BEST}` : 'TOO SLOW'}
        </span>
      </p>
      <p className="note rt-note">{RULE}</p>
      {best && <p className="tc-status">{`${nameOfBench(b)} meets the rule.`}</p>}
    </div>
  );
}

function BenchControls({ s, set, onDrop }: { s: S; set: (s: S) => void; onDrop: (drop: number) => void }) {
  const b = benchOf(s),
    d = dayOf(b);
  return (
    <div className="tc-bench">
      <section className="rt-bench" aria-label="Search settings">
        <label className="rt-range">
          <span>Search</span>
          <Select value={b.algo} onChange={e => set({ ...s, algo: e.target.value as Algo })}>
            {ALGOS.map(a => (
              <option key={a} value={a}>
                {ALGO_NAME[a]}
              </option>
            ))}
          </Select>
        </label>
        <Pick
          id="rt-b-weight"
          name="A*’s weight"
          value={b.weight}
          values={WEIGHTS}
          text={w => `${w}×`}
          disabled={b.algo !== 'astar'}
          onChange={weight => set({ ...s, weight })}
        />
      </section>
      <table className="tc-ledger">
        <caption>{`The day: ${d.minutes} min against the fastest ${FASTEST}`}</caption>
        <thead>
          <tr>
            <th scope="col">Drop</th>
            <th scope="col">Minutes</th>
            <th scope="col">Looked at</th>
          </tr>
        </thead>
        <tbody>
          {DELIVERIES.map((x, i) => {
            const r = d.runs[i],
              best = route({ algo: 'dijkstra', weight: 1 }, x, x.to).minutes;
            return (
              <tr key={x.at} data-drop={i}>
                <th scope="row">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={s.drop === i}
                    onClick={() => onDrop(i)}
                  >{`${x.at} ${nameOf(x.to)}`}</button>
                </th>
                <td className={r.minutes <= best ? 'ok' : 'bad'}>{`${r.minutes} (best ${best})`}</td>
                <td>{r.looked}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TownNote />
    </div>
  );
}

export default function DeliveryDay() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, drop: 0, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          i = DELIVERIES[state.drop] ? state.drop : 0,
          x = DELIVERIES[i],
          r = route(b, x, x.to),
          closed = closedOf(x.closed);
        return (
          <TableStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: {
                closed,
                jams: x.jams,
                goal: x.to,
                route: r.roads,
                arrived: r.found,
                noRoute: !r.found,
                settled: r.settles.map(z => z.id),
              },
              search: r,
              unit: b.algo === 'bfs' ? 'roads' : 'min',
              caption: `${x.at} to ${nameOf(x.to)}, ${nameOfBench(b)}: ${r.minutes} min, ${r.looked} junctions looked at.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => (
          <BenchControls s={state} set={focused ? apply : sync} onDrop={drop => sync({ ...state, drop })} />
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="astar" />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
