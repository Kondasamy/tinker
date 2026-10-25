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
import { CONSISTENCY_MODULE } from '../content/consistency/module';
import { AB_TESTING_MODULE } from '../content/ab-testing/module';
import { DIFFUSION_MODULE } from '../content/diffusion/module';
import { SEARCH_MODULE } from '../content/search/module';
import { WEB_REQUESTS_MODULE } from '../content/web-requests/module';
import { PAYMENTS_MODULE } from '../content/payments/module';
import { GIT_MODULE } from '../content/git/module';
import { CALIBRATION_MODULE } from '../content/calibration/module';
import { COMPUTER_USE_MODULE } from '../content/computer-use/module';
import { DIFFUSION_LLMS_MODULE } from '../content/diffusion-llms/module';
import { QUEUES_MODULE } from '../content/queues/module';
import type { RecallItem } from './recall';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Track = 'AI' | 'Classic tech';

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
  /** what the catalogue files it under; absent means AI */
  track?: Track;
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
export const planned = (id: string, title: string, level: Level, description: string, track?: Track): Module => ({
  id,
  title,
  description,
  level,
  track,
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
  CONSISTENCY_MODULE,
  AB_TESTING_MODULE,
  DIFFUSION_MODULE,
  SEARCH_MODULE,
  WEB_REQUESTS_MODULE,
  PAYMENTS_MODULE,
  GIT_MODULE,
  CALIBRATION_MODULE,
  COMPUTER_USE_MODULE,
  DIFFUSION_LLMS_MODULE,
  QUEUES_MODULE,
  planned(
    'mixture-of-experts',
    'Mixture of experts',
    'Advanced',
    'A model with many experts that wakes only a few for each word: the router that picks them, and what it saves.',
  ),
  planned(
    'coding-agents',
    'Coding agents',
    'Intermediate',
    'An agent that edits code and runs the tests: reading a repository, making a change, and checking its own work.',
  ),
  planned(
    'synthetic-data',
    'Synthetic data',
    'Intermediate',
    'Training data written by a model: how it is made, filtered and checked, and when it teaches the wrong thing.',
  ),
  planned(
    'encryption',
    'Locks and keys',
    'Beginner',
    'How a stranger can send you a secret: a public lock, a private key, and signatures that prove who sent it.',
    'Classic tech',
  ),
  planned(
    'compression',
    'Compression',
    'Beginner',
    'How a file gets smaller without losing a byte: repeats replaced by pointers, and why some files will not shrink.',
    'Classic tech',
  ),
  planned(
    'load-balancing',
    'Load balancing',
    'Intermediate',
    'Spreading requests over many servers: round robin, the least busy, health checks, and the one slow server.',
    'Classic tech',
  ),
  planned(
    'memorisation',
    'What a model remembers',
    'Intermediate',
    'What a model keeps from its training text: memorised lines, how they leak back out, and keeping private data out.',
  ),
  planned(
    'video-models',
    'Video and world models',
    'Advanced',
    'Models that make moving pictures: frames that agree over time, and models that guess what a world does next.',
  ),
  planned(
    'recommendations',
    'Recommendations',
    'Intermediate',
    'Why the shop shows you this drill: what you and people like you bought, ranked, and the loop it feeds.',
  ),
  planned(
    'logins',
    'Logins and passwords',
    'Beginner',
    'How a site knows it is you: hashed and salted passwords, a session cookie, and signing in with another site.',
    'Classic tech',
  ),
  planned(
    'email',
    'How email arrives',
    'Beginner',
    'How a message crosses the internet: mail servers that pass it on, SPF and DKIM that vouch for it, and spam.',
    'Classic tech',
  ),
  planned(
    'dependencies',
    'Dependencies',
    'Intermediate',
    'Code you did not write: a package manager, version ranges, the lockfile, and one package that breaks the rest.',
    'Classic tech',
  ),
  planned(
    'releases',
    'Shipping a release',
    'Intermediate',
    'How new code reaches everyone: tests on every change, a canary first, feature flags, and a rollback.',
    'Classic tech',
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
