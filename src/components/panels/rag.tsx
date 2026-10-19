// Shared wiring for the canvas chapters (3 onward): the engine run, the hero canvas with its live summary,
// and the drawer panels. Chapter state carries the canvas plus the verdict so step predicates stay pure.
import { useMemo, useState } from 'react';
import Canvas, { useRagIndex } from '../canvas/Canvas';
import { outcome, type CanvasQuestion, type CanvasState, type Outcome } from '../canvas/state';
import { createSession } from '../../lib/rag/engine';
import type { Lookup } from '../../lib/rag/answers';
import type { Panel, StageProps } from '../story/StepRunner';
import AnswerCard from './AnswerCard';
import AgentLog from './AgentLog';
import EvidenceList from './EvidenceList';
import ChunkStrip from './ChunkStrip';
import ProjectionMap from './ProjectionMap';
import { summary } from './logic';

export interface RagState { canvas: CanvasState; verdict: Lookup['verdict'] | null; math: boolean; probed: boolean }

export function useRagRun(question: CanvasQuestion) {
  const { index } = useRagIndex();
  const session = useMemo(() => index && createSession(index), [index]);
  const [out, setOut] = useState<Outcome | null>(null);
  /** Outcome for a canvas state right now, or null while the index or its chunks are still loading. */
  const outcomeOf = (c: CanvasState) => {
    if (!index || !session) return null;
    const o = outcome(index, session, c, question);
    return o.preparing ? null : o;
  };
  /** Verdict for a canvas state right now (null while loading), so one apply carries it. */
  const verdictOf = (c: CanvasState) => outcomeOf(c)?.answer?.verdict ?? null;
  return { index, out, setOut, verdictOf, outcomeOf, question };
}
type RagRun = ReturnType<typeof useRagRun>;

const TABS = [['answer', 'Answer'], ['evidence', 'Evidence'], ['chunks', 'Chunks'], ['map', 'Map']] as const;

/** `extraTabs`: chapter-specific drawer panels to offer beside the standard ones (e.g. chapter 6's Compare). */
export function RagStage<S extends RagState>({ state, apply, focus, inspect, run, extraTabs = [] }: StageProps<S> & { run: RagRun; extraTabs?: [string, string][] }) {
  const u = state.canvas.unlocked;
  const shown = TABS.filter(([id]) => id === 'answer' || (id === 'evidence' ? u.includes('retriever') : id === 'chunks' ? u.includes('chunker') : u.includes('embedder')));
  return (
    <figure className="rag-stage">
      <Canvas state={state.canvas} question={run.question} focus={focus} panel={false}
        onChange={canvas => apply({ ...state, canvas, verdict: run.verdictOf(canvas) })}
        onResult={o => {
          run.setOut(o);
          const v = o.preparing ? null : o.answer?.verdict ?? null;
          if (v && v !== state.verdict) apply({ ...state, verdict: v });
        }} />
      <figcaption>
        <p className="announce" aria-live="polite" aria-atomic="true" data-testid="announce">{summary(run.out)}</p>
        <span className="inspect-row" role="group" aria-label="Inspect">
          {[...shown, ...extraTabs].map(([id, label]) => <button key={id} type="button" className="chip" onClick={() => inspect(id)}>{label}</button>)}
        </span>
      </figcaption>
    </figure>
  );
}

export function ragPanels<S extends RagState>(run: RagRun): Record<string, Panel<S>> {
  return {
    answer: {
      title: 'The assistant’s answer',
      render: (s, apply) => <>
        <AnswerCard out={run.out} />
        {run.out?.calls && <AgentLog calls={run.out.calls} math={s.math} onMath={math => apply({ ...s, math })} />}
      </>,
    },
    evidence: {
      title: 'What reached the model',
      render: (s, apply) => <EvidenceList out={run.out} index={run.index} math={s.math} onMath={math => apply({ ...s, math })} />,
    },
    chunks: { title: 'Where the chunker cut', render: () => <ChunkStrip out={run.out} index={run.index} sentence={run.question.keyFacts[0].sentence} /> },
    map: { title: 'The map of meaning', render: (s, apply) => <ProjectionMap out={run.out} index={run.index} onProbe={() => s.probed || apply({ ...s, probed: true })} /> },
  };
}
