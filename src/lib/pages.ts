// Title, description and share-image text for every public page, in one place: the page <head> (Meta.astro) and the
// share-image template (src/dev/og.astro) both read from here, so a page and its image never disagree.
import { MODULES, moduleOf, chapterHref, moduleNumber } from './modules';

export interface PageMeta {
  /** where the page is served */
  path: string;
  /** share image file: public/og/<og>.jpg */
  og: string;
  /** <title> and og:title */
  title: string;
  description: string;
  /** keep the page out of search results and the sitemap (a recap is empty until the reader has played) */
  noindex?: boolean;
  /** share image: small line above the headline, the headline, and the line under it */
  kicker: string;
  headline: string;
  sub: string;
}

export const HOME: PageMeta = {
  path: '/',
  og: 'home',
  title: 'Tinker: see how tech works by playing with it',
  description:
    'Free, hand-drawn, interactive explanations of how tech works, from RAG, agents and transformers to caching and databases. Build it, break it, fix it.',
  kicker: 'Tinker',
  headline: 'See how tech works by playing with it.',
  sub: `Hand-drawn, interactive explanations of tech concepts: ${MODULES.filter(m => m.status === 'live').length} modules to play${MODULES.some(m => m.status === 'planned') ? ', more on the way' : ''}.`,
};

export const RAG: PageMeta = {
  path: '/rag/',
  og: 'rag',
  title: 'RAG: how AI assistants answer from your documents · Tinker',
  description:
    'A hands-on, visual course on Retrieval-Augmented Generation: how AI assistants answer from your own documents, why they go wrong, and how to fix them.',
  kicker: 'Tinker · Module 1',
  headline: 'How AI assistants answer from your company’s documents',
  sub: `Retrieval-Augmented Generation, in ${moduleOf('rag').chapters.length} playable chapters.`,
};

export const TOOL_CALLING: PageMeta = {
  path: '/tool-calling/',
  og: 'tool-calling',
  title: 'Tool calling & MCP: how AI assistants take action · Tinker',
  description:
    'A hands-on, visual course on tool calling and the Model Context Protocol (MCP): how an AI assistant checks an order or issues a refund, and how to keep it safe.',
  kicker: 'Tinker · Module 2',
  headline: 'How AI assistants go from answering to acting',
  sub: 'Tool calling and the Model Context Protocol (MCP), played at Larkspur Supply Co.',
};

export const AGENTS: PageMeta = {
  path: '/agents/',
  og: 'agents',
  title: 'AI agents: how an assistant works a whole case · Tinker',
  description:
    'A hands-on, visual course on AI agents: when the model should pick its own steps, and the loop, plans, budgets, memory and helpers that keep it in bounds.',
  kicker: 'Tinker · Module 3',
  headline: 'How an AI assistant works a whole case',
  sub: 'Workflows, agents and the loop between them, played at Larkspur Supply Co.',
};

/** search results cut descriptions near 160 characters: add the tail only while it fits */
const withRoom = (text: string, tail: string) => ((text + tail).length <= 160 ? text + tail : text);

export const chapterMeta = (module: string, id: string): PageMeta => {
  const m = moduleOf(module),
    i = m.chapters.findIndex(c => c.id === id),
    c = m.chapters[i];
  if (!c) return RAG; // dev fixtures borrow the module's card
  return {
    path: chapterHref(m.id, c.id),
    og: c.og ?? `${m.id}-${c.id}`,
    title: `${c.title} · ${m.title} · Tinker`,
    description: withRoom(c.intro.goal, ` A playable chapter of ${m.title} on Tinker.`),
    kicker: `${m.title} · Chapter ${i + 1} of ${m.chapters.length}`,
    headline: c.title,
    sub: c.intro.goal,
  };
};

/** A module's recap page (`/<module>/recap/`); its share image is `<module>-recap` (KTD5). */
export const recapMeta = (module: string): PageMeta => {
  const m = moduleOf(module);
  return {
    path: `/${m.id}/recap/`,
    og: `${m.id}-recap`,
    noindex: true,
    title: `${m.title} recap: what do you remember? · Tinker`,
    description: `Recall questions from the ${m.title} chapters you have finished, one at a time, with why each answer is right or wrong.`,
    kicker: `${m.title} · Recap`,
    headline: `What do you remember about ${m.title}?`,
    sub: 'Questions from the chapters you have finished, one at a time.',
  };
};

/** A module's intro page (`/<module>/`): its own card where one is written above, else one from the registry entry. */
export const introMeta = (module: string): PageMeta => {
  const m = moduleOf(module);
  return (
    ({ rag: RAG, 'tool-calling': TOOL_CALLING, agents: AGENTS } as Record<string, PageMeta>)[m.id] ?? {
      path: `/${m.id}/`,
      og: m.id,
      title: `${m.title} · Tinker`,
      description: m.description,
      kicker: `Tinker · Module ${moduleNumber(m)}`,
      headline: m.title,
      sub: m.description,
    }
  );
};

/** Every public page: home, then each live module's intro, chapters and recap, in registry order. */
export const ALL_PAGES: PageMeta[] = [
  HOME,
  ...MODULES.filter(m => m.status === 'live').flatMap(m => [
    introMeta(m.id),
    ...m.chapters.map(c => chapterMeta(m.id, c.id)),
    recapMeta(m.id),
  ]),
];
