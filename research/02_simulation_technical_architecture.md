# Technical Architecture for Browser-Based Interactive AI Simulations, Visual RAG Playgrounds, and Educational Vector Search

**Research date:** October 19, 2026

## Executive summary

The strongest architecture is **progressively enhanced and hybrid**, not exclusively client-side or server-side:

1. **Deterministic teaching mode** should ship first. Use versioned documents, precomputed embeddings, seeded layouts, recorded model outputs, and exact vector math. It loads quickly, is reproducible, works offline, and lets educators share identical states.
2. **Live local mode** should add real embedding and lightweight inference through Transformers.js/ONNX Runtime Web in a Web Worker. Transformers.js uses ONNX Runtime, defaults to CPU/WASM in browsers, and can opt into WebGPU; quantized variants such as `q8` or `q4` reduce browser bandwidth and resource pressure. [66][67]
3. **Cloud-enhanced mode** should handle large models, private or multi-tenant corpora, expensive rerankers, durable indexes, evaluation sweeps, and provider APIs. API keys must remain server-side, never in browser code. [331][336]
4. Keep **retrieval in the original embedding space**. PCA, UMAP, and t-SNE are explanatory projections, not search indexes or reliable measures of semantic distance.
5. Use **exact brute-force cosine search** for small educational corpora because it is transparent and provides ANN ground truth. Add HNSW/Wasm only when measured latency warrants it, while exposing recall-versus-latency controls.
6. Treat the application as an **event-driven experiment system**, not merely a collection of React sliders. A state machine, immutable run manifests, cancellation IDs, seeded randomness, and URL-serialized settings are central to reproducibility.
7. Separate the **DOM control plane** from the **graphics and compute planes**:
   - semantic HTML/React or Svelte for controls and explanations;
   - SVG for small, inspectable diagrams;
   - Canvas for medium-sized 2D scenes;
   - WebGL/WebGPU for large point clouds;
   - Web Workers/Wasm for embedding, indexing, and dimensional reduction.
8. The best production pattern is a **three-level disclosure model**:
   - narrative pipeline overview;
   - inspectable intermediate artifacts;
   - advanced experiment and comparison workspace.

The recommended default stack is **Next.js or SvelteKit + TypeScript + XState-style orchestration + Web Workers + Transformers.js + exact typed-array cosine search + optional HNSW/Wasm + Canvas/WebGL visualization + a thin serverless streaming gateway**.

---

# 1. Background and architectural goals

An educational RAG playground has requirements that conflict with those of a conventional AI product:

| Requirement | Conventional AI product | Educational simulation |
|---|---|---|
| Output quality | Optimize final answer | Expose why every result occurred |
| Reproducibility | Often secondary | Essential |
| Latency | Hide processing behind streaming | Show processing without blocking interaction |
| Model complexity | Use strongest affordable model | Prefer the smallest model that reveals the concept |
| Visualization | Summary dashboard | Inspectable intermediate state |
| Failure handling | Recover invisibly | Turn failures into explanations |
| Configuration | Sensible fixed defaults | Manipulable parameters and counterfactuals |
| Evaluation | Offline observability | Visible side-by-side evidence |
| Deployment | Backend-centric | Static/offline mode should remain viable |

The application should therefore model a RAG run as a sequence of **observable transformations**:

```text
source documents
  → parsed blocks
  → chunks
  → chunk embeddings
  → index
  → query embedding
  → candidate retrieval
  → optional filtering/fusion
  → reranking
  → context assembly
  → prompt
  → generated answer
  → citations/evaluation
```

Each arrow should have:

- explicit inputs and outputs;
- elapsed time;
- engine/provider identity;
- deterministic seed where relevant;
- cache status;
- warnings or data loss;
- a human-readable explanation;
- enough provenance to reproduce the result.

---

# 2. Recommended reference architecture

