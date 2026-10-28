// Facts about video and world models (R5), each checked against its primary source. Copy quotes them from here, never by hand.
import data from '../../../data/video-models/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
