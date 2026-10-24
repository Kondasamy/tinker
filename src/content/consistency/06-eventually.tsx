// Chapter 6: eventually. Priya buys a hinge at North; her reload a minute later lands on West, which hasn't heard yet,
// so her own order is missing. Sending her reads to the warehouse that took her order (sticky reads) fixes it, and a
// minute later every copy agrees anyway: eventually consistent.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { LAG, MOMENTS, REP_NAME, clock, policyOf, runOf } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Clock, ConsistencyStage, Fact, SimNote, type View } from './kit';

const MODULE = 'consistency',
  ID = '06-eventually';
export const PARTS = STOCK_PARTS;
export const runWith = (sticky: boolean) => runOf(policyOf({ r: 1, w: 1, rule: 'lww' }, { sticky }));
const { priyaBuys: BUY, priyaLooks: LOOK } = MOMENTS,
  AGREE = BUY + LAG;
export const look = (sticky: boolean) => runWith(sticky).outcomes.find(o => o.t === LOOK && o.who === 'Priya')!;

export const P1 = {
  question: `Priya bought a hinge at North. At ${clock(LOOK)} her reload is answered by West. Does it show her purchase?`,
  options: [
    'Yes: she bought it, so every count shows it',
    'No: West hasn’t heard about it yet',
    'Only if she buys a second one',
  ],
};
export const outcomeOf = () => (look(false).ryw ? 0 : 1);

export const QUIZ = {
  question: 'You post a comment, refresh, and it’s gone; a minute later it’s back. What most likely happened?',
  options: [
    'Your refresh reached a copy the comment hadn’t reached yet',
    'The site deleted the comment and then restored it',
    'The comment was saved twice',
  ],
  correct: 0,
  explanation: 'The refresh read from a replica that was still behind; once the comment arrived, every copy showed it.',
  why: [
    'Right: the comment was saved, but the copy that answered the refresh hadn’t received it yet.',
    'Nothing was deleted: one copy simply hadn’t caught up, which is why it came back on its own.',
    'A second save would show the comment twice, not hide it for a minute.',
  ],
};

interface S {
  t: number;
  p1: number | null;
  sticky: boolean;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'buy',
    focus: 'clock',
    visibleControls: ['clock'],
    narration: 'Priya buys a hinge at North. Her page then reloads, and the shop may send the reload to any warehouse.',
    act: `Move the clock to ${clock(BUY)}.`,
    say: { block: 'north', text: 'Priya buys' },
    predicate: s => s.t >= BUY,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Her reload, a minute later, goes to ${REP_NAME[look(false).served]}.`,
    act: 'Predict what she sees.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reload',
    focus: 'clock',
    visibleControls: ['p1', 'clock'],
    narration: 'Your pick is locked.',
    act: `Move the clock to ${clock(LOOK)}.`,
    say: { block: 'west', text: 'Her order gone' },
    predicate: s => s.p1 !== null && s.t === LOOK,
    hint: `Set the clock to exactly ${clock(LOOK)}.`,
  },
  {
    id: 'sticky',
    focus: 'sticky',
    visibleControls: ['out1', 'sticky'],
    narration: 'Read your writes failed: Priya’s own order is missing. The fix: answer her reads where she wrote.',
    act: 'Turn on Read where you wrote.',
    predicate: s => s.sticky,
  },
  {
    id: 'agree',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Her reload now goes to North. By ${clock(AGREE)} every copy agrees anyway: eventually consistent, just not yet.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Was the comment gone, or was the copy that answered still behind?',
  },
];

export default function Eventually() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: BUY - 2, p1: null, sticky: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runWith(state.sticky);
        return (
          <ConsistencyStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={{
              scene: stockAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}. ${state.sticky ? 'Priya’s reads go where she ordered' : 'Reloads go to any warehouse'}.`,
            }}
          />
        );
      }}
      controls={{
        clock: ({ state, sync }) => (
          <Clock id="cs-clock6" t={state.t} onTick={t => sync({ ...state, t, view: 'scene' })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        sticky: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            aria-pressed={state.sticky}
            onClick={() => apply({ ...state, sticky: !state.sticky })}
          >
            Read where you wrote
          </button>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="ryw" />
            <Fact id="eventual" />
            <SimNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
