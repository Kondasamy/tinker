// Fine-tuning chapters 1–4 (U20): every outcome the copy reveals is read off live generation, computed counts or live
// grading, and lands on the option the chapter's reveal expects.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAdapter, parseModel, type Meta } from '../../src/lib/lm/load';
import { fullCount, gradeVersion, loraCount, replyOf, signsOff, STYLE_PROMPTS } from '../../src/lib/fine-tuning/engine';
import { MODULES } from '../../src/lib/modules';
import { QUESTION } from '../../src/content/fine-tuning/01-three-ways';
import { FULL, LORA, SHARE, shareOption } from '../../src/content/fine-tuning/03-small-adapters';
import { outcome as priceOutcome } from '../../src/content/fine-tuning/04-facts-move-style-stays';

const disk = (f: string) => { const b = readFileSync('public/data/lm/' + f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const meta = JSON.parse(readFileSync('public/data/lm/meta.json', 'utf8')) as Meta;
const base = parseModel(meta, disk('model.bin'));
const full = parseModel(meta, disk('finetuned.bin'), 'finetuned.bin');
const lora = { ...base, adapter: parseAdapter(meta, disk('lora.bin')) };

describe('the registry entry', () => {
  it('is an Advanced module after Evals and Transformers, with seven chapters each opening with context', () => {
    const m = MODULES.find(x => x.id === 'fine-tuning')!;
    expect(m).toMatchObject({ level: 'Advanced', status: 'live', prereqs: ['evals', 'transformers'] });
    expect(m.chapters).toHaveLength(7);
    for (const c of m.chapters) expect(c.intro.learn).toHaveLength(3);
    const terms = m.chapters.flatMap(c => c.intro.terms.map(([t]) => t));
    for (const t of ['Weights', 'Fine-tuning', 'LoRA', 'Adapter', 'Base model']) expect(terms).toContain(t);
  });
});

describe('chapter 1: three versions, one question', () => {
  it('asks a question the prompt alone gets wrong and documents and weights get right, and all three sign off', () => {
    expect(gradeVersion('prompted', [QUESTION])[0].fact).toBe(false);
    expect(gradeVersion('rag', [QUESTION])[0].fact).toBe(true);
    expect(gradeVersion('finetuned', [QUESTION])[0].fact).toBe(true);
    for (const v of ['prompted', 'rag', 'finetuned'] as const) expect(gradeVersion(v, [QUESTION])[0].signed).toBe(true);
  });
});

describe('chapter 2: before and after, generated live', () => {
  it.each(STYLE_PROMPTS)('on "%s" the base never signs off and the fine-tuned copy does, the same every time', (p) => {
    expect(signsOff(replyOf(base, p))).toBe(false);
    expect(signsOff(replyOf(full, p))).toBe(true);
    expect(replyOf(full, p)).toBe(replyOf(full, p));
    // the reply is cut where the answer ends: no next question tacked on
    expect(replyOf(full, p)).not.toMatch(/Q:/);
  });
});

describe('chapter 3: counts from shapes', () => {
  it('shows the computed full and LoRA counts, and the share lands in its option', () => {
    expect(FULL).toBe(fullCount(meta));
    expect(LORA).toBe(loraCount(meta));
    expect(SHARE).toBeCloseTo(loraCount(meta) / fullCount(meta), 12);
    expect(shareOption(SHARE)).toBe(2);   // between 1% and 10%
    expect([0.3, 0.1, 0.05, 0.001].map(shareOption)).toEqual([0, 1, 2, 3]);
  });
  it('the adapter teaches the sign-off on the chapter prompt', () => {
    expect(signsOff(replyOf(lora, STYLE_PROMPTS[0]))).toBe(true);
  });
});

describe('chapter 4: the changed price', () => {
  it('reveals fine-tuned old, RAG new, from the key-fact check', () => {
    expect(priceOutcome()).toBe(1);
  });
});
