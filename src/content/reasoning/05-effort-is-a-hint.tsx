// Chapter 5: effort is a hint, not a counter. A lookup and a multi-step question at the same effort think very different
// amounts (recorded, counted live). Then what today's APIs take, from dated facts: effort levels, adaptive thinking, the
// deprecated fixed budget, and max_tokens as the hard cap.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { HINT_PAIR, question, run, type Effort } from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EffortRange, Fact, ReasoningStage, deskOf } from './kit';

const MODULE = 'reasoning',
  ID = '05-effort-is-a-hint';
const [EASY, HARD] = HINT_PAIR;
const NAME = (q: string) => (question(q).kind === 'lookup' ? 'The lookup' : 'The delivery date');

interface S {
  p1: number | null;
  ran: boolean;
  effort: Effort;
  pick: string;
  quiz: number | null;
}

const P1 = {
  question:
    'Both questions run at high effort: the same-day cutoff (a lookup) and a Friday-afternoon delivery date (several steps). How much will each think?',
  options: [
    'The same: high effort means a set number of thinking tokens',
    'The delivery date thinks far more: effort is a hint, and the model decides how much each question needs',
    'The lookup thinks more, because it reads a longer passage',
  ],
};
const outcome = () => {
  const e = run(EASY, 'high').thinkingTokens,
    h = run(HARD, 'high').thinkingTokens;
  return Math.abs(e - h) < 0.2 * h ? 0 : h > e ? 1 : 2;
};

const QUIZ = {
  question:
    'A team moves to a newer model and its code still sends a fixed thinking budget of 8,000 tokens. What should it do?',
  options: [
    'Nothing: a budget is a budget on every model',
    'Switch to adaptive thinking, set an effort level, keep max_tokens with room for thinking, and re-run its evals',
    'Raise the budget to 32,000 to be safe',
  ],
  correct: 1,
  explanation: 'Newer models decide per request how much to think, steered by effort; max_tokens stays the hard cap.',
  why: [
    'The fixed budget is deprecated on some models and rejected by newer ones. Code that sends it can stop working.',
    'Right. Effort replaces the budget as the control; max_tokens still caps the whole reply; and a new setting is a change to measure.',
    'A bigger fixed budget is still a fixed budget, which newer models don’t take.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['pair', 'p1'],
    narration:
      'The team sets effort to high for two questions, a lookup and a delivery date, and expects them to think the same amount. Before you run them:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Run both at high effort.',
    predicate: s => s.ran,
  },
  {
    id: 'apis',
    focus: 'quiz',
    visibleControls: ['counts', 'apis', 'quiz'],
    narration:
      'Same setting, very different thinking: the lookup had little to work out. Effort tells the model how willing to be to think, not how many tokens to spend. That is how today’s APIs describe it, and it replaced the fixed thinking budget, a set number of tokens to think for. What still sets a hard limit is max_tokens, the cap on everything a reply writes, thinking and answer together. Move the dial to compare the two at other levels; then one question.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What do newer models take in place of a fixed budget?',
  },
];

export default function EffortIsAHint() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, effort: 'high', pick: HARD, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => {
        const r = run(state.pick, state.effort);
        return (
          <ReasoningStage
            shown={{
              desk: state.ran ? deskOf(r) : { effort: 'high', thinking: 0, wait: 0 },
              caption: state.ran
                ? `${NAME(state.pick)} at ${state.effort}: ${r.thinkingTokens} thinking tokens.`
                : 'Two questions, one effort setting.',
              thinking: state.ran ? r.thinking : undefined,
            }}
          />
        );
      }}
      controls={{
        pair: () => (
          <ul className="rs-qs">
            {HINT_PAIR.map(q => (
              <li key={q}>“{question(q).query}”</li>
            ))}
          </ul>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
            Run both at high effort
          </button>
        ),
        counts: ({ state, sync }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <EffortRange value={state.effort} onChange={e => sync({ ...state, effort: e })} />
            <div className="rs-row" role="group" aria-label="Which question on the desk" style={{ marginTop: 8 }}>
              {HINT_PAIR.map(q => (
                <button
                  key={q}
                  type="button"
                  className="chip"
                  aria-pressed={state.pick === q}
                  onClick={() => sync({ ...state, pick: q })}
                >
                  Show {NAME(q).toLowerCase()}
                </button>
              ))}
            </div>
            <table className="tc-ledger" style={{ marginTop: 10 }} data-effort={state.effort}>
              <caption>Thinking tokens at effort {state.effort}</caption>
              <tbody>
                {HINT_PAIR.map(q => (
                  <tr key={q}>
                    <th scope="row">{question(q).query}</th>
                    <td>{run(q, state.effort).thinkingTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ),
        apis: () => (
          <>
            <Fact id="effort-signal" />
            <Fact id="effort-levels" />
            <Fact id="budget-deprecated" />
            <Fact id="openai-effort" />
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
