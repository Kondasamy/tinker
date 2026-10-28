// Chapter 4: hidden tastes. The floor becomes the taste map: every product and customer at their two numbers
// (factors.json, pinned). The reader moves Ash Joinery toward the warehouse corner with the arrow keys or a drag and
// watches the shelf re-rank, picks Quay Freight (who stands there), predicts whether Ash's own taste finds their hidden
// next order, and goes back to see it found.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BASE, type Vec } from '../../lib/recommendations/factorise';
import { SCORES, tasteRows, tasteShelf } from '../../lib/recommendations/score';
import { AISLES, CUSTOMERS, HELD_OUT, TRAIN, customerOf, productOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, OrdersNote, RecsStage, nearestAisle, type View } from './kit';

const MODULE = 'recommendations',
  ID = '04-hidden-tastes';
export const PARTS = SHELF_PARTS;
export const FIRST = customerOf('c01'),
  OTHER = customerOf('c35');
export const NEXT = productOf(HELD_OUT[FIRST.id]);
export const TOWARD = 'store';
/** the taste the shelf ranks by: the moved marker's, else the customer's own */
export const tasteFor = (s: { shopper: string; you: Vec | null }) => s.you ?? BASE.users[s.shopper]!;
export const shelfFor = (s: { shopper: string; you: Vec | null }) =>
  tasteShelf(BASE.items, tasteFor(s), TRAIN[s.shopper]);

export const P1 = {
  question: `${FIRST.name}’s hidden next order was ${NEXT.name}. Is it on their taste shelf?`,
  options: ['Yes: their taste points at it', 'No: only bestsellers rank', 'No: they never bought it before'],
};
export const outcomeOf = () => (shelfFor({ shopper: FIRST.id, you: null }).includes(NEXT.id) ? 0 : 1);

export const QUIZ = {
  question:
    'A film app places you and every film on a map of two hidden numbers. What makes a film rank first for you?',
  options: ['It points the same way you do', 'It is the most watched', 'You watched it last'],
  correct: 0,
  explanation: 'The score is your two numbers times the film’s: the same direction scores highest.',
  why: [
    'Right: the ranking multiplies your numbers by the film’s, so a shared direction wins.',
    'Popularity is the bestsellers shelf; the map ranks by taste.',
    'A film you watched is skipped, and recency is not part of the two numbers.',
  ],
};

interface S {
  shopper: string;
  /** the marker's taste once moved; null at the customer's own */
  you: Vec | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'map',
    focus: 'stage',
    visibleControls: [],
    narration: 'Factors: two numbers per customer and product, from orders, place everyone on this Taste map.',
    act: `Move ${FIRST.name} toward ${AISLES[TOWARD]}: arrow keys or drag.`,
    say: { block: 'map', text: 'Taste map' },
    predicate: s => nearestAisle(tasteFor(s)) === TOWARD,
    solution: s => ({ ...s, you: BASE.users[OTHER.id] }),
  },
  {
    id: 'other',
    focus: 'stage',
    visibleControls: [],
    narration: `The shelf ranks products pointing the same way as the shopper. ${OTHER.name} already stands there.`,
    act: `Pick ${OTHER.name} in the Shopper list.`,
    say: { block: 'shelf', text: 'Re-ranked' },
    predicate: s => s.shopper === OTHER.id,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${FIRST.name} never told the shop what they like. Their two numbers come only from their orders.`,
    act: 'Predict their shelf.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'back',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Pick ${FIRST.name} again.`,
    say: { block: 'shopper', text: 'Back home' },
    predicate: s => s.p1 !== null && s.shopper === FIRST.id && s.you === null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `There it is. Two numbers each score ${SCORES.factors.hits} hits in ${CUSTOMERS.length}, against ${SCORES.popular.hits} for bestsellers.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the shelf multiply?',
  },
];

const OPTIONS = [FIRST, OTHER].map(c => ({ id: c.id, name: c.name }));

export default function HiddenTastes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ shopper: FIRST.id, you: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, apply, say }) => (
        <RecsStage
          shelf={{
            view: 'map',
            shelf: shelfFor(state),
            shopper: customerOf(state.shopper).name,
            you: tasteFor(state),
            items: BASE.items,
          }}
          rows={tasteRows(BASE.items, tasteFor(state), TRAIN[state.shopper])}
          scoreName="Taste match"
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onMove={you => sync({ ...state, you })}
          pick={{ value: state.shopper, options: OPTIONS, onPick: shopper => apply({ ...state, shopper, you: null }) }}
          caption={`${customerOf(state.shopper).name} on the taste map${state.you ? ', moved' : ''}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="mf" />
            <Fact id="implicit" />
            <OrdersNote />
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
