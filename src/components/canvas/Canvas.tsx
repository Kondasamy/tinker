// The shared block canvas (U6): guided track and free workbench over one CanvasState, driven by the engine.
// Controlled: the host (StepRunner stage or a page) owns the state and passes onChange.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import IsoStage, { stageFrame, type SceneCtx, type Zoom } from '../../lib/iso/IsoStage';
import {
  BLOCKS,
  BH,
  HALF,
  CELL,
  ACC,
  renderers,
  blockShadow,
  blockTag,
  calloutTag,
  type BlockType,
} from '../../lib/iso/blocks';
import {
  INK,
  PALS,
  byDepth,
  pd,
  on,
  PZ,
  P,
  Dv,
  txM,
  rrUV,
  ink,
  cyl,
  rod,
  METAL,
  toneI,
  ease,
  withFrame,
  unrotXY,
} from '../../lib/iso/core.js';
import { openIndex, type RagIndex } from '../../lib/rag/load';
import { createSession } from '../../lib/rag/engine';
import {
  analyse,
  graphOf,
  outcome,
  openBench,
  type CanvasQuestion,
  type CanvasState,
  type Edge,
  type Outcome,
} from './state';
import { trackLayout, TRACK_BOARD, BAYS, type Placed } from './track';
import { BENCH_BOARD, COLS, ROWS, addNode, cellAt, connect, cut, moveNode, removeNode, validTargets } from './bench';
import Knobs, { BLOCK_KNOBS } from './Knobs';
import { LOAD_FAILED, VERDICT_LABEL } from '../panels/logic';
import type { Say } from '../story/steps';
import './canvas.css';
import Select from '../story/Select';

