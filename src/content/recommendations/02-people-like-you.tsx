// Chapter 2: people like you. Hazel Carpentry's three most similar customers stand beside them; the reader predicts
// whether their purchases find Hazel's hidden next order, switches the shelf from bestsellers to people like you, and
// sees it found. The score: people like you's hits against bestsellers'.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCORES, methodRows, shelfOf } from '../../lib/recommendations/score';
import { neighbours } from '../../lib/recommendations/similar';
import { CUSTOMERS, HELD_OUT, TRAIN, customerOf, productOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '02-people-like-you';
export const PARTS = SHELF_PARTS;
export const WHO = customerOf('c17');
export const NEXT = productOf(HELD_OUT[WHO.id]);
export const ALIKE = neighbours(TRAIN, WHO.id).map(n => customerOf(n.id).name);
export type Way = 'popular' | 'users';
export const shelfFor = (way: Way) => shelfOf(way, TRAIN, WHO.id);

export const P1 = {
  question: `${WHO.name}’s next order is hidden. Will people like them put it on the shelf?`,
  options: ['Yes: similar baskets bought it', 'No: only bestsellers rank', 'Only if it is a bestseller too'],
};
export const outcomeOf = () => (shelfFor('users').includes(NEXT.id) ? 0 : 1);

export const QUIZ = {
  question: 'A music app finds two listeners with nearly the same playlists. What does it show one of them?',
  options: [
    'Songs the other played that they haven’t',
    'The most played songs on the app',
    'Songs they both played already',
  ],
  correct: 0,
  explanation: 'Similar people fill each other’s gaps: what one has and the other doesn’t is the guess.',
  why: [
    'Right: the overlap says they are alike, the difference is the suggestion.',
    'That is the bestsellers shelf: the same for everyone, whoever is alike.',
    'They have those already; a shelf skips what you own.',
  ],
};

interface S {
  way: Way;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'alike',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Similarity counts how much two baskets overlap. ${WHO.name}’s three most alike customers stand beside them.`,
    act: 'Predict what their purchases find.',
    say: { block: 'others', text: 'Most alike' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'switch',
    focus: 'way',
    visibleControls: ['p1', 'way'],
    narration: 'Your pick is locked. People like you fills the shelf with what those alike customers bought.',
    act: 'Switch the shelf to People like you.',
    predicate: s => s.p1 !== null && s.way === 'users',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `${NEXT.name} is on it. People like you score ${SCORES.users.hits} hits in ${CUSTOMERS.length}; bestsellers ${SCORES.popular.hits}.`,
    act: 'One question to finish.',
    say: { block: 'shelf', text: 'Found it' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the overlap tell you, and what does the difference?',
  },
];

const WAYS: [Way, string][] = [
  ['popular', 'Bestsellers'],
  ['users', 'People like you'],
];

export default function PeopleLikeYou() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ way: 'popular', p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RecsStage
          shelf={{ view: 'aisle', shelf: shelfFor(state.way), shopper: WHO.name, others: ALIKE }}
          rows={methodRows(state.way, TRAIN, WHO.id)}
          scoreName={state.way === 'users' ? 'Similarity of its buyers' : 'Customers who bought it'}
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`${WHO.name}’s shelf by ${state.way === 'users' ? 'people like them' : 'bestsellers'}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        way: ({ state, apply }) => (
          <fieldset className="rc-choose">
            <legend>Fill the shelf by</legend>
            {WAYS.map(([w, name]) => (
              <label key={w}>
                <input
                  type="radio"
                  name="rc-way"
                  checked={state.way === w}
                  onChange={() => apply({ ...state, way: w })}
                />{' '}
                {name}
              </label>
            ))}
          </fieldset>
        ),
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
