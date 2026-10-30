// Chapter 2: a planted secret. The four canaries (data/memorisation/canaries.json): fake customers with fake PINs,
// planted 1, 4, 16 and 64 times. The reader picks each with the repeats radio; the ledger lights its copies and the
// Ledger tab lists the lines.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { REPEATS, RUNS, canaryOf, lineOf } from '../../lib/memorisation/story';
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { Fact, RecitalStage, RepeatsRadio, ToyNote, ledgerOf } from './kit';

const MODULE = 'memorisation',
  ID = '02-a-planted-secret';
export const PARTS = RECITAL_PARTS;
const MOST = Math.max(...REPEATS),
  LEAST = Math.min(...REPEATS);

export const QUIZ = {
  question: 'A bank wants to test whether its chat model can leak account numbers. What should it plant in training?',
  options: [
    'Made-up account numbers it can safely watch for',
    'Real customers’ numbers, to make the test realistic',
    'Nothing: ask the model whether it saw any',
  ],
  correct: 0,
  explanation: 'A canary is a fake secret: if it leaks, nobody is hurt, and you know exactly what to look for.',
  why: [
    'Right: a fake secret you planted is safe to leak and easy to search for.',
    'A test that can leak real numbers is itself the breach it was meant to prevent.',
    'A model can’t report what it memorised; you have to test it from outside.',
  ],
};

export interface S {
  repeats: number | null;
  seen: number[];
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'look',
    focus: 'repeats',
    visibleControls: ['repeats'],
    narration: `Each canary is a fake customer’s fake PIN, planted with ${LEAST} to ${MOST} copies.`,
    act: 'Pick each one.',
    say: { block: 'ledger', text: 'Planted lines' },
    predicate: s => REPEATS.every(r => s.seen.includes(r)),
    hint: 'Choose every option in the Copies in training list.',
    solution: s => ({ ...s, repeats: MOST, seen: [...REPEATS] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['repeats', 'note', 'quiz'],
    narration: `Real tickets repeat like this. The ${RUNS.runs.canary.lines} lines are fake, so the team can safely watch for them.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What makes a test secret safe to leak?',
  },
];

export default function APlantedSecret() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ repeats: null, seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RecitalStage
          say={say}
          repeats={state.repeats}
          desk={{ ledger: ledgerOf(state.repeats) }}
          readout={state.repeats === null ? [] : [`“${lineOf(canaryOf(state.repeats))}” × ${state.repeats}`]}
          caption="The training ledger: the planted lines are lit."
        />
      )}
      controls={{
        repeats: ({ state, apply, sync, focused }) => (
          <RepeatsRadio
            value={state.repeats}
            onChange={r =>
              (focused ? apply : sync)({
                ...state,
                repeats: r,
                seen: state.seen.includes(r) ? state.seen : [...state.seen, r],
              })
            }
          />
        ),
        note: () => (
          <>
            <Fact id="carlini-2019" />
            <ToyNote />
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
