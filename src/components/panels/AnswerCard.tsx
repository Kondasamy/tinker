// The assistant's answer for the current run: verdict stamp, text, the cited sentence, and why it went wrong.
import type { Outcome } from '../canvas/state';
import { LOAD_FAILED, VERDICT_LABEL, stampClass } from './logic';
import './panels.css';

export default function AnswerCard({ out }: { out: Outcome | null }) {
  const a = out?.answer;
  if (out?.failed) return <p className="note" role="alert">{LOAD_FAILED}</p>;
  if (!a) return <p className="note" data-state="preparing">Preparing the answer…</p>;
  return (
    <div className="answer-card" data-verdict={a.verdict}>
      <span className={`stamp ${stampClass(a.verdict)}`}>{VERDICT_LABEL[a.verdict]}</span>
      {a.verdict === 'norecord' ? (
        // R21: never show an unrelated answer
        <p>There is no recorded answer for this exact setting. The retrieval results are live; only the model’s reply is missing.</p>
      ) : <>
        <p className="said">“{a.text}”</p>
        {a.citation
          ? <p className="cite"><span className="lbl">Cites</span> <mark>{a.citation}</mark></p>
          : <p className="cite note">No source cited.</p>}
        {a.why && <p className="why">{a.why}</p>}
      </>}
      {out?.preparing && <p className="note">Preparing these chunks…</p>}
    </div>
  );
}
