// Chapter 3: hello, hello, ready. The reader opens a TCP connection for nearby Ines, predicts far-off Wen's, opens his,
// and reads off the waterfall that nothing is sent until the handshake's round trip is done.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { customerOf, runOf, type CustomerId } from '../../lib/web-requests/sim';
import { TOWN_PARTS, idleTown, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CustomerPicker, Fact, SimNote, WebStage, msOf, type View } from './kit';
import { num } from '../../lib/format';

const MODULE = 'web-requests',
  ID = '03-hello-hello-ready';
export const PARTS = TOWN_PARTS;
const INES = customerOf('ines'),
  WEN = customerOf('wen');
export const runFor = (id: CustomerId) => runOf(id, { http: '1.1' });
/** the town up to and including the TCP handshake */
const upToTcp = (id: CustomerId) => runFor(id).phases.findIndex(p => p.kind === 'tcp') + 1;
export const handshakeMs = (id: CustomerId) => {
  const p = runFor(id).phases.find(x => x.kind === 'tcp')!;
  return p.end - p.start;
};

export const P1 = {
  question: `${INES.name}’s handshake took ${msOf(handshakeMs('ines'))} over ${num(INES.km)} km. ${WEN.name} is ${num(WEN.km)} km away. His?`,
  options: [
    'About the same: a handshake is three short messages',
    'Far longer: each message has to cross the whole distance',
    'Shorter: a far line is a faster line',
  ],
};
export const outcomeOf = () => {
  const r = handshakeMs('wen') / handshakeMs('ines');
  return r > 2 ? 1 : r < 0.9 ? 2 : 0;
};

export const QUIZ = {
  question:
    'A game’s server is in one city; its players are 5,000 km away and every match opens a new connection. What cuts the setup wait most?',
  options: [
    'A server nearer the players, so each round trip is shorter',
    'A faster processor in the server',
    'Smaller game files',
  ],
  correct: 0,
  explanation: 'A handshake is a round trip, and a round trip’s length is set by the distance.',
  why: [
    'Right: the handshake can’t start the game until its round trip is done, and distance sets that time.',
    'The server answers a handshake almost at once; the wait is the messages’ trip, not its thinking.',
    'Nothing is sent until the handshake ends, so file size doesn’t touch the setup wait.',
  ],
};

interface S {
  who: CustomerId | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'ines',
    focus: 'who',
    visibleControls: ['who'],
    narration:
      'Address known, the browser opens a TCP connection: hello, hello back, ready. This handshake costs one round trip.',
    act: `Open one for ${INES.name}.`,
    say: { block: 'road', text: 'One round trip' },
    predicate: s => s.who === 'ines',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${INES.name} lives close by. ${WEN.name} lives across the map.`,
    act: `Predict ${WEN.name}’s handshake.`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'wen',
    focus: 'who',
    visibleControls: ['p1', 'who'],
    narration: 'Your pick is locked.',
    act: `Open one for ${WEN.name}.`,
    say: { block: 'shop', text: 'Far away' },
    predicate: s => s.who === 'wen' && s.p1 !== null,
  },
  {
    id: 'fall',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: 'Nothing is sent until the handshake ends, so distance taxes every page before its first byte.',
    act: 'Open the Waterfall tab.',
    predicate: s => s.view === 'fall',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Every handshake costs a round trip, and distance multiplies it.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does the handshake’s time go: in the server, or on the road?',
  },
];

export default function HelloHelloReady() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ who: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const who = state.who;
        return (
          <WebStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={
              who
                ? {
                    town: townAt(runFor(who), upToTcp(who)),
                    run: runFor(who),
                    caption: `${customerOf(who).name}’s TCP handshake: ${msOf(handshakeMs(who))} over ${num(customerOf(who).km)} km.`,
                  }
                : { town: idleTown(INES), caption: 'No connection open yet.' }
            }
          />
        );
      }}
      controls={{
        who: ({ state, apply }) => (
          <CustomerPicker
            only={['ines', 'wen']}
            label="Open a connection for"
            value={state.who}
            onPick={who => apply({ ...state, who })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="tcp-handshake" />
            <SimNote />
          </>
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
