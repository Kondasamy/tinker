// Chapter 7: the workbench. Model size, bits and reply length against the warehouse lead's rule (workbench.json,
// planning numbers): fit with a shift's context (a miss falls back to the cloud, so it isn't private), the stock-answer
// bar at 4 or more bits, and a shift on one charge. The puzzle accepts every plan in WINNERS (pinned, recomputed).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { HANDHELD, QUESTIONS, sizeOf, sizeText, FREE } from '../../lib/on-device/memory';
import { levelAfter, SHIFT } from '../../lib/on-device/battery';
import { BENCH, passes, resultOf, START, WINNERS, wins, type Plan } from '../../lib/on-device/workbench';
import { BitsRadios, CrateStage, LengthRadios, PLANNING, SizeRadios } from './kit';

const MODULE = 'on-device',
  ID = '07-workbench';
export const PARTS = CRATE_PARTS;
const BEST = WINNERS[0];
const n = (x: number) => x.toLocaleString('en');
const B1 = sizeOf('1b');

export const QUIZ = {
  question: `Why can’t the ${B1.name} at 4 bits, the thriftiest on battery, pass?`,
  options: [
    `It answers too few stock questions: ${B1.right} of ${QUESTIONS} against a bar of ${BENCH.bar}`,
    `It doesn’t fit in ${sizeText(FREE)}`,
    'Its replies leave the handheld',
  ],
  correct: 0,
  explanation: 'Fitting and battery are only half the rule; the model still has to answer the questions.',
  why: [
    'Right: it fits and lasts the shift, but misses the answer bar the lead set.',
    'At 4 bits it takes well under a third of the free memory, context and all.',
    'Anything that fits runs on the handheld, so nothing leaves it.',
  ],
};

interface S extends Plan {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Rule: fit with ${n(BENCH.shiftContext)} tokens of context, answer ${BENCH.bar} of ${QUESTIONS}, keep ${BENCH.minBits}+ bits, last a shift.`,
    act: 'Find the setup that passes.',
    say: { block: 'crate', text: 'Pack it' },
    predicate: s => wins(s),
    hint: 'Only one model clears the answer bar. Which bits fit it, and which reply length lasts?',
    solution: s => ({ ...s, ...BEST }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `The ${sizeOf(BEST.size).name} at ${BEST.bits} bits with ${BEST.length} replies passes. Stock scores are hand-set planning numbers.`,
    act: 'One question to finish.',
    say: { block: 'tank', text: 'Lasts a shift' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Read the 1B’s rows: which line fails?',
  },
];

function Score({ s }: { s: S }) {
  const best = wins(s);
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p className="od-headline">
        <strong>{`${sizeOf(s.size).name}, ${s.bits} bits, ${s.length} replies `}</strong>
        <span className={`stamp ${best ? 'correct' : 'wrong'}`}>{best ? 'PASSES' : 'BREAKS THE RULE'}</span>
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const r = resultOf(s);
  const rows: [string, string, boolean][] = [
    [`Fits with ${n(BENCH.shiftContext)} tokens of context`, `${sizeText(r.used)} of ${sizeText(FREE)}`, r.fit],
    ['Stays on the handheld', r.private ? 'Yes' : 'No: falls back to the cloud', r.private],
    [
      `Stock answers (at least ${BENCH.bar} of ${QUESTIONS}, ${BENCH.minBits}+ bits)`,
      `${r.right} of ${QUESTIONS} at ${s.bits} bits`,
      r.answers,
    ],
    [`Replies per charge (a shift is ${n(SHIFT)})`, n(r.replies), r.lasts],
  ];
  return (
    <div className="tc-bench">
      <section className="od-bench" aria-label="Setup">
        <SizeRadios value={s.size} onChange={size => set({ ...s, size })} />
        <BitsRadios value={s.bits} onChange={bits => set({ ...s, bits })} />
        <LengthRadios value={s.length} onChange={length => set({ ...s, length })} />
      </section>
      <table className="tc-ledger">
        <caption>The lead’s rule, line by line</caption>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">{`${PLANNING} Stock-answer scores are hand-set, not measured. ${passes(r) ? '' : 'One or more lines fail.'}`}</p>
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CrateStage
          say={say}
          pack={{
            size: state.size,
            bits: state.bits,
            tokens: BENCH.shiftContext,
            level: levelAfter(sizeOf(state.size), state.bits, state.length, HANDHELD.shiftHours),
          }}
          caption={`${sizeOf(state.size).name} at ${state.bits} bits with a shift’s context, its tank after a shift of ${state.length} replies.`}
        />
      )}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setup is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
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
