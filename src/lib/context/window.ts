// The turn assembler (KTD7, R10.1): what the model sees, built from parts in a fixed order and counted with the site's
// own tokenizer (R6: the counts teach the mechanism, they are not any provider's). Order: tools → system → messages,
// and within messages: memory notes and documents stuffed up front (stable for the session), then the history, then
// this turn. Stable parts come first so a session's prefix stays cacheable.
import DOCS_JSON from '../../../data/context/docs.json';
import CASES_JSON from '../../../data/context/cases.json';
import { encode } from '../lm/bpe';
import { TOOLS as ORDER_TOOLS } from '../tools/server';
import type { Notes } from './memory';
import type { Seen } from './turns';

export interface Doc { id: string; source: string; text: string }
export interface Case {
  id: string;
  customer: string;
  question: string;
  /** a few words for summaries, e.g. `free shipping` */
  topic: string;
  /** the document holding the fact the answer needs */
  fact?: string;
  /** related documents without it, most confusable first */
  distractors: string[];
}
/** Passages drawn verbatim from data/corpus/; stuffing puts them all up front in this order. */
export const DOCS = DOCS_JSON as Doc[];
export const CASES = CASES_JSON as Case[];
export const docOf = (id: string) => DOCS.find((d) => d.id === id)!;
export const caseOf = (id: string) => CASES.find((c) => c.id === id)!;

export const count = (text: string) => encode(text).length;

export type PartKind = 'tools' | 'system' | 'memory' | 'docs' | 'history' | 'message';
export interface Part { kind: PartKind; label: string; text: string; tokens: number; cleared?: boolean }
export interface Window { parts: Part[]; tokens: number }

export const SEARCH = { name: 'search_docs', description: 'Search Larkspur’s policies and FAQs. Returns the best matching passages.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } };
export const MEMORY = { name: 'memory', description: 'Create, read and update note files under /memories. They persist between conversations.', inputSchema: { type: 'object', properties: { command: { type: 'string' }, path: { type: 'string' }, file_text: { type: 'string' } }, required: ['command', 'path'] } };
const ORDER = ORDER_TOOLS.filter((t) => t.name === 'get_order' || t.name === 'issue_refund');
export const ORDER_TOOL_NAMES = ORDER.map((t) => t.name);
const TOOL_DEFS = [...ORDER, SEARCH, MEMORY].map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));

export const SYSTEM = 'You are the Larkspur Supply Co. support assistant. Answer the customer from the documents and notes you are given. If they do not say, say you do not know.';
/** The dated system prompt stamps the time each question arrives: a change at the top of every turn. */
export const systemText = (form: Seen['system'], turn: number) =>
  form === 'plain' ? SYSTEM : `${SYSTEM} Ticket opened 21 October at 09:${String(5 * turn).padStart(2, '0')}.`;

/** How the history is kept: in full, with old tool results cleared, or as one summary. */
export type Form = 'full' | 'cleared' | 'summary';
/** Clearing keeps the latest result (facts: Anthropic keeps 3 by default; Larkspur's sessions are three questions long). */
export const KEEP = 1;
export const CLEARED = (topic: string) => `[cleared: search results about ${topic}]`;

/** One question and what came with it: documents placed before it, the model's search, what came back, the answer. */
export interface Exchange { case: string; docs: string[]; call?: string; found: string[]; answer?: string }
/** Everything that decides the window. */
export interface View {
  system: Seen['system'];
  tools: string[];
  memory: Notes;
  stuff: boolean;
  form: Form;
  past: Exchange[];
  now: Exchange;
}

const docsText = (ids: string[]) => ids.map((id) => `[${id}] ${docOf(id).text}`).join('\n\n');
const firstSentence = (s: string) => s.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? s;
const hasResult = (e: Exchange) => e.docs.length + e.found.length > 0;

/** Which exchanges keep their results: all, or under `cleared` only the latest KEEP. */
function kept(v: View): Set<Exchange> {
  const all = [...v.past, v.now].filter(hasResult);
  return new Set(v.form === 'cleared' ? all.slice(-KEEP) : all);
}

function exchangeParts(e: Exchange, keep: boolean, kind: 'history' | 'message'): Omit<Part, 'tokens'>[] {
  const c = caseOf(e.case);
  const result = (ids: string[], label: string): Omit<Part, 'tokens'> =>
    keep ? { kind: 'docs', label, text: docsText(ids) } : { kind: 'docs', label, text: CLEARED(c.topic), cleared: true };
  return [
    ...(e.docs.length ? [result(e.docs, 'Retrieved documents')] : []),
    { kind, label: 'Customer', text: `${c.customer}: ${c.question}` },
    ...(e.call ? [{ kind, label: 'Search', text: e.call }] : []),
    ...(e.found.length ? [result(e.found, 'Search results')] : []),
    ...(e.answer !== undefined ? [{ kind: 'history' as const, label: 'Assistant', text: e.answer }] : []),
  ];
}

export function assemble(v: View): Window {
  const keep = kept(v);
  const raw: Omit<Part, 'tokens'>[] = [
    ...(v.tools.length ? [{ kind: 'tools' as const, label: 'Tools', text: JSON.stringify(TOOL_DEFS.filter((t) => v.tools.includes(t.name))) }] : []),
    { kind: 'system', label: 'System prompt', text: systemText(v.system, v.past.length) },
    ...(Object.keys(v.memory).length ? [{ kind: 'memory' as const, label: 'Memory notes', text: Object.entries(v.memory).map(([f, t]) => `${f}: ${t}`).join('\n') }] : []),
    ...(v.stuff ? [{ kind: 'docs' as const, label: 'Every document', text: docsText(DOCS.map((d) => d.id)) }] : []),
    ...(v.form === 'summary' && v.past.length
      ? [{ kind: 'history' as const, label: 'Summary', text: `Earlier in this conversation: ${v.past.map((e) => `${caseOf(e.case).topic}: ${firstSentence(e.answer ?? '')}`).join(' ')}` }]
      : v.past.flatMap((e) => exchangeParts(e, keep.has(e), 'history'))),
    ...exchangeParts(v.now, keep.has(v.now), 'message'),
  ];
  const parts = raw.map((p) => ({ ...p, tokens: count(p.text) }));
  return { parts, tokens: parts.reduce((n, p) => n + p.tokens, 0) };
}

/** What the model sees, as the signature's fields (KTD7). */
export function seen(v: View): Seen {
  const keep = kept(v);
  const carried = (e: Exchange) => {
    const kind = e.found.length ? 'fetch' : e.docs.length ? 'top' : 'none';
    return kind === 'none' || keep.has(e) ? kind : `${kind}-cleared`;
  };
  return {
    case: v.now.case,
    system: v.system,
    tools: v.tools,
    stuff: v.stuff,
    docs: v.now.docs,
    found: v.now.found,
    history: v.form === 'summary' && v.past.length ? [`summary:${v.past.map((e) => e.case).join('+')}`] : v.past.map((e) => `${e.case}:${carried(e)}`),
    memory: Object.keys(v.memory).sort(),
  };
}
