// Named knob controls. A StepRunner step renders only the knobs it names (<Knob name="size" …/>);
// the canvas panel renders the knobs of the selected block (<Knobs names={BLOCK_KNOBS[block]} …/>).
import { useId } from 'react';
import type { BlockType } from '../../lib/iso/blocks';
import { SIZES, OVERLAPS } from '../../lib/rag/lattice';
import type { CanvasQuestion, CanvasState, KnobName, Knobs as KnobValues } from './state';

/** Which block owns each knob, in panel order. */
export const BLOCK_KNOBS: Partial<Record<BlockType, KnobName[]>> = {
  chunker: ['strategy', 'size', 'overlap'],
  retriever: ['topK', 'hybrid', 'filter'],
  rewrite: ['rewrite'],
  reranker: ['rerank'],
  assembler: ['order'],
  agent: ['maxCalls'],
  graph: ['hops'],
};

export interface KnobProps { name: KnobName; state: CanvasState; onChange: (next: CanvasState) => void; question: CanvasQuestion }

export function Knob({ name, state, onChange, question }: KnobProps) {
  const id = useId();
  const k = state.knobs;
  const set = <N extends KnobName>(n: N, v: KnobValues[N]) => onChange({ ...state, knobs: { ...k, [n]: v } });
  const range = (label: string, shown: string, value: number, min: number, max: number, to: (v: number) => void, step = 1) => (
    <div className="knob" data-knob={name}>
      <label htmlFor={id}>{label}<output htmlFor={id}>{shown}</output></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={shown} onChange={e => to(+e.target.value)} />
    </div>
  );
  const select = (label: string, value: string, options: [string, string][], to: (v: string) => void) => (
    <div className="knob" data-knob={name}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} disabled={options.length < 2} onChange={e => to(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  switch (name) {
    case 'strategy':
      return (
        <div className="knob" data-knob={name} role="group" aria-label="Chunker in this slot">
          <span className="lbl">Chunker in this slot</span>
          <div className="row">
            {(['fixed', 'sentence'] as const).map(v => (
              <button key={v} type="button" className="chip" aria-pressed={k.strategy === v} onClick={() => set('strategy', v)}>
                {v === 'fixed' ? 'Fixed-size' : 'Sentence'}
              </button>
            ))}
          </div>
        </div>
      );
    case 'size': {
      // the slider walks the precomputed lattice (KTD4), so every stop is a real config
      const i = Math.max(0, SIZES.findIndex(s => s >= k.size));
      return range(k.strategy === 'fixed' ? 'Chunk size' : 'Max words per chunk', `${SIZES[i]} words`, i, 0, SIZES.length - 1, v => set('size', SIZES[v]));
    }
    case 'overlap': {
      if (k.strategy !== 'fixed') return null;   // sentence chunks never overlap
      const i = Math.max(0, OVERLAPS.findIndex(o => o >= k.overlap));
      return range('Overlap', `${OVERLAPS[i]}%`, i, 0, OVERLAPS.length - 1, v => set('overlap', OVERLAPS[v]));
    }
    case 'topK':
      return range('Top-k (chunks retrieved)', String(k.topK), k.topK, 1, 10, v => set('topK', v));
    case 'hybrid':
      return range('Keyword weight', `${Math.round(k.hybrid * 100)}%`, Math.round(k.hybrid * 10), 0, 10, v => set('hybrid', v / 10));
    case 'filter':
      return select('Metadata filter', k.filter ?? '', [['', 'No filter'], ...(question.filterPresets ?? []).map(p => [p.id, p.label] as [string, string])],
        v => set('filter', v || null));
    case 'rerank':
      return (
        <div className="knob" data-knob={name}>
          <label className="check"><input type="checkbox" checked={k.rerank} onChange={e => set('rerank', e.target.checked)} /> Rerank with a cross-encoder</label>
        </div>
      );
    case 'order':
      return select('Context order', k.order, [['ranked', 'Best first'], ['edges', 'Best at both ends']], v => set('order', v as KnobValues['order']));
    case 'rewrite':
      return select('Query sent to the retriever', k.rewrite === null ? '' : String(k.rewrite),
        [['', 'As asked'], ...question.rewrites.map((r, i) => [String(i), r] as [string, string])], v => set('rewrite', v === '' ? null : +v));
    case 'maxCalls':
      return range('Max retrieval calls', String(k.maxCalls), k.maxCalls, 1, 3, v => set('maxCalls', v));
    case 'hops':
      return range('Hops from the question’s entities', String(k.hops), k.hops, 1, 3, v => set('hops', v));
  }
}

export default function Knobs({ names, ...p }: Omit<KnobProps, 'name'> & { names: KnobName[] }) {
  return <>{names.map(n => <Knob key={n} name={n} {...p} />)}</>;
}
