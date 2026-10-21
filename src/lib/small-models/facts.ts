// Facts about distillation, cascades, routers and prices for Small models (R5), each checked against its source. Copy
// quotes them from here, never by hand.
import data from '../../../data/small-models/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
