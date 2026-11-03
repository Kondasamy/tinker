// Chapter 6: trusting a helper (R6c.6). Desk 2 misreads catalogue 17 (its decimal point lost) and its reply seats with
// a confident wrong price, which the report prints. The reader predicts what would have caught it, turns checks on
// and runs: the check sets the tomato capsule aside on the board's base and the report carries the catalogue's price.
// The stage closes in on the ports. The reveal cites the MAST failure study's verification failures.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { CATALOGUES, jobOf, misread, money, run } from '../../lib/multi-agent/sim';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '06-trusting-a-helper';
const JOB = jobOf('report');
const SC = { slip: true };
const REAL = money(CATALOGUES[JOB.slip - 1].price),
  READ = money(misread(JOB.slip));
const d = (check: boolean) => run(JOB, { helpers: 3, brief: 'detailed', check }, SC);
const OFF = d(false),
  ON = d(true);

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `What would have stopped ${READ} reaching the report?`,
  options: [
    'A check of each reply against its catalogue before merging',
    'Nothing: desk 2 sounded sure, so trust it',
    'Asking desk 2 whether it is sure',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A helper reports a refund total with full confidence. When should the lead check it?',
  options: [
    'Every time, against the source, before merging',
    'Only when the helper sounds unsure',
    'Never: the helper runs on the same model as the lead',
  ],
  correct: 0,
  explanation: 'Confidence is not evidence: check every reply against its source before it joins the result.',
  why: [
    'Right: a check against the source catches the slips a helper can’t see in itself.',
    'This helper sounded sure and was wrong; how a reply sounds says nothing about the number.',
    'The same model makes the same kinds of slip, so its replies need checking all the same.',
  ],
};

export const PARTS = SWITCH_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: 'Three helpers, detailed briefs, agreed shapes. The lead merges whatever seats.',
    act: 'Tap the switchboard, or press Run.',
    say: { block: 'report', text: 'Ines’s report' },
    status: `Desk 2’s reply seated with ${READ}, and the report printed it.`,
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `Catalogue ${JOB.slip} says ${REAL}; desk 2 read ${READ}, sure of itself. The lead merged it.`,
    act: 'Predict: what would have caught it?',
    status: `The red capsule sits in port 2, and the report shows ${READ}.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'check',
    focus: 'check',
    visibleControls: ['predict'],
    narration: 'Pick locked. A check re-reads each reply against its catalogue before merging.',
    act: 'Turn checks on, then press Run.',
    status: `The check set desk 2’s ${READ} aside; the report has the catalogue’s ${REAL}.`,
    predicate: s => s.ran && s.check,
    hint: 'Under Check replies, pick On, then Run.',
    solution: s => ({ ...s, check: true, ran: true }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `Caught, for ${(ON.minutes ?? 0) - (OFF.minutes ?? 0)} more minutes and ${num(ON.tokens - OFF.tokens)} more tokens: the price of a right report.`,
    act: 'Check your prediction.',
    closeUp: ['port'],
    status: 'The red capsule lies set aside in the dish on the board’s base, a red price tag beside it.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A helper can be sure and wrong. Check every reply against its source before merging.',
    act: 'One question to finish.',
    status: 'The right report lies on Ines’s tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does sounding sure make a number right?',
  },
];

export default function TrustingAHelper() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf([1, 2, 3]), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          sc={SC}
          checks={focus === 'check'}
          canRun={focus === 'run' || focus === 'check'}
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
            label="Look at port 2"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="mast-verify" />
              <Fact id="mast-modes" />
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
