// Chapter 6: paying without the card. The shop accepted Dana's slip; her card's provider issues a token bound to that
// one order, shop and amount (ACP's shared payment token shape). The reader predicts a charge for a bit more, tries
// charges the token isn't for, pays the order, then replays it: spent. Every charge runs through token.ts, live.
import StepRunner, { type ControlProps } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { FIELDS, orderOf } from '../../lib/agent-commerce/shop';
import { type Charge, chargeOf, issue, REASONS, redeem, type Refusal } from '../../lib/agent-commerce/token';
import { BUILDER, COMPANY, itemOf, SLIPS, sellerOf, usd } from '../../lib/agent-commerce/story';
import pinned from '../../../data/agent-commerce/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, HandNote, HatchStage } from './kit';

const MODULE = 'agent-commerce',
  ID = '06-paying-without-the-card';
export const PARTS = HATCH_PARTS;
const DANA = BUILDER.name;
const HOME = sellerOf('larkspur'),
  OTHER = sellerOf('fernway');
export const ORDER = orderOf(HOME);
export const TOKEN = issue(ORDER);
const BOX = itemOf(HOME.lines[0].sku)!.price;

/** The charges the agent can try with the token: the one it was issued for, and three it was not. */
export const CHARGES: Record<string, { label: string; charge: Charge }> = {
  this: { label: `${ORDER.id} as issued, ${usd(TOKEN.amount)}`, charge: chargeOf(ORDER) },
  more: {
    label: `${ORDER.id} plus a box, ${usd(TOKEN.amount + BOX)}`,
    charge: { ...chargeOf(ORDER), amount: TOKEN.amount + BOX },
  },
  other: { label: `order-2, ${usd(TOKEN.amount)}`, charge: { ...chargeOf(ORDER), order: 'order-2' } },
  shop: { label: `${ORDER.id} at ${OTHER.domain}`, charge: { ...chargeOf(ORDER), merchant: OTHER.domain } },
};
type Key = keyof typeof CHARGES;

export interface S {
  issued: boolean;
  pick: Key;
  p1: number | null;
  /** token ids already charged */
  spent: string[];
  /** every charge tried, and what came back */
  tries: { key: Key; ok: boolean; why?: Refusal }[];
  quiz: number | null;
}

export const P1 = {
  question: `Before paying, the agent tries the token for ${usd(TOKEN.amount + BOX)}: one more box, still under the slip’s ${usd(SLIPS.larkspur.cap)} cap. What happens?`,
  options: [
    'Refused: the token is bound to its amount',
    'Paid: the slip allows up to its cap',
    'Paid, and the extra is refunded later',
  ],
};
/** a token for one amount refuses another (pinned) */
export const OUTCOME = pinned.tokens['other-amount'] === 'amount' ? 0 : 1;

export const QUIZ = {
  question: 'A token leaks from an agent’s log. What can a thief do with it?',
  options: [
    'Nothing more: it pays one order, at one shop, once',
    'Charge any shop up to the slip’s cap',
    'Read the card number out of it',
  ],
  correct: 0,
  explanation:
    'The token is bound to one order, shop and amount, and spent on first use; the card never left the provider.',
  why: [
    'Right: bound and single-use, a leaked token is worth one order that was already going through.',
    'The cap belongs to the slip; the token is narrower still, bound to one shop and one amount.',
    'The token stands in for the card; the number stays with the provider.',
  ],
};

const tryCharge = (s: S, key: Key): S => {
  const r = redeem(TOKEN, CHARGES[key].charge, s.spent);
  return {
    ...s,
    pick: key,
    spent: [...r.spent],
    tries: [...s.tries, r.ok ? { key, ok: true } : { key, ok: false, why: r.why }],
  };
};
const tried = (s: S, ok: (t: S['tries'][number]) => boolean) => s.tries.some(ok);

