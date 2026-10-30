// Facts about __TITLE__, each checked against its primary source on the access date. Copy quotes them from here.
import data from '../../../data/__ID__/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
