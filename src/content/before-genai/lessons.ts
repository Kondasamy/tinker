// Chapters 7 and 8's answers, as data a page, a unit test and an e2e walk can all import (no React, no CSS). Chapter 7:
// which bots answer each message, read off the same outcomes the picture shows (a recorded GenAI reply counts as
// answered). Chapter 8: the four gaps GenAI left and the later module that fixes each (R7).
import { outcomes, STATIONS, type Station } from '../../components/scenes/kioskScene';
import { MESSAGES, type Run } from '../../lib/before-genai/bots';

/** chapter 7's four messages, in the order its steps show them */
export const SHOWN = MESSAGES.filter(m => m.chapters.includes('07-what-changed')).map(m => m.id);

/** Every set of bots that could answer, so the right one is always on the list, whatever the recording holds. */
const SETS: Station[][] = [
  [],
  ['script'],
  ['sorter'],
  ['genai'],
  ['script', 'sorter'],
  ['script', 'genai'],
  ['sorter', 'genai'],
  ['script', 'sorter', 'genai'],
];
const nameOf = (id: Station, k: number) => {
  const n = STATIONS.find(s => s.id === id)!.name;
  return k > 0 && id !== 'genai' ? n.toLowerCase() : n;
};
export const OPTIONS = SETS.map(set =>
  set.length === 0
    ? 'None of them'
    : set.length === 3
      ? 'All three'
      : set.length === 1
        ? `${nameOf(set[0], 0)} only`
        : `${nameOf(set[0], 0)} and ${nameOf(set[1], 1)}`,
);
/** the option naming the bots that answered: a recorded GenAI reply counts as answered */
export function answerOf(r: Run) {
  const out = outcomes(r),
    said = STATIONS.map(s => s.id).filter(id => out[id] === 'answered');
  return SETS.findIndex(set => set.join() === said.join());
}

/** The later modules a gap can map to, in the Select's order, and what each one does, in plain words. */
export const FIXERS = {
  rag: 'gives the assistant your company’s documents to answer from',
  'tool-calling': 'lets the assistant act, through tools your systems offer',
  evals: 'tests the assistant’s answers, so made-up ones get caught',
  guardrails: 'blocks what the assistant must not say or do',
} as const;
export type Fixer = keyof typeof FIXERS;
/** the module a reader is handed to once the chapter ends */
export const HANDOFF: Fixer = 'rag';

export const GAPS = [
  { id: 'made-up', message: 'gap-made-up', fix: 'evals', cite: 'hallucination' },
  { id: 'no-knowledge', message: 'gap-no-knowledge', fix: 'rag' },
  { id: 'cant-act', message: 'gap-cant-act', fix: 'tool-calling' },
  { id: 'shouldnt', message: 'gap-shouldnt', fix: 'guardrails' },
] as const satisfies readonly { id: string; message: string; fix: Fixer; cite?: string }[];
