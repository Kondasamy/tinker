// Chapter 4: deploy now, switch on later. Gift wrap is deployed dark behind a feature flag; the reader turns the rollout
// dial up (the flag's share), watches failures climb, predicts how fast the flag goes back, switches it off, and sees
// the new track empty within a minute.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { FLAG_OFF, ROLLBACK, SCENES, changeOf, clock, pct, runOf, tickOf, type Event } from '../../lib/releases/sim';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '04-deploy-now-switch-on-later';
export const PARTS = SIGNAL_PARTS;
export const GIFT = changeOf(SCENES.flag.change);
export const runFor = (events: Event[]) => runOf({ ...SCENES.flag, events });
/** minutes to watch after the first turn of the dial */
export const WATCH = 3;
const firstDial = (events: Event[]) => events.find(e => e.kind === 'dial' && e.share > 0);

export const P1 = {
  question: 'You switch the flag off. When do checkouts stop failing?',
  options: ['Within a minute', `In about ${ROLLBACK} minutes, like a rollback`, 'Only after the next deploy'],
};
export const outcomeOf = (events: Event[]) => {
  const r = runFor(events);
  return r.safeAt !== null && r.safeAt - r.backAt! <= FLAG_OFF ? 0 : 1;
};

export const QUIZ = {
  question:
    'A bank deploys a new statement page behind a flag on Monday, and switches the flag on for everyone on Friday. When do customers first see it?',
  options: ['Friday, when the flag goes on', 'Monday, when it is deployed', 'Not until a second deploy'],
  correct: 0,
  explanation: 'The deploy puts the code out switched off; the flag decides when anyone sees it.',
  why: [
    'Right: the code sat on the servers all week, switched off.',
    'Monday’s deploy shipped the code with the flag off, so nobody saw it.',
    'A flag changes without a deploy; that is the point of it.',
  ],
};

interface S {
  t: number;
  events: Event[];
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'dark',
    focus: 'stage',
    visibleControls: [],
    narration: `The ${GIFT.short} code is deployed to every server, but its feature flag is off: nobody sees it.`,
    act: 'Turn the dial up to 10%.',
    say: { block: 'flag', text: 'Flag off' },
    predicate: s => !!firstDial(s.events),
    solution: s => ({ ...s, events: [...s.events, { t: s.t, kind: 'dial', share: 0.1 }] }),
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: [],
    narration: `The flag now shows ${GIFT.short} to that share. Watch its failures on the new track.`,
    act: `Play, or Step ${WATCH} minutes.`,
    say: { block: 'new', text: 'Failing' },
    predicate: s => {
      const d = firstDial(s.events);
      return !!d && s.t >= d.t + WATCH;
    },
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A rollback took ${ROLLBACK} minutes in chapter 1.`,
    act: 'Predict how fast the flag goes back.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'off',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Switch the flag off.',
    say: { block: 'flag', text: 'Switch it' },
    predicate: s => s.events.some(e => e.kind === 'back'),
    solution: s => ({ ...s, events: [...s.events, { t: s.t, kind: 'back' }] }),
  },
  {
    id: 'gone',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'No new code ships to switch it off: every server just reads the flag.',
    act: 'Step until the new track is empty.',
    predicate: s => {
      const r = runFor(s.events);
      return r.safeAt !== null && s.t >= r.safeAt;
    },
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration:
      'Deploy and release are two moves; the flag decides who sees it, and real flag services switch in under a second.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which of the two moves puts the page in front of people?',
  },
];

export default function DeployNowSwitchOnLater() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 1, events: [], p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => {
        const r = runFor(state.events),
          k = tickOf(r, state.t);
        return (
          <ReleasesStage
            run={r}
            t={state.t}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t })}
            onDial={share => apply({ ...state, events: [...state.events, { t: state.t, kind: 'dial', share }] })}
            // the flag's off switch waits for the prediction
            {...(state.p1 !== null
              ? { onBack: () => apply({ ...state, events: [...state.events, { t: state.t, kind: 'back' }] }) }
              : {})}
            caption={`${clock(state.t)}. Flag ${k.share > 0 && !k.backing ? `on for ${pct(k.share)}` : 'off'}; ${k.hurtSoFar} hurt so far.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.events)} />
            <Fact id="toggles" />
            <Fact id="flag-speed" />
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