```text
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                │
│  Semantic UI / framework                                       │
│  React + Next.js, or Svelte + SvelteKit                         │
│       │                                                        │
│       ├── experiment state machine                             │
│       ├── URL state / saved manifests                          │
│       ├── accessible tables and inspectors                     │
│       └── scrubber, controls, compare views                    │
│                                                                │
│  Visualization plane                                           │
│       ├── SVG: small diagrams, axes, labels                    │
│       ├── Canvas: medium 2D scatterplots                       │
│       └── WebGL/WebGPU: large point clouds                     │
│                                                                │
│  Compute workers                                               │
│       ├── embedding.worker                                     │
│       │     Transformers.js → ONNX Runtime Web                 │
│       ├── retrieval.worker                                     │
│       │     exact cosine/L2 or HNSW/Wasm                       │
│       ├── projection.worker                                    │
│       │     PCA / UMAP / t-SNE                                 │
│       └── parser.worker                                        │
│             tokenization and chunk construction                │
│                                                                │
│  Local persistence                                             │
│       ├── Cache API: model artifacts                           │
│       ├── IndexedDB: manifests, metadata, small indexes        │
│       └── OPFS: large binary indexes / columnar files          │
└───────────────────────┬────────────────────────────────────────┘
                        │ Optional authenticated boundary
┌───────────────────────▼────────────────────────────────────────┐
│ Serverless/API layer                                           │
│  ├── provider-key custody and authentication                   │
│  ├── streamed generation                                      │
│  ├── hosted embedding/reranking                                │
│  ├── rate limits, quotas and moderation                        │
│  └── trace/evaluation persistence                              │
│                                                                │
│ Durable services                                               │
│  ├── object storage / document store                           │
│  ├── managed vector or hybrid search                           │
│  ├── evaluation jobs                                           │
│  └── experiment database                                       │
└────────────────────────────────────────────────────────────────┘
```

Heavy computation should be moved off the main thread. Browser work above roughly 50 ms is treated as a long task and can make the UI unresponsive; Workers improve responsiveness even where they do not reduce total computation time. [391][395] Transformers.js itself documents a React pattern using a Web Worker and a lazily initialized singleton pipeline so that model loading and inference do not block the UI or reload the model for each request. [453]

For large vector buffers, transfer the underlying `ArrayBuffer` instead of cloning arrays between workers. `ArrayBuffer` is transferable, while typed-array views are serializable but must transfer their underlying buffer. [421][422]

---

# 3. Client-side versus hybrid execution

## 3.1 Comparative architecture

| Execution pattern | How it works | Strengths | Weaknesses | Best use |
|---|---|---|---|---|
| Deterministic mock | Versioned fixture documents, precomputed embeddings, fixed rankings, recorded generations | Instant, cheap, reproducible, testable, offline | Cannot represent arbitrary input; risks implying mock output is live | Lessons, onboarding, regression tests |
| Deterministic local math | Precomputed document vectors; query chosen from a finite set or generated by a seeded mock embedder | Shows real cosine/L2 and exact ranking without model download | Query semantics are constrained or synthetic | First vector-search lesson |
| Live browser/WASM | Quantized model on CPU through ONNX Runtime Web | Broad compatibility, private, offline after caching | CPU load, memory pressure, slower inference | Embeddings and small classifiers |
| Live browser/WebGPU | ONNX inference on the local GPU | Low server cost, privacy, often substantially faster | Uneven hardware support, device loss, model/operator limits | Modern desktop/laptop “live mode” |
| Serverless provider gateway | Browser calls an application endpoint that invokes hosted models | Strong models, protected keys, streaming, centralized policy | Network dependency, cost, latency, privacy boundary | Generation and reranking |
| Managed backend | Durable vector DB, ingestion jobs, model services and evaluation | Scale, access control, shared corpora, observability | Highest complexity and cost | Production or multi-user labs |
| Progressive hybrid | Deterministic mode → local mode → cloud mode | Graceful degradation; one product serves teaching and experimentation | More testing combinations | Recommended default |

## 3.2 Deterministic mode design

A deterministic mode should not merely return hard-coded prose. It should execute as much of the actual pipeline as practical:

- real chunk-boundary computation;
- real overlap accounting;
- real token-count approximation or pinned tokenizer;
- real cosine and Euclidean calculations;
- real top-\(k\) selection;
- real prompt assembly;
- seeded projection coordinates or precomputed layouts;
- recorded generation selected by a manifest key.

Use a versioned run key:

```text
runKey = hash(
  datasetVersion,
  chunkerVersion,
  tokenizerVersion,
  embeddingModelVersion,
  embeddingRevision,
  metric,
  normalization,
  indexVersion,
  retrievalParameters,
  rerankerVersion,
  promptVersion,
  generationParameters,
  seed
)
```

This avoids falsely treating a result as reproducible when its model, tokenizer, document set, or prompt has changed.

