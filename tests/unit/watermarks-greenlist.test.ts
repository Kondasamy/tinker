// Watermarks' spike (U2, KTD3): the green list on Larkspur mini meets the bar, pinned in spike.json.
// Every run recomputes the chosen setting's 20 replies, scores and quality drop against the pin; the full sweep is
// slow (about a minute), so it runs only when regenerating: WRITE_SPIKE=1 pnpm vitest run tests/unit/watermarks-greenlist.test.ts
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { decode, encode, VOCAB_SIZE } from '../../src/lib/lm/bpe';
import { modelLoader } from '../../src/lib/lm/load';
import type { Model } from '../../src/lib/lm/model';
import { sample } from '../../src/lib/transformers/sample';
import { check, LINE, MIN_PAIRS, score } from '../../src/lib/watermarks/detect';
import { greenList, isGreen, KEY } from '../../src/lib/watermarks/greenlist';
import {
  larkspur,
  logLikelihood,
  nextBest,
  swapHalf,
  write,
  type Mark,
  type Writer,
} from '../../src/lib/watermarks/sample';
import P from '../../data/watermarks/prompts.json' with { type: 'json' };

const SPIKE = 'data/watermarks/spike.json';
const STEPS = 64;
const DELTAS = [1, 2, 4];
const GAMMAS = [0.25, 0.5];
const BAR = { medianZ: 4, unmarkedMedianBelow: 1, unmarkedMaxBelow: LINE, maxDrop: 0.5, swappedMedianBelow: 2 };

