// Chapter 1: what's in the window (R10.1). The reader assembles one turn part by part: the question alone, then the
// shipping document, then the order tools, then an earlier question, and reads each part's live token count. Counts come
// from the site's own tokenizer (R6); answers are the recorded ones; the claim that everything counts is a sourced fact.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { WINDOW_PARTS } from '../../components/scenes/windowScene';
import { DOMAINS } from '../../lib/context/loop';
import { caseOf } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, PartsTable, runOf } from './kit';

const MODULE = 'context',
  ID = '01-whats-in-the-window';
const [ALONE, EARLIER] = DOMAINS[ID].sessions!;
const CASE = caseOf(ALONE[0][0]);

interface S {
  sent: boolean;
  docs: boolean;
  tools: boolean;
  earlier: boolean;
  p1: number | null;
  quiz: number | null;
}
const setup = (s: S) => ({
  sessions: s.earlier ? EARLIER : ALONE,
  tools: s.tools,
  retrieval: s.docs ? ('top' as const) : ('none' as const),
});
const current = (s: S) => runOf(setup(s));
const last = (s: S) => {
  const r = current(s);
  return r.meter[r.meter.length - 1];
};
const tokensOf = (s: S, label: string) =>
  last(s)
    .window.parts.filter(p => p.label === label)
    .reduce((n, p) => n + p.tokens, 0);

// the order tools against everything else in the turn they join, read off the runs
const WITH = { sent: true, docs: true, tools: true, earlier: false, p1: null, quiz: null };
const TOOLS = tokensOf(WITH, 'Tools'),
  REST = last(WITH).window.tokens - TOOLS;
const QUESTION = tokensOf(WITH, 'Customer');
const P1 = {
  question:
    'Larkspur also offers the model its two order tools, so it can look up orders and issue refunds. How much of the window will their definitions take?',
  options: [
    'None: tools live outside the window, so only a call to one counts',
    'A few tokens, about as many as the question',
    'More than the system prompt, the document and the question together',
  ],
};
const OUT1 = TOOLS > REST ? 2 : TOOLS <= QUESTION * 2 ? 1 : 0;

export const QUIZ = {
  question:
    'A team gives its assistant a 20-page style guide as the system prompt, 15 tools and a long chat history. Answers start getting cut off. What is the first thing to check?',
  options: [
    'The model: a better one would answer in full',
    'The budget: the style guide, the tools and the history take so much of the window that little room is left for the reply',
    'The chat history only: tools and instructions don’t count toward the window',
    'Nothing: a window always keeps room for the reply',
  ],
  correct: 1,
  explanation: fact('window-everything').claim,
  why: [
    'Any model has a fixed window, so if the input fills it, a better model has no more room to answer in.',
    'Right: the style guide, the tools and the history fill the window, and the reply shares that same budget.',
    `Tools and instructions are text the model reads every turn, and here the order tools took ${num(TOOLS)} tokens.`,
    'The reply shares the same budget, and nothing reserves room for it unless the host does, as Larkspur’s host does.',
  ],
};

/** The parts of the window desk a step's callout may name. */
export const PARTS = WINDOW_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['send'],
    narration: `${CASE.customer} asks about ${CASE.topic}. The model reads one block per turn, its context window: for now, the system prompt and question.`,
    act: 'Send it.',
    say: { block: 'window', text: 'Two parts so far' },
    predicate: s => s.sent,
    hint: 'Press the send button.',
  },
  {
    id: 'docs',
    focus: 'docs',
    visibleControls: ['parts', 'docs'],
    narration:
      'No answer: the shipping policy isn’t in its window. The table sizes each part in tokens, counted by this site’s tokenizer.',
    act: 'Add the shipping document.',
    say: { block: 'window', text: 'Policy missing' },
    predicate: s => s.docs,
    hint: 'Press “Add the shipping document”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['parts', 'p1'],
    narration: `Right this time, from a passage of ${num(tokensOf({ ...WITH, tools: false }, 'Retrieved documents'))} tokens.`,
    act: 'Predict first.',
    say: { block: 'window', text: 'Answer found' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tools',
    focus: 'tools',
    visibleControls: ['p1', 'parts', 'tools'],
    narration: 'Your pick is locked. Each tool definition is sent so the model knows it can call it.',
    act: 'Add the order tools and watch the table.',
    predicate: s => s.tools,
    hint: 'Press “Add the order tools”.',
  },
  {
    id: 'earlier',
    focus: 'earlier',
    visibleControls: ['out1', 'parts', 'earlier'],
    narration: `Tools: ${num(TOOLS)} tokens, the rest ${num(REST)}, sent every turn. The model keeps nothing between calls, so the host re-sends the chat.`,
    act: 'Add the earlier question.',
    say: { block: 'window', text: 'Tools sent too' },
    predicate: s => s.earlier,
    hint: 'Press “Add the earlier question”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['parts', 'fact', 'quiz'],
    narration:
      'Every part shares one budget, the reply too. Larkspur’s host refuses a window that leaves the reply too little room.',
    act: 'One question to finish.',
    say: { block: 'window', text: 'One budget' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which parts of the turn did the table count?',
  },
];

const Add = ({ on, label, flip }: { on: boolean; label: string; flip: () => void }) => (
  <button type="button" className="big" disabled={on} onClick={flip}>
    {on ? `${label}: added` : label}
  </button>
);

export default function WhatsInTheWindow() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sent: false, docs: false, tools: false, earlier: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = current(state);
        return <ContextStage run={r} upTo={state.sent ? r.meter.length : 0} say={say} />;
      }}
      controls={{
        send: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, sent: true })}>
            Send the question
          </button>
        ),
        parts: ({ state }) => <PartsTable run={current(state)} caption="This turn’s window, in tokens" />,
        docs: ({ state, apply }) => (
          <Add on={state.docs} label="Add the shipping document" flip={() => apply({ ...state, docs: true })} />
        ),
        tools: ({ state, apply }) => (
          <Add on={state.tools} label="Add the order tools" flip={() => apply({ ...state, tools: true })} />
        ),
        earlier: ({ state, apply }) => (
          <Add on={state.earlier} label="Add the earlier question" flip={() => apply({ ...state, earlier: true })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        fact: () => <Fact id="window-everything" />,
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
