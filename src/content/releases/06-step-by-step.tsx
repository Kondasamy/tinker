// Chapter 6: step by step. The new checkout goes out in stages with a check at the end of each; the reader predicts
// where it stops, plays the run until the check rolls it back by itself, compares the hurt with chapter 1's, and
// opens the Errors chart.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, clock, pct, plural, runOf, tickOf } from '../../lib/releases/sim';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '06-step-by-step';
export const PARTS = SIGNAL_PARTS;
export const PLAN = SCENES.staged;
export const RUN = runOf(PLAN),
  ALL = runOf(SCENES.all);
/** the stage the check stopped at: the last stage reached before the alarm */
export const HALTED = RUN.milestones.filter(m => m.kind === 'stage' && m.t <= (RUN.alarmAt ?? Infinity)).at(-1)!.share!;
const UNDER = PLAN.stages.filter(s => s < 1);

export const P1 = {
  question: 'The new checkout still has its bug. Where does the staged rollout stop?',
  options: [...UNDER.map(s => `At ${pct(s)}`), 'It reaches everyone'],
};
export const outcomeOf = () => (RUN.alarmAt === null ? UNDER.length : UNDER.indexOf(HALTED));

export const QUIZ = {
  question: 'A staged rollout’s check rings at its 5% stage, and it rolls back. Who met the bad version?',
  options: [
    'About one in twenty users, for one stage and the rollback',
    'Everyone, since it was released',
    'Nobody: the check runs before anyone uses it',
  ],
  correct: 0,
  explanation: 'Only the stage’s share meets a bad change, and only until the way back lands.',
  why: [
    'Right: the other 95% stayed on the old version throughout.',
    'A staged rollout never reached everyone; it stopped at the first stage.',
    'The check needs the stage’s own checkouts to judge, so some users meet it first.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A staged rollout: ${PLAN.stages.map(pct).join(', ')} of checkouts, ${PLAN.bake} minutes each, checked before each step up.`,
    act: 'Predict where the new checkout stops.',
    say: { block: 'new', text: 'In stages' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'play',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Press Play, or Step, until the new track is empty.',
    say: { block: 'box', text: 'The check' },
    predicate: s => s.p1 !== null && RUN.safeAt !== null && s.t >= RUN.safeAt,
  },
  {
    id: 'chart',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `An automatic rollback at ${pct(HALTED)}: ${plural(RUN.hurt, 'customer')} hurt, against ${ALL.hurt} sent straight to everyone.`,
    act: 'Open the Errors tab.',
    predicate: s => s.view === 'errors',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Each stage is a small bet. The check stops the rollout before the next, bigger one.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What share were the users at the stage it stopped?',
  },
];

export default function StepByStep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <ReleasesStage
          run={RUN}
          t={state.t}
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          {...(state.p1 !== null ? { onTick: (t: number) => sync({ ...state, t }) } : {})}
          caption={`${clock(state.t)}. ${pct(tickOf(RUN, state.t).share)} on the new checkout; ${tickOf(RUN, state.t).hurtSoFar} hurt.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="canary-rollback" />
            <Fact id="crowdstrike-staged" />
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
