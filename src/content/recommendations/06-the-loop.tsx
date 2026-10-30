// Chapter 6: the loop. The shelf goes live on hidden tastes alone; each round customers buy from it and the shop
// retrains on the last few rounds' orders, replayed from loop.json (pinned; nothing factorises here). The reader steps
// the rounds and watches products no shelf shows fade off the map, then gives one slot to exploration and sees the map
// hold. Chaney, Stewart and Engelhardt's feedback-loop finding is cited.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BUY, FOLLOW, ROUNDS, WINDOW, itemsOf, loopOf, type Round } from '../../lib/recommendations/loop';
import { tasteRows } from '../../lib/recommendations/score';
import { PRODUCTS, TRAIN, customerOf } from '../../lib/recommendations/story';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '06-the-loop';
export const PARTS = SHELF_PARTS;
export const BLEND = 1;
export const EXPLORE = 1;
export const WHO = customerOf(FOLLOW);
export const roundOf = (explore: number, r: number) => loopOf(BLEND, explore).rounds[r];
export const NARROW = roundOf(0, ROUNDS).coverage,
  HELD = roundOf(EXPLORE, ROUNDS).coverage,
  START = roundOf(0, 0).coverage;
const pct = (v: number) => `${Math.round(v * 100)}%`;
/** the read-out for a round: what the reader's last step changed */
export const statusOf = (k: Round, r: number, explore: number) =>
  `Round ${r}${explore ? ', one random slot' : ''}: ${k.coverage} of ${PRODUCTS.length} products on the map, ${k.bought} bought from shelves.`;

export const P1 = {
  question: 'Products no shelf shows get no orders. What happens to them, round by round?',
  options: ['They fade off the map', 'They rise: rare products stand out', 'Nothing: old orders keep them'],
};
export const outcomeOf = () => (NARROW < START ? 0 : 2);

export const QUIZ = {
  question: 'A news app shows each reader the stories most like what they clicked. After a month, what happens?',
  options: [
    'Readers see an ever narrower set of stories',
    'Readers see more and more different stories',
    'Nothing: clicks only measure taste',
  ],
  correct: 0,
  explanation: 'Clicks come from what was shown, so the next ranking learns its own choices back.',
  why: [
    'Right: unshown stories get no clicks, so they drop out of what the app learns.',
    'Without exploration nothing new gets clicked, so variety shrinks rather than grows.',
    'Clicks measure what was shown as much as taste: that is the loop.',
  ],
};

interface S {
  round: number;
  explore: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'rounds',
    focus: 'stage',
    visibleControls: [],
    narration: `Every round, customers buy from their shelf with a ${pct(BUY)} chance. The shop relearns from the last ${WINDOW} rounds’ orders.`,
    act: 'Press Next round three times.',
    say: { block: 'map', text: 'On the map' },
    predicate: s => s.round >= 3,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Now the shelf learns from its own sales: a Feedback loop.',
    act: 'Predict what happens to unshown products.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'narrow',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Press Next round until round ${ROUNDS}.`,
    predicate: s => s.p1 !== null && s.round === ROUNDS,
  },
  {
    id: 'explore',
    focus: 'explore',
    visibleControls: ['out1', 'explore'],
    narration: `${NARROW} of ${PRODUCTS.length} are left. Exploration gives one shelf slot to a random product.`,
    act: 'Turn on exploration.',
    say: { block: 'shelf', text: 'Random slot' },
    predicate: s => s.explore === EXPLORE,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `With one random slot, ${HELD} products stay on the map after ${ROUNDS} rounds.`,
    act: 'One question to finish.',
    say: { block: 'map', text: 'Still here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where do the clicks come from?',
  },
];

export default function TheLoop() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ round: 0, explore: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const k = roundOf(state.explore, state.round),
          items = itemsOf(k);
        return (
          <RecsStage
            shelf={{
              view: 'map',
              shelf: k.shelf,
              explored: k.shelf.slice(k.shelf.length - state.explore),
              shopper: WHO.name,
              you: k.you,
              items,
            }}
            rows={k.you ? tasteRows(items, k.you, TRAIN[FOLLOW]) : []}
            scoreName="Taste match"
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            status={statusOf(k, state.round, state.explore)}
            caption={`Round ${state.round} of ${ROUNDS}. ${WHO.name}’s shelf, simulated.`}
          >
            <div className="rc-round">
              <button
                type="button"
                className="chip"
                disabled={state.round >= ROUNDS}
                onClick={() => sync({ ...state, round: state.round + 1 })}
              >
                Next round
              </button>
              <button
                type="button"
                className="chip"
                disabled={state.round === 0}
                onClick={() => sync({ ...state, round: 0 })}
              >
                Start over
              </button>
              <span>{`Round ${state.round} of ${ROUNDS}`}</span>
            </div>
          </RecsStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="loop" />
          </>
        ),
        explore: ({ state, apply }) => (
          <>
            <label className="rc-choose">
              <input
                type="checkbox"
                checked={state.explore === EXPLORE}
                onChange={e => apply({ ...state, explore: e.target.checked ? EXPLORE : 0 })}
              />
              {' One random slot on every shelf'}
            </label>
            <p className="note rc-note">
              {`A simulation over the made-up orders: the ${pct(BUY)} buying chance is a planning number.`}
            </p>
            <OrdersNote />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="loop-same" />
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
