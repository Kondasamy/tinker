// Chapter 3: a patch, not a rewrite. The agent's patch arrives in the Code tab, three hunks with a checkbox each (KTD15).
// The reader drops the fix hunk and runs the tests (red, live), then keeps only the two the ticket needs (green). The
// hunks kept enter the agent's history, so its closing turn answers the version the reader made.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DESK_PARTS } from '../../components/scenes/deskScene';
import { TEST_NAMES } from '../../lib/coding-agents/tests';
import { beatsOf, CaStage, Fact, nthBeat, passed, play, RecordedNote, TestList, testsAt, type CaView } from './kit';

const MODULE = 'coding-agents',
  ID = '03-a-patch-not-a-rewrite';
export const PARTS = DESK_PARTS;
export const runOf = (mask: number) => play({ case: 'bulk', review: mask });
/** the beat the patch arrives on */
export const EDIT = nthBeat(runOf(7), 'edit');
export const ALL = 7,
  /** hunks 1 and 2: the fix and the rounding, without the drive-by */
  CLEAN = 3;
export const endOf = (mask: number) => beatsOf(runOf(mask)).length;
export const resultOf = (mask: number) => testsAt(runOf(mask), endOf(mask))!;

export interface S {
  mask: number;
  ran: boolean;
  /** the reader dropped the fix hunk and saw red */
  dropped: boolean;
  at: number;
  tab: CaView;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'An agent’s patch to a booking form fixes the date bug in one hunk and renames a variable in another. What should the reviewer do?',
  options: [
    'Keep the fix, and drop the rename unless the ticket asked for it',
    'Take the whole patch: the agent read more code than you did',
    'Reject the whole patch, since one hunk wasn’t needed',
  ],
  correct: 0,
  explanation: 'Hunks are separate changes, so a review can keep the one the ticket needs and drop the rest.',
  why: [
    'Right: each hunk is its own change, and the rename can wait for a ticket that asks for it.',
    'Reading more code doesn’t make every change wanted; the drive-by still needs a reason.',
    'Throwing away the fix with the drive-by loses the part that worked.',
  ],
};

const run = (s: S, mask: number): S => ({
  ...s,
  mask,
  ran: true,
  dropped: s.dropped || !(mask & 1),
  at: endOf(mask),
  tab: 'scene',
});

export const STEPS: Step<S>[] = [
  {
    id: 'hunks',
    focus: 'stage',
    visibleControls: ['tests', 'again'],
    narration: 'The agent’s patch is a diff of three hunks. Hunk 1 makes 50 count as bulk.',
    act: 'Untick hunk 1, then press Run tests.',
    say: { block: 'patch', text: 'Three hunks' },
    predicate: s => s.ran && !(s.mask & 1),
    solution: s => run(s, ALL & ~1),
  },
  {
    id: 'red',
    focus: 'again',
    visibleControls: ['tests', 'again'],
    narration: `Red: “${TEST_NAMES['at-50']}” fails. Dropping hunk 1 dropped the fix.`,
    act: 'Press Review again.',
    say: { block: 'lamps', text: 'Red' },
    predicate: s => !s.ran && s.dropped,
  },
  {
    id: 'keep',
    focus: 'stage',
    visibleControls: ['tests', 'again'],
    narration: 'Hunk 3 rounds line prices to whole dollars: a drive-by the ticket never asked for.',
    act: 'Keep hunks 1 and 2 only, then press Run tests.',
    say: { block: 'patch', text: 'A drive-by' },
    predicate: s => s.ran && s.mask === CLEAN,
    hint: 'Untick hunk 3, keep 1 and 2, and run the tests.',
    solution: s => run(s, CLEAN),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['tests', 'facts', 'quiz'],
    narration: `Green: ${passed(resultOf(CLEAN))} of ${resultOf(CLEAN).length} pass. A patch, kept hunk by hunk, let you take the fix and leave the rest.`,
    act: 'One question to finish.',
    say: { block: 'lamps', text: 'Green' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which hunk did the ticket ask for?',
  },
];

export default function APatchNotARewrite() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ mask: ALL, ran: false, dropped: false, at: EDIT, tab: 'code', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <CaStage
          run={runOf(state.mask)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          review={{
            mask: state.mask,
            ran: state.ran,
            onMask: mask => sync({ ...state, mask }),
            onRun: () => apply(run(state, state.mask)),
          }}
        />
      )}
      controls={{
        tests: ({ state }) => (state.ran ? <TestList tests={resultOf(state.mask)} /> : null),
        again: ({ state, sync }) =>
          state.ran && (
            <button
              type="button"
              className="chip"
              onClick={() => sync({ ...state, mask: ALL, ran: false, at: EDIT, tab: 'code' })}
            >
              Review again
            </button>
          ),
        facts: () => (
          <>
            <Fact id="patch-vs-file" />
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
