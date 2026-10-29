// Chapter 1: a page for people. Reyes Decks' buying agent prices orders from Larkspur's shop page, prose written for
// people. The reader predicts its total for the screws, then reads the recorded turns (one dated run of a real model):
// it got all three right this time, by reasoning through sizes, a sale and an ended offer. WebArena says that is not the
// norm, so the lesson is the guesswork, not a misread.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { readShop, READ_ITEMS } from '../../lib/agent-commerce/card';
import { simRead } from '../../lib/agent-commerce/simulate';
import { ASKS, BUILDER, BUYER_AGENT, DOMAIN, itemOf, PAGE, usd } from '../../lib/agent-commerce/story';
import { PAGE_TURNS } from '../../lib/agent-commerce/turns';
import { Outcome } from '../tool-calling/kit';
import { Fact, HandNote, HatchStage, ReadingCard, RecordedNote } from './kit';

const MODULE = 'agent-commerce',
  ID = '01-a-page-for-people';
export const PARTS = HATCH_PARTS;
const FIRST = READ_ITEMS[0];
export const READS = READ_ITEMS.map(sku => readShop(PAGE_TURNS, 'page', sku));
const RIGHT = READS.filter(r => r.right).length;
const [screws] = READS;
const STAINLESS = itemOf(`${FIRST}-ss`)!;

export interface S {
  p1: number | null;
  asked: string[];
  quiz: number | null;
}

/** The first price on the line, the right total, and the stainless total: the three readings the page allows. */
export const P1 = {
  question: 'The page gives a base price, then extras by size. What total will the agent give?',
  options: [usd(simRead('page', FIRST).total), usd(screws.truth), usd(ASKS[FIRST].qty * STAINLESS.price)],
};
/** what the recorded agent answered, as an option */
export const OUTCOME = P1.options.indexOf(usd(screws.turn?.total ?? -1));

export const QUIZ = {
  question: 'The agent priced every order right. Why give agents a menu anyway?',
  options: [
    'Every page is a fresh puzzle, and one misread price is a wrong order',
    'Pages for people load too slowly for agents',
    'Agents are not allowed to read pages written for people',
  ],
  correct: 0,
  explanation: 'Reading prose is reasoning, and reasoning can slip; a price in a field leaves nothing to work out.',
  why: [
    'Right: it worked here by reasoning through the prose, and the next page’s sale or footnote may trip it.',
    'Speed is not the problem; the price hides in sentences, sizes and footnotes the agent must work through.',
    'Nothing forbids it, as this run shows; the trouble is the guesswork a page for people needs.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['page', 'p1'],
    narration: `A buying agent shops for ${BUILDER.firm}. It reads the shop page and prices: “${ASKS[FIRST].text}”`,
    act: 'Predict its total.',
    say: { block: 'buyer', text: 'Reads the page' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['page', 'p1', 'ask'],
    narration: 'Now the real agent reads the same page. Its answer was recorded from one run of a large model.',
    act: 'Ask the agent.',
    predicate: s => s.asked.includes(FIRST),
  },
  {
    id: 'more',
    focus: 'more',
    visibleControls: ['out1', 'reads', 'more'],
    narration: 'Right: it added the size’s extra to the base price. It had to work that out from prose.',
    act: 'Ask about the other two orders.',
    say: { block: 'hatch', text: 'Prose prices' },
    predicate: s => READ_ITEMS.every(sku => s.asked.includes(sku)),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reads', 'fact', 'quiz'],
    narration: `${RIGHT} of ${READS.length} right, the sale and the ended offer too. On a benchmark of real sites, agents mostly fail.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would happen on a page whose sale or footnote the agent misread?',
  },
];

const shown = (s: S) => READS.filter(r => s.asked.includes(r.sku));

export default function APageForPeople() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, asked: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = shown(state);
        return (
          <HatchStage
            say={say}
            scene={{ buyer: r.length ? (r.every(x => x.right) ? 'ok' : 'warn') : undefined }}
            caption={
              r.length
                ? `${BUYER_AGENT} priced ${r.filter(x => x.right).length} of ${r.length} orders right from ${DOMAIN}’s page.`
                : `${BUYER_AGENT} reads ${DOMAIN}’s page for people.`
            }
          />
        );
      }}
      controls={{
        page: () => (
          <figure className="ac-read">
            <figcaption>{`${DOMAIN}’s page for people`}</figcaption>
            <pre className="ac-page">{PAGE}</pre>
            <HandNote />
          </figure>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: [FIRST] })}>
            Ask the agent
          </button>
        ),
        reads: ({ state }) => (
          <div className="ac-reads">
            {shown(state).map(r => (
              <ReadingCard key={r.sku} r={r} />
            ))}
            <RecordedNote meta={PAGE_TURNS.meta} />
          </div>
        ),
        more: ({ state, apply }) => (
          <div className="ac-buttons">
            {READ_ITEMS.filter(sku => sku !== FIRST).map(sku => (
              <button
                key={sku}
                type="button"
                className="chip"
                disabled={state.asked.includes(sku)}
                onClick={() => apply({ ...state, asked: [...state.asked, sku] })}
              >
                {`Ask: ${ASKS[sku].text}`}
              </button>
            ))}
          </div>
        ),
        fact: () => <Fact id="webarena" />,
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
