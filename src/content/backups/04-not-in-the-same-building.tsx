// Chapter 4: not in the same building. The reader predicts what a server-room fire leaves of six-hourly tapes kept
// beside the server, strikes Fire, sees nothing survive, sends every copy to the warehouse across town and is
// restored from there. The 3-2-1 rule is the cited fact.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { STRIKES, policyOf, restore, weekOf } from '../../lib/backups/sim';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, Toggle, type Struck } from './kit';

const MODULE = 'backups',
  ID = '04-not-in-the-same-building';
export const PARTS = SAFE_PARTS;
export const STRIKE = STRIKES.fire;
export const weekFor = (warehouse: boolean) => weekOf(policyOf({ every: 6, warehouse }));

export const P1 = {
  question: 'A fire guts the server room. What is left to restore from?',
  options: ['No copy at all', 'The tapes: they are in a cabinet', 'Every tape up to the fire'],
};
export const outcomeOf = (hour = STRIKE.hour) =>
  restore(weekFor(false), { kind: 'fire', hour }).from === null ? 0 : 2;

export const QUIZ = {
  question:
    'A café’s till copies its sales to a USB stick kept in the till’s drawer. A flood ruins the till. What should change?',
  options: [
    'Keep a copy somewhere the flood can’t reach',
    'Copy to the stick more often',
    'Use two sticks in the drawer',
  ],
  correct: 0,
  explanation: 'A copy in the same place shares that place’s disasters; one copy must live elsewhere.',
  why: [
    'Right: an off-site copy is the one a flood at the till can’t reach.',
    'More often still leaves every copy in the drawer the flood ruined.',
    'Two sticks in one drawer drown together.',
  ],
};

interface S extends Struck {
  warehouse: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Every six hours a tape goes into the cabinet, on-site, a step from the server.',
    act: 'Predict what a server-room fire leaves.',
    say: { block: 'cabinet', text: 'Same room' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'fire',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Pick Fire and press Strike.',
    predicate: s => s.p1 !== null && s.kind === 'fire' && s.struck,
  },
  {
    id: 'offsite',
    focus: 'warehouse',
    visibleControls: ['out1', 'warehouse'],
    narration: 'The fire took the server and every tape. An off-site copy lives in another building.',
    act: 'Send each copy to the warehouse across town.',
    say: { block: 'warehouse', text: 'Across town' },
    predicate: s => s.warehouse && s.kind === 'fire' && s.struck,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['warehouse', 'quiz'],
    narration: 'Restored from the warehouse: three copies, two kinds of media, one off-site. That is 3-2-1.',
    act: 'One question to finish.',
    say: { block: 'warehouse', text: 'Restored' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where would a copy have to be for the flood to miss it?',
  },
];

export default function NotInTheSameBuilding() {
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
        warehouse: false,
        p1: null,
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <BackupsStage
          week={weekFor(state.warehouse)}
          s={state}
          say={say}
          onView={view => sync({ ...state, view })}
          bar={
            <StrikeBar
              s={state}
              kinds={['disk', 'fire']}
              onChange={(n, strike) => (strike ? apply : sync)({ ...state, ...n })}
            />
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.hour)} />,
        warehouse: ({ state, apply }) => (
          <>
            <Toggle
              on={state.warehouse}
              label="Send each copy over the network to the warehouse"
              onChange={warehouse => apply({ ...state, warehouse })}
            />
            <Fact id="3-2-1" />
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
