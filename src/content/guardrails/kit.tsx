// Pieces the guardrails chapters share: the stage (the back office with its mail room and defences, or the run as lanes)
// and its caption. Emails carry attacker text, so every string from a run is React text here; the drawings escape
// theirs (esc) before they become SVG.
import { useMemo, useState } from 'react';
import { STAMP_CLASS } from '../../lib/iso/flat';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import { GUARD_BOARD, guardLabel, guardReadouts, guardScene, guardState, type GuardOpts } from '../../components/scenes/guardScene';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import type { Run, Setup } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { openMessage, useNarrow } from '../tool-calling/kit';
import './guardrails.css';

export { Chips, Group } from '../agents/kit';

/** The props a chapter turns on: everything in GuardOpts but the run, the step and the drawing's own settings. */
export type GuardProps = Omit<GuardOpts, 'run' | 'upTo' | 'host' | 'scale'>;

/** The defences a setup turns on, as props. `legs` (chapter 4) is the chapter's choice, not a setting. */
export const guardProps = (s: Partial<Setup>, legs = false): GuardProps => ({
  screen: (s.threshold ?? null) !== null || !!s.inputPolicy || s.remove === 'untrusted',
  allow: !!s.allow, taint: !!s.taint, remove: s.remove ?? 'none', legs,
});

export type View = 'scene' | 'seq';
const FILL = { height: '100%' };   // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the mail room (default) or the same run as lanes, one at a time. `upTo` is the number of run
 * steps shown; the last one is the current step. The tab is the reader's view, kept out of saved progress unless the
 * chapter passes `view` and `onView` to keep it in its step state. */
export function GuardStage({ run, upTo, props = {}, host = 'Host app', inspect, view: kept, onView }:
  { run: Run; upTo: number; props?: GuardProps; host?: string; inspect: (panel: string, sheet?: boolean) => void; view?: View; onView?: (v: View) => void }) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own, setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const msgs = useMemo(() => guardMessages(run), [run]), lanes = useMemo(() => guardLanes(host), [host]);
  const shown = Math.min(upTo, msgs.length), opts: GuardOpts = { ...props, run, upTo: shown, host, scale };
  const m = msgs[shown - 1], name = (id: string) => lanes.find(l => l.id === id)?.name ?? id;
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>Picture</button>
        <button type="button" className="chip" aria-pressed={view === 'seq'} onClick={() => setView('seq')}>Steps ({shown})</button>
      </div>
      <div className="tc-frame">
        {view === 'scene'
          ? <IsoStage className="office" board={GUARD_BOARD} style={FILL} scene={guardScene(opts)} label={guardLabel(opts)} />
          : <FlatStage lanes={lanes} msgs={msgs} upTo={shown} onPick={openMessage(inspect)} />}
      </div>
      {view === 'scene' && (
        <p className="tc-caption">
          <span className="lbl">{m ? `Step ${shown} of ${msgs.length} · ${name(m.from)}${m.to === m.from ? '' : ` → ${name(m.to)}`}` : 'Nothing sent yet.'}</span>
          {m?.stamp && <span className={`stamp ${STAMP_CLASS[m.stamp]}`}>{m.stamp}</span>}
          {guardState(opts).tag && <span className="gr-taint">From outside</span>}
          {m && <span className="txt">{m.text}</span>}
          <span className="lbl">{guardReadouts(opts).join(' · ')}</span>
        </p>
      )}
    </div>
  );
}

/** A cited fact from data/guardrails/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <a className="source" href={f.source} target="_blank" rel="noreferrer">Source: {new URL(f.source).hostname}</a> (checked {f.accessed})
    </p>
  );
}
