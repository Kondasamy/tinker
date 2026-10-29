// Writing a prompt's story data: Larkspur mini's live continuations (chapter 1) and the replies each docket gets
// (KTD4): recorded once from a named model, keyed by signature, one reviewed file per chapter that first reaches it.
// A chapter whose recording didn't show its effect reads the simulator instead (pinned.json `simulated`, KTD13).
import { decode, encode } from '../lm/bpe';
import type { Model } from '../lm/model';
import { generate } from '../fine-tuning/engine';
import pinned from '../../../data/prompts/pinned.json' with { type: 'json' };
import { signature } from './assemble';
import type { ModelId, Setup } from './cards';
import { simulateReply, VERSION } from './simulate';

// ---- chapter 1: the model only continues text (live) ----
/** Instructions Larkspur mini is given in chapter 1; it was trained on Larkspur's documents, never on instructions. */
export const MINI_PROMPTS = [
  'Write a reply to the customer.',
  'You are a helpful support agent. Reply to this ticket:',
];
export const MINI_TOKENS = 24;
/** Larkspur mini's greedy continuation: the likeliest next token, MINI_TOKENS times. */
export const continueText = (model: Model, prompt: string) => decode(generate(model, encode(prompt), MINI_TOKENS));

// ---- recorded replies ----
export interface ReplyFile {
  meta: {
    models: Record<ModelId, string>;
    accessed: string;
    settings: { temperature: number; seed: number; max_tokens: number };
    provider: string;
    script: string;
    simulated?: number;
    simulator?: string;
  };
  replies: Record<string, { text: string; simulated?: boolean }>;
}
const files = import.meta.glob<ReplyFile>('/data/prompts/replies/*.json', { eager: true, import: 'default' });
/** Each reply file by name (the chapter that first reaches its signatures). */
export const RECORDINGS: Record<string, ReplyFile> = Object.fromEntries(
  Object.entries(files).map(([path, f]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), f]),
);
const BY_SIG = new Map(
  Object.entries(RECORDINGS).flatMap(([file, f]) => Object.entries(f.replies).map(([sig, r]) => [sig, { ...r, file }])),
);
/** Chapters that read the simulator because their recording didn't show the effect they teach. */
export const SIMULATED: string[] = pinned.simulated;
export const NORECORD = 'norecord';

export interface Reply {
  text: string;
  /** recorded: a real model's reply from one dated run; simulated: written by simulate.ts's rules */
  source: 'recorded' | 'simulated';
  /** the model's id, or the simulator's version */
  by: string;
  /** the day it was recorded or the simulator was pinned (YYYY-MM-DD) */
  date: string;
}

/** The reply this chapter shows for a docket sent to one ticket, or `norecord` (the coverage test proves none). */
export function replyOf(chapter: string, s: Setup): Reply | typeof NORECORD {
  if (SIMULATED.includes(chapter))
    return { text: simulateReply(s), source: 'simulated', by: VERSION, date: pinned.simulatedOn };
  const r = BY_SIG.get(signature(s));
  if (!r) return NORECORD;
  const meta = RECORDINGS[r.file].meta;
  return r.simulated
    ? { text: r.text, source: 'simulated', by: meta.simulator ?? VERSION, date: meta.accessed }
    : { text: r.text, source: 'recorded', by: meta.models[s.model], date: meta.accessed };
}
