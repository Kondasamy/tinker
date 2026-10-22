// Chapter 1: what's in the window (R10.1). The reader assembles one turn part by part: the question alone, then the
// shipping document, then the order tools, then an earlier question, and reads each part's live token count. Counts come
// from the site's own tokenizer (R6); answers are the recorded ones; the claim that everything counts is a sourced fact.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
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
const CASE = caseOf(ALONE[0][0]),
  FIRST = caseOf(EARLIER[0][0]);

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

const QUIZ = {
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
    'Any model has a fixed window. If the input fills it, a better model has no more room to answer in.',
    `Right. ${fact('window-everything').claim}`,
    `Tools and instructions are text the model reads every turn. In this chapter the two order tools took ${num(TOOLS)} tokens.`,
    'The reply shares the same budget. Nothing reserves room for it unless the host does, as Larkspur’s host keeps a few tokens free.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['send'],
    narration: `${CASE.customer} asks Larkspur’s assistant: “${CASE.question}” A model reads one block of text per turn: the context window. Everything it knows about this question has to be in there. Right now the turn holds two parts: Larkspur’s system prompt and ${CASE.customer}’s question. Send it.`,
    predicate: s => s.sent,
    hint: 'Press the send button.',
  },
  {
    id: 'docs',
    focus: 'docs',
    visibleControls: ['parts', 'docs'],
    narration: `“${last({ ...WITH, docs: false, tools: false }).turn.text}” The model said so honestly: the shipping policy isn’t in its window. The table shows each part and its size in tokens, the unit a model reads and is billed in. These counts come from this site’s own tokenizer, trained on Larkspur’s documents; a provider’s tokenizer counts a little differently. Add the shipping document.`,
    predicate: s => s.docs,
    hint: 'Press “Add the shipping document”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['parts', 'p1'],
    narration: `“${last({ ...WITH, tools: false }).turn.text}” Right this time, from a passage of ${num(tokensOf({ ...WITH, tools: false }, 'Retrieved documents'))} tokens. Before you add anything else:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tools',
    focus: 'tools',
    visibleControls: ['p1', 'parts', 'tools'],
    narration: 'Add the order tools and watch the table.',
    predicate: s => s.tools,
    hint: 'Press “Add the order tools”.',
  },
  {
    id: 'earlier',
    focus: 'earlier',
    visibleControls: ['out1', 'parts', 'earlier'],
    narration: `The two tool definitions take ${num(TOOLS)} tokens, against ${num(REST)} for everything else. A tool’s name, description and input schema are sent with every turn, called or not, so the model knows it can use them. One part is still missing. ${CASE.customer} asked “${FIRST.question}” earlier in this chat, and the model keeps nothing between calls: the host sends the conversation again each turn. Add the earlier question.`,
    predicate: s => s.earlier,
    hint: 'Press “Add the earlier question”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['parts', 'fact', 'quiz'],
    narration:
      'Now the turn has every kind of part: tools, the system prompt, the earlier question with its document and answer, this question’s document, and the question. Every one of them counts against one budget, and so does the reply: Larkspur’s host keeps room for it and refuses a window that leaves too little. One question to finish.',
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
      stage={({ state }) => {
        const r = current(state);
        return <ContextStage run={r} upTo={state.sent ? r.meter.length : 0} />;
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
