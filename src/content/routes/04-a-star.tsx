// Chapter 4: A*, lean toward the goal. The reader switches to A* (Dijkstra plus a straight-line guess of the minutes
// left), predicts what it finds, plays it (same minutes, fewer junctions settled), then raises the guess's weight and
// sees fewer junctions still, but a slower route. All live over the town.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { astar } from '../../lib/routes/astar';
import { CUSTOMER, nameOf } from '../../lib/routes/graph';
import { FASTEST, LEANING } from '../../lib/routes/story';
import { WEIGHTS } from '../../lib/routes/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Chips, Fact, Pick, Status, TableStage, TownNote, routeText, searchScene, type View } from './kit';

const MODULE = 'routes',
  ID = '04-a-star';
export const PARTS = TABLE_PARTS;
const D = FASTEST,
  A = LEANING,
  HEAVY = 2,
  W2 = astar(HEAVY);
type Algo = 'dijkstra' | 'astar';
const OPTIONS: [Algo, string][] = [
  ['dijkstra', 'Dijkstra'],
  ['astar', 'A*'],
];
const weightOf = (w: unknown) => (WEIGHTS.includes(w as number) ? (w as number) : 1);
export const searchOf = (s: { algo: Algo; weight: number }) => (s.algo === 'astar' ? astar(weightOf(s.weight)) : D);

export const P1 = {
  question: 'What will A* find?',
  options: [
    `The same ${D.minutes} minutes, with fewer junctions looked at`,
    'A quicker route than Dijkstra’s',
    'Fewer junctions, but a slower route',
  ],
};
export const OUTCOME = A.minutes === D.minutes && A.looked < D.looked ? 0 : 2;

export const QUIZ = {
  question: 'A game’s pathfinder must answer fast and may take a slightly longer path. What fits?',
  options: ['A* with a weight a little above 1', 'Dijkstra: exact is always best', 'Fewest roads: it ignores costs'],
  correct: 0,
  explanation: 'A heavier weight looks at fewer junctions and accepts a route a little longer than the best.',
  why: [
    'Right: the weight trades a few minutes of route for a much smaller search.',
    'Exact costs the most looking; here a slightly longer path is allowed, so it does extra work for nothing.',
    'Ignoring costs can pick a far slower path, not slightly longer.',
  ],
};

interface S {
  algo: Algo;
  weight: number;
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'guess',
    focus: 'algo',
    visibleControls: ['algo'],
    narration:
      'A* adds a heuristic to each junction’s minutes: a guess of the minutes left, by straight line at the fastest road’s pace.',
    act: 'Pick A*.',
    say: { block: 'customer', text: 'Goal' },
    predicate: s => s.algo === 'astar',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Dijkstra looked at ${D.looked} junctions to find the ${D.minutes}-minute route.`,
    act: 'Predict what A* finds.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'play',
    focus: 'stage',
    visibleControls: ['p1', 'status'],
    narration: 'Your pick is locked.',
    act: `Play until ${nameOf(CUSTOMER)} settles.`,
    say: { block: 'frontier', text: 'Leaning east' },
    predicate: s => s.p1 !== null && s.algo === 'astar' && s.t >= searchOf(s).settles.length,
  },
  {
    id: 'weight',
    focus: 'weight',
    visibleControls: ['out1', 'weight', 'status'],
    narration: `A* looked at ${A.looked}, for the same minutes: its guess never overestimates. A weight above 1 leans harder.`,
    act: `Raise the weight to ${HEAVY}.`,
    predicate: s => s.algo === 'astar' && weightOf(s.weight) >= HEAVY,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['weight', 'status', 'quiz'],
    narration: `At ${HEAVY}: ${W2.looked} junctions, but ${W2.minutes} minutes, not ${D.minutes}. Leaning harder trades minutes for speed.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting looks at less, and accepts a slightly longer path?',
  },
];

export default function AStar() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ algo: 'dijkstra', weight: 1, t: D.settles.length, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = searchOf(state);
        return (
          <TableStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t })}
            show={{
              scene: searchScene(r, state.t),
              search: r,
              upTo: state.t,
              caption: `${state.algo === 'astar' ? `A* at weight ${weightOf(state.weight)}` : 'Dijkstra'}: ${Math.min(state.t, r.settles.length)} junctions looked at.`,
            }}
          />
        );
      }}
      controls={{
        // a new search starts from the depot, so its frontier can be watched growing
        algo: ({ state, sync }) => (
          <Chips
            label="Search"
            value={state.algo}
            options={OPTIONS}
            onChange={algo => sync({ ...state, algo, t: 0 })}
          />
        ),
        weight: ({ state, apply }) => (
          <Pick
            id="rt-weight4"
            name="Weight on the guess"
            value={weightOf(state.weight)}
            values={WEIGHTS}
            text={w => `${w}×`}
            onChange={weight => apply({ ...state, weight, t: astar(weight).settles.length })}
          />
        ),
        status: ({ state }) => {
          const r = searchOf(state);
          return (
            <Status>
              {state.t >= r.settles.length
                ? `${routeText(r)} ${r.looked} junctions looked at.`
                : 'Searching from the depot.'}
            </Status>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="weighted" />
            <TownNote />
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
