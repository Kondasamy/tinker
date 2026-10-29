// Chapter 7: the workbench (KTD9). The reader sets the green share γ and the nudge δ; each setting's pinned results
// (quality lost, replies caught as written and after a light reword, false alarms on hand-written replies) show beside
// the chapter's reply, written live by Larkspur mini at that setting, under the lamp and open to rewording. The puzzle
// accepts every setting in WINNERS (pinned, recomputed in a test).
import { useMemo, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step, Say } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { check } from '../../lib/watermarks/detect';
import { larkspur, write } from '../../lib/watermarks/sample';
import { HUMAN, MARK, REPLY } from '../../lib/watermarks/story';
import { BENCH, START, WINNERS, passes, resultOf, wins, type Plan } from '../../lib/watermarks/workbench';
import { useModel } from '../transformers/kit';
import { PROMPT, UvStage, zText, type Lamp } from './kit';

const MODULE = 'watermarks',
  ID = '07-workbench';
export const PARTS = UV_PARTS;
const BEST = resultOf(WINNERS[0]);
/** The chapters' own setting (U2's), for the quiz's comparison. */
export const OURS = resultOf({ gamma: MARK.gamma, delta: MARK.delta });

export const QUIZ = {
  question: 'Why does the smaller green share survive rewording better here?',
  options: [
    'Green is rarer by chance, so each green token is stronger evidence',
    'A smaller green list makes the model write better',
    'The checker’s line is lower for a smaller share',
  ],
  correct: 0,
  explanation:
    'With a quarter of tokens green by chance, the green that survives a reword stands further above chance.',
  why: [
    'Right: the further green sits above what chance gives, the fewer green tokens the score needs.',
    'A smaller list overrules the model more often, so quality falls further, as the table shows.',
    'The line stays at 4 for every setting; only how far green sits above chance changes.',
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
    narration: `Workbench: catch ${BENCH.minCaught} of ${BEST.replies}, lose at most ${BENCH.maxDrop} nats, flag no person; then most caught after rewording.`,
    act: 'Pick the best green share and nudge.',
    say: { block: 'page', text: 'Set the mark' },
    predicate: s => wins(s),
    hint: 'Try the smaller green share, with the biggest nudge the quality limit allows.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `γ ${BEST.gamma}, δ ${BEST.delta}: ${BEST.caughtEdited} of ${BEST.replies} still caught after rewording. The chapters’ γ ${OURS.gamma} catches ${OURS.caughtEdited}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'By chance, how many tokens are green at each share?',
  },
];

function Score({ s }: { s: S }) {
  const r = resultOf(s),
    best = wins(s),
    ok = passes(r);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-ok={ok ? '1' : '0'}>
      <p className="wm-headline">
        <strong>{`${r.caughtEdited} of ${r.replies}`}</strong>
        {' caught after rewording '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? 'PASSES, NOT BEST' : 'BREAKS THE RULE'}
        </span>
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const r = resultOf(s);
  const rows: [string, string, boolean | null][] = [
    [`Caught as written (at least ${BENCH.minCaught})`, `${r.caught} of ${r.replies}`, r.caught >= BENCH.minCaught],
    [`Nats lost a token (at most ${BENCH.maxDrop})`, r.drop.toFixed(3), r.drop <= BENCH.maxDrop],
    [
      `Hand-written replies flagged (at most ${BENCH.maxFalseAlarms})`,
      `${r.falseAlarms} of ${r.humans}`,
      r.falseAlarms <= BENCH.maxFalseAlarms,
    ],
    [`Caught after one token in ${BENCH.editEvery} is swapped`, `${r.caughtEdited} of ${r.replies}`, null],
  ];
  return (
    <div className="tc-bench">
      <section className="wm-bench" aria-label="Mark setting">
        <fieldset className="wm-radios">
          <legend>Green share (γ)</legend>
          {BENCH.gammas.map(g => (
            <label key={g}>
              <input type="radio" name="wm-gamma" checked={s.gamma === g} onChange={() => set({ ...s, gamma: g })} />
              {g}
            </label>
          ))}
        </fieldset>
        <fieldset className="wm-radios">
          <legend>Nudge (δ)</legend>
          {BENCH.deltas.map(d => (
            <label key={d}>
              <input type="radio" name="wm-delta" checked={s.delta === d} onChange={() => set({ ...s, delta: d })} />
              {d}
            </label>
          ))}
        </fieldset>
      </section>
      <table className="tc-ledger wm-table">
        <caption>{`γ ${s.gamma}, δ ${s.delta}, over Larkspur mini’s ${r.replies} test replies`}</caption>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={ok === null ? undefined : ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        {`The rule is Larkspur’s planning number. Results are measured on Larkspur mini’s replies and ${HUMAN.length} hand-written ones; rewording swaps one token in ${BENCH.editEvery} for the writer’s next-best.`}
      </p>
    </div>
  );
}

/** The chapter's reply, written live at the bench's setting; under the lamp and open to rewording until the setting
 * changes. */
function Stage({ s, say }: { s: S; say?: Say }) {
  const { model } = useModel();
  const written = useMemo(
    () => (model ? write(larkspur(model), PROMPT, { gamma: s.gamma, delta: s.delta, key: MARK.key }, REPLY.seed) : []),
    [model, s.gamma, s.delta],
  );
  const [edit, setEdit] = useState<{ of: number[]; ids: number[] } | null>(null);
  const [lamp, setLamp] = useState<Lamp>('all');
  const ids = edit?.of === written ? edit.ids : written;
  return (
    <UvStage
      say={say}
      ids={ids}
      gamma={s.gamma}
      lamp={lamp}
      onLamp={setLamp}
      onIds={model ? next => setEdit({ of: written, ids: next }) : undefined}
      rewordAll={null}
      step={`${s.gamma} ${s.delta}`}
      caption={
        model
          ? `The reply at γ ${s.gamma}, δ ${s.delta}, written live: ${zText(check(ids, s.gamma))}`
          : 'Loading Larkspur mini to write the reply…'
      }
    />
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
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setting is an attempt only while it is the puzzle
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
