// Inference's server (KTD7): a discrete-time simulator over a fixed trace of Larkspur's requests. Time advances one
// iteration at a time; each iteration's length comes from counted work (parameter counts and costs.ts) at the unit
// costs in data/inference/assumptions.json. It is a labelled cost model, never a measurement.
import data from '../../../data/inference/assumptions.json' with { type: 'json' };
import trace from '../../../data/inference/requests.json' with { type: 'json' };
import { costs } from '../transformers/costs';
import type { ModelConfig } from '../lm/model';
import { OPEN_MODEL, fact } from './facts';

export const ASSUMPTIONS = data;
/** A request: when it arrives (ms from the start), its prompt and its reply, in tokens. */
export interface Request {
  id: string;
  at: number;
  prompt: number;
  reply: number;
}
export const REQUESTS: Request[] = trace.requests;

/** What the server runs: a shape (layers, d_model) and a parameter count. */
export interface Shape {
  name: string;
  config: Pick<ModelConfig, 'n_layer' | 'n_head' | 'd_model'>;
  params: number;
}
/** The server's model: the open model's published shape (facts.json `opt-13b`). */
export const OPEN: Shape = { name: 'OPT-13B', config: OPEN_MODEL, params: OPEN_MODEL.params };

export type Mode = 'static' | 'continuous';
/** The settings' finite lists (KTD7). */
export const MODES: Mode[] = ['static', 'continuous'];
export const CAPS = [1, 2, 4, 8, 16] as const;
/** GB of accelerator memory left for the KV cache once the weights are in: two smaller cards (assumed), and what the
 * cited 40 GB card (fact `a100-split`) leaves beside OPT-13B's 16-bit weights */
export const MEMORY: readonly number[] = [
  ...data.kvRoomGB,
  Number(fact('a100-split').value) - (OPEN_MODEL.params * data.bytesPerNumber) / 1e9,
];
export interface Settings {
  mode: Mode;
  cap: number;
  kvRoomGB: number;
}
export const DEFAULT: Settings = { mode: 'continuous', cap: 8, kvRoomGB: MEMORY.at(-1)! };

const B = data.bytesPerNumber,
  GB = 1e9;

/** Numbers the KV cache keeps for n tokens, as bytes (costs.ts × bytes per number). */
export const kvBytes = (s: Shape, n: number) => costs(s.config as ModelConfig, n).kv * B;
/** A request reserves its KV room for prompt and reply when it is let in. */
export const reserved = (s: Shape, r: Request) => kvBytes(s, r.prompt + r.reply);

/** Work counted for prefilling n prompt tokens: every weight twice per token (multiply and add), plus attention:
 * per layer, each of the pairs scores a query against a key and mixes a value, d_model numbers each (4 × pairs × d_model). */
export const prefillFlops = (s: Shape, n: number) =>
  2 * s.params * n + 4 * s.config.n_layer * s.config.d_model * costs(s.config as ModelConfig, n).pairs;
/** Work for one decode token at position n: every weight once, attention over the n tokens before it. */
export const decodeFlops = (s: Shape, n: number) => 2 * s.params + 4 * s.config.n_layer * s.config.d_model * n;

/** One iteration's length in ms: a fixed overhead, the weights read once, each decoding sequence's KV read, and the
 * counted work at the assumed rate. Prefill is mostly work; decode is mostly reading. */
export function iterationMs(s: Shape, prefill: number[], decode: number[]): number {
  const read = s.params * B + decode.reduce((t, n) => t + kvBytes(s, n), 0);
  const work = prefill.reduce((t, n) => t + prefillFlops(s, n), 0) + decode.reduce((t, n) => t + decodeFlops(s, n), 0);
  return data.overheadMs + read / data.bytesPerMs + work / data.flopsPerMs;
}

