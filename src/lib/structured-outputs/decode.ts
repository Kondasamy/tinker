// Schema-masked decoding on Larkspur mini (KTD4): at each step the blocked logits go to -Infinity before
// softmax, so the allowed tokens share all the probability. Greedy by default; a seeded draw for chapter 5.
// Generation ends when the grammar accepts; a step cap ends a run that never does ('cut-off').
import { decode as text, encode, pieceBytes } from '../lm/bpe';
import { forward, softmax, type Model } from '../lm/model';
import { mulberry32 } from '../transformers/sample';
import { START, accepts, type Grammar, type State } from './grammar';
import { after, allowed as allowedIds } from './mask';

export interface Candidate { id: number; text: string; p: number }
export interface DecodeStep {
  /** Where the grammar was before this token (START when unconstrained). */
  state: State;
  /** The ids the mask allowed (every id when unconstrained). */
  allowed: number[];
  /** The model's own first choice before the mask, with its unmasked probability. */
  free: Candidate;
  /** Probability the mask took away: the unmasked mass on blocked tokens. */
  blocked: number;
  /** Every token's probability after the mask (0 for blocked ones). */
  probs: Float64Array;
  /** The likeliest allowed tokens, renormalised over the allowed ones. */
  top: Candidate[];
  /** The token written. */
  pick: Candidate;
}
export interface Decoded {
  status: 'done' | 'cut-off';
  /** The answer's text (the tokens written, decoded). */
  text: string;
  prompt: number[];
  ids: number[];
  steps: DecodeStep[];
  /** True if any forward pass had to drop the start of what it read (never, for the chapters' prompts). */
  truncated: boolean;
}
export interface DecodeOptions { maxSteps?: number; temperature?: number; seed?: number; top?: number }

const cand = (id: number, p: number): Candidate => ({ id, text: text([id]), p });

/** Allowed ids most likely first, ties by id. */
const ranked = (ids: number[], probs: Float64Array) => [...ids].sort((a, b) => probs[b] - probs[a] || a - b);

/**
 * Decodes after `prompt` under the grammar (null: no mask). Default cap: what is left of the 32-token window,
 * so the model always reads the question it answers.
 */
export function decode(model: Model, prompt: string, g: Grammar | null, o: DecodeOptions = {}): Decoded {
  const promptIds = encode(prompt), ids: number[] = [], steps: DecodeStep[] = [];
  const maxSteps = o.maxSteps ?? model.config.ctx - promptIds.length;
  const rand = o.seed === undefined ? null : mulberry32(o.seed);
  let s: State = START, truncated = false;
  while (ids.length < maxSteps && !(g && accepts(g, s))) {
    const out = forward(model, [...promptIds, ...ids]);
    truncated ||= out.truncated;
    const logits = out.logits.at(-1)!;
    const free = softmax(logits);
    const allow = g ? allowedIds(g, s) : Array.from(logits, (_, i) => i);
    // Masked logits: blocked ones to -Infinity, then temperature, then softmax over what is left.
    const t = o.temperature ?? 1;
    const masked = new Float64Array(logits.length).fill(-Infinity);
    for (const id of allow) masked[id] = logits[id] / t;
    const probs = softmax(masked);
    const order = ranked(allow, probs);
    let pick = order[0];
    if (rand) {
      let r = rand();
      for (const id of order) { pick = id; if ((r -= probs[id]) < 0) break; }
    }
    const best = ranked(Array.from(logits, (_, i) => i), free)[0];
    steps.push({
      state: s,
      allowed: allow,
      probs,
      free: cand(best, free[best]),
      blocked: 1 - allow.reduce((m, id) => m + free[id], 0),
      top: order.slice(0, o.top ?? 8).map((id) => cand(id, probs[id])),
      pick: cand(pick, probs[pick]),
    });
    ids.push(pick);
    if (g) s = after(g, s, pieceBytes(pick))!;
  }
  return { status: g && accepts(g, s) ? 'done' : 'cut-off', text: text(ids), prompt: promptIds, ids, steps, truncated };
}

/** Where an enum's values part ways: the step, and each value's share of the masked probability there. */
export function shares(g: Grammar, d: Decoded, field: string): { step: number; values: { value: string; p: number }[] } | null {
  const at = 2 * Object.keys(g.schema.properties).indexOf(field) + 1, part = g.parts[at];
  if (part?.kind !== 'alts') return null;
  const bytesText = (id: number) => String.fromCharCode(...pieceBytes(id));
  for (let i = 0; i < d.steps.length; i++) {
    const st = d.steps[i];
    if (st.state.part !== at) continue;
    const lead = (id: number) => { const x = st.state.buf + bytesText(id); return part.alts.filter((a) => a.startsWith(x) || x.startsWith(a)); };
    if (st.allowed.every((id) => lead(id).length === part.alts.length)) continue;
    return {
      step: i,
      values: part.alts.map((a) => ({
        value: JSON.parse(a) as string,
        p: st.allowed.reduce((m, id) => { const l = lead(id); return m + (l.length === 1 && l[0] === a ? st.probs[id] : 0); }, 0),
      })),
    };
  }
  return null;
}

/**
 * Token healing (chapter 4): back up over the prompt's last token and let the next token start with its bytes,
 * so a prompt that ends mid-token (a trailing space) is read the way the training text was split.
 * Returns the next token's top choices without and with healing.
 */
export function heal(model: Model, prompt: string, k = 5) {
  const ids = encode(prompt);
  const plain = softmax(forward(model, ids).logits.at(-1)!);
  const last = ids.at(-1)!, head = ids.slice(0, -1), lastBytes = pieceBytes(last);
  const logits = forward(model, head).logits.at(-1)!;
  const masked = new Float64Array(logits.length).fill(-Infinity);
  const starts = (id: number) => { const b = pieceBytes(id); return b.length >= lastBytes.length && lastBytes.every((x, i) => b[i] === x); };
  const ok = Array.from(logits, (_, i) => i).filter(starts);
  for (const id of ok) masked[id] = logits[id];
  const healed = softmax(masked);
  return {
    removed: cand(last, 1),
    plain: ranked(Array.from(plain, (_, i) => i), plain).slice(0, k).map((id) => cand(id, plain[id])),
    healed: ranked(ok, healed).slice(0, k).map((id) => cand(id, healed[id])),
  };
}