A finite lesson can precompute a parameter lattice—such as chunk sizes `{128, 256, 512}`, overlap `{0, 32, 64}`, and top-\(k\) `{1, 3, 5}`—rather than attempting to precompute every slider value. Unsupported values should switch visibly into live mode or snap to the nearest fixture, never silently return unrelated data.

## 3.3 Live browser inference

Transformers.js provides a pipeline abstraction around ONNX models. Browser execution defaults to CPU/WASM; WebGPU is selected with `device: "webgpu"`. Typical browser-oriented dtypes include `fp32`, `fp16`, `q8`, and `q4`, although availability varies by model. [66]

ONNX Runtime Web supports WASM, WebGPU, WebGL, and WebNN execution paths, but WASM has the broadest operator coverage; GPU providers support only subsets of ONNX operators. [3] Its documented browser support matrix is substantially wider for WASM than WebGPU, while WebGL is in maintenance mode and WebNN remains restricted. [6]

A robust runtime selector should therefore test actual session creation:

```ts
async function createEmbeddingEngine(model: string) {
  if ("gpu" in navigator) {
    try {
      return await loadPipeline(model, {
        device: "webgpu",
        dtype: supportsFp16() ? "fp16" : "fp32"
      });
    } catch (error) {
      reportCapabilityFailure("webgpu", error);
    }
  }

  return loadPipeline(model, {
    device: "wasm",
    dtype: "q8"
  });
}
```

Do not rely only on `navigator.gpu`; device, operator, shape, dtype, driver, and resource limits may still cause session initialization to fail.

For ONNX Runtime Web:

- use WASM for small models or broad compatibility;
- use WebGPU on a capable device for compute-heavy models;
- enable WASM multithreading only where cross-origin isolation is available;
- use its proxy worker when inference is otherwise on the UI thread;
- profile CPU and GPU providers separately. [4]

