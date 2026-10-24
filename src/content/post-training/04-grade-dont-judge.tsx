// Chapter 4: grade, don't judge. The warranty question has one right answer, so Evals' key-fact check grades every
// draft. GRPO runs live: a seeded group of six drafts, each graded, each scored against the group's average, then a
// clipped step; then nine more rounds. The reader predicts which drafts the update pushes up.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { FULL, WARRANTY, bestOf, question, refOf, rewardsOf } from '../../lib/post-training/graders';
import { CLIP, GROUP, ROUNDS, grpoRun, seedOf, winnerOf } from '../../lib/post-training/policy';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Asked, Fact, Maths, PostStage, TOY, barsOf, cardsOf, groupOf } from './kit';

const MODULE = 'post-training',
  ID = '04-grade-dont-judge';
export const PARTS = EXAM_PARTS;
const C = question(WARRANTY).candidates,
  REF = refOf(WARRANTY),
  R = rewardsOf(WARRANTY, FULL);
/** Every round this chapter can show, computed once: the same seed always gives the same groups. */
export const RUN = grpoRun(REF, R, seedOf(WARRANTY), ROUNDS);
const FIRST = RUN[0];
const pct = (p: number) => `${Math.round(p * 100)}%`;
const sign = (a: number) => (a > 0 ? `+${a.toFixed(2)}` : a < 0 ? `−${(-a).toFixed(2)}` : '0');

interface S {
  drawn: boolean;
  rounds: number;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `The grader passed ${FIRST.rewards.filter(Boolean).length} of the ${GROUP} drafts. Which drafts will the update make more likely?`,
  options: [
    'The ones that scored above the group’s average',
    'Every draft, a little',
    'Only the draft that was already most likely',
  ],
};
/** read off the first round: every passing draft's answer rose (0) */
export const outcome = () =>
  FIRST.group.every((y, j) => !FIRST.rewards[j] || FIRST.after[y] > FIRST.before[y]) ? 0 : 1;

export const QUIZ = {
  question: 'Which of these tasks suits training with a checkable grader best?',
  options: [
    'Maths word problems, each with one right number to compare against',
    'Replies that should sound friendly',
    'Short poems that should be beautiful',
  ],
  correct: 0,
  explanation: 'A grader needs a right answer it can check by program; a number can be compared exactly.',
  why: [
    'Right: a program compares the final number with the known answer, so every draft gets a fair reward.',
    'Friendliness has no single right answer for a program to check; people’s comparisons suit it better.',
    'Beauty is a matter of taste, so there is nothing for a program to check.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'draw',
    focus: 'draw',
    visibleControls: ['asked', 'draw'],
    narration: 'One right answer, so a program can check it: a grader. The model writes a group of drafts.',
    act: 'Press Draw a group.',
    say: { block: 'grader', text: 'Key fact' },
    predicate: s => s.drawn,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['group', 'p1'],
    narration:
      'GRPO scores each draft against its group’s average: above it, a positive advantage; below it, a negative one.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'update',
    focus: 'update',
    visibleControls: ['p1', 'update'],
    narration: 'The update leans the policy toward drafts with a positive advantage, and away from the rest.',
    act: 'Press Update the policy.',
    predicate: s => s.rounds >= 1,
  },
  {
    id: 'rounds',
    focus: 'rounds',
    visibleControls: ['updated', 'rounds'],
    narration:
      'Each round draws a fresh group from the new policy. Steps are clipped, so one lucky group can’t swing it.',
    act: `Press Run ${ROUNDS - 1} more rounds.`,
    say: { block: 'board', text: 'Rounds' },
    predicate: s => s.rounds === ROUNDS,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['done', 'quiz'],
    narration: 'The right answer now dominates, and no person judged a single draft.',
    act: 'One question to finish.',
    say: { block: 'cards', text: 'Three years' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which task has an answer a program can compare exactly?',
  },
];

export default function GradeDontJudge() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ drawn: false, rounds: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const n = Math.min(state.rounds, ROUNDS),
          last = n ? RUN[n - 1] : undefined,
          p = last?.after ?? REF,
          shown = state.drawn ? (last ?? FIRST) : undefined;
        return (
          <PostStage
            say={say}
            shown={{
              hall: {
                cards: cardsOf(WARRANTY, p, state.drawn ? R : undefined),
                grader: 'KEY FACT',
                group: groupOf(shown),
                board: `ROUND ${n}/${ROUNDS}`,
              },
              bars: state.drawn ? barsOf(WARRANTY, REF, p, R) : undefined,
              caption: !state.drawn
                ? 'The toy policy over four written drafts, before any training.'
                : `After ${n} round${n === 1 ? '' : 's'}: ${C.map((c, i) => `${c.id} ${pct(p[i])}`).join(', ')}. Mint: the key fact is there.`,
              stamp: n === ROUNDS && winnerOf(p) === bestOf(WARRANTY) ? 'PASS' : undefined,
            }}
          />
        );
      }}
      controls={{
        asked: () => (
          <>
            <Asked q={WARRANTY} />
            <p className="note">{TOY}</p>
          </>
        ),
        draw: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, drawn: true })}>
            Draw a group
          </button>
        ),
        group: () => {
          const mean = FIRST.rewards.reduce((a, b) => a + b, 0) / GROUP;
          return (
            <table className="tc-ledger" data-group>
              <caption>
                The group of {GROUP}, graded live (average reward {mean.toFixed(2)})
              </caption>
              <thead>
                <tr>
                  <th scope="col">Draft</th>
                  <th scope="col">Reward</th>
                  <th scope="col">Advantage</th>
                </tr>
              </thead>
              <tbody>
                {FIRST.group.map((y, j) => (
                  <tr key={j}>
                    <th scope="row">
                      {C[y].id}: “{C[y].text}”
                    </th>
                    <td>{FIRST.rewards[j]}</td>
                    <td>{sign(FIRST.advantages[j])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        update: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, rounds: 1 })}>
            Update the policy
          </button>
        ),
        updated: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <p className="tc-status">
              Round 1: {C.map((c, i) => `${c.id} ${pct(FIRST.before[i])} → ${pct(FIRST.after[i])}`).join(', ')}.
            </p>
          </>
        ),
        rounds: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, rounds: ROUNDS })}>
            Run {ROUNDS - 1} more rounds
          </button>
        ),
        done: () => (
          <>
            <AnswerCard q={WARRANTY} i={bestOf(WARRANTY)} rules={FULL} p={RUN.at(-1)!.after[bestOf(WARRANTY)]} />
            <Fact id="grpo" />
            <Fact id="rlvr" />
            <Maths>
              <p>
                Advantage = (reward − group average) ÷ the group’s standard deviation. The step raises the log-odds of
                each drawn draft in proportion to its advantage, over a few small steps; a draft whose odds have already
                moved more than {Math.round(CLIP * 100)}% from the group’s policy stops pushing (PPO’s clip). The toy
                leaves out the pull back to the reference that DeepSeekMath adds.
              </p>
            </Maths>
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
