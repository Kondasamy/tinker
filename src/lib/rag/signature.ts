// Evidence signature (KTD6): what reached the model, reduced to a stable key that pre-recorded answers hang off.
import type { RagIndex } from './load';
import { locate, type ContextChunk, type Question } from './engine';

export type FactState = 'intact' | 'split' | 'absent';
export type Bucket = 'start' | 'middle' | 'end';
export interface KeyFact {
  id: string;
  sentence: string;
}
/** A question with the key facts its signature tracks (what the agent, graph and evaluator runs need). */
export type KeyedQuestion = Question & { keyFacts: KeyFact[] };
type SigQuestion = Question & { keyFacts: KeyFact[]; staleSentences?: string[]; distractorSentences?: string[] };
type Span = Pick<ContextChunk, 'doc' | 'start' | 'end'>;

/** Contexts with at least this many chunks are "long": the first key fact's position (start/middle/end third) joins the signature. */
export const LONG_CONTEXT = 6;
/** Trap sentences tracked as present/absent beside the key facts (stale policy, look-alike distractor). */
export const TRAPS = { stale: 'staleSentences', distractor: 'distractorSentences' } as const;
export const NO_CONTEXT = 'nocontext';

/** Merges chunks of the same document whose word ranges touch or overlap, wherever they sit in the context. */
export function joinNeighbours(context: Span[]): Span[] {
  const sorted = [...context].sort((a, b) => a.doc.localeCompare(b.doc) || a.start - b.start);
  const out: Span[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && last.doc === c.doc && c.start <= last.end) last.end = Math.max(last.end, c.end);
    else out.push({ doc: c.doc, start: c.start, end: c.end });
  }
  return out;
}

/** Best state over every corpus occurrence of the sentence; `at` = context position of the first chunk touching it. */
function classify(index: RagIndex, sentence: string, context: Span[], joined: Span[]) {
  let state: FactState = 'absent',
    at = Infinity;
  for (const [di, gs, ge] of locate(index, sentence)) {
    const doc = index.corpus[di].id;
    const hit = (s: Span) => s.doc === doc && s.end > gs && s.start < ge;
    if (joined.some(s => hit(s) && s.start <= gs && s.end >= ge)) state = 'intact';
    else if (state === 'absent' && joined.some(hit)) state = 'split';
    const i = context.findIndex(hit);
    if (i >= 0) at = Math.min(at, i);
  }
  return { state, at };
}

const bucket = (i: number, n: number): Bucket => (i < n / 3 ? 'start' : i >= n - n / 3 ? 'end' : 'middle');

/**
 * `factId:state|factId:state[@bucket][+trap]`, e.g. `enterprise-excluded:split` or
 * `lodging-cap-2025:intact@middle+stale`. A null or empty context (nothing reached the model) is `nocontext`.
 */
export function signature(index: RagIndex, question: SigQuestion, context: Span[] | null): string {
  if (!context?.length) return NO_CONTEXT;
  const joined = joinNeighbours(context);
  const facts = question.keyFacts.map(f => ({ id: f.id, ...classify(index, f.sentence, context, joined) }));
  let sig = facts.map(f => `${f.id}:${f.state}`).join('|');
  if (context.length >= LONG_CONTEXT && facts[0].state !== 'absent') sig += '@' + bucket(facts[0].at, context.length);
  for (const [name, key] of Object.entries(TRAPS))
    if ((question[key] ?? []).some(s => classify(index, s, context, joined).state !== 'absent')) sig += '+' + name;
  return sig;
}

/** Every signature a question can produce (the finite space the coverage test checks). */
export function signatureSpace(question: SigQuestion): string[] {
  let combos: { sig: string; first: FactState }[] = [{ sig: '', first: 'absent' }];
  question.keyFacts.forEach((f, i) => {
    combos = combos.flatMap(c =>
      (['intact', 'split', 'absent'] as const).map(s => ({
        sig: (i ? c.sig + '|' : '') + `${f.id}:${s}`,
        first: i ? c.first : s,
      })),
    );
  });
  let sigs = combos.flatMap(c =>
    c.first === 'absent' ? [c.sig] : ['', '@start', '@middle', '@end'].map(b => c.sig + b),
  );
  for (const [name, key] of Object.entries(TRAPS))
    if (question[key]?.length) sigs = sigs.flatMap(s => [s, `${s}+${name}`]);
  return [NO_CONTEXT, ...sigs];
}
