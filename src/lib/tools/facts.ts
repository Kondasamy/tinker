// MCP and provider facts for module 2 (R22), each checked against its primary source. Copy quotes them from here, never by hand.
import data from '../../../data/tool-calling/facts.json' with { type: 'json' };

export interface Fact {
  id: string;
  /** the fact, in a sentence copy can quote */
  claim: string;
  /** a machine-readable value, where the fact has one (e.g. the spec version) */
  value?: string;
  source: string;
}

/** The day every fact was last checked against its source (YYYY-MM-DD). */
export const ACCESSED: string = data.accessed;
export const FACTS: Fact[] = data.facts;

export function fact(id: string): Fact & { accessed: string } {
  const f = FACTS.find(f => f.id === id);
  if (!f) throw new Error(`unknown fact: ${id}`);
  return { ...f, accessed: ACCESSED };
}

export const MCP_VERSION = fact('mcp-version').value!;
