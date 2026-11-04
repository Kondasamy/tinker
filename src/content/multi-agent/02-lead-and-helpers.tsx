// Chapter 2: a lead and helpers (R6c.2). The reader hires three helpers by dragging patch cords from the board's coil
// to their desks (or the Helpers radio), predicts the token bill, runs the job, and the stage closes in on the token
// meter: the report is done in half the time and complete, for more tokens. Tokens and minutes are hand-set (ToyNote);
// the reveal cites Anthropic's vendor-reported 15× token multiple and its 90.2% gain.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { fact } from '../../lib/multi-agent/facts';
import { CATALOGUES, jobOf, run } from '../../lib/multi-agent/sim';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '02-lead-and-helpers';
const JOB = jobOf('report'),
  K = 3,
  N = CATALOGUES.length;
const d = (helpers: number) => run(JOB, { helpers, brief: 'detailed', check: false });
const ALONE = d(0),
  THREE = d(K);
const HELPERS = [0, 1, 2, 3, 4, 5] as const;

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `${K} helpers read ${N / K} catalogues each. What happens to the token bill?`,
  options: [
    'It goes up: each helper brings its own instructions and reply',
    'It goes down: each helper reads less',
    `It stays the same: the same ${N} catalogues get read`,
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A team splits a research job across four helper agents. What should they expect?',
  options: [
    'Faster and fuller work, and a bigger token bill',
    'Faster and cheaper, since each helper reads less',
    'The same bill, just sooner',
  ],
  correct: 0,
  explanation: 'Helpers buy room and speed with tokens: every helper carries its own instructions and reply.',
  why: [
    'Right: each helper has its own window, so the job fits and runs side by side, and each one costs tokens.',
    'Each helper reads less, but all of them together read as much, plus their own instructions.',
    'The bill grows with every helper, even when the reading stays the same.',
  ],
};

export const PARTS = SWITCH_PARTS;
const wiredEnough = (s: S) => s.wired.length >= K;

export const STEPS: Step<S>[] = [
  {
    id: 'hire',
    focus: 'hire',
    visibleControls: [],
    narration: 'The lead agent hires helpers, each at its own desk.',
    act: `Drag cords from the coil to ${K} desks, or pick ${K}.`,
    say: { block: 'coil', text: 'Drag from here' },
    status: `${K} cords run from the board to ${K} helper desks.`,
    predicate: wiredEnough,
    hint: `Pick ${K} under Helpers, below the picture.`,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `The lead will brief each helper, wait, and merge ${K} replies.`,
    act: 'Predict: what happens to the token bill?',
    say: { block: 'meter', text: 'Token meter' },
    status: `${K} cords wait; the catalogues are still on the cart.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict'],
    narration: 'Pick locked. Now run the job.',
    act: 'Tap the switchboard, or press Run.',
    status: `Each desk read ${N / K}, ${K} replies seated, and the report reached Ines in ${THREE.minutes} minutes.`,
    predicate: s => s.ran && wiredEnough(s),
    hint: `Keep ${K} helpers, then press Run.`,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Done in ${THREE.minutes} minutes and complete, but the meter reads ${num(THREE.tokens)} tokens; alone it read ${num(ALONE.tokens)}.`,
    act: 'Check your prediction.',
    closeUp: ['meter'],
    status: `The token meter’s needle sits past where the lead alone left it.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Helpers buy room and speed, and every helper adds to the token bill.',
    act: 'One question to finish.',
    status: `The complete report lies on Ines’s tray.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does each helper come with its own instructions?',
  },
];

export default function LeadAndHelpers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf(), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          helpers={focus === 'hire' || focus === 'run' ? HELPERS : undefined}
          canRun={focus === 'run'}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Read the meter"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="tokens-15x" />
              <Fact id="better-90" />
              <ToyNote>
                Here the bill grows {(THREE.tokens / ALONE.tokens).toFixed(1)}×, not {fact('tokens-15x').value}×.
              </ToyNote>
            </>
          ) : null,
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
