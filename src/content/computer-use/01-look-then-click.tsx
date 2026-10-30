// Chapter 1: look, then click. The host has taken the first screenshot of Brightwater's portal; the reader clicks the
// screenshot to predict the agent's first click (KTD15: focusable targets over the Screen view), then steps the run one
// beat at a time, a look and the click it leads to, until the order is placed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
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
  ID = '01-look-then-click';
export const PARTS = PUPPET_PARTS;
export const RUN = play({ case: 'hinges' });
const TOTAL = beatsOf(RUN).length,
  CLICKS = clicksOf(RUN),
  LOOKS = RUN.looks;

export interface S {
  at: number;
  pick: string | null;
  tab: CuView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'An agent clicks Submit on a web form. What does it know about what happened next?',
  options: [
    'Nothing, until the host sends it a new screenshot',
    'It watches the page change as it clicks',
    'The website reports the result to the model directly',
  ],
  correct: 0,
  explanation: 'The model only sees screenshots, so it learns what a click did from the next one.',
  why: [
    'Right: between screenshots the agent is blind, so every step of the loop starts with a fresh look.',
    'The model never watches the screen; it gets still pictures, one after each action.',
    'A portal made for people has no channel to the model: only the host’s screenshots reach it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: 'The host took a screenshot of Brightwater’s portal and sent it to the agent: re-order the hinges.',
    act: 'Click where the agent will click.',
    say: { block: 'screen', text: 'One screenshot' },
    predicate: s => s.pick !== null,
  },
  {
    id: 'click',
    focus: 'step',
    visibleControls: ['step'],
    narration:
      'The agent answers with a point, x and y in the screenshot’s pixels. The host moves the mouse there and clicks.',
    act: 'Carry out the click.',
    say: { block: 'hand', text: 'The host clicks' },
    predicate: s => s.at >= 2,
  },
  {
    id: 'loop',
    focus: 'step',
    visibleControls: ['reveal', 'step'],
    narration:
      'Each click changes the page, so the agent needs a fresh screenshot. Look, click, look again: the agent loop.',
    act: 'Step the run to the end.',
    say: { block: 'film', text: 'A look per step' },
    predicate: s => s.at >= TOTAL,
    hint: 'Press the button under the story until the order is placed, or run it to the end.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `${LOOKS} looks and ${CLICKS.length} clicks placed the order. The agent never touched the site: the host did every click.`,
    act: 'One question to finish.',
    say: { block: 'camera', text: `${LOOKS} looks` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Between two screenshots, what can the agent see?',
  },
];

export default function LookThenClick() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: 1, pick: null, tab: 'screen', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, focus }) => (
        <CuStage
          run={RUN}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          predict={
            focus === 'pick' || (state.pick !== null && state.at === 1)
              ? { pick: state.pick, onPick: pick => apply({ ...state, pick }) }
              : undefined
          }
        />
      )}
      controls={{
        pick: ({ state, sync }) => (
          <PickNote v={CLICKS[0].view} pick={state.pick} onScreen={() => sync({ ...state, tab: 'screen' })} />
        ),
        step: ({ state, sync }) => (
          <>
            <StepThrough r={RUN} at={state.at} onStep={at => sync({ ...state, at, tab: 'scene' })} />{' '}
            {state.at >= 2 && (
              <RunAll
                r={RUN}
                at={state.at}
                onStep={at => sync({ ...state, at, tab: 'scene' })}
                label="Run to the end"
              />
            )}
          </>
        ),
        reveal: ({ state }) => <ClickOutcome v={CLICKS[0].view} pick={state.pick} el={CLICKS[0].el?.id} />,
        facts: () => (
          <>
            <Fact id="app-runs-it" />
            <Fact id="agent-loop" />
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
