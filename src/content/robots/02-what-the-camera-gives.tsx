// Chapter 2: what the camera gives. The Camera tab shows the frame turned into a grid and the state the policy reads
// from it (which way the target is, which neighbours are blocked); the reader drives beside a crate and sees it show
// as blocked. Links Multimodal, where a model reads pictures.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import { isCrate, play, type Cell } from '../../lib/robots/world';
import { Outcome } from '../tool-calling/kit';
import { BAY, type Bay, DriveBench, driveBin, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '02-what-the-camera-gives';
export const PARTS = CLAW_PARTS;

export interface S {
  bay: Bay;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'What does the policy read from the grid to pick its next move?',
  options: ['Which way the part is, and what blocks the claw', 'Every pixel of the frame', 'The bin’s number'],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A clear plastic tote sits in the bin, and the camera doesn’t pick it out. What does the policy do?',
  options: ['Drives as if that cell were empty', 'Slows down, sensing something odd', 'Stops and asks for help'],
  correct: 0,
  explanation: 'The policy knows only the state the camera gives; what the camera misses doesn’t exist for it.',
  why: [
    'Right: a cell the camera reads as empty is empty, as far as the policy knows.',
    'Nothing in the state says “odd”; the policy only sees what the grid holds.',
    'It has no way to know it should ask: the missing tote isn’t in its state.',
  ],
};

/** Whether the claw now stands beside a crate (not just a wall). */
export function besideCrate(b: Bay) {
  const bin = driveBin(b),
    [x, y] = play(bin, b.drive).at(-1)!.claw;
  const near: Cell[] = [
    [x, y - 1],
    [x, y + 1],
    [x - 1, y],
    [x + 1, y],
  ];
  return near.some(c => isCrate(bin, c));
}

export const STEPS: Step<S>[] = [
  {
    id: 'camera',
    focus: 'stage',
    visibleControls: [],
    narration:
      'The camera on the trolley takes a frame. Software turns it into a grid: crates, the part, the tray, the claw.',
    act: 'Open the Camera tab.',
    say: { block: 'camera', text: 'Camera' },
    predicate: s => s.view === 'camera',
    solution: s => ({ ...s, view: 'camera' }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The policy, the part that picks each move, doesn’t use the whole grid. It reads a few facts.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'crate',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'That is the state: which way the target is, and which of four neighbours are blocked.',
    act: 'Drive the claw next to a crate.',
    say: { block: 'crate', text: 'A crate' },
    predicate: s => besideCrate(s.bay),
    hint: 'Press → once: the crate below the claw shows as blocked.',
    solution: s => ({ ...s, bay: { ...BAY, drive: ['right'] } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['link', 'quiz'],
    narration: 'Blocked shows in the state. The camera gives only what it picks out; the policy knows nothing else.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the policy know about anything the grid leaves out?',
  },
];

export default function WhatTheCameraGives() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bay: BAY, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <DriveBench
          bay={state.bay}
          onBay={bay => sync({ ...state, bay })}
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption="Simulated bay. The Camera tab shows the grid and the state the policy reads."
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        link: () => (
          <>
            <p className="note">
              <a href="/multimodal/01-a-picture-is-tokens/">Multimodal shows how a model reads a picture as tokens.</a>
            </p>
            <SimNote />
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
