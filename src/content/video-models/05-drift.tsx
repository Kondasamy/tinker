// Chapter 5: drift. The pinned route run open loop: after the first two real frames, every frame is guessed from
// guesses (pinned.json's dream). The reader predicts when the robot goes, scrubs to it and on to the step the crate
// vanishes, then turns on a re-sync every few steps and the dream keeps the crate (live, pinned in the engine test).
import { useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { crateCells, dream, robotCell } from '../../lib/video-models/rollout';
import { ROBOT } from '../../lib/video-models/world';
import { Outcome } from '../tool-calling/kit';
import { DREAMED, DreamStage, Fact, ModelStatus, PIN, ROUTE, StepRange, ToyNote, useNets } from './kit';

const MODULE = 'video-models',
  ID = '05-drift';
export const PARTS = DREAM_PARTS;
/** The first frame the dream has no single robot. */
export const LOST = PIN.kept + 2;
const HALF = PIN.steps / 2,
  EVERY = PIN.resync.every;

export interface S {
  p1: number | null;
  at: number;
  every: number;
  quiz: number | null;
}

export const P1 = {
  question: `A ${PIN.steps}-step route with no real frames after the first two. When does the dream lose the robot?`,
  options: [`Within ${HALF} steps`, `After step ${HALF}`, 'Never: its one-step guesses were nearly all right'],
};
export const OUTCOME = LOST <= HALF ? 0 : 1;

export const QUIZ = {
  question:
    'A weather model forecasts a week ahead, each day from its own forecast of the day before. Why is day 7 worst?',
  options: [
    'Each day’s small errors feed into the next',
    'Weather turns random after day 3',
    'It was trained on fewer seventh days',
  ],
  correct: 0,
  explanation: 'Built on its own guesses, each step starts from the last step’s errors and adds its own.',
  why: [
    'Right: guesses built on guesses carry every earlier error forward.',
    'The physics stays the same each day; the forecast’s own errors are what pile up.',
    'Every day is trained the same way; day 7 just sits on six days of guesses.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The same route, but after frame 1 every frame is guessed from guessed frames. Watch for drift.',
    act: 'Predict first.',
    say: { block: 'dream', text: 'All guesses' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'scrub',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'Your pick is locked. The real floor plays on; the screen shows only the model’s dream.',
    act: 'Drag Step until the dream loses the robot.',
    predicate: s => s.at >= LOST,
  },
  {
    id: 'crate',
    focus: 'step',
    visibleControls: ['out1', 'fact', 'step'],
    narration: `At step ${LOST} one robot became ${PIN.robotsWhenLost}; by step ${PIN.steps}, ${PIN.robotsAtEnd}. The crate goes next.`,
    act: `Drag on to step ${PIN.crateGone}.`,
    say: { block: 'crate', text: 'Watch it' },
    predicate: s => s.at >= PIN.crateGone,
  },
  {
    id: 'resync',
    focus: 'resync',
    visibleControls: ['step', 'resync'],
    narration: `At step ${PIN.crateGone} the crate is gone from the dream, while the real one rides on.`,
    act: `Turn on a re-sync every ${EVERY} steps.`,
    predicate: s => s.every === EVERY,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['step', 'resync', 'quiz'],
    narration: `With a real frame every ${EVERY} steps, ${PIN.resync.right} of ${PIN.steps - 1} frames come out right, crate and robot both.`,
    act: 'One question to finish.',
    say: { block: 'crate', text: 'Still here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does day 2’s forecast start from?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const { nets, status, retry } = useNets();
  const live = useMemo(
    () => (s.every && nets ? dream(nets.k2, ROUTE, { every: s.every, key: 'pinned' }) : null),
    [s.every, nets],
  );
  const shown = s.every ? (live?.frames[s.at] ?? null) : DREAMED[s.at];
  const synced = !!live?.synced[s.at] && s.at > 1;
  const robots = shown ? [...shown].filter(k => k === ROBOT).length : 0;
  const words = !shown
    ? ''
    : robotCell(shown) >= 0
      ? `one robot${crateCells(shown).length ? ' and the crate' : ', no crate'}`
      : `${robots} robots${crateCells(shown).length ? ' and the crate' : ', no crate'}`;
  return (
    <DreamStage
      say={say}
      real={ROUTE.frames[s.at]}
      dream={shown}
      step={s.at}
      synced={synced}
      caption={shown ? `Step ${s.at}: the dream shows ${words}.` : `Step ${s.at}.`}
    >
      {s.every > 0 && <ModelStatus status={status} retry={retry} />}
    </DreamStage>
  );
}

export default function Drift() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, at: 2, every: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="gamengen-drift" />
            <ToyNote />
          </>
        ),
        step: ({ state, apply, sync, focused }) => (
          <StepRange
            value={state.at}
            first={2}
            last={PIN.steps}
            onChange={at => (focused ? apply : sync)({ ...state, at })}
          />
        ),
        resync: ({ state, apply, sync, focused }) => (
          <label className="vm-shade">
            <input
              type="checkbox"
              checked={state.every === EVERY}
              onChange={e => (focused ? apply : sync)({ ...state, every: e.currentTarget.checked ? EVERY : 0 })}
            />
            {`Re-sync every ${EVERY} steps`}
          </label>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <ToyNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
