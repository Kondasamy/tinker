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

// the AI engineering roadmap in build order (docs/plans/2026-10-21-1521-feat-ai-engineering-roadmap-plan.md)
const ROADMAP: [string, string][] = [
  ['structured-outputs', 'Intermediate'],
  ['reasoning', 'Intermediate'],
  ['small-models', 'Advanced'],
  ['inference', 'Advanced'],
  ['observability', 'Intermediate'],
  ['sandboxing', 'Advanced'],
  ['multimodal', 'Intermediate'],
  ['voice', 'Advanced'],
];
/** true when every id in `ids` is in `list`, in the list's order */
const inOrder = (ids: string[], list: string[]) => { let at = 0; return ids.every(id => (at = list.indexOf(id, at) + 1) > 0); };

describe('module registry', () => {
  it('keeps RAG’s 7 chapters, ids and titles', () => {
    expect(moduleOf('rag').chapters.map(c => [c.id, c.title])).toEqual(RAG_CHAPTERS);
  });

  it('gives every module a level, and RAG is a live Beginner module', () => {
    expect(moduleOf('rag')).toMatchObject({ level: 'Beginner', status: 'live' });
    for (const m of MODULES) expect(['Beginner', 'Intermediate', 'Advanced']).toContain(m.level);
  });

  it('has what is left of the AI engineering roadmap as planned cards, in build order, each at its level with no chapters and no prereqs', () => {
    const planned = MODULES.filter(m => m.status === 'planned');
    expect(inOrder(planned.map(m => m.id), ROADMAP.map(([id]) => id))).toBe(true);
    for (const m of planned) {
      expect(m.level, m.id).toBe(new Map(ROADMAP).get(m.id));
      expect([m.chapters, m.prereqs], m.id).toEqual([[], []]);
    }
  });

  // each go-live removes one roadmap card, so the planned list shrinks but never reorders (KTD14)
  it('accepts the roadmap with any one card gone, and rejects two cards swapped', () => {
    const ids = ROADMAP.map(([id]) => id);
    for (const gone of ids) expect(inOrder(ids.filter(id => id !== gone), ids), gone).toBe(true);
    expect(inOrder([], ids)).toBe(true);
    expect(inOrder([ids[1], ids[0], ...ids.slice(2)], ids)).toBe(false);
    expect(inOrder(['nope'], ids)).toBe(false);
  });

  it('has tool calling as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('tool-calling')).toMatchObject({ title: 'Tool calling & MCP', level: 'Intermediate', status: 'live', prereqs: ['rag'] });
    expect(moduleOf('tool-calling').author).toEqual(moduleOf('rag').author);
  });

  it('has AI agents as a live Advanced module that recommends tool calling first', () => {
    expect(moduleOf('agents')).toMatchObject({ title: 'AI agents', level: 'Advanced', status: 'live', prereqs: ['tool-calling'] });
    expect(moduleOf('agents').author).toEqual(moduleOf('rag').author);
  });

  it('has evals as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('evals')).toMatchObject({ title: 'Evals & LLM testing', level: 'Intermediate', status: 'live', prereqs: ['rag'] });
    expect(moduleOf('evals').author).toEqual(moduleOf('rag').author);
  });

  it('has guardrails as a live Intermediate module that recommends Tool calling first', () => {
    expect(moduleOf('guardrails')).toMatchObject({ title: 'Prompt injection & guardrails', level: 'Intermediate', status: 'live', prereqs: ['tool-calling'] });
    expect(moduleOf('guardrails').author).toEqual(moduleOf('rag').author);
  });

  it('has tokens as a live Beginner module with no prerequisites, numbered 6 after guardrails', () => {
    expect(moduleOf('tokens')).toMatchObject({ title: 'Tokens & embeddings', level: 'Beginner', status: 'live', prereqs: [] });
    expect(moduleOf('tokens').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 6)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens']);
  });

  it('has transformers as a live Advanced module that recommends Tokens first, numbered 7 after tokens', () => {
    expect(moduleOf('transformers')).toMatchObject({ title: 'Transformer architecture', level: 'Advanced', status: 'live', prereqs: ['tokens'] });
    expect(moduleOf('transformers').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 7)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers']);
  });

  it('has context as a live Intermediate module that recommends RAG and Tool calling first, numbered 8 after transformers', () => {
    expect(moduleOf('context')).toMatchObject({ title: 'Context engineering & memory', level: 'Intermediate', status: 'live', prereqs: ['rag', 'tool-calling'] });
    expect(moduleOf('context').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 8)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context']);
  });

  it('has fine-tuning as a live Advanced module that recommends Evals and Transformers first, numbered 9 after context', () => {
    expect(moduleOf('fine-tuning')).toMatchObject({ title: 'Fine-tuning vs prompting', level: 'Advanced', status: 'live', prereqs: ['evals', 'transformers'] });
    expect(moduleOf('fine-tuning').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 9)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning']);
  });

  it('has structured-outputs as a live Intermediate module that recommends Tool calling and Tokens first, numbered 10 after fine-tuning', () => {
    expect(moduleOf('structured-outputs')).toMatchObject({ title: 'Structured outputs', level: 'Intermediate', status: 'live', prereqs: ['tool-calling', 'tokens'] });
    expect(moduleOf('structured-outputs').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 10)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs']);
  });

  it('has reasoning as a live Intermediate module that recommends Evals first, numbered 11 after structured-outputs', () => {
    expect(moduleOf('reasoning')).toMatchObject({ title: 'Reasoning models & thinking budgets', level: 'Intermediate', status: 'live', prereqs: ['evals'] });
    expect(moduleOf('reasoning').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 11)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning']);
  });

  it('has small-models as a live Advanced module that recommends Fine-tuning and Evals first, numbered 12 after reasoning', () => {
    expect(moduleOf('small-models')).toMatchObject({ title: 'Small models: distillation & routing', level: 'Advanced', status: 'live', prereqs: ['fine-tuning', 'evals'] });
    expect(moduleOf('small-models').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 12)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning', 'small-models']);
  });

  it('has inference as a live Advanced module that recommends Transformers first, numbered 13 after small-models', () => {
    expect(moduleOf('inference')).toMatchObject({ title: 'Inference engineering', level: 'Advanced', status: 'live', prereqs: ['transformers'] });
    expect(moduleOf('inference').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 13)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning', 'small-models', 'inference']);
  });

  it('has observability as a live Intermediate module that recommends Evals first, numbered 14 after inference', () => {
    expect(moduleOf('observability')).toMatchObject({ title: 'Observability & error analysis', level: 'Intermediate', status: 'live', prereqs: ['evals'] });
    expect(moduleOf('observability').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 14)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning', 'small-models', 'inference', 'observability']);
  });

  it('has sandboxing as a live Advanced module that recommends Agents and Guardrails first, numbered 15 after observability', () => {
    expect(moduleOf('sandboxing')).toMatchObject({ title: 'Agent sandboxing', level: 'Advanced', status: 'live', prereqs: ['agents', 'guardrails'] });
    expect(moduleOf('sandboxing').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id).slice(0, 15)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning', 'small-models', 'inference', 'observability', 'sandboxing']);
  });

  it('has multimodal as a live Intermediate module that recommends Tokens first, numbered 16 after sandboxing', () => {
    expect(moduleOf('multimodal')).toMatchObject({ title: 'Multimodal models', level: 'Intermediate', status: 'live', prereqs: ['tokens'] });
    expect(moduleOf('multimodal').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').map(m => m.id)).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context', 'fine-tuning', 'structured-outputs', 'reasoning', 'small-models', 'inference', 'observability', 'sandboxing', 'multimodal']);
    expect(MODULES.filter(m => m.status === 'planned').map(m => m.id)).toEqual(['voice']);
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
    expect(ALL_PAGES.map(p => p.og).slice(0, 10)).toEqual(['home', 'rag', ...RAG_CHAPTERS.map(([id]) => id), 'rag-recap']);
    expect(ALL_PAGES).toContain(TOOL_CALLING);
    expect(TOOL_CALLING).toMatchObject({ path: '/tool-calling/', og: 'tool-calling' });
  });

  it('gives every page a path and its own share image', () => {
    expect(ALL_PAGES.map(p => p.path).slice(0, 10)).toEqual(['/', '/rag/', ...RAG_CHAPTERS.map(([id]) => `/rag/${id}/`), '/rag/recap/']);
    expect(new Set(ALL_PAGES.map(p => p.path)).size).toBe(ALL_PAGES.length);
    expect(new Set(ALL_PAGES.map(p => p.og)).size).toBe(ALL_PAGES.length);
  });

  it('numbers chapters from the registry, and dev fixtures borrow the module card', () => {
    expect(chapterMeta('rag', '03-what-is-rag')).toMatchObject({ kicker: 'RAG · Chapter 3 of 7', title: 'What is RAG? · RAG · Tinker' });
    expect(chapterMeta('rag', 'dev-runner')).toBe(RAG);
    expect(HOME.path).toBe('/');
  });
});

describe('tool-calling facts (R22)', () => {
  it('gives every fact a claim, a source URL and the access date', () => {
    expect(ACCESSED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FACTS.length).toBeGreaterThan(0);
    expect(new Set(FACTS.map(f => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim, f.id).not.toBe('');
      expect(new URL(f.source).protocol, f.id).toBe('https:');
      expect(fact(f.id).accessed).toBe(ACCESSED);
    }
  });

  it('the MCP server model speaks the version the facts record', () => {
    expect(PROTOCOL_VERSION).toBe(fact('mcp-version').value);
  });

  it('throws on an unknown fact', () => {
    expect(() => fact('nope')).toThrow();
  });
});
