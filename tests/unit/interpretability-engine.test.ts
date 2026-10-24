// Interpretability's engine (KTD5, KTD12): every effect a chapter shows is rerun live on Larkspur mini and checked
// against data/interpretability/prompts.json, so a retrain that moves one fails here before the copy goes stale.
import { describe, expect, it } from 'vitest';
import { encode } from '../../src/lib/lm/bpe';
import { forward, softmax } from '../../src/lib/lm/model';
import { diskModel } from '../../src/lib/transformers/diskModel';
import { topK } from '../../src/lib/transformers/trace';
import {
  BITE,
  FUSES,
  HELDOUT,
  LENS,
  NEURONS,
  PATCH,
  STEER,
  fuseName,
  headLoss,
  kindOf,
  lens,
  neuron,
  patchGrid,
  rankOf,
  run,
  steerDirection,
  steered,
} from '../../src/lib/interpretability/probe';
import { BEHAVIOURS, WINNERS, keeps, winnersOf } from '../../src/lib/interpretability/workbench';
import { FACTS } from '../../src/lib/interpretability/facts';
import DATA from '../../data/interpretability/prompts.json' with { type: 'json' };

const m = diskModel();
const id = (s: string) => encode(s)[0];

describe('fuses', () => {
  it('names six fuses: one per head and one per MLP', () => {
    expect(FUSES).toEqual(['h0-0', 'h0-1', 'h1-0', 'h1-1', 'mlp0', 'mlp1']);
    expect(fuseName('h0-0')).toBe('Layer 1, head 1');
    expect(fuseName('mlp1')).toBe('Layer 2 MLP');
  });

  it('with no fuse pulled the run is the plain forward pass', () => {
    const ids = encode(BITE.text);
    expect(run(m, ids, []).logits).toEqual(forward(m, ids).logits);
  });

  it('pulling an MLP fuse zeroes its output; a head fuse silences the head', () => {
    const ids = encode(BITE.text),
      plain = forward(m, ids, { residuals: true });
    const mlp = run(m, ids, ['mlp1'], { residuals: true });
    // layer 2's MLP gone: only its attention output reaches the last residual, so the logits move
    expect(mlp.logits.at(-1)).not.toEqual(plain.logits.at(-1));
    expect(run(m, ids, ['h0-0']).logits).toEqual(forward(m, ids, { ablate: [{ layer: 0, head: 0 }] }).logits);
  });

  it('chapter 2: each head lost the pinned share of right top-5 guesses over held-out text, the word-start head most', () => {
    for (const f of FUSES.filter(f => f.startsWith('h'))) {
      const r = headLoss(m, f);
      expect(r.right, f).toBe(HELDOUT.right);
      expect(r.lost, f).toBe(HELDOUT.lost[f as keyof typeof HELDOUT.lost]);
    }
    const shares = Object.values(HELDOUT.lost);
    expect(HELDOUT.lost['h0-0']).toBe(Math.max(...shares));
  }, 30_000);

  it('chapter 2: the pinned prompt is one where the word-start fuse bites', () => {
    const y = id(BITE.expected),
      ids = encode(BITE.text);
    expect(rankOf(run(m, ids, []).logits.at(-1)!, y)).toBe(BITE.rankBefore);
    expect(rankOf(run(m, ids, [BITE.fuse]).logits.at(-1)!, y)).toBe(BITE.rankAfter);
    expect(BITE.rankAfter).toBeGreaterThanOrEqual(5);
  });
});

describe('logit lens', () => {
  it('reads three stages, and the last is the model’s own top 5', () => {
    for (const p of LENS) {
      const l = lens(m, p.text);
      expect(l.stages).toHaveLength(3);
      const last = l.stages[2].at(-1)!.map(c => c.id);
      expect(last).toEqual(topK(softmax(forward(m, encode(p.text)).logits.at(-1)!), 5).map(c => c.id));
    }
  });

  it('pins each prompt’s rank per stage, and meets the bar: top 5 after block 1, not after the embedding, for half', () => {
    let pass = 0;
    for (const p of LENS) {
      const ranks = lens(m, p.text).ranks(id(p.expected));
      expect(ranks, p.id).toEqual(p.ranks);
      if (ranks[1] < 5 && ranks[0] >= 5) pass++;
    }
    expect(pass * 2).toBeGreaterThanOrEqual(LENS.length);
  });
});

