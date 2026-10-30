// Chapter 4: press a key. The reader drives the robot (KTD13: arrow keys while the pad has focus, or its buttons): the
// real floor steps through the simulator, and the dream steps through the model, fed the same action beside its own
// last two frames. Re-sync copies the real frame onto the screen.
import { useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DREAM_PARTS } from '../../components/scenes/dreamFloorScene';
import { type Drive, driven, NO_DRIVE } from '../../lib/video-models/drive';
import { confidence } from '../../lib/video-models/rollout';
import { Outcome } from '../tool-calling/kit';
import { DreamStage, DrivePad, Fact, ModelStatus, PIN, ROUTE, useNets } from './kit';

const MODULE = 'video-models',
  ID = '04-press-a-key';
export const PARTS = DREAM_PARTS;
export const SEED = PIN.seed;

export interface S {
  p1: number | null;
  drive: Drive;
  quiz: number | null;
}

export const P1 = {
  question: 'You press right. What does the model need to draw the robot one cell to the right?',
  options: [
    'The key, fed in beside the frames',
    'Nothing: it guesses the move from motion',
    'A rule for each key, written by hand',
  ],
};

export const QUIZ = {
  question: 'A world model of a driving game was trained without the steering input. What do its frames show?',
  options: [
    'A road that goes its own way, whatever you steer',
    'The car following the wheel, a frame late',
    'Nothing: it cannot draw without an input',
  ],
  correct: 0,
  explanation: 'Without the action as input, the model can only guess what usually happens next.',
  why: [
    'Right: it never saw the wheel, so your steering cannot reach its frames.',
    'A delay needs the input to arrive at all; this model never reads it.',
    'It still draws from its frames; it just ignores you.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Now you drive. The real floor runs the simulator; the screen shows the model’s dream of the same moves.',
    act: 'Predict first.',
    say: { block: 'robot', text: 'Your robot' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'drive',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'Your pick is locked. Each action goes in beside the last two frames; one frame comes out.',
    act: 'Make four moves with the arrow pad.',
    say: { block: 'dream', text: 'The dream' },
    predicate: s => s.drive.moves.length >= 4,
  },
  {
    id: 'resync',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'The key is an input, so the dream moves with you. Its slips are ringed on the screen.',
    act: 'Press Re-sync to copy the real frame.',
    predicate: s => s.drive.syncs.length > 0,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The real floor stays the referee: only it knows what really happened.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If the wheel never reached the model, how could its frames follow it?',
  },
];

function Stage({ s, onDrive, say }: { s: S; onDrive: (d: Drive) => void; say?: { block: string; text: string } }) {
  const { nets, status, retry } = useNets();
  const net = nets?.k2;
  const d = useMemo(() => (net ? driven(net, SEED, s.drive) : null), [net, s.drive]);
  const t = d?.at ?? 0,
    guessed = !!d && !d.dream.synced[t];
  const conf = useMemo(
    () => (net && d && guessed ? confidence(net, d.dream.frames.slice(t - 2, t), d.real.actions[t - 1]) : null),
    [net, d, t, guessed],
  );
  if (!net || !d)
    return (
      <DreamStage say={say} real={ROUTE.frames[1]} step={1} caption="The test floor, waiting for the model.">
        <ModelStatus status={status} retry={retry} />
      </DreamStage>
    );
  return (
    <DreamStage
      say={say}
      real={d.real.frames[t]}
      dream={d.dream.frames[t]}
      step={t}
      synced={t > 1 && !guessed}
      conf={conf}
      caption={`Step ${t}: ${s.drive.moves.length} move${s.drive.moves.length === 1 ? '' : 's'}, ${s.drive.syncs.length} re-sync${s.drive.syncs.length === 1 ? '' : 's'}.`}
    >
      <DrivePad net={net} seed={SEED} drive={s.drive} before={d} onDrive={onDrive} />
    </DreamStage>
  );
}

export default function PressAKey() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, drive: NO_DRIVE, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <Stage s={state} say={say} onDrive={drive => (focus === 'stage' ? apply : sync)({ ...state, drive })} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        fact: () => <Fact id="world-models" />,
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