const disk = async (f: string) => {
  const b = readFileSync(`public/data/lm/${f}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
};
const zOf = (ids: number[], gamma: number) => check(ids, gamma).z ?? 0;

/** Replies for every pinned prompt, reply i with seed i + 1. */
const replies = (w: Writer, mark: Mark) => P.prompts.map((p, i) => write(w, p.text, mark, i + 1, STEPS));
const quality = (w: Writer, rs: number[][]) => mean(rs.map((r, i) => logLikelihood(w, P.prompts[i].text, r)));
/** Largest number of replies sharing their first 8 tokens. */
const sharedFirst8 = (rs: number[][]) => {
  const n = new Map<string, number>();
  for (const r of rs) n.set(r.slice(0, 8).join(), (n.get(r.slice(0, 8).join()) ?? 0) + 1);
  return Math.max(...n.values());
};

/** One sweep row, measured against the unmarked replies. */
function measure(w: Writer, mark: Mark, base: { ll: number }) {
  const rs = replies(w, mark),
    zs = rs.map(r => zOf(r, mark.gamma)),
    swapped = rs.map((r, i) => zOf(swapHalf(w, P.prompts[i].text, r), mark.gamma)),
    drop = base.ll - quality(w, rs);
  const row = {
    gamma: mark.gamma,
    delta: mark.delta,
    medianZ: r4(median(zs)),
    minZ: r4(Math.min(...zs)),
    drop: r4(drop),
    swappedMedianZ: r4(median(swapped)),
    sharedFirst8: sharedFirst8(rs),
  };
  return { rs, zs, row };
}

const meets = (row: ReturnType<typeof measure>['row'], unmarked: { medianZ: number; maxZ: number }) =>
  row.medianZ >= BAR.medianZ &&
  row.drop <= BAR.maxDrop &&
  row.swappedMedianZ < BAR.swappedMedianBelow &&
  row.sharedFirst8 < P.prompts.length / 2 &&
  unmarked.medianZ < BAR.unmarkedMedianBelow &&
  unmarked.maxZ < BAR.unmarkedMaxBelow;

let model: Model, w: Writer;
beforeAll(async () => {
  model = await modelLoader(disk).load();
  w = larkspur(model);
});

if (process.env.WRITE_SPIKE)
  it('regenerates spike.json from the full sweep', () => {
    const base = replies(w, { delta: 0, gamma: 0.5 }),
      ll = quality(w, base);
    const unmarked = Object.fromEntries(
      GAMMAS.map(g => {
        const zs = base.map(r => zOf(r, g));
        return [g, { medianZ: r4(median(zs)), maxZ: r4(Math.max(...zs)) }];
      }),
    );
    const sweep = GAMMAS.flatMap(gamma =>
      DELTAS.map(delta => {
        const { row } = measure(w, { gamma, delta }, { ll });
        return { ...row, met: meets(row, unmarked[gamma]) };
      }),
    );
    // The rule: of the settings that meet the whole bar, the one that costs the least quality.
    const best = sweep.filter(s => s.met).sort((a, b) => a.drop - b.drop)[0];
    if (!best) throw new Error('The bar fails: apply the stop condition fallbacks (U2) before pinning.');
    const marked = replies(w, best);
    writeFileSync(
      SPIKE,
      `${JSON.stringify(
        {
          note: 'Recomputed by tests/unit/watermarks-greenlist.test.ts; regenerate with WRITE_SPIKE=1. z is always scored on encode(decode(reply)). drop is the mean log-likelihood per token (nats) the unmarked model gives the unmarked replies minus what it gives the marked ones.',
          model: { file: 'public/data/lm/model.bin', sha256: sha('public/data/lm/model.bin') },
          key: KEY,
          steps: STEPS,
          ctx: model.config.ctx,
          temperature: 1,
          seeds: 'reply i uses seed i + 1, prompts from data/watermarks/prompts.json',
          bar: { ...BAR, sharedFirst8Below: P.prompts.length / 2 },
          unmarked: { logLikelihood: r4(ll), sharedFirst8: sharedFirst8(base), ...unmarked },
          sweep,
          chosen: {
            gamma: best.gamma,
            delta: best.delta,
            rule: 'least quality drop among the settings meeting the bar',
          },
          fallbacks: [],
          replies: {
            unmarked: base,
            marked: marked.map(ids => ({
              ids,
              z: r4(zOf(ids, best.gamma)),
              retokenised: encode(decode(ids)).join() !== ids.join(),
            })),
          },
        },
        null,
        2,
      )}\n`,
    );
  }, 600_000);

describe('the spike pin', () => {
  const S = () => JSON.parse(readFileSync(SPIKE, 'utf8'));

  it('model.bin is the pinned base, unchanged', () => {
    expect(sha('public/data/lm/model.bin')).toBe('bbeee00ace589152509849245ef72ef9bf337201621b9dd37643eba2b22be2e1');
    expect(S().model.sha256).toBe(sha('public/data/lm/model.bin'));
  });

  it('records a sweep over δ 1, 2, 4 and γ 0.25, 0.5 whose chosen setting meets the whole bar, with no fallback', () => {
    const s = S();
    expect(s.sweep.map((r: Mark) => [r.gamma, r.delta])).toEqual(GAMMAS.flatMap(g => DELTAS.map(d => [g, d])));
    for (const r of s.sweep) expect(r.met).toBe(meets(r, s.unmarked[r.gamma]));
    const chosen = s.sweep.find((r: Mark) => r.gamma === s.chosen.gamma && r.delta === s.chosen.delta);
    expect(chosen.met).toBe(true);
    expect(chosen.drop).toBe(
      Math.min(...s.sweep.filter((r: { met: boolean }) => r.met).map((r: { drop: number }) => r.drop)),
    );
    expect(s.fallbacks).toEqual([]);
  });

  it('recomputes the chosen setting: same replies, z, quality drop and swap result as pinned', () => {
    const s = S(),
      mark = s.chosen as Mark;
    const base = replies(w, { delta: 0, gamma: mark.gamma });
    expect(base).toEqual(s.replies.unmarked);
    const ll = quality(w, base);
    expect(r4(ll)).toBe(s.unmarked.logLikelihood);
    const { rs, zs, row } = measure(w, mark, { ll });
    expect(rs).toEqual(s.replies.marked.map((r: { ids: number[] }) => r.ids));
    expect(zs.map(r4)).toEqual(s.replies.marked.map((r: { z: number }) => r.z));
    expect({ ...row, met: true }).toEqual(s.sweep.find((r: Mark) => r.gamma === mark.gamma && r.delta === mark.delta));
    // the bar, live
    expect(median(zs)).toBeGreaterThanOrEqual(4);
    expect(row.drop).toBeLessThanOrEqual(0.5);
    expect(row.swappedMedianZ).toBeLessThan(2);
    expect(sharedFirst8(rs)).toBeLessThan(10);
    const unz = base.map(r => zOf(r, mark.gamma));
    expect(median(unz)).toBeLessThan(1);
    expect(Math.max(...unz)).toBeLessThan(LINE);
  });

  it('scores every pinned reply on its re-read tokens, the same z as its ids unless pinned as re-tokenised', () => {
    const s = S();
    for (const r of s.replies.marked) {
      const again = encode(decode(r.ids));
      expect(r.retokenised).toBe(again.join() !== r.ids.join());
      expect(r4(score(again, s.chosen.gamma).z!)).toBe(r.z);
      if (!r.retokenised) expect(r4(score(r.ids, s.chosen.gamma).z!)).toBe(r.z);
    }
  });
});

describe('the writer', () => {
  const p = P.prompts[0].text,
    mark = { delta: 2, gamma: 0.5 };

  it('gives the same reply token for token for the same seed and prompt', () => {
    expect(write(w, p, mark, 3, 16)).toEqual(write(w, p, mark, 3, 16));
  });

  it('at δ 0 is Transformers’ sample() at temperature 1 with the same seed', () => {
    for (const seed of [1, 7])
      expect(write(w, p, { delta: 0, gamma: 0.25 }, seed, 12)).toEqual(
        sample(model, p, 1, 1, seed, 12).picks.map(x => x.id),
      );
  });

  it('offers six next-best tokens, never the one already there', () => {
    const ids = encode(p),
      alt = nextBest(w, ids, 42);
    expect(alt).toHaveLength(6);
    expect(alt).not.toContain(42);
    expect(new Set(alt).size).toBe(6);
  });
});

describe('the green list and checker', () => {
  it('depends only on the previous token and the key: exact share γ, a different key a different list', () => {
    for (const g of GAMMAS) expect(greenList(5, g).reduce((a, b) => a + b, 0)).toBe(Math.round(g * VOCAB_SIZE));
    expect(Array.from(greenList(5, 0.5))).toEqual(Array.from(greenList(5, 0.5, KEY)));
    expect(Array.from(greenList(5, 0.5))).not.toEqual(Array.from(greenList(6, 0.5)));
    expect(Array.from(greenList(5, 0.5))).not.toEqual(Array.from(greenList(5, 0.5, KEY + 1)));
    expect(isGreen(5, 9, 0.5)).toBe(greenList(5, 0.5)[9] === 1);
  });

  it('counts a repeated pair once, so a looping reply never reaches the line', () => {
    const [a, b] = encode(' order history');
    const loop = Array.from({ length: 64 }, (_, i) => (i % 2 ? b : a));
    expect(score(loop, 0.25)).toMatchObject({ pairs: 2, verdict: 'too short to say', z: null });
    // a loop whose two pairs are both green still says nothing
    const g = Array.from({ length: VOCAB_SIZE }, (_, i) => i).find(i => isGreen(a, i, 0.25) && isGreen(i, a, 0.25))!;
    expect(
      score(
        Array.from({ length: 64 }, (_, i) => (i % 2 ? g : a)),
        0.25,
      ).z,
    ).toBeNull();
  });

  it('says "too short to say" below 16 scored pairs, and scores from 16', () => {
    const ids = Array.from({ length: 40 }, (_, i) => i);
    expect(score(ids.slice(0, MIN_PAIRS), 0.5).verdict).toBe('too short to say');
    expect(score(ids.slice(0, MIN_PAIRS + 1), 0.5).z).not.toBeNull();
  });
});
