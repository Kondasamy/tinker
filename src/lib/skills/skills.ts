// Skills' engine (KTD3). Larkspur's six skills and twelve tickets (data/skills/requests.json), a word-overlap scorer that
// stands in for the model's pick (a labelled stand-in: a real model reads the labels, it doesn't count words), and the
// words each request loads: the whole long prompt, or every label plus the one binder picked.
import DATA from '../../../data/skills/requests.json' with { type: 'json' };
import PINS from '../../../data/skills/pinned.json' with { type: 'json' };

export interface Skill {
  id: string;
  name: string;
  /** the label: the skill's name and one line, in every prompt */
  label: string;
  /** a vague label the chapters can swap in */
  vague?: string;
  /** labels a chapter offers the reader before the sharp one */
  drafts?: string[];
  /** a label that overlaps another skill's (chapter 5) */
  blurry?: string;
  /** the workbench's other labels for this skill: a vague one and a long one */
  bench?: string[];
  /** a script clipped in the binder: its code's words, and its output's (hand-set) */
  script?: { name: string; codeWords: number; outputWords: number };
  /** the binder's body, in words (hand-set) */
  bodyWords: number;
}
export interface Request {
  id: string;
  text: string;
  /** the skill a person at Larkspur would open for it */
  skill: string;
}

export const SKILLS: Skill[] = DATA.skills;
export const REQUESTS: Request[] = DATA.requests;
export const skillOf = (id: string) => SKILLS.find(s => s.id === id)!;
export const requestOf = (id: string) => REQUESTS.find(r => r.id === id)!;

/** skill id → the label the carousel shows */
export type Labels = Record<string, string>;
export const LABELS: Labels = Object.fromEntries(SKILLS.map(s => [s.id, s.label]));
/** The sharp labels with these skills' vague ones swapped in. */
export const labelsWith = (vague: string[]): Labels =>
  Object.fromEntries(SKILLS.map(s => [s.id, vague.includes(s.id) && s.vague ? s.vague : s.label]));

const STOP = new Set(
  'a an the i me my we you your it its is are was were be am to of for in on at by so or and with can do does how what will would this that these those them they get got after under now still did came sent last week'.split(
    ' ',
  ),
);
/** Plain stems of a text: lower case, filler dropped, a crude suffix strip (ies → y, then s, ed, ing). */
export function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (STOP.has(w)) continue;
    let s = w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w;
    if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
    if (s.length > 4 && s.endsWith('ing')) s = s.slice(0, -3);
    else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
    out.add(s);
  }
  return out;
}

/** How many of the request's stems the label shares. */
export function score(request: string, label: string): number {
  const l = stems(label);
  return [...stems(request)].filter(w => l.has(w)).length;
}

/** The binder the stand-in opens for a request: the label sharing the most words, the first on the carousel on a tie,
 * none when no label shares a word. */
export function pick(requestId: string, labels: Labels = LABELS): string | null {
  const text = requestOf(requestId).text;
  let best: string | null = null,
    top = 0;
  for (const s of SKILLS) {
    const n = score(text, labels[s.id]);
    if (n > top) [best, top] = [s.id, n];
  }
  return best;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const BASE_WORDS = DATA.baseWords;
/** The 40-page prompt: the base instructions and every binder, in every request. */
export const PROMPT_WORDS = BASE_WORDS + SKILLS.reduce((n, s) => n + s.bodyWords, 0);
export const PAGES = PROMPT_WORDS / DATA.pageWords;

/** How the picked binder's script is used: not at all, read into the prompt as code, or run (only its output). */
export type ScriptUse = 'read' | 'run';
/** Words in the prompt for one request: the long prompt (everything), or the base, every label and the binder picked,
 * plus its script's code (read) or only its output (run). */
export function wordsLoaded(
  mode: 'prompt' | 'skills',
  picked: string | null,
  labels: Labels = LABELS,
  script?: ScriptUse,
): number {
  if (mode === 'prompt') return PROMPT_WORDS;
  const tags = SKILLS.reduce((n, s) => n + words(labels[s.id]), 0);
  const k = picked ? skillOf(picked) : null,
    code = k?.script && script ? (script === 'read' ? k.script.codeWords : k.script.outputWords) : 0;
  return BASE_WORDS + tags + (k ? k.bodyWords : 0) + code;
}

/** A downloaded skill (chapter 6), with the order its body hides. */
export const OUTSIDER = DATA.outsider;

// ---- the workbench (chapter 7): a label per skill, scored on all twelve tickets ----

/** The labels the workbench offers for a skill: vague, long, then the sharp one. */
export const benchOptions = (id: string) => [...(skillOf(id).bench ?? []), skillOf(id).label];
/** The workbench's start: each skill's first (vague) or second (long) label, alternating. */
export const BENCH_START = SKILLS.map((_, i) => i % 2);
/** Labels for a choice of option per skill (in SKILLS order). */
export const benchLabels = (choice: number[]): Labels =>
  Object.fromEntries(SKILLS.map((s, i) => [s.id, benchOptions(s.id)[choice[i]]]));
/** Right picks over the twelve tickets, and the words they load in all. */
export function benchScore(choice: number[]) {
  const labels = benchLabels(choice);
  let right = 0,
    loaded = 0;
  for (const r of REQUESTS) {
    const p = pick(r.id, labels);
    if (p === r.skill) right++;
    loaded += wordsLoaded('skills', p, labels);
  }
  return { right, words: loaded };
}
/** Every label set with the most right picks, and of those the fewest words. */
export function winnersOf(): number[][] {
  const sets: number[][] = [[]];
  for (const s of SKILLS) {
    const n = benchOptions(s.id).length;
    sets.splice(0, sets.length, ...sets.flatMap(c => Array.from({ length: n }, (_, i) => [...c, i])));
  }
  const scored = sets.map(c => ({ c, ...benchScore(c) }));
  const right = Math.max(...scored.map(x => x.right));
  const best = scored.filter(x => x.right === right);
  const fewest = Math.min(...best.map(x => x.words));
  return best.filter(x => x.words === fewest).map(x => x.c);
}
/** The pinned winners (re-derived in tests/unit/skills.test.ts). */
export const WINNERS: number[][] = PINS.bench.winners.map(w => [...w].map(Number));
