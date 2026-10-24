import { describe, it, expect } from 'vitest';
import { MODULES, moduleOf, chapterHref, nextOf } from '../../src/lib/modules';
import { ALL_PAGES, HOME, RAG, TOOL_CALLING, chapterMeta } from '../../src/lib/pages';
import { FACTS, ACCESSED, fact } from '../../src/lib/tools/facts';
import { PROTOCOL_VERSION } from '../../src/lib/tools/server';

// RAG's chapter ids are a contract with every reader's saved progress (R3): never rename them.
const RAG_CHAPTERS = [
  ['01-history', 'How RAG came to be'],
  ['02-why-not-stuff-it', 'Why not stuff it all in the prompt?'],
  ['03-what-is-rag', 'What is RAG?'],
  ['04-layers', 'The layers of a RAG system'],
  ['05-accuracy', 'Making RAG accurate'],
  ['06-types', 'Types of RAG'],
  ['07-sandbox', 'Sandbox'],
];

// the roadmap (docs/plans/2026-10-24-1806-feat-eight-new-modules-plan.md): the eight modules in go-live order (KTD1),
// then the seven cards no module plan has taken up yet (R17)
const ROADMAP: [string, string][] = [
  ['pre-training', 'Intermediate'],
  ['post-training', 'Advanced'],
  ['interpretability', 'Advanced'],
  ['caching', 'Beginner'],
  ['databases', 'Beginner'],
  ['consistency', 'Advanced'],
  ['ab-testing', 'Beginner'],
  ['diffusion', 'Intermediate'],
  ['diffusion-llms', 'Advanced'],
  ['computer-use', 'Advanced'],
  ['calibration', 'Intermediate'],
  ['search', 'Beginner'],
  ['web-requests', 'Beginner'],
  ['payments', 'Beginner'],
  ['git', 'Beginner'],
];
/** true when every id in `ids` is in `list`, in the list's order */
const inOrder = (ids: string[], list: string[]) => {
  let at = 0;
  return ids.every(id => (at = list.indexOf(id, at) + 1) > 0);
};

