// Chapter 5: live traffic. A jam on the van's route only raises one road's minutes; the reader drags them up until
// Dijkstra's route flips (pinned), then closes a road on the new route: a closure is a road with no way through. The
// road list and the map share one selection. Everything is the same search over new weights.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { dijkstra } from '../../lib/routes/dijkstra';
import { closedOf, nameOf, road } from '../../lib/routes/graph';
import { FREE, JAM_MINUTES, JAM_ROAD, flipAt, jamMinutesOf, jamOf } from '../../lib/routes/traffic';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, RoadList, Status, TableStage, TownNote, routeText, type View } from './kit';

const MODULE = 'routes',
  ID = '05-live-traffic';
export const PARTS = TABLE_PARTS;
const JAM = `${nameOf(road(JAM_ROAD).a)} to ${nameOf(road(JAM_ROAD).b)}`,
  FLIP = flipAt(),
  FLIPPED = dijkstra(jamOf(FLIP));
export const searchOf = (s: { jam: number; closed: string[] }) =>
  dijkstra({ ...jamOf(jamMinutesOf(s.jam)), closed: closedOf(s.closed) });

export const P1 = {
  question: 'What must the app change to route around the jam?',
  options: [
    'Only that road’s minutes; the search stays the same',
    'Switch to a search built for traffic',
    'Nothing, until the road is closed',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A rideshare app hears of a crash on a bridge. What does its routing code change?',
  options: [
    'That road’s cost, then it searches again',
    'It switches to a special crash algorithm',
    'The heuristic, so A* steers away from the bridge',
  ],
  correct: 0,
  explanation: 'Traffic and crashes only change road costs; the same search runs over the new numbers.',
  why: [
    'Right: the bridge’s minutes go up, or it closes, and the search finds the best way now.',
    'No new algorithm is needed: a slow road is just a road with more minutes.',
    'The guess is about straight-line distance to the goal; the road’s own cost is what changed.',
  ],
};

interface S {
  jam: number;
  closed: string[];
  selected: string | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A jam is building on ${JAM}, on the van’s route. Free-flowing, it takes ${FREE} minutes.`,
    act: 'Predict what the app must change.',
    say: { block: 'road', text: 'Jam here' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'raise',
    focus: 'jam',
    visibleControls: ['p1', 'jam', 'status'],
    narration: 'Your pick is locked.',
    act: `Drag ${JAM}’s minutes up until the route flips.`,
    predicate: s => s.p1 !== null && jamMinutesOf(s.jam) >= FLIP,
    hint: 'Watch the mustard route: it moves off the ring road at some point.',
    solution: s => ({ ...s, jam: FLIP }),
  },
  {
    id: 'close',
    focus: 'roads',
    visibleControls: ['out1', 'roads', 'status'],
    narration: `At ${FLIP} minutes the route flips: ${FLIPPED.minutes} minutes another way. Only one road’s weight changed.`,
    act: 'Now close a road on the new route.',
    say: { block: 'route', text: 'New route' },
    predicate: s => closedOf(s.closed).some(r => FLIPPED.roads.includes(r)),
    hint: 'The new route is painted mustard. Tap one of its roads, then Close this road.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['roads', 'status', 'quiz'],
    narration: 'A closure is a road with no way through. Jams and closures change costs; the search stays the same.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the app need a new search, or new numbers?',
  },
];

export default function LiveTraffic() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ jam: FREE, closed: [], selected: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = searchOf(state),
          closed = closedOf(state.closed);
        return (
          <TableStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onPick={selected => sync({ ...state, selected })}
            show={{
              scene: {
                ...jamOf(jamMinutesOf(state.jam)),
                closed,
                selected: state.selected,
                route: r.roads,
                arrived: r.found,
                noRoute: !r.found,
              },
              search: r,
              caption: `${JAM}: ${jamMinutesOf(state.jam)} min. ${r.found ? `Route ${r.minutes} min.` : 'No route.'}`,
            }}
          />
        );
      }}
      controls={{
        jam: ({ state, apply }) => (
          <Pick
            id="rt-jam5"
            name={`${JAM}, live`}
            value={jamMinutesOf(state.jam)}
            values={JAM_MINUTES}
            text={m => `${m} min`}
            onChange={jam => apply({ ...state, jam })}
          />
        ),
        roads: ({ state, apply, sync }) => (
          <RoadList
            closed={closedOf(state.closed)}
            selected={state.selected}
            edits={jamOf(jamMinutesOf(state.jam))}
            onSelect={selected => sync({ ...state, selected })}
            onClosed={closed => apply({ ...state, closed })}
          />
        ),
        status: ({ state }) => {
          const r = searchOf(state);
          return <Status>{`${routeText(r)}${r.roads.includes(JAM_ROAD) ? ` It still uses ${JAM}.` : ''}`}</Status>;
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="traffic" />
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
