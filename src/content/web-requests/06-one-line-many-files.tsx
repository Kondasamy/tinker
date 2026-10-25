// Chapter 6: one line, many files. Wen's lossy line again. The reader reads HTTP/1.1's queued connections off the
// waterfall, predicts what one lost photo does under HTTP/2, switches to it and sees every stream held back, then
// switches to HTTP/3, where QUIC holds back only the lost one.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { FILES, HTTPS, customerOf, runOf, type Http } from '../../lib/web-requests/sim';
import { TOWN_PARTS, townAt } from '../../components/scenes/townScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, SimNote, WebStage, msOf, type View } from './kit';

const MODULE = 'web-requests',
  ID = '06-one-line-many-files';
export const PARTS = TOWN_PARTS;
const WEN = customerOf('wen');
export const runFor = (http: Http) => runOf('wen', { http, loss: true, ttl: 60 });
export const heldBack = (http: Http) => runFor(http).phases.filter(p => p.stalled > 0).length;
const LOST = runFor('2').phases.find(p => p.lost)!;

export const P1 = {
  question: `Under HTTP/2, ${WEN.name}’s ${LOST.file} packet is lost. What happens to the other files on the line?`,
  options: [
    'They arrive on time: each has its own stream',
    'They wait too: the connection hands over bytes in order',
    'They are lost as well, and all sent again',
  ],
};
export const outcomeOf = () => (heldBack('2') === FILES.length - 1 ? 1 : heldBack('2') === 0 ? 0 : 2);

export const QUIZ = {
  question:
    'A news site runs on HTTP/2. On a shaky train line, one packet of a big photo is lost. What do readers notice?',
  options: [
    'The whole page pauses until that packet is sent again',
    'Only the photo is late; the text arrives on time',
    'Nothing: HTTP/2 resends lost packets instantly',
  ],
  correct: 0,
  explanation: 'HTTP/2’s streams share one TCP connection, which hands over bytes only in order.',
  why: [
    'Right: every stream behind the lost packet waits for it, which is head-of-line blocking.',
    'That is what HTTP/3 over QUIC does; over TCP the text waits behind the photo’s packet.',
    'A loss is still only noticed after a timeout, whatever runs on top of the connection.',
  ],
};

interface S {
  http: Http;
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'h1',
    focus: 'tab',
    visibleControls: ['http', 'tab'],
    narration: `The page names ${FILES.length} more files, fetched over HTTP. HTTP/1.1 asks one per connection at a time, opening extra connections.`,
    act: 'Open the Waterfall tab.',
    predicate: s => s.view === 'fall',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'HTTP/2 sends every file at once on one connection, each on its own stream.',
    act: 'Predict what one loss does.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'h2',
    focus: 'http',
    visibleControls: ['p1', 'http'],
    narration: 'Your pick is locked.',
    act: 'Switch to HTTP/2.',
    predicate: s => s.http === '2' && s.p1 !== null,
  },
  {
    id: 'h3',
    focus: 'http',
    visibleControls: ['out1', 'http'],
    narration: 'Every file waited: head-of-line blocking. HTTP/3 runs on QUIC, which recovers each stream on its own.',
    act: 'Switch to HTTP/3.',
    say: { block: 'road', text: 'One stream waits' },
    predicate: s => s.http === '3',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['http', 'quiz'],
    narration: `HTTP/3 also folds the handshakes into one: ${msOf(runFor('3').phases[0].end)} to set up, not ${msOf(runFor('2').phases[1].end)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'In what order does one TCP connection hand bytes to the browser?',
  },
];

export default function OneLineManyFiles() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ http: '1.1', p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runFor(state.http);
        const held = heldBack(state.http);
        return (
          <WebStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              town: townAt(r),
              run: r,
              caption: `HTTP/${state.http}, ${r.connections} ${r.connections === 1 ? 'connection' : 'connections'}: ${
                held ? `${held} files held back behind the lost one` : 'no file held back'
              }. Page in ${msOf(r.total)}.`,
            }}
          />
        );
      }}
      controls={{
        http: ({ state, apply }) => (
          <div className="wr-row" role="group" aria-label="HTTP version">
            {HTTPS.map(h => (
              <button
                key={h}
                type="button"
                className="chip"
                aria-pressed={state.http === h}
                onClick={() => apply({ ...state, http: h })}
              >
                {`HTTP/${h}`}
              </button>
            ))}
          </div>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'fall' })}>
            Open the Waterfall tab
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="h3-hol" />
            <Fact id="quic-handshake" />
            <SimNote />
          </>
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
