// Facts about memorisation for What a model remembers (R5), each checked against its source. Large-model findings are
// labelled as such and kept apart from Larkspur's toy numbers. Copy quotes them from here, never by hand.
import data from '../../../data/memorisation/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
