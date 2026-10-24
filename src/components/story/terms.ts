// Inline terms: each of a chapter's "Words you'll meet" is marked once, where the chapter's narration first uses it.
// Pure, so the runner, the copy-budget test and any stage can share it.

export interface TermMark {
  term: string;
  def: string;
  text: string; // the words as the narration writes them
}
export type Segment = string | TermMark;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Per step, the narration split into plain text and marked terms. A term is marked only at its first use in
 * step order (a plural "s" counts), never inside another word; when two terms overlap the longer one wins. */
export function markTerms(narrations: readonly string[], terms: readonly (readonly [string, string])[]): Segment[][] {
  const marks: { start: number; end: number; mark: TermMark }[][] = narrations.map(() => []);
  for (const [term, def] of [...terms].sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`(?<![\\w-])${escapeRe(term)}s?(?![\\w-])`, 'gi');
    found: for (const [i, text] of narrations.entries())
      for (const m of text.matchAll(re)) {
        const start = m.index,
          end = start + m[0].length;
        if (marks[i].some(k => start < k.end && end > k.start)) continue;
        marks[i].push({ start, end, mark: { term, def, text: m[0] } });
        break found;
      }
  }
  return narrations.map((text, i) => {
    const out: Segment[] = [];
    let at = 0;
    for (const { start, end, mark } of marks[i].sort((a, b) => a.start - b.start)) {
      if (start > at) out.push(text.slice(at, start));
      out.push(mark);
      at = end;
    }
    if (at < text.length || out.length === 0) out.push(text.slice(at));
    return out;
  });
}

/** Terms a chapter lists that its narration never uses, so they can't be marked inline. */
export const unmarked = (narrations: readonly string[], terms: readonly (readonly [string, string])[]) => {
  const used = new Set(
    markTerms(narrations, terms)
      .flat()
      .flatMap(s => (typeof s === 'string' ? [] : [s.term])),
  );
  return terms.map(([t]) => t).filter(t => !used.has(t));
};
