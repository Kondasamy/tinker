// Chapter 7: the workbench. The reader picks a published model card and a precision for Larkspur's server: total
// weights at that precision against the memory budget, active weights against the work-per-token budget (planning
// numbers), and Larkspur's toy beside them. The puzzle accepts every plan in WINNERS (pinned, recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { promptOf } from '../../lib/mixture-of-experts/routes';
import { CARDS, TOY, billions, bytesAt, cardOf, fmtGB } from '../../lib/mixture-of-experts/cards';
import {
  BITS,
  BUDGET,
  START,
  WINNERS,
  judge,
  wins,
  type Bits,
  type Plan,
} from '../../lib/mixture-of-experts/workbench';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Fact, RoomsStage, n } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '07-workbench';
export const PARTS = ROOMS_PARTS;
export const PROMPT = promptOf(pinned.chapters.doorman);
const BEST = billions(cardOf(WINNERS[0].card).total);

export const QUIZ = {
  question: 'A model fits Larkspur’s memory at 4 bits but runs 70B weights per token. What does 4 bits not fix?',
  options: [
    'The work per token: every active weight still runs',
    'The memory: 4 bits takes more room than 16',
    'Nothing: 4 bits fixes both',
  ],
  correct: 0,
  explanation: 'Fewer bits shrink the memory each weight takes, but a token still runs through every active weight.',
  why: [
    'Right: precision changes bytes per weight, not how many weights a token works through.',
    'Four bits is a quarter of sixteen, so the same weights take a quarter of the memory.',
    'Precision shrinks memory only; the work per token is set by the active weights.',
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
    narration: `Larkspur’s budgets: ${BUDGET.memoryGB} GB of memory, ${BUDGET.activeB}B weights at work per token. Precision sets bytes per weight.`,
    act: 'Fit both with the most weights.',
    say: { block: 'rooms', text: 'Which shape?' },
    predicate: s => wins(s),
    hint: 'Total weights set the memory; active weights set the work. Fewer bits shrink only the memory.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} total is the most that fits; yours is one of ${WINNERS.length} plans on this workbench that work.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a smaller number per weight change how many weights a token runs?',
  },
];

function Score({ s }: { s: S }) {
  const j = judge(s),
    best = wins(s);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-ok={j.ok ? '1' : '0'}>
      <p className="me-headline">
        <strong>{billions(j.card.total)}</strong>
        {` total, ${s.bits}-bit `}
        <span className={`stamp ${best ? 'correct' : j.ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : j.ok ? `MOST IS ${BEST}` : 'OVER BUDGET'}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} plans that work.`}</p>}
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const j = judge(s);
  const rows: [string, string, boolean][] = [
    [`Memory (budget ${BUDGET.memoryGB} GB)`, fmtGB(j.memory), j.fitsMemory],
    [`Work per token (budget ${BUDGET.activeB}B)`, `${billions(j.card.active)} active`, j.fitsCompute],
  ];
  return (
    <div className="tc-bench">
      <section className="me-bench" aria-label="Server plan">
        <fieldset>
          <legend>Model card</legend>
          {CARDS.map(c => (
            <label key={c.id}>
              <input type="radio" name="me-card" checked={s.card === c.id} onChange={() => set({ ...s, card: c.id })} />
              {`${c.name}: ${billions(c.total)} total, ${billions(c.active)} active`}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Precision</legend>
          {BITS.map(b => (
            <label key={b}>
              <input
                type="radio"
                name="me-bits"
                checked={s.bits === b}
                onChange={() => set({ ...s, bits: b as Bits })}
              />
              {`${b}-bit (${b / 8} byte${b === 8 ? '' : 's'} a weight)`}
            </label>
          ))}
        </fieldset>
      </section>
      <table className="tc-ledger">
        <caption>{`${j.card.name} at ${s.bits} bits on Larkspur’s server`}</caption>
        <thead>
          <tr>
            <th scope="col">Budget</th>
            <th scope="col">This plan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name} data-ok={ok ? 1 : 0}>
              <th scope="row">{name}</th>
              <td className={ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Larkspur’s toy, beside it</th>
            <td>{`${n(TOY.total)} total, ${n(TOY.active)} active, ${n(bytesAt(TOY.total, s.bits))} bytes`}</td>
          </tr>
        </tbody>
      </table>
      <p className="note me-note">{`Budgets are Larkspur’s planning numbers: ${BUDGET.memoryWords}; ${BUDGET.activeWords}.`}</p>
      <Fact id="h100-memory" />
      <Fact id={s.card} />
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
      stage={({ state, say }) => {
        const c = cardOf(state.card);
        return (
          <RoomsStage
            say={say}
            ids={PROMPT.ids}
            sel={Math.min(8, PROMPT.ids.length) - 1}
            caption={() =>
              `Larkspur’s toy runs ${TOY.topK} of ${TOY.experts} rooms a floor; ${c.name} runs ${c.topK}${
                c.shared ? ` plus ${c.shared} shared` : ''
              } of ${c.experts} per layer.`
            }
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
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
