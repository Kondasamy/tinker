// Pieces the rate-limits chapters share: the stage (the rain barrel, or the Requests chart, one at a time) with its
// time slider, and the live barrel's flood controls (KTD8: hold to flood, capped at 20 a second and 200 a hold, with
// release or pointer-cancel stopping it; Send 10 beside it for click, Enter, Space and assistive tech; a range for the
// drip; one polite read-out that names the first 429 once). With reduced motion only Send 10 shows. Every string is
// React text here; the barrel escapes its pills (esc), and the chart's words are text nodes.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { LIVE, clock, liveOf, runOf, type Run } from '../../lib/rate-limits/sim';
import { retryAfterS } from '../../lib/rate-limits/bucket';
import { fact } from '../../lib/rate-limits/facts';
import {
  BARREL_BOARD,
  barrelAt,
  barrelLabel,
  barrelReadouts,
  barrelScene,
  type BarrelOpts,
} from '../../components/scenes/barrelScene';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './rate-limits.css';

/** Whether the reader asked for less motion (live, so a change of setting shows at once). */
export function useReduced() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'),
      f = () => setR(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return r;
}

// ---- the Requests tab ----

/** Requests a second over the run up to t: served, turned away (429) and failed at a fallen server, as stacked bars. */
export function RequestsView({ run, t }: { run: Run; t: number }) {
  const secs = Math.max(1, Math.ceil(run.ms / 1000)),
    from = Math.max(0, secs - 60);
  const bins = Array.from({ length: secs - from }, () => ({ ok: 0, limited: 0, down: 0 }));
  for (const h of run.hits) {
    const i = Math.floor(h.at / 1000) - from;
    if (h.at <= t && i >= 0 && i < bins.length) bins[i][h.verdict]++;
  }
  const top = Math.max(10, ...bins.map(b => b.ok + b.limited + b.down)),
    W = 320,
    H = 170,
    bw = W / bins.length;
  const tot = bins.reduce((a, b) => ({ ok: a.ok + b.ok, limited: a.limited + b.limited, down: a.down + b.down }), {
    ok: 0,
    limited: 0,
    down: 0,
  });
  const y = (n: number) => (n / top) * (H - 20);
  return (
    <figure className="rl-chart">
      <svg
        viewBox={`0 0 ${W} ${H + 18}`}
        role="img"
        aria-label={`Requests each second up to ${clock(t)}: ${tot.ok} served, ${tot.limited} turned away with 429, ${tot.down} failed at a fallen server.`}
      >
        {bins.map((b, i) => {
          const x = i * bw + 0.5,
            w = Math.max(1, bw - 1);
          let base = H;
          return (
            <g key={i} data-second={i + from}>
              {(['ok', 'limited', 'down'] as const).map(k => {
                const h = y(b[k]);
                base -= h;
                return h > 0 ? <rect key={k} className={`rl-${k}`} x={x} y={base} width={w} height={h} /> : null;
              })}
            </g>
          );
        })}
        <line className="rl-now" x1={(t / 1000 - from) * bw} x2={(t / 1000 - from) * bw} y1={0} y2={H} />
        <line className="rl-axis" x1={0} x2={W} y1={H} y2={H} />
        <text x={0} y={H + 14}>
          {clock(from * 1000)}
        </text>
        <text x={W} y={H + 14} textAnchor="end">
          {clock(secs * 1000)}
        </text>
        <text x={W} y={10} textAnchor="end">
          {`${top} a second`}
        </text>
      </svg>
      <figcaption>
        <span className="rl-key rl-ok">Served {tot.ok}</span>
        <span className="rl-key rl-limited">429 {tot.limited}</span>
        {tot.down > 0 && <span className="rl-key rl-down">Server down {tot.down}</span>}
      </figcaption>
    </figure>
  );
}

// ---- the time slider ----

