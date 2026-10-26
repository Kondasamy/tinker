// Chapter 4: red to green. The reader predicts whether the agent's whole patch passes, runs the tests (live, the lamps
// read the result), sees which promise broke, then lets the agent run alone: it reads red, takes out its own drive-by
// and runs again to green.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { allPass } from '../../lib/coding-agents/tests';
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
  testsAt,
  type CaView,
} from './kit';

const MODULE = 'coding-agents',
  ID = '04-red-to-green';
export const PARTS = DESK_PARTS;
/** the patch as the agent wrote it, every hunk kept */
export const ALL = 7;
export const REVIEWED = play({ case: 'bulk', review: ALL }),
  ALONE = play({ case: 'bulk' });
export const EDIT = nthBeat(REVIEWED, 'edit');
export const RESULT = testsAt(REVIEWED, beatsOf(REVIEWED).length)!;
export const BROKE = RESULT.filter(t => !t.pass);

export const P1 = {
  question: 'With all three hunks, will the tests pass?',
  options: ['Yes: all of them pass', 'No: the drive-by breaks one', 'No: none pass until the agent says done'],
};
export const outcomeOf = () => (allPass(RESULT) ? 0 : BROKE.length < RESULT.length ? 1 : 2);

export interface S {
  p1: number | null;
  ran: boolean;
  alone: boolean;
  at: number;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'A test run is red: “refunds over $500 need approval” fails. What has the agent learned?',
  options: [
    'Which promise its change broke, so where to look',
    'That its whole change is wrong and must be undone',
    'Nothing, until the tests run twice more',
  ],
  correct: 0,
  explanation: 'A failing test names the one promise that broke, which points the next edit at it.',
  why: [
    'Right: red names the check that failed, and the agent fixes that, not everything.',
    'One failing promise says nothing about the parts that passed; undoing them throws away good work.',
    'The checks run the same way each time, so a rerun of unchanged code says the same.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The agent’s patch is in the Code tab, all three hunks kept. Each test checks one promise the code makes.',
    act: 'Predict the test run.',
    say: { block: 'patch', text: 'All three hunks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'stage',
    visibleControls: [],
    narration: 'Your pick is locked. The tests are real code, run on this exact version in your browser.',
    act: 'Press Run tests.',
    say: { block: 'lamps', text: 'Live result' },
    predicate: s => s.ran,
    solution: s => ({ ...s, ran: true, at: beatsOf(REVIEWED).length, tab: 'scene' }),
  },
  {
    id: 'red',
    focus: 'alone',
    visibleControls: ['out1', 'tests', 'alone'],
    narration: `Red: ${BROKE.length} of ${RESULT.length} fails. Now let the agent see red and carry on alone.`,
    act: 'Run the agent alone to the end.',
    say: { block: 'lamps', text: 'Red names it' },
    predicate: s => s.alone && s.at >= beatsOf(ALONE).length,
    solution: s => ({ ...s, alone: true, at: beatsOf(ALONE).length }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration:
      'It read the failing name, dropped its own drive-by, and ran again: green. The tests were its only judge.',
    act: 'One question to finish.',
    say: { block: 'lamps', text: 'Green' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a failing test name?',
  },
];

export default function RedToGreen() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, alone: false, at: EDIT, tab: 'code', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <CaStage
          run={state.alone ? ALONE : REVIEWED}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          review={
            state.alone
              ? undefined
              : {
                  mask: ALL,
                  fixed: true,
                  ran: state.ran || state.p1 === null,
                  onMask: () => {},
                  onRun: () => apply({ ...state, ran: true, at: beatsOf(REVIEWED).length, tab: 'scene' }),
                }
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        tests: () => <TestList tests={RESULT} />,
        alone: ({ state, sync }) => (
          <>
            {!state.alone ? (
              <button
                type="button"
                className="big"
                onClick={() => sync({ ...state, alone: true, at: EDIT + 1, tab: 'scene' })}
              >
                Let the agent run alone
              </button>
            ) : (
              <>
                <StepThrough r={ALONE} at={state.at} onStep={at => sync({ ...state, at })} />{' '}
                <RunAll r={ALONE} at={state.at} onStep={at => sync({ ...state, at })} label="Run to the end" />
              </>
            )}
          </>
        ),
        facts: () => (
          <>
            <Fact id="verified" />
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
