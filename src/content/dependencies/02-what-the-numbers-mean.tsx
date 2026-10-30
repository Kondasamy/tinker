// Chapter 2: what the numbers mean. The reader predicts what pricebook's caret range accepts, then forces the next
// major on the tower (both crates that ask for ^1 break) and then a new minor (nothing breaks). A tilde is named
// against the caret, and the checkpoint asks about the caret below 1.0.0.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { APP, install, versionsOf } from '../../lib/dependencies/resolve';
import { maxSatisfying, parse, satisfies } from '../../lib/dependencies/semver';
import { PRICE } from '../../lib/dependencies/story';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, Fact, RegistryNote, type Overrides, type View } from './kit';

const MODULE = 'dependencies',
  ID = '02-what-the-numbers-mean';
export const PARTS = TOWER_PARTS;
export const RANGE = APP.deps[PRICE];
const BASE = parse(RANGE.slice(1)),
  LINE = `${BASE.major}.${BASE.minor}`;
const ALL = versionsOf(PRICE);
/** the next major, and the newest minor the caret still takes */
export const MAJOR = ALL.find(v => parse(v).major > parse(RANGE.slice(1)).major)!;
export const MINOR = maxSatisfying(
  ALL.filter(v => parse(v).minor > parse(RANGE.slice(1)).minor),
  RANGE,
)!;

export const P1 = {
  question: `Which ${PRICE} versions does ${RANGE} accept?`,
  options: [
    `${RANGE.slice(1)} and any newer ${BASE.major}.x`,
    `Only newer ${LINE} patches`,
    `Anything newer, ${MAJOR} too`,
  ],
};
export const outcomeOf = () =>
  satisfies(MAJOR, RANGE)
    ? 2
    : ALL.some(v => satisfies(v, RANGE) && parse(v).minor > parse(RANGE.slice(1)).minor)
      ? 0
      : 1;

export const QUIZ = {
  question: 'shipcalc asks for geobits ^0.4.1. geobits 0.5.0 comes out. Does shipcalc get it?',
  options: [
    'No: below 1.0.0 the caret stays within 0.4',
    'Yes: a caret takes any newer minor',
    'Yes, unless it is a tilde',
  ],
  correct: 0,
  explanation: 'Below 1.0.0 anything may change, so a caret treats each minor as a major.',
  why: [
    'Right: ^0.4.1 means at least 0.4.1 and below 0.5.0, because 0.x versions promise nothing.',
    'That holds from 1.0.0 up; under 1.0.0 the caret treats a new minor as breaking.',
    'A tilde would also stay in 0.4; the caret here does too, so neither takes 0.5.0.',
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
    narration: `Under semver, every version has three numbers: major.minor.patch. A range says which the app accepts: ${PRICE} ${RANGE}.`,
    act: `Predict what ${RANGE} allows.`,
    say: { block: 'lit', text: PRICE },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'major',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: `Your pick is locked. Try ${PRICE}’s next major on the tower.`,
    act: `Set ${PRICE} to ${MAJOR}.`,
    predicate: s => s.overrides[PRICE] === MAJOR,
  },
  {
    id: 'minor',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `Both crates asking for ${BASE.major}.x broke. A caret range never takes a new major: majors may break old code.`,
    act: `Now set it to ${MINOR}.`,
    say: { block: 'broken', text: 'Out of range' },
    predicate: s => s.overrides[PRICE] === MINOR,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `${MINOR} is a minor: new features, nothing broken, so the caret takes it. A tilde, ~${RANGE.slice(1)}, takes ${LINE} patches only.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does semver promise below 1.0.0?',
  },
];

export default function WhatTheNumbersMean() {
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
            onView={view => sync({ ...state, view })}
            overrides={state.overrides}
            only={[PRICE]}
            onPull={overrides => (focus === 'stage' ? apply : sync)({ ...state, overrides, view: 'scene' })}
            show={{
              tower: towerOf(t, { lit: [PRICE] }),
              tree: t,
              caption: `The app asks for ${PRICE} ${RANGE}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="semver" />
            <Fact id="ranges" />
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
