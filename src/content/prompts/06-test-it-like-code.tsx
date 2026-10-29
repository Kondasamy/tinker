// Chapter 6: test it like code. The docket goes to Larkspur's six tickets, each graded live (Evals' graders): the
// vague task passes some, the reader predicts the clear task's count and clips it (all pass), then predicts and sends
// the same prompt to the smaller model (fewer pass). Every count is read off the recordings' live grades. Links Evals.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { START } from '../../lib/prompts/assemble';
import { TICKETS, type Docket, type ModelId } from '../../lib/prompts/cards';
import { Outcome } from '../tool-calling/kit';
import { DocketStage, Fact, boardOf, captionOf, type View } from './kit';

const MODULE = 'prompts',
  ID = '06-test-it-like-code';
export const PARTS = DOCKET_PARTS;
export const ALL = TICKETS.map(t => t.id);
const N = ALL.length;
/** tickets passed by a docket on a model */
export const passed = (d: Docket, model: ModelId = 'main') =>
  boardOf(ID, d, { tickets: ALL, model }).runs!.filter(r => r.pass).length;
const CLEAR: Docket = { ...START[ID], task: 'clear' };
export const COUNTS = { vague: passed(START[ID]), clear: passed(CLEAR), small: passed(CLEAR, 'small') };

export interface S {
  d: Docket;
  model: ModelId;
  view: View;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `You swap in the clear task. How many of the ${N} tickets pass?`,
  options: [`All ${N}`, 'Still about half', 'Fewer: a longer task gives more to get wrong'],
};
export const OUTCOME = 0;
export const P2 = {
  question: 'The same prompt goes to the smaller model. How many pass?',
  options: [`All ${N} again`, 'Fewer', 'None'],
};
export const OUTCOME2 = 1;

export const QUIZ = {
  question: 'A teammate’s prompt edit fixes the one ticket they were looking at. What before shipping it?',
  options: [
    'Rerun the whole question set and compare the counts',
    'Ship it: the failing case now passes',
    'Ask the model whether the new prompt is better',
  ],
  correct: 0,
  explanation: 'A change that fixes one ticket can break others; only the whole set shows which.',
  why: [
    'Right: the same tickets, graded the same way, show whether the change helped overall.',
    'One fixed ticket says nothing about the others the edit may have broken.',
    'The model’s opinion of its prompt isn’t a measurement; graded tickets are.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The vague task passes ${COUNTS.vague} of ${N} tickets in this question set. A pass: key fact, right team, house rule.`,
    act: 'Predict first.',
    say: { block: 'slip', text: 'Tickets passed' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'clear',
    focus: 'docket',
    visibleControls: [],
    narration: 'Locked in. Each grader is code that checks one thing against the ticket’s reference answer.',
    act: 'Clip Clear task.',
    say: { block: 'task', text: 'The change' },
    predicate: s => s.d.task === 'clear',
    hint: 'Press the Clear task card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, task: 'clear' } }),
  },
  {
    id: 'predict2',
    focus: 'p2',
    visibleControls: ['out1', 'p2'],
    narration: `${COUNTS.clear} of ${N}: better on every ticket, not just Dana’s. Larkspur also runs a smaller, cheaper model.`,
    act: 'Predict first.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'small',
    focus: 'model',
    visibleControls: [],
    narration: 'Locked in. Same cards, same tickets, another model.',
    act: 'Pick Smaller model.',
    say: { block: 'machine', text: 'Smaller model' },
    predicate: s => s.model === 'small' && s.d.task === 'clear',
    hint: 'The model chips sit under the cards; keep the clear task clipped.',
    solution: s => ({ ...s, model: 'small', d: { ...s.d, task: 'clear' } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'fact', 'evals', 'quiz'],
    narration: `${COUNTS.small} of ${N}. Test a prompt on each model you ship: what passes on one can fail on another.`,
    act: 'One question to finish.',
    say: { block: 'slip', text: 'Fewer pass' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What tells you a change helped everywhere, not just once?',
  },
];

export default function TestItLikeCode() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ d: START[ID], model: 'main', view: 'scene', p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <DocketStage
          chapter={ID}
          docket={state.d}
          onDocket={state.p1 === null ? undefined : d => (focus === 'docket' ? apply : sync)({ ...state, d })}
          tickets={ALL}
          model={state.model}
          onModel={state.p2 === null ? undefined : model => (focus === 'model' ? apply : sync)({ ...state, model })}
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={`${captionOf(ID, state.d, { tickets: ALL, model: state.model })} Made-up web addresses in replies are changed to .example.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUTCOME2} />,
        fact: () => <Fact id="openai-guide" />,
        evals: () => (
          <p className="note">
            <a href="/evals/03-graders/">Evals’ Graders chapter builds checks like these.</a>
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
