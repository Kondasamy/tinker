// Chapter 1: it only continues text. The reader predicts what Larkspur mini (trained only on Larkspur's documents)
// does with an instruction, sends it, and reads the live continuation; then tries the second instruction, a role
// line, which fares no better. Links Post-training on what turns a base model into one that follows instructions.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { Outcome } from '../tool-calling/kit';
import { useModel } from '../transformers/kit';
import { Fact, MINI_PROMPTS, MiniStage, ToyNote, whenLoaded, type View } from './kit';

const MODULE = 'prompts',
  ID = '01-it-only-continues';
export const PARTS = DOCKET_PARTS;
const [FIRST, SECOND] = MINI_PROMPTS;

export interface S {
  prompt: string;
  sent: boolean;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Larkspur mini gets “${FIRST}” What comes back?`,
  options: [
    'A reply to the customer',
    'More text in the style of its documents',
    'Nothing: it can’t read instructions',
  ],
};
/** the continuation reads like Larkspur's documents, not a reply (the chapter test checks the pins) */
export const OUTCOME = 1;

export const QUIZ = {
  question:
    'A team gives a base model, trained only on contracts, the line “Summarise this contract:”. It writes more contract clauses. Why?',
  options: [
    'It only continues text, and was never trained to follow instructions',
    'The contract was too long for it to read',
    'The instruction wasn’t polite enough',
  ],
  correct: 0,
  explanation:
    'A model without instruction tuning predicts what text comes next, and after a contract that is more contract.',
  why: [
    'Right: without instruction tuning, the likeliest next words look like what it was trained on.',
    'Length isn’t the problem: a short contract gets the same treatment.',
    'Wording can’t teach a skill the model never learned, however polite.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The card on the docket is your prompt. Larkspur mini learned only from Larkspur’s documents.',
    act: 'Predict first.',
    say: { block: 'task', text: 'Instruction' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['send'],
    narration: 'Locked in. The model reads the card and writes, one likeliest word piece at a time.',
    act: 'Send the instruction.',
    say: { block: 'machine', text: 'Larkspur mini' },
    predicate: whenLoaded(s => s.sent),
    hint: 'Press Send. If Larkspur mini is still loading, wait a moment.',
  },
  {
    id: 'second',
    focus: 'prompt',
    visibleControls: ['out1'],
    narration: 'The slip holds a continuation, not a reply; Text shows it. Maybe it needs telling who it is?',
    act: 'Pick the second instruction.',
    say: { block: 'slip', text: 'Just continues' },
    predicate: whenLoaded(s => s.sent && s.prompt === SECOND),
    hint: `Pick “${SECOND}”`,
    solution: s => ({ ...s, sent: true, prompt: SECOND }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'toy', 'tuned', 'quiz'],
    narration:
      'Still a continuation. Chat models get instruction tuning: extra training on instructions paired with good replies.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the model learn from: instructions, or contracts?',
  },
];

export default function ItOnlyContinues() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ prompt: FIRST, sent: false, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <MiniStage
          prompt={state.prompt}
          sent={state.sent}
          onPrompt={state.sent ? p => (focus === 'prompt' ? apply : sync)({ ...state, prompt: p }) : undefined}
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={
            state.sent
              ? 'Larkspur mini, live in your browser: its likeliest next words.'
              : 'One instruction on the docket, not sent yet.'
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        send: ({ state, apply }) => (
          <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, sent: true })}>
            Send
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="instruction-tuning" />,
        toy: () => <ToyNote />,
        tuned: () => (
          <p className="note">
            <a href="/post-training/01-base-or-assistant/">
              Post-training shows how a base model becomes one that follows instructions.
            </a>
          </p>
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
