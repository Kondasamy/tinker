// Facts about controlled experiments for the A/B testing module (R5), each checked against its source. Copy quotes them
// from here, never by hand.
import data from '../../../data/ab-testing/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
