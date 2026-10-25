// Facts about DNS, TCP, TLS and HTTP for the Opening a web page module (R5), each checked against its RFC. Copy quotes
// them from here, never by hand.
import data from '../../../data/web-requests/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
