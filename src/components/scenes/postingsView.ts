// Search's precise view (the Postings tab): the index's drawers for a query's words, as rows. Each row names the word,
// how many pages it is on, its rarity (tf-idf's weight, log(pages ÷ pages with it)) and its pages, best first, with
// how often each says it and what the word adds to that page's score under the chosen weighting. Pure: the kit draws
// it as an HTML table, so it has no markup to escape.
import { N, fmt, idf, pageName, postings, scores, termsOf, type Settings } from '../../lib/search/engine';

export interface Posting {
  page: number;
  name: string;
  /** times the word is on the page */
  tf: number;
  /** what the word adds to the page's score */
  adds: number;
}
export interface PostingRow {
  word: string;
  /** pages the word is on */
  pages: number;
  /** log(N / pages): rarer is heavier */
  rarity: number;
  /** its pages, highest first, capped */
  list: Posting[];
  /** pages left off the list */
  more: number;
}

/** A query's drawers, in the query's word order; `cap` pages listed per word. */
export function postingsView(query: string, s: Settings, cap = 5): PostingRow[] {
  return termsOf(query, s.clean).map(word => {
    const p = postings(word, s.clean),
      one = scores(word, s);
    const list = p.doc
      .map((page, i) => ({ page, name: pageName(page), tf: p.tf[i], adds: one[page] }))
      .sort((a, b) => b.adds - a.adds || a.page - b.page);
    return {
      word,
      pages: p.doc.length,
      rarity: idf(word, s.clean),
      list: list.slice(0, cap),
      more: Math.max(0, list.length - cap),
    };
  });
}

/** A row in words, for a screen reader or the caption. */
export const rowWords = (r: PostingRow) =>
  r.pages
    ? `“${r.word}” is on ${fmt(r.pages)} of ${fmt(N)} pages, rarity ${r.rarity.toFixed(1)}.`
    : `“${r.word}” is on no page: its drawer is empty.`;
