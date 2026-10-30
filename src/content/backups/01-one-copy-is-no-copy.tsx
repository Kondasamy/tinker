// Chapter 1: one copy is no copy. The reader moves the clock into Wednesday, predicts what a dead disk leaves, strikes
// (the strike bar under the picture), sees every order gone, then turns on a nightly copy: now only the orders since
// last night's tape are lost. Databases is one link away.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, STRIKES, restore, weekOf } from '../../lib/backups/sim';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, SimNote, StrikeBar, Toggle, type Struck } from './kit';

const MODULE = 'backups',
  ID = '01-one-copy-is-no-copy';
export const PARTS = SAFE_PARTS;
/** the reader moves the clock at least this far before the disk dies: Wednesday noon */
export const WEDNESDAY = 60;
export const weekFor = (nightly: boolean) => weekOf(nightly ? SCENES.nightly : SCENES.none);

export const P1 = {
  question: 'The only disk dies now. What is left of the orders?',
  options: ['Nothing: every order is gone', 'Everything but today’s orders', 'The server rebuilds what it lost'],
};
export const outcomeOf = (hour = STRIKES.wed.hour) =>
  restore(weekFor(false), { kind: 'disk', hour }).from === null ? 0 : 1;

export const QUIZ = {
  question:
    'A designer keeps every drawing on one laptop with two mirrored drives inside. The laptop is stolen. What is left?',
  options: [
    'Nothing: both drives left with the laptop',
    'The second drive’s copy',
    'Everything, since the drives mirror',
  ],
  correct: 0,
  explanation: 'A backup counts only if one bad day can’t take it with the original.',
  why: [
    'Right: both copies sat in the same laptop, so one theft took both.',
    'The second drive was stolen with the first; a copy in the same box shares its fate.',
    'Mirroring guards against one drive failing, not against losing the whole machine.',
  ],
};

interface S extends Struck {
  nightly: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'week',
    focus: 'stage',
    visibleControls: [],
    narration: 'Each hour, new orders are written to the database on the server’s one disk.',
    act: 'Move the hour on to Wednesday afternoon.',
    say: { block: 'server', text: 'One disk' },
    predicate: s => s.hour >= WEDNESDAY,
    solution: s => ({ ...s, hour: STRIKES.wed.hour, struck: false }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The tape cabinet beside it stands empty. Nobody has made a copy.',
    act: 'Predict what a dead disk leaves.',
    say: { block: 'cabinet', text: 'Empty' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'strike',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Pick Disk dies and press Strike.',
    predicate: s => s.p1 !== null && s.struck,
  },
  {
    id: 'nightly',
    focus: 'nightly',
    visibleControls: ['out1', 'nightly'],
    narration: 'Every order is gone. A backup is a second copy, kept apart from the disk.',
    act: 'Turn on a nightly copy to tape.',
    say: { block: 'server', text: 'Every order' },
    predicate: s => s.nightly && s.struck,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['nightly', 'quiz'],
    narration: 'Now the restore comes from last night’s tape. Only the orders since are lost.',
    act: 'One question to finish.',
    say: { block: 'cabinet', text: 'Last night' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where was the second copy when the laptop left?',
  },
];

export default function OneCopy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hour: 6, kind: 'disk', struck: false, view: 'scene', nightly: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <BackupsStage
          week={weekFor(state.nightly)}
          s={state}
          say={say}
          onView={view => sync({ ...state, view })}
          bar={
            <StrikeBar
              s={state}
              kinds={['disk']}
              onChange={(n, strike) => (strike ? apply : sync)({ ...state, ...n })}
            />
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.hour)} />
            <p className="note bk-note">
              How the orders are laid out on that disk: <a href="/databases/">Databases &amp; indexes</a>.
            </p>
          </>
        ),
        nightly: ({ state, apply }) => (
          <Toggle
            on={state.nightly}
            label="Copy the database to tape every night at 01:00"
            onChange={nightly => apply({ ...state, nightly })}
          />
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
