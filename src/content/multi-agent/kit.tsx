// Multi-agent kit: the stage every chapter shares (the switchboard, or the run's message timeline, one tab apart), its
// twin controls and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the board moves
// between states through useLivingStage, a patch cord drags from the board's coil onto a helper's desk to hire it
// (HitLayer), a tap on the board runs the job, and reveal steps close in. Every string is React text, or escaped (esc)
// by the scene before it becomes SVG.
import { useId, useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import FlatStage from '../../components/scenes/FlatStage';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { type SceneView, useLivingStage } from '../../lib/iso/motion';
import type { Lane } from '../../lib/iso/flat';
import {
  DESKS,
  SWITCH_BOARD,
  coilPlug,
  partBox,
  switchLabel,
  switchMoves,
  switchPills,
  switchScene,
  switchStill,
  type Switch,
  type SwitchPart,
} from '../../components/scenes/switchboardScene';
import { fact } from '../../lib/multi-agent/facts';
import {
  assign,
  type Brief,
  type Job,
  misread,
  money,
  ROOM,
  run,
  type Scenario,
  type Setup,
} from '../../lib/multi-agent/sim';
import { num } from '../../lib/format';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './multi-agent.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1100;

/** A catalogue's cover colour: its slice under a detailed split among k helpers, or a band of six for the lead alone. */
const colourOf = (job: Job, k: number) => (c: number) =>
  k
    ? assign(job, { helpers: k, brief: 'detailed', check: false }).sl.findIndex(x => x.includes(c))
    : Math.floor((c - 1) / 6);

/** The picture for a job run (or set up and not yet run) with these desks wired: helper i sits at wired[i - 1]. */
export function switchOf(
  job: Job,
  setup: Setup,
  ran: boolean,
  sc: Scenario = {},
  wired: number[] = DESKS.slice(0, setup.helpers),
  say?: Say,
): Switch {
  const r = run(job, setup, sc),
    k = setup.helpers,
    col = colourOf(job, k),
    { given } = assign(job, setup);
  const desk = (i: number) => (k ? wired[i] : 0);
  const piles: number[][] = [[], [], [], [], [], []];
  given.forEach((g, i) => (piles[desk(i)] = g.slice(0, ROOM).map(col)));
  const handed = new Set(given.flat());
  const cart = Array.from({ length: job.catalogues }, (_, i) => i + 1)
    .filter(c => !handed.has(c))
    .map(col);
  const spillAt = given.findIndex(g => g.length > ROOM);
  const plugs: Switch['plugs'] = {};
  for (const rep of r.replies) if (rep.desk) plugs[wired[rep.desk - 1]] = rep.kind;
  const slipped = r.replies.some(x => x.kind === 'wrong' || x.kind === 'caught') ? money(misread(job.slip)) : undefined;
  return {
    wired,
    ran,
    piles,
    cart,
    spilled: r.spilled,
    spillDesk: spillAt < 0 ? 0 : desk(spillAt),
    dup: r.dup.length ? { [wired[1]]: wired[0] } : {},
    plugs,
    hold: r.hold.map(i => wired[i - 1]),
    timer: setup.timeout ? (ran && r.timedOut ? 'rang' : 'set') : 'off',
    report: !ran ? 'none' : !r.finished ? 'waiting' : r.left ? 'gap' : r.correct ? 'done' : 'wrong',
    tokens: r.tokens,
    minutes: r.minutes,
    missing: r.left,
    slipped,
    lead: !r.finished ? 'bad' : r.correct ? 'ok' : 'warn',
    say,
  };
}

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Switch): string {
  const n = s.wired.length;
  if (!s.ran)
    return n
      ? `${n} cord${n > 1 ? 's' : ''} run from the board to helper desks; the catalogues wait on the cart.`
      : 'No helpers wired; the catalogues wait on the cart beside the lead.';
  if (s.report === 'waiting')
    return `Lamps ${s.hold.join(' and ')} blink at each other on hold, and no report reached the tray.`;
  if (!n) return `The lead read ${s.piles[0].length} catalogues; ${s.spilled} fell off its full desk unread.`;
  const dup = Object.entries(s.dup)[0];
  if (dup) return `Desk ${dup[0]} read desk ${dup[1]}’s catalogues again, and ${s.cart.length} stayed on the cart.`;
  if (s.spilled) return `Desk ${s.spillDesk} ran out of room: ${s.spilled} catalogues fell unread.`;
  const odd = DESKS.find(d => s.plugs[d] && s.plugs[d] !== 'ok');
  if (odd && s.plugs[odd] === 'bounced')
    return `Desk ${odd}’s square plug sprang back from its port, and its resent round one seated.`;
  if (odd && s.plugs[odd] === 'wrong')
    return `Desk ${odd}’s reply seated with ${s.slipped}, and the report printed it.`;
  if (odd && s.plugs[odd] === 'caught')
    return `The check set desk ${odd}’s ${s.slipped} aside; the report has the catalogue’s price.`;
  if (s.timer === 'rang')
    return `The timer rang, the lead pulled the hold cord, and the report arrived at ${s.minutes} minutes.`;
  return `Every reply seated, and the report reached Ines’s tray in ${s.minutes} minutes, ${num(s.tokens ?? 0)} tokens.`;
}

