// Facts about semver, ranges, lockfiles, install scripts and three dated incidents for the Dependencies module (R5),
// each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/dependencies/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
