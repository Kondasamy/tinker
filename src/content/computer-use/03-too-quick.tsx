// Chapter 3: too quick. The basket page is slow, and this host takes the next screenshot at once: the agent sees the
// order list still there, predicts (by the reader) a click, and orders the hinges twice. The wait rule makes the host
// wait for the page to settle before it looks, and the order goes in once.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { money } from '../../lib/computer-use/screens';
import { PUPPET_PARTS } from '../../components/scenes/puppetScene';
import {
  beatsOf,
  ClickOutcome,
  clicksOf,
  CuStage,
  Fact,
  nthBeat,
  play,
  PickNote,
  RecordedNote,
  RunAll,
  StepThrough,
  type CuView,
} from './kit';

const MODULE = 'computer-use',
  ID = '03-too-quick';
export const PARTS = PUPPET_PARTS;
export const runOf = (wait: boolean) => play({ case: 'hinges', wait });
const FAST = runOf(false),
  STALE_AT = nthBeat(FAST, 'look', 3),
  AGAIN = clicksOf(FAST)[2];
const PAID = (wait: boolean) => runOf(wait).charges[0];

export interface S {
  at: number;
  pick: string | null;
  tab: CuView;
  wait: boolean;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'An agent clicks Send on a slow email page, then sees the same page with Send still there. What is the risk?',
  options: [
    'It clicks Send again, and the email goes twice',
    'None: the agent knows the page is loading',
    'The email is lost because the agent looked too soon',
  ],
  correct: 0,
  explanation: 'A screenshot taken before the page changes looks as if the click did nothing, so the agent repeats it.',
  why: [
    'Right: the stale picture says “not sent yet”, so the agent tries again, and both clicks count.',
    'The agent only knows what the screenshot shows; a page mid-load can look unchanged.',
    'The first click went through; the trouble is the second one, made on a stale picture.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: 'The agent clicked Reorder. The slow basket page hadn’t loaded when the host took a stale screenshot.',
    act: 'Predict the agent’s next click.',
    say: { block: 'screen', text: 'Still loading' },
    predicate: s => s.pick !== null,
  },
  {
    id: 'click',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'To the agent, the page looks unchanged, as if its click was lost.',
    act: 'Carry out the click.',
    say: { block: 'camera', text: 'Looked too soon' },
    predicate: s => s.at > STALE_AT,
  },
  {
    id: 'end',
    focus: 'step',
    visibleControls: ['reveal', 'step'],
    narration: 'Both clicks reached the portal. See what the basket holds when the page catches up.',
    act: 'Run it to the end.',
    say: { block: 'film', text: 'Two Reorders' },
    predicate: s => s.at >= beatsOf(FAST).length,
  },
  {
    id: 'fix',
    focus: 'wait',
    visibleControls: ['wait', 'run'],
    narration: `Larkspur paid ${money(PAID(false).amount)}, double. A wait rule makes the host let the page settle before it looks.`,
    act: 'Turn on the wait rule, then run it.',
    say: { block: 'camera', text: 'Wait, then look' },
    predicate: s => s.wait && s.at >= beatsOf(runOf(true)).length,
    hint: 'Tick the box, then run the re-order to the end.',
    solution: s => ({ ...s, wait: true, at: beatsOf(runOf(true)).length, tab: 'scene' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `One Reorder, ${money(PAID(true).amount)} paid. The agent did the same thing both times; only the moment of the screenshot changed.`,
    act: 'One question to finish.',
    say: { block: 'screen', text: 'Ordered once' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the agent see after its first click?',
  },
];

export default function TooQuick() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: STALE_AT, pick: null, tab: 'screen', wait: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, focus }) => (
        <CuStage
          run={runOf(state.wait)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          predict={
            focus === 'pick' || (state.pick !== null && state.at === STALE_AT)
              ? { pick: state.pick, onPick: pick => apply({ ...state, pick }) }
              : undefined
          }
        />
      )}
      controls={{
        pick: ({ state, sync }) => (
          <PickNote v={AGAIN.view} pick={state.pick} onScreen={() => sync({ ...state, tab: 'screen' })} />
        ),
        step: ({ state, sync }) => (
          <>
            <StepThrough r={FAST} at={state.at} onStep={at => sync({ ...state, at, tab: 'scene' })} />{' '}
            {state.at > STALE_AT && (
              <RunAll r={FAST} at={state.at} onStep={at => sync({ ...state, at })} label="Run to the end" />
            )}
          </>
        ),
        reveal: ({ state }) => <ClickOutcome v={AGAIN.view} pick={state.pick} el={AGAIN.el?.id} />,
        wait: ({ state, sync }) => (
          <label className="cu-check">
            <input
              type="checkbox"
              checked={state.wait}
              onChange={e => sync({ ...state, wait: e.currentTarget.checked, at: 0 })}
            />{' '}
            Wait for the page to settle before each screenshot
          </label>
        ),
        run: ({ state, apply }) =>
          state.wait ? (
            <RunAll
              r={runOf(true)}
              at={state.at}
              onStep={at => apply({ ...state, at, tab: 'scene' })}
              label="Run the re-order"
            />
          ) : null,
        facts: () => (
          <>
            <Fact id="wait" />
            <Fact id="check-after" />
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
