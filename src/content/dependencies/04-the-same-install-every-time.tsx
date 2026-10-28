// Chapter 4: the same install every time. Mira installed on day 2; the build server installs on day 10 and gets
// newer releases its ranges let in (lit). The lockfile (made on day 0) turns both installs into the same tree.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { diff, install } from '../../lib/dependencies/resolve';
import { FIRST_LOCK, MIRA_DAY, SERVER_DAY } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, Toggle, type View } from './kit';

const MODULE = 'dependencies',
  ID = '04-the-same-install-every-time';
export const PARTS = TOWER_PARTS;
const at = (day: number, lock: boolean) => install({ day, ...(lock ? { lock: FIRST_LOCK } : {}) });
export const changesOf = (lock: boolean) => diff(at(MIRA_DAY, lock), at(SERVER_DAY, lock));
export const DRIFT = changesOf(false);

export const P1 = {
  question: `Does day ${SERVER_DAY}’s install match Mira’s from day ${MIRA_DAY}?`,
  options: [
    'No: newer releases slip in through the ranges',
    'Yes: same app, same packages',
    'Only if someone changed the code',
  ],
};
export const outcomeOf = () => (DRIFT.length ? 0 : 1);

export const QUIZ = {
  question: 'A bug shows up on the build server but not on a developer’s laptop. Same commit. What do you check first?',
  options: [
    'Whether both installed from the same lockfile',
    'The developer’s screen size',
    'Nothing: the same commit always installs the same packages',
  ],
  correct: 0,
  explanation: 'Without a lockfile the same ranges can install different versions on different days.',
  why: [
    'Right: if either resolved the ranges afresh, the two may hold different versions.',
    'A build server has no screen; the difference is in what was installed.',
    'A commit holds the ranges, not the versions, unless it also holds the lockfile.',
  ],
};

interface S {
  p1: number | null;
  day: number;
  lock: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Mira did an install on day ${MIRA_DAY}. On day ${SERVER_DAY} the build server installs the same app, same ranges.`,
    act: 'Predict: the same packages?',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'install',
    focus: 'install',
    visibleControls: ['p1', 'install'],
    narration: 'Your pick is locked.',
    act: `Install on day ${SERVER_DAY}.`,
    predicate: s => s.day === SERVER_DAY,
  },
  {
    id: 'lock',
    focus: 'lock',
    visibleControls: ['out1', 'lock'],
    narration: `${DRIFT.length} packages changed on their own: each range let a newer release in.`,
    act: 'Turn on the lockfile.',
    say: { block: 'lit', text: 'Changed' },
    predicate: s => s.lock,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['lock', 'quiz'],
    narration: `The lockfile names the exact version at every place. Now day ${SERVER_DAY} installs exactly what day ${MIRA_DAY} did.`,
    act: 'One question to finish.',
    say: { block: 'lock', text: 'Lockfile' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What can differ between two installs of the same commit?',
  },
];

export default function TheSameInstallEveryTime() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, day: MIRA_DAY, lock: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = at(state.day, state.lock);
        const lit = diff(at(MIRA_DAY, state.lock), t).map(c => c.path);
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              tower: towerOf(t, { lit, lock: state.lock }),
              tree: t,
              caption: `Day ${state.day}${state.lock ? ', from the lockfile' : ''}: ${lit.length} changed since day ${MIRA_DAY}.`,
              status: `Day ${state.day} install${state.lock ? ' from the lockfile' : ''}: ${lit.length} packages differ from day ${MIRA_DAY}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        install: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, day: SERVER_DAY })}>
            {`Install on day ${SERVER_DAY}`}
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        lock: ({ state, apply, sync, focused }) => (
          <Toggle
            label="Lockfile"
            checked={state.lock}
            onChange={lock => (focused ? apply : sync)({ ...state, lock })}
          />
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="lockfile" />
            <RegistryNote />
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
