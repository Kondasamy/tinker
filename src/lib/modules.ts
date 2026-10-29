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
import { COMPRESSION_MODULE } from '../content/compression/module';
import { LOAD_BALANCING_MODULE } from '../content/load-balancing/module';
import { ENCRYPTION_MODULE } from '../content/encryption/module';
import { CODING_AGENTS_MODULE } from '../content/coding-agents/module';
import { SYNTHETIC_DATA_MODULE } from '../content/synthetic-data/module';
import { MIXTURE_OF_EXPERTS_MODULE } from '../content/mixture-of-experts/module';
import { LOGINS_MODULE } from '../content/logins/module';
import { EMAIL_MODULE } from '../content/email/module';
import { DEPENDENCIES_MODULE } from '../content/dependencies/module';
import { RELEASES_MODULE } from '../content/releases/module';
import { RECOMMENDATIONS_MODULE } from '../content/recommendations/module';
import { MEMORISATION_MODULE } from '../content/memorisation/module';
import { VIDEO_MODELS_MODULE } from '../content/video-models/module';
import { PROMPTS_MODULE } from '../content/prompts/module';
import { LABELLING_MODULE } from '../content/labelling/module';
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
  COMPRESSION_MODULE,
  LOAD_BALANCING_MODULE,
  ENCRYPTION_MODULE,
  CODING_AGENTS_MODULE,
  SYNTHETIC_DATA_MODULE,
  MIXTURE_OF_EXPERTS_MODULE,
  LOGINS_MODULE,
  EMAIL_MODULE,
  DEPENDENCIES_MODULE,
  RELEASES_MODULE,
  RECOMMENDATIONS_MODULE,
  MEMORISATION_MODULE,
  VIDEO_MODELS_MODULE,
  PROMPTS_MODULE,
  LABELLING_MODULE,
  planned(
    'fairness',
    'Bias and fairness',
    'Intermediate',
    'Who a model gets wrong: error rates group by group, where the skew comes from, and what a fix costs.',
  ),
  planned(
    'watermarks',
    'Watermarks and made-by-AI',
    'Intermediate',
    'Marking generated text and pictures so they can be spotted later, and why a detector can only guess.',
  ),
  planned(
    'choosing-models',
    'Choosing a model',
    'Beginner',
    'Picking the model for the job: leaderboards, price per answer, speed, and testing on your own questions.',
  ),
  planned(
    'on-device',
    'Models on your device',
    'Intermediate',
    'A model that runs on a phone: what fits in its memory, what it costs the battery, and what never leaves it.',
  ),
  planned(
    'robots',
    'Robots that act',
    'Advanced',
    'From camera frames to motor commands, and why a robot learns by watching people do the task.',
  ),
  planned(
    'rate-limits',
    'Rate limits',
    'Beginner',
    'Why a busy site says slow down: a bucket of tokens, a 429 reply, and who gets turned away first.',
    'Classic tech',
  ),
  planned(
    'backups',
    'Backups and recovery',
    'Beginner',
    'Copies that save you on a bad day: how often to copy, testing the restore, and how much you can lose.',
    'Classic tech',
  ),
  planned(
    'unicode',
    'Text and Unicode',
    'Beginner',
    'How letters become bytes: one number for every character, UTF-8, and why an emoji breaks a form.',
    'Classic tech',
  ),
  planned(
    'routes',
    'Finding the way',
    'Intermediate',
    'How a map app picks your route: roads as a graph, the shortest path, and live traffic that changes it.',
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
