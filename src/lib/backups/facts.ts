// Facts about the 3-2-1 rule, offline copies, RPO and RTO, incremental chains and real incidents for the Backups
// module (R5), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/backups/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
