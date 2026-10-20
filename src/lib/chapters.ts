import type { BlockType } from './iso/blocks';

export interface Chapter {
  id: string;
  title: string;
  short: string;
  unlocks: BlockType[];   // canvas blocks this chapter adds to the track
}

export const CHAPTERS: Chapter[] = [
  { id: '01-history', title: 'How RAG came to be', short: 'History', unlocks: [] },
  { id: '02-why-not-stuff-it', title: 'Why not stuff it all in the prompt?', short: 'Why not stuff it', unlocks: [] },
  { id: '03-what-is-rag', title: 'What is RAG?', short: 'What is RAG', unlocks: ['docs', 'retriever', 'llm'] },
  { id: '04-layers', title: 'The layers of a RAG system', short: 'Layers', unlocks: ['chunker', 'embedder', 'index', 'assembler'] },
  { id: '05-accuracy', title: 'Making RAG accurate', short: 'Accuracy', unlocks: ['rewrite', 'reranker', 'grader'] },
  { id: '06-types', title: 'Types of RAG', short: 'Types', unlocks: ['agent', 'graph'] },
  { id: '07-sandbox', title: 'Sandbox', short: 'Sandbox', unlocks: [] },
];

export const chapterHref = (id: string) => `/rag/${id}/`;

/** Link to the chapter after `id`, or undefined on the last one. */
export function nextOf(id: string): { href: string; title: string } | undefined {
  const next = CHAPTERS[CHAPTERS.findIndex((c) => c.id === id) + 1];
  return next && { href: chapterHref(next.id), title: next.short };
}
