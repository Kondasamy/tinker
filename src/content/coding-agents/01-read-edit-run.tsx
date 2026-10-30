// Chapter 1: read, edit, run. Priya's ticket goes to the agent; the reader predicts its first action, then steps the
// recorded turns one at a time while the host carries each out live: a search, a read, a patch, a red test run, a
// second patch and green.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { beatsOf, CaStage, Fact, play, RecordedNote, RunAll, StepThrough, type CaView } from './kit';

const MODULE = 'coding-agents',
  ID = '01-read-edit-run';
export const PARTS = DESK_PARTS;
export const RUN = play({ case: 'bulk' });
export const TOTAL = beatsOf(RUN).length;

export const P1 = {
  question: 'The agent has the ticket. What does it ask the host to do first?',
  options: ['Search the code for the bug', 'Rewrite the discount file from memory', 'Run the tests'],
};
const FIRST = { search: 0, edit: 1, run: 2 } as Record<string, number>;
export const outcomeOf = () => FIRST[beatsOf(RUN)[0].kind] ?? 0;

export interface S {
  at: number;
  p1: number | null;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question: 'An agent’s edit to a checkout page saves without errors, but it hasn’t run the tests. What does it know?',
  options: [
    'Nothing yet about whether checkout works: only a test run tells it',
    'That checkout works, because the edit saved cleanly',
    'That checkout works, because it wrote the edit itself',
  ],
  correct: 0,
  explanation: 'The agent learns what its change did only from the results the host sends back.',
  why: [
    'Right: until a test runs, the agent has only its own guess about what the change does.',
    'Saving a file checks nothing about what the code does.',
    'Writing a change is not checking it; the agent can be confidently wrong.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'A coding agent works in turns. It asks the host for one action; the host does it and returns the result.',
    act: 'Predict its first action.',
    say: { block: 'agent', text: 'One action' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'first',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'Your pick is locked. Each turn shows on the desk, and its code in the Code tab.',
    act: 'Press Next turn.',
    say: { block: 'cabinet', text: 'The code' },
    predicate: s => s.at >= 1,
  },
  {
    id: 'loop',
    focus: 'step',
    visibleControls: ['out1', 'step'],
    narration: 'It searched the repository and read the best match. Next it edits the code and runs the tests.',
    act: 'Step to the end of the run.',
    say: { block: 'lamps', text: 'Red, then green' },
    predicate: s => s.at >= TOTAL,
    hint: 'Press Next turn until the agent is done, or run it to the end.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `${TOTAL - 1} actions, then done. Each result went back to the agent, which picked the next: the agent loop.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What tells the agent whether its change works?',
  },
];

export default function ReadEditRun() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: 0, p1: null, tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <CaStage run={RUN} at={state.at} say={say} view={state.tab} onView={tab => sync({ ...state, tab })} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        step: ({ state, sync }) => (
          <>
            <StepThrough r={RUN} at={state.at} onStep={at => sync({ ...state, at })} />{' '}
            {state.at >= 1 && (
              <RunAll r={RUN} at={state.at} onStep={at => sync({ ...state, at })} label="Run to the end" />
            )}
          </>
        ),
        facts: () => (
          <>
            <Fact id="swe-bench" />
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
