// Self-correcting RAG as a rule table over engine outputs (KTD7): no model runs. The Evaluator grades each
// retrieval by the precomputed cross-encoder score of its best chunk. Below the bar it throws that context away
// and searches the question's next fixed rewrite; when every attempt falls short it says "I don't know"
// instead of answering from weak evidence. Each attempt is one logged call.
import type { Config, RagIndex } from './load';
import { crossScore, run, topScore, type RunParams, type RunRecord } from './engine';
import { signature, type KeyedQuestion } from './signature';
import { lookup, type Answer } from './answers';
import { MAX_CALLS, type AgentCall } from './agent';

/** Cross-encoder score (ms-marco logit) the best chunk must reach for the evaluator to let the model answer. */
export const GRADE_BAR = 6;

/** The honest abstain: what the assistant says when no attempt passes the grade. */
export const ABSTAIN: Answer = {
  verdict: 'notfound',
  text: "I don't know. None of the passages I found answer this clearly enough to rely on.",
  citation: null,
  why: 'The evaluator graded every search below its bar, so the assistant declined rather than answer from weak evidence.',
};

export interface SelfCheckRun {
  record: RunRecord;
  calls: AgentCall[];
  abstain: boolean;
}

/** `first`: the record of `run(index, cfg, p)` when the caller already has it; reused as the first attempt. */
export function runSelfCheck(
  index: RagIndex,
  cfg: Config,
  p: RunParams & { question: KeyedQuestion },
  bar = GRADE_BAR,
  first?: RunRecord,
): SelfCheckRun {
  const q = p.question;
  // the query as sent first, then each unused rewrite, within the same budget as the agent
  const attempts = [p.rewrite, ...q.rewrites.map((_, i) => i).filter(i => i !== p.rewrite)].slice(0, MAX_CALLS);
  const calls: AgentCall[] = [];
  let last: RunRecord | null = null;
  for (const rewrite of attempts) {
    const r = first && rewrite === p.rewrite ? first : run(index, cfg, { ...p, rewrite });
    const graded = r.context
      .map(c => crossScore(index, cfg, c.id, r.queryIndex))
      .filter((s): s is number => s !== null);
    const score = graded.length ? Math.max(...graded) : null;
    const pass = score !== null && score >= bar;
    calls.push({
      call: calls.length + 1,
      action: rewrite === undefined ? 'search' : 'rewrite',
      query: r.queryText,
      chunksAdded: r.context.length,
      topScore: topScore(r.context),
      verdict: lookup(q.id, signature(index, q, r.context)).verdict,
      grade: { score, pass },
    });
    last = r;
    if (pass) return { record: r, calls, abstain: false };
  }
  return { record: last!, calls, abstain: true };
}
