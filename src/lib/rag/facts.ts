// Published findings about retrieval, one or more per chapter, each checked against its source on the access date.
// History stays in data/history/timeline.json; copy quotes these from here.
import data from '../../../data/rag/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
