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

describe('module registry', () => {
  it('keeps RAG’s 7 chapters, ids and titles', () => {
    expect(moduleOf('rag').chapters.map(c => [c.id, c.title])).toEqual(RAG_CHAPTERS);
  });

  it('gives every module a level, and RAG is a live Beginner module', () => {
    expect(moduleOf('rag')).toMatchObject({ level: 'Beginner', status: 'live' });
    for (const m of MODULES) expect(['Beginner', 'Intermediate', 'Advanced']).toContain(m.level);
  });

  it('lists the planned modules without chapters', () => {
    const planned = MODULES.filter(m => m.status === 'planned').map(m => [m.title, m.level, m.chapters.length]);
    expect(planned).toEqual([['Tokens & embeddings', 'Beginner', 0], ['Transformer architecture', 'Advanced', 0],
      ['Evals & LLM testing', 'Intermediate', 0], ['Prompt injection & guardrails', 'Intermediate', 0],
      ['Context engineering & memory', 'Intermediate', 0], ['Fine-tuning vs prompting', 'Advanced', 0]]);
  });

  it('has tool calling as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('tool-calling')).toMatchObject({ title: 'Tool calling & MCP', level: 'Intermediate', status: 'live', prereqs: ['rag'] });
    expect(moduleOf('tool-calling').author).toEqual(moduleOf('rag').author);
  });

  it('has AI agents as a live Advanced module that recommends tool calling first', () => {
    expect(moduleOf('agents')).toMatchObject({ title: 'AI agents', level: 'Advanced', status: 'live', prereqs: ['tool-calling'] });
    expect(moduleOf('agents').author).toEqual(moduleOf('rag').author);
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
