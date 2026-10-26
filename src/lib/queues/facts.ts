// Facts about leases, at-least-once delivery, dead-letter queues and jitter for the Queues module (R5), each checked
// against its source. Copy quotes them from here, never by hand.
import data from '../../../data/queues/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
