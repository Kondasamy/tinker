// Copy budgets (picture-first chapters, R5): short steps and a short opening, so the picture carries the story.
// Every live module is checked; a module on PENDING only reports until its copy pass, RAG is always strict.
import { describe, expect, it } from 'vitest';
import { MODULES } from '../../src/lib/modules';
import { unmarked } from '../../src/components/story/terms';
import type { Step } from '../../src/components/story/steps';

const BUDGET = { narration: 25, story: 30, goal: 20, learn: 3, say: 5, sayChars: 16, opening: 62 };
// opening: story + question + step 1, leaving about 18 words for the labels inside the 80-word first screen
// sayChars: callouts outside RAG fit a phone's pill, so phones never drop them (RAG's canvas drops longer ones).
// Modules whose copy predates the budgets; remove an id when its copy pass lands.
const PENDING = [
  'tokens',
  'transformers',
  'context',
  'fine-tuning',
  'structured-outputs',
  'reasoning',
  'small-models',
  'inference',
  'observability',
  'sandboxing',
  'multimodal',
  'voice',
];

const files = import.meta.glob<Record<string, unknown>>('../../src/content/*/[0-9]*.tsx', { eager: true });
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(Boolean).length;
const live = MODULES.filter(m => m.chapters.length > 0);

/** Every way a chapter's copy can go over budget, as readable lines. */
function overruns(moduleId: string) {
  const m = live.find(x => x.id === moduleId)!;
  const out: string[] = [];
  for (const ch of m.chapters) {
    const mod = files[`../../src/content/${m.id}/${ch.id}.tsx`];
    if (!mod) throw new Error(`${m.id}/${ch.id}: no chapter file`);
    const steps = mod.STEPS as Step<unknown>[] | undefined;
    if (!steps) throw new Error(`${m.id}/${ch.id}: no STEPS export`);
    const at = `${m.id}/${ch.id}`;
    const { story, goal, learn, terms } = ch.intro;
    if (words(story) > BUDGET.story) out.push(`${at} story: ${words(story)} words`);
    if (words(goal) > BUDGET.goal) out.push(`${at} question: ${words(goal)} words`);
    if (learn.length > BUDGET.learn) out.push(`${at} learn: ${learn.length} items`);
    const step = (s: Step<unknown>) => words(s.narration) + words(s.act ?? '');
    const opening = words(story) + words(goal) + step(steps[0]);
    if (opening > BUDGET.opening) out.push(`${at} opening: ${opening} words`);
    for (const s of steps) {
      if (step(s) > BUDGET.narration) out.push(`${at} step ${s.id}: ${step(s)} words`);
      if (s.say && words(s.say.text) > BUDGET.say) out.push(`${at} step ${s.id} callout: ${words(s.say.text)} words`);
      if (s.say && m.id !== 'rag' && s.say.text.length > BUDGET.sayChars)
        out.push(`${at} step ${s.id} callout: ${s.say.text.length} characters`);
    }
    for (const q of Object.values(mod))
      if (q && typeof q === 'object' && Array.isArray((q as { why?: unknown }).why))
        for (const [i, w] of (q as { why: string[] }).why.entries())
          if (sentences(w) > 1) out.push(`${at} quiz why ${i + 1}: ${sentences(w)} sentences`);
    for (const t of unmarked(
      steps.flatMap(s => [s.narration, s.act ?? '']),
      terms,
    ))
      out.push(`${at} term never in narration: ${t}`);
  }
  return out;
}

describe('copy budgets', () => {
  it('PENDING names only live modules, and never RAG', () => {
    const ids = live.map(m => m.id);
    for (const p of PENDING) expect(ids, p).toContain(p);
    expect(PENDING).not.toContain('rag');
  });

  // STRICT=<id> holds one pending module to the budgets without editing PENDING (a copy pass's to-do list)
  const strict = process.env.STRICT;
  for (const m of live)
    it(`${m.id}${PENDING.includes(m.id) && m.id !== strict ? ' (pending, report only)' : ''}`, () => {
      const over = overruns(m.id);
      if (PENDING.includes(m.id) && m.id !== strict) {
        if (over.length) console.info(`${m.id}: ${over.length} over budget`);
        return;
      }
      expect(over).toEqual([]);
    });
});
