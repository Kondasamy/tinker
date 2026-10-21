// Facts about reasoning models and thinking for module 11 (R5), each checked against its source. Copy quotes them from
// here, never by hand. Provider facts (effort levels, billing, budget_tokens) move fast and are re-checked at go-live.
import data from '../../../data/reasoning/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