export const STEPS: Step<S>[] = [
  {
    id: 'issue',
    focus: 'issue',
    visibleControls: ['issue'],
    narration: `The shop accepted the slip for ${ORDER.id}. ${DANA}’s card provider pays with a payment token, never the card.`,
    act: 'Issue the token.',
    say: { block: 'token', text: 'One order' },
    predicate: s => s.issued,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['token', 'p1'],
    narration: 'The token names one order, one shop and one amount. The card number never reaches the agent.',
    act: 'Predict a charge for a bit more.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bind',
    focus: 'charge',
    visibleControls: ['token', 'wrong', 'tries'],
    narration: 'Try the token on charges it was not issued for: more money, another order, another shop.',
    act: 'Pick a charge it isn’t for, then Charge.',
    predicate: s => tried(s, t => !t.ok),
  },
  {
    id: 'pay',
    focus: 'charge',
    visibleControls: ['out1', 'charge', 'tries'],
    narration: 'Refused: the token is bound to what it was made for. Now pay the real order.',
    act: 'Pick the order as issued, then Charge.',
    predicate: s => tried(s, t => t.ok),
  },
  {
    id: 'replay',
    focus: 'charge',
    visibleControls: ['charge', 'tries'],
    narration: 'Paid, and the token is punched through. The agent may retry, or a thief may find it.',
    act: 'Charge the same order again.',
    say: { block: 'token', text: 'Spent' },
    predicate: s => tried(s, t => t.why === 'spent'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['tries', 'link', 'quiz'],
    narration:
      'Spent: one token, one payment. The slip limits what may be bought; the token limits what can be charged.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is the token bound to, and how many times does it work?',
  },
];

const ALL_PASS = FIELDS.map(field => ({ field, pass: true }));
/** the charges the token was not issued for */
const WRONG: Key[] = ['more', 'other', 'shop'];

function ChargePick({ state, apply, sync, keys }: ControlProps<S> & { keys: Key[] }) {
  const pick = keys.includes(state.pick) ? state.pick : keys[0];
  return (
    <div className="ac-form">
      <label>
        Charge
        <Select value={pick} onChange={e => sync({ ...state, pick: e.target.value as Key })}>
          {keys.map(k => (
            <option key={k} value={k}>
              {CHARGES[k].label}
            </option>
          ))}
        </Select>
      </label>
      <button type="button" className="chip" onClick={() => apply(tryCharge(state, pick))}>
        Charge
      </button>
    </div>
  );
}

export default function PayingWithoutTheCard() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ issued: false, pick: 'more', p1: null, spent: [], tries: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const spent = state.spent.includes(TOKEN.id);
        return (
          <HatchStage
            say={say}
            scene={{
              slip: { at: 'seller', signed: true, checks: ALL_PASS },
              seller: 'ok',
              token: state.issued ? (spent ? 'spent' : 'live') : undefined,
            }}
            caption={
              !state.issued
                ? `${COMPANY} accepted ${DANA}’s slip for ${ORDER.id}.`
                : spent
                  ? `The token for ${ORDER.id} is spent: punched through.`
                  : `A token for ${ORDER.id}, ${HOME.domain}, ${usd(TOKEN.amount)}: live.`
            }
          />
        );
      }}
      controls={{
        issue: ({ state, apply }) => (
          <>
            <button type="button" className="big" onClick={() => apply({ ...state, issued: true })}>
              Issue the token
            </button>
            <Fact id="acp-spt" />
          </>
        ),
        token: () => (
          <figure className="ac-read">
            <figcaption>The payment token, as issued</figcaption>
            <dl className="ac-card">
              <dt>Token</dt>
              <dd>{TOKEN.id}</dd>
              <dt>Order</dt>
              <dd>{TOKEN.order}</dd>
              <dt>Shop</dt>
              <dd>{TOKEN.merchant}</dd>
              <dt>Amount</dt>
              <dd>{usd(TOKEN.amount)}</dd>
            </dl>
            <p className="note">
              A stand-in: the real token’s id is a secret the provider keeps; this one is made up from what it is bound
              to.
            </p>
          </figure>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        wrong: p => <ChargePick {...p} keys={WRONG} />,
        charge: p => <ChargePick {...p} keys={Object.keys(CHARGES) as Key[]} />,
        tries: ({ state }) =>
          state.tries.length ? (
            <div role="status">
              <ol className="ac-turns">
                {state.tries.map((t, i) => (
                  <li key={i} data-ok={t.ok ? '1' : '0'}>
                    {`${CHARGES[t.key].label}: `}
                    <span className={`stamp ${t.ok ? 'correct' : 'wrong'}`}>{t.ok ? 'PAID' : 'REFUSED'}</span>
                    {t.why ? ` ${REASONS[t.why]}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="note" role="status">
              No charges yet.
            </p>
          ),
        link: () => (
          <>
            <HandNote />
            <p className="note">
              <a href="/payments/01-four-parties/">The card network behind the provider is Card payments’ chapter 1.</a>
            </p>
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
