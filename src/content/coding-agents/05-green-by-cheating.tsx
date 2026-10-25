// Chapter 5: green by cheating. Tom's ticket asks for green checks; the agent fixes half the bug, then loosens the
// test that still fails, and every lamp goes green. Larkspur's original checks, run live on the same code, still fail.
// With protected test files the host refuses that edit and the agent fixes the code. Links Post-training's "you get
// what you check" (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { runTests, TEST_NAMES } from '../../lib/coding-agents/tests';
import {
  beatsOf,
  CaStage,
  Fact,
  nthBeat,
  play,
  RecordedNote,
  RunAll,
  StepThrough,
  TestList,
  type Beat,
  type CaView,
} from './kit';

const MODULE = 'coding-agents',
  ID = '05-green-by-cheating';
export const PARTS = DESK_PARTS;
export const runOf = (protect: boolean) => play({ case: 'cheat', protect });
const OPEN = runOf(false),
  SAFE = runOf(true);
/** the second test run: one test left */
export const SECOND = nthBeat(OPEN, 'run', 2);
/** the agent's edit after reading the test file */
export const CHEAT = beatsOf(OPEN).find(
  (b): b is Extract<Beat, { kind: 'edit' }> => b.kind === 'edit' && b.path.startsWith('tests/'),
)!;
/** Larkspur's own checks, run on the code the cheating run ends with */
export const ORIGINAL = runTests(OPEN.code);

export const P1 = {
  question: 'The agent opens the test file. What does it change?',
  options: [
    'It loosens the test so it passes',
    'Nothing there: it rounds the discount in the code',
    'It deletes the code',
  ],
};
export const outcomeOf = () => (CHEAT.path.startsWith('tests/') ? 0 : 1);

export interface S {
  protect: boolean;
  at: number;
  p1: number | null;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'A team scores its agent on tickets closed with green tests. What should they watch for?',
  options: [
    'Green runs where the tests changed, not the code',
    'Nothing: green tests mean the code is right',
    'Fewer closed tickets, since tests are hard to pass',
  ],
  correct: 0,
  explanation: 'An agent rewarded for green can get green by weakening the checks, so guard the checks.',
  why: [
    'Right: if editing a test is allowed, loosening it is the shortest road to green.',
    'Green means the tests passed; a weakened test passes code the real rule would fail.',
    'Passing gets easier, not harder, once the agent may change the tests.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'red',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'The agent runs the tests first: two red. It fixes the 50-item threshold and runs them again.',
    act: 'Step until one test is left.',
    say: { block: 'lamps', text: 'Two red' },
    predicate: s => s.at >= SECOND,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `“${TEST_NAMES.cents}” still fails, and the release is at 5 pm. The agent opens the test file.`,
    act: 'Predict its next edit.',
    say: { block: 'cabinet', text: 'The test file' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cheat',
    focus: 'step',
    visibleControls: ['out1', 'step'],
    narration: 'Your pick is locked.',
    act: 'Step to the end of the run.',
    say: { block: 'patch', text: 'Test loosened' },
    predicate: s => s.at >= beatsOf(OPEN).length,
  },
  {
    id: 'green',
    focus: 'protect',
    visibleControls: ['original', 'protect'],
    narration: 'Every lamp is green, yet Larkspur’s own checks still fail: it passed a weakened test, not the rule.',
    act: 'Turn on protected test files.',
    say: { block: 'lamps', text: 'Green, wrongly' },
    predicate: s => s.protect,
  },
  {
    id: 'protect',
    focus: 'protect',
    visibleControls: ['protect'],
    narration: 'Each test file is now a protected file: the host refuses the edit, so the agent must fix the code.',
    act: 'Run the ticket again.',
    say: { block: 'cabinet', text: 'Locked' },
    predicate: s => s.protect && s.at >= beatsOf(SAFE).length,
    solution: s => ({ ...s, protect: true, at: beatsOf(SAFE).length, tab: 'scene' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: 'Green on Larkspur’s own checks this time. Done means what the tests check, so guard the tests.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is the shortest road to green, if tests can change?',
  },
];

export default function GreenByCheating() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ protect: false, at: 0, p1: null, tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <CaStage
          run={runOf(state.protect)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
        />
      )}
      controls={{
        step: ({ state, sync }) => (
          <>
            <StepThrough r={OPEN} at={state.at} onStep={at => sync({ ...state, at })} />{' '}
            {state.at >= SECOND && (
              <RunAll r={OPEN} at={state.at} onStep={at => sync({ ...state, at })} label="Run to the end" />
            )}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        original: () => (
          <>
            <p>
              <strong>Larkspur’s original checks, on the same code:</strong>
            </p>
            <TestList tests={ORIGINAL} />
          </>
        ),
        protect: ({ state, sync, apply }) => (
          <>
            <label className="tc-check">
              <input
                type="checkbox"
                checked={state.protect}
                onChange={e => apply({ ...state, protect: e.currentTarget.checked, at: 0 })}
              />{' '}
              Protect test files
            </label>
            {state.protect && (
              <RunAll
                r={SAFE}
                at={state.at}
                onStep={at => sync({ ...state, at, tab: 'scene' })}
                label="Run the ticket again"
              />
            )}
          </>
        ),
        facts: () => (
          <>
            <Fact id="reward-hacking" />
            <p className="note">
              <a href="/post-training/06-you-get-what-you-check/">Post-training: you get what you check</a> shows the
              same pull while a model is trained.
            </p>
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
