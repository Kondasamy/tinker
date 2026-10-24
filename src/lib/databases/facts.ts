// Facts about B-trees, indexes and query planners for the Databases module (R5), each checked against its source. Copy
// quotes them from here, never by hand.
import data from '../../../data/databases/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
