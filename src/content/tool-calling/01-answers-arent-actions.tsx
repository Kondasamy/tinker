// Chapter 1: staff ask the RAG assistant where an order is. With no tools it can only write text, so it guesses
// (the recorded no-tools turn). The reader predicts first, then sees the guess beside the real order record.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { toolLanes, transcript } from '../../components/scenes/toolSequence';
import { run } from '../../lib/tools/host';
import { RECORDINGS } from '../../lib/tools/turns';
import { ORDERS } from '../../lib/tools/server';
import { fact } from '../../lib/tools/facts';
import { longDate } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Messages, RecordedNote, ToolStage } from './kit';
import { OFFICE_PARTS } from '../../components/scenes/officeScene';

const MODULE = 'tool-calling',
  ID = '01-answers-arent-actions';
const REC = RECORDINGS['no-tools'];
const LANES = toolLanes('Assistant app');
export const MSGS = transcript(REC, run(REC));
const GUESS = MSGS[MSGS.length - 1].text;
const ORDER_ID = Number(REC.ask.match(/\d{4}/)![0]);
const ORDER = ORDERS.find(o => o.id === ORDER_ID)!;
const QUESTION = MSGS[0].text;

interface S {
  asked: boolean;
  prediction: number | null;
  revealed: boolean;
  looked: boolean;
  quiz: number | null;
}

const PREDICT = {
  question: `Can the model check where order ${ORDER_ID} is?`,
  options: [
    'Yes: it looks the order up in the order system',
    'No: it can only write a reply, so it guesses',
    'It says it does not know',
  ],
};
// the recorded turn calls no tool and answers anyway: a guess
const OUTCOME = 1;

export const PARTS = OFFICE_PARTS;

export const QUIZ = {
  question: `For the assistant to know where order ${ORDER_ID} really is, who has to run the lookup?`,
  options: [
    'The model, by reaching into the order system itself',
    'The software around the model: it runs the lookup and hands back the result',
    'Nobody: a bigger model would know',
    'The documents, if you add the order list to them',
  ],
  correct: 1,
  explanation: fact('app-executes').claim,
  why: [
    'A model has no way to reach anything: it reads text in and writes text out.',
    'Right: the model only asks, and the software around it runs the lookup and sends the result back.',
    'Size does not help: order statuses change every hour and were never in any training data.',
    'Documents go stale: a copy of the order list is old the moment it is made, while the order system is live.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'A support lead has a customer on the phone and asks the assistant about an order.',
    act: 'Ask the question.',
    say: { block: 'model', text: 'No tools yet' },
    predicate: s => s.asked,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `The question reached the model. The order system knows where order ${ORDER_ID} is, but no wire joins the two.`,
    act: 'Predict first.',
    say: { block: 'orders', text: 'Not connected' },
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal'],
    narration: 'Locked in.',
    act: 'See what the model sends back.',
    predicate: s => s.revealed,
  },
  {
    id: 'look',
    focus: 'look',
    visibleControls: ['reveal', 'look'],
    opensDrawer: 'messages',
    narration: 'It sounds helpful, but it is a guess: no message ever reached the order system.',
    act: 'Check the real record yourself.',
    say: { block: 'model', text: 'A guess' },
    predicate: s => s.looked,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'order',
    narration: `Order ${ORDER_ID}: ${ORDER.status} on ${longDate(ORDER.delivered!)}. The model only writes text: to act, it needs a tool other software runs.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'The model writes text. Who can actually open the order system?',
  },
];

const upTo = (s: S) => (s.revealed ? MSGS.length : s.asked ? 2 : 0);

export default function AnswersArentActions() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, prediction: null, revealed: false, looked: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <ToolStage lanes={LANES} msgs={MSGS} upTo={upTo(state)} inspect={inspect} office={{ tools: 0 }} say={say} />
      )}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask: “{QUESTION}”
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Show the model’s reply"
          />
        ),
        look: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, looked: true })}>
            Look up order {ORDER_ID} yourself
          </button>
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
      inspectPanel="messages"
      panels={{
        messages: { title: 'Messages', render: s => <Messages lanes={LANES} msgs={MSGS} upTo={upTo(s)} /> },
        order: {
          title: `Order ${ORDER_ID} in the order system`,
          render: () => (
            <div className="tc-def">
              <p className="lbl">Customer</p>
              <p>{ORDER.customer}</p>
              <p className="lbl">Status</p>
              <p>
                {ORDER.status}, {longDate(ORDER.delivered!)}
              </p>
              <p className="lbl">Items</p>
              <p>{ORDER.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</p>
              <p className="lbl">What the assistant said</p>
              <p>“{GUESS}”</p>
              <Fact id="app-executes" />
              <RecordedNote />
            </div>
          ),
        },
      }}
    />
  );
}
