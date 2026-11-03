// Tools in production kit: the stage every chapter shares (the shadow board, or the fingerprint table, one tab apart),
// its twin control and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the board moves
// between states through useLivingStage, a tool drags from its van's crate onto the board in the picture (HitLayer),
// and reveal steps close in. Every string is React text, or escaped (esc) by the scene before it becomes SVG.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { useLivingStage, type SceneView } from '../../lib/iso/motion';
import {
  crateBox,
  partBox,
  SHADOW_BOARD,
  shadowLabel,
  shadowPills,
  shadowMoves,
  shadowScene,
  shadowStill,
  toolPiece,
  type Shadow,
  type ShadowPart,
} from '../../components/scenes/shadowScene';
import { fact } from '../../lib/tools-in-production/facts';
import { BOARD, fingerprint, serverOf, toolOf, type ToolDef } from '../../lib/tools-in-production/tools';
import { num } from '../../lib/format';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './tools-in-production.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1000;

/** The scene's start: every van in the yard, nothing hung. */
export const EMPTY: Shadow = { vans: [], hung: [], heap: 0, pinned: [], held: [], changed: [] };

const names = (ids: string[]) => ids.map(id => serverOf(id).name).join(' and ');
/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Shadow): string {
  if (s.pass)
    return s.pass.ok
      ? `${serverOf(s.pass.to).name} let in the pass ${serverOf(s.pass.from).name} carried over.`
      : `${serverOf(s.pass.to).name} refused the pass: it was issued for ${serverOf(s.pass.from).name}.`;
  if (s.sent) return `The hidden orders were obeyed: a file flew to ${serverOf(s.sent).name}’s van.`;
  if (s.held.length)
    return `The pin held ${s.held.map(h => toolOf(h).name).join(', ')} back in its crate: its print changed.`;
  const askew = s.hung.filter(h => !h.fit);
  if (askew.length)
    return `${askew.map(h => toolOf(h.id).name).join(', ')} hangs askew: it no longer fits its outline.`;
  if (s.heap)
    return `${s.hung.length} tools hang and ${s.heap} more pile on the bench: ${num(s.tokens ?? 0)} tokens per request.`;
  if (s.hung.length)
    return `${names(s.vans)} at the dock; ${s.hung.length} tools hang${s.tokens ? `, ${num(s.tokens)} tokens loaded` : ''}.`;
  if (s.changed.length)
    return `${names([...new Set(s.changed.map(c => toolOf(c).server))])}’s seal is broken overnight.`;
  if (s.vans.length) return `${names(s.vans)} at the dock, crates sealed; the board is empty.`;
  return 'Every van waits in the yard; the board is empty.';
}

/** What the twin beside the stage offers: options to pick from, a button, and the shared handler. */
export interface Twin {
  label: string;
  /** server: the crate this option comes out of, so a drag from that crate picks it */
  options: { value: string; label: string; server?: string }[];
  button: string;
  /** the one handler the button and the drag share: applies the next state, or returns why it can't */
  act: (value: string) => string | undefined;
  /** whether a tool may be dragged from a crate onto the board */
  drag?: boolean;
}
/** A column of fingerprints in the Prints tab: the approved definitions, or a day's. */
export interface PrintCol {
  label: string;
  defs?: Record<string, ToolDef>;
}

type View = 'scene' | 'prints';

