// Larkspur mini's MLP neurons (KTD5, Interpretability chapter 6): for every neuron, the five tokens it fires on most
// over the training split, committed in data/interpretability/neurons.json and recomputed here on every run.
// Regenerate after a retrain with: WRITE_NEURONS=1 pnpm vitest run tests/unit/interpretability-neurons.test.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { pieceText } from '../../src/lib/lm/bpe';
import { forward } from '../../src/lib/lm/model';
import { diskModel } from '../../src/lib/transformers/diskModel';
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const FILE = 'data/interpretability/neurons.json';
const TOP = 5;

interface Fire {
  id: number;
  piece: string | null;
  act: number;
}

/** Each neuron's TOP distinct tokens by their highest activation, read at the token's own position. */
function recompute(): Fire[][][] {
  const m = diskModel(),
    { n_layer, d_mlp, ctx } = m.config;
  // best[layer][neuron] maps token id -> its highest activation
  const best = Array.from({ length: n_layer }, () => Array.from({ length: d_mlp }, () => new Map<number, number>()));
  for (const doc of IDS.splits.train.ids as number[][])
    for (let s = 0; s < doc.length; s += ctx) {
      const x = doc.slice(s, s + ctx),
        acts = forward(m, x, { mlp: true }).mlp!;
      acts.forEach((rows, l) =>
        rows.forEach((row, t) =>
          row.forEach((v, n) => {
            const seen = best[l][n].get(x[t]);
            if (seen === undefined || v > seen) best[l][n].set(x[t], v);
          }),
        ),
      );
    }
  return best.map(layer =>
    layer.map(map =>
      [...map]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, TOP)
        .map(([id, act]) => ({ id, piece: pieceText(id), act: Math.round(act * 1e4) / 1e4 })),
    ),
  );
}

it('neurons.json matches a recomputation over the training split', () => {
  const layers = recompute();
  if (process.env.WRITE_NEURONS) {
    const note =
      "Each MLP neuron's five tokens with the highest activation (after GELU) over every 32-token window of the training split, read at the token's own position. Regenerate with WRITE_NEURONS=1.";
    writeFileSync(FILE, `${JSON.stringify({ note, split: 'train', top: TOP, layers })}\n`);
  }
  const saved = JSON.parse(readFileSync(FILE, 'utf8')) as { layers: Fire[][][] };
  expect(saved.layers).toHaveLength(layers.length);
  saved.layers.forEach((layer, l) =>
    layer.forEach((fires, n) => {
      expect(
        fires.map(f => f.id),
        `layer ${l} neuron ${n}`,
      ).toEqual(layers[l][n].map(f => f.id));
      fires.forEach((f, i) => expect(Math.abs(f.act - layers[l][n][i].act)).toBeLessThan(2e-4));
    }),
  );
}, 60_000); // a forward pass over every training window takes seconds
