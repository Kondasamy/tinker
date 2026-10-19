// The agent's visible call log (KTD7): one line per retrieval call, what it did and what it added.
// The deeper layer (R3) shows each call's exact query and the best similarity among the chunks it added.
import type { AgentCall } from '../../lib/rag/agent';
import { VERDICT_LABEL } from './logic';
import './panels.css';

const DOES: Record<AgentCall['action'], string> = { search: 'Searched the question', expand: 'Fetched the neighbours of a cut chunk', rewrite: 'Searched a rewritten question' };

export default function AgentLog({ calls, math, onMath }: { calls: AgentCall[]; math: boolean; onMath: (on: boolean) => void }) {
  const last = calls[calls.length - 1];
  return (
    <section className="agent-log" aria-label="Agent call log">
      <p className="lbl">What the agent did · {calls.length} retrieval call{calls.length === 1 ? '' : 's'}</p>
      <ol>
        {calls.map(c => (
          <li key={c.call} data-action={c.action}>
            <strong>{DOES[c.action]}</strong> → {c.chunksAdded} new chunk{c.chunksAdded === 1 ? '' : 's'}, answer {VERDICT_LABEL[c.verdict]}
            {math && <dl className="math"><dt>Query</dt><dd>{c.query}</dd><dt>Top score added</dt><dd>{c.topScore === null ? '–' : c.topScore.toFixed(3)}</dd></dl>}
          </li>
        ))}
      </ol>
      <p className="note">{last.verdict === 'correct' ? 'Answer looks right, so it stopped.' : 'Stopped: out of calls or nothing new to try.'}</p>
      <label className="check"><input type="checkbox" checked={math} onChange={e => onMath(e.target.checked)} /> Show the math</label>
    </section>
  );
}
