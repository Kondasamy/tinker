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
import { FAIRNESS_MODULE } from '../content/fairness/module';
import { WATERMARKS_MODULE } from '../content/watermarks/module';
import { AGENT_COMMERCE_MODULE } from '../content/agent-commerce/module';
import { PARALLEL_TRAINING_MODULE } from '../content/parallel-training/module';
import { CHOOSING_MODELS_MODULE } from '../content/choosing-models/module';
import { RATE_LIMITS_MODULE } from '../content/rate-limits/module';
import { UNICODE_MODULE } from '../content/unicode/module';
import { BACKUPS_MODULE } from '../content/backups/module';
import { ON_DEVICE_MODULE } from '../content/on-device/module';
import { ROUTES_MODULE } from '../content/routes/module';
import { ROBOTS_MODULE } from '../content/robots/module';
import { BEFORE_GENAI_MODULE } from '../content/before-genai/module';
import { SKILLS_MODULE } from '../content/skills/module';
import { ACTION_APPROVALS_MODULE } from '../content/action-approvals/module';
import { MULTI_AGENT_MODULE } from '../content/multi-agent/module';
import { AGENT_MEMORY_MODULE } from '../content/agent-memory/module';
import { TOOLS_IN_PRODUCTION_MODULE } from '../content/tools-in-production/module';
import { AGENT_UNDO_MODULE } from '../content/agent-undo/module';
import { CAUSAL_EVALS_MODULE } from '../content/causal-evals/module';
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
  // the prequel, Module 0: fixed first, the one exception to go-live order (AGENTS.md)
  BEFORE_GENAI_MODULE,
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
  FAIRNESS_MODULE,
  WATERMARKS_MODULE,
  AGENT_COMMERCE_MODULE,
  PARALLEL_TRAINING_MODULE,
  CHOOSING_MODELS_MODULE,
  RATE_LIMITS_MODULE,
  UNICODE_MODULE,
  BACKUPS_MODULE,
  ON_DEVICE_MODULE,
  ROUTES_MODULE,
  ROBOTS_MODULE,
  SKILLS_MODULE,
  ACTION_APPROVALS_MODULE,
  MULTI_AGENT_MODULE,
  AGENT_MEMORY_MODULE,
  TOOLS_IN_PRODUCTION_MODULE,
  AGENT_UNDO_MODULE,
  CAUSAL_EVALS_MODULE,
  planned(
    'adaptive-compute',
    'Where the effort goes',
    'Advanced',
    'Deciding per request whether the next effort goes to thinking longer, looking something up, checking, or a bigger model.',
  ),
  planned(
    'agent-incidents',
    'When agents fail',
    'Advanced',
    'Runaway helpers, cluttered memory, double refunds and agents that say done when they are not, and how to check.',
  ),
  planned(
    'agent-scheduling',
    'Scheduling agents',
    'Advanced',
    'Long agent jobs on shared machines: who gets in, passing deadlines down, cancelling cleanly and taking fair turns.',
  ),
  planned(
    'cache-reuse',
    'Reusing the model’s notes',
    'Advanced',
    'Keeping a conversation’s saved work between turns and machines, and when the reused copy is quietly wrong.',
  ),
  planned(
    'translation',
    'Machine translation',
    'Beginner',
    'How a model turns one language into another, and why names, idioms and tone slip through.',
  ),
  planned(
    'open-weights',
    'Open-weight models',
    'Intermediate',
    'A model you can download: what the weights are, what the licence lets you do, and running it yourself.',
  ),
  planned(
    'ai-energy',
    'The power behind AI',
    'Advanced',
    'Chips, data centres and the electricity behind each answer, and where the cost of a query goes.',
  ),
  planned(
    'clocks',
    'Time and clocks',
    'Beginner',
    'Why computers disagree on the time: time zones, clocks that drift, and the leap second.',
    'Classic tech',
  ),
  planned(
    'gps',
    'How GPS finds you',
    'Intermediate',
    'Satellites that broadcast the time, and how a phone turns four of them into a dot on a map.',
    'Classic tech',
  ),
];

export function moduleOf(id: string): Module {
  const m = MODULES.find(m => m.id === id);
  if (!m) throw new Error(`unknown module: ${id}`);
  return m;
}

const LIVE = MODULES.filter(m => m.status === 'live');
/** the number a module shows: the prequel is Module 0, so every other live module counts from 1 after it */
export const moduleNumber = (m: Module) => LIVE.indexOf(m);

export const chapterHref = (module: string, chapter: string) => `/${module}/${chapter}/`;

/** Link to the chapter after `chapter`, or undefined on the last one. */
export function nextOf(module: string, chapter: string): { href: string; title: string } | undefined {
  const cs = moduleOf(module).chapters,
    next = cs[cs.findIndex(c => c.id === chapter) + 1];
  return next && { href: chapterHref(module, next.id), title: next.short };
}
