// Facts about robot learning (R5), each checked against its source on the access date. Copy quotes them from here.
import data from '../../../data/robots/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
