// Small drawer pieces shared by the story chapters: a cited-source link and the assistant's (wrong) answer.
import type { TimelineEntry } from '../../lib/scale';
import './scenes.css';

export const Source = ({ e }: { e: Pick<TimelineEntry, 'sourceTitle' | 'sourceUrl'> }) => (
  <a className="source" href={e.sourceUrl} target="_blank" rel="noreferrer">Source: {e.sourceTitle}</a>
);

export const Answer = ({ answer, verdict, why }: { answer: string; verdict: string; why: string }) => (
  <div className="answer">
    <p className="said">“{answer}”</p>
    <span className="stamp wrong">{verdict.toUpperCase()}</span>
    <p>{why}</p>
  </div>
);
