// Facts about 429, Retry-After, token buckets, per-key limits and jitter for the Rate limits module (R5), each checked
// against its source. Copy quotes them from here, never by hand.
import data from '../../../data/rate-limits/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
