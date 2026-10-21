// Pieces the sandboxing chapters share: the stage (the glass room, or the run as lanes) and its caption. A planted note
// carries attacker text, so every string from a run is React text here; the drawings escape theirs (esc) before they
// become SVG.
import { useMemo, useState } from 'react';
import { STAMP_CLASS } from '../../lib/iso/flat';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import { SANDBOX_BOARD, sandboxLabel, sandboxReadouts, sandboxScene, type SandboxOpts } from '../../components/scenes/sandboxScene';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { ATTACKS, isAttack, run, type CaseId, type Run, type Setup } from '../../lib/sandboxing/loop';
import { FILES } from '../../lib/sandboxing/sandbox';
import { RECORDING } from '../../lib/sandboxing/turns';
import { fact } from '../../lib/sandboxing/facts';
import { openMessage, useNarrow } from '../tool-calling/kit';
import './sandboxing.css';

export { Chips, Group } from '../agents/kit';

/** The props a chapter turns on: everything in SandboxOpts but the run, the step and the drawing's own settings. */
export type SandboxProps = Omit<SandboxOpts, 'run' | 'upTo' | 'host' | 'scale'>;

/** The doors a setup draws, as props: the wall (sandbox on), the file door, the network door and the proxy. */
export const sandboxProps = (s: Partial<Setup>): SandboxProps => ({
  wall: !!s.sandbox,
  files: s.files ?? 'open',
  egress: s.egress ?? 'open',
  proxy: !!s.sandbox && s.secret === 'proxy',
});

export type View = 'scene' | 'seq';
const FILL = { height: '100%' };

/** The chapters' stage: the glass room (default) or the same run as lanes. `upTo` is the number of run steps shown. The
 * tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function SandboxStage({ run, upTo, props = {}, inspect, view: kept, onView }:
  { run: Run; upTo: number; props?: SandboxProps; inspect: (panel: string, sheet?: boolean) => void; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const msgs = useMemo(() => sandboxMessages(run), [run]), lanes = useMemo(() => sandboxLanes(), []);
  const shown = Math.min(upTo, msgs.length), opts: SandboxOpts = { ...props, run, upTo: shown, scale };
  const m = msgs[shown - 1], name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'seq'} onClick={() => setView('seq')}>Steps ({shown})</button>
      </div>
      <div className="tc-frame">
        {view === 'scene'
          ? <IsoStage className="office" board={SANDBOX_BOARD} style={FILL} scene={sandboxScene(opts)} label={sandboxLabel(opts)} />
          : <FlatStage lanes={lanes} msgs={msgs} upTo={shown} onPick={openMessage(inspect)} />}
      </div>
      {view === 'scene' && (
        <p className="tc-caption">
          <span className="lbl">{m ? `Step ${shown} of ${msgs.length} · ${name(m.from)}${m.to === m.from ? '' : ` → ${name(m.to)}`}` : 'Nothing run yet.'}</span>
          {m?.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
          {m && <span className="txt">{m.text}</span>}
          <span className="lbl">{sandboxReadouts(opts).join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

/** A cited fact from data/sandboxing/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}

/** Wraps f so each argument (keyed by its JSON) is computed once and kept. */
export function memo<A, R>(f: (a: A) => R): (a: A) => R {
  const m = new Map<string, R>();
  return (a) => { const k = JSON.stringify(a); if (!m.has(k)) m.set(k, f(a)); return m.get(k)!; };
}
/** One run against the merged recording, run once per setup and kept. */
export const runCached = memo((setup: Partial<Setup> & { case: CaseId }) => run(RECORDING, setup));

/** What an attack does when it works, in words; undefined for an ordinary task. */
export const says = (id: CaseId) => ATTACKS.find(a => a.case === id)?.says;
/** A case's name for a column or chip. */
export const shortName = (id: CaseId) => id[0].toUpperCase() + id.slice(1);

/** The files the sandbox can hold, for the drawer: each path, its label and (for private ones) a note. */
export function Files() {
  return (
    <div className="tc-def">
      <p className="lbl">The files in play</p>
      {FILES.map(f => (
        <p key={f.path}><strong>{f.path}</strong> — {f.label}</p>
      ))}
    </div>
  );
}

/** One cell, in words: an attack worked or was stopped; a task ran or was blocked (a false block). */
export const cellWord = (r: Run) => (isAttack(r.case) ? (r.attackMet ? 'Worked' : 'Stopped') : r.caseDone ? 'Ran' : 'Blocked');
export const bad = (r: Run) => (isAttack(r.case) ? r.attackMet : !r.caseDone);
