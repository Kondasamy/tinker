// Facts about images as tokens for module 16 (R5), each checked against its source. Copy quotes them from here, never by
// hand. The patch rule, the tiers and their limits move with new models and are re-checked when the module changes.
import data from '../../../data/multimodal/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
