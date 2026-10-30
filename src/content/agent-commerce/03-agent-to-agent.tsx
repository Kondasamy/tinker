// Chapter 3: agent to agent. Reyes Decks' buying agent hands Larkspur's sales agent the order as an A2A-shaped task.
// The reader predicts what the vague order does, sends it, answers the question back, reads the states on the Task tab
// and sends the clear order for comparison. Seller turns are recorded; the host moves the task (runTask), live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { HATCH_PARTS } from '../../components/scenes/hatchScene';
import { runTask, type TaskRun } from '../../lib/agent-commerce/task';
import {
  ANSWER,
  BUILDER,
  BUYER_AGENT,
  COMPANY,
  REQUEST,
  SELLER_AGENT,
  VAGUE_REQUEST,
} from '../../lib/agent-commerce/story';
import { type Request, TASK_TURNS } from '../../lib/agent-commerce/turns';
import { Outcome } from '../tool-calling/kit';
import { Fact, HatchStage, RecordedNote, type View } from './kit';

const MODULE = 'agent-commerce',
  ID = '03-agent-to-agent';
export const PARTS = HATCH_PARTS;
export const RUNS: Record<Request, TaskRun> = {
  clear: runTask(TASK_TURNS, 'clear'),
  vague: runTask(TASK_TURNS, 'vague'),
};
const ASKED = RUNS.vague.states.indexOf('input-required');

export interface S {
  p1: number | null;
  sent: Request | null;
  answered: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `“${VAGUE_REQUEST}”: no size, no count. What will ${SELLER_AGENT} do?`,
  options: ['Ask back which screws, and how many', 'Pick a size and finish the order', 'Fail the task'],
};
const FIRST_STATE = RUNS.vague.turns[0]?.turn.state;
/** the recorded seller's first move on the vague order, as an option */
export const OUTCOME = FIRST_STATE === 'input-required' ? 0 : FIRST_STATE === 'completed' ? 1 : 2;

export const QUIZ = {
  question: 'A supplier’s task has sat in input-required for an hour. What is it waiting for?',
  options: [
    'An answer from the agent that sent the task',
    'The supplier’s stock system to restock the item',
    'A person at the supplier to approve the sale',
  ],
  correct: 0,
  explanation: 'Input-required pauses the task until the agent that sent it answers the question it asked.',
  why: [
    'Right: the task asked something back, and it moves again only when the sender answers.',
    'Stock is the supplier’s own business; the paused state is about a question to the sender.',
    'A person approving would be the supplier’s internal step; this state waits on the other agent.',
  ],
};

/** The states shown: the vague run stops at its question until it is answered. */
export const statesOf = (s: S) => {
  if (!s.sent) return undefined;
  const r = RUNS[s.sent];
  return s.sent === 'vague' && !s.answered ? r.states.slice(0, ASKED + 1) : r.states;
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${BUILDER.firm}’s agent hands ${COMPANY}’s sales agent a task, a job with a state. This order is vague.`,
    act: 'Predict its move.',
    say: { block: 'seller', text: 'Gets the task' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['p1', 'send'],
    narration: 'A task starts submitted, then working, then ends: completed, failed or canceled. It can also pause.',
    act: 'Send the vague order.',
    predicate: s => s.sent === 'vague',
  },
  {
    id: 'answer',
    focus: 'answer',
    visibleControls: ['out1', 'turns', 'answer'],
    narration: `Input required: the task waits on a question. ${BUILDER.firm}’s agent knows the answer from its order.`,
    act: 'Answer it.',
    say: { block: 'hatch', text: 'Asks back' },
    predicate: s => s.sent === 'vague' && s.answered,
  },
  {
    id: 'tab',
    focus: 'tab',
    visibleControls: ['turns'],
    narration: `Completed, after ${RUNS.vague.states.length} states. The Task tab shows each one the task passed through.`,
    act: 'Open the Task tab.',
    predicate: s => s.view === 'task',
  },
  {
    id: 'clear',
    focus: 'send',
    visibleControls: ['send'],
    narration: 'Now the same order with its size and count spelled out.',
    act: 'Send the clear order.',
    predicate: s => s.sent === 'clear',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['turns', 'link', 'quiz'],
    narration: `${RUNS.clear.states.length} states against ${RUNS.vague.states.length}: no question back. Every pause is a round trip between agents.`,
    act: 'One question to finish.',
    say: { block: 'buyer', text: 'No question' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who asked the question, and who has to answer it?',
  },
];

function Turns({ s }: { s: S }) {
  if (!s.sent) return null;
  const r = RUNS[s.sent];
  const lines: [string, string][] = [[BUYER_AGENT, s.sent === 'vague' ? VAGUE_REQUEST : REQUEST]];
  r.turns.forEach(({ turn }, i) => {
    if (s.sent === 'vague' && !s.answered && i > 0) return;
    lines.push([SELLER_AGENT, turn.text]);
    if (turn.state === 'input-required' && (s.sent !== 'vague' || s.answered)) lines.push([BUYER_AGENT, ANSWER]);
  });
  return (
    <div className="ac-reads">
      <ol className="ac-turns">
        {lines.map(([who, text], i) => (
          <li key={i}>
            <span className="lbl">{who}</span> {text}
          </li>
        ))}
      </ol>
      <RecordedNote meta={TASK_TURNS.meta} />
    </div>
  );
}

export default function AgentToAgent() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, sent: null, answered: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const states = statesOf(state),
          last = states?.at(-1);
        return (
          <HatchStage
            say={say}
            states={states}
            view={state.view}
            onView={v => (focus === 'tab' ? apply : sync)({ ...state, view: v })}
            scene={{ seller: last === 'input-required' ? 'warn' : last === 'completed' ? 'ok' : undefined }}
            caption={states ? `The task: ${states.join(' → ')}.` : `${BUYER_AGENT} is about to send a task.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        send: ({ state, apply }) => (
          <div className="ac-buttons">
            {(['vague', 'clear'] as const).map(r => (
              <button
                key={r}
                type="button"
                className="chip"
                onClick={() => apply({ ...state, sent: r, answered: false })}
              >
                {`Send the ${r} order`}
              </button>
            ))}
          </div>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        turns: ({ state }) => <Turns s={state} />,
        answer: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, answered: true })}>
            {`Answer: “${ANSWER}”`}
          </button>
        ),
        link: () => (
          <>
            <Fact id="a2a-states" />
            <p className="note">
              <a href="/agents/02-the-loop/">Each agent’s own loop, and who says done, is AI agents’ chapter 2.</a>
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
