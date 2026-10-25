// Facts about synthetic data for the Synthetic data module (R5), each checked against its source. Large-model findings
// are labelled as such and kept apart from Larkspur's toy numbers. Copy quotes them from here, never by hand.
import data from '../../../data/synthetic-data/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
