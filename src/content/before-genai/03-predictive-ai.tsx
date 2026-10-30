// Chapter 3: AI that picks from a list (KTD8). Before GenAI, AI was already at work: the Email module's spam filter
// puts a message in the inbox or junk, and the Recommendations module's bought-together shelf picks a product from the
// catalogue. The reader predicts each pick from its fixed list; the reveal is the shape they share: they choose, they
// don't write. Both engines run here as they do in their own modules, over their own made-up data, labelled so.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { PREDICT_PARTS } from '../../components/scenes/kioskScene';
import { messageOf, run } from '../../lib/before-genai/bots';
import { header, parse } from '../../lib/email/parse';
import { SPAM_SET, spamScore } from '../../lib/email/spam';
import { MESSAGES } from '../../lib/email/story';
import { shelfOf } from '../../lib/recommendations/score';
import { customerOf, namesOf, ORDERS_NOTE, productOf, TRAIN } from '../../lib/recommendations/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BeforeGenaiStage, Fact } from './kit';

const MODULE = 'before-genai',
  ID = '03-predictive-ai';
export const PARTS = PREDICT_PARTS;
const MAIL = parse(MESSAGES.prize),
  SUBJECT = header(MAIL, 'subject') ?? '';
/** the filter's chance that the message is spam: junk at 0.5 or more */
export const SPAM = spamScore(MAIL);
const BUYER = customerOf('c01');
/** the bought-together shelf's first pick for the buyer */
export const TOP = productOf(shelfOf('items', TRAIN, BUYER.id)[0]).name;
// the stage never needs the counter, but the stage takes a run
const IDLE = run(messageOf('where-order'));

export interface S {
  p1: number | null;
  spam: boolean;
  p2: number | null;
  shelf: boolean;
  quiz: number | null;
}
export const INITIAL: S = { p1: null, spam: false, p2: null, shelf: false, quiz: null };

export const P1 = {
  question: `A new email: “${SUBJECT}” Where does the filter put it?`,
  options: ['Inbox', 'Junk'],
};
export const OUTCOME1 = SPAM >= 0.5 ? 1 : 0;
export const P2 = {
  question: `${BUYER.name} bought ${namesOf(TRAIN[BUYER.id])}. Which product does the shelf show first?`,
  options: [productOf('pallet-truck').name, TOP, productOf('welding-gloves').name],
};
export const OUTCOME2 = P2.options.indexOf(TOP);

export const QUIZ = {
  question: 'Larkspur’s sorter, spam filter and shelf all use AI. What do they share?',
  options: ['Each picks from a fixed list', 'Each writes a new answer', 'Each follows hand-written keyword rules'],
  correct: 0,
  explanation: 'A bin, a folder or a product: each returns one item from a list made ahead, and none writes anything.',
  why: [
    'Right: a bin, a folder or a product, always one item from a list made ahead.',
    'None of them writes; each returns one item from its list.',
    'They learned from labelled examples or past orders, not from keyword rules.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'spam',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A spam filter is trained on mail people marked as junk or not. Here is a message it hasn’t seen.',
    act: 'Predict where it lands.',
    say: { block: 'spam', text: 'Trained on mail' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'spam-reveal',
    focus: 'reveal1',
    visibleControls: ['p1', 'reveal1'],
    narration: 'Your pick is locked.',
    act: 'Run the filter.',
    predicate: s => s.spam,
  },
  {
    id: 'shelf',
    focus: 'p2',
    visibleControls: ['out1', 'spamFact', 'p2'],
    narration: `${P1.options[OUTCOME1]}: the filter picked one of two folders. The shop’s recommendation shelf picks for ${BUYER.name} from its catalogue.`,
    act: 'Predict its first pick.',
    say: { block: 'junk', text: 'One of two' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'shelf-reveal',
    focus: 'reveal2',
    visibleControls: ['p2', 'reveal2'],
    narration: 'Your pick is locked.',
    act: 'Show the shelf.',
    predicate: s => s.shelf,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'toy', 'quiz'],
    narration:
      'Both picked from a fixed list: two folders, one catalogue. Neither wrote a word. Writing is what GenAI added.',
    act: 'One question to finish.',
    say: { block: 'shelf', text: 'From a list' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did any of them say something nobody had made ahead?',
  },
];

export default function PredictiveAi() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <BeforeGenaiStage
          run={IDLE}
          predict={{ spam: state.spam ? SPAM : undefined }}
          say={say}
          caption={
            state.shelf
              ? `The shelf shows ${BUYER.name} ${TOP} first.`
              : state.spam
                ? `The filter put “${SUBJECT}” in ${SPAM >= 0.5 ? 'junk' : 'the inbox'}.`
                : 'Not filtered yet.'
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal1: ({ state, apply }) => (
          <Reveal
            prediction={state.p1 === null ? null : P1.options[state.p1]}
            outcome={P1.options[OUTCOME1]}
            revealed={state.spam}
            onReveal={() => apply({ ...state, spam: true })}
            label="Run the filter"
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME1} />,
        spamFact: () => <Fact id="spam-filter" />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        reveal2: ({ state, apply }) => (
          <Reveal
            prediction={state.p2 === null ? null : P2.options[state.p2]}
            outcome={TOP}
            revealed={state.shelf}
            onReveal={() => apply({ ...state, shelf: true })}
            label="Show the shelf"
          />
        ),
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUTCOME2} />,
        toy: () => (
          <p className="note">
            {`Toy systems: the filter counts words over ${SPAM_SET} hand-written messages. ${ORDERS_NOTE}`}
          </p>
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
