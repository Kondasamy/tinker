// Chapter 2: say what you want. Rosa's vague task gets a long reply that invents a hotline and misses the key fact;
// the reader reads it, predicts which card fixes it, tries the role card (still missing), then the clear task (in).
// Every count is read off the recorded replies and their live grades.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { START } from '../../lib/prompts/assemble';
import { EMPTY, type Docket } from '../../lib/prompts/cards';
import { Outcome } from '../tool-calling/kit';
import { DocketStage, Fact, boardOf, captionOf, keyFact, type View } from './kit';

const MODULE = 'prompts',
  ID = '02-say-what-you-want';
export const PARTS = DOCKET_PARTS;
const words = (d: Docket) => boardOf(ID, d).run!.grade.words;
/** the two vague replies the reader sees: alone, then with the role card */
export const VAGUE = { ...EMPTY, task: 'vague' } as Docket;
export const ROLE = { ...VAGUE, role: true };

export interface S {
  d: Docket;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Which card gets the key fact into the reply?',
  options: [
    'Who you are: say it writes for Larkspur',
    'Clear task: say what to answer, and hand over the policy',
    'Only both together',
  ],
};
/** the clear task alone gets the key fact (the chapter test checks it against the recording) */
export const OUTCOME = 1;

export const QUIZ = {
  question: 'A prompt says “Summarise this report.” The summary skips the one figure the finance lead needs. Best fix?',
  options: [
    'Say who the summary is for and which figure it must state',
    'Start the prompt with “You are an expert analyst.”',
    'Ask for a longer summary',
  ],
  correct: 0,
  explanation: 'The model can’t guess what matters to you; a clear task names it.',
  why: [
    'Right: a clear task says what the answer must contain, so the model doesn’t have to guess.',
    'A role sets the voice, but it still doesn’t tell the model which figure matters.',
    'A longer summary may still miss the figure; length isn’t what was missing.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'read',
    focus: 'view',
    visibleControls: [],
    narration: `The vague task got ${words(VAGUE)} words with a made-up hotline. The key fact, extension ${keyFact()}, is missing.`,
    act: 'Open Text to read it.',
    say: { block: 'slip', text: 'Key fact missing' },
    predicate: s => s.view === 'text',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The task is the part saying what to do. The model can’t know Larkspur’s policy unless the prompt says it.',
    act: 'Predict first.',
    say: { block: 'task', text: 'Too vague' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'role',
    focus: 'docket',
    visibleControls: [],
    narration: 'Locked in. First the role: a line saying who the model writes as.',
    act: 'Clip Who you are.',
    predicate: s => s.d.role,
    hint: 'Press the Who you are card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, role: true } }),
  },
  {
    id: 'clear',
    focus: 'docket',
    visibleControls: [],
    narration: `It sounds like Larkspur now: ${words(ROLE)} words. It still invents a number.`,
    act: 'Clip Clear task.',
    say: { block: 'role', text: 'Still guessing' },
    predicate: s => s.d.task === 'clear',
    hint: 'Press the Clear task card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, task: 'clear' } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'fact', 'quiz'],
    narration: 'The clear task says what to answer and hands over the policy. The key fact is in.',
    act: 'One question to finish.',
    say: { block: 'slip', text: 'Key fact in' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the model need that the vague task never gave it?',
  },
];

export default function SayWhatYouWant() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ d: START[ID], view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <DocketStage
          chapter={ID}
          docket={state.d}
          onDocket={d => (focus === 'docket' ? apply : sync)({ ...state, d })}
          view={state.view}
          onView={view => (focus === 'view' ? apply : sync)({ ...state, view })}
          say={say}
          step={focus}
          caption={`${captionOf(ID, state.d)} Made-up web addresses in replies are changed to .example.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="clear-and-direct" />,
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
