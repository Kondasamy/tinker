# Inference (`/inference/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The serving floor** (`src/components/scenes/serveScene.ts`): requests wait as envelopes on a queue belt; the server is a steel rack with one batch seat per request it may run at once, lit for the requests in this pass (mustard reading its prompt, mint writing its reply), and a KV shelf beside it fills with the cache the requests in flight hold, its last cubby tomato. For speculative decoding a small draft runner (the student) stands by the rack with its guessed tokens in a row, kept ones lit. `floorAt` reads the floor off one pass of a server run (default the busiest). `InferenceStage` (`src/content/inference/kit.tsx`) puts it one tab from the Timeline (`serverTimeline.ts`: a lane per request, its wait, prefill and decode, with the first-token target). A stage that needs weights holds its frame with a loading pill, or an error card with Retry, until they are in. On phones only the server's pill shows and the caption carries the counts.
- **Hero object: a diner counter** whose stools are the batch seats (cushions lit by phase), a round sign under the server's pill, an order-ticket rack as the KV shelf (a ticket per filled cubby), and the customer at the head of the queue beside the belt (one drawn, for the size budget); the draft runner stays the small model machine.

## Engine (`src/lib/inference/`)

- **Three parts, nothing recorded** (KTD7): quantization and speculative decoding run Larkspur mini (and its student) live in the browser; batching and the KV cache at scale run on a simulated server.
- **Quantization is simulated** (`quantize.ts`): every weight matrix is rounded to int8 or int4 per row (absmax: each row's largest magnitude maps to the top level), then dequantized, and the forward pass runs unchanged. No new weight files. Memory is counted from the shapes, and counts what a real weight-only scheme keeps: one 16-bit scale per row, and the vectors (biases, LayerNorm) at 16 bits. Held-out loss and top-5 changes are computed live, a document at a time so the page keeps responding.
- **Speculative decoding is real** (`speculate.ts`): the student (the language-model kit's, below) drafts k tokens (`KS`), Larkspur mini checks them in one pass and keeps the longest prefix it agrees with plus its own next token. Every run is capped to the 32-token window (`maxNew`), so the checking pass sees what plain greedy decoding saw, and `tests/unit/inference-speculate.test.ts` proves the output equal to greedy, token for token.
- **The server is a discrete-time simulator** (`server.ts`) over a fixed trace of Monday-morning requests (`data/inference/requests.json`, hand-written, not logged traffic). Each iteration's length comes from counted work (parameter counts and Transformers' `costs.ts`) at the round unit costs in `data/inference/assumptions.json`, labelled a cost model: never measured, and the copy says so. Settings step over finite lists: static or continuous batching (`MODES`), the batch cap (`CAPS`) and the KV room (`MEMORY`: two assumed smaller rooms, and the largest read off the cited 40 GB card less OPT-13B's 16-bit weights, so chapters 2, 4 and 7 can't disagree).
- **Scale comes from a published config**: the server runs OPT-13B's shape (fact `opt-13b`, layers, heads, d_model and parameters), so the KV cache per token and the memory it fills are real-sized; Larkspur mini is far too small to fill a server.
- **Chapter 6 teaches pace against throughput**: on the simulator a bigger batch cap always shortens the queue, so the real cost of a bigger batch is each customer's time per token. The chapter was renamed for it (`06-pace-or-throughput`); keep the framing.
- **Chapter 7's workbench** (`workbench.ts`): a policy is a mode, a cap and a KV room (2 × 5 × 3). A request passes when its first token comes within Larkspur's first-token target and its reply keeps the per-token target (`data/inference/workbench.json`, the team's choices). The puzzle accepts every policy tied for the most requests on target (`WINNERS`).
- **Facts about serving** (prefill and decode, the KV cache, PagedAttention, continuous batching, GPTQ and AWQ, speculative decoding) come from `data/inference/facts.json` with source and access date.
- **Chapter 7's targets are labelled team choices**: DistServe's goodput finding and its OPT-13B chatbot targets sit beside them (facts `distserve-goodput`, `distserve-chatbot-targets`).

## Toy vs real

Server times everywhere come from the cost model (`CostModelNote`: assumed unit costs, not measured; the note says what carries over: prefill mostly compute, decode mostly memory reads). Larkspur mini and its student are trained toys: their counts are live but labelled, never recalibrated.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | Prompt and reply tokens, forward passes | Larkspur mini, run live | Real (for the toy) |
| 1 | Time to first token, time per token, 100–1,000-token prompts | `prefill-parallel`, `decode-memory-bound` | Labelled (cost model; prompt lengths are chosen settings) |
| 2 | Larkspur mini's KV cache (KB) | Counted from `meta.json` | Real (for the toy) |
| 2 | 800 KB a token, 1.6 GB a 2,048-token request, 40 layers, width 5,120 | `opt-13b`, `kv-800kb` | Matched (`OPEN_MODEL`) |
| 2 | 14 GB KV room, requests that fit, slider 1–16 | `a100-split` | Matched (`MEMORY.at(-1)` = 40 GB − 26 GB of weights) |
| 3 | 24 requests, batch cap 8 | Hand-written trace | Labelled (`requests.json` note) |
| 3 | Last reply done, longest first-token wait, tokens/s | `batching-amortizes`, `orca` | Labelled (cost model) |
| 4 | 40 GB card, weights 26 / 13 / 6.5 GB, KV room, requests that fit | `a100-split`, `opt-13b` | Matched (`GPU_GB`, `OPEN_MODEL.params`) |
| 4 | 255 and 15 levels | Definition of int8 / int4 | Real |
| 4 | Larkspur mini's weight bytes, held-out loss and change, top 5 kept | `gptq`, `awq` | Labelled (trained toy; the copy says measure your own) |
| 5 | 12 tokens, guesses per check 0–4, the two models' sizes | `meta.json`, `prompts.json` | Real (for the toy) / chosen settings |
| 5 | Checks, acceptance rate, tokens per check | `speculative-leviathan`, `speculative-chen` | Labelled (trained toys; the note says the papers measured larger models) |
| 6 | Batch caps 1–16, tokens/s, longest first-token wait, average time per token | `batching-amortizes` | Labelled (cost model) |
| 7 | Targets 1 s and 25 ms | `distserve-chatbot-targets` | Labelled (team choice, said beside the facts) |
| 7 | Requests on target, best score, settings that tie | `distserve-goodput` | Labelled (cost model; `WINNERS` computed) |
| 7 | KV room 4 / 8 / 14 GB | `a100-split` | 4 and 8 assumed; 14 matched |
| Intro | 800 KB a token, 24 requests, the models' sizes, one request's times | `kv-800kb`; trace; `meta.json`; cost model | Matched / labelled / real / labelled |
