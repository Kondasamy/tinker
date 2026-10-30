// Chapter 7: set Larkspur's stock policy, the workbench. The reader sets R, W and the conflict rule for each product; the
// simulator runs the morning with the line to West down, and the owner's rule is checked: never sell the drill press
// twice, and refuse as few orders as possible. The puzzle accepts every setting tied for the fewest refused orders
// (WINNERS, computed over the whole domain).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { MOMENTS, PRODUCTS, clock, runOf, unitsOf, type Product } from '../../lib/consistency/sim';
import {
  BEST,
  REASONS,
  START,
  STRICT,
  WINNERS,
  benchPolicy,
  meets,
  refusedOf,
  wins,
  type Bench,
} from '../../lib/consistency/workbench';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ConsistencyStage, Fact, Quorum, RuleSwitch, SimNote, type View } from './kit';

const MODULE = 'consistency',
  ID = '07-stock-policy';
export const PARTS = STOCK_PARTS;
/** the minute the picture shows: West's drill press order in the outage, where the policies differ most */
const AT = MOMENTS.westSells;
const TITLE: Record<Product, string> = { hinge: 'Hinges', drill: 'Drill press' };

export const QUIZ = {
  question:
    'A concert site sells T-shirts (plenty, reprinted weekly) and front-row seats (one of each). The link between its data centres drops. Which plan fits what you found?',
  options: [
    'Keep selling shirts on both sides; refuse a seat sale that can’t be confirmed',
    'Refuse every sale until the link is back',
    'Keep selling everything on both sides',
    'Refuse shirts and keep selling seats',
  ],
  correct: 0,
  explanation:
    'Each kind of stock gets the risk it can afford: availability for plenty, consistency for one of a kind.',
  why: [
    'Right: an extra shirt is easy to make good, but a seat sold twice can’t be.',
    'Refusing shirts loses sales for no gain, since an oversold shirt is just a reprint.',
    'Selling seats on both sides can put two fans in one seat.',
    'That is backwards: the seats are the stock that can’t be sold twice.',
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
    narration: 'The line to West goes down again. Never sell the drill press twice; refuse as few orders as you can.',
    act: 'Set the best stock policy.',
    say: { block: 'west', text: 'Cut off' },
    predicate: s => wins(benchPolicy(s)),
    hint: 'Hinges can risk an oversell; which setting refuses no hinge orders? Then keep the drill press safe.',
    solution: s => ({ ...s, hinge: { ...WINNERS[0].hinge }, drill: { ...WINNERS[0].drill } }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `${BEST} refused order is the fewest; yours is one of ${WINNERS.length} that work. Dynamo lets each service set its own.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which stock is easy to make good if it oversells?',
  },
];

function Score({ s }: { s: S }) {
  const p = benchPolicy(s),
    n = refusedOf(p),
    best = wins(p),
    ok = meets(p);
  return (
    <div role="status" data-refused={n} data-best={best ? '1' : '0'}>
      <p className="cs-headline">
        <strong>{n}</strong>
        {` refused order${n === 1 ? '' : 's'} `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `BEST IS ${BEST}` : 'DRILL PRESS OVERSOLD'}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} policies that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPolicy(s),
    r = runOf(p);
  return (
    <div className="tc-bench">
      {PRODUCTS.map(k => (
        <section key={k} className="cs-product" aria-label={TITLE[k]}>
          <h3>{TITLE[k]}</h3>
          <RuleSwitch
            label={`${TITLE[k]}: conflict rule`}
            value={p[k].rule}
            onChange={rule => set({ ...s, [k]: { ...p[k], rule } })}
          />
          <Quorum
            id={`cs-${k}-r`}
            name={`${TITLE[k]} R`}
            value={p[k].r}
            onChange={v => set({ ...s, [k]: { ...p[k], r: v } })}
          />
          <Quorum
            id={`cs-${k}-w`}
            name={`${TITLE[k]} W`}
            value={p[k].w}
            onChange={v => set({ ...s, [k]: { ...p[k], w: v } })}
          />
          <p className="note cs-note">{REASONS[k]}</p>
        </section>
      ))}
      <table className="tc-ledger">
        <caption>Each product over the morning, line to West down</caption>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">Sold</th>
            <th scope="col">Oversold</th>
            <th scope="col">Refused</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCTS.map(k => {
            const bad = STRICT.includes(k) && r.oversold[k] > 0;
            return (
              <tr key={k} data-product={k} data-ok={bad ? 0 : 1}>
                <th scope="row">{TITLE[k]}</th>
                <td>{r.sold[k]}</td>
                <td className={bad ? 'bad' : r.oversold[k] ? '' : 'ok'}>{r.oversold[k]}</td>
                <td>{r.refused[k]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <SimNote />
    </div>
  );
}

export default function StockPolicy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hinge: { ...START.hinge }, drill: { ...START.drill }, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = benchPolicy(state),
          r = runOf(p);
        return (
          <ConsistencyStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: stockAt(r, AT),
              result: r,
              tick: AT,
              caption: `${clock(AT)}, line to West down. Today: ${unitsOf(r.oversold.drill, 'drill')} oversold, ${refusedOf(p)} refused.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the policy is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
        fact: () => <Fact id="dynamo-tune" />,
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
