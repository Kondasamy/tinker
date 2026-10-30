// Chapter 1: see, decide, move. The reader drives the claw a press at a time (each press one turn of the loop),
// predicts how often a real robot runs it (RT-1, cited), then lands the part in the tray. Links Computer use, which
// runs the same loop on a screen.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import { fact } from '../../lib/robots/facts';
import { DEMOS } from '../../lib/robots/story';
import { MOVES, type Move } from '../../lib/robots/world';
import { Outcome } from '../tool-calling/kit';
import { BAY, type Bay, DriveBench, Fact, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '01-see-decide-move';
export const PARTS = CLAW_PARTS;
export const RT1 = Number(fact('rt1-loop').value),
  ALOHA = Number(fact('aloha-loop').value);

export interface S {
  bay: Bay;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'How often does Google’s RT-1 robot run its loop on its own?',
  options: [`About ${RT1} times a second`, 'Once a minute', 'Once per task'],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A box shifts while a warehouse arm reaches for it. When does the arm react?',
  options: [
    'On its next turn of the loop, a split second later',
    'Only after the whole pick is done',
    'Never: its plan was fixed at the start',
  ],
  correct: 0,
  explanation: 'A robot looks again on every turn of its loop, so a change shows up in its next decision.',
  why: [
    'Right: each turn starts with a fresh look, so the next move already reacts.',
    'The loop doesn’t wait for the task to end; it looks again before every move.',
    'There is no fixed plan here: every move is decided from the latest look.',
  ],
};

const moved = (b: Bay) => b.drive.filter(a => MOVES.includes(a as Move)).length;

export const STEPS: Step<S>[] = [
  {
    id: 'drive',
    focus: 'stage',
    visibleControls: [],
    narration:
      'The claw rides a gantry over a simulated bin. Each press is one turn of the control loop: see, decide, move.',
    act: 'Press → twice.',
    say: { block: 'claw', text: 'The claw' },
    predicate: s => moved(s.bay) >= 2 || s.bay.demos.length > 0,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'You ran the loop by hand, one press at a time. A real robot runs it on its own.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'finish',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `About ${RT1} times a second: a quick look, one small move, so errors stay small.`,
    act: 'Grip the part and drop it in the tray.',
    say: { block: 'tray', text: 'The tray' },
    predicate: s => s.bay.demos.length > 0,
    hint: 'Drive over the blue part, press Grip, then drive right to the green tray and press Drop.',
    solution: s => ({ ...s, bay: SOLVED }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'link', 'quiz'],
    narration: `Part in the tray. ALOHA’s arms run the same loop ${ALOHA} times a second.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When does the robot look at the world again?',
  },
];

// Mira's pinned demo on chapter 1's bin (Show me)
const SOLVED: Bay = { ...BAY, drive: DEMOS[0], demos: [DEMOS[0]] };

export default function SeeDecideMove() {
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
          caption="Simulated bay: a grid world, not a real robot. Arrow keys work while the pad has focus."
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <Fact id="rt1-loop" />
            <Fact id="aloha-loop" />
            <SimNote />
          </>
        ),
        link: () => (
          <p className="note">
            <a href="/computer-use/01-look-then-click/">
              Computer use runs the same loop on a screen: look, then click.
            </a>
          </p>
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
