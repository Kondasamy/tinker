// RAG's chapters, for the RAG-only code (canvas, content files): the list lives in the module registry (KTD1).
import { RAG_MODULE } from '../content/rag/module';
import { chapterHref as href, nextOf as next } from './modules';

export type { RagChapter as Chapter } from '../content/rag/module';
export const CHAPTERS = RAG_MODULE.chapters;
export const chapterHref = (id: string) => href('rag', id);
/** Link to the chapter after `id`, or undefined on the last one. */
export const nextOf = (id: string) => next('rag', id);
