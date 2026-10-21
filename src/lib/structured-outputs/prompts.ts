// The chapters' pinned runs (KTD4's readable bar): prompt, schema and the output the copy describes.
import data from '../../../data/structured-outputs/prompts.json' with { type: 'json' };
import type { Model } from '../lm/model';
import { decode, type Decoded } from './decode';
import { compile, type Grammar, type ObjectSchema } from './grammar';

export interface Run { id: string; chapter: number; prompt: string; schema: string | null; seed?: number; output: string; status: 'done' | 'cut-off' }

export const SCHEMAS = data.schemas as unknown as Record<string, ObjectSchema>;
export const RUNS = data.runs as Run[];
export const HEAL = data.heal;

export function run(id: string): Run {
  const r = RUNS.find((x) => x.id === id);
  if (!r) throw new Error(`unknown run: ${id}`);
  return r;
}
export const schemaOf = (r: Run) => (r.schema ? SCHEMAS[r.schema] : null);

const cache = new WeakMap<Model, Map<string, { grammar: Grammar | null; decoded: Decoded }>>();

/** Decodes a pinned run live: what a chapter shows. Once per model and run: renders and predicates call it often. */
export function play(model: Model, r: Run) {
  let m = cache.get(model);
  if (!m) cache.set(model, (m = new Map()));
  const hit = m.get(r.id);
  if (hit) return hit;
  const s = schemaOf(r), g = s && compile(s);
  const out = { grammar: g, decoded: decode(model, r.prompt, g, r.seed === undefined ? {} : { seed: r.seed }) };
  m.set(r.id, out);
  return out;
}
