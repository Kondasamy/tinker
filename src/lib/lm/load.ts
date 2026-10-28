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
  /** KTD1's student, distilled from model.bin: its own shape and layout, in `student.bin`. */
  student?: {
    file: string;
    model: ModelConfig & { params: number };
    bytes: number;
    tensors: Meta['tensors'];
    training: Record<string, unknown>;
    lossCurve: FineTuneRun['lossCurve'];
    heldout: FineTuneRun['heldout'];
    /** share of held-out positions where its greedy next token is the base's */
    agreement: number;
  };
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
/** public/data/pre-training/meta.json (KTD3): the base run's checkpoints, each in model.bin's layout. */
export interface CheckpointMeta {
  model: ModelConfig & { params: number };
  dtype: 'float16-le';
  tensors: Meta['tensors'];
  steps: number[];
  training: Record<string, unknown>;
  checkpoints: { step: number; file: string; bytes: number; train: Score; heldout: Score }[];
}
type Score = { loss: number; top1: number; top5: number };
/**
 * Which weights to run: the base, the full fine-tune, the base plus the LoRA adapter, the distilled student, the
 * base run's checkpoint at a step (`ckpt-250`, read from /data/pre-training/), or the masked model (`mlm`, read from
 * /data/diffusion-llms/: meta.json lays out mlm.bin as model.bin's meta does, vocab included; run it bidirectional),
 * or the mixture of experts (`moe`, read from /data/mixture-of-experts/: meta.json `model` carries `experts` and
 * `top_k`; moe.bin has model.bin's tensors with each `h.<l>.mlp.fc/proj` replaced by `h.<l>.mlp.router.weight` and
 * `h.<l>.mlp.experts.<e>.fc/proj` weight and bias, see ModelConfig), or the canary model (`canary`, read from
 * /data/memorisation/: model.bin's shape, trained with planted fake PINs; meta.json lays out canary.bin).
 */
export type Weights = 'base' | 'finetuned' | 'lora' | 'student' | 'mlm' | 'moe' | 'canary' | `ckpt-${number}`;
const isCheckpoint = (w: Weights): w is `ckpt-${number}` => w.startsWith('ckpt-');

/** IEEE 754 half to number. */
export function halfToFloat(h: number): number {
  const s = h & 0x8000 ? -1 : 1,
    e = (h >> 10) & 0x1f,
    f = h & 0x3ff;
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

/** student.bin: the distilled student, in the shape meta.json `student` gives it. */
export function parseStudent(meta: Meta, buf: ArrayBuffer): Model {
  const s = meta.student;
  if (!s) throw new Error('meta.json has no student');
  const { params: _, ...config } = s.model;
  return { config, tensors: parseTensors(s.file, s.bytes, s.tensors, buf) };
}

/** ckpt-<step>.bin: the base run's weights at `step`, laid out by the pre-training meta.json. */
export function parseCheckpoint(meta: CheckpointMeta, step: number, buf: ArrayBuffer): Model {
  const c = meta.checkpoints.find(x => x.step === step);
  if (!c) throw new Error(`no checkpoint at step ${step}`);
  const { params: _, ...config } = meta.model;
  return { config, tensors: parseTensors(c.file, c.bytes, meta.tensors, buf) };
}

/** The files each choice of weights needs, after meta.json, and how they make a model. */
async function loadWeights(loader: Loader, w: Weights): Promise<Model> {
  if (isCheckpoint(w)) {
    const [m, bin] = await Promise.all(['meta.json', `${w}.bin`].map(loader));
    return parseCheckpoint(JSON.parse(new TextDecoder().decode(m)), Number(w.slice(5)), bin);
  }
  if (w === 'mlm' || w === 'moe' || w === 'canary') {
    const [m, bin] = await Promise.all(['meta.json', `${w}.bin`].map(loader));
    const meta = JSON.parse(new TextDecoder().decode(m)) as Meta;
    const { params: _, ...config } = meta.model;
    return { config, tensors: parseTensors(`${w}.bin`, meta.bytes, meta.tensors, bin) };
  }
  const bin = w === 'finetuned' ? 'finetuned.bin' : w === 'student' ? 'student.bin' : 'model.bin';
  const [m, weights, lora] = await Promise.all(['meta.json', bin, ...(w === 'lora' ? ['lora.bin'] : [])].map(loader));
  const meta = JSON.parse(new TextDecoder().decode(m)) as Meta;
  if (w === 'student') return parseStudent(meta, weights);
  const model = parseModel(meta, weights, bin);
  return lora ? { ...model, adapter: parseAdapter(meta, lora) } : model;
}

/** the weight sets that live outside /data/lm/ */
const DIRS: Partial<Record<Weights, string>> = {
  mlm: 'diffusion-llms',
  moe: 'mixture-of-experts',
  canary: 'memorisation',
};

/**
 * One model, fetched on first load(); a failed load leaves status 'error' and the next load() retries. The loader
 * reads /data/lm/, /data/pre-training/ for a checkpoint, /data/diffusion-llms/ for the masked model or
 * /data/mixture-of-experts/ for the experts model or /data/memorisation/ for the canary model, unless one is passed.
 */

export function modelLoader(loader?: Loader, weights: Weights = 'base') {
  const dir = isCheckpoint(weights) ? 'pre-training' : (DIRS[weights] ?? 'lm');
  const files = loader ?? fetchLoader(`/data/${dir}/`);
  let model: Model | undefined,
    pending: Promise<Model> | undefined,
    failed = false;
  return {
    get: () => model,
    status: (): LoadStatus => (model ? 'ready' : pending ? 'loading' : failed ? 'error' : 'idle'),
    load(): Promise<Model> {
      if (model) return Promise.resolve(model);
      failed = false;
      // Parse in its own step, so a bad file fails the load as a 404 does (and the next load() retries).
      return (pending ??= loadWeights(files, weights).then(
        x => {
          model = x;
          pending = undefined;
          return x;
        },
        e => {
          failed = true;
          pending = undefined;
          throw e;
        },
      ));
    },
  };
}
