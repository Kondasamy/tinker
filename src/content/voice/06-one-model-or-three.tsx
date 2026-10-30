// Chapter 6: one model or three. The phone desk switches between the chained line (ear, model, mouth) and one
// speech-to-speech model. Nothing here is simulated beyond the picture: what each build offers comes from the cited facts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { PHONE_PARTS } from '../../components/scenes/phoneScene';
import { Fact, VoiceStage } from './kit';

const MODULE = 'voice',
  ID = '06-one-model-or-three';
type Mode = 'chained' | 's2s';
export const PARTS = PHONE_PARTS;

interface S {
  p1: number | null;
  mode: Mode;
  seen: Mode[];
  quiz: number | null;
}

const P1 = {
  question:
    'A speech-to-speech model hears audio and speaks audio, with no ear or mouth of its own. Compared with Larkspur’s three stages, what does the team give up?',
  options: [
    'A transcript the line can read and check before the model acts',
    'The ability to look orders up',
    'Turn-taking: speech-to-speech models never cut callers off',
  ],
};
/** read off the facts: the chained path is the one OpenAI recommends when each stage must be visible (openai-chained) */
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A bank wants every spoken request checked against its rules, as text, before the assistant does anything. Which build fits better?',
  options: [
    'Chained: the transcript is there to check before the model replies',
    'Speech-to-speech: one model is always simpler',
    'Either: the rules don’t depend on the build',
  ],
  correct: 0,
  explanation: 'The text between the stages is where the line can store and check what was said before acting.',
  why: [
    'Right: a chained line hands over text at each stage, so a rule can read it before the model replies.',
    'Simpler to run, but the request goes straight from audio to the model, with no text step to check in between.',
    'They do: a check needs the words as text at the moment before the reply.',
  ],
};

const SIDE: Record<Mode, string> = {
  chained: 'Chained: the ear writes a transcript, the model reads and writes text, the mouth speaks it.',
  s2s: 'Speech to speech: one model hears Dana’s voice and answers in its own; there is no transcript step in between.',
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A speech-to-speech model takes audio in and gives audio out; the desk loses its ear and mouth.',
    act: 'Predict what Larkspur gives up.',
    say: { block: 'ear', text: 'Would go' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'switch',
    focus: 'mode',
    visibleControls: ['p1', 'mode'],
    narration: 'Compare what rides the belts.',
    act: 'Switch the desk between the two builds.',
    setup: s => ({ ...s, seen: [...new Set([...s.seen, s.mode])] }),
    predicate: s => s.seen.includes('s2s') && s.seen.includes('chained'),
    hint: 'Try both builds.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['outcome', 'quiz'],
    narration:
      'The chained line has text between stages for a policy check before acting. Both still decide whose turn it is.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where, in each build, could a rule read the request as text?',
  },
];

export default function OneModelOrThree() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, mode: 'chained', seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, focus, say }) => (
        <VoiceStage
          step={focus}
          say={say}
          shown={{ phone: { stage: 'stt', mode: state.mode }, caption: SIDE[state.mode] }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        mode: ({ state, sync }) => (
          <>
            <div className="vo-row" role="group" aria-label="Build">
              {(['chained', 's2s'] as Mode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  aria-pressed={state.mode === m}
                  onClick={() => sync({ ...state, mode: m, seen: [...new Set([...state.seen, m])] })}
                >
                  {m === 'chained' ? 'Three stages' : 'One speech-to-speech model'}
                </button>
              ))}
            </div>
            <Fact id={state.mode === 'chained' ? 'openai-chained' : 'openai-s2s'} />
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="gemini-transcripts" />
            <Fact id="openai-vad-default" />
            <Fact id="gemini-audio" />
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
