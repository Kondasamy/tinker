// Chapter 2: the latency budget. Dana's call is timed stage by stage (Larkspur's illustrative stage times, the site's
// token counts, the reply clip's length), then streaming is turned on: the first sound moves forward, and the model
// finishes writing at the same moment as before. The Timeline tab shows the wait as the gap between the two voices.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DEFAULT_LINE, runCall } from '../../lib/voice/engine';
import { HOST, ms } from '../../lib/voice/latency';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, PlanNote, Toggle, VoiceStage, segmentsOf, type View } from './kit';

const MODULE = 'voice', ID = '02-the-latency-budget';
const runOf = (streaming: boolean) => runCall('status', { ...DEFAULT_LINE, streaming });
const OFF = runOf(false), ON = runOf(true);

interface S { timed: boolean; p1: number | null; streaming: boolean; view: View; quiz: number | null }

const P1 = {
  question: 'Streaming lets the mouth start on the reply’s first sentence while the model is still writing the rest. What changes?',
  options: [
    'Dana hears the first word sooner; the model finishes writing at the same time',
    'Everything finishes sooner, the writing too',
    'Nothing: the model is the slow part either way',
  ],
};
/** read off the latency sums */
export const outcome = () => (ON.latency.firstSound < OFF.latency.firstSound ? (ON.latency.modelDone === OFF.latency.modelDone ? 0 : 1) : 2);

const QUIZ = {
  question: 'A restaurant’s booking line waits for its whole reply to be spoken into audio before playing any of it. Callers find it slow. What is the first change to try?',
  options: [
    'Stream: start speaking the first sentence while the rest is made',
    'Make the replies longer, so the wait feels worth it',
    'Turn the silence setting down to zero',
  ],
  correct: 0,
  explanation: 'The caller hears the first sound, not the last. Streaming brings it forward without changing the reply.',
  why: [
    'Right. Each stage hands on its first piece instead of waiting for its whole job, so the voice starts early.',
    'A longer reply takes longer to write and to speak: the wait gets worse.',
    'With no silence to wait for, the line would end turns at every breath and cut callers off (chapter 3).',
  ],
};

/** The wait, stage by stage, from Dana's last word. */
function Sums({ streaming }: { streaming: boolean }) {
  const r = streaming ? ON : OFF, l = r.latency, waitSilence = r.detected.fire - r.detected.lastWord;
  const rows: [string, number][] = [
    ['Waiting for silence to end her turn', waitSilence],
    ['Speech-to-text’s final transcript', l.stt],
    ['The model’s first token', l.modelFirst - l.stt],
    streaming
      ? [`The model writes the first sentence (${l.firstTokens} tokens)`, l.firstTokens * HOST.msPerToken]
      : [`The model writes the whole reply (${l.tokens} tokens)`, l.modelDone - l.modelFirst],
    streaming ? ['Text-to-speech starts on that sentence', HOST.ttsFirstMs] : ['Text-to-speech makes the whole reply’s audio', l.firstSound - l.modelDone],
  ];
  return (
    <div className="tc-def" data-streaming={streaming ? 1 : 0}>
      <p className="lbl">{streaming ? 'Streaming on' : 'Streaming off'}</p>
      <ul className="vo-sums">
        {rows.map(([what, v]) => <li key={what}><span>{what}</span><span>{ms(v)}</span></li>)}
        <li className="total" data-wait={r.wait}><span>Dana waits</span><span>{ms(r.wait!)}</span></li>
      </ul>
      <p className="vo-note">The model finishes writing {ms(waitSilence + l.modelDone)} after her last word either way.</p>
      <PlanNote />
    </div>
  );
}

export const STEPS: Step<S>[] = [
  {
    id: 'time', focus: 'time', visibleControls: ['time'],
    narration: 'Latency is how long something takes to respond; on a call, the gap between the caller’s last word and the first sound of the reply. Time Dana’s call from chapter 1, stage by stage.',
    predicate: s => s.timed,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['sumsOff', 'p1'],
    narration: 'Each stage waits for the one before it to finish, so the times add up. The biggest share is the model writing its whole reply and the mouth turning all of it into audio before Dana hears a word. Streaming passes work on in pieces as it is made. Before you turn it on:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'stream', focus: 'stream', visibleControls: ['p1', 'stream'],
    narration: 'Turn streaming on. The Timeline tab shows the call as two voices, with the wait as the gap between them.',
    predicate: s => s.streaming,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['outcome', 'quiz'],
    narration: `The first sound comes ${ms(OFF.wait! - ON.wait!)} sooner, and the model finishes writing exactly when it did. A latency budget shares the wait you can afford between the stages; streaming lets them overlap. For a sense of scale, people in conversation answer each other fast:`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which moment does the caller notice: the first sound, or the end of the writing?',
  },
];

export default function TheLatencyBudget() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ timed: false, p1: null, streaming: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus }) => {
        const r = state.streaming ? ON : OFF;
        return (
          <VoiceStage step={focus} view={state.view} onView={view => sync({ ...state, view })} shown={{
            phone: { stage: state.timed ? 'reply' : 'idle', wait: state.timed ? r.wait : null },
            timeline: state.timed ? segmentsOf(r) : undefined,
            caption: state.timed ? `Streaming ${state.streaming ? 'on' : 'off'}: the first sound ${ms(r.wait!)} after Dana’s last word.` : 'Dana’s call, ready to time.',
          }} />
        );
      }}
      controls={{
        time: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, timed: true })}>Time the call</button>,
        sumsOff: () => <Sums streaming={false} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        stream: ({ state, sync }) => (
          <>
            <div className="vo-row"><Toggle label="Streaming" on={state.streaming} onChange={v => sync({ ...state, streaming: v, view: 'timeline' })} /></div>
            <Sums streaming={state.streaming} />
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Sums streaming />
            <Fact id="stivers" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
