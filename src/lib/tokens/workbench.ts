// Chapter 7's workbench: a Larkspur prompt built from optional parts, counted live with the site tokenizer and fitted to a budget.
import ch3 from '../../../data/questions/ch3.json' with { type: 'json' };
import ch4 from '../../../data/questions/ch4.json' with { type: 'json' };
import { encode } from '../lm/bpe';

export interface Part { id: string; label: string; text: string; required: boolean }

// The question, the policy it needs and the examples come from RAG chapters 3 and 4's data; the rest is Larkspur fiction.
const q = ch3[0];
export const PARTS: Part[] = [
  { id: 'rules', label: 'Rules', required: true,
    text: "You are Larkspur Supply Co.'s assistant. Answer only from the documents below and name the document you used. If they do not say, say you don't know." },
  { id: 'tone', label: 'Tone guide', required: false,
    text: 'Write in plain, friendly sentences. Keep answers under three sentences. Never promise a date, a price or a refund the documents do not state. Sign off with "— Larkspur support".' },
  { id: 'examples', label: 'Worked examples', required: false,
    text: ch4.map((x, i) => `Example ${i + 1}. Customer: ${x.query} Assistant: ${x.keyFacts[0].sentence}`).join('\n') },
  { id: 'history', label: 'Earlier chat', required: false,
    text: 'Customer: Hi, we bought shelving for our warehouse last month.\nAssistant: Thanks for choosing Larkspur. How can I help with your order?\nCustomer: Some of it is the wrong size.' },
  { id: 'policy', label: 'Refund policy', required: true, text: `Refund policy: ${q.goldSentences.join(' ')}` },
  { id: 'question', label: 'Question', required: true, text: `Customer: ${q.query}` },
];
export const REQUIRED = PARTS.filter((p) => p.required).map((p) => p.id);

/** Token budgets the reader can pick: each fits the required parts but not every part. */
export const BUDGETS = [160, 240, 320] as const;

/** The chosen parts in their fixed order, a blank line apart. */
export const promptOf = (on: readonly string[]) => PARTS.filter((p) => on.includes(p.id)).map((p) => p.text).join('\n\n');

export interface Fit { tokens: number; budget: number; fits: boolean; over: number; left: number; missing: string[]; ok: boolean }

/** Equal to the budget fits. ok: it fits and keeps every required part. */
export function fit(on: readonly string[], budget: number): Fit {
  const tokens = encode(promptOf(on)).length;
  const missing = REQUIRED.filter((id) => !on.includes(id));
  return { tokens, budget, fits: tokens <= budget, over: Math.max(0, tokens - budget), left: Math.max(0, budget - tokens), missing, ok: tokens <= budget && !missing.length };
}

const OPTIONAL = PARTS.filter((p) => !p.required).map((p) => p.id);
/** Every prompt the reader can build that keeps the required parts: the required ones plus each set of optional ones. */
export const PROMPTS: string[][] = Array.from({ length: 1 << OPTIONAL.length }, (_, m) =>
  PARTS.filter((p) => p.required || m & (1 << OPTIONAL.indexOf(p.id))).map((p) => p.id));

/** It fits, keeps the required parts, and no part left out would still fit if added. */
export const full = (on: readonly string[], budget: number) =>
  fit(on, budget).ok && OPTIONAL.every((id) => on.includes(id) || !fit([...on, id], budget).fits);

/** Every prompt that fits the budget with nothing more to add: each is a right answer. */
export const fullPrompts = (budget: number) => PROMPTS.filter((on) => full(on, budget));
