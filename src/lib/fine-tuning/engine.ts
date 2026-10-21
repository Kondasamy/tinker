// Fine-tuning's engine (KTD9). Two halves:
// - Larkspur mini's real fine-tunes (live): parameter counts from the shapes in meta.json, greedy generation, and the
//   style signal (every reply in the style set signs off "Cheers, the Larkspur team"; the corpus never says it).
// - The Larkspur-assistant versions (recorded): prompted, RAG and fine-tuned answers over Evals' questions, graded
//   live by Evals' code graders against data/evals/references.json and gated by Evals' decide. Evals' data is only read.
import { evaluate, forward, type Model } from '../lm/model';
import { decode, encode } from '../lm/bpe';
import type { Meta } from '../lm/load';
import { decide, hasCitation, keyFact, keyFactOf, type Gate, type Reference } from '../evals/graders';
import { QUESTIONS } from '../evals/suite';
import answers from '../../../data/fine-tuning/answers.json' with { type: 'json' };
import versions from '../../../data/fine-tuning/versions.json' with { type: 'json' };
import priceChange from '../../../data/fine-tuning/price-change.json' with { type: 'json' };
import heldout from '../../../data/fine-tuning/heldout.json' with { type: 'json' };

// ---- Larkspur mini's fine-tunes (live) ----

/** The sign-off the style set teaches. */
export const SIGNOFF = 'Cheers, the Larkspur team';
/** True when a text carries the style signal (the part of the sign-off the base never writes). */
export const signsOff = (text: string) => text.includes('Larkspur team');

/** Questions outside the style set: the fine-tunes are tried on these, so the sign-off has to generalise.
 * scripts/encode-for-training.mjs encodes these same prompts into data/lm/ids.json for train.py's goldens. */
export const STYLE_PROMPTS = [
  'Q: Do you ship on weekends? A:',
  'Q: Can I pay with a digital wallet? A:',
  'Q: Where is my data stored? A:',
  'Q: Can I delete my account? A:',
  'Q: Is there a trade-in offer? A:',
];

/** Greedy continuation: the most likely next token, n times, reading the last ctx tokens each time. */
export function generate(model: Model, ids: number[], n: number): number[] {
  const out = [...ids];
  for (let i = 0; i < n; i++) {
    const lg = forward(model, out).logits.at(-1)!;
    let best = 0;
    for (let j = 1; j < lg.length; j++) if (lg[j] > lg[best]) best = j;
    out.push(best);
  }
  return out.slice(ids.length);
}

/** How many pieces a chapter lets Larkspur mini write for one reply. */
export const REPLY_TOKENS = 24;
const replies = new WeakMap<Model, Map<string, string>>();
/** A chapter's live reply: greedy (so the same weights always write the same words), cut where the answer ends.
 * Memoized per (weights, prompt): captions and controls call it on every render, and each call is 24 forward passes. */
export function replyOf(model: Model, prompt: string) {
  let m = replies.get(model);
  if (!m) replies.set(model, m = new Map());
  let r = m.get(prompt);
  if (r === undefined) m.set(prompt, r = decode(generate(model, encode(prompt), REPLY_TOKENS)).split('\n\n')[0].trim());
  return r;
}

const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1);
/** A full fine-tune trains every weight. */
export const fullCount = (meta: Meta) => meta.tensors.reduce((n, t) => n + size(t.shape), 0);
/** The matrices LoRA adapts, with their [out, in] shapes, read from the base layout. */
export function adaptedMatrices(meta: Meta) {
  const targets = meta.lora?.targets ?? [];
  return meta.tensors.filter((t) => targets.some((x) => t.name.endsWith(`${x}.weight`)))
    .map((t) => ({ name: t.name.slice(0, -'.weight'.length), out: t.shape[0], in: t.shape[1] }));
}
/** LoRA trains rank × (in + out) per adapted matrix: A is rank × in, B is out × rank. */
export const loraCount = (meta: Meta, rank = meta.lora?.rank ?? 0) =>
  adaptedMatrices(meta).reduce((n, m) => n + rank * (m.in + m.out), 0);

/** The held-out documents as Larkspur mini's ids: a copy of data/lm/ids.json's held-out split, so chapter 5 bundles 6 KB
 * rather than the whole file (the tests prove the copy matches). */
export const HELDOUT = heldout as { docs: string[]; ids: number[][] };
const scored = new WeakMap<Model, ReturnType<typeof evaluate>>();
/** Held-out scores for one set of weights, computed live (and once per loaded model): forgetting, in chapter 5. */
export function heldoutScore(model: Model) {
  let s = scored.get(model);
  if (!s) scored.set(model, (s = evaluate(model, HELDOUT.ids)));
  return s;
}

// ---- the Larkspur-assistant versions (recorded answers, live grading) ----

export type VersionId = 'prompted' | 'rag' | 'finetuned';
export interface Version { id: VersionId; label: string; changes: 'prompt' | 'documents' | 'weights'; note: string }
export const VERSIONS = versions as Version[];
export const VERSION_IDS = VERSIONS.map((v) => v.id);
/** What a new version is gated against: the shipped RAG assistant. */
export const BASELINE: VersionId = 'rag';

export interface Recorded { text: string; citation: string | null; note?: string }
const ANSWERS = answers as Record<VersionId, Record<string, Recorded>>;

/** The changed-price case: a price update the RAG version reads, and a reference with the new price. */
export const PRICE_CHANGE = priceChange as { question: { id: string; query: string }; passage: { id: string; title: string; text: string }; reference: Reference };
/** Evals' questions, in chapter order. */
export const QUESTION_IDS = QUESTIONS.map((q) => q.id);
/** Every question a version answers: Evals' twelve, then the changed price. */
export const ALL_QUESTIONS = [...QUESTION_IDS, PRICE_CHANGE.question.id];

/** The recorded answer; throws on a missing one (the tests prove none is missing). */
export function answer(v: VersionId, question: string): Recorded {
  const a = ANSWERS[v]?.[question];
  if (!a) throw new Error(`no recorded answer for ${v} ${question}`);
  return a;
}

/** Key fact: Evals' grader against Evals' reference, or against the fixture's reference for the changed price. */
export const factOk = (question: string, text: string) =>
  question === PRICE_CHANGE.question.id ? keyFactOf(PRICE_CHANGE.reference, text) : keyFact(question, text);

export interface Graded { question: string; answer: Recorded; fact: boolean; cited: boolean; signed: boolean }
export function gradeVersion(v: VersionId, questions = ALL_QUESTIONS): Graded[] {
  return questions.map((q) => {
    const a = answer(v, q);
    return { question: q, answer: a, fact: factOk(q, a.text), cited: hasCitation(a), signed: signsOff(a.text) };
  });
}

/** Evals' release gate over Evals' twelve questions, graded by the key-fact check: `cand` against the baseline. */
export function gateVersion(cand: VersionId, gate: Gate, base: VersionId = BASELINE) {
  const passes = (v: VersionId) => gradeVersion(v, QUESTION_IDS).map((g) => g.fact);
  return decide(passes(base), passes(cand), gate);
}