export interface CanvasProps {
  state: CanvasState;
  onChange: (next: CanvasState) => void;
  question: CanvasQuestion;
  /** block the current step is about: drawn with a soft ring */
  focus?: string;
  /** the step's callout, pinned above a block on the board (KTD7) */
  say?: Say;
  /** this chapter's number: the track outlines only the blocks it adds */
  chapter?: number;
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
    (indexP ??= openIndex()).then(
      index => live && setSt({ index, failed: false }),
      () => {
        indexP = null;
        if (live) setSt({ index: null, failed: true });
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return st;
}

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = matchMedia('(max-width: 600px)'),
      f = () => setNarrow(m.matches);
    f();
    m.addEventListener('change', f);
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
// the verdict rides in the model's own name pill (KTD6), coloured like its screen
const VERDICT_FILL = { ok: 'var(--mint-l)', bad: 'var(--tomato-l)', warn: 'var(--mustard-l)' } as const;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const C30 = Math.cos(Math.PI / 6),
  S30 = 0.5;
const ZOOM_MAX = 3;
/** Animate a number from `from` to `to` in ms with the engine's ease; reduced motion jumps. Returns a cancel. */
function tween(from: number, to: number, ms: number, set: (v: number) => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    set(to);
    return () => {};
  }
  let raf = 0;
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    set(from + (to - from) * ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
const name = (t: BlockType) => BLOCKS[t].name;
const sameEdge = (a: Edge, b: Edge) => a[0] === b[0] && a[1] === b[1];

function statOf(t: BlockType, s: CanvasState, o: Outcome | null, index: RagIndex | null) {
  const k = s.knobs;
  switch (t) {
    case 'docs':
      return index ? `${index.corpus.length} DOCS` : '';
    case 'chunker':
      return o?.chunks != null ? `${o.chunks} CHUNKS` : '…';
    case 'embedder':
      return index ? `${index.manifest.models.embedding.dims} DIMS` : '';
    case 'index':
      return o?.chunks != null ? `${o.chunks} VECTORS` : '';
    case 'retriever':
      return `TOP ${k.topK}`;
    case 'rewrite':
      return k.rewrite === null ? 'AS ASKED' : 'REWRITTEN';
    case 'reranker':
      return k.rerank ? 'ON' : 'OFF';
    case 'assembler':
      return `${o?.record?.context.length ?? 0} CHUNKS`;
    case 'agent':
      return `${k.maxCalls} CALLS`;
    case 'graph':
      return `${k.hops} HOP${k.hops === 1 ? '' : 'S'}`;
    case 'llm':
      return o?.answer ? VERDICT_LABEL[o.answer.verdict] : '';
    default:
      return '';
  }
}

const floorText = (x: number, y: number, s: string, size: number) => {
  // runs along the pad's -y edge, flipped as the view turns so it never reads backwards
  const o = P(x, y, BH + 0.2);
  let u = Dv(0, -1, 0),
    v = Dv(1, 0, 0);
  if (u[0] < 0) u = u.map(t => -t);
  if (u[0] * v[1] - u[1] * v[0] < 0) v = v.map(t => -t);
  return `<text transform="${txM(o, u, v)}" font-size="${size}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${INK}" opacity=".55">${s}</text>`;
};
/** L-shaped run along the board, x first then y; the agent loop's two legs sit apart so both read. */
function wirePts(a: Placed, b: Placed, [from, to]: Edge) {
  const dx = from === 'agent' && to === 'retriever' ? 9 : from === 'retriever' && to === 'agent' ? -9 : 0;
  return [
    [a.x + dx, a.y, BH + 0.3],
    [b.x + dx, a.y, BH + 0.3],
    [b.x + dx, b.y, BH + 0.3],
  ];
}

export default function Canvas({
  state: s,
  onChange,
  question,
  focus,
  say,
  chapter,
  panel = true,
  allowBench = false,
  onInspect,
  onResult,
  label = 'RAG pipeline',
}: CanvasProps) {
  const { index, failed } = useRagIndex();
  const narrow = useNarrow();
  const bench = s.mode === 'bench',
    editable = bench && !narrow;
  const [tick, setTick] = useState(0);
  // camera only (no effect on the run): view = quarter turns about the board's centre, zoom about a point
  const [view, setView] = useState(0);
  const [zoom, setZoom] = useState<Zoom>({ k: 1, u: 0.5, v: 0.5 });
  const stopTurn = useRef(() => {});
  const turnTo = (to: number) => {
    stopTurn.current();
    stopTurn.current = tween(view, to, 450, setView);
  };
  const zoomBy = (f: number, u = zoom.u, v = zoom.v) =>
    setZoom({ k: Math.min(ZOOM_MAX, Math.max(1, zoom.k * f)), u, v });
  useEffect(() => () => stopTurn.current(), []);
  const session = useMemo(() => index && createSession(index, () => setTick(t => t + 1)), [index]);
  // keyed on what reaches the engine, so selecting a block does not re-run retrieval
  const out = useMemo(
    () => (index && session ? outcome(index, session, s, question) : null),
    [index, session, s.unlocked, s.knobs, s.bench, s.mode, question, tick],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const g = graphOf(s);
  const analysis = out?.analysis ?? analyse(g);

  useEffect(() => {
    if (out) onResult?.(out);
  }, [out]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [running, setRunning] = useState(false); // passages ride the live wires while the pulse runs
  useEffect(() => {
    const first = !lastKey.current;
    if (runKey === lastKey.current) return;
    lastKey.current = runKey;
    const el = wrap.current;
    if (first || !el) return;
    el.classList.remove('run');
    void el.offsetWidth;
    el.classList.add('run');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setRunning(true);
    const t = setTimeout(() => {
      el.classList.remove('run');
      setRunning(false);
    }, 1900);
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
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 600);
      setMorph(t < 1 ? t : null);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    setMorph(0);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setMorph(null);
    };
  }, [s.mode]);

  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    id: BlockType;
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null>(null);
  const [orbit, setOrbit] = useState<{ cx: number; cy: number; view: number; zoom: Zoom } | null>(null);
  const [wiring, setWiring] = useState<{ from: BlockType; x: number; y: number } | null>(null);

  const track = trackLayout(s.unlocked);
  let nodes = g.nodes;
  if (bench && morph !== null) {
    const e = ease(morph);
    nodes = nodes.map(n => {
      const a = track.nodes.find(m => m.id === n.id) ?? n;
      return { ...n, x: a.x + (n.x - a.x) * e, y: a.y + (n.y - a.y) * e };
    });
  }
  if (drag?.moved) nodes = nodes.map(n => (n.id === drag.id ? { ...n, x: drag.x, y: drag.y } : n));
  const board = bench ? BENCH_BOARD : TRACK_BOARD;
  const fr = stageFrame(board, view);
  const byId = Object.fromEntries(nodes.map(n => [n.id, n])) as Record<BlockType, Placed>;

  const scene = ({ top }: SceneCtx) => {
    let svgS = '';
    if (bench) {
      for (let i = 1; i < COLS; i++)
        svgS += ink(
          pd(
            on(PZ(BH + 0.1), [
              [i * CELL, 0],
              [i * CELL, ROWS * CELL],
            ]),
            false,
          ),
          0.4,
        );
      for (let j = 1; j < ROWS; j++)
        svgS += ink(
          pd(
            on(PZ(BH + 0.1), [
              [0, j * CELL],
              [COLS * CELL, j * CELL],
            ]),
            false,
          ),
          0.4,
        );
    } else {
      for (const p of track.pads.filter(p => chapter === undefined || p.chapter === chapter)) {
        svgS += `<path d="${pd(on(PZ(BH + 0.2), rrUV(p.x - HALF, p.y - HALF, p.x + HALF, p.y + HALF, 4)))}" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>`;
        svgS += floorText(p.x - 4, p.y, BLOCKS[p.id].label, 4.6) + floorText(p.x + 5, p.y, `CHAPTER ${p.chapter}`, 3.8);
      }
    }
    svgS += nodes.map(n => blockShadow(n.id, n.x, n.y, top)).join('');
    // cards start one after another but all finish inside the 1.9 s run, however long the live path
    const stagger = Math.min(0.2, 0.9 / Math.max(1, analysis.live.length - 1));
    for (const e of g.edges) {
      const a = byId[e[0]],
        b = byId[e[1]];
      if (!a || !b) continue;
      const d = pd(wirePts(a, b, e), false),
        live = analysis.live.some(l => sameEdge(l, e));
      svgS += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      svgS += `<path d="${d}" fill="none" stroke="${live ? ACC : '#cfc8b8'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${live ? ' class="glow"' : ''}/>`;
      if (live)
        svgS += `<path d="${d}" fill="none" stroke="#fffbe6" stroke-width="2" stroke-linecap="round" class="pulse"/>`;
      // a passage card, no words on it, rides each live wire in turn (KTD6)
      if (live && running)
        svgS += `<rect class="passage" x="-6" y="-4" width="12" height="8" rx="1.5" fill="#fffbe6" stroke="${INK}" stroke-width="1" style="offset-path: path('${d}'); animation-delay: ${stagger * analysis.live.findIndex(l => sameEdge(l, e))}s"/>`;
      if (editable)
        svgS += `<path d="${d}" class="wire-hit" data-edge="${e[0]}>${e[1]}" fill="none" stroke="transparent" stroke-width="10" tabindex="0" role="button" aria-label="Wire from ${name(e[0])} to ${name(e[1])}${live ? ', carrying data' : ''}. Press Delete to cut."/>`;
    }
    const f = focus && byId[focus as BlockType];
    if (f)
      svgS += `<path class="focus-ring" d="${pd(on(PZ(BH + 0.3), rrUV(f.x - HALF - 7, f.y - HALF - 7, f.x + HALF + 7, f.y + HALF + 7, 7)))}" fill="none" stroke="${ACC}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    const llmState = out?.answer ? LLM_STATE[out.answer.verdict] : undefined;
    svgS += byDepth(
      nodes.map(n => {
        const ht = BLOCKS[n.id].ht;
        const port = editable
          ? // on a post from the board: the blocks' silhouettes leave the top corner open
            `<g class="port" data-port="${n.id}">${rod([n.x + HALF - 5, n.y - HALF + 5, BH], [n.x + HALF - 5, n.y - HALF + 5, BH + ht], 0.7, METAL, toneI, 0.7)}${cyl(n.x + HALF - 5, n.y - HALF + 5, BH + ht, BH + ht + 4, 3.4, PALS.mustard, toneI, 0.9)}</g>`
          : '';
        return {
          at: [n.x, n.y, 0],
          svg:
            renderers[n.id]({
              x: n.x,
              y: n.y,
              stat: statOf(n.id, s, out, index),
              selected: s.selected === n.id,
              lit: !!out?.record?.context.length,
              state: llmState,
            }) + port,
        };
      }),
    );
    // name pills last, over every block (hidden while a block is dragged: they would trail behind it)
    // phones: bigger pills, name only, so they stay readable without covering the board
    if (!drag?.moved)
      svgS += nodes
        .map(n => {
          // phones keep names only, except the model, whose pill carries the verdict
          const stat = narrow && n.id !== 'llm' ? '' : statOf(n.id, s, out, index);
          return blockTag(
            n.id,
            {
              x: n.x,
              y: n.y,
              stat,
              selected: s.selected === n.id,
              pill: n.id === 'llm' && llmState ? VERDICT_FILL[llmState] : undefined,
            },
            narrow ? 2 : 1,
            bench || !BAYS[n.id],
          );
        })
        .join('');
    // the step's callout; on a phone only when it stays short enough to fit
    const at = say && byId[say.block as BlockType];
    if (at && !drag?.moved && (!narrow || say.text.length <= 16))
      svgS += calloutTag(at.id, at.x, at.y, say.text, narrow ? 2 : 1);
    return svgS;
  };

  // pointer → floor coordinates (inverse of the iso projection at z = BH, then of the turn)
  const svgPt = (e: { clientX: number; clientY: number }) =>
    new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.querySelector<SVGGElement>('.iso-cam')!.getScreenCTM()!.inverse(),
    );
  const toFloor = (p: DOMPoint) => {
    const a = (p.x - fr.ox) / C30,
      b = (p.y - fr.oy + BH) / S30;
    const [x, y] = withFrame(fr, () => unrotXY((a + b) / 2, (b - a) / 2));
    return { x, y };
  };
  const clampTo = (v: number, hi: number) => Math.max(HALF, Math.min(hi - HALF, v));
  const portAt = (id: BlockType) =>
    withFrame(fr, () => {
      const n = byId[id];
      const [x, y] = P(n.x + HALF - 5, n.y - HALF + 5, BH + BLOCKS[id].ht + 4);
      return { x, y };
    });

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    const port = t.closest('[data-port]')?.getAttribute('data-port') as BlockType | undefined;
    const edge = t.closest('[data-edge]')?.getAttribute('data-edge');
    const block = t.closest('[data-block]')?.getAttribute('data-block') as BlockType | undefined;
    if (editable && port) {
      svg.current!.setPointerCapture(e.pointerId);
      const p = svgPt(e);
      setWiring({ from: port, x: p.x, y: p.y });
      return;
    }
    if (editable && edge) {
      onChange({ ...s, bench: cut(s.bench, edge.split('>') as Edge) });
      return;
    }
    if (!block) {
      // empty board: a mouse or pen drag orbits the view, or pans it when zoomed in (touch keeps scrolling the page; it has the buttons)
      if (e.pointerType !== 'touch') {
        stopTurn.current();
        svg.current!.setPointerCapture(e.pointerId);
        setOrbit({ cx: e.clientX, cy: e.clientY, view, zoom });
      }
      return;
    }
    if (s.selected !== block) onChange({ ...s, selected: block });
    if (editable) {
      svg.current!.setPointerCapture(e.pointerId);
      setDrag({ id: block, x: byId[block].x, y: byId[block].y, cx: e.clientX, cy: e.clientY, moved: false });
    }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (orbit) {
      const r = svg.current!.getBoundingClientRect(),
        z = orbit.zoom,
        clamp = (t: number) => Math.max(0, Math.min(1, t));
      // zoomed in: the board follows the pointer; otherwise a drag across the whole stage is one full turn
      if (z.k > 1)
        setZoom({
          ...z,
          u: clamp(z.u - (e.clientX - orbit.cx) / (r.width * (z.k - 1))),
          v: clamp(z.v - (e.clientY - orbit.cy) / (r.height * (z.k - 1))),
        });
      else setView(orbit.view - (4 * (e.clientX - orbit.cx)) / r.width);
    }
    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) < 4) return;
      const f = toFloor(svgPt(e));
      setDrag({ ...drag, moved: true, x: clampTo(f.x, COLS * CELL), y: clampTo(f.y, ROWS * CELL) });
    }
    if (wiring) {
      const p = svgPt(e);
      setWiring({ ...wiring, x: p.x, y: p.y });
    }
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    setOrbit(null);
    if (drag) {
      if (drag.moved) {
        const { c, r } = cellAt(drag.x, drag.y);
        onChange({ ...s, selected: drag.id, bench: moveNode(s.bench, drag.id, c, r) });
      }
      setDrag(null);
    }
    if (wiring) {
      const to = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-block]')?.getAttribute('data-block') as
        | BlockType
        | undefined;
      if (to) onChange({ ...s, bench: connect(s.bench, wiring.from, to) });
      setWiring(null);
    }
  };

  // Every state change rewrites the svg markup, which drops focus; put it back on the same block or wire.
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const f = (e: FocusEvent) => {
      const t = e.target as Element;
      if (!svg.current?.contains(t)) {
        lastFocus.current = null;
        return;
      }
      const b = t.closest('[data-block]'),
        w = t.closest('[data-edge]');
      lastFocus.current = b
        ? `[data-block="${b.getAttribute('data-block')}"]`
        : w
          ? `[data-edge="${w.getAttribute('data-edge')}"]`
          : null;
    };
    document.addEventListener('focusin', f);
    return () => document.removeEventListener('focusin', f);
  }, []);
  useLayoutEffect(() => {
    const a = document.activeElement;
    if (lastFocus.current && (!a || a === document.body))
      svg.current?.querySelector<SVGElement>(lastFocus.current)?.focus();
  });

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    const id = t.closest('[data-block]')?.getAttribute('data-block') as BlockType | undefined;
    const edge = t.closest('[data-edge]')?.getAttribute('data-edge');
    if (id && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange({ ...s, selected: id });
    } else if (id && editable && ARROWS[e.key]) {
      e.preventDefault();
      const n = s.bench.nodes.find(m => m.id === id)!,
        [dc, dr] = ARROWS[e.key];
      onChange({ ...s, selected: id, bench: moveNode(s.bench, id, n.c + dc, n.r + dr) });
    } else if (edge && editable && ['Delete', 'Backspace', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      const [a, b] = edge.split('>') as Edge;
      lastFocus.current = `[data-block="${a}"]`;
      onChange({ ...s, bench: cut(s.bench, [a, b]) });
    }
  };

  const wireFrom = wiring && portAt(wiring.from);

  return (
    <div ref={wrap} className={`canvas${panel ? ' has-panel' : ''}`} data-mode={s.mode}>
      <div className="canvas-stage">
        <IsoStage
          board={board}
          scene={scene}
          role="group"
          label={`${label}: ${bench ? 'workbench' : 'track'}`}
          svgRef={svg}
          view={view}
          zoom={zoom}
          className={[editable && 'editable', orbit && 'orbiting'].filter(Boolean).join(' ') || undefined}
          onWheel={e => {
            // pinch (or ctrl + wheel) zooms about the pointer; plain wheel keeps scrolling the page
            if (!e.ctrlKey) return;
            e.preventDefault();
            const r = svg.current!.getBoundingClientRect();
            zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {wiring && wireFrom && (
            <g className="wiring" pointerEvents="none">
              <path
                d={`M${wireFrom.x} ${wireFrom.y}L${wiring.x} ${wiring.y}`}
                stroke={INK}
                strokeWidth={2.4 * fr.inkK}
                strokeDasharray={`${4 * fr.inkK} ${3 * fr.inkK}`}
                fill="none"
              />
              <circle cx={wiring.x} cy={wiring.y} r={3 * fr.inkK} fill={ACC} stroke={INK} />
            </g>
          )}
        </IsoStage>
        <div className="view-controls" role="group" aria-label="View">
          <button type="button" className="chip" aria-label="Turn left" onClick={() => turnTo(Math.round(view) - 1)}>
            ↺
          </button>
          <button type="button" className="chip" aria-label="Turn right" onClick={() => turnTo(Math.round(view) + 1)}>
            ↻
          </button>
          <button
            type="button"
            className="chip"
            aria-label="Zoom out"
            disabled={zoom.k <= 1}
            onClick={() => zoomBy(1 / 1.5)}
          >
            −
          </button>
          <button
            type="button"
            className="chip"
            aria-label="Zoom in"
            disabled={zoom.k >= ZOOM_MAX}
            onClick={() => zoomBy(1.5)}
          >
            +
          </button>
          {(view !== 0 || zoom.k !== 1) && (
            <button
              type="button"
              className="chip"
              onClick={() => {
                turnTo(Math.round(view / 4) * 4);
                setZoom({ k: 1, u: 0.5, v: 0.5 });
              }}
            >
              Reset view
            </button>
          )}
        </div>
        <div className="canvas-bar">
          <p className="canvas-hint">
            {editable
              ? 'Drag a block to move it. Drag from its yellow knob onto another block to wire it. Click a wire to cut it.'
              : bench
                ? 'On a small screen the workbench is view-and-tweak: tap a block to tune it.'
                : narrow
                  ? 'Tap a block to tune it.'
                  : zoom.k > 1
                    ? 'Click a block to tune it. Drag the board to look around.'
                    : 'Click a block to tune it. Drag the board to turn it.'}
          </p>
          {allowBench && !bench && (
            <button type="button" className="big" onClick={() => onChange(openBench(s))}>
              Open the workbench
            </button>
          )}
          {allowBench && bench && (
            <button type="button" className="chip" onClick={() => onChange({ ...s, mode: 'track' })}>
              Back to the track
            </button>
          )}
        </div>
        <p className="canvas-status" role="status">
          {failed
            ? 'Could not load the retrieval index. Reload the page to try again.'
            : !analysis.wired
              ? 'Nothing reaches the model: there is no wire path from Docs through the Retriever to the LLM.'
              : out?.failed
                ? LOAD_FAILED
                : out?.preparing
                  ? 'Preparing these chunks…'
                  : ''}
        </p>
      </div>
      {panel && (
        <aside className="canvas-panel" aria-label="Block settings">
          <BlockSettings state={s} onChange={onChange} question={question} onInspect={onInspect} />
        </aside>
      )}
    </div>
  );
}

/** The selected block's settings: its knobs, and on the desktop workbench its wiring and the parts bin.
 * Canvas renders it beside the figure (`panel`); a chapter can render it in its step card instead. */
export function BlockSettings({
  state: s,
  onChange,
  question,
  onInspect,
}: Pick<CanvasProps, 'state' | 'onChange' | 'question' | 'onInspect'>) {
  const narrow = useNarrow();
  const editable = s.mode === 'bench' && !narrow;
  const g = graphOf(s),
    analysis = analyse(g);
  const sel = s.selected && g.nodes.some(n => n.id === s.selected) ? s.selected : null;
  const connectId = useId();
  const bin = s.unlocked.filter(t => !s.bench.nodes.some(n => n.id === t));
  return (
    <>
      {sel ? (
        <>
          <div className="settings-head">
            <h2>
              <span className="sw" style={{ background: BLOCKS[sel].pal.l }} />
              {name(sel)}
            </h2>
            <button
              type="button"
              className="chip"
              aria-label={`Close ${name(sel)} settings`}
              onClick={() => onChange({ ...s, selected: null })}
            >
              ×
            </button>
          </div>
          {!analysis.used.includes(sel) && analysis.wired && (
            <p className="note">Not on a live wire, so its settings have no effect.</p>
          )}
          {NOTES[sel] && <p className="note">{NOTES[sel]}</p>}
          {BLOCK_KNOBS[sel] && <Knobs names={BLOCK_KNOBS[sel]!} state={s} onChange={onChange} question={question} />}
          {editable && (
            <>
              <div className="knob">
                <label htmlFor={connectId}>Connect to…</label>
                <Select
                  id={connectId}
                  value=""
                  onChange={e =>
                    e.target.value && onChange({ ...s, bench: connect(s.bench, sel, e.target.value as BlockType) })
                  }
                >
                  <option value="">Choose a block</option>
                  {validTargets(s.bench, sel).map(t => (
                    <option key={t} value={t}>
                      {name(t)}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                className="chip"
                onClick={() => onChange({ ...s, selected: null, bench: removeNode(s.bench, sel) })}
              >
                Remove from bench
              </button>
            </>
          )}
          {onInspect && (
            <button type="button" className="chip" onClick={() => onInspect(sel)}>
              Inspect
            </button>
          )}
        </>
      ) : (
        <p className="note">{narrow ? 'Tap' : 'Select'} a block to tune it.</p>
      )}
      {editable && bin.length > 0 && (
        <div className="bin" role="group" aria-label="Parts bin">
          <span className="lbl">Parts bin</span>
          {bin.map(t => (
            <button
              key={t}
              type="button"
              className="chip"
              onClick={() => onChange({ ...s, selected: t, bench: addNode(s.bench, t) })}
            >
              + {name(t)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
