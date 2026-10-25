// Chapter 2: the wrong button. Screenshots now go out 1024 px wide while the screen stays 1280. The reader predicts where
// the agent's click lands when the host forgets to scale it back, carries it out (Sign out, on both the picture and the
// Screen view), then turns scaling back on and the re-order goes through. The scaling is live geometry (loop.ts toReal).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { SCREEN, shotOf } from '../../lib/computer-use/screens';
import { PUPPET_PARTS } from '../../components/scenes/puppetScene';
import {
  beatsOf,
  ClickOutcome,
  clicksOf,
  CuStage,
  Fact,
  play,
  PickNote,
  RecordedNote,
  RunAll,
  StepThrough,
  type CuView,
} from './kit';

const MODULE = 'computer-use',
  ID = '02-the-wrong-button';
export const PARTS = PUPPET_PARTS;
export const SIZE = 1024;
const K = shotOf(SIZE).scale;
export const runOf = (scale: boolean) => play({ case: 'hinges', size: SIZE, scale });
const RAW = runOf(false),
  [FIRST] = clicksOf(RAW),
  AIMED = clicksOf(runOf(true))[0];

export interface S {
  at: number;
  pick: string | null;
  tab: CuView;
  scale: boolean;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A host sends 960-pixel screenshots of a 1920-pixel screen. The agent asks for a click at (400, 300). Where should the host click?',
  options: ['(800, 600)', '(400, 300)', '(200, 150)'],
  correct: 0,
  explanation: 'The screenshot is half size, so its points are doubled to reach the real screen.',
  why: [
    'Right: every screenshot pixel stands for two real ones, so the host doubles the point.',
    'That is the bug in this chapter: the point is in screenshot pixels, not the screen’s.',
    'That scales the wrong way: the real screen is bigger, so the point grows.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: `The agent now gets ${SIZE}-pixel screenshots of a ${SCREEN.w}-pixel screen. This host clicks the agent’s point unchanged.`,
    act: 'Click where the click lands.',
    say: { block: 'screen', text: `${SIZE} px wide` },
    predicate: s => s.pick !== null,
  },
  {
    id: 'click',
    focus: 'step',
    visibleControls: ['step'],
    narration: `The agent aims in the screenshot’s coordinates: x ${FIRST.at[0]}, y ${FIRST.at[1]}.`,
    act: 'Carry out the click.',
    say: { block: 'hand', text: 'Same numbers' },
    predicate: s => s.at >= 2,
  },
  {
    id: 'fix',
    focus: 'scale',
    visibleControls: ['reveal', 'scale', 'run'],
    narration: `Right aim, wrong screen: Larkspur got signed out. Scaling back divides by ${K}: x ${AIMED.at[0]} becomes ${AIMED.real[0]}.`,
    act: 'Turn on scaling back, then run it.',
    say: { block: 'hand', text: 'Scaled back' },
    predicate: s => s.scale && s.at >= beatsOf(runOf(true)).length,
    hint: 'Tick the box, then run the re-order to the end.',
    solution: s => ({ ...s, scale: true, at: beatsOf(runOf(true)).length, tab: 'scene' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: 'The agent’s aim was right both times. Only the host’s arithmetic changed where the click landed.',
    act: 'One question to finish.',
    say: { block: 'screen', text: 'Order placed' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which coordinates does the agent answer in?',
  },
];

export default function TheWrongButton() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: 1, pick: null, tab: 'screen', scale: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, focus }) => (
        <CuStage
          run={runOf(state.scale)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          predict={
            focus === 'pick' || (state.pick !== null && state.at === 1)
              ? { pick: state.pick, onPick: pick => apply({ ...state, pick }) }
              : undefined
          }
          stamp={state.at >= 2 && !state.scale ? 'STOPPED' : undefined}
        />
      )}
      controls={{
        pick: ({ state, sync }) => (
          <PickNote v={FIRST.view} pick={state.pick} onScreen={() => sync({ ...state, tab: 'screen' })} />
        ),
        step: ({ state, sync }) => <StepThrough r={RAW} at={state.at} onStep={at => sync({ ...state, at })} />,
        reveal: ({ state }) => <ClickOutcome v={FIRST.view} pick={state.pick} el={FIRST.el?.id} />,
        scale: ({ state, sync }) => (
          <label className="cu-check">
            <input
              type="checkbox"
              checked={state.scale}
              onChange={e => sync({ ...state, scale: e.currentTarget.checked, at: 0 })}
            />{' '}
            Scale the click back to the real screen
          </label>
        ),
        run: ({ state, apply }) =>
          state.scale ? (
            <RunAll
              r={runOf(true)}
              at={state.at}
              onStep={at => apply({ ...state, at, tab: 'scene' })}
              label="Run the re-order"
            />
          ) : null,
        facts: () => (
          <>
            <Fact id="coordinates" />
            <Fact id="resolution" />
            <RecordedNote />
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
