// The shared block canvas (U6): guided track and free workbench over one CanvasState, driven by the engine.
// Controlled: the host (StepRunner stage or a page) owns the state and passes onChange.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useId, type KeyboardEvent, type PointerEvent } from 'react';
import IsoStage, { frameFor, type SceneCtx } from '../../lib/iso/IsoStage';
import { BLOCKS, BH, HALF, CELL, ACC, renderers, blockShadow, type BlockType } from '../../lib/iso/blocks';
import { INK, PALS, byDepth, pd, on, PZ, P, Dv, txM, rrUV, ink, cyl, toneI, ease, withFrame } from '../../lib/iso/core.js';
import { openIndex, type RagIndex } from '../../lib/rag/load';
import { createSession } from '../../lib/rag/engine';
import { analyse, graphOf, outcome, openBench, type CanvasQuestion, type CanvasState, type Edge, type Outcome } from './state';
import { trackLayout, TRACK_BOARD, type Placed } from './track';
import { BENCH_BOARD, COLS, ROWS, addNode, cellAt, connect, cut, moveNode, removeNode, validTargets } from './bench';
import Knobs, { BLOCK_KNOBS } from './Knobs';
import './canvas.css';

export interface CanvasProps {
  state: CanvasState;
  onChange: (next: CanvasState) => void;
  question: CanvasQuestion;
  /** block the current step is about: drawn with a soft ring */
  focus?: string;
  /** knob panel for the selected block (default true). Inside a step pass false and render <Knob name=…> as step controls. */
  panel?: boolean;
  /** show "Open the workbench" / parts bin / "Back to the track" (Sandbox) */
  allowBench?: boolean;
  onInspect?: (block: BlockType) => void;
  /** every recomputed outcome: wiring analysis, run record, evidence signature, answer */
  onResult?: (o: Outcome) => void;
  label?: string;
}

let indexP: Promise<RagIndex> | null = null;
/** One index per page, shared by every canvas. */
export function useRagIndex() {
  const [st, setSt] = useState<{ index: RagIndex | null; failed: boolean }>({ index: null, failed: false });
  useEffect(() => {
    let live = true;
    (indexP ??= openIndex()).then(index => live && setSt({ index, failed: false }), () => { indexP = null; if (live) setSt({ index: null, failed: true }); });
    return () => { live = false; };
  }, []);
  return st;
}

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = matchMedia('(max-width: 600px)'), f = () => setNarrow(m.matches);
    f(); m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return narrow;
}

const NOTES: Partial<Record<BlockType, string>> = {
  docs: 'The company knowledge base the assistant can draw on.',
  embedder: 'Turns every chunk, and the question, into a vector of 384 numbers (all-MiniLM-L6-v2).',
  index: 'Stores one vector per chunk so the retriever can search them all at once.',
  llm: 'Writes the answer from whatever reaches it. Answers are pre-recorded for each kind of evidence.',
  graph: 'Entities and the relations between them, across documents.',
  grader: 'Judges each answer (correct, wrong, not found, made up) and shows it beside retrieval quality.',
};
const LLM_STATE = { correct: 'ok', wrong: 'bad', madeup: 'bad', notfound: 'warn', norecord: 'warn' } as const;
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const name = (t: BlockType) => BLOCKS[t].name;
const sameEdge = (a: Edge, b: Edge) => a[0] === b[0] && a[1] === b[1];

function statOf(t: BlockType, s: CanvasState, o: Outcome | null, index: RagIndex | null) {
  const k = s.knobs;
  switch (t) {
    case 'docs': return index ? `${index.corpus.length} DOCS` : '';
    case 'chunker': return o?.chunks != null ? `${o.chunks} CHUNKS` : '…';
    case 'embedder': return index ? `${index.manifest.models.embedding.dims} DIMS` : '';
    case 'index': return o?.chunks != null ? `${o.chunks} VECTORS` : '';
    case 'retriever': return `TOP ${k.topK}`;
    case 'rewrite': return k.rewrite === null ? 'AS ASKED' : 'REWRITTEN';
    case 'reranker': return k.rerank ? 'ON' : 'OFF';
    case 'assembler': return `${o?.record?.context.length ?? 0} CHUNKS`;
    case 'agent': return `${k.maxCalls} CALLS`;
    default: return '';
  }
}

const floorText = (x: number, y: number, s: string, size: number) => {
  const o = P(x, y, BH + .2);
  return `<text transform="${txM(o, Dv(0, -1, 0), Dv(1, 0, 0))}" font-size="${size}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${INK}" opacity=".55">${s}</text>`;
};
/** L-shaped run along the board, x first then y; the agent loop's two legs sit apart so both read. */
function wirePts(a: Placed, b: Placed, [from, to]: Edge) {
  const dx = from === 'agent' && to === 'retriever' ? 9 : from === 'retriever' && to === 'agent' ? -9 : 0;
  return [[a.x + dx, a.y, BH + .3], [b.x + dx, a.y, BH + .3], [b.x + dx, b.y, BH + .3]];
}

