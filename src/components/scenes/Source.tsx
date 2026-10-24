// Small drawer pieces shared by the story chapters: a cited-source link and the assistant's (wrong) answer.
import type { TimelineEntry } from '../../lib/scale';
import Cite from '../story/Cite';
import './scenes.css';

export const Source = ({ e }: { e: Pick<TimelineEntry, 'sourceTitle' | 'sourceUrl'> }) => (
  <Cite title={e.sourceTitle} href={e.sourceUrl} />
);

export const Answer = ({ answer, verdict, why }: { answer: string; verdict: string; why: string }) => (
  <div className="answer">
    <p className="said">“{answer}”</p>
    <span className="stamp wrong">{verdict.toUpperCase()}</span>
    <p>{why}</p>
  </div>
);
