// Chapter 3: packages need packages. cartwheel needs tidystr 1 while the app needs tidystr 2; the reader predicts how
// many copies stand, opens the tree, then pulls the nested copy and sees only cartwheel and the app break. The reveal
// cites npm's own layout rule, which the resolver follows.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { APP, REGISTRY, dependantsOf, install, nodeAt } from '../../lib/dependencies/resolve';
import { FIRST, TWICE } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, pulledOf, type Overrides, type View } from './kit';

const MODULE = 'dependencies',
  ID = '03-packages-need-packages';
export const PARTS = TOWER_PARTS;
/** the nested copy, and the package it sits in */
export const NESTED = FIRST.nodes.find(n => n.name === TWICE && n.path.includes('/'))!;
export const OWNER = NESTED.by[0];
const ownerRange = REGISTRY[OWNER].versions[nodeAt(FIRST, OWNER)!.version].deps![TWICE];
export const FALLS = [...dependantsOf(FIRST, [NESTED.path])].map(p => p || APP.name).sort();

export const P1 = {
  question: `How many ${TWICE} crates stand in the tower?`,
  options: [`Two: a nested copy inside ${OWNER}`, 'One: the newest, shared by both', 'None: the install fails'],
};
export const outcomeOf = () => (FIRST.nodes.filter(n => n.name === TWICE).length === 2 ? 0 : 1);

export const QUIZ = {
  question:
    'A website’s chart widget needs a date library at major 2; the site itself needs major 3. What does an npm-style install do?',
  options: [
    'Installs both: major 3 at the top, major 2 nested inside the widget',
    'Installs major 3 for both, since newer is better',
    'Stops: one app can hold only one copy of a package',
  ],
  correct: 0,
  explanation: 'Each part gets the major it asked for; the odd one out is nested where only its owner sees it.',
  why: [
    'Right: the widget’s copy sits inside it, so each part finds the version it asked for.',
    'Major 3 may break the widget, which only promised to work with major 2.',
    'Nested copies exist for exactly this; the cost is a bigger install, not a failure.',
  ],
};

interface S {
  p1: number | null;
  overrides: Overrides;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${OWNER} needs ${TWICE} ${ownerRange}, a transitive dependency of the app. The app itself needs ${TWICE} ${APP.deps[TWICE]}.`,
    act: `Predict how many ${TWICE} crates stand.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tree',
    focus: 'tab',
    visibleControls: ['p1', 'tab'],
    narration: 'Your pick is locked.',
    act: 'Open the Tree tab.',
    predicate: s => s.view === 'tree',
  },
  {
    id: 'pull',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `Two: ${TWICE} ${FIRST.nodes.find(n => n.path === TWICE)!.version} at the top for the app, and a nested copy, ${NESTED.version}, inside ${OWNER}.`,
    act: `Pull the nested ${TWICE}.`,
    say: { block: 'nested', text: 'Nested copy' },
    predicate: s => s.overrides[NESTED.path] === null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Only ${FALLS.join(' and ')} broke: nothing else stands on that copy.`,
    act: 'One question to finish.',
    say: { block: 'pulled', text: 'Pulled' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Each part should find the major it asked for.',
  },
];

export default function PackagesNeedPackages() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, overrides: {}, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const t = install({ day: 0, overrides: state.overrides });
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => (focus === 'tab' ? apply : sync)({ ...state, view })}
            overrides={state.overrides}
            only={[NESTED.path, TWICE]}
            onPull={overrides => (focus === 'stage' ? apply : sync)({ ...state, overrides, view: 'scene' })}
            show={{
              tower: towerOf(t, { lit: [NESTED.path], pulled: pulledOf(FIRST, state.overrides) }),
              tree: t,
              caption: `${OWNER} stands on its own copy of ${TWICE}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'tree' })}>
            Open the Tree tab
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="nested" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
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
