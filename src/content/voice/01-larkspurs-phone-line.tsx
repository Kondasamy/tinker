// Chapter 1: Larkspur's phone line. Dana's call runs through the chained line a stage at a time: her voice to the ear,
// the transcript (recorded) to the model, the reply (recorded) to the mouth, the spoken reply back down the line. Every
// line has a clip button and its words; the chapter plays the same with the sound off.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DEFAULT_LINE, runCall } from '../../lib/voice/engine';
import { textOf } from '../../lib/voice/script';
import type { Stage } from '../../components/scenes/phoneScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { RecordedNote, Say, VoiceStage } from './kit';

const MODULE = 'voice', ID = '01-larkspurs-phone-line';
const RUN = runCall('status', DEFAULT_LINE), HEARD = RUN.recording.turns[0], REPLY = RUN.recording.turns[1].clip;
/** the stages after the caller speaks, in order */
const STAGES: Stage[] = ['caller', 'stt', 'model', 'tts', 'reply'];

interface S { at: number; p1: number | null; quiz: number | null }

const P1 = {
  question: 'Dana has finished speaking. Before the model can look her order up, what does it need from her voice?',
  options: ['The sound itself, passed straight to it', 'Her words, written down as text', 'Nothing: the order system hears her directly'],
};
/** the chained line Larkspur built hands the model text: the outcome is the line's own design */
const OUTCOME = 1;

const QUIZ = {
  question: 'A caller says the assistant answered about the wrong order. Whose work do you read first?',
  options: ['The mouth’s: text-to-speech may have said the number wrong', 'The ear’s: the transcript shows what the line heard', 'The phone’s: the line may have been noisy'],
  correct: 1,
  explanation: 'Everything after the ear is built on its transcript, and it is text you can read.',
  why: [
    'The mouth reads out what the model wrote. A wrong order in the reply was already wrong in the text.',
    'Right. If the transcript has the wrong number, the lookup and the reply follow it. It is the first place to look.',
    'Noise may be the cause, but the transcript is where you can see whether it did any harm.',
  ],
};

const SAYS: Partial<Record<Stage, string>> = {
  caller: 'Dana is speaking. Her voice rides the belt to the ear.',
  stt: `The ear has written her words down: “${HEARD.text}”`,
  model: 'The model reads the transcript, looks the order up, and writes its reply as text.',
  tts: `The reply’s text goes to the mouth: “${textOf(REPLY)}”`,
  reply: 'The mouth speaks the reply, and it rides back to Dana’s phone.',
};

export const STEPS: Step<S>[] = [
  {
    id: 'ring', focus: 'ring', visibleControls: ['ring'],
    narration: 'In the Tool calling module the assistant looked orders up with a tool, in text. Larkspur now puts the same assistant on a phone line. The picture is the phone desk: the phone, an ear, the model and a mouth, joined by belts. Answer Dana’s call.',
    predicate: s => s.at >= 0,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['said', 'p1'],
    narration: 'Dana asks where her order is. Press Play to hear her, or read her words: the sound is optional everywhere in this module. Before her question moves on:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'stages', focus: 'next', visibleControls: ['p1', 'next'],
    narration: 'Send the call along the line, one stage at a time, and watch what rides each belt.',
    predicate: s => s.at === STAGES.length - 1,
    hint: 'Press “Next stage” until the reply reaches Dana’s phone.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['outcome', 'quiz'],
    narration: 'Three stages: speech-to-text (the ear) writes down the voice, the model reads and writes text, text-to-speech (the mouth) reads the reply out. This is a chained pipeline, and the model in the middle is the same text model as before. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which stage turns sound into the words everything else reads?',
  },
];

export default function LarkspursPhoneLine() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: -1, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, focus }) => {
        const stage = state.at < 0 ? 'idle' : STAGES[state.at];
        return <VoiceStage step={focus} shown={{ phone: { stage }, caption: state.at < 0 ? 'The phone desk, waiting for a call.' : SAYS[stage]! }} />;
      }}
      controls={{
        ring: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, at: 0 })}>Answer Dana’s call</button>,
        said: () => <Say clip="status-caller" />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        next: ({ state, sync }) => (
          <>
            <button type="button" className="big" disabled={state.at >= STAGES.length - 1} onClick={() => sync({ ...state, at: Math.min(STAGES.length - 1, state.at + 1) })}>Next stage</button>
            {state.at >= 1 && <p className="vo-heard" style={{ marginLeft: 0 }}><span className="vo-tag">recorded</span> Speech-to-text wrote: “{HEARD.text}”</p>}
            {state.at >= 4 && <Say clip={REPLY} />}
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
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
