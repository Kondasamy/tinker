// Chapter 6: what never leaves. A flow over time, so a flat lane picture: the picker's app, the model on the
// handheld, and a cloud model. Three routes: on-device (two hops, both inside the handheld), the cloud (the question
// and its context cross the network), and a fallback (the handheld hands on only what it can't fit). Facts cited.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import FlatStage from '../../components/scenes/FlatStage';
import type { Lane, Msg } from '../../lib/iso/flat';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CONTEXTS, fits, sizeOf } from '../../lib/on-device/memory';
import { Outcome } from '../tool-calling/kit';
import { Fact } from './kit';

const MODULE = 'on-device',
  ID = '06-what-never-leaves';
/** a flat chart: no scene parts */
export const PARTS: readonly string[] = [];
const B3 = sizeOf('3b'),
  LONGEST = CONTEXTS.at(-1)!;

export type Route = 'device' | 'cloud' | 'fallback';
export const ROUTES: [Route, string][] = [
  ['device', 'On the handheld'],
  ['cloud', 'In the cloud'],
  ['fallback', 'Fall back when too long'],
];
export const LANES: Lane[] = [
  { id: 'app', name: 'Picker’s app' },
  { id: 'local', name: 'Model on the handheld' },
  { id: 'cloud', name: 'Cloud model' },
];
export const MSGS: Record<Route, Msg[]> = {
  device: [
    { from: 'app', to: 'local', kind: 'request', text: 'Question + stock list' },
    { from: 'local', to: 'app', kind: 'result', text: 'Reply' },
  ],
  cloud: [
    { from: 'app', to: 'cloud', kind: 'request', text: 'Question + stock list' },
    { from: 'cloud', to: 'app', kind: 'result', text: 'Reply' },
  ],
  fallback: [
    { from: 'app', to: 'local', kind: 'request', text: 'Long question' },
    { from: 'local', to: 'cloud', kind: 'error', text: 'Too long: handed on' },
    { from: 'cloud', to: 'local', kind: 'result', text: 'Reply' },
    { from: 'local', to: 'app', kind: 'result', text: 'Reply' },
  ],
};
/** the cloud lane is touched */
export const leaves = (r: Route) => MSGS[r].some(m => m.to === 'cloud');

export interface S {
  route: Route | null;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Send the question to a cloud model instead. What leaves the handheld?',
  options: ['The question and its context', 'Nothing: only the reply travels', 'Only the question’s length'],
};
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'A customer asks whether their order details leave the warehouse. The handhelds fall back to a cloud model for long questions. The honest answer?',
  options: [
    'Short questions stay on the handheld; long ones go to the cloud model',
    'Nothing ever leaves: the model is on the handheld',
    'Everything leaves: every AI model runs in the cloud',
  ],
  correct: 0,
  explanation: 'A fallback sends what the handheld can’t handle, so privacy holds only for what stays on it.',
  why: [
    'Right: on-device keeps short questions local, and the fallback sends the long ones out.',
    'With a fallback switched on, some questions do leave, so “never” would be untrue.',
    'The model on the handheld answers most questions with no network at all.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'device',
    focus: 'route',
    visibleControls: ['route'],
    narration: 'On-device, the question goes from the picker’s app to the model on the same handheld, and back.',
    act: 'Send it on the handheld.',
    predicate: s => s.route === 'device',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Two hops, both inside the handheld. No signal needed.',
    act: 'Predict the cloud route.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cloud',
    focus: 'route',
    visibleControls: ['route'],
    narration: 'Your pick is locked.',
    act: 'Send it to the cloud.',
    predicate: s => s.route === 'cloud',
  },
  {
    id: 'fallback',
    focus: 'route',
    visibleControls: ['out1', 'route'],
    narration: `Fall back only for what the handheld can’t do, like ${LONGEST.toLocaleString('en')} tokens of context on the ${B3.name}.`,
    act: 'Try the fallback route.',
    predicate: s => s.route === 'fallback',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['route', 'more', 'quiz'],
    narration: 'A fallback trades privacy for reach, so make it visible and keep the private work local.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which route touches the cloud lane?',
  },
];

function Routes({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <fieldset className="od-radios">
      <legend>Where it runs</legend>
      {ROUTES.map(([r, name]) => (
        <label key={r}>
          <input type="radio" name="od-route" checked={s.route === r} onChange={() => set({ ...s, route: r })} />
          {name}
        </label>
      ))}
    </fieldset>
  );
}

export default function WhatNeverLeaves() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ route: null, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <div className="tc-stage od-stage">
          <div className="tc-frame">
            <FlatStage lanes={LANES} msgs={state.route ? MSGS[state.route] : []} />
          </div>
          <p className="od-said" role="status" aria-live="polite">
            {state.route
              ? leaves(state.route)
                ? 'The question leaves the handheld.'
                : 'Nothing leaves the handheld.'
              : ''}
          </p>
          <p className="tc-caption">
            <span className="txt">
              {fits(B3, 4, LONGEST)
                ? 'Every question fits on the handheld.'
                : 'The long question doesn’t fit the handheld’s memory (chapter 3).'}
            </span>
          </p>
        </div>
      )}
      controls={{
        route: ({ state, apply, sync, focused }) => <Routes s={state} set={focused ? apply : sync} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => (
          <>
            <Fact id="pcc" />
            <Fact id="llama-quantized" />
            <p className="note in-note">
              Routing each question to the right model:{' '}
              <a href="/small-models/05-fall-back-when-unsure/">Small models, Fall back when unsure</a>.
            </p>
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
