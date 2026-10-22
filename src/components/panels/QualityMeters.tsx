// Retrieval quality and answer quality, side by side but measured separately (R15): recall@k against the
// question's gold sentences, and the evaluator's verdict on the recorded answer. They can move independently.
import type { Outcome } from '../canvas/state';
import { VERDICT_LABEL, recallOf, stampClass } from './logic';
import './panels.css';

export default function QualityMeters({ out }: { out: Outcome | null }) {
  const r = out?.record && recallOf(out.record),
    a = out?.answer;
  const pct = r ? Math.round(r.value * 100) : null;
  return (
    <div className="meters" role="group" aria-label="Quality meters">
      <div className="meter" data-testid="recall-meter" data-value={pct ?? ''}>
        <span className="lbl">Retrieval · recall@{r?.k ?? 'k'}</span>
        <strong>{pct === null ? '–' : `${pct}%`}</strong>
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${pct ?? 0}%` }} />
        </span>
        <span className="note">
          {r ? `${r.found} of ${r.total} gold sentence${r.total === 1 ? '' : 's'} retrieved` : 'Nothing retrieved'}
        </span>
      </div>
      <div className="meter" data-testid="verdict-meter" data-verdict={a?.verdict ?? ''}>
        <span className="lbl">Answer · evaluator</span>
        {a ? <span className={`stamp ${stampClass(a.verdict)}`}>{VERDICT_LABEL[a.verdict]}</span> : <strong>…</strong>}
        <span className="note">
          {a?.verdict === 'correct' ? 'Matches the policy' : a ? 'Does not match the policy' : 'Preparing…'}
        </span>
      </div>
    </div>
  );
}
