// Pieces the computer-use chapters share: a run read beat by beat (each look, each click, the closing note), the stage
// (the puppet desk, or the Screen tab: the screenshot at the agent's size with its marks and, in a prediction step, the
// click-to-predict targets), the step-through button, and a cited fact. Every string is React text here; the drawings
// escape theirs (esc in screens.ts and the scene).
import { useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { PUPPET_BOARD, puppetLabel, puppetScene, type PuppetOpts } from '../../components/scenes/puppetScene';
import { run as runLoop, type Run, type Setup, type Step as LoopStep } from '../../lib/computer-use/loop';
import { BANNER, shotOf, viewOf, type View } from '../../lib/computer-use/screens';
import { RECORDING } from '../../lib/computer-use/turns';
import { fact } from '../../lib/computer-use/facts';
import { thousands } from '../../lib/multimodal/patches';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import ScreenView, { targetsOf } from './screenView';
import './computer-use.css';

export { thousands };
const cache = new Map<string, Run>();
/** A run of the recorded agent under a setup, kept per page (the same setup always plays the same). */
export function play(s: Partial<Setup> & { case: string }): Run {
  const k = JSON.stringify(s);
  if (!cache.has(k)) cache.set(k, runLoop(RECORDING, s));
  return cache.get(k)!;
}

export type Beat = Extract<LoopStep, { kind: 'look' | 'click' | 'done' }>;
export const beatsOf = (r: Run) => r.steps.filter((s): s is Beat => s.kind !== 'norecord');
/** How many beats in the run's n-th beat of a kind sits (1-based): the stage's `at` for it. */
export const nthBeat = (r: Run, kind: Beat['kind'], n: number) => {
  let seen = 0;
  return beatsOf(r).findIndex(b => b.kind === kind && ++seen === n) + 1;
};
/** The run's clicks, in order. */
export const clicksOf = (r: Run) => beatsOf(r).filter((b): b is Extract<Beat, { kind: 'click' }> => b.kind === 'click');
/** The first screen, before anything is looked at. */
export const HOME = viewOf({ screen: 'home', lines: [], plus: false });

const outcomeWords = (b: Extract<Beat, { kind: 'click' }>) =>
  b.outcome === 'refused'
    ? `The host refused: ${BANNER.host} isn’t on the allow-list.`
    : b.outcome === 'denied'
      ? 'The host asked a person first, and they said no.'
      : b.el
        ? `It lands on ${b.el.label}.`
        : 'It lands on nothing.';

/** What the stage shows `at` beats into a run (0: the first screen, nothing done yet). */
export function frameAt(r: Run, at: number) {
  const beats = beatsOf(r),
    n = Math.max(0, Math.min(at, beats.length)),
    cur = beats[n - 1];
  const looks = beats.slice(0, n).filter(b => b.kind === 'look');
  const look = looks.at(-1);
  const view: View = cur?.kind === 'click' ? cur.view : (look?.view ?? HOME);
  const click = cur?.kind === 'click' ? cur : undefined;
  const opts: Omit<PuppetOpts, 'scale' | 'say'> = {
    view,
    flash: cur?.kind === 'look',
    stale: look?.stale,
    frames: looks.map(l => l.view),
    camera: look ? `LOOK ${looks.length} · ${thousands(look.tokens)} TOKENS` : 'CAMERA',
    click: click && { real: click.real, outcome: click.outcome, label: click.el?.label },
  };
  const caption = !cur
    ? `The portal’s home page, ${shotOf(r.setup.size).w} px screenshots. Nothing done yet.`
    : cur.kind === 'look'
      ? `Look ${looks.length}: a screenshot of ${view.title}${cur.stale ? ', taken before the page changed' : ''}, ${thousands(cur.tokens)} tokens.`
      : cur.kind === 'click'
        ? `“${cur.text}” ${outcomeWords(cur)}`
        : `“${cur.text}”`;
  return { opts, caption, cur, look, click, done: n >= beats.length, total: beats.length };
}

export type CuView = 'scene' | 'screen';
const FILL = { height: '100%' };

/** The chapters' stage: the puppet desk (default) or the Screen tab, one at a time. The tab is the reader's view, kept
 * out of saved progress unless the chapter passes `view` and `onView` (prediction steps do, so the screen shows). */
export function CuStage({
  run: r,
  at,
  view: kept,
  onView,
  say,
  predict,
  caption,
  stamp,
}: {
  run: Run;
  at: number;
  view?: CuView;
  onView?: (v: CuView) => void;
  say?: Say;
  /** click-to-predict over the Screen view */
  predict?: { pick: string | null; onPick: (id: string) => void };
  caption?: string;
  stamp?: Stamp;
}) {
  const [own, setOwn] = useState<CuView>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const fr = frameAt(r, at),
    o: PuppetOpts = { ...fr.opts, scale: useNarrow() ? 2 : 1.2, say };
  return (
    <div className="tc-stage cu-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'screen'} onClick={() => setView('screen')}>
          Screen
        </button>
      </div>
      <div className="tc-frame">
        {view === 'screen' ? (
          <ScreenView
            view={fr.opts.view!}
            size={r.setup.size}
            stale={fr.opts.stale}
            aim={fr.click?.at}
            hit={fr.click && { real: fr.click.real, ok: fr.click.outcome === 'ok' && !!fr.click.el }}
            predict={predict}
          />
        ) : (
          <IsoStage
            className="puppet"
            board={PUPPET_BOARD}
            style={FILL}
            scene={puppetScene(o)}
            label={puppetLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        {stamp && <span className={`stamp ${STAMP_CLASS[stamp]}`}>{stamp}</span>}
        <span className="txt">{caption ?? fr.caption}</span>
      </p>
    </div>
  );
}

/** Steps the run one beat at a time: a look, then the click it leads to. Gone once the run has ended. */
export function StepThrough({
  r,
  at,
  onStep,
  label,
}: {
  r: Run;
  at: number;
  onStep: (n: number) => void;
  label?: string;
}) {
  const total = beatsOf(r).length;
  if (at >= total) return null;
  const next = beatsOf(r)[at];
  return (
    <button type="button" className="big" onClick={() => onStep(at + 1)}>
      {label ??
        (next.kind === 'look'
          ? 'Take a screenshot →'
          : next.kind === 'click'
            ? 'Carry out the click →'
            : 'Read the agent’s note →')}
    </button>
  );
}
/** Runs it to the end at once. */
export const RunAll = ({ r, at, onStep, label }: { r: Run; at: number; onStep: (n: number) => void; label: string }) =>
  at >= beatsOf(r).length ? null : (
    <button type="button" className="big" onClick={() => onStep(beatsOf(r).length)}>
      {label}
    </button>
  );

/** Whether a prediction (a target id, maybe merged) names the element the agent clicked. */
export const pickedRight = (pick: string | null, elId: string | undefined) =>
  pick !== null && !!elId && pick.split('+').includes(elId);
/** A prediction in words, for beside the outcome. */
export const pickWords = (v: View, pick: string | null, phone = false) =>
  pick === null
    ? 'nothing'
    : (targetsOf(v, phone).find(t => t.id === pick)?.label ?? v.els.find(e => e.id === pick)?.label ?? pick);

/** The prediction beside what happened, once the click is on screen. */
export function ClickOutcome({ v, pick, el }: { v: View; pick: string | null; el?: string }) {
  const right = pickedRight(pick, el),
    phone = useNarrow();
  return (
    <div className="feedback" role="status">
      <span className={`stamp ${right ? 'correct' : 'neutral'}`}>
        {right ? 'AS YOU PREDICTED' : 'NOT WHAT YOU PREDICTED'}
      </span>
      <p>You predicted: {pickWords(v, pick, phone)}</p>
      <p>The agent clicked: {v.els.find(e => e.id === el)?.label ?? 'nothing'}</p>
    </div>
  );
}

/** The click-to-predict step's control: says what to do in the Screen view, and shows the locked pick. */
export function PickNote({
  v,
  pick,
  onScreen,
  children,
}: {
  v: View;
  pick: string | null;
  onScreen: () => void;
  children?: ReactNode;
}) {
  const phone = useNarrow();
  return (
    <div className="cu-pick">
      {pick === null ? (
        <button type="button" className="chip" onClick={onScreen}>
          Open the Screen view
        </button>
      ) : (
        <p>
          <strong>You predicted: {pickWords(v, pick, phone)}</strong>
        </p>
      )}
      {children}
    </div>
  );
}

/** A cited fact from data/computer-use/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the agent's actions show (R6). */
export const RecordedNote = () => (
  <p className="cu-note">
    The agent’s actions were written for this site to show each lesson; they were not recorded from a real model. The
    screens are drawn, and the host’s steps and token counts run live in your browser.
  </p>
);
