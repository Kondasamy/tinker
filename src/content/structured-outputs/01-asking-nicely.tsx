// Chapter 1: asking nicely. Larkspur mini is asked for an order's status as JSON, with no schema, and writes prose,
// live. The prediction's answer is read off the live run (answerOf), never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { play, run } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, PinnedStage, Waiting, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs', ID = '01-asking-nicely';
export const RUN = run('asking');

const parses = (t: string) => { try { JSON.parse(t); return true; } catch { return false; } };
/** 0: JSON, 1: prose (anything that doesn't parse). */
export const answerOf = (model: Model) => (parses(play(model, RUN).decoded.text) ? 0 : 1);

interface S { asked: boolean; p1: number | null; revealed: boolean; quiz: number | null }

const P1 = {
  question: `Larkspur mini gets the prompt “${RUN.prompt}”. What will it write?`,
  options: ['A JSON object, like {"status":"on time"}', 'Text that isn’t JSON'],
};

const QUIZ = {
  question: 'A teammate says: “A big provider model would follow ‘as JSON’ in the prompt, so we don’t need anything else.” What do you tell them?',
  options: [
    'Right: big models always follow format instructions',
    'Usually, but a request in the prompt is not a guarantee; one answer in many can still break the format, and the program reading it breaks too',
    'Right, as long as the prompt says “please”',
    'No model can ever write JSON',
  ],
  correct: 1,
  explanation: 'A prompt asks; nothing makes the model obey. A program that reads every answer needs a guarantee, not a habit.',
  why: [
    'Bigger models follow instructions far more often than Larkspur mini, but “far more often” is not every time, and the order system reads every answer.',
    'Right. Asking shifts the odds; it doesn’t fix the shape. That is why providers offer modes that enforce a schema, which this module builds up to.',
    'Politeness changes the wording of a request, not what the model is able or forced to write.',
    'Models write JSON all the time when it is likely text. Larkspur mini doesn’t because it never saw any; the issue is the guarantee, not the ability.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask', focus: 'ask', visibleControls: ['ask'],
    narration: 'Larkspur’s order system reads the assistant’s answers with a program, not a person. It wants JSON: fields in curly braces, like {"status":"delayed"}. Larkspur mini is the tiny model from Transformers, trained only on Larkspur’s documents, running here in your browser. The simplest plan: ask for JSON in the prompt.',
    predicate: whenLoaded(s => s.asked),
    hint: 'Press the button. If the model is still loading, wait for the picture to settle.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'The press reads the prompt; tiles will drop onto the belt, one per token it writes. Nothing stands across the belt: no schema yet. Before you watch:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. Let it write until its 32-token window is full.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'quiz'],
    narration: 'Larkspur mini has never seen JSON: Larkspur’s documents are prose, so prose is what it writes. A bigger model would likely do better. Likely is the problem: the order system reads every answer, and one that isn’t JSON breaks it. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a request in the prompt change what the model is able to write, or only what it is likely to write?',
  },
];

export default function AskingNicely() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ asked: false, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <PinnedStage id={RUN.id} masked={false} at={state.revealed ? 32 : 0}
          caption={state.revealed ? 'No schema: the model writes whatever it finds likeliest. Larkspur mini’s answer, live.' : `The prompt: “${RUN.prompt}”`} />
      )}
      controls={{
        ask: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, asked: true })}>Ask: “{RUN.prompt}”</button>
            {!model && <Waiting />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true })}>Let it write</button>,
        out1: ({ state }) => model ? (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} />
            <Answer label="Larkspur mini wrote" text={play(model, RUN).decoded.text} />
          </>
        ) : <Waiting />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="openai-vs-json-mode" />
          </>
        ),
      }}
    />
  );
}
