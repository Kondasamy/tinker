// Chapter 6: many runs (R6g.6). Piece 4 picks a part with a weighted dice roll, so replays can differ. One replay with
// fresh dice and piece 7 swapped lands right, by luck; the reader predicts, rolls 20 seeded replays and the trays fill:
// about as many right as with nothing changed. The stage closes in on the trays. Then piece 3 swapped, 20 seeded
// replays: every marble lands right. The reveal cites τ-bench's pass^k and Who&When's reasoning-model result.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { MARBLE_PARTS } from '../../components/scenes/marbleScene';
import { fact } from '../../lib/causal-evals/facts';
import { BLADE, causeOf, REPEATS, replay, SEEDS, tally, type Change } from '../../lib/causal-evals/runs';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, logMany, logOf, MarbleStage, marbleOf, StepsList } from './kit';

const MODULE = 'causal-evals',
  ID = '06-many-runs';
const RUN = BLADE;
const NOTE = RUN.steps.findIndex(s => s.id === 'note'),
  PICK = RUN.steps.findIndex(s => s.id === 'pick'),
  CAUSE = causeOf(RUN);
const SW7: Change = { kind: 'swap', step: NOTE },
  SW3: Change = { kind: 'swap', step: CAUSE };
/** the first fresh dice on which the note swap lands right: one lucky replay */
export const LUCKY = SEEDS.find(sd => replay(RUN, SW7, sd).outcome === 'right')!;
/** 20 replays each: nothing changed, the note swapped, the search swapped (pinned in the unit test) */
export const TALLY = { none: tally(RUN, null), note: tally(RUN, SW7), search: tally(RUN, SW3) };

interface S {
  /** 0: nothing rolled; 1: one lucky replay; 2: 20 with the note swapped; 3: 20 with the search swapped */
  phase: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Roll ${REPEATS} replays with piece ${NOTE + 1} swapped, fresh dice each. How many land right?`,
  options: ['About as many as with nothing changed', `All ${REPEATS}`, 'None of them'],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'You change a support bot’s greeting and rerun one failed chat. This time it answers correctly. What should you do next?',
  options: [
    'Rerun many times, with and without the change, and compare',
    'Ship the new greeting: it fixed the chat',
    'Undo it: one run proves nothing either way',
  ],
  correct: 0,
  explanation: fact('pass-k').claim,
  why: [
    'Right: the bot rolls dice, so only many runs on each side tell a fix from luck.',
    'One success can be luck when the bot doesn’t answer the same way every time.',
    'One run is weak evidence, but more runs settle it; giving up throws the question away.',
  ],
};

export const PARTS = MARBLE_PARTS;

export function sceneOf(s: S) {
  if (s.phase === 1) return marbleOf(RUN, SW7, 1, { seed: LUCKY });
  if (s.phase === 2) return marbleOf(RUN, SW7, 2, { seeds: SEEDS });
  if (s.phase === 3) return marbleOf(RUN, SW3, 3, { seeds: SEEDS });
  return marbleOf(RUN, SW7, 0);
}
const logOfState = (s: S) => [
  ...(s.phase >= 1 ? [logOf(RUN, SW7, LUCKY)] : []),
  ...(s.phase >= 2 ? [logMany(RUN, null, SEEDS), logMany(RUN, SW7, SEEDS)] : []),
  ...(s.phase >= 3 ? [logMany(RUN, SW3, SEEDS)] : []),
];

export const STEPS: Step<S>[] = [
  {
    id: 'once',
    focus: 'roll',
    visibleControls: ['steps'],
    narration: `Piece ${PICK + 1} picks by a dice roll, so replays can differ. Piece ${NOTE + 1} is swapped.`,
    act: 'Tap the start cup, or press Roll once.',
    say: { block: `p${PICK + 1}`, text: 'Dice roll' },
    status: `Piece ${NOTE + 1} is blush, and this one marble landed in the right tray.`,
    predicate: s => s.phase >= 1,
    hint: 'Press Roll once under the picture.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['steps', 'predict'],
    narration: `One replay says swapping piece ${NOTE + 1} sent the right blade.`,
    act: `Predict how many of ${REPEATS} replays land right.`,
    status: `One marble sits in the right tray beside blush piece ${NOTE + 1}.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'twenty',
    focus: 'roll',
    visibleControls: ['steps', 'predict'],
    narration: `Pick locked. Each seeded replay starts its dice from a different number, so anyone can repeat all ${REPEATS}.`,
    act: `Press Roll ${REPEATS}.`,
    status: `${TALLY.note.right} marbles in the right tray, ${TALLY.note.wrong} in the wrong, piece ${NOTE + 1} still blush.`,
    predicate: s => s.phase >= 2,
    hint: `Press Roll ${REPEATS} under the picture.`,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: `${TALLY.note.right} of ${REPEATS}, as with nothing changed (${TALLY.none.right}). That first right landing was luck.`,
    act: 'Check your prediction.',
    closeUp: ['right', 'wrong'],
    status: `Close in on the trays: ${TALLY.note.right} right, ${TALLY.note.wrong} wrong.`,
    predicate: s => s.revealed,
  },
  {
    id: 'search',
    focus: 'roll',
    visibleControls: ['fact'],
    narration: `Now swap piece ${CAUSE + 1} instead, and roll ${REPEATS} seeded replays again.`,
    act: `Press Swap ${CAUSE + 1}, roll ${REPEATS}.`,
    status: `Piece ${CAUSE + 1} is blush and all ${TALLY.search.right} marbles landed in the right tray.`,
    predicate: s => s.phase >= 3,
    hint: 'Press the button under the picture.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'When a run rolls dice, a cause has to win across many replays, not one.',
    act: 'One question to finish.',
    status: `All ${TALLY.search.right} marbles rest in the right tray.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Could the correct answer have come without the change?',
  },
];

const ROLL = ['Roll once', `Roll ${REPEATS}`, `Swap ${CAUSE + 1}, roll ${REPEATS}`];

export default function ManyRuns() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ phase: 0, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <MarbleStage
          run={RUN}
          scene={sceneOf(state)}
          log={logOfState(state)}
          twin={{
            buttons: [],
            roll: {
              label: ROLL[Math.min(state.phase, 2)],
              act: () => {
                if (state.phase === 1 && state.prediction === null) return 'Predict how many land right first.';
                if (state.phase === 2 && !state.revealed) return 'Check your prediction first.';
                if (state.phase >= 3) return `All ${REPEATS} replays are in the trays.`;
                apply({ ...state, phase: state.phase + 1 });
                return undefined;
              },
            },
          }}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        steps: ({ state }) => <StepsList run={RUN} change={state.phase === 3 ? SW3 : SW7} />,
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Compare with no change"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="pass-k" />
              {state.phase >= 3 && <Fact id="reasoning-models" />}
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
