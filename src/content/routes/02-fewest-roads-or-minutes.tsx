// Chapter 2: fewest roads or fewest minutes. Breadth-first search finds the route with the fewest roads through the
// slow market streets; the reader predicts whether it is also the quickest, then switches to fewest minutes
// (Dijkstra) and compares. Both run live over the town.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { FASTEST, FEWEST_ROADS } from '../../lib/routes/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Chips, Fact, Status, TableStage, TownNote, type View } from './kit';

const MODULE = 'routes',
  ID = '02-fewest-roads-or-minutes';
export const PARTS = TABLE_PARTS;
const B = FEWEST_ROADS,
  D = FASTEST;
type Algo = 'bfs' | 'dijkstra';
const OPTIONS: [Algo, string][] = [
  ['bfs', 'Fewest roads'],
  ['dijkstra', 'Fewest minutes'],
];

export const P1 = {
  question: 'Is the fewest-roads route also the quickest?',
  options: [
    'No: a route with more roads is quicker',
    'Yes: fewer roads always means fewer minutes',
    'They tie: every road takes about as long',
  ],
};
export const OUTCOME = D.minutes < B.minutes ? 0 : 2;

export const QUIZ = {
  question: 'A courier app counts stops, not minutes. When does that send riders the slow way?',
  options: [
    'When a route with fewer stops runs along slow streets',
    'Never: fewer stops is always quicker',
    'Only when a road is closed',
  ],
  correct: 0,
  explanation: 'Counting roads ignores what each road costs; a long fast way can beat a short slow one.',
  why: [
    'Right: a hop count treats a jammed high street like an empty ring road.',
    'Stops say nothing about how long each leg takes, so a short list can be slow.',
    'The slow way comes from ignoring minutes, closures or not.',
  ],
};

interface S {
  algo: Algo | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bfs',
    focus: 'algo',
    visibleControls: ['algo'],
    narration:
      'Breadth-first search spreads out one road at a time, so it finds the lowest hop count: the fewest roads.',
    act: 'Pick Fewest roads.',
    predicate: s => s.algo === 'bfs',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['algo', 'p1'],
    narration: `Its route takes ${B.roads.length} roads and ${B.minutes} minutes, straight through the market.`,
    act: 'Predict: is it also the quickest?',
    say: { block: 'market', text: 'Slow streets' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'minutes',
    focus: 'algo',
    visibleControls: ['p1', 'algo'],
    narration: 'Your pick is locked.',
    act: 'Pick Fewest minutes.',
    predicate: s => s.p1 !== null && s.algo === 'dijkstra',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'algo', 'status', 'quiz'],
    narration: `Fewest minutes takes ${D.roads.length} roads but only ${D.minutes} minutes: the ring road is fast.`,
    act: 'One question to finish.',
    say: { block: 'route', text: 'Ring road' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a hop count know which streets are slow?',
  },
];

export default function FewestRoadsOrMinutes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ algo: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = state.algo === 'bfs' ? B : state.algo === 'dijkstra' ? D : null;
        return (
          <TableStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: r ? { route: r.roads, arrived: true } : {},
              search: r ?? undefined,
              unit: state.algo === 'bfs' ? 'roads' : 'min',
              caption: r
                ? `${state.algo === 'bfs' ? 'Fewest roads' : 'Fewest minutes'}: ${r.roads.length} roads, ${r.minutes} min.`
                : 'The van waits at the depot.',
            }}
          />
        );
      }}
      controls={{
        algo: ({ state, sync }) => (
          <Chips label="Search for" value={state.algo} options={OPTIONS} onChange={algo => sync({ ...state, algo })} />
        ),
        status: () => (
          <Status>{`Fewest roads: ${B.roads.length} roads, ${B.minutes} min. Fewest minutes: ${D.roads.length} roads, ${D.minutes} min.`}</Status>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="osrm-cost" />
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
