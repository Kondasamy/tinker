// Facts about agent sandboxing for the module (R5), each checked against its primary source on the access date. Copy
// quotes them from here, never by hand.
import data from '../../../data/sandboxing/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
