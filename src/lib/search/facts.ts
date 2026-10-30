// Facts about inverted indexes, BM25 and precision for the Search module (R5), each checked against its source. Copy
// quotes them from here, never by hand.
import data from '../../../data/search/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);

/** Lucene's BM25 defaults (k1, b): the search box's starting settings read them, so copy and code can't drift. */
export const [LUCENE_K1, LUCENE_B] = fact('bm25-defaults').value!.split(' ').map(Number);
