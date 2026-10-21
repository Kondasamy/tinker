// Chapter 5: mishearing. Ravi reads out an order number; speech-to-text writes a different one and flags it as unsure
// (both recorded). Acting at once answers about the wrong order; reading the unsure number back costs one short turn and
// catches it. The read-back is a host rule, so the recording is keyed by it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DEFAULT_LINE, runCall } from '../../lib/voice/engine';
import { latency, ms } from '../../lib/voice/latency';
import { clipOf } from '../../lib/voice/turns';
import { textOf } from '../../lib/voice/script';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { RecordedNote, Toggle, Transcript, VoiceStage, segmentsOf } from './kit';

const MODULE = 'voice', ID = '05-mishearing';
const BASE = { ...DEFAULT_LINE, streaming: true, silence: 800 as const, bargeIn: true };
const runOf = (readBack: boolean) => runCall('mishear', { ...BASE, readBack });
const DIRECT = runOf(false), CONFIRM = runOf(true);
const HEARD = DIRECT.recording.turns[0];
/** the read-back's cost: the assistant asking, then Ravi answering */
const COST = latency('mishear-readback', true).firstSound + clipOf('mishear-readback').ms + clipOf('mishear-correct').ms;

interface S { taken: boolean; p1: number | null; readBack: boolean; quiz: number | null }

const P1 = {
  question: 'Speech-to-text flagged the number as unsure. What is the cheapest way to stop the assistant acting on a misheard number?',
  options: [
    'Read the number back and wait for a yes before looking it up',
    'Trust it: the model will notice something is off',
    'Ask Ravi to spell out everything he says',
  ],
};
/** read off the recordings: does the read-back turn a wrong answer right? */
export const outcome = () => (DIRECT.recording.verdict === 'wrong' && CONFIRM.recording.verdict === 'ok' ? 0 : 1);

const QUIZ = {
  question: 'A pharmacy line hears a prescription number with low confidence. The number it heard belongs to a real prescription. What happens if it looks it up straight away?',
  options: [
    'The lookup fails, so no harm is done',
    'It finds someone else’s prescription, and answers about it with confidence',
    'Speech-to-text corrects itself on the second try',
  ],
  correct: 1,
  explanation: 'A misheard number can be a real one, so nothing downstream notices. Only the caller can say it is wrong.',
  why: [
    'It would fail only if the misheard number didn’t exist. Here it does, so the lookup succeeds on the wrong record.',
    'Right. That is why unsure numbers are read back before anything is done with them.',
    'Nothing makes speech-to-text listen again unless the line asks the caller.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'take', focus: 'take', visibleControls: ['take'],
    narration: 'Ravi calls to check on an order and reads out its number. Take the call.',
    predicate: s => s.taken,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['direct', 'p1'],
    narration: `A mishearing is speech-to-text writing a different word from the one said. Ravi said “${textOf('mishear-caller')}”; it wrote “${HEARD.text}”. Each word comes with a confidence, how sure the model is of it, and this number came out unsure. The lookup found a real order, someone else’s, and the answer sounds sure. Before you change anything:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'readback', focus: 'readback', visibleControls: ['p1', 'readback'],
    narration: 'Turn the read-back rule on: when a number comes out unsure, the assistant says it back and waits for a yes before acting on it.',
    predicate: s => s.readBack,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['outcome', 'quiz'],
    narration: `Ravi corrected the number, and the lookup ran on the right order. The read-back cost about ${ms(COST)}: one short question and one short answer. Numbers, names and codes are where speech-to-text slips, because nothing around them says what they should be. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can the lookup tell that the number it was given is the wrong one?',
  },
];

export default function Mishearing() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ taken: false, p1: null, readBack: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, focus }) => {
        const r = state.readBack ? CONFIRM : DIRECT;
        return (
          <VoiceStage step={focus} shown={{
            phone: state.taken ? { stage: state.readBack ? 'reply' : 'stt', unsure: true, wait: state.readBack ? r.wait : null } : { stage: 'idle' },
            timeline: state.taken ? segmentsOf(r) : undefined,
            caption: !state.taken ? 'The phone desk, waiting for Ravi.' : state.readBack ? 'Read-back on: the assistant checks the unsure number before the lookup.'
              : `The ear sends “${HEARD.text}” to the model, flagged unsure.`,
          }} />
        );
      }}
      controls={{
        take: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, taken: true })}>Take Ravi’s call</button>,
        direct: () => <Transcript run={DIRECT} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        readback: ({ state, sync }) => (
          <>
            <div className="vo-row"><Toggle label="Read back unsure numbers" on={state.readBack} onChange={v => sync({ ...state, readBack: v })} /></div>
            {state.readBack && <Transcript run={CONFIRM} />}
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Transcript run={CONFIRM} />
            <RecordedNote />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
