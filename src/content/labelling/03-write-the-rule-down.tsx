// Chapter 3: write the rule down. Mira reads refund and return as one intent. The reader predicts how many of her
// refund-or-return splits with Rosa survive a written guideline, pins it on the rack (her slips move to the other
// hole), then reads the Matrix tab: kappa rises. Labels before and after the guideline are frozen in labels.json.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { GUIDELINE, INTENTS, POOL, labellerOf, ticketOf } from '../../lib/labelling/story';
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, PAIRS, RackStage, StandInNote, type View, picksOf, tallyOf } from './kit';

const MODULE = 'labelling',
  ID = '03-write-the-rule-down';
export const PARTS = LABEL_PARTS;
const [ROSA, MIRA] = (['rosa', 'mira'] as const).map(id => labellerOf(id).name);
/** a refund ticket Mira files as a return until the rule is written */
export const T = ticketOf('t006');
const RR = POOL.filter(t => t.id !== T.id && (t.intent === 'refund' || t.intent === 'return')).map(t => t.id);
const { before, after } = pinned.refundReturn;
const K = { before: pinned.kappa.before['rosa-mira'], after: pinned.kappa.after['rosa-mira'] };
const two = (x: number) => x.toFixed(2);

interface S {
  p1: number | null;
  guide: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `With the guideline pinned, how many of the ${before} splits are left?`,
  options: ['About half of them', 'Only one or two', 'None at all'],
};
export const OUTCOME = after === 0 ? 2 : after <= 2 ? 1 : 0;

export const QUIZ = {
  question: 'A new labeller files “send them back for a bigger size” as Refund. What is the first fix?',
  options: [
    'Add that case to the guideline, with an example',
    'Drop every label they have made',
    'Ask a model to relabel their tickets',
  ],
  correct: 0,
  explanation: 'A disagreement that repeats is a gap in the rule; write the case down and everyone reads it the same.',
  why: [
    'Right: the swap is an edge case the rule should name, so no one guesses again.',
    'Their other labels may be fine; one unwritten case is not carelessness.',
    'A model given the same unclear rule can make the same guess.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${MIRA} and ${ROSA} split ${before} pool tickets between refund and return. Larkspur writes a guideline: one line per hole.`,
    act: 'Predict first.',
    say: { block: 'mira', text: 'Mixes them up' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'guide',
    focus: 'guide',
    visibleControls: ['guide'],
    narration: `Your pick is locked. Its line for refund: “${GUIDELINE.refund}”`,
    act: 'Pin the guideline.',
    say: { block: 'guide', text: 'The rule' },
    predicate: s => s.guide,
  },
  {
    id: 'matrix',
    focus: 'stage',
    visibleControls: ['out1', 'guide'],
    narration: `${MIRA} re-reads with the rule: ${before} splits fall to ${after}. Each edge case now has an answer.`,
    act: 'Open the Matrix tab.',
    say: { block: 'refund', text: 'Settled' },
    predicate: s => s.view === 'matrix',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['guide', 'quiz'],
    narration: `${ROSA} and ${MIRA}’s kappa: ${two(K.before)} before the rule, ${two(K.after)} after. A real team’s rewrites helped, but not on every label.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Was the labeller careless, or was the case never written down?',
  },
];

function Stage({ s, set, say }: { s: S; set: (s: S) => void; say?: { block: string; text: string } }) {
  const picks = picksOf(T.id, s.guide);
  return (
    <RackStage
      rack={{ ticket: T, picks, guide: s.guide, tally: tallyOf(RR, s.guide), say }}
      guided={s.guide}
      view={s.view}
      onView={view => set({ ...s, view })}
      pair={PAIRS[0]}
      caption={
        s.view === 'matrix'
          ? `All ${POOL.length} pool tickets, ${s.guide ? 'with' : 'before'} the guideline.`
          : `Refund and return tickets, ${s.guide ? 'with' : 'before'} the guideline. ${MIRA} files this one under ${INTENTS.find(i => i.id === picks.mira)!.name}.`
      }
    />
  );
}

export default function WriteTheRuleDown() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, guide: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <Stage s={state} say={say} set={focus === 'stage' ? apply : sync} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        guide: ({ state, apply, sync, focused }) => (
          <>
            <button
              type="button"
              className="chip"
              aria-pressed={state.guide}
              onClick={() => (focused ? apply : sync)({ ...state, guide: !state.guide })}
            >
              {state.guide ? 'Guideline pinned' : 'Pin the guideline'}
            </button>
            {state.guide && (
              <ul className="lb-guide" aria-label="The guideline">
                {INTENTS.map(i => (
                  <li key={i.id}>
                    <strong>{i.name}:</strong> {GUIDELINE[i.id]}
                  </li>
                ))}
              </ul>
            )}
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="guideline-rounds" />
            <StandInNote />
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
