// Facts about voice agents for module 17 (R5), each checked against its source. Copy quotes them from here, never by
// hand. Provider facts (turn detection settings, audio formats) move fast and are re-checked at go-live.
import data from '../../../data/voice/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
