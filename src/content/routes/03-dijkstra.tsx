// Chapter 3: Dijkstra, nearest first. Step / Play grows the frontier from the depot: each step settles the frontier
// junction nearest the depot and plants a flag there. The reader predicts whether a later flag can be nearer than an
// earlier one, plays to the customer, and checks the Frontier view's rising minutes.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { FASTEST } from '../../lib/routes/story';
import { nameOf, CUSTOMER } from '../../lib/routes/graph';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Status, TableStage, TownNote, routeText, searchScene, type View } from './kit';

const MODULE = 'routes',
  ID = '03-dijkstra';
export const PARTS = TABLE_PARTS;
const D = FASTEST,
  N = D.settles.length,
  rising = D.settles.every((s, i) => i === 0 || s.g >= D.settles[i - 1].g);

export const P1 = {
  question: 'Can a later flag be nearer the depot than an earlier one?',
  options: [
    'No: each settles at least as far out as the last',
    'Yes: it settles junctions in any order',
    'Yes, whenever a later road is short',
  ],
};
export const OUTCOME = rising ? 0 : 1;

export const QUIZ = {
  question:
    'A fire crew’s app runs Dijkstra from the station. A junction just settled at 6 minutes. Could it get quicker?',
  options: [
    'No: everything still waiting is at least 6 minutes out',
    'Yes, if a short road leads to it later',
    'Yes, once every junction is settled',
  ],
  correct: 0,
  explanation: 'A junction settles only when nothing on the frontier is nearer, so no later way can beat it.',
  why: [
    'Right: any other way passes a frontier junction that is already 6 minutes or more away.',
    'A later road starts from a junction at least as far out, so adding it can only cost more.',
    'Settled means final; settling the rest never changes it.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'step',
    focus: 'stage',
    visibleControls: [],
    narration:
      'Dijkstra’s algorithm starts at the depot. Junctions it has reached wait on the frontier, their signposts lit.',
    act: 'Press Step three times.',
    say: { block: 'frontier', text: 'Frontier' },
    predicate: s => s.t >= 3,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Each step, it will settle the frontier junction nearest the depot and plant a flag there.',
    act: 'Predict the order of the flags.',
    say: { block: 'flags', text: 'Settled' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'play',
    focus: 'stage',
    visibleControls: ['p1', 'status'],
    narration: 'Your pick is locked.',
    act: `Play until ${nameOf(CUSTOMER)} settles.`,
    predicate: s => s.p1 !== null && s.t >= N,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'status', 'quiz'],
    narration: `${N} junctions settled, minutes only rising. ${nameOf(CUSTOMER)} settled at ${D.minutes}: nothing left could beat it.`,
    act: 'Check the Frontier tab, then answer.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When a junction settles, how far out is everything still waiting?',
  },
];

export default function Dijkstra() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <TableStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTick={t => sync({ ...state, t })}
          show={{
            scene: searchScene(D, state.t),
            search: D,
            upTo: state.t,
            caption: `Dijkstra: ${Math.min(state.t, N)} settled${state.t ? `, the last at ${D.settles[Math.min(state.t, N) - 1].g} min` : ''}.`,
          }}
        />
      )}
      controls={{
        status: ({ state }) => <Status>{state.t >= N ? routeText(D) : 'Searching from the depot.'}</Status>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="dijkstra" />
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
