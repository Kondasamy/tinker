// What reached the model: the retrieved chunks with their similarity, negations and cut edges marked,
// plus the optional deeper layer (R3): the cosine formula with this run's numbers for the top chunk.
import type { Outcome } from '../canvas/state';
import type { RagIndex } from '../../lib/rag/load';
import { RERANK_POOL } from '../../lib/rag/engine';
import { blendParts, cosineParts, fragment, isNegation } from './logic';
import './panels.css';

const fmt = (v: ArrayLike<number>) => `[${Array.from({ length: 4 }, (_, i) => v[i]).join(', ')}, … ${v.length} numbers]`;

function Words({ text }: { text: string }) {
  const f = fragment(text);
  return (
    <p className="chunk-text">
      {f.head && <span className="frag" title="Starts mid-sentence">…</span>}
      {text.split(' ').map((w, i) => <span key={i}>{i > 0 && ' '}{isNegation(w) ? <mark className="neg">{w}</mark> : w}</span>)}
      {f.tail && <span className="frag" title="Cut mid-sentence"> ✂</span>}
    </p>
  );
}

function MathBox({ index, out }: { index: RagIndex; out: Outcome }) {
  const r = out.record!, cfg = index.get(r.file);
  // with the reranker on, its top pick is the chunk the math follows
  const top = [...r.context].sort((a, b) => (r.stages.rerank ? (b.rerankScore ?? -Infinity) - (a.rerankScore ?? -Infinity) : 0) || b.score - a.score)[0];
  if (!cfg || !top) return null;
  const D = cfg.D;
  const q = index.queries.subarray(r.queryIndex * D, (r.queryIndex + 1) * D), c = cfg.vectors.subarray(top.id * D, (top.id + 1) * D);
  const m = cosineParts(q, c);
  return (
    <div className="math" data-testid="math">
      <p className="formula">similarity = cos(q, c) = (q · c) / (‖q‖ × ‖c‖)</p>
      <dl className="facts">
        <dt>q</dt><dd>your question as numbers: {fmt(q)}</dd>
        <dt>c</dt><dd>the top chunk as numbers: {fmt(c)}</dd>
        <dt>q · c</dt><dd>{m.dot.toLocaleString('en')} (multiply matching numbers, add them up)</dd>
        <dt>‖q‖, ‖c‖</dt><dd>{m.qn.toFixed(1)}, {m.cn.toFixed(1)} (each vector’s length)</dd>
        <dt>Score</dt><dd>{m.dot.toLocaleString('en')} / ({m.qn.toFixed(1)} × {m.cn.toFixed(1)}) = <strong>{m.cos.toFixed(3)}</strong></dd>
      </dl>
      {r.stages.bm25 && (() => {
        const b = blendParts(r, top.id);
        return <>
          <h4>Hybrid blend</h4>
          <dl className="facts" data-testid="math-blend">
            <dt>Vector</dt><dd>{b.cos.toFixed(3)}, scaled to {b.nv.toFixed(2)} (0 = worst chunk, 1 = best)</dd>
            <dt>Keyword</dt><dd>BM25 {b.bm25.toFixed(2)}, scaled to {b.nb.toFixed(2)} (counts shared words, rare words weigh more)</dd>
            <dt>Weight</dt><dd>{b.w.toFixed(1)} on keywords, {(1 - b.w).toFixed(1)} on meaning</dd>
            <dt>Blended</dt><dd>{(1 - b.w).toFixed(1)} × {b.nv.toFixed(2)} + {b.w.toFixed(1)} × {b.nb.toFixed(2)} = <strong>{b.blended.toFixed(3)}</strong></dd>
          </dl>
        </>;
      })()}
      {r.stages.rerank && <>
        <h4>Cross-encoder rerank</h4>
        <dl className="facts" data-testid="math-rerank">
          <dt>Score</dt><dd>{top.rerankScore === null ? 'no score (sorted last)' : <strong>{top.rerankScore.toFixed(2)}</strong>}: a second model reads the question and this chunk together and rates the match. It re-sorts the top {Math.max(r.recall.k, RERANK_POOL)} candidates and keeps the best {r.recall.k}.</dd>
        </dl>
      </>}
      <p className="note">1 means same direction (same meaning), 0 means unrelated. Numbers are stored as small whole numbers to keep the download light; the shared scale cancels out.</p>
    </div>
  );
}

export default function EvidenceList({ out, index, math, onMath }: { out: Outcome | null; index: RagIndex | null; math: boolean; onMath: (on: boolean) => void }) {
  const r = out?.record;
  if (!out) return <p className="note">Preparing…</p>;
  if (!out.analysis.wired || !r) return <p className="note">Nothing reaches the model yet: there is no retriever on the wire.</p>;
  return (
    <>
      <p className="note">{r.context.length} chunk{r.context.length === 1 ? '' : 's'} reached the model, in this order. Bars show similarity to the question.</p>
      <label className="check"><input type="checkbox" checked={math} onChange={e => onMath(e.target.checked)} /> Show the math</label>
      {math && index && <MathBox index={index} out={out} />}
      <ol className="evidence">
        {r.context.map(c => (
          <li key={c.id}>
            <div className="ev-head"><span className="title">{c.title}</span><span className="score">{c.score.toFixed(3)}</span></div>
            <span className="bar" aria-hidden="true"><span style={{ width: `${Math.max(0, c.score) * 100}%` }} /></span>
            <Words text={c.text} />
          </li>
        ))}
      </ol>
    </>
  );
}