/** A range over the trace's clock: arrow keys step it, Page keys jump; the picture follows. */
export function TimeRange({
  t,
  ms,
  step = 100,
  onTime,
}: {
  t: number;
  ms: number;
  step?: number;
  onTime: (t: number) => void;
}) {
  return (
    <div className="rl-time">
      <label htmlFor="rl-time">{`Time: ${clock(t)}`}</label>
      <input
        id="rl-time"
        type="range"
        min={0}
        max={ms}
        step={step}
        value={t}
        aria-valuetext={clock(t)}
        onChange={e => onTime(Number(e.target.value))}
      />
    </div>
  );
}

// ---- the live barrel ----

/** What a chapter keeps for the live barrel: when each request was sent (ms after `t0`), and the drip. */
export interface Live {
  t0: number;
  sent: number[];
  drip: number;
}
export const NO_LIVE: Live = { t0: 0, sent: [], drip: LIVE.drip };
const HOLD_EVERY = 50,
  HOLD_MAX = 200,
  KEEP = 400;
/** The live run as of now. */
export const liveRun = (l: Live, now: number) => runOf(liveOf(l.sent, l.drip, now - (l.t0 || now)));
/** Live counts for predicates, read off the same run the barrel draws. */
export function liveCounts(l: Live, now = Date.now()) {
  const r = liveRun(l, now);
  return {
    sent: r.hits.length,
    ok: r.hits.filter(h => h.verdict === 'ok').length,
    limited: r.hits.filter(h => h.verdict === 'limited').length,
  };
}

/** The flood controls: Hold to flood (pointer, or Space held), Send 10, and the drip range; the read-out announces the
 * first 429 once, and each burst's tally when it ends. */
export function FloodControls({ live, onLive }: { live: Live; onLive: (l: Live) => void }) {
  const reduced = useReduced();
  const cur = useRef(live);
  cur.current = live;
  const hold = useRef<{ id: number; n: number } | null>(null);
  const [said, setSaid] = useState('');
  const first429 = useRef<boolean | null>(null);
  if (first429.current === null) first429.current = liveCounts(live).limited > 0;
  const send = (times: number[]) => {
    const l = cur.current,
      t0 = l.t0 || Date.now(),
      next = { ...l, t0, sent: [...l.sent, ...times.map(at => at - t0)].slice(-KEEP) };
    cur.current = next;
    onLive(next);
    return next;
  };
  // the burst is the last n requests: counting by index from before it breaks once KEEP trims the oldest
  const report = (n: number, after: Live) => {
    const r = liveRun(after, Date.now()),
      mine = r.hits.slice(-n);
    const ok = mine.filter(h => h.verdict === 'ok').length,
      no = mine.length - ok;
    let msg = `Sent ${mine.length}: ${ok} served, ${no} turned away.`;
    if (no && !first429.current) {
      first429.current = true;
      const h = mine.find(x => x.verdict === 'limited')!;
      msg = `First 429: the barrel is empty. Retry after ${retryAfterS(h.waitMs!)} s. ${msg}`;
    }
    setSaid(msg);
  };
  const stop = () => {
    const h = hold.current;
    if (!h) return;
    clearInterval(h.id);
    hold.current = null;
    if (h.n) report(h.n, cur.current);
  };
  const start = () => {
    if (hold.current) return;
    const h = { id: 0, n: 0 };
    hold.current = h;
    const tick = () => {
      if (h.n >= HOLD_MAX) return stop();
      h.n++;
      send([Date.now()]);
    };
    tick();
    h.id = window.setInterval(tick, HOLD_EVERY);
  };
  useEffect(() => stop, []);
  const key = (e: KeyboardEvent, down: boolean) => {
    if (e.key !== ' ') return;
    e.preventDefault();
    if (down && !e.repeat) start();
    if (!down) stop();
  };
  return (
    <div className="rl-flood">
      <div className="rl-buttons">
        {!reduced && (
          <button
            type="button"
            className="chip rl-hold"
            onPointerDown={e => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onKeyDown={e => key(e, true)}
            onKeyUp={e => key(e, false)}
            onBlur={stop}
          >
            Hold to flood
          </button>
        )}
        <button
          type="button"
          className="chip"
          onClick={() => {
            const now = Date.now();
            report(10, send(Array.from({ length: 10 }, () => now)));
          }}
        >
          Send 10
        </button>
      </div>
      <div className="rl-range">
        <label htmlFor="rl-drip">{`Drip: ${live.drip} a second`}</label>
        <input
          id="rl-drip"
          type="range"
          min={0}
          max={LIVE.drips.length - 1}
          step={1}
          value={Math.max(0, LIVE.drips.indexOf(live.drip))}
          aria-valuetext={`${live.drip} a second`}
          onChange={e => onLive({ ...cur.current, drip: LIVE.drips[Number(e.target.value)] })}
        />
      </div>
      <p className="rl-said" role="status">
        {said}
      </p>
    </div>
  );
}

/** Re-render on a beat while the barrel refills, so the drip shows (a level, not an animation). */
function useBeat(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set(n => n + 1), 250);
    return () => clearInterval(id);
  }, [on]);
}

