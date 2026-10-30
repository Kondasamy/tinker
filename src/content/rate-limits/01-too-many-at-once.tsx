// Chapter 1: too many at once. No limit at the door; Quickfix's runaway script floods the stock API from 0:05, the
// server passes its capacity and falls over, and Oakmoor's steady requests fail with everyone else's. The reader
// slides the clock, predicts Oakmoor's fate, then reads the lost requests on the Requests tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CAPACITY, SCENES, clock, runOf, tally } from '../../lib/rate-limits/sim';
import { BARREL_PARTS } from '../../components/scenes/barrelScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RateStage, SimNote, type View } from './kit';

const MODULE = 'rate-limits',
  ID = '01-too-many-at-once';
export const PARTS = BARREL_PARTS;
export const RUN = runOf(SCENES.flood);
export const START = RUN.hits.find(h => h.key === 'quickfix')!.at;
export const FIRST_DOWN = RUN.downs[0][0];
export const LOOK = Math.ceil((FIRST_DOWN + 1000) / 1000) * 1000;
export const OAK = tally(RUN, 0, RUN.ms + 1, 'oakmoor');

export const P1 = {
  question: `Quickfix floods the API from ${clock(START)}. What happens to Oakmoor Builders’ steady requests?`,
  options: [
    'Some fail too: the server falls over for everyone',
    'They all get through: Oakmoor sends slowly',
    'They wait in line, then all get through',
  ],
};
export const outcomeOf = () => (OAK.down > 0 ? 0 : 1);

export const QUIZ = {
  question: 'Concert tickets go on sale, and one buyer’s bot sends thousands of requests a second. Who suffers?',
  options: ['Every buyer, once the site falls over', 'Only the bot’s owner', 'No one: the site answers in order'],
  correct: 0,
  explanation: 'Past its capacity a server fails everyone, so one runaway client hurts all the others.',
  why: [
    'Right: once the site is past what it can answer, every buyer’s page fails, not just the bot’s.',
    'The site can’t tell the bot apart unless something at the door counts who asks.',
    'A server past its capacity doesn’t queue politely; it slows and then falls over.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'steady',
    focus: 'stage',
    visibleControls: [],
    narration: `Partners’ programs send requests to Larkspur’s API for stock. Its capacity: ${CAPACITY} answers a second.`,
    act: `Slide the time to ${clock(4000)}.`,
    say: { block: 'door', text: 'The API' },
    predicate: s => s.t >= 4000,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `At ${clock(START)} Quickfix’s script starts sending over 80 a second, and nothing at the door stops it.`,
    act: 'Predict Oakmoor’s requests.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'watch',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: `Slide to ${clock(LOOK)}.`,
    say: { block: 'door', text: 'Server down' },
    predicate: s => s.p1 !== null && s.t >= LOOK,
  },
  {
    id: 'reveal',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `Past ${CAPACITY} a second the server fell over. Oakmoor lost ${OAK.down} of ${OAK.sent} requests, and did nothing wrong.`,
    act: 'Open the Requests tab.',
    predicate: s => s.view === 'requests',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Dark bars are requests lost while the server was down: everyone’s, not just Quickfix’s.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a fallen server answer anyone?',
  },
];

export default function TooManyAtOnce() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RateStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onTime={t => sync({ ...state, t, view: 'scene' })}
          step={250}
          show={{ run: RUN, t: state.t, caption: `${clock(state.t)}. No limit at the door.` }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="note rl-note">
              Spreading requests over more servers raises the ceiling: <a href="/load-balancing/">Load balancing</a>.
            </p>
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'requests' })}>
            Open the Requests tab
          </button>
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
