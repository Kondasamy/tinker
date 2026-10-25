// Chapter 4: lost in the post. Wen's long line loses one packet (seeded: the hinge photo's). The reader predicts what
// it costs, turns loss on and watches the cart tip into the ditch, then compares nearby Ines on the waterfall.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, customerOf, runOf, type CustomerId } from '../../lib/web-requests/sim';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CustomerPicker, Fact, SimNote, WebStage, msOf, type View } from './kit';

const MODULE = 'web-requests',
  ID = '04-lost-in-the-post';
export const PARTS = TOWN_PARTS;
const INES = customerOf('ines'),
  WEN = customerOf('wen');
export const runFor = (id: CustomerId, loss: boolean) => runOf(id, { http: '1.1', loss });
const LOST = runFor('wen', true).phases.find(p => p.lost)!;
export const COST = runFor('wen', true).total - runFor('wen', false).total;

export const P1 = {
  question: `${WEN.name}’s ${LOST.file ?? 'packet'} is lost once on the way. How much longer will his page take?`,
  options: [
    'One more round trip, to send it again',
    'About a second more: it waits out a timeout first',
    'No longer: the other files arrive meanwhile',
  ],
};
export const outcomeOf = () => (COST >= ASSUMPTIONS.rtoMs * 0.8 ? 1 : COST > 0 ? 0 : 2);

export const QUIZ = {
  question:
    'On a hotel’s weak Wi-Fi, a video call freezes for about a second now and then, though a speed test looks fine. What fits best?',
  options: [
    'Lost packets: each waits out a timeout before it is sent again',
    'The other caller’s camera is slow',
    'The speed test was measuring the wrong server',
  ],
  correct: 0,
  explanation: 'A loss is noticed only when no reply comes, so each one costs a whole timeout, whatever the speed.',
  why: [
    'Right: speed tests measure how much flows, but a lost packet stalls until the timeout says to send it again.',
    'A slow camera would make the picture poor all the time, not freeze it in short bursts.',
    'Short freezes now and then point at losses on the line, not at which server was tested.',
  ],
};

interface S {
  loss: boolean;
  who: CustomerId;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${WEN.name}’s long line loses a packet now and then. The sender waits a timeout for a reply, then sends it again.`,
    act: 'Predict what one loss costs.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'loss',
    focus: 'loss',
    visibleControls: ['p1', 'loss'],
    narration: 'Your pick is locked.',
    act: 'Turn on lossy lines.',
    say: { block: 'road', text: 'Lost, resent' },
    predicate: s => s.loss && s.p1 !== null,
  },
  {
    id: 'ines',
    focus: 'who',
    visibleControls: ['out1', 'who'],
    narration: `One loss cost ${WEN.name} ${msOf(COST)}. ${INES.name}’s short line lost nothing today.`,
    act: `Switch to ${INES.name}.`,
    predicate: s => s.who === 'ines',
  },
  {
    id: 'fall',
    focus: 'tab',
    visibleControls: ['who', 'tab'],
    narration: 'The waterfall shows each customer’s wait step by step, the lost one in red.',
    act: 'Open the Waterfall tab.',
    predicate: s => s.view === 'fall',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['who', 'quiz'],
    narration: 'Far lines pay twice: longer round trips, and more chances to lose a packet.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How does a sender learn a packet was lost?',
  },
];

export default function LostInThePost() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ loss: false, who: 'wen', p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.who, state.loss),
          c = customerOf(state.who);
        return (
          <WebStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              town: townAt(r),
              run: r,
              caption: r.lost.length
                ? `${c.name}: a packet was lost and sent again. Page in ${msOf(r.total)}.`
                : `${c.name}: nothing lost. Page in ${msOf(r.total)}.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        loss: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.loss}
            onClick={() => apply({ ...state, loss: !state.loss })}
          >
            Lossy lines
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="rto" />
            <SimNote />
          </>
        ),
        who: ({ state, apply }) => (
          <CustomerPicker
            only={['wen', 'ines']}
            label="Show the page load of"
            value={state.who}
            onPick={who => apply({ ...state, who })}
          />
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'fall' })}>
            Open the Waterfall tab
          </button>
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
