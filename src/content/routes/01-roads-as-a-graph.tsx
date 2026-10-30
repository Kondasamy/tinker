// Chapter 1: roads as a graph. The town is junctions joined by roads, each with its minutes. The reader picks the
// bridge on the van's route, predicts what happens when it closes, closes it (the search reroutes over the other
// bridge), closes the other too (no route: the van is held at the depot), then reopens all. The road list and a tap on
// the map share one selection.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { dijkstra } from '../../lib/routes/dijkstra';
import { CUSTOMER, closedOf, nameOf, road } from '../../lib/routes/graph';
import { DETOUR, FASTEST, OTHER_BRIDGE, ROUTE_BRIDGE } from '../../lib/routes/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RoadList, Status, TableStage, TownNote, routeText, type View } from './kit';

const MODULE = 'routes',
  ID = '01-roads-as-a-graph';
export const PARTS = TABLE_PARTS;
const named = (id: string) => `${nameOf(road(id).a)} to ${nameOf(road(id).b)}`;
const BRIDGE = named(ROUTE_BRIDGE),
  OTHER = named(OTHER_BRIDGE);

export const P1 = {
  question: `What does the van do once ${BRIDGE} closes?`,
  options: [
    'Crosses the other bridge, a few minutes slower',
    'Waits at the depot until the bridge reopens',
    'Drives the same way: the app hasn’t heard',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A bus app’s graph holds stops and the minutes between them. A street shuts for a parade. What changes?',
  options: [
    'That street’s road leaves the graph, and the search runs again',
    'The whole map is redrawn from scratch',
    'Nothing: the old route stands until the parade ends',
  ],
  correct: 0,
  explanation: 'A closure removes one road; the same search runs over what is left.',
  why: [
    'Right: the graph loses one road and the search finds the best way over the rest.',
    'Only one road changed; the junctions and every other road stay as they were.',
    'A route over a closed street can’t be driven, so the app must search again at once.',
  ],
};

interface S {
  closed: string[];
  selected: string | null;
  p1: number | null;
  cut: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'graph',
    focus: 'roads',
    visibleControls: ['roads'],
    narration: 'To the app, the town is a graph: junctions joined by roads, each road’s cost its minutes.',
    act: `Pick ${BRIDGE} in the list.`,
    say: { block: 'van', text: 'Delivered' },
    predicate: s => s.selected === ROUTE_BRIDGE,
    hint: 'Bridges cross the blue river. The list names each road by its two junctions.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Roadworks close that bridge this morning.',
    act: 'Predict what the van does.',
    say: { block: 'bridge', text: 'Roadworks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'close',
    focus: 'roads',
    visibleControls: ['p1', 'roads', 'status'],
    narration: 'Your pick is locked.',
    act: `Close ${BRIDGE}: press Enter in the list, or Close this road.`,
    predicate: s => s.p1 !== null && closedOf(s.closed).includes(ROUTE_BRIDGE),
  },
  {
    id: 'detour',
    focus: 'roads',
    visibleControls: ['out1', 'roads', 'status'],
    narration: `The search ran again without it: ${DETOUR.minutes} minutes over ${OTHER}, not ${FASTEST.minutes}.`,
    act: `Now close ${OTHER} too.`,
    say: { block: 'route', text: 'Detour' },
    predicate: s => [ROUTE_BRIDGE, OTHER_BRIDGE].every(b => closedOf(s.closed).includes(b)),
  },
  {
    id: 'cut',
    focus: 'roads',
    visibleControls: ['roads', 'status'],
    narration: 'No road crosses the river now, so no route exists. The van stays at the depot.',
    act: 'Tap Reopen all.',
    say: { block: 'depot', text: 'Held here' },
    setup: s => ({ ...s, cut: true }),
    predicate: s => s.cut && closedOf(s.closed).length === 0,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'A closed road simply leaves the graph; the app searches what is left.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How much of the graph did the parade change?',
  },
];

export default function RoadsAsAGraph() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ closed: [], selected: null, p1: null, cut: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const closed = closedOf(state.closed),
          r = dijkstra({ closed });
        return (
          <TableStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onPick={selected => sync({ ...state, selected })}
            show={{
              scene: { closed, selected: state.selected, route: r.roads, arrived: r.found, noRoute: !r.found },
              search: r,
              caption: r.found
                ? `${r.minutes} min from the depot to ${nameOf(CUSTOMER)}, by ${r.roads.length} roads.`
                : 'No route: the van is held at the depot.',
            }}
          />
        );
      }}
      controls={{
        roads: ({ state, apply, sync }) => (
          <RoadList
            closed={closedOf(state.closed)}
            selected={state.selected}
            onSelect={selected => sync({ ...state, selected })}
            onClosed={closed => apply({ ...state, closed })}
          />
        ),
        status: ({ state }) => <Status>{routeText(dijkstra({ closed: closedOf(state.closed) }))}</Status>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        quiz: ({ state, apply, sync }) => (
          <>
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