export interface Served extends Request {
  /** let in (left the queue) and its first token, ms */
  admitted: number;
  first: number;
  finish: number;
  /** wait to first token: first − at */
  ttft: number;
  /** ms per reply token after the first */
  tpot: number;
}
export interface Iteration {
  start: number;
  end: number;
  prefill: string[];
  decode: string[];
  queued: number;
  kv: number;
}
export interface Result {
  settings: Settings;
  served: Served[];
  iterations: Iteration[];
  /** when the last reply finished, ms */
  makespan: number;
  /** reply tokens per second */
  throughput: number;
  worstTtft: number;
  medianTtft: number;
  meanTpot: number;
  /** most KV bytes in flight at once, and the room */
  peakKv: number;
  room: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Serves the trace. Requests are let in first come, first served, while the batch is under the cap and their KV room
 * fits; otherwise they wait in the queue (never dropped). Static batching lets a batch in only when the server is idle
 * and runs it until its longest reply ends; continuous batching lets requests in at every iteration. */
export function serve(shape: Shape, settings: Settings, requests: Request[] = REQUESTS): Result {
  const room = settings.kvRoomGB * GB,
    queue = [...requests].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  if (queue.some(r => reserved(shape, r) > room)) throw new Error('a request needs more KV room than the server has');
  const running: { r: Request; made: number; admitted: number; first: number }[] = [],
    served: Served[] = [],
    iterations: Iteration[] = [];
  let t = 0,
    kv = 0;
  while (queue.length || running.length) {
    const canAdmit = settings.mode === 'continuous' || running.length === 0;
    const joining: Request[] = [];
    while (
      canAdmit &&
      queue.length &&
      queue[0].at <= t &&
      running.length + joining.length < settings.cap &&
      kv + reserved(shape, queue[0]) <= room
    ) {
      const r = queue.shift()!;
      joining.push(r);
      kv += reserved(shape, r);
    }
    // static batching keeps finished sequences in the batch as padding until the longest is done
    const decoding = running.filter(x => settings.mode === 'static' || x.made < x.r.reply);
    if (!joining.length && !decoding.length) {
      t = queue[0].at;
      continue;
    }
    const pad = settings.mode === 'static';
    const ms = iterationMs(
      shape,
      joining.map(r => r.prompt),
      decoding.map(x => x.r.prompt + Math.min(x.made, x.r.reply)),
    );
    const end = t + ms;
    iterations.push({
      start: t,
      end,
      prefill: joining.map(r => r.id),
      decode: decoding.filter(x => x.made < x.r.reply).map(x => x.r.id),
      queued: queue.filter(r => r.at <= t).length,
      kv,
    });
    for (const x of decoding)
      if (x.made < x.r.reply) {
        x.made++;
        if (x.made === x.r.reply) done(x, end);
      }
    for (const r of joining) {
      const x = { r, made: 1, admitted: t, first: end };
      running.push(x);
      if (r.reply === 1) done(x, end);
    }
    if (pad ? running.every(x => x.made >= x.r.reply) : true)
      for (let i = running.length - 1; i >= 0; i--)
        if (running[i].made >= running[i].r.reply) {
          kv -= reserved(shape, running[i].r);
          running.splice(i, 1);
        }
    t = end;
  }
  function done(x: (typeof running)[number], end: number) {
    served.push({
      ...x.r,
      admitted: x.admitted,
      first: x.first,
      finish: end,
      ttft: x.first - x.r.at,
      tpot: x.r.reply > 1 ? (end - x.first) / (x.r.reply - 1) : 0,
    });
  }
  served.sort((a, b) => requests.findIndex(r => r.id === a.id) - requests.findIndex(r => r.id === b.id));
  const makespan = Math.max(...served.map(s => s.finish)),
    tokens = served.reduce((n, s) => n + s.reply, 0);
  return {
    settings,
    served,
    iterations,
    makespan,
    throughput: tokens / (makespan / 1000),
    worstTtft: Math.max(...served.map(s => s.ttft)),
    medianTtft: median(served.map(s => s.ttft)),
    meanTpot: served.reduce((n, s) => n + s.tpot, 0) / served.length,
    peakKv: Math.max(0, ...iterations.map(i => i.kv)),
    room,
  };
}
