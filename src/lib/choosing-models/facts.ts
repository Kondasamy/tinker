// Facts about leaderboards, prices, waits and model versions (R5), each checked against its primary source and dated.
// Copy quotes them from here, never by hand.
import data from '../../../data/choosing-models/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
