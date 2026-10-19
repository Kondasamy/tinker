// Chapter 6 comparison (R17): one row per run of a question under a RAG type, accumulating so types sit side by side.
// `latest` renders the compact inline form under the canvas (the last few runs); the full table lives in the drawer.
import { VERDICT_LABEL, stampClass } from './logic';
import type { Lookup } from '../../lib/rag/answers';
import './panels.css';

export interface ResultRow { q: string; type: string; verdict: Lookup['verdict']; calls: number; chunks: number }

interface Props { rows: ResultRow[]; label: (row: ResultRow) => { question: string; type: string }; latest?: number; onAll?: () => void }

export default function ResultStrip({ rows, label, latest, onAll }: Props) {
  if (!rows.length) return null;
  const shown = latest ? rows.slice(-latest) : rows;
  const table = (
    <table className={latest ? 'result-strip compact' : 'result-strip'} aria-label={latest ? 'Latest results' : 'Results by RAG type'}>
      <thead><tr><th scope="col">Question</th><th scope="col">Type</th><th scope="col">Answer</th><th scope="col">{latest ? 'Calls' : 'Retrieval calls'}</th><th scope="col">Chunks</th></tr></thead>
      <tbody>
        {shown.map((r, i) => { const l = label(r); return (
          <tr key={rows.length - shown.length + i} data-type={r.type} data-verdict={r.verdict}>
            <td>{l.question}</td><td>{l.type}</td>
            <td><span className={`stamp ${stampClass(r.verdict)}`}>{VERDICT_LABEL[r.verdict]}</span></td>
            <td className="num">{r.calls}</td><td className="num">{r.chunks}</td>
          </tr>
        ); })}
      </tbody>
    </table>
  );
  if (!latest) return table;
  return (
    <div className="strip-latest">
      {table}
      {onAll && <button type="button" className="chip" onClick={onAll}>{rows.length > shown.length ? `All ${rows.length} runs` : 'Compare'} →</button>}
    </div>
  );
}
