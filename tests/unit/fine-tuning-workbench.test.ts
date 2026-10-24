// Fine-tuning chapters 5–7 (U21): forgetting scored live from the held-out copy, the gate's outcome from Evals' decide,
// and the workbench: every plan in the domain gets totals, and the puzzle accepts every plan tied for the best score.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/lm/model';
import { parseAdapter, parseModel, type Meta } from '../../src/lib/lm/load';
import {
  gateVersion,
  gradeVersion,
  HELDOUT,
  heldoutScore,
  QUESTION_IDS,
  VERSION_IDS,
} from '../../src/lib/fine-tuning/engine';
import {
  BEST,
  KINDS,
  NOTES,
  PLANS,
  QUALITY,
  WINNERS,
  solved,
  totals,
  type Plan,
} from '../../src/lib/fine-tuning/workbench';
import { forgetOutcome, P1 as FORGET, STEPS as CH5 } from '../../src/content/fine-tuning/05-what-training-costs';
import { GATE, gateOutcome } from '../../src/content/fine-tuning/06-measure-before-you-train';
import { START, STEPS, VOICE_TIE, planOf } from '../../src/content/fine-tuning/07-larkspurs-decision';
import IDS from '../../data/lm/ids.json' with { type: 'json' };

const disk = (f: string) => {
  const b = readFileSync('public/data/lm/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin'));
const full = parseModel(meta, disk('finetuned.bin'), 'finetuned.bin');
const lora = { ...base, adapter: parseAdapter(meta, disk('lora.bin')) };

describe('chapter 5: forgetting, scored live', () => {
  it("the bundled held-out copy is data/lm/ids.json's held-out split", () => {
    expect(HELDOUT).toEqual(IDS.splits.heldout);
  });
  it('scores each set of weights as evaluate does, once per model', () => {
    expect(heldoutScore(full)).toEqual(evaluate(full, IDS.splits.heldout.ids));
    expect(heldoutScore(full)).toBe(heldoutScore(full));
  });
  it('reveals the full fine-tune forgetting most, and the rises the review held (+1.24 full, +0.63 LoRA)', () => {
    const [b, f, l] = [base, full, lora].map(m => heldoutScore(m).loss);
    expect(forgetOutcome(b, f, l)).toBe(0);
    expect((f - b).toFixed(2)).toBe('1.24');
    expect((l - b).toFixed(2)).toBe('0.63');
    expect([forgetOutcome(4, 4.5, 5), forgetOutcome(4, 3.9, 4)]).toEqual([1, 2]);
  });
  it('asks which rises more, so the computed outcome is the only true option', () => {
    const [b, f, l] = [base, full, lora].map(m => heldoutScore(m).loss);
    expect(FORGET.question).toMatch(/Which one’s held-out loss rises more over the base model\?$/);
    expect(FORGET.options[forgetOutcome(b, f, l)]).toMatch(/^The full fine-tune/);
    expect(FORGET.options[2]).toMatch(/^Neither: neither one gets worse/);
    // both rise, and the narration after the reveal says so
    expect(f > b && l > b).toBe(true);
    expect(CH5.find(s => s.id === 'quiz')!.narration).toMatch(/^Both fine-tunes predict/);
  });
});

describe('chapter 6: the release gate', () => {
  it('holds back both candidates against RAG, as the reveal says', () => {
    expect(gateOutcome()).toBe(3);
    expect(gateVersion('rag', GATE).ship).toBe(true);
  });
});

describe('chapter 7: the workbench', () => {
  it('the domain is every assignment of a version to each kind', () => {
    expect(PLANS).toHaveLength(VERSION_IDS.length ** KINDS.length);
    expect(new Set(PLANS.map(p => JSON.stringify(p))).size).toBe(PLANS.length);
  });

  it('every plan yields finite totals that add up from its rows', () => {
    for (const p of PLANS) {
      const t = totals(p);
      expect(t.rows).toHaveLength(KINDS.length);
      for (const r of t.rows) {
        expect(r.quality).toBeGreaterThanOrEqual(0);
        expect(r.quality).toBeLessThanOrEqual(QUALITY);
        expect(r.score).toBeCloseTo(r.quality - r.cost - r.upkeep, 9);
        expect(r.note.costWhy && r.note.upkeepWhy).toBeTruthy();
      }
      expect(Number.isFinite(t.score)).toBe(true);
      expect(t.score).toBeCloseTo(t.quality - t.cost - t.upkeep, 9);
    }
  });

  it('the puzzle accepts every plan tied for the best score, and no other', () => {
    for (const p of PLANS) expect(solved(p)).toBe(Math.abs(totals(p).score - BEST) < 1e-9);
    expect(WINNERS.length).toBeGreaterThan(1); // the chapter says more than one plan can be equally good
    const puzzle = STEPS.find(s => s.id === 'plan')!;
    const st = (p: Plan) => ({ ...p, view: 'scene' as const, quiz: null });
    for (const p of PLANS) expect(puzzle.predicate(st(p))).toBe(WINNERS.includes(p));
    expect(puzzle.predicate(puzzle.solution!(st(START)))).toBe(true);
    expect(solved(START)).toBe(false);
  });

  it('the winners send facts that change to the documents, and no-fact replies to the prompt or the fine-tune', () => {
    for (const w of WINNERS) {
      expect(w.changed).toBe('rag');
      expect(w.facts).toBe('rag');
    }
    expect(new Set(WINNERS.map(w => w.voice))).toEqual(new Set(['prompted', 'finetuned']));
  });

  it('a saved plan missing a kind, or naming an unknown version, reads as START for that kind instead of throwing', () => {
    expect(planOf({ voice: 'prompted' })).toEqual({ ...START, voice: 'prompted' });
    expect(planOf({ ...WINNERS[0], facts: 'gone' as never })).toEqual({ ...WINNERS[0], facts: START.facts });
    expect(() => totals(planOf({}))).not.toThrow();
    for (const p of PLANS) expect(planOf(p)).toEqual(p);
  });

  it('every version signs off on every question, as chapters 6 and 7 and the recall bank say; the fine-tune passes fewer facts than RAG', () => {
    for (const v of VERSION_IDS)
      expect(
        gradeVersion(v).every(g => g.signed),
        v,
      ).toBe(true);
    const facts = (v: (typeof VERSION_IDS)[number]) => gradeVersion(v, QUESTION_IDS).filter(g => g.fact).length;
    expect(facts('finetuned')).toBeLessThan(facts('rag'));
  });

  it('the voice row ties on quality by construction, and the narration says the team’s own notes decide it', () => {
    expect(VOICE_TIE).toBe(true);
    const ties = STEPS.find(s => s.id === 'ties')!.narration;
    expect(ties).toMatch(/No-fact replies tie, so the team’s own notes decide/);
    expect(STEPS.find(s => s.id === 'plan')!.narration).toMatch(/the team’s own notes, not measured facts/);
  });

  it('every version has a cost and upkeep note for every kind', () => {
    for (const v of VERSION_IDS) for (const k of KINDS) expect(NOTES[v][k.id]).toBeDefined();
  });
});
