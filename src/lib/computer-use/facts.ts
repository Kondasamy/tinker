// Facts about computer use for the module (R5), each checked against its source on the access date. Copy quotes them
// from here, never by hand. The OSWorld leader moves: it is quoted only as a dated, attributed figure.
import data from '../../../data/computer-use/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
