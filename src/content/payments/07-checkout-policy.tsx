// Chapter 7: set Larkspur's checkout policy, the workbench. For each kind of order the reader sets 3-D Secure, when to
// capture and the retry key; the simulator runs the day and the owner's rule is checked: nobody charged twice, fraud
// within the limit, and as much kept as possible. The puzzle accepts every policy tied for the most kept (WINNERS,
// pinned in data/payments/pinned.json and recomputed by tests/unit/payments-workbench.test.ts).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { DAYS, KINDS, KIND_NAME, clock, eur, runOf, type Kind, type Policy } from '../../lib/payments/sim';
import {
  BEST,
  FRAUD_LIMIT,
  REASONS,
  RULE,
  START,
  WINNERS,
  benchPolicy,
  keptOf,
  meets,
  wins,
} from '../../lib/payments/workbench';
import { TUBE_PARTS, tubeAt } from '../../components/scenes/tubeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Assumed, CaptureSwitch, Fact, KeySwitch, PaymentsStage, ScaSwitch, SimNote, type View } from './kit';

const MODULE = 'payments',
  ID = '07-checkout-policy';
export const PARTS = TUBE_PARTS;
/** the picture shows the first night, when the day's captures settle */
const AT = 1;

export const QUIZ = {
  question: 'A ticket site sells €5 museum passes and €900 festival packages. Which checkout plan fits what you found?',
  options: [
    'Skip the check on the cheap passes; check the risky festival buyers',
    'Challenge every buyer of both',
    'Skip the check on both, to keep checkout quick',
    'Challenge every pass buyer and skip the festival check',
  ],
  correct: 0,
  explanation: 'Friction costs most where fraud costs least: each kind of order gets the check it can afford.',
  why: [
    'Right: a stolen €5 pass costs less than the honest buyers a challenge drives off, and a €900 package is worth checking.',
    'Challenging everyone loses honest buyers on the cheap passes for little gain.',
    'A stolen festival package charged back to the site is a large loss.',
    'That is backwards: the expensive order is the one worth checking.',
  ],
};

interface S extends Policy {
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'Nobody may be charged twice, and stolen cards may cost Larkspur only a little. Then keep the most.',
    act: 'Set the best checkout policy.',
    say: { block: 'till', text: 'Most kept' },
    predicate: s => wins(benchPolicy(s)),
    hint: 'Turn every key on. Small orders: does a challenge cost more than the fraud? Drill presses ship after a hold lapses.',
    solution: s => ({ ...s, ...structuredClone(WINNERS[0]) }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `${eur(BEST)} is the most Larkspur can keep; yours is one of ${WINNERS.length} that work.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which order is cheap to lose to a thief?',
  },
];

function Score({ s }: { s: S }) {
  const p = benchPolicy(s),
    r = runOf(p),
    best = wins(p),
    ok = meets(p);
  return (
    <div role="status" data-kept={keptOf(p)} data-best={best ? '1' : '0'}>
      <p className="pm-headline">
        <strong>{eur(keptOf(p))}</strong>
        {' kept '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : !ok ? (r.doubleCharges ? 'CHARGED TWICE' : 'TOO MUCH FRAUD') : `BEST IS ${eur(BEST)}`}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPolicy(s),
    r = runOf(p);
  const row = (k: Kind) => {
    const os = r.orders.filter(o => o.order.kind === k);
    return {
      paid: os.filter(o => o.final === 'settled').length,
      lost: os.filter(o => o.final === 'abandoned' || o.final === 'expired').length,
      twice: os.filter(o => o.doubleCharged).length,
      fraud: os.reduce((a, o) => a + o.fraudLoss.merchant, 0),
      kept: os.reduce((a, o) => a + o.net.merchant, 0),
    };
  };
  return (
    <div className="tc-bench">
      <p className="note pm-note">{RULE}</p>
      {KINDS.map(k => (
        <section key={k} className="pm-kind" aria-label={KIND_NAME[k]}>
          <h3>{KIND_NAME[k]}</h3>
          <ScaSwitch
            label={`${KIND_NAME[k]}: 3-D Secure`}
            value={p[k].sca}
            onChange={sca => set({ ...s, [k]: { ...p[k], sca } })}
          />
          <CaptureSwitch
            label={`${KIND_NAME[k]}: capture`}
            value={p[k].capture}
            onChange={capture => set({ ...s, [k]: { ...p[k], capture } })}
          />
          <KeySwitch
            id={`pm-key-${k}`}
            label={`${KIND_NAME[k]}: idempotency key`}
            value={p[k].key}
            onChange={key => set({ ...s, [k]: { ...p[k], key } })}
          />
          <p className="note pm-note">{REASONS[k]}</p>
        </section>
      ))}
      {/* a focusable scroll region, so a phone can read the whole table by keyboard */}
      <div className="pm-scroll" role="region" aria-label="Results by kind of order" tabIndex={0}>
        <table className="tc-ledger">
          <caption>{`Each kind of order over ${DAYS} days`}</caption>
          <thead>
            <tr>
              <th scope="col">Orders</th>
              <th scope="col">Paid</th>
              <th scope="col">Lost</th>
              <th scope="col">Twice</th>
              <th scope="col">Fraud</th>
              <th scope="col">Kept</th>
            </tr>
          </thead>
          <tbody>
            {KINDS.map(k => {
              const x = row(k);
              return (
                <tr key={k} data-kind={k}>
                  <th scope="row">{KIND_NAME[k]}</th>
                  <td>{x.paid}</td>
                  <td>{x.lost}</td>
                  <td className={x.twice ? 'bad' : 'ok'}>{x.twice}</td>
                  <td>{eur(x.fraud)}</td>
                  <td>{eur(x.kept)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">All</th>
              <td colSpan={3} />
              <td className={r.fraudLoss.merchant > FRAUD_LIMIT ? 'bad' : ''}>{eur(r.fraudLoss.merchant)}</td>
              <td>{eur(r.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Assumed k="abandon" />
      <SimNote />
    </div>
  );
}

export default function CheckoutPolicy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...structuredClone(START), view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = benchPolicy(state),
          r = runOf(p);
        return (
          <PaymentsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: tubeAt(r, AT),
              result: r,
              caption: `${clock(AT)} under your policy. Over ${DAYS} days Larkspur keeps ${eur(r.net)}.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the policy is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
        // the real rule behind "ask only on risk": EU law lets a low-risk payment skip the check
        fact: () => <Fact id="tra" />,
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
