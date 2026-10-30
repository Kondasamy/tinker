// Chapter 6: whole-country maps. Dijkstra looked at most of the town; Western Europe has about 18 million junctions
// (cited). Contraction hierarchies are a cited fact with a picture only (Scope Boundaries): shortcut arcs over the
// town, each storing the minutes Dijkstra finds between its ends, worked out ahead of time. Search's index is the same
// idea, and the chapter links to it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { TABLE_PARTS } from '../../components/scenes/tabletopScene';
import { nameOf } from '../../lib/routes/graph';
import { COUNTS, FASTEST, SHORTCUTS } from '../../lib/routes/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { fact } from '../../lib/routes/facts';
import { Fact, Status, TableStage, TownNote, type View } from './kit';

const MODULE = 'routes',
  ID = '06-whole-country-maps';
export const PARTS = TABLE_PARTS;
const SC = SHORTCUTS[0],
  /** Western Europe's junctions in Geisberger et al.'s test, in millions (matched to the fact) */
  EUROPE = Math.round(Number(fact('ch').value) / 1e6);

export const P1 = {
  question: 'How do map apps answer that fast on a whole country?',
  options: [
    'They work out shortcuts ahead of time',
    'They run Dijkstra on faster computers',
    'They only search a box around the customer',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A firm’s map rarely changes, but it answers millions of route questions a day. Where should the work go?',
  options: [
    'Ahead of time: build shortcuts once, then answer fast',
    'Into each question: search the whole map every time',
    'Into a box around each customer, ignoring the rest',
  ],
  correct: 0,
  explanation: 'Work done once ahead of time is shared by every question that follows.',
  why: [
    'Right: the work ahead of time is paid once and every question after is quick.',
    'Searching the whole map per question repeats the same work millions of times.',
    'The best route can leave any box, so cutting the map can miss it or find none.',
  ],
};

interface S {
  p1: number | null;
  shortcuts: boolean;
  quiz: number | null;
  view: View;
}

export const STEPS: Step<S>[] = [
  {
    id: 'scale',
    focus: 'p1',
    visibleControls: ['fact', 'p1'],
    narration: `Dijkstra looked at ${FASTEST.looked} of our ${COUNTS.junctions} junctions. Western Europe’s map has ${EUROPE} million, and drivers want answers now.`,
    act: 'Predict how map apps manage it.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'show',
    focus: 'shortcuts',
    visibleControls: ['p1', 'shortcuts'],
    narration: 'Your pick is locked.',
    act: 'Show the shortcuts.',
    predicate: s => s.p1 !== null && s.shortcuts,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'shortcuts', 'ch', 'quiz'],
    narration: `Each shortcut stores the quickest minutes between busy junctions: ${nameOf(SC.a)} to ${nameOf(SC.b)}, ${SC.minutes}. Contraction hierarchies build them ahead of time.`,
    act: 'One question to finish.',
    say: { block: 'shortcuts', text: 'Shortcuts' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which work is done once, and which is done per question?',
  },
];

export default function WholeCountryMaps() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, shortcuts: false, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <TableStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={{
            scene: { route: FASTEST.roads, arrived: true, shortcuts: state.shortcuts ? SHORTCUTS : [] },
            search: FASTEST,
            caption: state.shortcuts
              ? `${SHORTCUTS.length} shortcuts, drawn for illustration: ${SHORTCUTS.map(s => `${nameOf(s.a)}–${nameOf(s.b)} ${s.minutes} min`).join(', ')}.`
              : `Dijkstra: ${FASTEST.looked} of ${COUNTS.junctions} junctions looked at.`,
          }}
        />
      )}
      controls={{
        fact: () => <Fact id="ch" />,
        shortcuts: ({ state, apply }) => (
          <>
            <button
              type="button"
              className="chip"
              aria-pressed={state.shortcuts}
              onClick={() => apply({ ...state, shortcuts: !state.shortcuts })}
            >
              Show the shortcuts
            </button>
            <Status>
              {state.shortcuts
                ? `${SHORTCUTS.length} shortcuts drawn. Each stores minutes Dijkstra found ahead of time.`
                : 'No shortcuts drawn.'}
            </Status>
          </>
        ),
        ch: () => (
          <>
            <Fact id="ch-paper" />
            <Fact id="osrm" />
            <TownNote />
            <p className="note rt-note">
              Search does the same: it builds its index ahead of time, so a question reads little. See{' '}
              <a href="/search/02-the-index/">Search’s index</a>.
            </p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
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
