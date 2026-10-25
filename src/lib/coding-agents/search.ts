// Chapter 2's search, run live over the repo's files (KTD8), and the cost of what the agent reads: every byte it is
// shown goes into its context, at BYTES_PER_TOKEN bytes a token (scale.ts).
import { BYTES_PER_TOKEN } from '../scale';
import { FILES } from './repo';

export interface Hit {
  path: string;
  /** the matching lines, 1-based, as the agent is shown them */
  lines: { n: number; text: string }[];
}

/** Every file with a line holding the query (any case), as grep finds them: the most matching lines first. */
export function search(q: string, files = FILES): Hit[] {
  const needle = q.toLowerCase();
  return files
    .map(f => ({
      path: f.path,
      lines: f.text
        .split('\n')
        .map((text, i) => ({ n: i + 1, text }))
        .filter(l => l.text.toLowerCase().includes(needle)),
    }))
    .filter(h => h.lines.length > 0)
    .sort((a, b) => b.lines.length - a.lines.length || a.path.localeCompare(b.path));
}

export const bytesOf = (s: string) => new TextEncoder().encode(s).length;
/** What reading a text costs the agent, in tokens. */
export const tokensOf = (s: string) => Math.ceil(bytesOf(s) / BYTES_PER_TOKEN);
/** The search results as the agent reads them: one `path:line: text` per match. */
export const hitsText = (hits: Hit[]) => hits.flatMap(h => h.lines.map(l => `${h.path}:${l.n}: ${l.text}\n`)).join('');
