// Facts about logins for Logins and passwords (R5), each checked against its source. Copy quotes them from here, never
// by hand. Guess rates and work factors are moving facts: they name whose figure and when.
import data from '../../../data/logins/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
