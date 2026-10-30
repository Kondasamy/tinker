// Facts about Dijkstra, A*, live traffic and contraction hierarchies for the Finding the way module (R5), each checked
// against its source. Copy quotes them from here, never by hand.
import data from '../../../data/routes/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
