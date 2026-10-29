// Chapter 5: order and emphasis. SIMULATED (KTD13): the recorded model kept the house rule on top and at the end, so
// this chapter's replies come from simulate.ts, whose stated rule buries a rule on top under examples that end
// differently and keeps one at the end. The copy says so where the replies show, cites Liu et al. for why the end of
// a long prompt is safest, and says what the one recording did. Links Context's lost-in-the-middle chapter.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import { CHAPTER_TICKET, START } from '../../lib/prompts/assemble';
import { ticketOf, type Docket } from '../../lib/prompts/cards';
import { endsWithRef } from '../../lib/prompts/grade';
import { RECORDINGS } from '../../lib/prompts/story';
import { Outcome } from '../tool-calling/kit';
import { DocketStage, Fact, captionOf, type View } from './kit';

const MODULE = 'prompts',
  ID = '05-order-and-emphasis';
export const PARTS = DOCKET_PARTS;
const REC = RECORDINGS[ID];
/** the one recording: did the real model keep the rule in every place it was recorded? (true: hence the simulation) */
export const RECORDED_KEPT = Object.values(REC.replies).every(r => endsWithRef(r.text, ticketOf(CHAPTER_TICKET).ref));

export interface S {
  d: Docket;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'The rule is on top; both examples below it end without a reference. Is the rule kept?',
  options: [
    'Missed: the examples after it win',
    'Kept: the model reads it first',
    'Kept: a rule always beats examples',
  ],
};
/** missed, by the simulator's stated rule (the chapter test checks it) */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A 40-page policy goes into a prompt, with the one must-follow rule on page 20. Safest change?',
  options: [
    'Restate the rule at the end, after the policy',
    'Put the rule in capitals where it is',
    'Nothing: the model reads every word',
  ],
  correct: 0,
  explanation: 'Models use the end of a long input more reliably than its middle, so a must-follow rule goes last.',
  why: [
    'Right: the end of a long prompt is used best, and then test that it holds.',
    'Shouting doesn’t move the rule out of the middle, where it is most easily missed.',
    'Reading every word isn’t using every word: the middle of a long input is used worst.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'These replies are simulated: written by stated rules, not by a model. The house rule sits on top.',
    act: 'Predict first.',
    say: { block: 'rules', text: 'Rule on top' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'move',
    focus: 'docket',
    visibleControls: ['out1'],
    narration: 'Missed, by the simulator’s rule: a buried rule loses to the examples after it.',
    act: 'Press House rule last.',
    say: { block: 'examples', text: 'Examples win' },
    predicate: s => s.d.rules === 'last',
    hint: 'The House rule last toggle sits beside the cards.',
    solution: s => ({ ...s, d: { ...s.d, rules: 'last' } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['recorded', 'fact', 'context', 'quiz'],
    narration: 'Kept, by the same rule. It mirrors Liu et al.: models use a long prompt’s end better than its middle.',
    act: 'One question to finish.',
    say: { block: 'rules', text: 'Rule last' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where in a long input do models use information best?',
  },
];

export default function OrderAndEmphasis() {
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
          onDocket={state.p1 === null ? undefined : d => (focus === 'docket' ? apply : sync)({ ...state, d })}
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={`${captionOf(ID, state.d)} True by the simulator’s rule, not measured.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        recorded: () =>
          RECORDED_KEPT ? (
            <p className="note">{`The one real recording (${REC.meta.models.main}, ${REC.meta.accessed}) kept the rule on top and at the end. That is why this chapter is simulated: test the order your model gets.`}</p>
          ) : null,
        fact: () => <Fact id="lost-in-the-middle" />,
        context: () => (
          <p className="note">
            <a href="/context/02-more-isnt-better/">Context’s More isn’t better shows a fact lost in the middle.</a>
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
