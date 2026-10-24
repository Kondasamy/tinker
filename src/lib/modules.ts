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
import { STRUCTURED_OUTPUTS_MODULE } from '../content/structured-outputs/module';
import { REASONING_MODULE } from '../content/reasoning/module';
import { SMALL_MODELS_MODULE } from '../content/small-models/module';
import { INFERENCE_MODULE } from '../content/inference/module';
import { MULTIMODAL_MODULE } from '../content/multimodal/module';
import { OBSERVABILITY_MODULE } from '../content/observability/module';
import { SANDBOXING_MODULE } from '../content/sandboxing/module';
import { VOICE_MODULE } from '../content/voice/module';
import { POST_TRAINING_MODULE } from '../content/post-training/module';
import { PRE_TRAINING_MODULE } from '../content/pre-training/module';
import { INTERPRETABILITY_MODULE } from '../content/interpretability/module';
import { CACHING_MODULE } from '../content/caching/module';
import { DATABASES_MODULE } from '../content/databases/module';
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
export const planned = (id: string, title: string, level: Level, description: string): Module => ({
  id,
  title,
  description,
  level,
  status: 'planned',
  author: AUTHOR,
  prereqs: [],
  story: '',
  chapters: [],
});

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
  STRUCTURED_OUTPUTS_MODULE,
  REASONING_MODULE,
  SMALL_MODELS_MODULE,
  INFERENCE_MODULE,
  OBSERVABILITY_MODULE,
  SANDBOXING_MODULE,
  MULTIMODAL_MODULE,
  VOICE_MODULE,
  PRE_TRAINING_MODULE,
  POST_TRAINING_MODULE,
  INTERPRETABILITY_MODULE,
  CACHING_MODULE,
  DATABASES_MODULE,
  planned(
    'consistency',
    'Replication & consistency',
    'Advanced',
    'Three warehouses, one stock count: how the last hinge gets sold twice, and what each fix costs.',
  ),
  planned(
    'ab-testing',
    'A/B testing',
    'Beginner',
    'Did the new button work? Running a fair test, and the lucky days and early peeks that fake a win.',
  ),
  planned(
    'diffusion',
    'Diffusion models',
    'Intermediate',
    'How a picture comes out of noise: a model that removes its best guess of the noise, step by step.',
  ),
  planned(
    'diffusion-llms',
    'Diffusion language models',
    'Advanced',
    'Writing a reply in any order: fill the sure words first, then the rest, and what the speed gives up.',
  ),
  planned(
    'computer-use',
    'Computer use',
    'Advanced',
    'An agent that sees a screenshot and clicks: what it sees, where it clicks, and the screens that fool it.',
  ),
  planned(
    'calibration',
    'Calibration',
    'Intermediate',
    'When a model says 70%, is it right 70% of the time? Confidence, measured, and when to abstain.',
  ),
  planned(
    'search',
    'Search before AI',
    'Beginner',
    'How keyword search finds a page: an index from words to documents, ranking, and where it misses meaning.',
  ),
  planned(
    'web-requests',
    'Opening a web page',
    'Beginner',
    'What happens between typing an address and seeing the page: DNS, a connection, encryption and HTTP.',
  ),
  planned(
    'payments',
    'Card payments',
    'Beginner',
    'Where the money goes when a customer pays by card: authorisation, capture, settlement, fees and chargebacks.',
  ),
  planned(
    'git',
    'Git',
    'Beginner',
    'How Git stores history: snapshots named by their content, branches as pointers, and merges that clash.',
  ),
];

export function moduleOf(id: string): Module {
  const m = MODULES.find(m => m.id === id);
  if (!m) throw new Error(`unknown module: ${id}`);
  return m;
}

export const chapterHref = (module: string, chapter: string) => `/${module}/${chapter}/`;

/** Link to the chapter after `chapter`, or undefined on the last one. */
export function nextOf(module: string, chapter: string): { href: string; title: string } | undefined {
  const cs = moduleOf(module).chapters,
    next = cs[cs.findIndex(c => c.id === chapter) + 1];
  return next && { href: chapterHref(module, next.id), title: next.short };
}
