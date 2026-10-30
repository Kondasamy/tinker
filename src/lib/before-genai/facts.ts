// Facts about Before GenAI, each checked against its primary source on the access date. Copy quotes them from here.
import data from '../../../data/before-genai/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