export default function Canvas({ state: s, onChange, question, focus, panel = true, allowBench = false, onInspect, onResult, label = 'RAG pipeline' }: CanvasProps) {
  const { index, failed } = useRagIndex();
  const narrow = useNarrow();
  const bench = s.mode === 'bench', editable = bench && !narrow;
  const [tick, setTick] = useState(0);
  const session = useMemo(() => index && createSession(index, () => setTick(t => t + 1)), [index]);
  const out = useMemo(() => (index && session ? outcome(index, session, s, question) : null), [index, session, s, question, tick]);
  const analysis = out?.analysis ?? analyse(graphOf(s));

  useEffect(() => { if (out) onResult?.(out); }, [out]); // eslint-disable-line react-hooks/exhaustive-deps
  const prefetched = useRef(false);
  useEffect(() => {
    if (!index || !out || prefetched.current) return;
    prefetched.current = true;
    index.prefetch(out.config.file).catch(() => {});
  }, [index, out]);

  // live wires pulse once after a change that moved the outcome
  const wrap = useRef<HTMLDivElement>(null);
  const runKey = out ? JSON.stringify([out.answer?.verdict, out.record?.context.map(c => c.id), analysis.live]) : '';
  const lastKey = useRef('');
  useEffect(() => {
    const first = !lastKey.current;
    if (runKey === lastKey.current) return;
    lastKey.current = runKey;
    const el = wrap.current;
    if (first || !el) return;
    el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
    const t = setTimeout(() => el.classList.remove('run'), 1900);
    return () => clearTimeout(t);
  }, [runKey]);

  // track → bench morph (prototype openBench); reduced motion jumps straight to the bench
  const [morph, setMorph] = useState<number | null>(null);
  const prevMode = useRef(s.mode);
  useLayoutEffect(() => {
    const was = prevMode.current;
    prevMode.current = s.mode;
    if (was !== 'track' || s.mode !== 'bench' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - t0) / 600); setMorph(t < 1 ? t : null); if (t < 1) raf = requestAnimationFrame(step); };
    setMorph(0);
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); setMorph(null); };
  }, [s.mode]);

  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ id: BlockType; x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const [wiring, setWiring] = useState<{ from: BlockType; x: number; y: number } | null>(null);

  const track = trackLayout(s.unlocked);
  const g = graphOf(s);
  let nodes = g.nodes;
  if (bench && morph !== null) {
    const e = ease(morph);
    nodes = nodes.map(n => { const a = track.nodes.find(m => m.id === n.id) ?? n; return { ...n, x: a.x + (n.x - a.x) * e, y: a.y + (n.y - a.y) * e }; });
  }
  if (drag?.moved) nodes = nodes.map(n => (n.id === drag.id ? { ...n, x: drag.x, y: drag.y } : n));
  const board = bench ? BENCH_BOARD : TRACK_BOARD;
  const fr = frameFor(board);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n])) as Record<BlockType, Placed>;

  const scene = ({ top }: SceneCtx) => {
    let svgS = '';
    if (bench) {
      for (let i = 1; i < COLS; i++) svgS += ink(pd(on(PZ(BH + .1), [[i * CELL, 0], [i * CELL, ROWS * CELL]]), false), .4);
      for (let j = 1; j < ROWS; j++) svgS += ink(pd(on(PZ(BH + .1), [[0, j * CELL], [COLS * CELL, j * CELL]]), false), .4);
    } else {
      for (const p of track.pads) {
        svgS += `<path d="${pd(on(PZ(BH + .2), rrUV(p.x - HALF, p.y - HALF, p.x + HALF, p.y + HALF, 4)))}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>`;
        svgS += floorText(p.x - 4, p.y, BLOCKS[p.id].label, 4.6) + floorText(p.x + 5, p.y, `CHAPTER ${p.chapter}`, 3.8);
      }
    }
    svgS += nodes.map(n => blockShadow(n.id, n.x, n.y, top)).join('');
    for (const e of g.edges) {
      const a = byId[e[0]], b = byId[e[1]];
      if (!a || !b) continue;
      const d = pd(wirePts(a, b, e), false), live = analysis.live.some(l => sameEdge(l, e));
      svgS += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      svgS += `<path d="${d}" fill="none" stroke="${live ? ACC : '#cfc8b8'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${live ? ' class="glow"' : ''}/>`;
      if (live) svgS += `<path d="${d}" fill="none" stroke="#fffbe6" stroke-width="2" stroke-linecap="round" class="pulse"/>`;
      if (editable) svgS += `<path d="${d}" class="wire-hit" data-edge="${e[0]}>${e[1]}" fill="none" stroke="transparent" stroke-width="10" tabindex="0" role="button" aria-label="Wire from ${name(e[0])} to ${name(e[1])}${live ? ', carrying data' : ''}. Press Delete to cut."/>`;
    }
    const f = focus && byId[focus as BlockType];
    if (f) svgS += `<path class="focus-ring" d="${pd(on(PZ(BH + .3), rrUV(f.x - HALF - 7, f.y - HALF - 7, f.x + HALF + 7, f.y + HALF + 7, 7)))}" fill="none" stroke="${ACC}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    const llmState = out?.answer ? LLM_STATE[out.answer.verdict] : undefined;
    svgS += byDepth(nodes.map(n => {
      const ht = BLOCKS[n.id].ht;
      const port = editable ? `<g class="port" data-port="${n.id}">${cyl(n.x + HALF - 5, n.y - HALF + 5, BH + ht, BH + ht + 4, 3.4, PALS.mustard, toneI, .9)}</g>` : '';
      return {
        at: [n.x, n.y, 0],
        svg: renderers[n.id]({ x: n.x, y: n.y, stat: statOf(n.id, s, out, index), selected: s.selected === n.id, lit: !!out?.record?.context.length, state: llmState }) + port,
      };
    }));
    return svgS;
  };

  // pointer → floor coordinates (inverse of the iso projection at z = BH)
  const svgPt = (e: PointerEvent) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
  const toFloor = (p: DOMPoint) => { const a = (p.x - fr.ox) / C30, b = (p.y - fr.oy + BH) / S30; return { x: (a + b) / 2, y: (b - a) / 2 }; };
  const clampTo = (v: number, hi: number) => Math.max(HALF, Math.min(hi - HALF, v));
  const portAt = (id: BlockType) => withFrame(fr, () => { const n = byId[id]; const [x, y] = P(n.x + HALF - 5, n.y - HALF + 5, BH + BLOCKS[id].ht + 4); return { x, y }; });

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    const port = t.closest('[data-port]')?.getAttribute('data-port') as BlockType | undefined;
    const edge = t.closest('[data-edge]')?.getAttribute('data-edge');
    const block = t.closest('[data-block]')?.getAttribute('data-block') as BlockType | undefined;
    if (editable && port) { svg.current!.setPointerCapture(e.pointerId); const p = svgPt(e); setWiring({ from: port, x: p.x, y: p.y }); return; }
    if (editable && edge) { onChange({ ...s, bench: cut(s.bench, edge.split('>') as Edge) }); return; }
    if (!block) return;
    if (s.selected !== block) onChange({ ...s, selected: block });
    if (editable) { svg.current!.setPointerCapture(e.pointerId); setDrag({ id: block, x: byId[block].x, y: byId[block].y, cx: e.clientX, cy: e.clientY, moved: false }); }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < 4) return;
      const f = toFloor(svgPt(e));
      setDrag({ ...drag, moved: true, x: clampTo(f.x, COLS * CELL), y: clampTo(f.y, ROWS * CELL) });
    }
    if (wiring) { const p = svgPt(e); setWiring({ ...wiring, x: p.x, y: p.y }); }
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (drag) {
      if (drag.moved) { const { c, r } = cellAt(drag.x, drag.y); onChange({ ...s, selected: drag.id, bench: moveNode(s.bench, drag.id, c, r) }); }
      setDrag(null);
    }
    if (wiring) {
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-block]')?.getAttribute('data-block') as BlockType | undefined;
      if (to) onChange({ ...s, bench: connect(s.bench, wiring.from, to) });
      setWiring(null);
    }
  };

  // Every state change rewrites the svg markup, which drops focus; put it back on the same block or wire.
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const f = (e: FocusEvent) => {
      const t = e.target as Element;
      if (!svg.current?.contains(t)) { lastFocus.current = null; return; }
      const b = t.closest('[data-block]'), w = t.closest('[data-edge]');
      lastFocus.current = b ? `[data-block="${b.getAttribute('data-block')}"]` : w ? `[data-edge="${w.getAttribute('data-edge')}"]` : null;
    };
    document.addEventListener('focusin', f);
    return () => document.removeEventListener('focusin', f);
  }, []);
  useLayoutEffect(() => {
    const a = document.activeElement;
    if (lastFocus.current && (!a || a === document.body)) svg.current?.querySelector<SVGElement>(lastFocus.current)?.focus();
  });

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    const id = t.closest('[data-block]')?.getAttribute('data-block') as BlockType | undefined;
    const edge = t.closest('[data-edge]')?.getAttribute('data-edge');
    if (id && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onChange({ ...s, selected: id }); }
    else if (id && editable && ARROWS[e.key]) {
      e.preventDefault();
      const n = s.bench.nodes.find(m => m.id === id)!, [dc, dr] = ARROWS[e.key];
      onChange({ ...s, selected: id, bench: moveNode(s.bench, id, n.c + dc, n.r + dr) });
    } else if (edge && editable && ['Delete', 'Backspace', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      const [a, b] = edge.split('>') as Edge;
      lastFocus.current = `[data-block="${a}"]`;
      onChange({ ...s, bench: cut(s.bench, [a, b]) });
    }
  };

  const sel = s.selected && byId[s.selected] ? s.selected : null;
  const connectId = useId();
  const bin = s.unlocked.filter(t => !s.bench.nodes.some(n => n.id === t));
  const wireFrom = wiring && portAt(wiring.from);

  return (
    <div ref={wrap} className={`canvas${panel ? ' has-panel' : ''}`} data-mode={s.mode}>
      <div className="canvas-stage">
        <IsoStage board={board} scene={scene} role="group" label={`${label}: ${bench ? 'workbench' : 'track'}`} svgRef={svg}
          className={editable ? 'editable' : undefined}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onKeyDown={onKeyDown}>
          {wiring && wireFrom && (
            <g className="wiring" pointerEvents="none">
              <path d={`M${wireFrom.x} ${wireFrom.y}L${wiring.x} ${wiring.y}`} stroke={INK} strokeWidth={2.4 * fr.inkK} strokeDasharray={`${4 * fr.inkK} ${3 * fr.inkK}`} fill="none" />
              <circle cx={wiring.x} cy={wiring.y} r={3 * fr.inkK} fill={ACC} stroke={INK} />
            </g>
          )}
        </IsoStage>
        <div className="canvas-bar">
          <p className="canvas-hint">
            {editable ? 'Drag a block to move it. Drag from its yellow knob onto another block to wire it. Click a wire to cut it.'
              : bench ? 'On a small screen the workbench is view-and-tweak: tap a block to tune it.'
              : narrow ? 'Tap a block to tune it.' : 'Click a block to tune it.'}
          </p>
          {allowBench && !bench && <button type="button" className="big" onClick={() => onChange(openBench(s))}>Open the workbench</button>}
          {allowBench && bench && <button type="button" className="chip" onClick={() => onChange({ ...s, mode: 'track' })}>Back to the track</button>}
        </div>
        <p className="canvas-status" role="status">
          {failed ? 'Could not load the retrieval index. Reload the page to try again.'
            : !analysis.wired ? 'Nothing reaches the model: there is no wire path from Docs through the Retriever to the LLM.'
            : out?.preparing ? 'Preparing these chunks…' : ''}
        </p>
      </div>
      {panel && (
        <aside className="canvas-panel" aria-label="Block settings">
          {sel ? <>
            <h2><span className="sw" style={{ background: BLOCKS[sel].pal.l }} />{name(sel)}</h2>
            {!analysis.used.includes(sel) && analysis.wired && <p className="note">Not on a live wire, so its settings have no effect.</p>}
            {BLOCK_KNOBS[sel] ? <Knobs names={BLOCK_KNOBS[sel]!} state={s} onChange={onChange} question={question} /> : <p className="note">{NOTES[sel]}</p>}
            {editable && <>
              <div className="knob">
                <label htmlFor={connectId}>Connect to…</label>
                <select id={connectId} value="" onChange={e => e.target.value && onChange({ ...s, bench: connect(s.bench, sel, e.target.value as BlockType) })}>
                  <option value="">Choose a block</option>
                  {validTargets(s.bench, sel).map(t => <option key={t} value={t}>{name(t)}</option>)}
                </select>
              </div>
              <button type="button" className="chip" onClick={() => onChange({ ...s, selected: null, bench: removeNode(s.bench, sel) })}>Remove from bench</button>
            </>}
            {onInspect && <button type="button" className="chip" onClick={() => onInspect(sel)}>Inspect</button>}
          </> : <p className="note">{narrow ? 'Tap' : 'Select'} a block to tune it.</p>}
          {editable && bin.length > 0 && (
            <div className="bin" role="group" aria-label="Parts bin">
              <span className="lbl">Parts bin</span>
              {bin.map(t => <button key={t} type="button" className="chip" onClick={() => onChange({ ...s, selected: t, bench: addNode(s.bench, t) })}>+ {name(t)}</button>)}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
