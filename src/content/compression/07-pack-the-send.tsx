// Chapter 7: pack the nightly send, the workbench. A coder for each text and the random file, shades and block size for
// the picture; every plan runs for real on the site files. The puzzle accepts every plan within both budgets (WINNERS,
// pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { FILES, fileOf } from '../../lib/compression/files';
import { CODERS, CODER_IDS, type CoderId } from '../../lib/compression/coders';
import { BLOCKS, LEVELS } from '../../lib/compression/lossy';
import {
  BEST,
  BUDGET,
  LOSSLESS,
  START,
  WINNERS,
  benchPlan,
  runPlan,
  wins,
  type Plan,
} from '../../lib/compression/workbench';
import { PILE_PARTS } from '../../components/scenes/pileScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CompressionStage, Fact, FilesNote, bytes } from './kit';

const MODULE = 'compression',
  ID = '07-pack-the-send';
export const PARTS = PILE_PARTS;
const RAW = FILES.reduce((a, f) => a + f.bytes.length, 0);

export const QUIZ = {
  question: 'Another shop sends a spreadsheet, a zip of photos and a video each night. Which plan fits what you found?',
  options: [
    'Pack the spreadsheet losslessly; send the zip as it is; let the video lose detail',
    'Zip everything again, the zip included',
    'Pack all three lossily to save the most',
  ],
  correct: 0,
  explanation:
    'Lossless where every byte matters, nothing where the bytes are already packed, loss only where eyes forgive it.',
  why: [
    'Right: text shrinks losslessly, packed bytes won’t shrink, and only the picture-like file can lose detail.',
    'A zip is already packed: packing it again only adds tables.',
    'Lossy figures in a spreadsheet would be wrong figures.',
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
    narration: `The budget: ${bytes(BUDGET.bytes)} a night, the picture at most ${BUDGET.diff}% different. Texts must come back exact.`,
    act: 'Pick a setting for each file.',
    say: { block: 'parcel', text: 'Tonight’s send' },
    predicate: s => wins(benchPlan(s)),
    hint: 'Which file can’t shrink at all? And how few shades does the picture stand?',
    solution: s => ({ ...s, ...benchPlan(WINNERS[0]) }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} plans that fit: short codes alone come close enough on text.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which file is already packed?',
  },
];

function Score({ s }: { s: S }) {
  const r = runPlan(benchPlan(s)),
    best = wins(benchPlan(s));
  const over = r.total > BUDGET.bytes,
    blurry = r.diff > BUDGET.diff;
  return (
    <div role="status" data-total={r.total} data-fits={best ? '1' : '0'}>
      <p className="cz-headline">
        <strong>{bytes(r.total)}</strong>
        {` of ${bytes(BUDGET.bytes)} · ${r.diff}% different `}
        <span className={`stamp ${best ? 'correct' : 'wrong'}`}>
          {best ? 'FITS' : over && blurry ? 'TOO BIG, TOO BLURRY' : over ? 'TOO BIG' : 'TOO BLURRY'}
        </span>
      </p>
      <p className="tc-status">
        {best
          ? `One of ${WINNERS.length} plans that work. The best is ${bytes(BEST)}.`
          : `The best plan sends ${bytes(BEST)}.`}
      </p>
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const p = benchPlan(s),
    r = runPlan(p);
  return (
    <div className="tc-bench">
      {LOSSLESS.map(id => (
        <div className="cz-field" key={id}>
          <label htmlFor={`cz-${id}`}>{fileOf(id).title}</label>
          <select
            id={`cz-${id}`}
            value={p.coders[id]}
            onChange={e => set({ ...s, coders: { ...p.coders, [id]: e.target.value as CoderId } })}
          >
            {CODER_IDS.map(c => (
              <option key={c} value={c}>
                {CODERS[c].name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="cz-field">
        <label htmlFor="cz-shades">{`${fileOf('picture').title}: shades per colour`}</label>
        <select id="cz-shades" value={p.levels} onChange={e => set({ ...s, levels: Number(e.target.value) })}>
          {LEVELS.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="cz-field">
        <label htmlFor="cz-blocks">{`${fileOf('picture').title}: block size`}</label>
        <select id="cz-blocks" value={p.block} onChange={e => set({ ...s, block: Number(e.target.value) })}>
          {BLOCKS.map(b => (
            <option key={b} value={b}>
              {`${b} × ${b}`}
            </option>
          ))}
        </select>
      </div>
      <table className="tc-ledger">
        <caption>Each file tonight</caption>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">Raw</th>
            <th scope="col">Sent</th>
            <th scope="col">Difference</th>
          </tr>
        </thead>
        <tbody>
          {r.rows.map(row => (
            <tr key={row.id} data-file={row.id}>
              <th scope="row">{fileOf(row.id).name}</th>
              <td>{row.raw}</td>
              <td className={row.size > row.raw ? 'bad' : row.size < row.raw ? 'ok' : ''}>{row.size}</td>
              <td className={row.diff > BUDGET.diff ? 'bad' : ''}>{`${row.diff}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note cz-note">The budget is a planning number written for this site.</p>
      <FilesNote />
    </div>
  );
}

export default function PackTheSend() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...benchPlan(START), quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runPlan(benchPlan(state));
        return (
          <CompressionStage
            say={say}
            show={{
              table: {
                piles: r.rows.map(row => ({
                  label: fileOf(row.id).name.split('.')[0],
                  w: row.size,
                  kind: row.size > row.raw ? ('pointer' as const) : undefined,
                })),
                parcel: { raw: RAW, packed: r.total },
              },
              caption: `Tonight’s send: ${bytes(r.total)} of ${bytes(RAW)}, ${bytes(BUDGET.bytes)} allowed.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="brotli" />
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
