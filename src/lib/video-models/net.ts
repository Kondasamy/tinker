// The world models' forward pass (KTD5) in plain TypeScript: the conv nets scripts/train/train_world.py trained.
// Input: the last k frames as one-hot kinds plus the action broadcast as channels; three 3x3 convs with ReLU, then a
// 1x1 conv to per-cell logits over the four kinds. tests/unit/video-models-net.test.ts checks it against the goldens.
import { halfToFloat } from '../lm/load';
import { ACTIONS, type Action, KINDS, SIZE } from './world';

export interface NetMeta {
  k: number;
  channels: number;
  params: number;
  bytes: number;
  tensors: { name: string; shape: number[]; offset: number }[];
  scores: Record<string, number>;
  goldens: { frames: string[]; action: number; cells: number[]; logits: number[][]; guess: string }[];
}
export interface Net {
  k: number;
  tensors: Record<string, Float32Array>;
}

export function parseNet(meta: NetMeta, buf: ArrayBuffer): Net {
  if (buf.byteLength !== meta.bytes) throw new Error(`world model: ${buf.byteLength} bytes, meta says ${meta.bytes}`);
  const u16 = new Uint16Array(buf),
    tensors: Record<string, Float32Array> = {};
  for (const t of meta.tensors) {
    const n = t.shape.reduce((a, b) => a * b, 1),
      at = t.offset / 2;
    tensors[t.name] = Float32Array.from({ length: n }, (_, i) => halfToFloat(u16[at + i]));
  }
  return { k: meta.k, tensors };
}

const N = SIZE * SIZE;

const P = SIZE + 2;

/** A 3x3 conv with zero padding: x is [in][cell], w is [out][in][3][3]; returns [out][cell], through ReLU. */
function conv3(x: Float64Array, nIn: number, w: Float32Array, b: Float32Array) {
  const pad = new Float64Array(nIn * P * P);
  for (let i = 0; i < nIn; i++)
    for (let cy = 0; cy < SIZE; cy++)
      pad.set(x.subarray(i * N + cy * SIZE, i * N + cy * SIZE + SIZE), i * P * P + (cy + 1) * P + 1);
  const nOut = b.length,
    y = new Float64Array(nOut * N);
  for (let o = 0; o < nOut; o++)
    for (let cy = 0; cy < SIZE; cy++)
      for (let cx = 0; cx < SIZE; cx++) {
        let s = b[o];
        for (let i = 0; i < nIn; i++) {
          const q = i * P * P + cy * P + cx,
            k = (o * nIn + i) * 9;
          s +=
            w[k] * pad[q] +
            w[k + 1] * pad[q + 1] +
            w[k + 2] * pad[q + 2] +
            w[k + 3] * pad[q + P] +
            w[k + 4] * pad[q + P + 1] +
            w[k + 5] * pad[q + P + 2] +
            w[k + 6] * pad[q + 2 * P] +
            w[k + 7] * pad[q + 2 * P + 1] +
            w[k + 8] * pad[q + 2 * P + 2];
        }
        y[o * N + cy * SIZE + cx] = Math.max(s, 0);
      }
  return y;
}

/** A 1x1 conv: per cell, a linear map over channels. */
function conv1(x: Float64Array, nIn: number, w: Float32Array, b: Float32Array) {
  const y = new Float64Array(b.length * N);
  for (let o = 0; o < b.length; o++)
    for (let c = 0; c < N; c++) {
      let s = b[o];
      for (let i = 0; i < nIn; i++) s += w[o * nIn + i] * x[i * N + c];
      y[o * N + c] = s;
    }
  return y;
}

/** Logits per kind per cell ([kind * 256 + cell]) for the next frame, from the last k frames (oldest first). */
export function logits(net: Net, frames: Uint8Array[], action: Action): Float64Array {
  const { k, tensors: T } = net;
  if (frames.length < k) throw new Error(`world model k${k}: needs ${k} frames, got ${frames.length}`);
  const nIn = 4 * k + ACTIONS.length,
    x = new Float64Array(nIn * N);
  frames.slice(-k).forEach((f, j) => {
    for (let c = 0; c < N; c++) x[(4 * j + f[c]) * N + c] = 1;
  });
  x.fill(1, (4 * k + action) * N, (4 * k + action + 1) * N);
  const ch = T['c1.bias'].length;
  let h = conv3(x, nIn, T['c1.weight'], T['c1.bias']);
  h = conv3(h, ch, T['c2.weight'], T['c2.bias']);
  h = conv3(h, ch, T['c3.weight'], T['c3.bias']);
  return conv1(h, ch, T['out.weight'], T['out.bias']);
}

/** A frame from a pass's logits: the likeliest kind per cell. */
export function frameOf(z: Float64Array): Uint8Array {
  const f = new Uint8Array(N);
  for (let c = 0; c < N; c++) for (let j = 1; j < KINDS.length; j++) if (z[j * N + c] > z[f[c] * N + c]) f[c] = j;
  return f;
}
/** The model's guessed next frame: the likeliest kind per cell. */
export const guess = (net: Net, frames: Uint8Array[], action: Action): Uint8Array =>
  frameOf(logits(net, frames, action));
