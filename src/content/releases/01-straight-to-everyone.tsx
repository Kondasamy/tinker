// Chapter 1: straight to everyone. The new checkout goes to every customer at once; the reader steps into the release,
// predicts how soon the lever makes customers safe, pulls it, and watches the bug run on while the old version comes
// back.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ROLLBACK, SCENES, clock, plural, runOf, tickOf, type Event } from '../../lib/releases/sim';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CROWDSTRIKE_MINUTES } from '../../lib/releases/facts';
import { Fact, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '01-straight-to-everyone';
export const PARTS = SIGNAL_PARTS;
export const START = SCENES.all.start,
  LOOK = START + 2;
export const runFor = (events: Event[]) => runOf({ ...SCENES.all, events });

export const P1 = {
  question: 'You pull the rollback lever now. When do checkouts stop failing?',
  options: [
    'At once: the lever is instant',
    `In about ${ROLLBACK} minutes, once the old version is back`,
    'Only once someone writes a fix',
  ],
};
export const outcomeOf = (events: Event[] = [{ t: LOOK, kind: 'back' }]) => {
  const r = runFor(events);
  return r.safeAt !== null && r.safeAt - r.backAt! === ROLLBACK ? 1 : 0;
};

export const QUIZ = {
  question:
    'A food app ships a new menu screen to every user at 6 pm, and it crashes on some phones. What limits the harm?',
  options: [
    'How fast the team can put the old screen back',
    'How many tests the screen passed',
    'How many phones the team tested on',
  ],
  correct: 0,
  explanation: 'Once a change reaches everyone, the harm grows every minute until the way back lands.',
  why: [
    'Right: every user meets the crash until the old screen is back.',
    'Tests passed before the release; the crash got through them anyway.',
    'More test phones might have caught it earlier, but now it is out, only the way back helps.',
  ],
};

interface S {
  t: number;
  events: Event[];
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'ship',
    focus: 'stage',
    visibleControls: [],
    narration: `At ${clock(START)} the new checkout’s release goes to every customer at once.`,
    act: `Press Step or Play to ${clock(LOOK)}.`,
    say: { block: 'new', text: 'Everyone' },
    predicate: s => s.t >= LOOK,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Failed checkouts jump on the new track. The lever in the signal box starts a rollback.',
    act: 'Predict how soon customers are safe.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'lever',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Pull the rollback lever.',
    say: { block: 'box', text: 'The lever' },
    predicate: s => s.events.some(e => e.kind === 'back'),
    solution: s => ({ ...s, events: [...s.events, { t: s.t, kind: 'back' }] }),
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: `The old version goes back server by server: ${ROLLBACK} minutes, and the bug runs on meanwhile.`,
    act: 'Step until the new track is empty.',
    say: { block: 'new', text: 'Still failing' },
    predicate: s => {
      const r = runFor(s.events);
      return r.safeAt !== null && s.t >= r.safeAt;
    },
    hint: `A rollback takes ${ROLLBACK} minutes from the pull.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Everyone met the bug until the old version was back. Here that took ${ROLLBACK} minutes; CrowdStrike’s took ${CROWDSTRIKE_MINUTES} minutes.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What stops the harm once a change is out?',
  },
];

export default function StraightToEveryone() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, events: [], p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const r = runFor(state.events);
        return (
          <ReleasesStage
            run={r}
            t={state.t}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t, view: 'scene' })}
            // the lever waits for the prediction, so the pick comes before the pull
            {...(state.p1 !== null
              ? { onBack: () => apply({ ...state, events: [...state.events, { t: state.t, kind: 'back' }] }) }
              : {})}
            caption={`${clock(state.t)}. ${plural(tickOf(r, state.t).hurtSoFar, 'customer')} hurt so far.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.events)} />
            <Fact id="crowdstrike-window" />
            <Fact id="dora-recovery" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <SimNote />
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
