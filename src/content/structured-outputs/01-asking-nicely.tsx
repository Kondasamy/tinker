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
import { STENCIL_PARTS } from '../../components/scenes/stencilScene';
import { Answer, CTX, Fact, PinnedStage, Waiting, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs',
  ID = '01-asking-nicely';
export const RUN = run('asking');
export const PARTS = STENCIL_PARTS;

const parses = (t: string) => {
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
};
/** 0: JSON, 1: prose (anything that doesn't parse). */
export const answerOf = (model: Model) => (parses(play(model, RUN).decoded.text) ? 0 : 1);

interface S {
  asked: boolean;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `Larkspur mini gets the prompt “${RUN.prompt}”. What will it write?`,
  options: ['A JSON object, like {"status":"on time"}', 'Text that isn’t JSON'],
};

export const QUIZ = {
  question:
    'A teammate says: “A big provider model would follow ‘as JSON’ in the prompt, so we don’t need anything else.” What do you tell them?',
  options: [
    'Right: big models always follow format instructions',
    'Usually, but a request in the prompt is not a guarantee; one answer in many can still break the format, and the program reading it breaks too',
    'Right, as long as the prompt says “please”',
    'No model can ever write JSON',
  ],
  correct: 1,
  explanation:
    'A prompt asks; nothing makes the model obey. A program that reads every answer needs a guarantee, not a habit.',
  why: [
    'Bigger models follow instructions far more often than Larkspur mini, but “far more often” is not every time, and the order system reads every answer.',
    'Right: asking shifts the odds but doesn’t fix the shape, which is why providers offer modes that enforce a schema.',
    'Politeness changes the wording of a request, not what the model is able or forced to write.',
    'Models write JSON whenever it is likely text, and Larkspur mini doesn’t only because it never saw any; the issue is the guarantee, not the ability.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration:
      'Larkspur mini runs in your browser, trained only on Larkspur’s documents. The system wants a structured output: JSON a program can read.',
    act: 'Ask for JSON.',
    say: { block: 'press', text: 'Asked for JSON' },
    predicate: whenLoaded(s => s.asked),
    hint: 'Press the button. If the model is still loading, wait for the picture to settle.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Tiles drop onto the belt, one per token written. No plate crosses the belt: there is no schema yet.',
    act: 'Predict first.',
    say: { block: 'belt', text: 'No schema yet' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: `Let it write until its ${CTX}-token window is full.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration:
      'Larkspur mini never saw JSON, so it wrote prose. Bigger models likely do better, but likely isn’t enough for a program.',
    act: 'One question to finish.',
    say: { block: 'belt', text: 'Not JSON' },
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
      stage={({ state, say }) => (
        <PinnedStage
          say={say}
          id={RUN.id}
          masked={false}
          at={state.revealed ? CTX : 0}
          caption={
            state.revealed
              ? 'No schema: the model writes whatever it finds likeliest. Larkspur mini’s answer, live.'
              : `The prompt: “${RUN.prompt}”`
          }
        />
      )}
      controls={{
        ask: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, asked: true })}>
              Ask: “{RUN.prompt}”
            </button>
            {!model && <Waiting />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true })}>
            Let it write
          </button>
        ),
        out1: ({ state }) =>
          model ? (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} />
              <Answer label="Larkspur mini wrote" text={play(model, RUN).decoded.text} />
            </>
          ) : (
            <Waiting />
          ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="openai-vs-json-mode" />
          </>
        ),
      }}
    />
  );
}
