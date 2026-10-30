// RAG's kit: a published finding about retrieval, opened from a Cite mark, beside the chapter's own run.
import Cite from '../../components/story/Cite';
import { fact } from '../../lib/rag/facts';

export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
