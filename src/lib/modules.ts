// The module registry (KTD1): every module, live or planned. Pages, navigation, share images and checks read from here.
import { RAG_MODULE } from '../content/rag/module';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Chapter {
  id: string;
  title: string;
  short: string;
  /** share image name; defaults to `<module>-<chapter>` (KTD5) */
  og?: string;
  /** step ids before runs were signed; an unsigned saved run resumes only while they still match (KTD4) */
  legacySteps?: string[];
  /** Context the chapter opens with, before its first step. */
  intro: {
    /** where the story stands as the chapter opens */
    story: string;
    /** the question this chapter answers */
    goal: string;
    learn: string[];
    terms: [term: string, meaning: string][];
  };
}

export interface Module<C extends Chapter = Chapter> {
  id: string;
  title: string;
  description: string;
  level: Level;
  status: 'live' | 'planned';
  author: { name: string; url: string };
  /** module ids worth finishing first */
  prereqs: string[];
  /** the module's one story, in a sentence */
  story: string;
  chapters: C[];
}

const AUTHOR = RAG_MODULE.author;
const planned = (id: string, title: string, level: Level, description: string): Module =>
  ({ id, title, description, level, status: 'planned', author: AUTHOR, prereqs: [], story: '', chapters: [] });

export const MODULES: Module[] = [
  RAG_MODULE,
  planned('tokens', 'Tokens & embeddings', 'Beginner', 'How text becomes the numbers a model reads.'),
  planned('transformers', 'Transformer architecture', 'Advanced', 'What happens inside the model between a prompt and its next word.'),
  planned('agents', 'AI agents', 'Advanced', 'Models that plan, call tools in a loop and decide when they are done.'),
];

export function moduleOf(id: string): Module {
  const m = MODULES.find(m => m.id === id);
  if (!m) throw new Error(`unknown module: ${id}`);
  return m;
}

export const chapterHref = (module: string, chapter: string) => `/${module}/${chapter}/`;

/** Link to the chapter after `chapter`, or undefined on the last one. */
export function nextOf(module: string, chapter: string): { href: string; title: string } | undefined {
  const cs = moduleOf(module).chapters, next = cs[cs.findIndex(c => c.id === chapter) + 1];
  return next && { href: chapterHref(module, next.id), title: next.short };
}
