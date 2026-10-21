// Loads Larkspur mini from public/data/lm/ (written by scripts/train/train.py): meta.json lays out
// model.bin, Float16 little-endian tensors decoded here to Float32Array. Fetched like RAG's index.
import { fetchLoader, type Loader, type LoadStatus } from '../rag/load';
import type { Adapter, Model, ModelConfig } from './model';

export interface Meta {
  model: ModelConfig & { params: number };
  dtype: 'float16-le';
  bytes: number;
  tensors: { name: string; shape: number[]; offset: number }[];
  heldout: { docs: string[]; tokens: number; loss: number; top1: number; top5: number };
  /** U18's fine-tunes: `finetuned.bin` has model.bin's layout; `lora.bin` is laid out by `lora.tensors`. */
  finetune?: FineTuneRun;
  lora?: FineTuneRun & { rank: number; alpha: number; targets: string[]; bytes: number; tensors: Meta['tensors'] };
  [k: string]: unknown;
}
export interface FineTuneRun {
  file: string;
  /** parameters the run changed */
  trainable: number;
  training: Record<string, unknown>;
  lossCurve: { step: number; train: number; heldout: number }[];
  heldout: { loss: number; top1: number; top5: number };
  style: { loss: number; top1: number; top5: number };
}
/** Which weights to run: the base, the full fine-tune, or the base plus the LoRA adapter. */
export type Weights = 'base' | 'finetuned' | 'lora';

/** IEEE 754 half to number. */
export function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * f * 2 ** -24;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * 2 ** (e - 15);
}

function parseTensors(file: string, bytes: number, layout: Meta['tensors'], buf: ArrayBuffer) {
  if (buf.byteLength !== bytes) throw new Error(`${file}: expected ${bytes} bytes, got ${buf.byteLength}`);
  const view = new DataView(buf);
  const tensors: Record<string, Float32Array> = {};
  for (const { name, shape, offset } of layout) {
    const a = new Float32Array(shape.reduce((x, y) => x * y, 1));
    for (let i = 0; i < a.length; i++) a[i] = halfToFloat(view.getUint16(offset + 2 * i, true));
    tensors[name] = a;
  }
  return tensors;
}

/** model.bin, or finetuned.bin (same layout). */
export function parseModel(meta: Meta, buf: ArrayBuffer, file = 'model.bin'): Model {
  return { config: meta.model, tensors: parseTensors(file, meta.bytes, meta.tensors, buf) };
}

/** lora.bin: the adapter meta.json `lora` lays out, scaled alpha / rank as in train.py. */
export function parseAdapter(meta: Meta, buf: ArrayBuffer): Adapter {
  const l = meta.lora;
  if (!l) throw new Error('meta.json has no lora run');
  return { rank: l.rank, scale: l.alpha / l.rank, tensors: parseTensors(l.file, l.bytes, l.tensors, buf) };
}

/** The files each choice of weights needs, after meta.json, and how they make a model. */
async function loadWeights(loader: Loader, w: Weights): Promise<Model> {
  const bin = w === 'finetuned' ? 'finetuned.bin' : 'model.bin';
  const [m, weights, lora] = await Promise.all(['meta.json', bin, ...(w === 'lora' ? ['lora.bin'] : [])].map(loader));
  const meta = JSON.parse(new TextDecoder().decode(m)) as Meta, model = parseModel(meta, weights, bin);
  return lora ? { ...model, adapter: parseAdapter(meta, lora) } : model;
}

/** One model, fetched on first load(); a failed load leaves status 'error' and the next load() retries. */
export function modelLoader(loader: Loader = fetchLoader('/data/lm/'), weights: Weights = 'base') {
  let model: Model | undefined, pending: Promise<Model> | undefined, failed = false;
  return {
    get: () => model,
    status: (): LoadStatus => (model ? 'ready' : pending ? 'loading' : failed ? 'error' : 'idle'),
    load(): Promise<Model> {
      if (model) return Promise.resolve(model);
      failed = false;
      // Parse in its own step, so a bad file fails the load as a 404 does (and the next load() retries).
      return (pending ??= loadWeights(loader, weights)
        .then((x) => { model = x; pending = undefined; return x; },
          (e) => { failed = true; pending = undefined; throw e; }));
    },
  };
}
