// Small models' engine (U11): the student against the teacher (live), and the two recorded tiers routed, graded and
// gated (live over recordings).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseModel, parseStudent, type Meta } from '../../src/lib/lm/load';
import { agreement } from '../../src/lib/lm/model';
import { closeness, compare, HELDOUT, layoutOf, multsPerToken, paramCount, PROMPTS, top5 } from '../../src/lib/small-models/compare';
import { ALL_LARGE, ALL_SMALL, cheapestShipping, COST, frontier, gate, GATE, QUESTION_IDS, run, SMALL_COST, THRESHOLDS } from '../../src/lib/small-models/router';
import { FACTS } from '../../src/lib/small-models/facts';
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const disk = (f: string) => { const b = readFileSync('public/data/lm/' + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const teacher = parseModel(meta, disk('model.bin')), student = parseStudent(meta, disk('student.bin'));

describe('the student against the teacher (live)', () => {
  it('counts each model’s weights from its layout, matching meta.json', () => {
    expect(paramCount(layoutOf(meta, 'teacher'))).toBe(meta.model.params);
    expect(paramCount(layoutOf(meta, 'student'))).toBe(meta.student!.model.params);
  });

  it('counts the student’s work per token as a fraction of the teacher’s', () => {
    const t = multsPerToken(layoutOf(meta, 'teacher')), s = multsPerToken(layoutOf(meta, 'student'));
    expect(s).toBeLessThan(t / 2);
    expect(s).toBeGreaterThan(0);
  });

  it('agreement over the held-out copy equals meta.json’s and the kit’s agreement()', () => {
    const c = compare(teacher, student);
    expect(Math.abs(c.agreement - meta.student!.agreement)).toBeLessThan(1e-9);
    expect(Math.abs(c.agreement - agreement(student, teacher, IDS.splits.heldout.ids))).toBeLessThan(1e-9);
    expect(c.positions).toBe(HELDOUT.ids.reduce((n, d) => n + d.length - 1, 0));
  });

  it('KL is positive per document and zero for a model against itself', () => {
    const c = compare(teacher, student);
    expect(c.kl).toBeGreaterThan(0);
    for (const d of c.docs) expect(d.kl).toBeGreaterThan(0);
    const self = closeness(teacher, teacher, [HELDOUT.ids[0]], [HELDOUT.docs[0]])[0];
    expect(self.same).toBe(self.positions);
    expect(Math.abs(self.kl)).toBeLessThan(1e-9);
  });

  it('every prompt a chapter shows has its expected next piece in the teacher’s top 5', () => {
    for (const p of PROMPTS) expect(top5(teacher, p.text).map(c => c.text), p.id).toContain(p.expected);
  });

  it('at least one prompt where the two top picks differ, and one where they match (chapter 1’s contrast)', () => {
    const same = PROMPTS.map(p => top5(teacher, p.text)[0].id === top5(student, p.text)[0].id);
    expect(same).toContain(true);
    expect(same).toContain(false);
  });
});

describe('the two tiers, routed and gated (recorded answers, live grading)', () => {
  it('costs come from the dated price pair: the small tier is cheaper than the large', () => {
    expect(SMALL_COST).toBeGreaterThan(0);
    expect(SMALL_COST).toBeLessThan(1);
    expect(COST.large).toBe(1);
  });

  it('every threshold gives a point; quality never falls as the threshold rises', () => {
    const f = frontier(), pts = f.slice(0, THRESHOLDS.length);
    expect(pts.map(p => p.threshold)).toEqual(THRESHOLDS);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].right).toBeGreaterThanOrEqual(pts[i - 1].right);
      expect(pts[i].cost).toBeGreaterThanOrEqual(pts[i - 1].cost);
    }
    expect(pts[0].up).toBe(0);
    expect(pts.at(-1)!.up).toBe(QUESTION_IDS.length);
    expect(f.at(-1)!.id).toBe('all-large');
  });

  it('the router at threshold 0 is all-small; at 1 it matches all-large’s answers and costs more', () => {
    expect(run({ threshold: 0 }).right).toBe(run(ALL_SMALL).right);
    expect(run({ threshold: 1 }).right).toBe(run(ALL_LARGE).right);
    expect(run({ threshold: 1 }).cost).toBeGreaterThan(run(ALL_LARGE).cost);
  });

  it('the large tier is right wherever the small one is, so sending up never loses an answer', () => {
    for (const q of QUESTION_IDS) if (run(ALL_SMALL, [q]).right) expect(run(ALL_LARGE, [q]).right, q).toBe(1);
  });

  it('a confident wrong small answer exists: confidence is not correctness', () => {
    const wrongSure = run({ threshold: 0 }).rows.filter(r => !r.pass && r.confidence >= 0.8);
    expect(wrongSure.length).toBeGreaterThan(0);
  });

  it('all-large passes the gate; a routed policy also passes at lower cost (chapter 6)', () => {
    expect(gate(ALL_LARGE).ship).toBe(true);
    const t = cheapestShipping();
    expect(t).not.toBeNull();
    expect(gate({ threshold: t! }).ship).toBe(true);
    expect(run({ threshold: t! }).cost).toBeLessThan(run(ALL_LARGE).cost);
    expect(gate(ALL_SMALL, GATE).ship).toBe(false);
  });
});

describe('facts', () => {
  it('every fact has a claim and an https source', () => {
    for (const f of FACTS) { expect(f.claim.trim()).not.toBe(''); expect(f.source).toMatch(/^https:\/\//); }
  });
});
