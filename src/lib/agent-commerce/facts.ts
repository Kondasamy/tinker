// Protocol facts for When the buyer is an agent (R5), each checked against its source. Protocols move fast: every
// claim says whose and when, and copy quotes them from here, never by hand.
import data from '../../../data/agent-commerce/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
