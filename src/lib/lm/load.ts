// Loads Larkspur mini from public/data/lm/ (written by scripts/train/train.py): meta.json lays out
// model.bin, Float16 little-endian tensors decoded here to Float32Array. Fetched like RAG's index.
import { fetchLoader, type Loader, type LoadStatus } from '../rag/load';
import type { Model, ModelConfig } from './model';

export interface Meta {
  model: ModelConfig & { params: number };
  dtype: 'float16-le';
  bytes: number;
  tensors: { name: string; shape: number[]; offset: number }[];
  heldout: { docs: string[]; tokens: number; loss: number; top1: number; top5: number };
  [k: string]: unknown;
}

/** IEEE 754 half to number. */
export function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * f * 2 ** -24;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * 2 ** (e - 15);
}

export function parseModel(meta: Meta, buf: ArrayBuffer): Model {
  if (buf.byteLength !== meta.bytes) throw new Error(`model.bin: expected ${meta.bytes} bytes, got ${buf.byteLength}`);
  const view = new DataView(buf);
  const tensors: Record<string, Float32Array> = {};
  for (const { name, shape, offset } of meta.tensors) {
    const a = new Float32Array(shape.reduce((x, y) => x * y, 1));
    for (let i = 0; i < a.length; i++) a[i] = halfToFloat(view.getUint16(offset + 2 * i, true));
    tensors[name] = a;
  }
  return { config: meta.model, tensors };
}

/** One model, fetched on first load(); a failed load leaves status 'error' and the next load() retries. */
export function modelLoader(loader: Loader = fetchLoader('/data/lm/')) {
  let model: Model | undefined, pending: Promise<Model> | undefined, failed = false;
  return {
    get: () => model,
    status: (): LoadStatus => (model ? 'ready' : pending ? 'loading' : failed ? 'error' : 'idle'),
    load(): Promise<Model> {
      if (model) return Promise.resolve(model);
      failed = false;
      return (pending ??= Promise.all([loader('meta.json'), loader('model.bin')]).then(
        ([m, bin]) => { model = parseModel(JSON.parse(new TextDecoder().decode(m)), bin); pending = undefined; return model; },
        (e) => { failed = true; pending = undefined; throw e; }));
    },
  };
}
