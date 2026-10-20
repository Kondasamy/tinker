// Title, description and share-image text for every public page, in one place: the page <head> (Meta.astro) and the
// share-image template (src/dev/og.astro) both read from here, so a page and its image never disagree.
import { CHAPTERS } from './chapters';

export interface PageMeta {
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
  og: 'home',
  title: 'Tinker: see how tech works by playing with it',
  description: 'Hand-drawn, interactive explanations of tech concepts. Build the thing, break it, fix it. By Kondasamy Jayaraman.',
  kicker: 'Tinker',
  headline: 'See how tech works by playing with it.',
  sub: 'Hand-drawn, interactive explanations of tech concepts.',
};

export const RAG: PageMeta = {
  og: 'rag',
  title: 'RAG: how AI assistants answer from your documents · Tinker',
  description: 'A hands-on, visual course on Retrieval-Augmented Generation: how AI assistants answer from your own documents, why they go wrong, and how to fix them.',
  kicker: 'Tinker · Module 1',
  headline: 'How AI assistants answer from your company’s documents',
  sub: `Retrieval-Augmented Generation, in ${CHAPTERS.length} playable chapters.`,
};

export const chapterMeta = (id: string): PageMeta => {
  const i = CHAPTERS.findIndex(c => c.id === id), c = CHAPTERS[i];
  if (!c) return RAG;   // dev fixtures borrow the module's card
  return { og: c.id, title: `${c.title} · RAG · Tinker`, description: c.intro.goal, kicker: `RAG · Chapter ${i + 1} of ${CHAPTERS.length}`, headline: c.title, sub: c.intro.goal };
};

export const ALL_PAGES: PageMeta[] = [HOME, RAG, ...CHAPTERS.map(c => chapterMeta(c.id))];
