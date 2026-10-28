// Chapter 1: code you did not write. The tower holds only the app's crate; the reader predicts how many packages an
// install brings, installs, then pulls any crate out and watches everything standing on it break. The left-pad
// incident is cited as a dated fact, never re-enacted.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { install } from '../../lib/dependencies/resolve';
import { DIRECT, FIRST } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, pulledOf, type Overrides, type View } from './kit';

const MODULE = 'dependencies',
  ID = '01-code-you-did-not-write';
export const PARTS = TOWER_PARTS;
const NONE = install({ day: 0, deps: {} });
export const INSTALLED = FIRST.nodes.length;

export const P1 = {
  question: `The app lists ${DIRECT.length} packages. How many arrive when you install it?`,
  options: [`Exactly ${DIRECT.length}`, `${INSTALLED}: those, and what they need`, 'Hundreds'],
};
export const outcomeOf = () => (INSTALLED === DIRECT.length ? 0 : 1);

export const QUIZ = {
  question:
    'A team’s build fails one morning. Their code is unchanged, but a tiny package deep in their tree was deleted. Why?',
  options: [
    'What needs that package can no longer install, and so on up',
    'Their own code must have a new bug',
    'A deleted package can’t matter if they never named it',
  ],
  correct: 0,
  explanation: 'Every package standing on the missing one fails, all the way up to the app.',
  why: [
    'Right: the package that needed it fails, then whatever needed that one, up to the app.',
    'Nothing in their code changed; the break came from a package they never wrote.',
    'Packages you never named still arrive through the ones you did, and you need them all.',
  ],
};

interface S {
  installed: boolean;
  p1: number | null;
  overrides: Overrides;
  view: View;
  quiz: number | null;
}
const pulled = (s: S) => Object.values(s.overrides).some(v => v === null);

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Larkspur’s shop app lists ${DIRECT.length} packages it did not write. Each is a dependency.`,
    act: 'Predict what installing brings.',
    say: { block: 'app', text: 'Your app' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'install',
    focus: 'install',
    visibleControls: ['p1', 'install'],
    narration: 'Your pick is locked.',
    act: 'Press Install.',
    predicate: s => s.installed,
  },
  {
    id: 'pull',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `${INSTALLED} packages arrived: the ${DIRECT.length} the app named, and the packages they need in turn.`,
    act: 'Pick a crate below the tower and pull it.',
    predicate: pulled,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Everything standing on it broke, and nobody at Larkspur changed a line of code.',
    act: 'One question to finish.',
    say: { block: 'broken', text: 'Broken' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to a package whose own dependency is gone?',
  },
];

export default function CodeYouDidNotWrite() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ installed: false, p1: null, overrides: {}, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const t = state.installed ? install({ day: 0, overrides: state.overrides }) : NONE;
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            overrides={state.overrides}
            onPull={
              state.installed
                ? overrides => (focus === 'stage' ? apply : sync)({ ...state, overrides, view: 'scene' })
                : undefined
            }
            show={{
              tower: towerOf(t, { pulled: pulledOf(FIRST, state.overrides) }),
              tree: t,
              caption: state.installed ? 'Installed: each crate stands on what it needs.' : 'Not installed yet.',
              status: state.installed ? `Installed ${t.nodes.length} packages.` : '',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        install: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, installed: true })}>
            Install
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="left-pad" />
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
