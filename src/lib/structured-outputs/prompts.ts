// The chapters' pinned runs (KTD4's readable bar): prompt, schema and the output the copy describes.
import data from '../../../data/structured-outputs/prompts.json' with { type: 'json' };
import type { Model } from '../lm/model';
import { decode } from './decode';
import { compile, type ObjectSchema } from './grammar';

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

/** Decodes a pinned run live: what a chapter shows. */
export function play(model: Model, r: Run) {
  const s = schemaOf(r), g = s && compile(s);
  return { grammar: g, decoded: decode(model, r.prompt, g, r.seed === undefined ? {} : { seed: r.seed }) };
}
