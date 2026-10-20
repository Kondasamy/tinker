// Facts about agents for module 3 (R8), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/agents/facts.json' with { type: 'json' };
import type { Fact } from '../tools/facts';

/** The day every fact was last checked against its source (YYYY-MM-DD). */
export const ACCESSED: string = data.accessed;
export const FACTS: Fact[] = data.facts;

export function fact(id: string): Fact & { accessed: string } {
  const f = FACTS.find(f => f.id === id);
  if (!f) throw new Error(`unknown fact: ${id}`);
  return { ...f, accessed: ACCESSED };
}