describe('module registry', () => {
  it('keeps RAG’s 7 chapters, ids and titles', () => {
    expect(moduleOf('rag').chapters.map(c => [c.id, c.title])).toEqual(RAG_CHAPTERS);
  });

  it('gives every module a level, and RAG is a live Beginner module', () => {
    expect(moduleOf('rag')).toMatchObject({ level: 'Beginner', status: 'live' });
    for (const m of MODULES) expect(['Beginner', 'Intermediate', 'Advanced']).toContain(m.level);
  });

  it('has what is left of the roadmap as planned cards, in build order, each at its level with no chapters and no prereqs', () => {
    const planned = MODULES.filter(m => m.status === 'planned');
    expect(
      inOrder(
        planned.map(m => m.id),
        ROADMAP.map(([id]) => id),
      ),
    ).toBe(true);
    for (const m of planned) {
      expect(m.level, m.id).toBe(new Map(ROADMAP).get(m.id));
      expect([m.chapters, m.prereqs], m.id).toEqual([[], []]);
    }
  });

  // the R17 cards stay planned through this plan: only the eight module lines go live
  it('keeps the seven roadmap cards no plan has taken up, last and in order', () => {
    const planned = MODULES.filter(m => m.status === 'planned').map(m => m.id);
    expect(planned.slice(-7)).toEqual(ROADMAP.slice(-7).map(([id]) => id));
  });

  it('says on the home page that Tinker explains how tech works, AI and classic, within 160 characters', () => {
    expect(HOME.description).toMatch(/how tech works/);
    expect(HOME.description).not.toMatch(/how AI works/);
    expect(HOME.description.length).toBeLessThan(160);
  });

  // each go-live removes one roadmap card, so the planned list shrinks but never reorders (KTD14)
  it('accepts the roadmap with any one card gone, and rejects two cards swapped', () => {
    const ids = ROADMAP.map(([id]) => id);
    for (const gone of ids)
      expect(
        inOrder(
          ids.filter(id => id !== gone),
          ids,
        ),
        gone,
      ).toBe(true);
    expect(inOrder([], ids)).toBe(true);
    expect(inOrder([ids[1], ids[0], ...ids.slice(2)], ids)).toBe(false);
    expect(inOrder(['nope'], ids)).toBe(false);
  });

  it('has tool calling as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('tool-calling')).toMatchObject({
      title: 'Tool calling & MCP',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag'],
    });
    expect(moduleOf('tool-calling').author).toEqual(moduleOf('rag').author);
  });

  it('has AI agents as a live Advanced module that recommends tool calling first', () => {
    expect(moduleOf('agents')).toMatchObject({
      title: 'AI agents',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tool-calling'],
    });
    expect(moduleOf('agents').author).toEqual(moduleOf('rag').author);
  });

  it('has evals as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('evals')).toMatchObject({
      title: 'Evals & LLM testing',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag'],
    });
    expect(moduleOf('evals').author).toEqual(moduleOf('rag').author);
  });

  it('has guardrails as a live Intermediate module that recommends Tool calling first', () => {
    expect(moduleOf('guardrails')).toMatchObject({
      title: 'Prompt injection & guardrails',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tool-calling'],
    });
    expect(moduleOf('guardrails').author).toEqual(moduleOf('rag').author);
  });

  it('has tokens as a live Beginner module with no prerequisites, numbered 6 after guardrails', () => {
    expect(moduleOf('tokens')).toMatchObject({
      title: 'Tokens & embeddings',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('tokens').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 6),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens']);
  });

  it('has transformers as a live Advanced module that recommends Tokens first, numbered 7 after tokens', () => {
    expect(moduleOf('transformers')).toMatchObject({
      title: 'Transformer architecture',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('transformers').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 7),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers']);
  });

  it('has context as a live Intermediate module that recommends RAG and Tool calling first, numbered 8 after transformers', () => {
    expect(moduleOf('context')).toMatchObject({
      title: 'Context engineering & memory',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag', 'tool-calling'],
    });
    expect(moduleOf('context').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 8),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context']);
  });

  it('has fine-tuning as a live Advanced module that recommends Evals and Transformers first, numbered 9 after context', () => {
    expect(moduleOf('fine-tuning')).toMatchObject({
      title: 'Fine-tuning vs prompting',
      level: 'Advanced',
      status: 'live',
      prereqs: ['evals', 'transformers'],
    });
    expect(moduleOf('fine-tuning').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 9),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
    ]);
  });

  it('has structured-outputs as a live Intermediate module that recommends Tool calling and Tokens first, numbered 10 after fine-tuning', () => {
    expect(moduleOf('structured-outputs')).toMatchObject({
      title: 'Structured outputs',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tool-calling', 'tokens'],
    });
    expect(moduleOf('structured-outputs').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 10),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
    ]);
  });

  it('has reasoning as a live Intermediate module that recommends Evals first, numbered 11 after structured-outputs', () => {
    expect(moduleOf('reasoning')).toMatchObject({
      title: 'Reasoning models & thinking budgets',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('reasoning').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 11),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
    ]);
  });

  it('has small-models as a live Advanced module that recommends Fine-tuning and Evals first, numbered 12 after reasoning', () => {
    expect(moduleOf('small-models')).toMatchObject({
      title: 'Small models: distillation & routing',
      level: 'Advanced',
      status: 'live',
      prereqs: ['fine-tuning', 'evals'],
    });
    expect(moduleOf('small-models').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 12),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
    ]);
  });

  it('has inference as a live Advanced module that recommends Transformers first, numbered 13 after small-models', () => {
    expect(moduleOf('inference')).toMatchObject({
      title: 'Inference engineering',
      level: 'Advanced',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('inference').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 13),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
    ]);
  });

  it('has observability as a live Intermediate module that recommends Evals first, numbered 14 after inference', () => {
    expect(moduleOf('observability')).toMatchObject({
      title: 'Observability & error analysis',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('observability').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 14),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
      'observability',
    ]);
  });

  it('has sandboxing as a live Advanced module that recommends Agents and Guardrails first, numbered 15 after observability', () => {
    expect(moduleOf('sandboxing')).toMatchObject({
      title: 'Agent sandboxing',
      level: 'Advanced',
      status: 'live',
      prereqs: ['agents', 'guardrails'],
    });
    expect(moduleOf('sandboxing').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 15),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
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
    ]);
  });

  it('has multimodal as a live Intermediate module that recommends Tokens first, numbered 16 after sandboxing', () => {
    expect(moduleOf('multimodal')).toMatchObject({
      title: 'Multimodal models',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('multimodal').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 16),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
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
    ]);
  });

  it('has voice as a live Advanced module that recommends Tool calling and Multimodal first, numbered 17', () => {
    expect(moduleOf('voice')).toMatchObject({
      title: 'Voice agents',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tool-calling', 'multimodal'],
    });
    expect(moduleOf('voice').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 17),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
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
    ]);
  });

  it('has pre-training as a live Intermediate module that recommends Tokens first, numbered 18', () => {
    expect(moduleOf('pre-training')).toMatchObject({
      title: 'Pre-training',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('pre-training').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'pre-training')).toBe(17);
  });

  it('has post-training as a live Advanced module that recommends Fine-tuning and Evals first, numbered 19', () => {
    expect(moduleOf('post-training')).toMatchObject({
      title: 'Post-training',
      level: 'Advanced',
      status: 'live',
      prereqs: ['fine-tuning', 'evals'],
    });
    expect(moduleOf('post-training').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'post-training')).toBe(18);
  });

  it('keeps chapter ids unique within every module', () => {
    for (const m of MODULES) expect(new Set(m.chapters.map(c => c.id)).size, m.id).toBe(m.chapters.length);
  });

  it('throws on an unknown module', () => {
    expect(() => moduleOf('nope')).toThrow();
  });

  it('links chapters per module', () => {
    expect(chapterHref('rag', '03-what-is-rag')).toBe('/rag/03-what-is-rag/');
    expect(nextOf('rag', '01-history')).toEqual({ href: '/rag/02-why-not-stuff-it/', title: 'Why not stuff it' });
    expect(nextOf('rag', '07-sandbox')).toBeUndefined();
  });
});

