// Facts about matrix factorization, implicit feedback, feedback loops and two-stage recommenders for the
// Recommendations module (R5), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/recommendations/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
