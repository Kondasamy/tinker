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

/** A module's fact lookup over its own facts file; an unknown id throws, so copy can't cite a fact that isn't there. */
export function factsOf(d: { accessed: string; facts: Fact[] }) {
  return {
    /** the day every fact was last checked against its source (YYYY-MM-DD) */
    ACCESSED: d.accessed,
    FACTS: d.facts,
    fact(id: string): Fact & { accessed: string } {
      const f = d.facts.find(f => f.id === id);
      if (!f) throw new Error(`unknown fact: ${id}`);
      return { ...f, accessed: d.accessed };
    },
  };
}

export const { ACCESSED, FACTS, fact } = factsOf(data);

export const MCP_VERSION = fact('mcp-version').value!;