const HITS: Hit[] = [
  { part: 'cord', at: partBox('coil'), kind: 'drag' },
  { part: 'board', at: partBox('panel'), kind: 'tap' },
  ...DESKS.map(d => ({ part: `desk${d}`, at: partBox(`desk${d}` as SwitchPart), kind: 'drop' as const })),
];

/** A radio group drawn in ink, one choice per label (each at least 44 px tall on phones). */
export function Radios<T extends string | number | boolean>({
  legend,
  options,
  value,
  words = String,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  words?: (o: T) => string;
  onChange: (o: T) => void;
}) {
  const name = `mar${useId().replace(/[^\w-]/g, '')}`;
  return (
    <fieldset className="ma-field">
      <legend>{legend}</legend>
      {options.map(o => (
        <label key={String(o)}>
          <input type="radio" name={name} checked={value === o} onChange={() => onChange(o)} />
          {words(o)}
        </label>
      ))}
    </fieldset>
  );
}

type View = 'scene' | 'timeline';
export const BRIEFS: Brief[] = ['vague', 'detailed'];
const BRIEF_WORDS: Record<Brief, string> = { vague: 'One line', detailed: 'Detailed' };

/**
 * The chapters' stage. `sw` is the picture's state. `wired` and `setWired` are the desks with a cord (the drag and the
 * Helpers twin share them); `onRun` runs the job (a tap on the board, or Run). Each returns why it can't, if it can't.
 */
