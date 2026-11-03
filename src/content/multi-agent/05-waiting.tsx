// Chapter 5: waiting on each other (R6c.5). Two helpers split the euro price list, but desk 1 needs desk 2's rate
// sheet and desk 2 needs desk 1's supplier list: their lamps blink at each other on hold and no report comes. The
// reader predicts what ends it, turns the timeout on and runs: the timer sweeps, the lead pulls the hold cord and the
// list arrives late. The stage closes in on the timer and the lamps. The deadlock is the engine's findCycle over the
// hand-written waits; the reveal cites Coffman et al.'s circular wait and Anthropic on a blocked lead.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { jobOf, run, WAITS } from '../../lib/multi-agent/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '05-waiting';
const JOB = jobOf('rates');
const FREED = run(JOB, { helpers: 2, brief: 'detailed', check: false, timeout: true }),
  ALONE = run(JOB, { helpers: 0, brief: 'detailed', check: false });

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'What gets the euro price list finished?',
  options: [
    'A timeout: after a while the lead stops waiting and steps in',
    'Waiting longer: one of them will give in',
    'A third helper to watch the two',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'Two agents edit one file, and each waits for the other to save first. What do you add?',
  options: [
    'A timeout, so one gives way and the work goes on',
    'Another agent to tell them to hurry',
    'Nothing: they will sort it out',
  ],
  correct: 0,
  explanation: 'A circle of waits never ends by itself; a timeout breaks it.',
  why: [
    'Right: after the timeout something gives way, and the circle of waits is broken.',
    'A third agent can only wait too; it can’t give either of them what they wait for.',
    'Neither can move until the other does, so neither ever will.',
  ],
};

export const PARTS = SWITCH_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: `Desk 1 needs desk 2’s ${WAITS[0].for.replace(/^the /, '')}; desk 2 needs desk 1’s ${WAITS[1].for.replace(/^the /, '')}.`,
    act: 'Tap the switchboard, or press Run.',
    say: { block: 'lamps', text: 'Watch these' },
    status: 'Lamps 1 and 2 blink at each other on hold, and no report reached the tray.',
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Nothing moves. This is a deadlock: each helper waits for the other, forever.',
    act: 'Predict: what ends it?',
    status: 'Desks 1 and 2 hold a cord between their jacks, waiting.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'timeout',
    focus: 'timeout',
    visibleControls: ['predict'],
    narration: 'Pick locked. A timeout lets the lead stop waiting and fetch the rate sheet itself.',
    act: 'Turn the timeout on, then press Run.',
    status: `The timer rang, the lead pulled the hold cord, and the list arrived at ${FREED.minutes} minutes.`,
    predicate: s => s.ran && s.timeout,
    hint: 'Under Timeout, pick On, then Run.',
    solution: s => ({ ...s, timeout: true, ran: true }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Finished, but in ${FREED.minutes} minutes; the lead alone takes ${ALONE.minutes}. Parts that must talk are slow to split.`,
    act: 'Check your prediction.',
    closeUp: ['timer', 'lamps'],
    status: 'The timer’s face is full, and lamps 1 and 2 are steady again.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Helpers that wait on each other never finish: set a timeout, or keep talking work with one agent.',
    act: 'One question to finish.',
    status: 'The euro price list lies on Ines’s tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can either helper move first?',
  },
];

export default function Waiting() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf([1, 2]), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          timeouts={focus === 'timeout'}
          canRun={focus === 'run' || focus === 'timeout'}
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
            label="Look at the timer"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="circular-wait" />
              <Fact id="blocked-wait" />
              <Fact id="poor-fit" />
              <ToyNote />
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
