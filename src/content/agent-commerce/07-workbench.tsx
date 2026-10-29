// Chapter 7: the workbench (KTD9). The reader sets Dana's standing slip (cap, items, shops, how long) and her confirm
// rule; every seller in sellers.json answers, and the bench plays each against two buying agents: the recorded one, and
// a simulated one fooled by every seller. Score: orders that end as Dana wants, then the fewest times she is asked. The
// puzzle accepts every setup in WINNERS (pinned, recomputed in a test). The picture stamps the slip against one seller.
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { checkTerms, orderOf } from '../../lib/agent-commerce/shop';
import { BUILDER, type Seller, SELLERS, sellerOf, usd } from '../../lib/agent-commerce/story';
import {
  type Agent,
  type Bench,
  BEST,
  CAPS,
  CONFIRM,
  HOURS,
  ITEMS,
  MERCHANTS,
  mandateOfBench,
  outcomeOf,
  RULE,
  START,
  scoreOf,
  WINNERS,
  wins,
} from '../../lib/agent-commerce/workbench';
import { OFFER_TURNS } from '../../lib/agent-commerce/turns';
import { HandNote, HatchStage, hoursWords, itemsWords, RecordedNote } from './kit';

const MODULE = 'agent-commerce',
  ID = '07-workbench';
export const PARTS = HATCH_PARTS;
const DANA = BUILDER.name,
  FIRST = DANA.split(' ')[0];
const ALL = SELLERS.length * 2;

/** a shop list in words short enough for a phone's drop-down: one domain, any shop, or how many */
const merchantsWords = (k: string) => {
  const m = MERCHANTS[k];
  return m.includes('*') ? 'Any shop' : m.length === 1 ? m[0] : `Her ${m.length} usual shops`;
};
const confirmWords = (k: string) =>
  CONFIRM[k] === null ? 'Never' : CONFIRM[k] === 0 ? 'Every order' : `Orders over ${usd(CONFIRM[k]!)}`;
/** a seller by its domain, and when it charges if not now (two sellers share a domain) */
const sellerWords = (s: Seller) => (s.delayHours ? `${s.domain}, in ${s.delayHours / 24} days` : s.domain);
const AGENT_WORDS: Record<Agent, string> = { recorded: 'Recorded agent', fooled: 'Fooled agent (simulated)' };

/** a winning setup that asks Dana before every order: right as often, but she is asked every time */
export const ALWAYS: Bench = { ...WINNERS[0], confirm: 'always' };
const ALWAYS_SCORE = scoreOf(ALWAYS);

export const QUIZ = {
  question: `Asking ${FIRST} before every order gets ${ALWAYS_SCORE.right} of ${ALL} right too. Why is it not the best setup?`,
  options: [
    `She is asked ${ALWAYS_SCORE.asked} times, and the slip already stops the bad orders`,
    'She would approve a bad order by mistake',
    'The shop refuses orders a person approved',
  ],
  correct: 0,
  explanation: 'A tight slip stops the bad orders by itself; asking her adds work without saving an order.',
  why: [
    'Right: every ask costs her time, and here the slip alone gets every order right.',
    'On this bench she declines every order she doesn’t want; the cost is her time, not her judgement.',
    'An order she approves still passes the shop if the slip allows it; the shop checks the slip, not her.',
  ],
};

interface S extends Bench {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench', 'table'],
    narration: `Workbench: set ${FIRST}’s slip and confirm rule. ${SELLERS.length} sellers answer a recorded agent and a fooled one.`,
    act: `Get all ${ALL} right, asking her least.`,
    say: { block: 'slip', text: 'Her terms' },
    predicate: s => wins(s),
    hint: 'Name only her usual shops, keep the cap near the order, and list only the screws.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'table', 'quiz'],
    narration: `${BEST.right} of ${ALL} right, ${BEST.asked} asks: the slip stops every bad order whichever agent carries it.`,
    act: 'One question to finish.',
    say: { block: 'seller', text: 'Checked' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does each ask cost her, and what does it save here?',
  },
];

