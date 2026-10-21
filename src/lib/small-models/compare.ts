// Small models, chapters 1–3 (KTD6): the teacher (Larkspur mini, model.bin) against its distilled student
// (student.bin), both run live. Sizes and work per token are counted from the shapes in meta.json; the top 5, the
// agreement and the KL divergence come from forward passes over the held-out copy Fine-tuning keeps
// (data/fine-tuning/heldout.json, read only). Nothing here is recorded.
import { forward, softmax, type Model } from '../lm/model';
import { encode } from '../lm/bpe';
import type { Meta } from '../lm/load';
import { topK, type Candidate } from '../transformers/trace';
import { HELDOUT } from '../fine-tuning/engine';
import prompts from '../../../data/small-models/prompts.json' with { type: 'json' };

export { HELDOUT };
export type Who = 'teacher' | 'student';
type Layout = Meta['tensors'];
const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1);

/** Every weight, counted from the layout. */
export const paramCount = (tensors: Layout) => tensors.reduce((n, t) => n + size(t.shape), 0);
/** Work per token: one multiply per weight in a matrix product. The word table counts once, as the output layer (as
 * input it is a lookup); the position table is a lookup only. shortcut: leaves out the attention scores, which grow
 * with the context and are small at these sizes. */
export const multsPerToken = (tensors: Layout) =>
  tensors.filter((t) => t.shape.length === 2 && t.name !== 'wpe.weight').reduce((n, t) => n + size(t.shape), 0);
/** The two layouts from meta.json: the teacher's top level and the student's own. */
export const layoutOf = (meta: Meta, who: Who): Layout => (who === 'teacher' ? meta.tensors : meta.student!.tensors);

/** A prompt a chapter shows, with the next piece the teacher puts in its top 5 (the test proves it). */
export interface Prompt { id: string; text: string; expected: string }
export const PROMPTS: Prompt[] = prompts.prompts;

/** The top 5 next pieces after a prompt, with their probabilities. */
export const top5 = (model: Model, text: string): Candidate[] => topK(softmax(forward(model, encode(text)).logits.at(-1)!), 5);

/** One document's closeness: positions read, how many the student's top pick matches the teacher's, and the summed
 * KL divergence (teacher ‖ student, in nats) over those positions. */
export interface Closeness { doc: string; positions: number; same: number; kl: number }
const argmax = (xs: ArrayLike<number>) => { let b = 0; for (let i = 1; i < xs.length; i++) if (xs[i] > xs[b]) b = i; return b; };

/** Teacher and student over each held-out document, in the same 32-token windows `agreement()` in the kit reads, so
 * the pooled share equals meta.json's recorded agreement. */
export function closeness(teacher: Model, student: Model, docs = HELDOUT.ids, names = HELDOUT.docs): Closeness[] {
  const ctx = teacher.config.ctx;
  return docs.map((doc, d) => {
    let same = 0, positions = 0, kl = 0;
    for (let s = 0; s < doc.length - 1; s += ctx) {
      const x = doc.slice(s, s + ctx + 1).slice(0, -1), lt = forward(teacher, x).logits, ls = forward(student, x).logits;
      lt.forEach((lg, t) => {
        const p = softmax(lg), q = softmax(ls[t]);
        if (argmax(lg) === argmax(ls[t])) same++;
        for (let i = 0; i < p.length; i++) if (p[i] > 0) kl += p[i] * Math.log(p[i] / q[i]);
        positions++;
      });
    }
    return { doc: names[d], positions, same, kl };
  });
}

const memo = new WeakMap<Model, WeakMap<Model, ReturnType<typeof summary>>>();
function summary(teacher: Model, student: Model) {
  const docs = closeness(teacher, student), positions = docs.reduce((n, d) => n + d.positions, 0);
  return {
    docs,
    positions,
    /** share of held-out positions where the student's top pick is the teacher's */
    agreement: docs.reduce((n, d) => n + d.same, 0) / positions,
    /** mean KL divergence per position, teacher ‖ student, in nats: 0 when the two spread their bets the same way */
    kl: docs.reduce((n, d) => n + d.kl, 0) / positions,
  };
}
/** Agreement and KL over the held-out text, computed once per pair of loaded models. */
export function compare(teacher: Model, student: Model) {
  let m = memo.get(teacher);
  if (!m) memo.set(teacher, (m = new WeakMap()));
  let s = m.get(student);
  if (!s) m.set(student, (s = summary(teacher, student)));
  return s;
}
