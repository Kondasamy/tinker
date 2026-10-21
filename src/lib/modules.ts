// The module registry (KTD1): every module, live or planned. Pages, navigation, share images and checks read from here.
import { RAG_MODULE } from '../content/rag/module';
import { TOOL_CALLING_MODULE } from '../content/tool-calling/module';
import { AGENTS_MODULE } from '../content/agents/module';
import { EVALS_MODULE } from '../content/evals/module';
import { GUARDRAILS_MODULE } from '../content/guardrails/module';
import { TOKENS_MODULE } from '../content/tokens/module';
import { TRANSFORMERS_MODULE } from '../content/transformers/module';
import { CONTEXT_MODULE } from '../content/context/module';
import { FINE_TUNING_MODULE } from '../content/fine-tuning/module';
import { SANDBOXING_MODULE } from '../content/sandboxing/module';
import type { RecallItem } from './recall';

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
  /** recall bank for the recap and warm-up (`src/content/<module>/recall.ts`) */
  recall?: RecallItem[];
}

const AUTHOR = RAG_MODULE.author;
/** a roadmap card: a module someone may build, with no chapters or pages yet */
export const planned = (id: string, title: string, level: Level, description: string): Module =>
  ({ id, title, description, level, status: 'planned', author: AUTHOR, prereqs: [], story: '', chapters: [] });

export const MODULES: Module[] = [
  RAG_MODULE,
  TOOL_CALLING_MODULE,
  AGENTS_MODULE,
  EVALS_MODULE,
  GUARDRAILS_MODULE,
  TOKENS_MODULE,
  TRANSFORMERS_MODULE,
  CONTEXT_MODULE,
  FINE_TUNING_MODULE,
  planned('structured-outputs', 'Structured outputs', 'Intermediate', 'How a model is made to answer in valid JSON, every time: a schema masks the tokens it may pick.'),
  planned('reasoning', 'Reasoning models & thinking budgets', 'Intermediate', 'Models that think before they answer: what a thinking budget buys, what it costs, and when more thinking hurts.'),
  planned('small-models', 'Small models: distillation & routing', 'Advanced', 'Teach a small model from a big one, send it the easy questions, and fall back when it isn’t sure.'),
  planned('inference', 'Inference engineering', 'Advanced', 'What happens between the prompt and the reply on a server: batching, the KV cache, quantization and speculative decoding.'),
  planned('observability', 'Observability & error analysis', 'Intermediate', 'Reading what the assistant really did in production: traces, labelling failures by hand, and finding the ones that matter.'),
  SANDBOXING_MODULE,
  planned('multimodal', 'Multimodal models', 'Intermediate', 'How images and documents become tokens, and how a model reads a photo, a scan or an invoice.'),
  planned('voice', 'Voice agents', 'Advanced', 'Assistants you talk to: speech in and out, taking turns, being interrupted, and the latency budget.'),
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