function Score({ s }: { s: S }) {
  const r = scoreOf(s),
    best = wins(s);
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p>
        <strong>{`${r.right} of ${ALL}`}</strong>
        {` orders end as ${FIRST} wants, ${r.asked} asks `}
        <span className={`stamp ${best ? 'correct' : r.right === BEST.right ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : r.right === BEST.right ? 'TOO MANY ASKS' : 'ORDERS WRONG'}
        </span>
      </p>
    </div>
  );
}

function Pick<T extends string | number>({
  label,
  value,
  values,
  words,
  set,
}: {
  label: string;
  value: T;
  values: T[];
  words: (v: T) => string;
  set: (v: T) => void;
}) {
  return (
    <label>
      {label}
      <Select
        value={value}
        onChange={e => set((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}
      >
        {values.map(v => (
          <option key={v} value={v}>
            {words(v)}
          </option>
        ))}
      </Select>
    </label>
  );
}

function BenchForm({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <section className="ac-form" aria-label={`${FIRST}’s slip and confirm rule`}>
      <Pick label="Cap" value={s.cap} values={CAPS} words={usd} set={cap => set({ ...s, cap })} />
      <Pick
        label="Items"
        value={s.items}
        values={Object.keys(ITEMS)}
        words={itemsWords}
        set={items => set({ ...s, items })}
      />
      <Pick
        label="Shops"
        value={s.merchants}
        values={Object.keys(MERCHANTS)}
        words={merchantsWords}
        set={merchants => set({ ...s, merchants })}
      />
      <Pick label="Good for" value={s.hours} values={HOURS} words={hoursWords} set={hours => set({ ...s, hours })} />
      <Pick
        label={`Ask ${FIRST}`}
        value={s.confirm}
        values={Object.keys(CONFIRM)}
        words={confirmWords}
        set={confirm => set({ ...s, confirm })}
      />
    </section>
  );
}

function Table({ s }: { s: S }) {
  const agents = ['recorded', 'fooled'] as const;
  return (
    <>
      <table className="tc-ledger ac-table">
        <caption>{`Each seller’s order, and how it ends (${FIRST} wants it: yes or no)`}</caption>
        <thead>
          <tr>
            <th scope="col">Seller</th>
            {agents.map(a => (
              <th key={a} scope="col">
                {AGENT_WORDS[a]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SELLERS.map(seller => (
            <tr key={seller.id} data-seller={seller.id}>
              <th scope="row">{`${sellerWords(seller)} (${seller.wanted ? 'yes' : 'no'})`}</th>
              {agents.map(a => {
                const o = outcomeOf(s, seller, a);
                return (
                  <td key={a} className={o.right ? 'ok' : 'bad'}>
                    {`${o.end}${o.failed.length ? ` (${o.failed.join(', ')})` : ''}${o.asked ? ', asked' : ''}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">{RULE}</p>
      <RecordedNote meta={OFFER_TURNS.meta} />
      <HandNote />
    </>
  );
}

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const [id, setId] = useState(SELLERS[0].id);
  const seller = sellerOf(id);
  const checks = [
    { field: 'signature' as const, pass: true },
    ...checkTerms(mandateOfBench(s, `bench-${id}`), orderOf(seller), []),
  ];
  const ok = checks.every(c => c.pass);
  return (
    <HatchStage
      say={say}
      scene={{ slip: { at: 'seller', signed: true, checks }, seller: ok ? 'ok' : 'bad' }}
      caption={`${seller.domain}: the shop would ${
        ok
          ? 'accept'
          : `refuse (${checks
              .filter(c => !c.pass)
              .map(c => c.field)
              .join(', ')})`
      }.`}
    >
      <div className="ac-form">
        <label>
          Seller
          <Select value={id} onChange={e => setId(e.target.value)}>
            {SELLERS.map(x => (
              <option key={x.id} value={x.id}>
                {sellerWords(x)}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </HatchStage>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setup is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchForm s={state} set={focused ? apply : sync} />,
        table: ({ state }) => <Table s={state} />,
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