describe('patching', () => {
  it('the two prompts are the same length and answer differently', () => {
    expect(encode(PATCH.clean.text)).toHaveLength(encode(PATCH.swapped.text).length);
    const top = (t: string) => topK(softmax(forward(m, encode(t)).logits.at(-1)!), 1)[0].text;
    expect(top(PATCH.clean.text)).toBe(PATCH.clean.answer);
    expect(top(PATCH.swapped.text)).toBe(PATCH.swapped.answer);
  });

  it('each pinned patch moves the answer, and no other does', () => {
    const g = patchGrid(m, PATCH.clean.text, PATCH.swapped.text);
    expect(g.cells).toHaveLength(3);
    g.cells.forEach((row, stage) => {
      const flips = row.flatMap((c, pos) => (c.flipped ? [pos] : []));
      expect(flips, `stage ${stage}`).toEqual(PATCH.flips[stage]);
      for (const c of row) expect(c.flipped).toBe(c.top === PATCH.swapped.answer);
    });
  });
});

describe('steering', () => {
  it('at the pinned scale the target rises into the top 5 from outside it', () => {
    const dir = steerDirection(m, STEER.toward, STEER.away, STEER.layer);
    expect(dir).toHaveLength(m.config.d_model);
    const y = id(STEER.target);
    expect(rankOf(steered(m, STEER.prompt, dir, 0, STEER.layer), y)).toBe(STEER.rankBefore);
    expect(STEER.rankBefore).toBeGreaterThanOrEqual(5);
    expect(rankOf(steered(m, STEER.prompt, dir, STEER.scale, STEER.layer), y)).toBeLessThan(5);
    expect(STEER.scales).toContain(STEER.scale);
    expect(STEER.scales).toContain(0);
  });
});

describe('neurons', () => {
  it('every neuron has five top tokens, and the neurons shown exist', () => {
    const all = NEURONS.layers.flat();
    expect(all).toHaveLength(m.config.n_layer * m.config.d_mlp);
    for (const fires of all) expect(fires).toHaveLength(5);
    for (const s of DATA.neurons.shown) expect(neuron(s.layer, s.neuron).fires).toHaveLength(5);
  });

  it('meets the bar: at least half the neurons fire on pieces of two or more kinds, and each shown one on three', () => {
    const kinds = (fires: { piece: string | null }[]) => new Set(fires.map(f => kindOf(f.piece))).size;
    const mixed = NEURONS.layers.flat().filter(f => kinds(f) >= 2).length;
    expect(mixed).toBe(DATA.neurons.mixed);
    expect(DATA.neurons.total).toBe(NEURONS.layers.flat().length);
    expect(mixed * 2).toBeGreaterThanOrEqual(DATA.neurons.total);
    for (const s of DATA.neurons.shown) expect(kinds(neuron(s.layer, s.neuron).fires)).toBeGreaterThanOrEqual(3);
  });

  it('names the kinds of piece', () => {
    expect(kindOf(' hours')).toBe('word');
    expect(kindOf('ing')).toBe('part');
    expect(kindOf('.')).toBe('mark');
    expect(kindOf(' 20')).toBe('number');
    expect(kindOf(null)).toBe('mark');
  });
});

describe('workbench', () => {
  it('WINNERS is non-empty, recomputes, and every winner is minimal', () => {
    for (const b of BEHAVIOURS) {
      expect(WINNERS[b.id].length, b.id).toBeGreaterThan(0);
      expect(winnersOf(m, b.id)).toEqual(WINNERS[b.id]);
      for (const w of WINNERS[b.id]) {
        expect(keeps(m, b.id, w)).toBe(true);
        for (const f of w)
          expect(
            keeps(
              m,
              b.id,
              w.filter(x => x !== f),
            ),
            `${b.id} without ${f}`,
          ).toBe(false);
      }
    }
  });

  it('every fuse in keeps the behaviour', () => {
    for (const b of BEHAVIOURS) expect(keeps(m, b.id, [...FUSES])).toBe(true);
  });
});

describe('facts', () => {
  it('every fact has a claim and an https source', () => {
    expect(FACTS.length).toBeGreaterThan(0);
    for (const f of FACTS) {
      expect(f.claim.length).toBeGreaterThan(20);
      expect(f.source).toMatch(/^https:\/\//);
    }
  });
});
