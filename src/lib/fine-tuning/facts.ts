// Facts about fine-tuning for module 9 (R5, R12), each checked against its source. Copy quotes them from here, never by
// hand. Availability facts are dated: providers' offers changed in 2026. No fact names a place to fine-tune.
import data from '../../../data/fine-tuning/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
