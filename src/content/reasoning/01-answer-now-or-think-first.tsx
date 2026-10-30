// Chapter 1: answer now or think first. The split-order quote, answered at once (none) and then after thinking (medium),
// the thinking shown under the stage. The answers are recorded; the grade under each runs live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { SPLIT, run } from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { THINK_PARTS } from '../../components/scenes/thinkScene';
import { Answer, Asked, Fact, ReasoningStage, deskOf } from './kit';

const MODULE = 'reasoning',
  ID = '01-answer-now-or-think-first';
export const PARTS = THINK_PARTS;
const NOW = run(SPLIT, 'none'),
  THINK = run(SPLIT, 'medium');

interface S {
  now: boolean;
  p1: number | null;
  thought: boolean;
  quiz: number | null;
}

const P1 = {
  question:
    'The quick answer is in. Now the same model gets the same question and the same price list, but writes out its working first. What happens to the answer?',
  options: [
    'The same answer, only slower',
    'A different answer: the working uses a rule the quick answer skipped',
    'It refuses: thinking makes it unsure',
  ],
};
/** read off the recorded answers' grades */
const outcome = () => (THINK.right === NOW.right ? 0 : 1);

export const QUIZ = {
  question: 'Which of these is the assistant most likely to get wrong when it answers at once, without thinking?',
  options: [
    'Which warehouse is in Eastgate?',
    'What a customer pays for 15 shelving bays and 40 label rolls, each line at its own volume price',
    'Who leads the Customer Success team?',
  ],
  correct: 1,
  explanation:
    'Several steps in a row (two price columns, two products, a sum) give a quick answer several chances to slip.',
  why: [
    'One fact read off a page: there is no working to get wrong.',
    'Right: each line needs its own column, then a product, then a sum, and that is where writing the steps out pays off.',
    'A name on a page, so thinking first has nothing to fix here.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'now',
    focus: 'now',
    visibleControls: ['asked', 'now'],
    narration: 'A customer’s quote reaches the assistant. It reads the price list and answers at once.',
    act: 'Press Answer now.',
    say: { block: 'dial', text: 'No thinking yet' },
    predicate: s => s.now,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['nowAnswer', 'p1'],
    narration:
      'Wrong: the quick answer skipped the sentence about order lines. A reasoning model writes out its working, its thinking, before it answers.',
    act: 'Predict first.',
    say: { block: 'dial', text: 'Answered at once' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'think',
    focus: 'think',
    visibleControls: ['p1', 'think'],
    narration: 'Its thinking appears under the picture, and the pad on the desk grows with it.',
    act: 'Press Think first, then answer.',
    predicate: s => s.thought,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['compare', 'fact', 'quiz'],
    narration:
      'Same model, same documents: writing out the steps caught the skipped rule. Research finds it pays on a multi-step question.',
    act: 'One question to finish.',
    say: { block: 'pad', text: 'Its working' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which question needs several steps in a row?',
  },
];

export default function AnswerNowOrThinkFirst() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ now: false, p1: null, thought: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = state.thought ? THINK : NOW;
        return (
          <ReasoningStage
            say={say}
            shown={{
              desk: state.now ? deskOf(r) : { effort: 'none', thinking: 0, wait: 0 },
              caption: state.thought
                ? `Thought first: ${r.thinkingTokens} thinking tokens, then the answer. Graded ${r.right ? 'right' : 'wrong'}.`
                : state.now
                  ? `Answered at once, no thinking. Graded ${r.right ? 'right' : 'wrong'}.`
                  : 'The desk: the model, an effort dial set to none, and a clock.',
              thinking: state.now ? r.thinking : undefined,
              stamp: state.now ? (r.right ? 'PASS' : 'FAIL') : undefined,
            }}
          />
        );
      }}
      controls={{
        asked: () => (
          <>
            <Asked q={SPLIT} />
            <p className="rs-note">
              The answers in this module were written ahead of time for this site: recorded, not live. The grade under
              each runs in your browser, with the Evals module’s key-fact check.
            </p>
          </>
        ),
        now: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, now: true })}>
            Answer now
          </button>
        ),
        nowAnswer: () => <Answer q={SPLIT} effort="none" />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        think: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, thought: true })}>
            Think first, then answer
          </button>
        ),
        compare: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Answer q={SPLIT} effort="none" />
            <Answer q={SPLIT} effort="medium" />
          </>
        ),
        fact: () => <Fact id="wei-cot" />,
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
