// Chapter 2 maths: corpus size → tokens, against the largest context window cited in the timeline.
import timeline from '../../data/history/timeline.json' with { type: 'json' };

export interface TimelineEntry {
  date: string;
  era: string;
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  /** Context window size this entry cites, in tokens (only on context-window entries). */
  contextTokens?: number;
  /** Who shipped it, for labels, e.g. "Llama 4 Scout". */
  model?: string;
}

export const TIMELINE = timeline as TimelineEntry[];

// Rule of thumb from the cited OpenAI tokenizer guide: about 4 characters of English per token.
// Plain text is about 1 byte per character, so tokens ≈ bytes ÷ 4.
export const BYTES_PER_TOKEN = 4;
export const tokensFor = (bytes: number) => bytes / BYTES_PER_TOKEN;

/** Slider stops: one 50 KB document, then ×10 each stop up to 5 PB (decimal units). */
export const STOPS = Array.from({ length: 12 }, (_, i) => 5e4 * 10 ** i);
export const STOP_5TB = STOPS.indexOf(5e12);

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export function formatBytes(b: number) {
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log10(b) / 3));
  return `${+(b / 10 ** (i * 3)).toPrecision(3)} ${UNITS[i]}`;
}
export const formatTokens = (t: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 }).format(t);

/** The largest context window any timeline entry cites: the container the corpus must fit in. */
export const LARGEST = TIMELINE.filter(e => e.contextTokens).reduce((a, e) => (e.contextTokens! > a.contextTokens! ? e : a));
export const WINDOW = LARGEST.contextTokens!;

export const overflows = (bytes: number) => tokensFor(bytes) > WINDOW;

export interface Price { perMillion: number; model: string; asOf: string; sourceTitle: string; sourceUrl: string }
/** Cited input-token price for the cost line; null hides cost (we never guess a rate). */
export const PRICE: Price | null = {
  perMillion: 2, model: 'Claude Sonnet 5.5, base input price', asOf: '2026-10-19',
  sourceTitle: 'Anthropic, Models overview (Claude docs)', sourceUrl: 'https://platform.claude.com/docs/en/about-claude/models/overview',
};

/** Sources for the bytes ÷ 4 rule and the unstructured-data share quoted in chapter 2. */
export const TOKENS_SOURCE = {
  claim: 'Rule of thumb for English: 1 token ≈ 4 characters ≈ ¾ of a word.',
  sourceTitle: 'OpenAI Help Center, What are tokens and how to count them?',
  sourceUrl: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them',
};
export const UNSTRUCTURED_SOURCE = {
  claim: 'IDC (2023): in 2022, 90% of the data organizations generated was unstructured; only 10% was structured.',
  sourceTitle: 'StorageNewsletter, What every executive needs to know about unstructured data (IDC, Aug 2023)',
  sourceUrl: 'https://www.storagenewsletter.com/2023/09/07/what-every-executive-needs-to-know-about-unstructured-data/',
};