describe('page meta', () => {
  it('keeps every RAG share image name', () => {
    expect(ALL_PAGES.map(p => p.og).slice(0, 10)).toEqual([
      'home',
      'rag',
      ...RAG_CHAPTERS.map(([id]) => id),
      'rag-recap',
    ]);
    expect(ALL_PAGES).toContain(TOOL_CALLING);
    expect(TOOL_CALLING).toMatchObject({ path: '/tool-calling/', og: 'tool-calling' });
  });

  it('gives every page a path and its own share image', () => {
    expect(ALL_PAGES.map(p => p.path).slice(0, 10)).toEqual([
      '/',
      '/rag/',
      ...RAG_CHAPTERS.map(([id]) => `/rag/${id}/`),
      '/rag/recap/',
    ]);
    expect(new Set(ALL_PAGES.map(p => p.path)).size).toBe(ALL_PAGES.length);
    expect(new Set(ALL_PAGES.map(p => p.og)).size).toBe(ALL_PAGES.length);
  });

  it('numbers chapters from the registry, and dev fixtures borrow the module card', () => {
    expect(chapterMeta('rag', '03-what-is-rag')).toMatchObject({
      kicker: 'RAG · Chapter 3 of 7',
      title: 'What is RAG? · RAG · Tinker',
    });
    expect(chapterMeta('rag', 'dev-runner')).toBe(RAG);
    expect(HOME.path).toBe('/');
  });
});

describe('every module’s facts', () => {
  const files = import.meta.glob<{ accessed: string; facts: { id: string; source: string; accessed?: string }[] }>(
    '../../data/*/facts.json',
    { eager: true, import: 'default' },
  );
  it('are sourced, and a fact re-checked on its own is dated no earlier than its file', () => {
    expect(Object.keys(files).length).toBeGreaterThan(10);
    for (const [path, d] of Object.entries(files)) {
      expect(d.accessed, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const f of d.facts) {
        expect(new URL(f.source).protocol, `${path} ${f.id}`).toBe('https:');
        if (f.accessed === undefined) continue;
        expect(f.accessed, `${path} ${f.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.accessed >= d.accessed, `${path} ${f.id}`).toBe(true);
      }
    }
  });
});

describe('tool-calling facts (R22)', () => {
  it("gives every fact a claim, a source URL and an access date no earlier than the file's", () => {
    expect(ACCESSED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FACTS.length).toBeGreaterThan(0);
    expect(new Set(FACTS.map(f => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim, f.id).not.toBe('');
      expect(new URL(f.source).protocol, f.id).toBe('https:');
      // a fact re-checked on its own carries a later date than the file's
      expect(fact(f.id).accessed, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fact(f.id).accessed >= ACCESSED, f.id).toBe(true);
    }
  });

  it('the MCP server model speaks the version the facts record', () => {
    expect(PROTOCOL_VERSION).toBe(fact('mcp-version').value);
  });

  it('throws on an unknown fact', () => {
    expect(() => fact('nope')).toThrow();
  });
});