/** Each board tool's fingerprint, approved and as each column's day has it; a changed one is marked. */
function PrintsView({ cols }: { cols: PrintCol[] }) {
  const all = [{ label: 'Approved' }, ...cols];
  return (
    <figure className="tip-prints">
      <table>
        <caption>Fingerprint of each tool on the board</caption>
        <thead>
          <tr>
            <th scope="col">Tool</th>
            {all.map(c => (
              <th scope="col" key={c.label}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BOARD.map(t => {
            const ok = fingerprint(t);
            return (
              <tr key={t.id}>
                <th scope="row">
                  {serverOf(t.server).name} · {t.name}
                </th>
                {all.map(c => {
                  const p = fingerprint((c as PrintCol).defs?.[t.id] ?? t);
                  return (
                    <td key={c.label} className={p === ok ? undefined : 'changed'}>
                      {p}
                      {p !== ok && <span> changed</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * The chapters' stage. `scene` is the picture's state (only fields that change what it draws); `twin` is the control
 * beside the picture, whose handler the in-picture drag shares.
 */
export function ShadowStage({
  scene,
  twin,
  prints = [],
  say,
  closeUp,
}: {
  scene: Shadow;
  twin?: Twin;
  prints?: PrintCol[];
  say?: Say;
  closeUp?: string[];
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [pickd, setPick] = useState(twin?.options[0]?.value ?? '');
  const [refused, setRefused] = useState<{ why: string; on: Shadow } | null>(null);
  const [dragged, setDragged] = useState<{ tool: string; server: string } | null>(null);
  const chosen = twin?.options.find(o => o.value === pickd) ?? twin?.options[0];
  const stage = useLivingStage({
    scene: shadowScene,
    state: { ...scene, say, bare: true },
    moves: shadowMoves,
    ms: MOTION_MS,
    board: SHADOW_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p as ShadowPart, s),
    phone,
    lift: (s, v) => ({
      still: shadowStill(s, v),
      piece: dragged ? toolPiece(dragged.tool, dragged.server) : '',
    }),
  });
  const s = stage.state;
  const pills = () => shadowPills(s, stage.view as SceneView, stage.t < 1 && shadowMoves(stage.prev, s));
  const crates = twin?.drag ? s.vans.filter(id => twin.options.some(o => !o.server || o.server === id)) : [];
  const hits: Hit[] = [
    ...crates.map(id => ({ part: `crate:${id}`, at: crateBox(id), kind: 'drag' as const })),
    { part: 'board', at: partBox('board'), kind: 'drop' },
  ];
  /** the option a drag from this crate carries: the one picked if it comes from there, else the first that does */
  const fromCrate = (srv: string) =>
    chosen && (!chosen.server || chosen.server === srv) ? chosen : twin?.options.find(o => o.server === srv);

  const act = (part: string, to?: string | null) => {
    if (!twin) return;
    const srv = part.startsWith('crate:') ? part.slice(6) : null;
    const o = srv ? fromCrate(srv) : chosen;
    let why: string | undefined;
    if (!o) why = `Nothing to hang from ${serverOf(srv!).name}’s crate in this step.`;
    else if (srv && to !== undefined && to !== 'board') why = 'Drop the tool on the board to hang it.';
    else why = twin.act(o.value);
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);

  return (
    <div className="tc-stage tip-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'prints'} onClick={() => setView('prints')}>
          Prints
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={SHADOW_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={shadowLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer board={SHADOW_BOARD} art={pills} prefix="tip-pill-" />
            {crates.length > 0 && (
              <HitLayer
                board={SHADOW_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to === 'board'}
                onDrag={d => {
                  const srv = d?.part.slice(6);
                  const o = srv ? fromCrate(srv) : undefined;
                  setDragged(
                    o && srv ? { tool: o.server ? o.value : BOARD.find(t => t.server === srv)!.id, server: srv } : null,
                  );
                  stage.onDrag(d);
                }}
                pulse={closeUp?.join() ?? twin?.options.map(o => o.value).join()}
              />
            )}
          </IsoStage>
        ) : (
          <PrintsView cols={prints} />
        )}
      </div>
      {twin && (
        <div className="tip-twin">
          <Select value={chosen?.value ?? ''} onChange={e => setPick(e.target.value)} aria-label={twin.label}>
            {twin.options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <button type="button" className="big" onClick={() => act('twin')}>
            {twin.button}
          </button>
        </div>
      )}
      <p className="tc-caption tip-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/tools-in-production/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy's numbers: hand-set sizes, a word-matching search, a hand-written run. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A toy workshop: the servers are made up, tool sizes are hand-set tokens, and a word-matching search stands in for a
    real one.{children && <> {children}</>}
  </p>
);

/** The tool options a twin offers: board tools, each from its server's crate. */
export const toolOptions = (ids: string[]) =>
  ids.map(id => ({
    value: id,
    label: `${serverOf(toolOf(id).server).name} · ${toolOf(id).name}`,
    server: toolOf(id).server,
  }));
