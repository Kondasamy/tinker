// Chapter 4: show it. The reader drives demos (each on the next training bin); Hand over replays the nearest-neighbour
// policy over the reader's own demos on a fresh bin, stopping at the step cap. Then the pinned effect: Mira's 1, 2, 4
// and 8 demos over the 20 fresh bins (pinned.json, re-derived in the engine test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import pinned from '../../../data/robots/pinned.json' with { type: 'json' };
import { DEMOS, FRESH_BIN, PERSON } from '../../lib/robots/story';
import { HELD_OUT } from '../../lib/robots/world';
import { Outcome } from '../tool-calling/kit';
import { BAY, type Bay, DriveBench, Fact, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '04-show-it';
export const PARTS = CLAW_PARTS;
const N = HELD_OUT.length;
export const ONE = pinned.clean[0],
  FOUR = pinned.clean.find(c => c.demos === 4)!,
  EIGHT = pinned.clean.at(-1)!;

export interface S {
  bay: Bay;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `With 1 of ${PERSON}’s demos the policy clears ${ONE.solved} of ${N} fresh bins. With 4?`,
  options: [`More: ${FOUR.solved} of ${N}`, `The same: ${ONE.solved} of ${N}`, 'Fewer: more demos confuse it'],
};
export const OUTCOME = FOUR.solved > ONE.solved ? 0 : FOUR.solved === ONE.solved ? 1 : 2;

export const QUIZ = {
  question: 'A copied policy fails whenever a crate sits just left of the part. What is the cheapest fix?',
  options: ['Record demos with a crate there', 'Write a rule for that case', 'Run the policy faster'],
  correct: 0,
  explanation: 'A copying policy only knows the frames it was shown, so show it the missing ones.',
  why: [
    'Right: a demo with a crate there adds the frames the policy lacked.',
    'A rule for each case brings back chapter 3’s problem: someone must write them all.',
    'Speed changes nothing: it copies the same wrong move, faster.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'demo',
    focus: 'stage',
    visibleControls: [],
    narration: 'Drive it yourself. Every press records the frame and your move: a demonstration.',
    act: 'Drive the part into the tray.',
    say: { block: 'claw', text: 'You drive' },
    predicate: s => s.bay.demos.length > 0,
    hint: 'Over the blue part press Grip; at the green tray press Drop.',
    solution: s => ({ ...s, bay: { ...s.bay, drive: [], demos: [DEMOS[0]] } }),
  },
  {
    id: 'hand',
    focus: 'stage',
    visibleControls: [],
    narration:
      'The policy copies you. On a fresh bin, at each frame it finds its nearest neighbour among yours and repeats that move.',
    act: 'Press Hand over.',
    say: { block: 'machine', text: 'Policy' },
    predicate: s => s.bay.runs > 0,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'No training happened: it just looks up your frames. Whatever it did, it only knew the frames you showed it.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'note', 'quiz'],
    narration: `Each demo covers frames the others missed. ${EIGHT.demos} demos clear ${EIGHT.solved} of ${N}. Try more demos, if you like.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a copying policy know about a frame no demo showed?',
  },
];

export default function ShowIt() {
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
          fresh={FRESH_BIN}
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`Simulated bay. Your demos: ${state.bay.demos.length}. Hand over runs the policy on a fresh bin.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        note: () => (
          <>
            <Fact id="act-demos" />
            <p className="note">{`${PERSON}’s demos on ${N} simulated fresh bins: ${pinned.clean.map(c => `${c.demos} demo${c.demos > 1 ? 's' : ''}, ${c.solved}`).join('; ')}.`}</p>
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
