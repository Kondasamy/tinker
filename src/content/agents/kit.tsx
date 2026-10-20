// Pieces the agent chapters share: the stage (the back office with the agent's props, or the run as lanes) and its
// caption. Every string from a run is React text here; the drawings escape theirs (esc) before they become SVG.
import { useMemo, useState } from 'react';
import { STAMP_CLASS } from '../../lib/iso/flat';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import { AGENT_BOARD, agentLabel, agentScene, agentState, type AgentOpts } from '../../components/scenes/agentScene';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { totalTokens, type Run } from '../../lib/agents/loop';
import { fact } from '../../lib/agents/facts';
import { openMessage, useNarrow } from '../tool-calling/kit';

/** The props a chapter turns on (KTD8): everything in AgentOpts but the run, the step and the drawing's own settings. */
export type AgentProps = Omit<AgentOpts, 'run' | 'upTo' | 'host' | 'scale'>;
const n = (v: number) => v.toLocaleString('en-US');

/** The props' readouts in words, for the caption (on phones the drawing drops its prop pills; this carries them). */
export function readouts(o: AgentOpts): string[] {
  const st = agentState(o), out: string[] = [];
  if (o.gauge) out.push(`Turn ${st.turns} of ${o.gauge.steps}`,
    st.over ? `context over the ${n(o.gauge.context)}-token budget (${n(st.context)})` : `context ${n(st.context)} of ${n(o.gauge.context)} tokens`,
    `${n(totalTokens({ ...o.run, meter: o.run.meter.filter(m => m.turn < st.turns), steps: o.run.steps.slice(0, o.upTo) }))} tokens in all`);
  if (o.clipboard && st.plan) { const x = st.plan.rows.filter(r => r.struck).length; out.push(`plan ${st.plan.ticks} of ${st.plan.items} done${x ? `, ${x} struck out` : ''}`); }
  if (o.tray) out.push(st.tray.binder ? `history: 1 summary + ${st.tray.papers}` : `history: ${st.tray.papers} papers`);
  if (o.helpers && st.helpers.total) out.push(`helpers ${st.helpers.sent} of ${st.helpers.total}`);
  return out;
}

export type View = 'scene' | 'seq';
const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the back office with the agent's props (default) or the same run as lanes, one at a time.
 * `upTo` is the number of run steps shown; the last one is the current step. The tab is the reader's view, not story
 * state, so it stays out of saved progress, unless the chapter passes `view` and `onView` to keep it in its step state. */
export function AgentStage({ run, upTo, props = {}, host = 'Host app', inspect, view: kept, onView }:
  { run: Run; upTo: number; props?: AgentProps; host?: string; inspect: (panel: string, sheet?: boolean) => void; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const msgs = useMemo(() => agentMessages(run), [run]), lanes = useMemo(() => agentLanes(run, host), [run, host]);
  const shown = Math.min(upTo, msgs.length), opts: AgentOpts = { ...props, run, upTo: shown, host, scale };
  const m = msgs[shown - 1], name = (id: string) => lanes.find(l => l.id === id)?.name ?? id, say = readouts(opts);
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'seq'} onClick={() => setView('seq')}>Steps ({shown})</button>
      </div>
      <div className="tc-frame">
        {view === 'scene'
          ? <IsoStage className="office" board={AGENT_BOARD} style={FILL} scene={agentScene(opts)} label={agentLabel(opts)} />
          : <FlatStage lanes={lanes} msgs={msgs} upTo={shown} onPick={openMessage(inspect)} />}
      </div>
      {view === 'scene' && (
        <p className="tc-caption">
          <span className="lbl">{m ? `Step ${shown} of ${msgs.length} · ${name(m.from)}${m.to === m.from ? '' : ` → ${name(m.to)}`}` : 'Nothing sent yet.'}</span>
          {m?.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
          {m && <span className="txt">{m.text}</span>}
          {say.length > 0 && <span className="lbl">{say.join(' · ')}</span>}
        </p>
      )}
    </div>
  );
}

/** One chip per value; the chosen one is pressed. */
export function Chips<T extends string | number | null>({ label, values, value, name, pick }: { label: string; values: T[]; value: T; name: (v: T) => string; pick: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
      {values.map(v => <button key={String(v)} type="button" className="chip" aria-pressed={value === v} onClick={() => pick(v)}>{name(v)}</button>)}
    </div>
  );
}

/** A cited fact from data/agents/facts.json, with its source and the day it was checked (R8). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}
