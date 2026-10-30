// Chapter 6: test the restore. Since Monday morning the copy job has written tapes that report done and never read
// back. The reader predicts what Friday's dead disk restores, strikes and finds the newest good tape is Monday's, turns
// on a daily test restore (it catches the bad job on its first morning), and reads the restore time, the RTO, on the
// Week tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, SCENES, STRIKES, clock, restore, weekOf } from '../../lib/backups/sim';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, Toggle, type Struck } from './kit';

const MODULE = 'backups',
  ID = '06-test-the-restore';
export const PARTS = SAFE_PARTS;
export const STRIKE = STRIKES.fri;
export const weekFor = (test: boolean) => weekOf(test ? SCENES.tested : SCENES.silent);
export const BAD_FROM = SCENES.silent.corruptFrom!;
export const CAUGHT = weekFor(true).caught!;
const NEWEST = Math.max(
  ...weekFor(false)
    .copies.filter(c => c.t <= STRIKE.hour)
    .map(c => c.t),
);
const TEST_AT = `${String(ASSUMPTIONS.testHour).padStart(2, '0')}:00`;

export const P1 = {
  question: `Every tape reported done. What does the ${clock(STRIKE.hour)} restore bring back?`,
  options: [
    'Monday’s first tape: nearly the whole week is gone',
    `The newest tape, from ${clock(NEWEST)}`,
    'Nothing: no tape ever worked',
  ],
};
export const outcomeOf = () => {
  const r = restore(weekFor(false), STRIKE);
  return r.from === null ? 2 : r.point! < BAD_FROM ? 0 : 1;
};

export const QUIZ = {
  question: 'Every night’s backup job emails “success”. How do you know it will restore?',
  options: ['Restore one on a schedule and check it', 'Trust the success emails', 'Keep more copies of each night'],
  correct: 0,
  explanation: 'Only reading a copy back proves it restores; a job can report success and write nothing usable.',
  why: [
    'Right: a test restore reads the copy back, so a bad one is found before you need it.',
    'The email says the job ran, not that its copy can be read back.',
    'More copies of a broken job are more broken copies.',
  ],
};

interface S extends Struck {
  test: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A tape lands in the cabinet every six hours, each reported done. Friday afternoon, the disk dies.',
    act: 'Predict what the restore brings back.',
    say: { block: 'cabinet', text: 'All done?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'strike',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Press Strike.',
    predicate: s => s.p1 !== null && s.struck,
  },
  {
    id: 'test',
    focus: 'test',
    visibleControls: ['out1', 'test'],
    narration: `Since ${clock(BAD_FROM)} the job wrote tapes that never read back. A test restore reads one back daily.`,
    act: 'Turn on a daily test restore.',
    say: { block: 'cabinet', text: 'Never read' },
    predicate: s => s.test && s.struck,
  },
  {
    id: 'rto',
    focus: 'stage',
    visibleControls: ['test'],
    narration: `Caught ${clock(CAUGHT)}, fixed, and Friday restores. Reading the tape back takes hours: your RTO.`,
    act: 'Open the Week tab.',
    say: { block: 'cabinet', text: 'Tested' },
    predicate: s => s.view === 'week',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'A backup counts only when a restore works, and only a test tells you it does.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a success email actually check?',
  },
];

export default function TestTheRestore() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hour: STRIKE.hour, kind: 'disk', struck: false, view: 'scene', test: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const w = weekFor(state.test);
        return (
          <BackupsStage
            week={w}
            s={state}
            say={say}
            onView={view => sync({ ...state, view })}
            caption={w.caught !== null ? `A test restore caught the bad job at ${clock(w.caught)}.` : undefined}
            bar={
              <StrikeBar
                s={state}
                kinds={['disk']}
                hours={false}
                onChange={(n, strike) => (strike ? apply : sync)({ ...state, ...n })}
              />
            }
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="gitlab" />
          </>
        ),
        test: ({ state, apply }) => (
          <>
            <Toggle
              on={state.test}
              label={`Test restore: read the newest tape back every day at ${TEST_AT}`}
              onChange={test => apply({ ...state, test })}
            />
            <Fact id="rto" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <SimNote />
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
