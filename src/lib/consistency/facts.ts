// Facts about CAP, quorums, conflict rules and consistency models for the Replication & consistency module (R5), each
// checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/consistency/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