WASM threading requires `SharedArrayBuffer`, which in turn generally requires a secure, cross-origin-isolated page using `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. [166][174] This can conflict with third-party iframes, scripts, fonts, or CDN assets that do not provide compatible CORS/CORP headers.

## 3.4 Model loading and persistence

Transformers.js enables browser Cache API model caching by default where available. [451] Nevertheless:

- show download bytes and progress before loading;
- offer “download model” rather than starting a large transfer unexpectedly;
- version cache keys by model revision and dtype;
- retain a no-cache fallback;
- expose “clear local models” and storage usage;
- never promise indefinite offline availability.

Browser storage is quota-controlled and may be evicted under storage pressure. Writes to IndexedDB, Cache API, or OPFS can fail with `QuotaExceededError`; persistent storage can be requested, but the browser need not grant it. [106][110]

ONNX Runtime Web also documents a 4 GB WebAssembly address-space limit for its large-model path, but practical mobile and tab limits are often much lower. [511]

## 3.5 Serverless/API layer

Use the backend when any of the following applies:

- a secret provider credential is required;
- the model or index does not fit safely on target devices;
- documents are private or access-controlled;
- retrieval spans many tenants or millions of vectors;
- cross-encoder reranking is too slow locally;
- evaluation is asynchronous or computationally expensive;
- runs must be centrally audited.

The endpoint should stream generation rather than buffer the complete response. Streaming improves perceived latency, and serverless platforms explicitly recommend it for AI output. [159] Keep provider credentials in server-only environment variables; values exposed as `NEXT_PUBLIC_*` are inlined into browser JavaScript. [336]

Recommended API boundaries:

```text
POST /api/embed
POST /api/retrieve
POST /api/rerank
POST /api/generate        → SSE or fetch ReadableStream
POST /api/evaluate        → job ID
GET  /api/evaluate/:id
POST /api/runs            → persist immutable run manifest
```

Every response should include:

```ts
interface StageTrace {
  traceId: string;
  stage: "embed" | "retrieve" | "rerank" | "generate" | "evaluate";
  engine: string;
  model: string;
  modelRevision?: string;
  inputHash: string;
  outputHash?: string;
  elapsedMs: number;
  queueMs?: number;
  cached: boolean;
  warnings: string[];
}
```

---

# 4. In-browser vector search

## 4.1 Exact cosine, dot product, and Euclidean distance

Cosine similarity is:

\[
\operatorname{cos}(q,x)=
\frac{q\cdot x}{\lVert q\rVert_2\lVert x\rVert_2}
\]

On L2-normalized vectors, cosine is simply the dot product. [181] For unit vectors, squared Euclidean distance and inner product are monotonically related:

\[
\lVert q-x\rVert_2^2 = 2-2(q\cdot x)
\]

Thus normalized cosine, maximum inner product, and Euclidean ranking produce equivalent orderings, subject to floating-point ties. [189][191]

A transparent exact implementation is appropriate for lessons:

```ts
function cosineNormalized(
  query: Float32Array,
  matrix: Float32Array,
  rows: number,
  dims: number
): Float32Array {
  const scores = new Float32Array(rows);

  for (let row = 0; row < rows; row++) {
    let dot = 0;
    const offset = row * dims;
    for (let d = 0; d < dims; d++) {
      dot += query[d] * matrix[offset + d];
    }
    scores[row] = dot;
  }

  return scores;
}
```

Recommended implementation rules:

- store vectors in one contiguous row-major `Float32Array`;
- normalize once during ingestion, not for every query;
- reject or explicitly handle zero vectors;
- maintain IDs and metadata separately from vector memory;
- use a bounded top-\(k\) heap instead of sorting all \(N\) scores;
- run the scan in a Worker;
- batch progress events rather than posting one message per vector;
- preserve an exact implementation as the ANN evaluation oracle.

Exact search costs \(O(Nd)\) per query but has no index-build cost and 100% recall relative to the chosen metric.

## 4.2 Memory model

For \(N\) float32 vectors of dimension \(d\):

\[
\text{vector bytes}=4Nd
\]

Illustrative raw-vector memory:

| Vectors | Dimensions | Raw float32 vectors |
|---:|---:|---:|
| 10,000 | 384 | 15.36 MB |
| 100,000 | 384 | 153.6 MB |
| 100,000 | 768 | 307.2 MB |
| 1,000,000 | 384 | 1.536 GB |

These figures exclude JavaScript objects, metadata, ANN links, duplicate worker copies, rendering buffers, and temporary projection matrices. This is why arrays of arrays should be avoided and buffers should be transferred rather than cloned.

## 4.3 HNSW/Wasm

HNSW is appropriate when repeated full scans become too slow. Its relevant controls are:

- `M`: graph connectivity; higher values generally improve recall but increase index memory and construction work;
- `efConstruction`: build-time candidate breadth;
- `efSearch`: query-time candidate breadth; higher values improve recall at the cost of latency;
- `k`: number of returned results.

Faiss estimates HNSW storage at approximately:

\[
4d + 8M \quad \text{bytes per vector}
\]

for float vectors plus graph links, and identifies `efSearch` as the principal speed/accuracy control. [91]

`hnswlib-wasm` supplies browser-compatible C++ HNSW bindings, cosine and L2 examples, mutable `efSearch`, label filters, and IndexedDB/IDBFS persistence. Its own documentation also describes the project as early-stage and does not publish a browser compatibility or maximum-index benchmark. [31]

Therefore:

- benchmark the selected package on target browsers;
- wrap it behind an application-owned `VectorIndex` interface;
- pin its version and serialized-index format;
- retain exact search as a fallback;
- validate ANN recall against exact results;
- rebuild rather than trusting incompatible serialized indexes.

```ts
interface VectorIndex {
  build(vectors: Float32Array, ids: Uint32Array): Promise<void>;
  search(query: Float32Array, k: number, signal?: AbortSignal):
    Promise<SearchHit[]>;
  serialize?(): Promise<ArrayBuffer>;
  dispose(): Promise<void>;
}
```

Voy is a smaller Rust/Wasm alternative using a k-d tree and portable indexes, but its documented API remains pre-1.0/unstable and its repository activity is comparatively old; it is better treated as an experiment than a default production dependency. [406][409]

## 4.4 Exact versus HNSW decision rule

| Corpus/workload | Recommended engine | Reason |
|---|---|---|
| Small lesson corpus | Exact typed-array scan | Most transparent; instant ground truth |
| Infrequent searches | Exact scan | Avoids build and persistence complexity |
| Repeated queries over tens of thousands of vectors | Benchmark exact first; optionally HNSW | Device-dependent crossover |
| Hundreds of thousands of local vectors | HNSW/Wasm or prebuilt index | Exact scans and memory copies become material |
| Millions of vectors | Server-side or aggressively partitioned browser architecture | Memory, download and indexing dominate |
| ANN teaching module | Exact and HNSW side by side | Expose recall/latency/memory trade-off |

Do not define a universal vector-count cutoff. Dimension, CPU, browser, index settings, query frequency, and thermal throttling all affect the crossover.

---

# 5. Dimensionality reduction in JavaScript

## 5.1 Method comparison

| Method | Property preserved | Determinism | Interactive controls | Browser role | Main risk |
|---|---|---|---|---|---|
| PCA | Linear directions of greatest variance | Deterministic for fixed implementation/sign convention | Component axes, centering, explained variance | Default instant overview | Misses nonlinear neighborhoods |
| UMAP | Local manifold with configurable local/global balance | Seed-dependent | `n_neighbors`, `min_dist`, metric, seed | Preferred nonlinear exploration | Cluster appearance changes materially with parameters |
| t-SNE | Local probability neighborhoods | Seed-dependent and non-convex | perplexity, learning rate, iterations, seed |


## Sources & Citations

[1] https://huggingface.co/docs/transformers.js/main/guides/webgpu
[2] https://huggingface.co/docs/transformers.js/guides/webgpu
[3] https://huggingface.co/docs/transformers.js/v3.8.1/guides/webgpu
[4] https://huggingface.tw/docs/transformers.js/guides/webgpu
[5] https://huggingface.co/blog/transformersjs-v3
[6] https://huggingface.co/docs/transformers.js/en/index
[7] https://huggingface.co/docs/transformers.js/v2.17.2/en/index
[8] https://github.com/huggingface/transformers.js/pull/545
[9] https://huggingface.co/docs/transformers.js/main/en/index.md
[10] https://vucense.com/dev-corner/webgpu-browser-llm-2026/
[11] https://www.beri.net/learning/transformers-js-docs
[12] https://deepwiki.com/huggingface/transformers.js/16.3-advanced-usage-patterns
[13] https://huggingface.co/onnx-community/phishing-scam-detector-base-ONNX
[14] https://huggingface.co/docs/transformers.js/index
[15] https://webnn.io/en/learn/tutorials/transformers-js/transformers-js
[16] https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
[17] https://onnxruntime.ai/docs/build/web.html
[18] https://onnxruntime.ai/docs/tutorials/web/
[19] https://fs-eire.github.io/onnxruntime/docs/tutorials/web/performance-diagnosis.html
[20] https://webnn.io/en/learn/tutorials/onnx-runtime/onnx-runtime
[21] https://onnxruntime.ai/docs/get-started/with-javascript/web.html
[22] https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html
[23] https://github.com/ikdao/onnxweb
[24] https://webnn.io/en/api-reference/browser-compatibility/api
[25] https://github.com/microsoft/onnxruntime/tree/main/js/web
[26] https://github.com/microsoft/onnxruntime/blob/main/js/web/README.md
[27] https://github.com/microsoft/onnxruntime/blob/2e2543fbe9fae542f921d47a72d21d5a4ef0b710/js/web/README.md
[28] https://pub.dev/documentation/onnxruntime_web_webgpu/latest/onnxruntime_web_webgpu/
[29] https://webnn.io/en/learn/get-started/debug
[30] https://onnxruntime.ai/docs/performance/tune-performance/threading.html
[31] https://github.com/ShravanSunder/hnswlib-wasm
[32] https://altorlab.dev/frameworks/node
[33] https://altorlab.dev/vs/
[34] https://altorlab.dev/blog/client-side-vector-search-guide
[35] https://github.com/YASSERRMD/barq-vweb
[36] https://github.com/xyntopia
[37] http://github.com/ShravanSunder
[38] https://github.com/jelmerk/hnswlib
[39] https://github.com/singhpratech/ferrovec
[40] https://github.com/topics/hnswlib
[41] https://rxdb.info/articles/javascript-vector-database.md
[42] https://dawchihliou.github.io/articles/wasm-semantic-search-in-rust
[43] https://theaivibe.org/blog/ferrovec-hnsw-vector-index-webassembly
[44] https://www.npmjs.com/package/hnswlib-wasm
[45] https://dev.to/matteo_panzeri_2c5930e196/building-production-ready-vector-search-for-the-browser-with-rust-and-webassembly-2mhi
[46] https://github.com/scienceai/tsne-js
[47] https://mljs.github.io/pca/
[48] https://ml.kanaries.net/playground/pca
[49] https://github.com/umap-project
[50] https://github.com/yinshanyang/umapjs
