// Chapter 7: the name field, the workbench. What the form counts, its limit and whether it normalises, against
// Larkspur's customers and the name column's bytes; every check runs for real. The puzzle accepts every setting in
// WINNERS (pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { lengthsOf, stacked } from '../../lib/unicode/graphemes';
import {
  COLUMN,
  COUNTS,
  LIMITS,
  START,
  WINNERS,
  resultOf,
  settingOf,
  wins,
  type Count,
  type Setting,
} from '../../lib/unicode/workbench';
import { count } from '../../lib/unicode/story';
import pinned from '../../../data/unicode/pinned.json' with { type: 'json' };
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { PARTS as TAPE, TapeStage } from './kit';

const MODULE = 'unicode',
  ID = '07-workbench';
export const PARTS = TAPE;
const STACK = lengthsOf(stacked(pinned.stack.marks));

export const QUIZ = {
  question: 'A shipping label prints at most 30 bytes of address. What should the address field count?',
  options: ['Bytes, after normalising to NFC', 'Graphemes: what people see', 'Code units, like JavaScript’s .length'],
  correct: 0,
  explanation: 'Count what the store counts, after normalising, and nothing can overflow it.',
  why: [
    'Right: the label holds bytes, so the field counts bytes of the normalised text.',
    'One grapheme can hold any number of accents, so a grapheme limit can’t cap bytes.',
    'A code unit can be up to three bytes of UTF-8, so the label could still overflow.',
  ],
};

interface S extends Setting {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The column limit: ${COLUMN} bytes. Every name accepted and matching its record, and nothing typed may overflow.`,
    act: 'Set the count, limit and normalising.',
    say: { block: 'tape', text: 'This name' },
    predicate: s => wins(settingOf(s)),
    hint: 'What does the column count? And which names arrive typed two ways?',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `One of ${WINNERS.length} settings that work. One grapheme can be ${STACK.bytes} bytes, so a grapheme limit can’t guard a column.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the label itself count?',
  },
];

function Score({ s }: { s: S }) {
  const set = settingOf(s),
    r = resultOf(set),
    ok = wins(set),
    n = r.rows.length;
  const capped = Number.isFinite(r.worst),
    worst = capped ? count(r.worst, 'byte') : 'unbounded';
  return (
    <div role="status" data-fits={ok ? '1' : '0'}>
      <p className="uc-headline">
        {`${r.accepted} of ${n} accepted · ${r.matched} of ${n} match · worst case ${worst} `}
        <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'WORKS' : 'NOT YET'}</span>
      </p>
      <p className="tc-status">
        {ok
          ? `One of ${WINNERS.length} settings that work.`
          : !capped
            ? 'One grapheme can hold any number of accents, so nothing caps the bytes.'
            : r.worst > COLUMN
              ? `Something the form accepts could take ${worst}: more than the column’s ${COLUMN}.`
              : r.accepted < n
                ? 'The form turns a customer away.'
                : 'A typed name doesn’t match its record.'}
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const p = settingOf(s),
    r = resultOf(p);
  return (
    <div className="tc-bench">
      <div className="uc-field">
        <label htmlFor="uc-count">The field counts</label>
        <Select id="uc-count" value={p.count} onChange={e => set({ ...s, ...p, count: e.target.value as Count })}>
          {COUNTS.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="uc-field">
        <label htmlFor="uc-limit">Its limit</label>
        <Select id="uc-limit" value={p.limit} onChange={e => set({ ...s, ...p, limit: Number(e.target.value) })}>
          {LIMITS.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <label className="uc-check">
        <input type="checkbox" checked={p.nfc} onChange={e => set({ ...s, ...p, nfc: e.target.checked })} /> Normalise
        to NFC first
      </label>
      <table className="tc-ledger">
        <caption>Each customer, as the form keeps the name</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Counted</th>
            <th scope="col">Bytes</th>
            <th scope="col">Matches</th>
          </tr>
        </thead>
        <tbody>
          {r.rows.map(row => (
            <tr key={row.record}>
              <th scope="row">{row.record}</th>
              <td className={row.accepted ? '' : 'bad'}>{`${row.lengths[p.count]}${row.accepted ? '' : ' ✗'}`}</td>
              <td>{row.lengths.bytes}</td>
              <td className={row.matches ? 'ok' : 'bad'}>{row.matches ? '✓ yes' : '✗ no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        The names are fictional customers in real-world spellings; the column’s size is a planning number for this site.
      </p>
    </div>
  );
}

/** The name the stage puts on the tape: the first the form turns away, else the longest in bytes. */
export function shownName(s: Setting) {
  const r = resultOf(s);
  return (r.rows.find(x => !x.accepted) ?? [...r.rows].sort((a, b) => b.lengths.bytes - a.lengths.bytes)[0]).kept;
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
        const p = settingOf(state),
          name = shownName(p);
        return (
          <TapeStage
            text={name}
            say={say}
            caption={`${resultOf(p).rows.find(x => x.kept === name)?.accepted ? 'Longest name' : 'Turned away'}: ${count(lengthsOf(name).bytes, 'byte')}, column ${COLUMN}.`}
          />
        );
      }}
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
