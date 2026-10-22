// Reads the static index written by scripts/build-index.mjs (see its header for the binary layout).
import { buildBm25, type Bm25 } from './bm25';

export type Loader = (file: string) => Promise<ArrayBuffer>;

/** Browser loader: fetches files from the static site. */
export const fetchLoader =
  (base = '/data/index/'): Loader =>
  async file => {
    const r = await fetch(base + file);
    if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
    return r.arrayBuffer();
  };

export interface Doc {
  id: string;
  title: string;
  year: number;
  department: string;
  type: string;
  words: string[];
  [k: string]: unknown;
}
export interface Manifest {
  models: { embedding: { dims: number } };
  quantization: { vectors: { scale: number }; scores: { scale: number } };
  queries: { items: { questionId: string; kind: 'query' | 'rewrite'; text: string }[] };
  configs: { file: string; strategy?: string; size?: number; overlap?: number; chunks?: number }[];
  [k: string]: unknown;
}

export interface Config {
  file: string;
  N: number;
  Q: number;
  D: number;
  /** [docIdx, start, end) word range per chunk */
  ranges: Uint16Array;
  /** PCA basis and dequantized 2D positions (N*2) */
  mean: Float32Array;
  pc1: Float32Array;
  pc2: Float32Array;
  xy: Float32Array;
  /** raw int16 cross-encoder scores [N x Q]; UNSCORED marks a missing score */
  scores: Int16Array;
  vectors: Int8Array;
  norms: Float32Array;
  texts: string[];
  bm25: Bm25;
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

function parseConfig(file: string, ab: ArrayBuffer, corpus: Doc[]): Config {
  const [N, Q, D] = new Uint32Array(ab, 0, 3);
  const xyScale = new Float32Array(ab, 12, 1)[0];
  let o = 16;
  const f32 = (n: number) => {
    const a = new Float32Array(ab, o, n);
    o += n * 4;
    return a;
  };
  const mean = f32(D),
    pc1 = f32(D),
    pc2 = f32(D);
  const ranges = new Uint16Array(ab, o, N * 3);
  o += N * 6;
  const xy = Float32Array.from(new Int16Array(ab, o, N * 2), v => v * xyScale);
  o += N * 4;
  const scores = new Int16Array(ab, o, N * Q);
  o += N * Q * 2;
  const vectors = new Int8Array(ab, o, N * D);
  o += N * D;
  if (o !== ab.byteLength) throw new Error(`${file}: expected ${o} bytes, got ${ab.byteLength}`);
  const norms = new Float32Array(N);
  for (let c = 0; c < N; c++) {
    let s = 0;
    for (let i = c * D; i < (c + 1) * D; i++) s += vectors[i] * vectors[i];
    norms[c] = Math.sqrt(s);
  }
  const texts = Array.from({ length: N }, (_, c) =>
    corpus[ranges[c * 3]].words.slice(ranges[c * 3 + 1], ranges[c * 3 + 2]).join(' '),
  );
  let bm25: Bm25 | undefined;
  // built on first keyword search: most configs never need it
  return {
    file,
    N,
    Q,
    D,
    ranges,
    mean,
    pc1,
    pc2,
    xy,
    scores,
    vectors,
    norms,
    texts,
    get bm25() {
      return (bm25 ??= buildBm25(texts));
    },
  };
}

export interface RagIndex {
  manifest: Manifest;
  corpus: Doc[];
  /** Int8 [Q x D] query/rewrite vectors in manifest.queries.items order */
  queries: Int8Array;
  get(file: string): Config | undefined;
  status(file: string): LoadStatus;
  load(file: string): Promise<Config>;
  /** Loads `active` first, then every other config one at a time (KTD3). */
  prefetch(active: string): Promise<void>;
}

export async function openIndex(loader: Loader = fetchLoader()): Promise<RagIndex> {
  const json = async (f: string) => JSON.parse(new TextDecoder().decode(await loader(f)));
  const [manifest, corpus, qbuf] = await Promise.all([
    json('manifest.json') as Promise<Manifest>,
    json('corpus.json') as Promise<Doc[]>,
    loader('queries.bin'),
  ]);
  const ready = new Map<string, Config>();
  const pending = new Map<string, Promise<Config>>();
  const failed = new Set<string>();
  const load = (file: string): Promise<Config> => {
    const hit = ready.get(file);
    if (hit) return Promise.resolve(hit);
    let p = pending.get(file);
    if (!p) {
      failed.delete(file);
      p = loader(file)
        .then(ab => parseConfig(file, ab, corpus))
        .then(
          c => {
            ready.set(file, c);
            pending.delete(file);
            return c;
          },
          e => {
            failed.add(file);
            pending.delete(file);
            throw e;
          },
        );
      pending.set(file, p);
    }
    return p;
  };
  return {
    manifest,
    corpus,
    queries: new Int8Array(qbuf),
    get: f => ready.get(f),
    status: f => (ready.has(f) ? 'ready' : pending.has(f) ? 'loading' : failed.has(f) ? 'error' : 'idle'),
    load,
    async prefetch(active) {
      await load(active);
      for (const { file } of manifest.configs) await load(file).catch(() => {}); // a failed prefetch retries on the next load()
    },
  };
}
