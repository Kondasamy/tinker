// Facts about HTTP caching, CDNs and the caches inside model serving for the Caching module (R5), each checked against
// its source. Copy quotes them from here, never by hand.
import data from '../../../data/caching/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