export function SwitchStage({
  sw,
  job,
  setup,
  sc,
  helpers,
  setWired,
  setSetup,
  onRun,
  briefs,
  checks,
  timeouts,
  extra,
  runButton = true,
  say,
  closeUp,
}: {
  sw: Switch;
  job: Job;
  setup: Setup;
  sc?: Scenario;
  /** the helper counts the reader may pick (none: helpers are fixed) */
  helpers?: readonly number[];
  setWired?: (wired: number[]) => void;
  setSetup?: (s: Setup) => void;
  onRun?: () => string | undefined;
  briefs?: boolean;
  checks?: boolean;
  timeouts?: boolean;
  extra?: ReactNode;
  /** false: no Run button (the workbench reruns on every change) */
  runButton?: boolean;
  say?: Say;
  closeUp?: string[];
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [refused, setRefused] = useState<{ why: string; on: Switch } | null>(null);
  const stage = useLivingStage({
    scene: switchScene,
    state: { ...sw, say, bare: true },
    moves: switchMoves,
    ms: MOTION_MS,
    board: SWITCH_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: p => partBox(p as SwitchPart),
    phone,
    lift: (s, v) => ({ still: switchStill(s, v), piece: coilPlug() }),
  });
  const s = stage.state;
  const max = helpers ? Math.max(...helpers) : 0;
  const say_ = (why: string | undefined) => {
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const act = (part: string, to?: string | null) => {
    if (part === 'board') return say_(onRun ? onRun() : 'Nothing to run in this step.');
    if (part !== 'cord') return;
    if (to === null || (to !== undefined && !to.startsWith('desk')))
      return say_('Drop the cord on a helper’s desk to hire them.');
    if (!setWired || !helpers) return say_('The helpers are already set in this chapter.');
    const free = DESKS.find(d => !sw.wired.includes(d));
    const d = to ? Number(to.slice(4)) : free;
    if (d === undefined) return say_('Every desk already has a cord.');
    if (sw.wired.includes(d)) return say_(`Desk ${d} already has a cord.`);
    if (sw.wired.length >= max) return say_(`This step takes at most ${max} helpers.`);
    setWired([...sw.wired, d].sort());
    return say_(undefined);
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);
  const r = run(job, setup, sc);
  const lanes: Lane[] = [
    { id: 'lead', name: 'Lead' },
    ...sw.wired.slice(0, setup.helpers).map((d, i) => ({ id: `h${i + 1}`, name: `Helper ${d}` })),
  ];

  return (
    <div className="tc-stage ma-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>
          Messages
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={SWITCH_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={switchLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer
              board={SWITCH_BOARD}
              art={() => switchPills(s, stage.view as SceneView, stage.t < 1)}
              prefix="ma-pill-"
            />
            {(onRun || setWired) && (
              <HitLayer
                board={SWITCH_BOARD}
                hits={HITS}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to.startsWith('desk') && !sw.wired.includes(Number(to.slice(4)))}
                onDrag={stage.onDrag}
                pulse={closeUp?.join() ?? sw.wired.join()}
              />
            )}
          </IsoStage>
        ) : sw.ran ? (
          <FlatStage lanes={lanes} msgs={r.msgs} />
        ) : (
          <p className="ma-none">Run the job to see its messages.</p>
        )}
      </div>
      {/* always drawn, Run included (disabled when the step has nothing to run), so the picture's frame never resizes */}
      {
        <div className="ma-twin">
          {extra}
          {helpers && setWired && (
            <Radios
              legend="Helpers"
              options={helpers}
              value={sw.wired.length}
              onChange={n => {
                setWired(DESKS.slice(0, n));
                setRefused(null);
              }}
            />
          )}
          {briefs && setSetup && (
            <Radios
              legend="Brief"
              options={BRIEFS}
              value={setup.brief}
              words={b => BRIEF_WORDS[b]}
              onChange={brief => setSetup({ ...setup, brief })}
            />
          )}
          {checks && setSetup && (
            <Radios
              legend="Check replies"
              options={[false, true] as const}
              value={setup.check}
              words={c => (c ? 'On' : 'Off')}
              onChange={check => setSetup({ ...setup, check })}
            />
          )}
          {timeouts && setSetup && (
            <Radios
              legend="Timeout"
              options={[false, true] as const}
              value={!!setup.timeout}
              words={c => (c ? 'On' : 'Off')}
              onChange={timeout => setSetup({ ...setup, timeout })}
            />
          )}
          {runButton && (
            <button type="button" className="big" disabled={!onRun} onClick={() => act('board')}>
              Run
            </button>
          )}
        </div>
      }
      <p className="tc-caption ma-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/multi-agent/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy's numbers: hand-set tokens, minutes and room, and a hand-written run. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A toy office: a hand-written example run with hand-set tokens, minutes and desk room, not a measured one.
    {children && <> {children}</>}
  </p>
);

/** A chapter's run of the board: the desks wired, the brief, checks, timeout, and whether it has run. */
export interface Run {
  wired: number[];
  brief: Brief;
  check: boolean;
  timeout: boolean;
  ran: boolean;
}
export const setupOf = (r: Run): Setup => ({
  helpers: r.wired.length,
  brief: r.brief,
  check: r.check,
  timeout: r.timeout,
});
/** A fresh run: these desks wired, a detailed brief, no checks, no timeout, not run yet. */
export const runOf = (wired: number[] = [], more: Partial<Run> = {}): Run => ({
  wired,
  brief: 'detailed',
  check: false,
  timeout: false,
  ran: false,
  ...more,
});

/** The stage for a chapter whose state is a Run: changing the setup clears the run; Run (or a tap) applies it. */
export function RunStage<S extends Run>({
  s,
  apply,
  sync,
  job,
  sc,
  helpers,
  briefs,
  checks,
  timeouts,
  extra,
  canRun = true,
  runButton,
  say,
  closeUp,
}: {
  s: S;
  apply: (s: S) => void;
  sync: (s: S) => void;
  job: Job;
  sc?: Scenario;
  helpers?: readonly number[];
  briefs?: boolean;
  checks?: boolean;
  timeouts?: boolean;
  extra?: ReactNode;
  /** whether this step lets the reader run the job (not before a prediction is locked) */
  canRun?: boolean;
  runButton?: boolean;
  say?: Say;
  closeUp?: string[];
}) {
  const setup = setupOf(s);
  return (
    <SwitchStage
      sw={switchOf(job, setup, s.ran, sc, s.wired)}
      job={job}
      setup={setup}
      sc={sc}
      helpers={helpers}
      setWired={helpers ? wired => sync({ ...s, wired, ran: false }) : undefined}
      setSetup={st => sync({ ...s, brief: st.brief, check: st.check, timeout: !!st.timeout, ran: false })}
      onRun={
        canRun
          ? () => {
              apply({ ...s, ran: true });
              return undefined;
            }
          : undefined
      }
      briefs={briefs}
      checks={checks}
      timeouts={timeouts}
      extra={extra}
      runButton={runButton}
      say={say}
      closeUp={closeUp}
    />
  );
}
