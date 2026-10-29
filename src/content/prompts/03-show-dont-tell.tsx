// Chapter 3: show, don't tell. One example gives the reply Larkspur's sign-off; the reader predicts what two examples
// sharing a quirky opener do, clips them, and the recorded reply copies the quirk. Sign-off and quirk are read off
// the tickets' data, and their effect off the live grades.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { START } from '../../lib/prompts/assemble';
import { QUIRK, SIGNOFF, type Docket } from '../../lib/prompts/cards';
import { Outcome } from '../tool-calling/kit';
import { DocketStage, Fact, captionOf, type View } from './kit';

const MODULE = 'prompts',
  ID = '03-show-dont-tell';
export const PARTS = DOCKET_PARTS;

export interface S {
  d: Docket;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Both examples now open with “${QUIRK}” What does the reply to Dana’s outage do?`,
  options: ['Opens with it too', 'Skips it: it doesn’t suit an outage', 'Keeps only the sign-off'],
};
/** the quirk turns up (the chapter test checks the recording) */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'Every example in a ticket-tagging prompt is a billing ticket. What may happen to shipping tickets?',
  options: [
    'More of them get tagged billing',
    'Nothing: examples only show the format',
    'The model refuses to tag them',
  ],
  correct: 0,
  explanation: 'A model leans towards what its examples share, so mix the examples you show.',
  why: [
    'Right: what every example shares, here the billing tag, pulls the model’s answers towards it.',
    'You saw the reply copy an opener nobody asked for; examples teach more than format.',
    'Nothing in the examples tells it to refuse; it leans towards billing instead.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'one',
    focus: 'docket',
    visibleControls: [],
    narration:
      'The reply has the key fact but not Larkspur’s sign-off. An example shows a style instead of describing it.',
    act: 'Clip One example.',
    say: { block: 'slip', text: 'No sign-off' },
    predicate: s => s.d.examples === 1,
    hint: 'Press the One example card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, examples: 1 } }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `One example, and the reply signs off “${SIGNOFF}”. That’s few-shot prompting.`,
    act: 'Predict first.',
    say: { block: 'examples', text: 'One example' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'quirky',
    focus: 'docket',
    visibleControls: [],
    narration: 'Locked in. These two examples share a quirk: the same cheery opener.',
    act: 'Clip Two quirky examples.',
    predicate: s => s.d.examples === '2q',
    hint: 'Press the Two quirky examples card under the picture.',
    solution: s => ({ ...s, d: { ...s.d, examples: '2q' } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'fact', 'quiz'],
    narration: 'It copied the opener, unasked. Examples teach everything they share, wanted or not, so vary them.',
    act: 'One question to finish.',
    say: { block: 'slip', text: 'Copied quirk' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did every example have in common?',
  },
];

export default function ShowDontTell() {
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
          onDocket={
            focus === 'p1' && state.p1 === null ? undefined : d => (focus === 'docket' ? apply : sync)({ ...state, d })
          }
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={captionOf(ID, state.d)}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="example-bias" />,
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
