// Chapter 1: the bestsellers shelf. Ash Joinery's shelf ranks products by how many customers bought them; the reader
// opens the ranking, predicts what a warehouse customer sees, picks them and finds nearly the same five. The score:
// bestsellers' hits on the held-out next orders. Search's ranking chapter is the query-side contrast, one link away.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCORES, methodRows, popularity, shelfOf, topOf } from '../../lib/recommendations/score';
import { CUSTOMERS, PRODUCTS, TRAIN, customerOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '01-the-bestsellers-shelf';
export const PARTS = SHELF_PARTS;
export const FIRST = customerOf('c01'),
  OTHER = customerOf('c07');
export const shelfFor = (c: string) => shelfOf('popular', TRAIN, c);
const POP = popularity(TRAIN);
/** how many of the five the two shelves share */
export const SHARED = shelfFor(FIRST.id).filter(p => shelfFor(OTHER.id).includes(p)).length;

export const P1 = {
  question: `${OTHER.name} runs a warehouse. What does their bestsellers shelf show?`,
  options: ['Warehouse kit: labels, tape, scanners', `Nearly the same five as ${FIRST.name}’s`, 'Nothing yet'],
};
/** Option 1 when both shelves are the one bestsellers ranking with each customer's own products skipped. */
export const outcomeOf = () => {
  const order = topOf(p => POP[p], [], PRODUCTS.length);
  const same = (c: string) =>
    shelfFor(c).join() ===
    order
      .filter(p => !TRAIN[c].includes(p))
      .slice(0, 5)
      .join();
  return same(FIRST.id) && same(OTHER.id) ? 1 : 0;
};

export const QUIZ = {
  question: 'A bestsellers shelf at a bakery shows bread to everyone. Who does it serve worst?',
  options: ['Customers who never buy bread', 'Customers who buy the most bread', 'Nobody: everyone sees the same'],
  correct: 0,
  explanation: 'One ranking for everyone fits the average customer and misses everyone else.',
  why: [
    'Right: their next purchase is never among the bestsellers, so their shelf never finds it.',
    'They own the bestsellers already; a shelf of them adds little, but it does match their taste.',
    'Seeing the same shelf is the problem: different customers need different things.',
  ],
};

interface S {
  shopper: string;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'shelf',
    focus: 'stage',
    visibleControls: [],
    narration: `This shelf ranks Bestsellers: products by how many of ${CUSTOMERS.length} customers bought them, less what ${FIRST.name} owns.`,
    act: 'Open the Ranking tab.',
    say: { block: 'shelf', text: 'Top five' },
    predicate: s => s.view === 'rank',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${OTHER.name} buys labels and shelving, not glue.`,
    act: 'Predict their shelf.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'pick',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Pick ${OTHER.name} in the Shopper list.`,
    say: { block: 'shopper', text: 'Who is looking' },
    predicate: s => s.p1 !== null && s.shopper === OTHER.id,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'link', 'quiz'],
    narration: `One ranking, less what each owns: ${SHARED} of five match. On hidden next orders, bestsellers score ${SCORES.popular.hits} hits in ${CUSTOMERS.length}.`,
    act: 'One question to finish.',
    say: { block: 'shelf', text: 'Same five' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose next purchase is never a bestseller?',
  },
];

const OPTIONS = [FIRST, OTHER].map(c => ({ id: c.id, name: c.name }));

export default function TheBestsellersShelf() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ shopper: FIRST.id, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, apply, say }) => (
        <RecsStage
          shelf={{ view: 'aisle', shelf: shelfFor(state.shopper), shopper: customerOf(state.shopper).name }}
          rows={methodRows('popular', TRAIN, state.shopper)}
          scoreName="Customers who bought it"
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          pick={{ value: state.shopper, options: OPTIONS, onPick: shopper => apply({ ...state, shopper }) }}
          caption={`${customerOf(state.shopper).name}’s bestsellers shelf, from ${PRODUCTS.length} products.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        link: () => (
          <>
            <Fact id="top-sellers" />
            <p className="note rc-note">
              {`Only ${SCORES.popular.coverage} of ${PRODUCTS.length} products ever reach a bestsellers shelf.`}
            </p>
            <p className="note rc-note">
              Here nobody types anything. Search ranks by what you type:{' '}
              <a href="/search/03-rare-words-count-more/">ranking from a query, in Search</a>.
            </p>
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
