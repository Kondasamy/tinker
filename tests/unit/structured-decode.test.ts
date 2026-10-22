import { describe, expect, it } from 'vitest';
import { decode as text, pieceBytes } from '../../src/lib/lm/bpe';
import { decode, heal, shares } from '../../src/lib/structured-outputs/decode';
import { checkText, compile } from '../../src/lib/structured-outputs/grammar';
import { HEAL, RUNS, SCHEMAS, play, run, schemaOf } from '../../src/lib/structured-outputs/prompts';
import { diskModel } from '../../src/lib/transformers/diskModel';

const model = diskModel();

describe('pinned chapter runs (KTD4)', () => {
  it('play() decodes a run once per model: a second call returns the cached result', () => {
    expect(play(model, run('mask'))).toBe(play(model, run('mask')));
  });
  for (const r of RUNS)
    it(`${r.id} reproduces its pinned output`, () => {
      const { decoded } = play(model, r);
      expect(decoded.text).toBe(r.output);
      expect(decoded.status).toBe(r.status);
      // Prompt plus output fit the window, so the model always reads the question it answers.
      expect(decoded.prompt.length + decoded.ids.length).toBeLessThanOrEqual(model.config.ctx);
      expect(decoded.truncated).toBe(false);
      const s = schemaOf(r);
      if (s && r.status === 'done') {
        expect(() => JSON.parse(decoded.text)).not.toThrow();
        expect(checkText(s, decoded.text).errors).toEqual([]);
      }
    });

  it("unconstrained, chapter 1's prompt does not give JSON (the premise holds)", () => {
    const d = play(model, run('asking')).decoded;
    expect(() => JSON.parse(d.text)).toThrow();
    for (const id of ['retry-1', 'retry-2', 'retry-3'])
      expect(checkText(SCHEMAS.status, play(model, run(id)).decoded.text).ok).toBe(false);
  });

  it("chapter 5's draws pick each value at least once", () => {
    const picks = new Set(RUNS.filter(r => r.id.startsWith('draw-')).map(r => JSON.parse(r.output).status));
    expect([...picks].sort()).toEqual(['delayed', 'on time']);
  });

  it('the step cap ends a run that never accepts, as cut-off', () => {
    const d = decode(model, 'Where is order 1042?', compile(SCHEMAS.status), { maxSteps: 3 });
    expect(d.status).toBe('cut-off');
    expect(d.ids).toHaveLength(3);
  });

  it('every token written was allowed, and the masked probabilities sum to 1', () => {
    const { decoded } = play(model, run('mask'));
    for (const st of decoded.steps) {
      expect(st.allowed).toContain(st.pick.id);
      expect(st.allowed.reduce((m, id) => m + st.probs[id], 0)).toBeCloseTo(1, 9);
      expect(st.blocked).toBeGreaterThanOrEqual(0);
    }
  });

  it("chapter 5: the enum's values have distinct first letters, and their shares sum to 1", () => {
    const g = compile(SCHEMAS.status);
    const sh = shares(g, play(model, run('draw-1')).decoded, 'status')!;
    expect(new Set(SCHEMAS.status.properties.status.enum!.map(v => String(v)[0])).size).toBe(2);
    expect(sh.values.reduce((m, v) => m + v.p, 0)).toBeCloseTo(1, 9);
    expect(sh.values.find(v => v.value === 'delayed')!.p).toBeGreaterThan(0.5);
  });

  it('token healing: the healed next token starts with the removed bytes', () => {
    const h = heal(model, HEAL.prompt);
    expect(h.removed.text).toBe(HEAL.removed);
    expect(h.plain[0].text).toBe(HEAL.plain);
    expect(h.healed[0].text).toBe(HEAL.healed);
    const removed = pieceBytes(h.removed.id);
    for (const c of h.healed) expect([...pieceBytes(c.id).slice(0, removed.length)]).toEqual([...removed]);
    expect(text([h.healed[0].id]).startsWith(HEAL.removed)).toBe(true);
  });
});
