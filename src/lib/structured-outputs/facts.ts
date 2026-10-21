// Facts about structured outputs for module 10 (R5), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/structured-outputs/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