// ---- the stage ----

export type View = 'scene' | 'requests';
/** What a chapter puts on the stage: a run read at time t, or the live barrel; and the caption. */
export interface Shown {
  run?: Run;
  t?: number;
  /** the Requests tab shows the whole run, not just up to t */
  whole?: boolean;
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the barrel (default) or the Requests chart, one at a time; the time slider under it when the
 * chapter passes `onTime`; the flood controls when it passes `live`. */
export function RateStage({
  show,
  view: kept,
  onView,
  say,
  onTime,
  step,
  live,
  onLive,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the barrel (BARREL_PARTS) */
  say?: Say;
  onTime?: (t: number) => void;
  step?: number;
  live?: Partial<Live>;
  onLive?: (l: Live) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const l = live ? { ...NO_LIVE, ...live } : null;
  const now = Date.now();
  const run = l ? liveRun(l, now) : show.run,
    t = l ? run!.ms : (show.t ?? 0);
  const scene: BarrelOpts | null = run ? { ...barrelAt(run, t), say, scale } : null;
  // the live barrel refills between presses (and the last second's couriers leave): redraw it until it settles
  useBeat(!!l && !!scene && (scene.barrels.some(b => b.level < b.size) || scene.served + scene.refused > 0));
  return (
    <div className="tc-stage rl-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'requests'}
          disabled={!run}
          onClick={() => setView('requests')}
        >
          Requests
        </button>
      </div>
      <div className="tc-frame">
        {view === 'requests' && run ? (
          <RequestsView run={run} t={show.whole ? run.ms : t} />
        ) : (
          scene && (
            <IsoStage
              className="barrel"
              board={BARREL_BOARD}
              style={FILL}
              scene={barrelScene(scene)}
              label={barrelLabel(scene)}
            />
          )
        )}
      </div>
      {onTime && run && <TimeRange t={t} ms={run.ms} step={step} onTime={onTime} />}
      {l && onLive && <FloodControls live={l} onLive={onLive} />}
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        {scene && <span className="lbl">{barrelReadouts(scene).join(' · ')}</span>}
      </p>
    </div>
  );
}

/** A labelled range over a few values (barrel size, drip). */
export function Pick({
  id,
  name,
  value,
  values,
  unit,
  onChange,
}: {
  id: string;
  name: string;
  value: number;
  values: number[];
  unit: string;
  onChange: (v: number) => void;
}) {
  const i = Math.max(0, values.indexOf(value)),
    text = `${value} ${unit}`;
  return (
    <div className="rl-range">
      <label htmlFor={id}>{`${name}: ${text}`}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={i}
        aria-valuetext={text}
        onChange={e => onChange(values[Number(e.target.value)])}
      />
    </div>
  );
}

/** A cited fact from data/rate-limits/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever the simulator's counts appear (R6). */
export const SimNote = () => (
  <p className="note rl-note">
    A simulated stock API over hand-made traffic: Larkspur’s partners and a hand-set server limit, not recorded traffic.
  </p>
);
