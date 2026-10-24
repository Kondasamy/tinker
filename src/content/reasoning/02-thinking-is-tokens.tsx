// Chapter 2: thinking is tokens. The reader predicts which part of the thinking answer is bigger, counts it (live, with
// the site's BPE), then turns the effort dial and watches cost and wait follow the thinking. Billing facts are dated.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { EFFORTS, SPLIT, run, type Effort } from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { THINK_PARTS } from '../../components/scenes/thinkScene';
import { EffortRange, Fact, RateNote, ReasoningStage, deskOf, seconds } from './kit';

const MODULE = 'reasoning',
  ID = '02-thinking-is-tokens';
export const PARTS = THINK_PARTS;
const M = run(SPLIT, 'medium');

interface S {
  p1: number | null;
  counted: boolean;
  effort: Effort;
  seen: Effort[];
  quiz: number | null;
}

const P1 = {
  question:
    'The thinking answer from chapter 1 has two parts: the thinking, then the answer. Which part used more tokens?',
  options: ['The thinking', 'The answer', 'About the same'],
};
const outcome = () => (M.thinkingTokens > 1.25 * M.answerTokens ? 0 : M.answerTokens > 1.25 * M.thinkingTokens ? 1 : 2);

export const QUIZ = {
  question:
    'Larkspur’s finance lead sees the bill go up after thinking is turned on, though the replies customers read look just as short. What explains it?',
  options: [
    'Thinking is billed as output tokens, all of it, even when the reply shows none or only a summary',
    'The provider raised its prices the same week',
    'Thinking is billed as input tokens, which are cheaper, so it can’t be thinking',
  ],
  correct: 0,
  explanation:
    'The reply is not the whole output. Every thinking token was written by the model and is billed as output.',
  why: [
    'Right: customers see the answer, but the bill counts everything the model wrote, thinking included.',
    'Possible, but you don’t need it: the thinking alone adds output tokens to every question.',
    'Thinking is written by the model, so it is output, not input.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Thinking is text, so it is made of tokens, the pieces prices and limits are counted in.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'count',
    focus: 'count',
    visibleControls: ['p1', 'count'],
    narration:
      'This site’s own tokenizer counts them in your browser; a provider’s would count differently, but the proportions hold.',
    act: 'Press Count the tokens.',
    predicate: s => s.counted,
  },
  {
    id: 'dial',
    focus: 'dial',
    visibleControls: ['counts', 'dial'],
    narration:
      'Output tokens are what a model writes, thinking included. All thinking comes first, so the wait grows with it.',
    act: 'Turn the dial through every level.',
    say: { block: 'pad', text: 'Thinking grows' },
    setup: s => ({ ...s, seen: [...new Set([...s.seen, s.effort])] }),
    predicate: s => EFFORTS.every(e => s.seen.includes(e)),
    hint: 'Drag the dial, or use the arrow keys, until you have seen none, low, medium and high.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['billing', 'quiz'],
    narration:
      'The answer barely changes length; the thinking grows, and cost and wait with it. Providers bill it the same way.',
    act: 'One question to finish.',
    say: { block: 'clock', text: 'Wait grows too' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who wrote the thinking tokens?',
  },
];

export default function ThinkingIsTokens() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, counted: false, effort: 'medium', seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = run(SPLIT, state.effort),
          shown = state.counted;
        return (
          <ReasoningStage
            say={say}
            shown={{
              desk: shown ? deskOf(r) : { ...deskOf(M), thinking: 0, wait: 0, right: undefined },
              caption: shown
                ? `Effort ${r.effort}: ${r.thinkingTokens} thinking + ${r.answerTokens} answer tokens, cost ${r.cost}, wait ${seconds(r.wait)}.`
                : 'The split-order quote, about to be counted.',
              thinking: shown ? r.thinking : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        count: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, counted: true })}>
            Count the tokens
          </button>
        ),
        counts: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Chapter 1’s thinking answer, counted</caption>
              <tbody>
                <tr>
                  <th scope="row">Thinking</th>
                  <td>{M.thinkingTokens} tokens</td>
                </tr>
                <tr>
                  <th scope="row">Answer</th>
                  <td>{M.answerTokens} tokens</td>
                </tr>
                <tr>
                  <th scope="row">Output, all billed</th>
                  <td>
                    <strong>{M.cost} tokens</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ),
        dial: ({ state, sync }) => {
          const r = run(SPLIT, state.effort);
          return (
            <>
              <EffortRange
                value={state.effort}
                onChange={e => sync({ ...state, effort: e, seen: [...new Set([...state.seen, e])] })}
              />
              <table className="tc-ledger" style={{ marginTop: 10 }} data-effort={state.effort}>
                <caption>At effort {state.effort}</caption>
                <tbody>
                  <tr>
                    <th scope="row">Thinking</th>
                    <td>{r.thinkingTokens} tokens</td>
                  </tr>
                  <tr>
                    <th scope="row">Answer</th>
                    <td>{r.answerTokens} tokens</td>
                  </tr>
                  <tr>
                    <th scope="row">Cost (1 per output token)</th>
                    <td>{r.cost}</td>
                  </tr>
                  <tr>
                    <th scope="row">Wait</th>
                    <td>{seconds(r.wait)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Graded</th>
                    <td>{r.right ? 'right' : 'wrong'}</td>
                  </tr>
                </tbody>
              </table>
              <RateNote />
            </>
          );
        },
        billing: () => (
          <>
            <Fact id="thinking-billed" />
            <Fact id="openai-reasoning-billed" />
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
