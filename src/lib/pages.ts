// Title, description and share-image text for every public page, in one place: the page <head> (Meta.astro) and the
// share-image template (src/dev/og.astro) both read from here, so a page and its image never disagree.
import { moduleOf, chapterHref } from './modules';

export interface PageMeta {
  /** where the page is served */
  path: string;
  /** share image file: public/og/<og>.jpg */
  og: string;
  /** <title> and og:title */
  title: string;
  description: string;
  /** share image: small line above the headline, the headline, and the line under it */
  kicker: string;
  headline: string;
  sub: string;
}

export const HOME: PageMeta = {
  path: '/',
  og: 'home',
  title: 'Tinker: see how tech works by playing with it',
  description: 'Hand-drawn, interactive explanations of tech concepts. Build the thing, break it, fix it. By Kondasamy Jayaraman.',
  kicker: 'Tinker',
  headline: 'See how tech works by playing with it.',
  sub: 'Hand-drawn, interactive explanations of tech concepts.',
};

export const RAG: PageMeta = {
  path: '/rag/',
  og: 'rag',
  title: 'RAG: how AI assistants answer from your documents · Tinker',
  description: 'A hands-on, visual course on Retrieval-Augmented Generation: how AI assistants answer from your own documents, why they go wrong, and how to fix them.',
  kicker: 'Tinker · Module 1',
  headline: 'How AI assistants answer from your company’s documents',
  sub: `Retrieval-Augmented Generation, in ${moduleOf('rag').chapters.length} playable chapters.`,
};

export const TOOL_CALLING: PageMeta = {
  path: '/tool-calling/',
  og: 'tool-calling',
  title: 'Tool calling & MCP: how AI assistants take action · Tinker',
  description: 'A hands-on, visual course on tool calling and the Model Context Protocol (MCP): how an AI assistant checks an order or issues a refund, and how to keep it safe.',
  kicker: 'Tinker · Module 2',
  headline: 'How AI assistants go from answering to acting',
  sub: 'Tool calling and the Model Context Protocol (MCP), played at Larkspur Supply Co.',
};

export const chapterMeta = (module: string, id: string): PageMeta => {
  const m = moduleOf(module), i = m.chapters.findIndex(c => c.id === id), c = m.chapters[i];
  if (!c) return RAG;   // dev fixtures borrow the module's card
  return {
    path: chapterHref(m.id, c.id), og: c.og ?? `${m.id}-${c.id}`, title: `${c.title} · ${m.title} · Tinker`, description: c.intro.goal,
    kicker: `${m.title} · Chapter ${i + 1} of ${m.chapters.length}`, headline: c.title, sub: c.intro.goal,
  };
};

/** A module's recap page (`/<module>/recap/`); its share image is `<module>-recap` (KTD5). */
export const recapMeta = (module: string): PageMeta => {
  const m = moduleOf(module);
  return {
    path: `/${m.id}/recap/`, og: `${m.id}-recap`, title: `${m.title} recap: what do you remember? · Tinker`,
    description: `Recall questions from the ${m.title} chapters you have finished, one at a time, with why each answer is right or wrong.`,
    kicker: `${m.title} · Recap`, headline: `What do you remember about ${m.title}?`,
    sub: 'Questions from the chapters you have finished, one at a time.',
  };
};

const chapters = (module: string) => moduleOf(module).chapters.map(c => chapterMeta(module, c.id));
export const ALL_PAGES: PageMeta[] = [HOME, RAG, ...chapters('rag'), recapMeta('rag'), TOOL_CALLING, ...chapters('tool-calling')];
