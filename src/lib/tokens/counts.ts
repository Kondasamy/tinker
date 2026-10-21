// Counting text four ways (tokens, words, characters, bytes), and Larkspur's documents against the bytes ÷ 4 rule (R7.3).
import { encode } from '../lm/bpe';
import { tokensFor } from '../scale';
import { TOKENIZERS, realCorpusTokens } from './encodings';

export interface Counts { tokens: number; words: number; chars: number; bytes: number }

const enc = new TextEncoder();
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** Tokens are the site tokenizer's; words split on whitespace, as RAG's index does; characters are what a reader sees. */
export const countText = (text: string): Counts => ({
  tokens: encode(text).length,
  words: text.split(/\s+/).filter(Boolean).length,
  chars: [...graphemes.segment(text)].length,
  bytes: enc.encode(text).length,
});

const RAW = import.meta.glob<string>('/data/corpus/*.md', { query: '?raw', import: 'default', eager: true });
/** Every corpus document, sorted by file name: the text the site tokenizer and the recordings were counted on. */
export const CORPUS = Object.entries(RAW).map(([p, text]) => ({ file: p.slice(p.lastIndexOf('/') + 1), text })).sort((a, b) => (a.file < b.file ? -1 : 1));

export interface Meter {
  bytes: number;
  /** the bytes ÷ 4 rule of thumb */
  rule: number;
  /** the site tokenizer's count: in-sample, since it was trained on these documents (R6) */
  site: number;
  real: { id: string; name: string; tokens: number; bytesPerToken: number }[];
}

let meter: Meter | undefined;
/** Larkspur's documents counted: computed once, on first use. */
export function corpusMeter(): Meter {
  if (meter) return meter;
  const bytes = CORPUS.reduce((n, d) => n + enc.encode(d.text).length, 0);
  return (meter = {
    bytes,
    rule: tokensFor(bytes),
    site: CORPUS.reduce((n, d) => n + encode(d.text).length, 0),
    real: TOKENIZERS.map((t) => { const tokens = realCorpusTokens(t.id); return { id: t.id, name: t.name, tokens, bytesPerToken: bytes / tokens }; }),
  });
}
