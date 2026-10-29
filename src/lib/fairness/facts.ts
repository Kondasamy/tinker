// Facts about group fairness, its impossibility results and the law on credit decisions for the Fairness module (R5),
// each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/fairness/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
