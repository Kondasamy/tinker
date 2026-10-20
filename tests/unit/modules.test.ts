import { describe, it, expect } from 'vitest';
import { MODULES, moduleOf, chapterHref, nextOf } from '../../src/lib/modules';
import { ALL_PAGES, HOME, RAG, chapterMeta } from '../../src/lib/pages';

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
    expect(planned).toEqual([['Tokens & embeddings', 'Beginner', 0], ['Transformer architecture', 'Advanced', 0], ['AI agents', 'Advanced', 0]]);
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
    expect(ALL_PAGES.map(p => p.og)).toEqual(['home', 'rag', ...RAG_CHAPTERS.map(([id]) => id)]);
  });

  it('gives every page a path and its own share image', () => {
    expect(ALL_PAGES.map(p => p.path)).toEqual(['/', '/rag/', ...RAG_CHAPTERS.map(([id]) => `/rag/${id}/`)]);
    expect(new Set(ALL_PAGES.map(p => p.og)).size).toBe(ALL_PAGES.length);
  });

  it('numbers chapters from the registry, and dev fixtures borrow the module card', () => {
    expect(chapterMeta('rag', '03-what-is-rag')).toMatchObject({ kicker: 'RAG · Chapter 3 of 7', title: 'What is RAG? · RAG · Tinker' });
    expect(chapterMeta('rag', 'dev-runner')).toBe(RAG);
    expect(HOME.path).toBe('/');
  });
});
