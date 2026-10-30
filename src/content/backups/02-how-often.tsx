// Chapter 2: how often to copy. The disk dies on Thursday at 17:00 under nightly copies; the reader predicts what a
// six-hourly schedule saves, picks it and sees the loss shrink, then picks the schedule that loses at most one hour.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { Outcome } from '../tool-calling/kit';
import { STRIKES, policyOf, restore, weekOf } from '../../lib/backups/sim';
import { EVERIES } from '../../lib/backups/workbench';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, type Struck } from './kit';

const MODULE = 'backups',
  ID = '02-how-often';
export const PARTS = SAFE_PARTS;
export const STRIKE = STRIKES.thu;
export const weekFor = (every: number) => weekOf(policyOf({ every }));
export const lostAt = (every: number) => restore(weekFor(every), STRIKE).lost;

export const P1 = {
  question: 'Copy every 6 hours instead of nightly. What does the same 17:00 failure lose?',
  options: ['Less than half as much', 'About the same: it is still one disk', 'More: copying slows the disk down'],
};
export const outcomeOf = () => (lostAt(6) * 2 < lostAt(24) ? 0 : 1);

export const QUIZ = {
  question: 'A clinic copies its bookings every 4 hours. What is the most a crash can lose?',
  options: ['Up to 4 hours of bookings', 'Nothing, once a copy has finished', 'A whole day of bookings'],
  correct: 0,
  explanation: 'The gap between copies is the most work you can lose: the RPO.',
  why: [
    'Right: a crash just before the next copy loses everything since the last one, up to 4 hours.',
    'A finished copy is already old; bookings made after it are only on the live disk.',
    'A day would be the loss with nightly copies; four-hourly copies cap it at four hours.',
  ],
};

interface S extends Struck {
  every: number;
  p1: number | null;
  quiz: number | null;
}

const NAME: Record<number, string> = {
  24: 'Every night',
  12: 'Every 12 hours',
  6: 'Every 6 hours',
  1: 'Every hour',
};

export const STEPS: Step<S>[] = [
  {
    id: 'strike',
    focus: 'stage',
    visibleControls: [],
    narration: 'Tapes are made nightly at 01:00. It is Thursday 17:00 and the disk is failing.',
    act: 'Press Strike.',
    say: { block: 'cabinet', text: 'Nightly tapes' },
    predicate: s => s.struck,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Restored from 01:00: the whole working day is gone. Mira could copy more often.',
    act: 'Predict what six-hourly copies lose.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'six',
    focus: 'every',
    visibleControls: ['p1', 'every'],
    narration: 'Your pick is locked. The schedule sets when each tape is made.',
    act: 'Set the schedule to every 6 hours.',
    say: { block: 'cabinet', text: 'More tapes' },
    predicate: s => s.every === 6 && s.struck,
  },
  {
    id: 'rpo',
    focus: 'every',
    visibleControls: ['out1', 'every'],
    narration: 'The gap between copies caps what you lose. That cap is your RPO.',
    act: 'Pick a schedule that loses one hour at most.',
    predicate: s => s.every === 1 && s.struck,
    hint: 'A copy every hour leaves at most an hour of orders on the disk alone.',
    solution: s => ({ ...s, every: 1, struck: true }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['every', 'quiz'],
    narration: 'Hourly copies lose the least, but make 24 tapes a day. Chapter 3 makes them smaller.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What is on the disk alone just before the next copy?',
  },
];

export default function HowOften() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hour: STRIKE.hour, kind: 'disk', struck: false, view: 'scene', every: 24, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <BackupsStage
          week={weekFor(state.every)}
          s={state}
          say={say}
          onView={view => sync({ ...state, view })}
          bar={
            <StrikeBar
              s={state}
              kinds={['disk']}
              hours={false}
              onChange={(n, strike) => (strike ? apply : sync)({ ...state, ...n })}
            />
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="rpo" />
          </>
        ),
        every: ({ state, apply }) => (
          <label className="bk-field">
            <span>Schedule</span>
            <Select value={state.every} onChange={e => apply({ ...state, every: Number(e.target.value) })}>
              {EVERIES.map(e => (
                <option key={e} value={e}>
                  {NAME[e]}
                </option>
              ))}
            </Select>
          </label>
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
