// Test fixture bank for /dev/recap and /dev/warmup (tests/e2e/recap.spec.ts): items on RAG's first three chapters,
// so the fixture reads real RAG progress. Not course content: RAG's own bank is src/content/rag/recall.ts.
import type { RecallItem } from '../lib/recall';

const two = (
  question: string,
  right: string,
  wrong: string,
): Pick<RecallItem, 'question' | 'options' | 'correct' | 'why'> => ({
  question,
  options: [right, wrong],
  correct: 0,
  why: [`Right: ${right}.`, `Not quite: ${wrong} is the myth.`],
});

export const FIXTURE_BANK: RecallItem[] = [
  { id: 'h-pin', chapter: '01-history', pin: true, ...two('Fixture h-pin: who runs a tool?', 'The host', 'The model') },
  { id: 'h-1', chapter: '01-history', ...two('Fixture h-1: did the model read your files in training?', 'No', 'Yes') },
  { id: 'w-1', chapter: '02-why-not-stuff-it', ...two('Fixture w-1: does everything fit in the window?', 'No', 'Yes') },
  { id: 'w-2', chapter: '02-why-not-stuff-it', ...two('Fixture w-2: is a bigger prompt free?', 'No', 'Yes') },
  { id: 'r-1', chapter: '03-what-is-rag', ...two('Fixture r-1: does RAG retrieve first?', 'Yes', 'No') },
  { id: 'r-2', chapter: '03-what-is-rag', ...two('Fixture r-2: are chunks whole files?', 'No', 'Yes') },
];
