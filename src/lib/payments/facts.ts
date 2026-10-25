// Facts about card payments under EU rules for the Card payments module (R5, R18), each checked against its source.
// Copy quotes them from here, never by hand.
import data from '../../../data/payments/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
