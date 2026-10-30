// Chapter 3: full and since-last. The reader switches six-hourly copies to incremental, predicts how far a restore
// reaches when one link of the chain won't read, marks Tuesday 13:00's tape bad and strikes at Tuesday 22:00, then
// reads the broken chain on the Week tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, STRIKES, clock, policyOf, restore, weekOf } from '../../lib/backups/sim';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, Toggle, type Struck } from './kit';

const MODULE = 'backups',
  ID = '03-full-and-since-last';
export const PARTS = SAFE_PARTS;
export const STRIKE = STRIKES.tue;
export const BROKEN = SCENES.broken.broken!;
export const weekFor = (incremental: boolean, broken: boolean) =>
  weekOf(policyOf({ every: 6, incremental, broken: broken ? BROKEN : null }));

export const P1 = {
  question: `${clock(BROKEN)}’s tape won’t read. A restore after ${clock(STRIKE.hour)} gets you back to…`,
  options: [
    `${clock(BROKEN - 6)}, the link before the break`,
    `${clock(BROKEN + 6)}, skipping the bad link`,
    'Nothing at all: the chain is gone',
  ],
};
export const outcomeOf = () => {
  const p = restore(weekFor(true, true), STRIKE).point;
  return p === BROKEN - 6 ? 0 : p === BROKEN + 6 ? 1 : 2;
};

export const QUIZ = {
  question:
    'A full copy runs on Sunday, then incrementals each night. Wednesday night’s is lost. Friday’s disaster restores to…',
  options: ['Tuesday night’s copy', 'Thursday night’s copy', 'Sunday’s full copy only'],
  correct: 0,
  explanation: 'A restore reads the full copy and every link after it, so it stops at the first missing link.',
  why: [
    'Right: Thursday’s copy needs Wednesday’s, so the chain stops at Tuesday.',
    'Thursday’s copy only holds Thursday’s changes; without Wednesday’s it can’t be rebuilt.',
    'Monday and Tuesday still read, so the restore gets further than Sunday.',
  ],
};

interface S extends Struck {
  incremental: boolean;
  broken: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'smaller',
    focus: 'kind',
    visibleControls: ['kind'],
    narration:
      'Each six-hourly tape is a full copy of the whole database. An incremental copy keeps only what changed.',
    act: 'Switch to incremental copies.',
    say: { block: 'cabinet', text: 'Full tapes' },
    predicate: s => s.incremental,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['kind', 'p1'],
    narration: 'Each day starts with one full copy; the rest form a chain on it.',
    act: 'Predict how far a restore gets past a bad link.',
    say: { block: 'cabinet', text: 'Small reels' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'break',
    focus: 'broken',
    visibleControls: ['p1', 'broken'],
    narration: 'Your pick is locked.',
    act: `Mark ${clock(BROKEN)}’s tape bad, then press Strike.`,
    predicate: s => s.p1 !== null && s.incremental && s.broken && s.struck,
  },
  {
    id: 'chain',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'A restore reads the full copy and every link after it. It stopped at the break.',
    act: 'Open the Week tab to see the chain.',
    say: { block: 'cabinet', text: 'Broken chain' },
    predicate: s => s.view === 'week',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Short chains are cheap and fast; one lost link costs everything after it.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which copies does Thursday’s incremental need?',
  },
];

export default function FullAndSinceLast() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        hour: STRIKE.hour,
        kind: 'disk',
        struck: false,
        view: 'scene',
        incremental: false,
        broken: false,
        p1: null,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const w = weekFor(state.incremental, state.broken);
        return (
          <BackupsStage
            week={w}
            s={state}
            say={say}
            onView={view => sync({ ...state, view })}
            caption={`${w.fulls} full and ${w.incrementals} incremental tapes this week.`}
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
        kind: ({ state, apply }) => (
          <Toggle
            on={state.incremental}
            label="Incremental: each day one full copy, then only the changes"
            onChange={incremental => apply({ ...state, incremental })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        broken: ({ state, apply }) => (
          <Toggle
            on={state.broken}
            label={`${clock(BROKEN)}’s tape won’t read`}
            onChange={broken => apply({ ...state, broken })}
          />
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="incremental" />
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
