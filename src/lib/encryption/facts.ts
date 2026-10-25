// Facts about cryptography for Locks and keys (R5), each checked against its source. Copy quotes them from here, never
// by hand. Key sizes and the post-quantum dates are moving facts: they name whose figure and when.
import data from '../../../data/encryption/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
