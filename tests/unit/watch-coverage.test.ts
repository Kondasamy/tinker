// Watch mode plays every RAG chapter to its end (R2, R5): each step plays its demo (or Show me's solution), a step
// with neither is a question the reader answers, and verdicts arrive from the engine as the stage syncs them (KTD8).
import { beforeAll, describe, expect, it } from 'vitest';
import { openIndex, type RagIndex } from '../../src/lib/rag/load';
import { diskLoader } from '../../src/lib/rag/diskLoader';
import { createSession } from '../../src/lib/rag/engine';
import { outcome, type CanvasState, type Outcome } from '../../src/components/canvas/state';
import { reduce, startRun, type Run, type Step } from '../../src/components/story/steps';
import { PROBLEMS, START, advance, choose } from '../../src/components/quiz/TypeChallenge';
import { questionById } from '../../src/content/rag/questions';
import * as ch1 from '../../src/content/rag/01-history';
import * as ch2 from '../../src/content/rag/02-why-not-stuff-it';
import * as ch3 from '../../src/content/rag/03-what-is-rag';
import * as ch4 from '../../src/content/rag/04-layers';
import * as ch5 from '../../src/content/rag/05-accuracy';
import * as ch6 from '../../src/content/rag/06-types';
import * as ch7 from '../../src/content/rag/07-sandbox';

// each chapter has its own state type; the test reads them all alike
type S = any;
const CHAPTERS: [string, { STEPS: Step<S>[]; INITIAL: S; QUIZ?: { correct: number } }][] = Object.entries({
  ch1,
  ch2,
  ch3,
  ch4,
  ch5,
  ch6,
  ch7,
});

/** How the reader answers a waiting step, by the question control it shows: always the right option. */
const ANSWERS: Record<string, (s: S, quiz?: { correct: number }) => S> = {
  predict: s => ({ ...s, prediction: 1 }),
  quiz: (s, quiz) => ({ ...s, quiz: quiz!.correct }),
  gquiz: s => ({ ...s, gquiz: ch6.GRAPH_QUIZ.correct }),
  challenge: s => ({ ...s, ch: PROBLEMS.reduce(c => advance(choose(c, PROBLEMS[c.at].best)), START) }),
};
/** A waiting step's question: its one control, a predict, quiz or challenge (a step showing more acts, it doesn't ask). */
const question = (step: Step<S>) => {
  const [c, ...more] = step.visibleControls;
  return !more.length && c in ANSWERS ? c : undefined;
};

let index: RagIndex;
beforeAll(async () => {
  index = await openIndex(diskLoader);
});

/** The engine's outcome for a canvas, loading its chunks first, as the canvas does before it reports. */
async function outcomeOf(q: string, c: CanvasState): Promise<Outcome> {
  for (;;) {
    const o = outcome(index, createSession(index), c, questionById(q));
    if (!o.preparing) return o;
    await index.load(o.config.file);
  }
}

/** What the stage does after a change: sync the engine's verdict (RagStage), and finish runs Watch queued (chapter 6). */
async function settle(steps: Step<S>[], run: Run<S>): Promise<Run<S>> {
  for (;;) {
    const s = run.state;
    if (!s.canvas) return run;
    const v = (await outcomeOf(s.q ?? 'refund-enterprise', s.canvas)).answer?.verdict ?? null;
    if (v && v !== s.verdict) {
      run = reduce(steps, run, { type: 'sync', state: { ...s, verdict: v } });
      continue;
    }
    if (s.todo) {
      const key = (q: string, c: CanvasState) => q + JSON.stringify(c);
      const done = new Map<string, Outcome>();
      for (const [q, type] of s.todo as [string, string][]) {
        const c = ch6.canvasOf(s, q, type);
        done.set(key(q, c), await outcomeOf(q, c));
      }
      run = reduce(steps, run, { type: 'sync', state: ch6.finishRuns(s, (q, c) => done.get(key(q, c)) ?? null)! });
      continue;
    }
    return run;
  }
}

describe('Watch mode plays every RAG chapter (R2, R5)', () => {
  it.each(CHAPTERS)('%s: a step that waits for the reader is a question', (_, { STEPS }) => {
    for (const step of STEPS.filter(st => !st.demo && !st.solution)) expect(question(step), step.id).toBeDefined();
  });

  it.each(CHAPTERS)('%s: plays from the start to done', async (_, { STEPS, INITIAL, QUIZ }) => {
    let run = await settle(STEPS, startRun(STEPS, INITIAL));
    while (!run.done) {
      const step = STEPS[run.index];
      const watching = step.demo || step.solution;
      const ask = question(step);
      const next = watching
        ? reduce(STEPS, run, { type: 'watch' })
        : ask
          ? reduce(STEPS, run, { type: 'apply', state: ANSWERS[ask](run.state, QUIZ) })
          : run;
      const settled = await settle(STEPS, next);
      expect(settled.index > run.index || settled.done, `stuck on ${step.id}`).toBe(true);
      run = settled;
    }
  });
});
