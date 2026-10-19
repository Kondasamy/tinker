// Chapter 6 comparison (R17): one row per run of a question under a RAG type, accumulating so types sit side by side.
import { VERDICT_LABEL, stampClass } from './logic';
import type { Lookup } from '../../lib/rag/answers';
import './panels.css';

export interface ResultRow { q: string; type: string; verdict: Lookup['verdict']; calls: number; chunks: number }

export default function ResultStrip({ rows, label }: { rows: ResultRow[]; label: (row: ResultRow) => { question: string; type: string } }) {
  if (!rows.length) return null;
  return (
    <table className="result-strip" aria-label="Results by RAG type">
      <thead><tr><th scope="col">Question</th><th scope="col">Type</th><th scope="col">Answer</th><th scope="col">Retrieval calls</th><th scope="col">Chunks</th></tr></thead>
      <tbody>
        {rows.map((r, i) => { const l = label(r); return (
          <tr key={i} data-type={r.type} data-verdict={r.verdict}>
            <td>{l.question}</td><td>{l.type}</td>
            <td><span className={`stamp ${stampClass(r.verdict)}`}>{VERDICT_LABEL[r.verdict]}</span></td>
            <td className="num">{r.calls}</td><td className="num">{r.chunks}</td>
          </tr>
        ); })}
      </tbody>
    </table>
  );
}
