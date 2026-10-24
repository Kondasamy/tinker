// Chapter 6: you get what you check. The team's cheap grader rewards a number and Larkspur's sign-off. On the refund
// question, the gaming draft has both and no 30 days; ten seeded GRPO rounds make it the policy's favourite. Swapping
// in the key-fact grader (Evals' check) sends it back down and the right answer wins.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { FULL, REFUND, WEAK, bestOf, gamingOf, question, refOf, rewardsOf } from '../../lib/post-training/graders';
import { ROUNDS, grpoRun, seedOf, winnerOf } from '../../lib/post-training/policy';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Fact, PostStage, TOY, barsOf, cardsOf, groupOf } from './kit';

const MODULE = 'post-training',
  ID = '06-you-get-what-you-check';
export const PARTS = EXAM_PARTS;
const C = question(REFUND).candidates,
  REF = refOf(REFUND),
  GAME = gamingOf(REFUND),
  BEST = bestOf(REFUND);
/** The two runs the chapter shows, same seed, weak then full grader. */
export const WEAK_RUN = grpoRun(REF, rewardsOf(REFUND, WEAK), seedOf(REFUND), ROUNDS),
  FULL_RUN = grpoRun(REF, rewardsOf(REFUND, FULL), seedOf(REFUND), ROUNDS);
const pct = (p: number) => `${Math.round(p * 100)}%`;

interface S {
  p1: number | null;
  ran: boolean;
  fixed: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `${ROUNDS} rounds with this grader. Which answer ends up most likely?`,
  options: [
    `${C[BEST].id}, the right 30 days`,
    `${C[GAME].id}: numbers and a sign-off, but no 30 days`,
    `${C[0].id}, the base model’s continuation`,
  ],
};
/** read off the weak run's last round */
export const outcome = () => {
  const w = winnerOf(WEAK_RUN.at(-1)!.after);
  return w === BEST ? 0 : w === GAME ? 1 : 2;
};

export const QUIZ = {
  question:
    'A support assistant is rewarded whenever the customer’s ticket is closed within an hour. What is it most likely to learn?',
  options: [
    'To close tickets quickly, whether or not the problem is solved',
    'To solve every problem faster',
    'Nothing: closing tickets is not something a model can do',
  ],
  correct: 0,
  explanation: 'The reward checks the ticket’s state, not the customer’s problem, so the cheapest way to score wins.',
  why: [
    'Right: closing is what the reward checks, and closing without solving is the easiest way to score.',
    'Solving faster would score too, but closing without solving scores the same for far less work.',
    'If closing is one of its tools, it can learn to use it to score.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['weak', 'p1'],
    narration: `A weak grader: a point for a number, a point for the sign-off. Answer ${C[GAME].id} has both, and the wrong refund window.`,
    act: 'Predict first.',
    say: { block: 'gaming', text: 'Two points' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: `The right answer scores one point, ${C[GAME].id} scores two. Each round leans toward the higher score.`,
    act: `Press Run ${ROUNDS} rounds.`,
    predicate: s => s.ran,
  },
  {
    id: 'fix',
    focus: 'fix',
    visibleControls: ['gamed', 'fix'],
    narration: `Reward hacking: ${C[GAME].id} passes the rules and misses the point. Check the key fact instead.`,
    act: 'Press Use the key-fact grader.',
    say: { block: 'gaming', text: 'Gamed it' },
    predicate: s => s.fixed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fixedRun', 'quiz'],
    narration: `Same seed, same drafts: now ${C[BEST].id} wins and ${C[GAME].id} fades. A grader gets exactly what it checks.`,
    act: 'One question to finish.',
    say: { block: 'grader', text: 'Key fact' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What, exactly, does that reward check?',
  },
];

export default function YouGetWhatYouCheck() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, fixed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const rules = state.fixed ? FULL : WEAK,
          run = state.fixed ? FULL_RUN : WEAK_RUN,
          done = state.ran || state.fixed,
          p = done ? run.at(-1)!.after : REF,
          r = rewardsOf(REFUND, rules);
        return (
          <PostStage
            say={say}
            shown={{
              hall: {
                cards: cardsOf(REFUND, p, r),
                grader: state.fixed ? 'KEY FACT' : 'NUMBER + SIGN-OFF',
                group: done ? groupOf(run.at(-1)) : undefined,
                board: `ROUND ${done ? ROUNDS : 0}/${ROUNDS}`,
                lit: GAME,
              },
              bars: done ? barsOf(REFUND, REF, p, r) : undefined,
              caption: done
                ? `${state.fixed ? 'Key-fact grader' : 'Weak grader'}, ${ROUNDS} rounds: ${C.map((c, i) => `${c.id} ${pct(p[i])}`).join(', ')}.`
                : `Rewards under the weak grader: ${C.map((c, i) => `${c.id} ${r[i]}`).join(', ')}.`,
              stamp: done ? (winnerOf(p) === BEST ? 'PASS' : 'FAIL') : undefined,
            }}
          />
        );
      }}
      controls={{
        weak: () => (
          <>
            <AnswerCard q={REFUND} i={BEST} rules={[...WEAK, ...FULL]} />
            <AnswerCard q={REFUND} i={GAME} rules={[...WEAK, ...FULL]} />
            <p className="note">{TOY}</p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
            Run {ROUNDS} rounds
          </button>
        ),
        gamed: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <p className="tc-status" data-winner={C[winnerOf(WEAK_RUN.at(-1)!.after)].id}>
              After {ROUNDS} rounds: {C[GAME].id} at {pct(WEAK_RUN.at(-1)!.after[GAME])}, {C[BEST].id} at{' '}
              {pct(WEAK_RUN.at(-1)!.after[BEST])}.
            </p>
            <Fact id="spec-gaming" />
          </>
        ),
        fix: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, fixed: true })}>
            Use the key-fact grader
          </button>
        ),
        fixedRun: () => (
          <>
            <p className="tc-status" data-winner={C[winnerOf(FULL_RUN.at(-1)!.after)].id}>
              Key-fact grader, {ROUNDS} rounds: {C[BEST].id} at {pct(FULL_RUN.at(-1)!.after[BEST])}, {C[GAME].id} at{' '}
              {pct(FULL_RUN.at(-1)!.after[GAME])}.
            </p>
            <Fact id="overoptimisation" />
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
