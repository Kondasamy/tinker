// Facts about coding agents for the module (R5), each checked against its source on the access date. Copy quotes them
// from here, never by hand. The SWE-bench Verified leader moves: it is quoted only as a dated, attributed figure.
import data from '../../../data/coding-agents/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
