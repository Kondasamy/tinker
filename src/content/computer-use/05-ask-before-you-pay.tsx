// Chapter 5: ask before you pay. The checkout page carries a big, bright Pay now button whose small print signs Larkspur
// up to a subscription. The allow-list is on and can't help: the offer is on Brightwater's own site. With confirmation,
// the host stops before any click that spends money and asks a person, who refuses the offer and approves the order.
// Links Sandboxing for keeping the agent's reach small.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { money, OFFER } from '../../lib/computer-use/screens';
import { PUPPET_PARTS } from '../../components/scenes/puppetScene';
import {
  beatsOf,
  ClickOutcome,
  clicksOf,
  CuStage,
  Fact,
  nthBeat,
  play,
  PickNote,
  RecordedNote,
  RunAll,
  StepThrough,
  type CuView,
} from './kit';

const MODULE = 'computer-use',
  ID = '05-ask-before-you-pay';
export const PARTS = PUPPET_PARTS;
export const runOf = (confirm: boolean) => play({ case: 'offer', allow: true, confirm });
const OPEN = runOf(false),
  AT = nthBeat(OPEN, 'look', 4),
  FOOLED = clicksOf(OPEN)[3],
  PROMPTS = clicksOf(runOf(true)).filter(c => c.el?.pay).length;

export interface S {
  at: number;
  pick: string | null;
  tab: CuView;
  confirm: boolean;
  quiz: number | null;
}

export const QUIZ = {
  question: 'An agent books travel on airline sites. Which of its clicks should the host send to a person first?',
  options: [
    'The ones that spend money or agree to terms',
    'Every click, to be safe',
    'None, once the allow-list is on',
  ],
  correct: 0,
  explanation: 'Asking before the clicks with real consequences catches the costly mistakes without asking all day.',
  why: [
    'Right: a person checks the few clicks that can’t be undone, and the rest run on their own.',
    'Asking about every click buries people in prompts, and they stop reading them.',
    'An allow-list limits which sites open; a trap on an allowed site gets straight through it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: `The allow-list is on. The checkout page now has a big, bright ${OFFER.button} button beside the real one.`,
    act: 'Predict the agent’s click.',
    say: { block: 'screen', text: 'Two Pay buttons' },
    predicate: s => s.pick !== null,
  },
  {
    id: 'click',
    focus: 'step',
    visibleControls: ['step'],
    narration: 'The bright button is a look-alike button: its small print buys something else.',
    act: 'Carry out the click.',
    say: { block: 'hand', text: 'The bright one' },
    predicate: s => s.at > AT,
  },
  {
    id: 'end',
    focus: 'step',
    visibleControls: ['reveal', 'step'],
    narration: `Larkspur now pays ${money(OFFER.price)} a month for ${OFFER.name}. The allow-list let it through: it’s Brightwater’s own site.`,
    act: 'Run it to the end.',
    say: { block: 'film', text: 'Signed up' },
    predicate: s => s.at >= beatsOf(OPEN).length,
  },
  {
    id: 'fix',
    focus: 'confirm',
    visibleControls: ['confirm', 'run'],
    narration: 'With confirmation, the host pauses before any click that spends money and shows a person the screen.',
    act: 'Turn on confirmation, then run it.',
    say: { block: 'hand', text: 'Ask first' },
    predicate: s => s.confirm && s.at >= beatsOf(runOf(true)).length,
    hint: 'Tick the box, then run the re-order to the end.',
    solution: s => ({ ...s, confirm: true, at: beatsOf(runOf(true)).length, tab: 'scene' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `The person refused the offer and approved the hinges: ${PROMPTS} prompts, no subscription.`,
    act: 'One question to finish.',
    say: { block: 'screen', text: 'Order placed' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which clicks can’t be undone?',
  },
];

export default function AskBeforeYouPay() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: AT, pick: null, tab: 'screen', confirm: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, focus }) => (
        <CuStage
          run={runOf(state.confirm)}
          at={state.at}
          say={say}
          view={state.tab}
          onView={tab => sync({ ...state, tab })}
          predict={
            focus === 'pick' || (state.pick !== null && state.at === AT)
              ? { pick: state.pick, onPick: pick => apply({ ...state, pick }) }
              : undefined
          }
        />
      )}
      controls={{
        pick: ({ state, sync }) => (
          <PickNote v={FOOLED.view} pick={state.pick} onScreen={() => sync({ ...state, tab: 'screen' })} />
        ),
        step: ({ state, sync }) => (
          <>
            <StepThrough r={OPEN} at={state.at} onStep={at => sync({ ...state, at, tab: 'scene' })} />{' '}
            {state.at > AT && (
              <RunAll r={OPEN} at={state.at} onStep={at => sync({ ...state, at })} label="Run to the end" />
            )}
          </>
        ),
        reveal: ({ state }) => <ClickOutcome v={FOOLED.view} pick={state.pick} el={FOOLED.el?.id} />,
        confirm: ({ state, sync }) => (
          <label className="cu-check">
            <input
              type="checkbox"
              checked={state.confirm}
              onChange={e => sync({ ...state, confirm: e.currentTarget.checked, at: 0 })}
            />{' '}
            Ask a person before any click that spends money
          </label>
        ),
        run: ({ state, apply }) =>
          state.confirm ? (
            <RunAll
              r={runOf(true)}
              at={state.at}
              onStep={at => apply({ ...state, at, tab: 'scene' })}
              label="Run the re-order"
            />
          ) : null,
        facts: () => (
          <>
            <Fact id="confirm" />
            <Fact id="vm" />
            <p className="note">
              <a href="/sandboxing/">Agent sandboxing</a> shows how to keep what an agent can reach small, so a mistake
              stays small too.
            </p>
            <RecordedNote />
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
