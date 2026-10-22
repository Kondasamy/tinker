// Chapter 6 comparison (R17): one row per run of a question under a RAG type, accumulating so types sit side by side.
// `latest` renders the compact inline form under the canvas (the last few runs); the full table lives in the drawer.
import { VERDICT_LABEL, stampClass } from './logic';
import type { Lookup } from '../../lib/rag/answers';
import type { Outcome } from '../canvas/state';
import type { Panel } from '../story/StepRunner';
import './panels.css';

export interface ResultRow {
  q: string;
  type: string;
  verdict: Lookup['verdict'];
  calls: number;
  chunks: number;
}

/** The row for a run of question `q` as `type`; call only once `o.answer` is set. */
export const rowOf = (q: string, type: string, o: Outcome): ResultRow => ({
  q,
  type,
  verdict: o.answer!.verdict,
  calls: o.calls?.length ?? (o.record ? 1 : 0),
  chunks: o.record?.context.length ?? 0,
});
/** Rows with `r` appended, replacing any earlier row for the same question and type. */
export const withRow = (rows: ResultRow[], r: ResultRow) => [...rows.filter(x => x.q !== r.q || x.type !== r.type), r];

interface Props {
  rows: ResultRow[];
  label: (row: ResultRow) => { question: string; type: string };
  latest?: number;
  onAll?: () => void;
}

export default function ResultStrip({ rows, label, latest, onAll }: Props) {
  if (!rows.length) return null;
  const shown = latest ? rows.slice(-latest) : rows;
  const table = (
    <table
      className={latest ? 'result-strip compact' : 'result-strip'}
      aria-label={latest ? 'Latest results' : 'Results by RAG type'}
    >
      <thead>
        <tr>
          <th scope="col">Question</th>
          <th scope="col">Type</th>
          <th scope="col">Answer</th>
          <th scope="col">{latest ? 'Calls' : 'Retrieval calls'}</th>
          <th scope="col">Chunks</th>
        </tr>
      </thead>
      <tbody>
        {shown.map((r, i) => {
          const l = label(r);
          return (
            <tr key={rows.length - shown.length + i} data-type={r.type} data-verdict={r.verdict}>
              <td>{l.question}</td>
              <td>{l.type}</td>
              <td>
                <span className={`stamp ${stampClass(r.verdict)}`}>{VERDICT_LABEL[r.verdict]}</span>
              </td>
              <td className="num">{r.calls}</td>
              <td className="num">{r.chunks}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  if (!latest) return table;
  return (
    <div className="strip-latest">
      {table}
      {onAll && (
        <button type="button" className="chip" onClick={onAll}>
          {rows.length > shown.length ? `All ${rows.length} runs` : 'Compare'} →
        </button>
      )}
    </div>
  );
}

/** The drawer's full comparison table. */
export const comparePanel = <S extends { rows: ResultRow[] }>(label: Props['label']): Panel<S> => ({
  title: 'Every run, side by side',
  render: s =>
    s.rows.length ? (
      <ResultStrip rows={s.rows} label={label} />
    ) : (
      <p className="note">Run a question to start the comparison.</p>
    ),
});
