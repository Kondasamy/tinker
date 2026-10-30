// Chapter 6: who gets turned away. Quickfix's runaway script spends one shared barrel's tokens before Oakmoor and the
// web shop can, so they hear 429 too; one barrel per API key keeps them whole while Quickfix alone is limited.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, clock, runOf, successOf } from '../../lib/rate-limits/sim';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '06-who-gets-turned-away';
export const PARTS = BARREL_PARTS;
export const SHARED = runOf(SCENES.shared),
  PER_KEY = runOf(SCENES.perKey);
const qf = SHARED.hits.filter(h => h.key === 'quickfix');
export const FROM = qf[0].at,
  RATE = Math.round(1000 / (qf[1].at - qf[0].at));
const oak = SHARED.hits.filter(h => h.key === 'oakmoor');
export const OAK_RATE = Math.round(1000 / (oak[1].at - oak[0].at));
const pct = (x: number) => `${Math.round(x * 100)}%`;
export const SHARE = { shared: successOf(SHARED, 'oakmoor'), perKey: successOf(PER_KEY, 'oakmoor') };
const LOOK = 5000,
  LATER = 10_000;

export const P1 = {
  question: 'With one shared barrel, what share of Oakmoor’s requests get through?',
  options: ['About a third', 'All of them: Oakmoor sends slowly', 'None at all'],
};
export const outcomeOf = () => (SHARE.shared === 1 ? 1 : SHARE.shared === 0 ? 2 : 0);

export const QUIZ = {
  question: 'A weather API has one limit shared by every app that uses it. One app goes viral. What happens?',
  options: [
    'Every app hears 429, not just the viral one',
    'Only the viral app is slowed',
    'Nothing: the limit is shared fairly',
  ],
  correct: 0,
  explanation: 'A shared limit is spent by whoever asks most; a limit per key keeps the others whole.',
  why: [
    'Right: the viral app spends the shared tokens first, so the quiet apps are refused too.',
    'Slowing only the viral app needs a limit per app, with each app’s key.',
    'A shared barrel is first come, first served; the busiest client takes most of it.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  perKey: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'shared',
    focus: 'stage',
    visibleControls: [],
    narration: `One barrel for everyone. Quickfix’s script floods it from ${clock(FROM)}, at ${RATE} a second.`,
    act: `Slide to ${clock(LOOK)}.`,
    say: { block: 'barrel', text: 'Shared' },
    predicate: s => s.t >= LOOK,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Oakmoor still sends ${OAK_RATE} a second, as it always does.`,
    act: 'Predict Oakmoor’s share served.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'keys',
    visibleControls: ['out1', 'keys'],
    narration: `Only ${pct(SHARE.shared)} of Oakmoor’s got through: Quickfix spends the tokens first. Each partner sends its API key.`,
    act: 'Tick One barrel per key.',
    predicate: s => s.perKey,
  },
  {
    id: 'perkey',
    focus: 'stage',
    visibleControls: ['keys'],
    narration: 'A per-key limit gives each partner its own barrel, filled at the same pace.',
    act: `Slide to ${clock(LATER)}.`,
    say: { block: 'barrel', text: 'One each' },
    predicate: s => s.perKey && s.t >= LATER,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Oakmoor and the web shop: ${pct(SHARE.perKey)} through. Only Quickfix hears 429 now.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who spends a shared barrel’s tokens first?',
  },
];

export default function WhoGetsTurnedAway() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, perKey: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTime={t => sync({ ...state, t, view: 'scene' })}
          step={250}
          show={{
            run: state.perKey ? PER_KEY : SHARED,
            t: state.t,
            caption: `${clock(state.t)}. ${state.perKey ? 'One barrel per partner key.' : 'One shared barrel.'}`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        keys: ({ state, apply }) => (
          <>
            <label className="rl-row">
              <input
                type="checkbox"
                checked={state.perKey}
                onChange={e => apply({ ...state, perKey: e.target.checked })}
              />{' '}
              One barrel per key
            </label>
            <Fact id="per-key" />
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
