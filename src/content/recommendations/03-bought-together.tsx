// Chapter 3: bought together. One product in the basket; the shelf beside it ranks every other product by how alike
// their buyers are. The reader moves from the hinge pack to the label printer, predicting what lands next to it. Summed
// over a whole basket, it finds the most next orders of any method here.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { METHODS, SCORES, togetherRows } from '../../lib/recommendations/score';
import { CUSTOMERS, SHELF, TRAIN, namesOf, productOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '03-bought-together';
export const PARTS = SHELF_PARTS;
export const START = productOf('wood-glue'),
  FIRST = productOf('hinge-pack'),
  PRINTER = productOf('label-printer');
export const BASKETS = [START, FIRST, PRINTER];
export const rowsFor = (p: string) => togetherRows(TRAIN, p);
export const shelfFor = (p: string) =>
  rowsFor(p)
    .slice(0, SHELF)
    .map(r => r.id);
/** bought together beats every other method on hits */
export const BEST = METHODS.every(m => m === 'items' || SCORES[m].hits < SCORES.items.hits);

export const P1 = {
  question: `Now the ${PRINTER.name}. What lands beside it?`,
  options: ['Warehouse kit: labels, scanners, shelving', 'Hinges and handles, as before', 'The bestsellers'],
};
/** option 0 when most of the printer's five are warehouse products */
export const outcomeOf = () => (shelfFor(PRINTER.id).filter(p => productOf(p).aisle === 'store').length >= 3 ? 0 : 1);

export const QUIZ = {
  question:
    'A bookshop sees that people who buy a cookbook often buy a spice guide. A new customer buys the cookbook. What next?',
  options: ['Show them the spice guide', 'Wait until they buy a second book', 'Show the week’s bestsellers'],
  correct: 0,
  explanation: 'Bought together needs only the product in hand, not a history of the shopper.',
  why: [
    'Right: the pair comes from other customers’ orders, so one purchase is enough.',
    'Product similarity is already known from everyone else’s orders; one book is enough.',
    'Bestsellers ignore the cookbook entirely, the one clue they gave.',
  ],
};

interface S {
  basket: string;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'together',
    focus: 'stage',
    visibleControls: [],
    narration: 'Bought together ranks products by shared buyers with the one in the basket.',
    act: `Pick ${FIRST.name} in the Basket list.`,
    say: { block: 'basket', text: 'In the basket' },
    predicate: s => s.basket === FIRST.id,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${FIRST.name} brought ${namesOf(shelfFor(FIRST.id).slice(0, 2))}: what the same buyers bought.`,
    act: 'Predict the next shelf.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'pick',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Pick the ${PRINTER.name} in the Basket list.`,
    predicate: s => s.p1 !== null && s.basket === PRINTER.id,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Summed over each whole basket, it scores ${SCORES.items.hits} hits in ${CUSTOMERS.length}, the most of any shelf in this module.`,
    act: 'One question to finish.',
    say: { block: 'shelf', text: 'Warehouse kit' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the shop already know from everyone else’s orders?',
  },
];

const OPTIONS = BASKETS.map(p => ({ id: p.id, name: p.name }));

export default function BoughtTogether() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ basket: START.id, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, apply, say }) => (
        <RecsStage
          shelf={{ view: 'aisle', shelf: shelfFor(state.basket), shopper: 'This basket', basket: state.basket }}
          rows={rowsFor(state.basket)}
          scoreName="Same buyers (similarity)"
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          pick={{
            value: state.basket,
            options: OPTIONS,
            label: 'Basket',
            onPick: basket => apply({ ...state, basket }),
          }}
          caption={`Bought together with ${productOf(state.basket).name}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
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
