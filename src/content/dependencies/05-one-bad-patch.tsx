// Chapter 5: one bad patch. Day 11's build breaks with no code change: pricebook's bad patch flowed into every caret
// range that reaches it. The lockfile holds the build; a tested update on the same morning is rejected, so the
// lockfile stays put.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { brokenOf, install } from '../../lib/dependencies/resolve';
import { update } from '../../lib/dependencies/lock';
import { BAD, BAD_DAY, FIRST_LOCK } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, Toggle, type View } from './kit';

const MODULE = 'dependencies',
  ID = '05-one-bad-patch';
export const PARTS = TOWER_PARTS;
const at = (day: number, lock: boolean) => install({ day, ...(lock ? { lock: FIRST_LOCK } : {}) });
export const UPDATE = update(FIRST_LOCK, BAD_DAY);

export const P1 = {
  question: `Why did day ${BAD_DAY}’s build break?`,
  options: [
    `A new ${BAD.name} patch came in through the caret`,
    'Someone changed the code overnight',
    'The registry was down',
  ],
};
export const outcomeOf = () => (brokenOf(at(BAD_DAY, false)).has(BAD.name) ? 0 : 1);

export const QUIZ = {
  question:
    'A logging library ships a patch that crashes on start. Your app uses ^2.3.0 and a lockfile. What happens to tomorrow’s build?',
  options: [
    'It passes: installs follow the lockfile until an update takes the patch',
    'It crashes: the caret takes the patch at once',
    'It crashes, because a patch never breaks anything',
  ],
  correct: 0,
  explanation: 'The lockfile keeps the version it names; only an update brings the patch in.',
  why: [
    'Right: the lockfile keeps the old version, and a tested update would reject the bad one.',
    'The caret only applies when the ranges are resolved again; with a lockfile they are not.',
    'Patches promise not to break things, but a promise is not a test.',
  ],
};

interface S {
  day: number;
  p1: number | null;
  lock: boolean;
  tested: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'build',
    focus: 'build',
    visibleControls: ['build'],
    narration: `Day ${BAD_DAY - 1}’s build passed. Nobody touched Larkspur’s code overnight.`,
    act: `Run day ${BAD_DAY}’s build.`,
    say: { block: 'app', text: 'Your app' },
    predicate: s => s.day === BAD_DAY,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The build broke: the app’s crate is tomato and planked.',
    act: 'Predict why.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'lock',
    focus: 'lock',
    visibleControls: ['out1', 'lock'],
    narration: `${BAD.name} ${BAD.version} came out at dawn with a bug. Every caret range on ${BAD.name} took it, ${[...brokenOf(at(BAD_DAY, false))].filter(p => p && p !== BAD.name).join(', ')}’s too.`,
    act: 'Turn on the lockfile.',
    say: { block: 'broken', text: 'Bad patch' },
    predicate: s => s.lock,
  },
  {
    id: 'update',
    focus: 'update',
    visibleControls: ['lock', 'update'],
    narration: 'The lockfile holds the old version and the build passes. Updates still matter, so test them first.',
    act: 'Run a tested update.',
    say: { block: 'lock', text: 'Held' },
    predicate: s => s.tested,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['update', 'quiz'],
    narration: `The tests failed on ${BAD.version}, so the update was rejected and the lockfile stayed put.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does tomorrow’s install read its versions from?',
  },
];

export default function OneBadPatch() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ day: BAD_DAY - 1, p1: null, lock: false, tested: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = at(state.day, state.lock),
          broken = brokenOf(t).has('');
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              tower: towerOf(t, { lock: state.lock }),
              tree: t,
              caption: `Day ${state.day}’s build${state.lock ? ', from the lockfile' : ''}: ${broken ? 'broken' : 'passed'}.`,
              status: `Day ${state.day} build ${broken ? 'broke' : 'passed'}${state.lock ? ', installed from the lockfile' : ''}.`,
            }}
          />
        );
      }}
      controls={{
        build: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, day: BAD_DAY })}>
            {`Run day ${BAD_DAY}’s build`}
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        lock: ({ state, apply, sync, focused }) => (
          <Toggle
            label="Lockfile"
            checked={state.lock}
            onChange={lock => (focused ? apply : sync)({ ...state, lock })}
          />
        ),
        update: ({ state, apply }) =>
          state.tested ? (
            <p className="tc-status" data-update={UPDATE.rejected ? 'rejected' : 'taken'}>
              {UPDATE.rejected
                ? `Update rejected: the tests fail with ${BAD.name} ${UPDATE.candidate.nodes.find(n => n.name === BAD.name)!.version}. The lockfile stays.`
                : 'Update taken.'}
            </p>
          ) : (
            <button type="button" className="big" onClick={() => apply({ ...state, tested: true })}>
              Run a tested update
            </button>
          ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="immutable" />
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
