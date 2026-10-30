// Before GenAI kit: the pieces several chapters share. Every chapter shows at least one cited fact (tests/unit/
// research-coverage.test.ts); a toy number that isn't a real one says so beside it (ToyNote).
import Cite from '../../components/story/Cite';
import { fact } from '../../lib/before-genai/facts';
import '../tool-calling/tools.css';

/** A cited fact from data/before-genai/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside any toy or hand-set number, so the reader can tell it from the real figure next to it. */
export const ToyNote = () => <p className="note">A toy system with hand-set numbers, not a real one.</p>;
