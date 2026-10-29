// Chapter 2: a menu for agents. Larkspur's agent card (parsed live, field by field, as an agent would) points to a
// catalogue with one price per field; the recorded agent's two readings of the screws sit side by side. Then the reader
// predicts what a parser does with a row missing its price, and drops it: the gap is named, never guessed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { CARD, parseCatalogue, READ_ITEMS, readShop } from '../../lib/agent-commerce/card';
import { fact } from '../../lib/agent-commerce/facts';
import { CATALOGUE, COMPANY, DOMAIN, itemOf, usd } from '../../lib/agent-commerce/story';
import { MENU_TURNS, PAGE_TURNS } from '../../lib/agent-commerce/turns';
import { Outcome } from '../tool-calling/kit';
import { Fact, HandNote, HatchStage, ReadingCard, RecordedNote } from './kit';

const MODULE = 'agent-commerce',
  ID = '02-a-menu-for-agents';
export const PARTS = HATCH_PARTS;
const FIRST = READ_ITEMS[0];
const PAGE_READ = readShop(PAGE_TURNS, 'page', FIRST),
  MENU_READ = readShop(MENU_TURNS, 'menu', FIRST);
const ROW = CATALOGUE.findIndex(i => i.sku === FIRST);
/** the catalogue with the first order's row missing its price, parsed as an agent would */
export const BROKEN = parseCatalogue(CATALOGUE.map((i, n) => (n === ROW ? { ...i, price: undefined } : i)));
const MISSING = BROKEN.ok ? [] : BROKEN.missing;
const CARD_PATH = fact('a2a-card').value!;

type View = 'page' | 'menu';
export interface S {
  card: boolean;
  view: View | null;
  p1: number | null;
  broken: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `The ${itemOf(FIRST)!.name} row loses its price field. What does the agent’s parser do?`,
  options: ['Names the missing field and stops', 'Takes the price from the page instead', 'Prices the screws at $0'],
};
/** a parser that stops on a gap: option 0 */
export const OUTCOME = BROKEN.ok ? 2 : 0;

export const QUIZ = {
  question: 'A seller’s catalogue row has no currency. What should a buying agent do?',
  options: [
    'Stop and report the missing field',
    'Assume dollars, as the other rows use',
    'Read the price off the page for people',
  ],
  correct: 0,
  explanation: 'A field that is missing is a fact to report; filling it in is a guess the order then rests on.',
  why: [
    'Right: naming the gap costs a question, while a guessed currency can cost the whole order.',
    'The other rows say nothing certain about this one; that is a guess presented as data.',
    'That brings back the prose the catalogue was meant to replace, with all its guesswork.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'card',
    focus: 'card',
    visibleControls: ['card'],
    narration: 'Agents look for an agent card at a fixed address on a shop’s domain. It names the shop’s sales agent.',
    act: 'Open the agent card.',
    say: { block: 'seller', text: 'Agent card' },
    predicate: s => s.card,
  },
  {
    id: 'menu',
    focus: 'view',
    visibleControls: ['shown', 'view'],
    narration: 'Its order skill reads the catalogue: one row per item, the price in its own field.',
    act: 'Switch to the catalogue.',
    say: { block: 'buyer', text: 'Reads a field' },
    predicate: s => s.view === 'menu',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['reads', 'p1'],
    narration: 'From the page it added a base and an extra. From the catalogue it copied one field.',
    act: 'Predict what happens to a gap.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'break',
    focus: 'break',
    visibleControls: ['p1', 'break'],
    narration: 'An agent should parse each row field by field, so nothing it needs is ever filled in by a guess.',
    act: 'Drop the screws’ price.',
    predicate: s => s.broken,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'gap', 'quiz'],
    narration: `The parser names the gap: “${MISSING.join(', ')}”. A page for people can’t say what it left out.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would the order rest on if the agent filled the gap itself?',
  },
];

function CardView() {
  return (
    <figure className="ac-read">
      <figcaption>{`${DOMAIN}${CARD_PATH}, parsed`}</figcaption>
      <dl className="ac-card">
        <dt>Name</dt>
        <dd>{CARD.name}</dd>
        <dt>Address</dt>
        <dd>{CARD.url}</dd>
        <dt>Version</dt>
        <dd>{CARD.version}</dd>
        <dt>Skills</dt>
        <dd>{CARD.skills.map(s => `${s.name}: ${s.description}`).join(' · ')}</dd>
      </dl>
      <Fact id="a2a-card" />
    </figure>
  );
}

export default function AMenuForAgents() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ card: false, view: null, p1: null, broken: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <HatchStage
          say={say}
          scene={{ buyer: state.view === 'menu' ? 'ok' : undefined, seller: state.card ? 'ok' : undefined }}
          caption={
            state.broken
              ? `A row without its price: the parser stops and names it.`
              : state.view === 'menu'
                ? `The agent read ${usd(MENU_READ.truth)} straight from the catalogue’s price field.`
                : `${COMPANY}’s sales agent publishes a card, and a catalogue behind it.`
          }
        />
      )}
      controls={{
        card: ({ state, apply }) =>
          state.card ? (
            <CardView />
          ) : (
            <button type="button" className="big" onClick={() => apply({ ...state, card: true })}>
              Open the agent card
            </button>
          ),
        shown: ({ state }) => (state.view === 'menu' ? null : <CardView />),
        view: ({ state, apply }) => (
          <div className="tc-tabs" role="group" aria-label="Where the agent reads">
            <button
              type="button"
              className="chip"
              aria-pressed={state.view === 'page'}
              onClick={() => apply({ ...state, view: 'page' })}
            >
              The page
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={state.view === 'menu'}
              onClick={() => apply({ ...state, view: 'menu' })}
            >
              The catalogue
            </button>
          </div>
        ),
        reads: () => (
          <div className="ac-reads">
            <ReadingCard r={PAGE_READ} />
            <ReadingCard r={MENU_READ} />
            <RecordedNote meta={MENU_TURNS.meta} />
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        break: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, broken: true })}>
            Drop the screws’ price
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        gap: () => (
          <figure className="ac-read" data-missing={MISSING.join(',')}>
            <figcaption>The catalogue, parsed field by field</figcaption>
            <blockquote>{`Missing: ${MISSING.join(', ')}`}</blockquote>
            <HandNote />
          </figure>
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
