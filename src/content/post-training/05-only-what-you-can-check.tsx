// Chapter 5: only what you can check. The key-fact grader runs on the upset customer's drafts. Every draft carries the
// fact, so every group's rewards are equal, every advantage is zero, and ten rounds of GRPO change nothing. The reader
// predicts what happens to the warm draft, runs the rounds, and reads why.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { FULL, TONE, bestOf, question, refOf, rewardsOf } from '../../lib/post-training/graders';
import { ROUNDS, grpoRun, seedOf } from '../../lib/post-training/policy';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Fact, PostStage, TOY, barsOf, cardsOf, groupOf } from './kit';

const MODULE = 'post-training',
  ID = '05-only-what-you-can-check';
export const PARTS = EXAM_PARTS;
const C = question(TONE).candidates,
  REF = refOf(TONE),
  R = rewardsOf(TONE, FULL),
  WARM = bestOf(TONE);
export const RUN = grpoRun(REF, R, seedOf(TONE), ROUNDS);
const pct = (p: number) => `${Math.round(p * 100)}%`;

interface S {
  p1: number | null;
  ran: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `The key-fact grader runs ${ROUNDS} rounds on these drafts. What happens to the warm draft, ${C[WARM].id}?`,
  options: ['Nothing: it stays where it started', 'It rises: it is the best reply', 'It falls: it is the longest'],
};
/** read off the run: the warm draft's share after the last round against the start */
export const outcome = () => {
  const a = RUN.at(-1)!.after[WARM];
  return Math.abs(a - REF[WARM]) < 1e-12 ? 0 : a > REF[WARM] ? 1 : 2;
};

export const QUIZ = {
  question:
    'A coding assistant is trained with a grader that runs the tests. Its code now passes, but its names are confusing. Why didn’t training fix the names?',
  options: [
    'The tests check whether the code works, not whether it reads well',
    'It needed more rounds',
    'Names can’t be learnt by a model',
  ],
  correct: 0,
  explanation: 'Training moves only what the grader can tell apart; clear names score the same as confusing ones.',
  why: [
    'Right: every passing draft gets the same reward whatever its names, so nothing pushes them toward clear ones.',
    'More rounds repeat the same equal rewards for names, so they still change nothing.',
    'Models learn naming habits from examples and preferences; this grader just never rewards them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['asked', 'p1'],
    narration: 'Back to the upset customer. Every draft has the fact, so the key-fact grader passes them all.',
    act: 'Predict first.',
    say: { block: 'grader', text: 'All pass' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Every draft in every group earns the same reward: no spread, so every advantage is zero.',
    act: `Press Run ${ROUNDS} rounds.`,
    predicate: s => s.ran,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration:
      'The grader checks the fact, not the warmth, so warmth never moves. Preference pairs, like chapter 3’s, can teach it.',
    act: 'One question to finish.',
    say: { block: 'cards', text: 'Unchanged' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the grader in that question check?',
  },
];

export default function OnlyWhatYouCanCheck() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = state.ran ? RUN.at(-1)!.after : REF;
        return (
          <PostStage
            say={say}
            shown={{
              hall: {
                cards: cardsOf(TONE, p, R),
                grader: 'KEY FACT',
                group: state.ran ? groupOf(RUN.at(-1)) : undefined,
                board: `ROUND ${state.ran ? ROUNDS : 0}/${ROUNDS}`,
              },
              bars: state.ran ? barsOf(TONE, REF, p, R) : undefined,
              caption: state.ran
                ? `After ${ROUNDS} rounds: ${C.map((c, i) => `${c.id} ${pct(p[i])}`).join(', ')}, exactly where they started.`
                : 'Every draft is marked mint: each one carries the fact the grader checks.',
            }}
          />
        );
      }}
      controls={{
        asked: () => (
          <>
            <AnswerCard q={TONE} i={WARM} rules={FULL} />
            <p className="note">{TOY}</p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
            Run {ROUNDS} rounds
          </button>
        ),
        result: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <p className="tc-status">
              Group rewards, round by round: {RUN.map(r => r.rewards.join('')).join(' · ')}. Every advantage: 0.
            </p>
            <Fact id="r1-zero" />
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
