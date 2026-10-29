// Chapter 5: the new shopper and the new product (cold start). A new shopper ticks products they like; their taste is
// the mean of those products' (tasteOf), so they stand between them and can be moved. The Kestrel K3 has no orders, so
// no taste: it stands off the map and ranks nowhere. Its first three orders (factors.json's afterFirst, pinned) give it
// a place, but a low rank.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { AFTER_FIRST, BASE, tasteOf, type Vec } from '../../lib/recommendations/factorise';
import { rankOf, tasteRows, tasteShelf } from '../../lib/recommendations/score';
import { FIRST_BUYERS, NEW_PRODUCT, TRAIN, customerOf, productOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '05-new-shopper-new-product';
export const PARTS = SHELF_PARTS;
export const K3 = productOf(NEW_PRODUCT);
/** the products a new shopper can tick */
export const CHOICES = ['wood-glue', 'hinge-pack', 'label-roll', 'shelving-bay', 'drill-bits', 'cabinet-handles'].map(
  productOf,
);
/** a warehouse customer who hasn't bought the K3: where it ranks for them once it has orders */
export const WAREHOUSE = customerOf('c15');
export const RANK = rankOf(AFTER_FIRST.items, AFTER_FIRST.users[WAREHOUSE.id]!, TRAIN[WAREHOUSE.id], K3.id);
export const BUYERS = FIRST_BUYERS.length;

interface S {
  picks: string[];
  /** the marker's taste once moved; null at the mean of the picks */
  you: Vec | null;
  after: boolean;
  p1: number | null;
  view: View;
  quiz: number | null;
}
const itemsOf = (s: Pick<S, 'after'>) => (s.after ? AFTER_FIRST : BASE).items;
/** the new shopper's taste: moved, else the mean of their picks; null before any pick */
export const tasteFor = (s: Pick<S, 'picks' | 'you' | 'after'>) => s.you ?? tasteOf(itemsOf(s), s.picks);

export const P1 = {
  question: `The ${K3.name} launched today, with no orders. Where does it rank on a shelf?`,
  options: ['Nowhere: no orders, no two numbers', 'First: it is new', 'Fifth: new things go last'],
};
export const outcomeOf = () => (BASE.items[K3.id] === null ? 0 : 1);

export const QUIZ = {
  question: 'A streaming service adds a film nobody has watched yet. How can it reach anyone’s list?',
  options: [
    'Show it to some people anyway, so it gets its first views',
    'Wait: the factors will place it on their own',
    'Rank it first for everyone',
  ],
  correct: 0,
  explanation: 'A product earns its two numbers from orders, so something has to give it its first ones.',
  why: [
    'Right: a few deliberate showings give it the orders the factors need.',
    'With no views, the film has no two numbers, and no shelf will ever show it.',
    'Ranking it first for everyone ignores taste and pushes out what people want.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'picks',
    focus: 'picks',
    visibleControls: ['picks'],
    narration: 'A new shopper with no orders is a Cold start: the shop knows nothing. They can say what they like.',
    act: 'Tick two products they like.',
    say: { block: 'map', text: 'No place yet' },
    predicate: s => s.picks.length >= 2,
  },
  {
    id: 'placed',
    focus: 'stage',
    visibleControls: ['picks'],
    narration: 'Their two numbers average their picks, so they stand between them. The shelf follows.',
    act: 'Move them with the arrow keys or a drag.',
    say: { block: 'shopper', text: 'Between picks' },
    predicate: s => s.you !== null,
    solution: s => ({ ...s, you: BASE.items[CHOICES[2].id] }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The ${K3.name} stands off the map by the side.`,
    act: 'Predict where it ranks.',
    say: { block: 'new', text: 'No orders yet' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'orders',
    focus: 'after',
    visibleControls: ['out1', 'after'],
    narration: 'Nowhere: with no orders it has no two numbers, so no taste can point at it.',
    act: `Add its first ${BUYERS} orders.`,
    predicate: s => s.after,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Now it is on the map, but ranks ${RANK} for ${WAREHOUSE.name}: too few orders to reach a shelf.`,
    act: 'One question to finish.',
    say: { block: 'map', text: 'On the map' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where do a product’s two numbers come from?',
  },
];

export default function NewShopperNewProduct() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ picks: [], you: null, after: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const items = itemsOf(state),
          taste = tasteFor(state);
        return (
          <RecsStage
            shelf={{
              view: 'map',
              shelf: taste ? tasteShelf(items, taste, state.picks) : [],
              shopper: 'New shopper',
              you: taste,
              items,
              ...(items[K3.id] ? {} : { ghost: K3.id }),
            }}
            rows={taste ? tasteRows(items, taste, state.picks, 12) : []}
            scoreName="Taste match"
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onMove={you => sync({ ...state, you })}
            caption={
              taste
                ? `A new shopper, placed by ${state.picks.length} picks.`
                : 'A new shopper with no orders: no place on the map.'
            }
          />
        );
      }}
      controls={{
        picks: ({ state, apply }) => (
          <fieldset className="rc-choose">
            <legend>They like</legend>
            {CHOICES.map(p => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={state.picks.includes(p.id)}
                  onChange={e =>
                    apply({
                      ...state,
                      you: null,
                      picks: e.target.checked ? [...state.picks, p.id] : state.picks.filter(x => x !== p.id),
                    })
                  }
                />{' '}
                {p.name}
              </label>
            ))}
          </fieldset>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        after: ({ state, apply }) => (
          <>
            <label className="rc-choose">
              <input
                type="checkbox"
                checked={state.after}
                onChange={e => apply({ ...state, after: e.target.checked })}
              />
              {` ${BUYERS} warehouse customers buy the ${K3.short}`}
            </label>
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
