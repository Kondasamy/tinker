// Chapter 2: the index. The reader builds the order-number index, predicts the lookup's pages, finds order 1042 through
// it (one card box lit per level, one drawer opened) and walks its path on the Tree tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { execute, treeOf } from '../../lib/databases/planner';
import { ASSUMPTIONS, TABLE_PAGES, fmt, heightFor, scaleTo } from '../../lib/databases/table';
import { ARCHIVE_PARTS, IDLE, archiveAt, levelsOf } from '../../components/scenes/archiveScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DbStage, Fact, SimNote, Sql, type View } from './kit';
import { ONE, SQL } from './requests';

const MODULE = 'databases',
  ID = '02-the-index';
export const PARTS = ARCHIVE_PARTS;
export const LOOK = execute(ONE, 'id');
export const SCAN = execute(ONE, 'scan');
export const HEIGHT = treeOf('id').height();
export const MILLION = scaleTo(ASSUMPTIONS.scaleRows);
const GROWS = heightFor(ASSUMPTIONS.scaleRows) - HEIGHT;

export const P1 = {
  question: 'How many pages will finding order 1042 through the index read?',
  options: [
    `About ${TABLE_PAGES / 2}: half the table, on average`,
    `${LOOK.pages}: one page per level of the tree, then the row`,
    'One: the index knows the exact spot',
  ],
};
export const outcomeOf = () => (LOOK.pages === HEIGHT + 1 ? 1 : 0);

export const QUIZ = {
  question:
    'The orders table grows from ten thousand rows to ten million. What happens to a lookup through its B-tree?',
  options: [
    'It reads a page or two more: each level multiplies how many keys the tree reaches',
    'It reads a thousand times more pages, like the scan',
    'It reads the same pages: an index never slows down',
  ],
  correct: 0,
  explanation:
    'Each page points to many pages below, so each extra level multiplies the keys reached and depth grows slowly.',
  why: [
    'Right: each level fans out to many pages, so a thousand times the rows adds only a level or two.',
    'That is the full scan’s growth; the tree walks one page per level, and levels grow slowly.',
    'Once a level fills the tree gains another, so a lookup does read a little more as the table grows.',
  ],
};

interface S {
  built: boolean;
  p1: number | null;
  found: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'build',
    focus: 'build',
    visibleControls: ['build'],
    narration: 'An index is a sorted copy of one column, each entry pointing at its row. Larkspur’s is a B-tree.',
    act: 'Build the order-number index.',
    say: { block: 'index', text: 'Sorted cards' },
    predicate: s => s.built,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The full scan read ${TABLE_PAGES} pages for one order.`,
    act: 'Predict the lookup.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'find',
    focus: 'find',
    visibleControls: ['p1', 'find'],
    narration: 'Your pick is locked.',
    act: 'Find order 1042.',
    predicate: s => s.found && s.p1 !== null,
  },
  {
    id: 'tree',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `From the root, one page per level down to a leaf, then the row: ${LOOK.pages} pages, not ${TABLE_PAGES}.`,
    act: 'Open the Tree tab.',
    say: { block: 'cabinet', text: 'One drawer' },
    predicate: s => s.view === 'tree',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `At a million orders the tree grows ${GROWS} level${GROWS === 1 ? '' : 's'}: ${MILLION.lookup} pages against the scan’s ${fmt(MILLION.scan)}, by formula.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many more keys does each extra level reach?',
  },
];

export default function TheIndex() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ built: false, p1: null, found: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const shown = state.found
          ? archiveAt(LOOK, ONE)
          : state.built
            ? { ...IDLE, index: { name: 'order number', levels: levelsOf('id', ONE).map(l => ({ ...l, at: -1 })) } }
            : IDLE;
        return (
          <DbStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: shown,
              tree: state.found ? { how: 'id', query: ONE, exec: LOOK } : undefined,
              caption: state.found
                ? `Order 1042 through the index: ${LOOK.indexPages} index pages and 1 table page.`
                : state.built
                  ? `The index: ${fmt(treeOf('id').levels().at(-1)!.length)} leaf pages of sorted order numbers, ${HEIGHT} levels.`
                  : 'No index yet.',
            }}
          />
        );
      }}
      controls={{
        build: ({ state, apply }) => (
          <>
            <button type="button" className="chip" onClick={() => apply({ ...state, built: true })}>
              Build the index
            </button>
            <Sql code={SQL.index.id} />
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        find: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, found: true })}>
            Find order 1042
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <SimNote />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'tree' })}>
            Open the Tree tab
          </button>
        ),
        facts: () => (
          <>
            <Fact id="depth" />
            <Fact id="b-tree" />
          </>
        ),
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
