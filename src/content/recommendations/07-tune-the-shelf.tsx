// Chapter 7: tune the shelf, the workbench. The reader sets the blend of bestsellers and hidden tastes and the number of
// random slots; the pinned loop run for that setting is replayed to its last round and checked against the owner's
// rule. The puzzle accepts every setting that meets the rule with the most next orders found (WINNERS, pinned and
// recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { BLENDS, EXPLORES, FOLLOW, ROUNDS, itemsOf, loopOf } from '../../lib/recommendations/loop';
import { tasteRows } from '../../lib/recommendations/score';
import { CUSTOMERS, PRODUCTS, SHELF, TRAIN, customerOf } from '../../lib/recommendations/story';
import {
  BEST,
  COVERAGE_MIN,
  REASONS,
  RULE,
  START,
  WINNERS,
  benchOf,
  benchScore,
  meets,
  wins,
  type Bench,
} from '../../lib/recommendations/workbench';
import { SHELF_PARTS } from '../../components/scenes/shelfScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, OrdersNote, RecsStage, type View } from './kit';

const MODULE = 'recommendations',
  ID = '07-tune-the-shelf';
export const PARTS = SHELF_PARTS;
const WHO = customerOf(FOLLOW);
export const blendText = (b: number) =>
  b === 0 ? 'All bestsellers' : b === 1 ? 'All tastes' : `${Math.round(b * 100)}% tastes`;
export const exploreText = (e: number) => (e === 0 ? 'None' : `${e} of ${SHELF}`);

export const QUIZ = {
  question: 'Why does the best setting give up a shelf slot to random products?',
  options: [
    'Without it, the loop drops products the rule needs kept',
    'Random products sell better than ranked ones',
    'It finds more next orders on its own',
  ],
  correct: 0,
  explanation: 'A random slot costs a few hits, but it keeps unshown products selling, so they stay on the map.',
  why: [
    'Right: no setting without exploration keeps enough products on the map.',
    'A random product suits the shopper less often than a ranked one; the slot costs hits.',
    'Ranked slots find next orders; a random slot finds one only by luck.',
  ],
};

interface S extends Bench {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The workbench runs the loop with your setting, then counts hits and products left on the map.`,
    act: 'Meet the owner’s rule with the most hits.',
    say: { block: 'map', text: 'Keep them here' },
    predicate: s => wins(benchOf(s)),
    hint: 'Without a random slot, too few products stay on the map. Then try each blend.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} hits is the most within the rule; yours is one of ${WINNERS.length} settings that do it.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to a product nobody is shown?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    sc = benchScore(b),
    best = wins(b),
    ok = meets(b);
  return (
    <div data-best={best ? '1' : '0'}>
      <p className="rc-headline">
        <strong>{sc.hits}</strong>
        {` hits in ${CUSTOMERS.length} `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `MOST IS ${BEST}` : 'RULE BROKEN'}
        </span>
      </p>
      <p className="note rc-note">{`${sc.coverage} of ${PRODUCTS.length} products on the map after the loop; the rule needs ${COVERAGE_MIN}.`}</p>
      <p className="note rc-note">{RULE}</p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    run = loopOf(b.blend, b.explore);
  return (
    <div className="tc-bench">
      <section className="rc-bench" aria-label="Shelf setting">
        <fieldset>
          <legend>Ranking</legend>
          {BLENDS.map(v => (
            <label key={v}>
              <input type="radio" name="rc-blend" checked={b.blend === v} onChange={() => set({ ...s, blend: v })} />{' '}
              {blendText(v)}
            </label>
          ))}
        </fieldset>
        <p className="note rc-note">{REASONS.blend}</p>
        <fieldset>
          <legend>Random slots</legend>
          {EXPLORES.map(v => (
            <label key={v}>
              <input
                type="radio"
                name="rc-explore"
                checked={b.explore === v}
                onChange={() => set({ ...s, explore: v })}
              />{' '}
              {exploreText(v)}
            </label>
          ))}
        </fieldset>
        <p className="note rc-note">{REASONS.explore}</p>
      </section>
      <table className="tc-ledger">
        <caption>Your setting, round by round</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">On the map</th>
            <th scope="col">Hits</th>
          </tr>
        </thead>
        <tbody>
          {run.rounds.map((r, i) => (
            <tr key={i} data-round={i}>
              <th scope="row">{i}</th>
              <td>{r.coverage}</td>
              <td>{r.hits}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Fact id="two-stage" />
      <OrdersNote />
    </div>
  );
}

export default function TuneTheShelf() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          k = loopOf(b.blend, b.explore).rounds[ROUNDS],
          items = itemsOf(k),
          sc = benchScore(b);
        return (
          <RecsStage
            shelf={{
              view: 'map',
              shelf: k.shelf,
              explored: k.shelf.slice(k.shelf.length - b.explore),
              shopper: WHO.name,
              you: k.you,
              items,
            }}
            rows={k.you ? tasteRows(items, k.you, TRAIN[FOLLOW]) : []}
            scoreName="Taste match"
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            status={`${blendText(b.blend)}, ${b.explore ? `${exploreText(b.explore)} slots random` : 'no random slots'}: ${sc.hits} hits, ${sc.coverage} products on the map.`}
            caption={`After ${ROUNDS} rounds. ${WHO.name}’s shelf under your setting, simulated.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
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
