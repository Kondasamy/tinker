// Chapter 3: the hand-off (R6c.3). Three helpers get one-line briefs: desk 2 reads desk 1's catalogues again and the
// second slice never leaves the cart. The reader predicts why, switches to a detailed brief and runs again; the stage
// closes in on desk 2, now holding its own pile. The reveal cites Anthropic: without detailed task descriptions its
// helpers duplicated work and left gaps.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SWITCH_PARTS } from '../../components/scenes/switchboardScene';
import { jobOf, run } from '../../lib/multi-agent/sim';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, setupOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '03-the-hand-off';
const JOB = jobOf('report');
const VAGUE = run(JOB, { helpers: 3, brief: 'vague', check: false });

interface S extends Run {
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Why did desk 2 repeat desk 1’s work?',
  options: [
    'Its brief never said which catalogues were its share',
    'Helper 2 is a worse model than helper 1',
    'Three helpers are too many for one report',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A lead asks two helpers to “look into delivery delays”. Both study the same week. What fixes it?',
  options: [
    'Briefs that split the work, one week each, and say what to send back',
    'A third helper, so someone covers the other week',
    'Shorter briefs, so each helper decides for itself',
  ],
  correct: 0,
  explanation: 'A helper knows only its brief: name its share, its limits and what to return.',
  why: [
    'Right: a brief that names each helper’s share stops the overlap and the gap together.',
    'A third helper with the same vague brief would likely study the same week too.',
    'Less said means more guessing; that guessing is what made them overlap.',
  ],
};

export const PARTS = SWITCH_PARTS;
const fixed = (s: S) => s.ran && s.brief === 'detailed' && run(JOB, setupOf(s)).correct;

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: [],
    narration: 'The lead is rushed. Each helper’s brief says only: “Find screw prices.”',
    act: 'Tap the switchboard, or press Run.',
    say: { block: 'cart', text: 'The catalogues' },
    status: `Desk 2 read desk 1’s catalogues again, and ${VAGUE.left} stayed on the cart.`,
    predicate: s => s.ran,
    hint: 'Press Run under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Desk 2’s red pile matches desk 1’s, and the blue pile never left the cart.',
    act: 'Predict: why did desk 2 repeat?',
    status: `The report on Ines’s tray is missing ${VAGUE.left} suppliers.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'brief',
    focus: 'brief',
    visibleControls: ['predict'],
    narration: 'Pick locked. A detailed brief names each helper’s catalogues and what to send back.',
    act: 'Pick a detailed brief, then press Run.',
    status: 'Each desk read its own share; the cart is empty and the report complete.',
    predicate: fixed,
    hint: 'Under Brief, pick Detailed, then Run.',
    solution: s => ({ ...s, brief: 'detailed', ran: true }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Same helpers, same catalogues; only the brief changed.',
    act: 'Check your prediction.',
    closeUp: ['desk2'],
    status: 'Desk 2 holds its own blue pile now, beside desk 1’s red one.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A helper knows only its brief: say its share and what to send back.',
    act: 'One question to finish.',
    status: 'The complete report lies on Ines’s tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a helper know besides its brief?',
  },
];

export default function TheHandOff() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...runOf([1, 2, 3], { brief: 'vague' }), prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => (
        <RunStage
          s={state}
          apply={apply}
          sync={sync}
          job={JOB}
          briefs={focus === 'brief'}
          canRun={focus === 'run' || focus === 'brief'}
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
            label="Look at desk 2"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="vague-brief" />
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
