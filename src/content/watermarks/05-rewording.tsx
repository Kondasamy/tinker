// Chapter 5: rewording washes it out. The reader swaps reply tokens for Larkspur mini's next-best choices (edit.ts,
// live once the model loads) and the checker re-reads each edit; Show me plays the pinned fewest swaps (washOut, pinned
// in pinned.json rewording.swaps), and Reword all writes the pinned paraphrase.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { check, LINE } from '../../lib/watermarks/detect';
import { swap } from '../../lib/watermarks/edit';
import { MARK } from '../../lib/watermarks/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, PIN, REPLY_IDS, REWORDED, signed, UvStage } from './kit';

const MODULE = 'watermarks',
  ID = '05-rewording';
export const PARTS = UV_PARTS;
const SWAPS = PIN.rewording.swaps as [number, number][];
const N = SWAPS.length;
/** The reply after the pinned fewest swaps: what Show me applies. */
export const WASHED = SWAPS.reduce((ids, [i, id]) => swap(ids, i, id), REPLY_IDS);
const under = (ids: number[]) => {
  const z = check(ids, MARK.gamma).z;
  return z !== null && z < LINE;
};
const same = (a: number[], b: number[]) => a.length === b.length && a.every((t, i) => t === b[i]);

export interface S {
  ids: number[];
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `How many swaps pull this reply under the line at ${LINE}?`,
  options: [`About ${N}`, `About ${N * 3}`, 'More than half the reply'],
};
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'A student pastes a marked essay into another model and asks it to reword every sentence. What will the checker likely say?',
  options: [
    'Unsure: rewording replaces the pairs the mark lives in',
    'Marked: the meaning is unchanged',
    'Marked, more strongly: two models wrote it',
  ],
  correct: 0,
  explanation: 'The mark lives in which token follows which; a paraphrase rebuilds those pairs without the key.',
  why: [
    'Right: the second model picks its own tokens, so green comes back to chance.',
    'The checker never reads meaning; it counts green pairs, and those change with the words.',
    'The second model has no key, so its picks land green only by chance.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Pick a token, then swap it for one of Larkspur mini’s six next-best choices there. The checker re-reads every edit.',
    act: 'Predict first.',
    say: { block: 'machine', text: 'Six choices' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'wash',
    focus: 'reword',
    visibleControls: [],
    narration: 'Your pick is locked. One swap changes two pairs: the token’s own and the next one’s.',
    act: `Swap tokens until z falls under ${LINE}.`,
    say: { block: 'page', text: 'Swap here' },
    predicate: s => under(s.ids),
    hint: 'Pick a green token near the start, and swap it for a red choice.',
    solution: s => ({ ...s, ids: WASHED }),
  },
  {
    id: 'all',
    focus: 'reword',
    visibleControls: ['out1'],
    narration: `${N} well-placed swaps take z from ${signed(PIN.reply.z)} to ${signed(PIN.rewording.washed.z)}. Rewording every token leaves only chance.`,
    act: 'Press Reword all.',
    predicate: s => same(s.ids, REWORDED),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `Reworded, ${PIN.rewording.reworded.green} of ${PIN.rewording.reworded.pairs} pairs are green: z ${signed(PIN.rewording.reworded.z)}. A paraphrase keeps the meaning and loses the mark.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the checker read meaning, or which token follows which?',
  },
];

export default function Rewording() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ids: REPLY_IDS, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, apply, sync, focus }) => (
        <UvStage
          say={say}
          ids={state.ids}
          lamp="all"
          onIds={
            focus === 'reword' || focus === 'quiz'
              ? ids => (focus === 'reword' ? apply : sync)({ ...state, ids })
              : undefined
          }
          caption={`The marked reply as you edit it: ${state.ids.filter((t, i) => t !== REPLY_IDS[i]).length} of ${REPLY_IDS.length} tokens changed.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <Fact id="paraphrase-weakens" />
            <Fact id="paraphrase-attack" />
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
