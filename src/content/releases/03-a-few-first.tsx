// Chapter 3: a few first. A 5% canary of the bigger Buy button (a good change) on a short bake rings a false alarm;
// the reader predicts it, sees it, bakes longer and sees it pass; then the tax rounding, a small bug, passes the check
// too: a miss. A/B testing's luck chapter teaches the same noise, one link away.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { BASE, CANARY, SCENES, changeOf, clock, pct, runOf } from '../../lib/releases/sim';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '03-a-few-first';
export const PARTS = SIGNAL_PARTS;
export const GOOD = changeOf('button'),
  SMALL = changeOf('tax');
export const SHORT = 2,
  LONG = 10,
  START = SCENES.canary(GOOD.id, SHORT).start;
export const runFor = (change: string, bake: number) => runOf(SCENES.canary(change, bake));
/** the minute the first check runs */
export const checkAt = (bake: number) => START + bake - 1;
/** the false alarm's counts, read off its run */
export const ALARM = runFor(GOOD.id, SHORT).milestones.find(m => m.kind === 'alarm')!;

export const P1 = {
  question: `The ${GOOD.short} breaks nothing. What can the check say after ${SHORT} minutes?`,
  options: [
    'It passes: nothing changed',
    'It can ring: a few unlucky failures look like a bug',
    'It always rings for a new version',
  ],
};
export const outcomeOf = () => (runFor(GOOD.id, SHORT).alarmAt !== null ? 1 : 0);

export const QUIZ = {
  question: 'A canary of 10 shoppers has 1 failed checkout; everyone else fails about 1 in 100. What does it show?',
  options: [
    'Too few checkouts to tell: one failure can be luck',
    'The new version fails ten times as often',
    'Nothing: canaries never fail',
  ],
  correct: 0,
  explanation: 'With ten checkouts, one unlucky failure looks like a 10% rate.',
  why: [
    'Right: a bigger canary or a longer bake is needed before the gap means anything.',
    'One failure in ten is too few to measure a rate; it could easily be luck.',
    'Canaries fail at the old rate too; the question is whether they fail more.',
  ],
};

interface S {
  change: string;
  bake: number;
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'canary',
    focus: 'stage',
    visibleControls: [],
    narration: `A canary sends ${pct(CANARY)} of checkouts to the ${GOOD.short} first. The rest stay on the old page.`,
    act: `Press Step to ${clock(START)}.`,
    say: { block: 'new', text: 'The canary' },
    predicate: s => s.t >= START,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `After a ${SHORT}-minute bake time, a check compares the canary’s failures with everyone else’s.`,
    act: 'Predict what the check says.',
    say: { block: 'box', text: 'The check' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'check',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Step to the check at ${clock(checkAt(SHORT))}.`,
    predicate: s => s.p1 !== null && s.t >= checkAt(SHORT),
  },
  {
    id: 'bake',
    focus: 'bake',
    visibleControls: ['out1', 'bake'],
    narration: `A false alarm: ${ALARM.canary![0]} failure in ${ALARM.canary![1]} canary checkouts looked worse than ${ALARM.rest![0]} in ${ALARM.rest![1]}.`,
    act: `Set the bake time to ${LONG} minutes.`,
    say: { block: 'box', text: 'Luck' },
    predicate: s => s.bake === LONG,
  },
  {
    id: 'pass',
    focus: 'stage',
    visibleControls: ['bake'],
    narration: 'More checkouts make luck smaller.',
    act: `Step to the new check at ${clock(checkAt(LONG))}.`,
    predicate: s => s.bake === LONG && s.t >= checkAt(LONG),
  },
  {
    id: 'miss',
    focus: 'change',
    visibleControls: ['change'],
    narration: `Passed. The ${SMALL.short} fails ${pct(SMALL.rate)} of checkouts, against ${pct(BASE)} on the old page.`,
    act: `Switch the canary to the ${SMALL.short}.`,
    say: { block: 'new', text: 'A small bug' },
    predicate: s => s.change === SMALL.id && s.bake === LONG && s.t >= checkAt(LONG),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['link', 'quiz'],
    narration: 'It passed too: a miss. A gap under the threshold looks just like luck, so it reached everyone.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many checkouts does one failure in ten come from?',
  },
];

export default function AFewFirst() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ change: GOOD.id, bake: SHORT, t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.change, state.bake);
        return (
          <ReleasesStage
            run={r}
            t={state.t}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t })}
            caption={`${clock(state.t)}. The ${r.change.short}, a ${state.bake}-minute bake.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="canary-strict" />
          </>
        ),
        bake: ({ state, apply }) => (
          <Pick
            id="rl-bake"
            name="Bake time"
            value={state.bake}
            values={[SHORT, LONG]}
            text={v => `${v} minutes`}
            onChange={bake => apply({ ...state, bake })}
          />
        ),
        change: ({ state, apply }) => (
          <fieldset className="rl-row">
            <legend>The canary’s change</legend>
            {[GOOD, SMALL].map(c => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="rl-change"
                  checked={state.change === c.id}
                  onChange={() => apply({ ...state, change: c.id })}
                />{' '}
                {c.name}
              </label>
            ))}
          </fieldset>
        ),
        link: () => (
          <>
            <Fact id="canary-compare" />
            <p className="note rl-note">
              Same luck as a fair test’s: <a href="/ab-testing/02-luck/">how big a gap luck makes, in A/B testing</a>.
            </p>
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
