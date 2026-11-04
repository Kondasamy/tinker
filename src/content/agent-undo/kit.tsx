// Undo for agents kit: the stage every chapter shares (the funicular, or the saga log, one tab apart), its twin controls
// and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the car runs between states
// through useLivingStage; in the picture the reader taps the car (or a station) and drags stations into a new order
// (HitLayer); reveal steps close in. Every string is React text, or escaped (esc) by the scene before it becomes SVG.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { useLivingStage, type SceneView } from '../../lib/iso/motion';
import {
  endOf,
  FUNI_BOARD,
  funiLabel,
  funiLifted,
  funiMoves,
  funiPills,
  funiScene,
  partBox,
  slotBox,
  stationPiece,
  type Funi,
  type FuniPart,
} from '../../components/scenes/funicularScene';
import { fact } from '../../lib/agent-undo/facts';
import { ORDER, type Outcome, type Policy, stepOf, type StepId } from '../../lib/agent-undo/sim';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './agent-undo.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9): a whole run up the hill and back. */
export const MOTION_MS = 1200;

/** The scene's start: the car in the valley, the stations in R6f's order, no flag flying. */
export const START: Funi = { order: ORDER, car: 'valley', marks: {}, letters: 0 };

/** The picture after a run: its stops as the car's route, its flags and letters, the policy's signs, pegs and key. */
export function funiOf(o: Outcome, p: Policy, from: Partial<Funi> = {}): Funi {
  const done = p.order.filter(id => o.marks[id] && o.marks[id] !== 'failed');
  return {
    ...START,
    order: p.order,
    car: endOf(o.events),
    marks: o.marks,
    letters: o.letters,
    route: o.events,
    opp: p.order.filter(id => p.undo[id] && id !== 'email'),
    saves: p.saves ? done : undefined,
    key: p.keys || undefined,
    ...from,
  };
}

const names = (ids: StepId[]) => ids.map(id => stepOf(id).name.toLowerCase()).join(', ');
const where = (s: Funi) => (s.car === 'valley' ? 'in the valley' : `at the ${stepOf(s.car).name.toLowerCase()}`);
/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Funi): string {
  const with_ = (m: string) => s.order.filter(id => s.marks[id] === m);
  const failed = with_('failed')[0],
    undone = s.order.filter(id => s.marks[id] === 'undone' || s.marks[id] === 'letter').reverse(),
    twice = with_('twice'),
    done = with_('done'),
    waiting = with_('waiting')[0];
  const letters = s.letters > 1 ? `, ${s.letters} letters in the post box` : '';
  if (s.stopped) return `The assistant stopped ${where(s)}; ${names(done)} done.`;
  if (waiting) return `The car waits ${where(s)}: it went through, but no answer came back.`;
  if (failed && undone.length)
    return `${stepOf(failed).name} failed; the car ran back down undoing ${names(undone)}${done.length ? `; ${names(done)} still stands` : ''}${letters}.`;
  if (failed) return `${stepOf(failed).name} failed; ${names(done)} still stand${done.length === 1 ? 's' : ''}.`;
  if (twice.length) return `${names(twice)} happened twice; the car stands ${where(s)}${letters}.`;
  if (done.length === s.order.length) return 'All four steps done once: the return is finished.';
  if (s.order.join() !== ORDER.join()) return `The stations now run ${names(s.order)}, bottom to top.`;
  return 'The car waits in the valley; no step has run yet.';
}

/** A button beside the picture; `tap` names the part of the picture that does the same. */
export interface TwinButton {
  label: string;
  /** the one handler the button and the picture share: applies the next state, or returns why it can't */
  act: () => string | undefined;
  tap?: 'car' | StepId;
}
/** What the twin beside the stage offers: buttons, and the stations' order (Move up and Move down, or drag them). */
export interface Twin {
  buttons?: TwinButton[];
  order?: (o: StepId[]) => string | undefined;
}

type View = 'scene' | 'log';

/** The saga log: each station's step, its opposite, the key, whether it was saved, and what happened. */
function LogView({ s }: { s: Funi }) {
  const WORD = {
    done: 'done',
    undone: 'undone',
    failed: 'failed',
    twice: 'done twice',
    letter: 'second letter sent',
    waiting: 'no answer yet',
  };
  return (
    <figure className="au-log">
      <table>
        <caption>The saga log, bottom station first</caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Opposite</th>
            <th scope="col">Key</th>
            <th scope="col">Saved</th>
            <th scope="col">Now</th>
          </tr>
        </thead>
        <tbody>
          {s.order.map(id => {
            const d = stepOf(id),
              m = s.marks[id];
            return (
              <tr key={id}>
                <th scope="row">{d.does}</th>
                <td>{d.opposite === null ? `none: ${d.followUp}` : s.opp?.includes(id) ? d.opposite : 'not set'}</td>
                <td>{s.key ? 'yes' : 'no'}</td>
                <td>{s.saves?.includes(id) ? 'yes' : 'no'}</td>
                <td className={m === 'failed' || m === 'twice' ? 'bad' : undefined}>{m ? WORD[m] : 'not run'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

/** Move a station to slot i. */
const moved = (o: StepId[], id: StepId, i: number) => {
  const rest = o.filter(x => x !== id);
  return [...rest.slice(0, i), id, ...rest.slice(i)];
};

/**
 * The chapters' stage. `scene` is the picture's state (only fields that change what it draws); `twin` is the controls
 * beside the picture, whose handlers the taps and drags in the picture share.
 */
export function FuniStage({ scene, twin, say, closeUp }: { scene: Funi; twin?: Twin; say?: Say; closeUp?: string[] }) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [refused, setRefused] = useState<{ why: string; on: Funi } | null>(null);
  const [lifted, setLifted] = useState<StepId | null>(null);
  const stage = useLivingStage({
    scene: funiScene,
    state: { ...scene, say, bare: true },
    moves: funiMoves,
    ms: MOTION_MS,
    board: FUNI_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p as FuniPart, s),
    phone,
    lift: (s, v) => ({
      still: lifted ? funiLifted(s, lifted, v) : '',
      piece: lifted ? () => stationPiece(s, lifted) : '',
    }),
  });
  const s = stage.state;
  const pills = () => funiPills(s, stage.view as SceneView, stage.t < 1 && funiMoves(stage.prev, s));
  const say_ = (why: string | undefined) => {
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const press = (b: TwinButton) => say_(b.act());
  const hits: Hit[] = [
    ...(twin?.buttons ?? []).flatMap(b =>
      b.tap
        ? [{ part: `tap:${b.tap}`, at: b.tap === 'car' ? partBox('car', s) : partBox(b.tap, s), kind: 'tap' as const }]
        : [],
    ),
    ...(twin?.order
      ? [
          ...s.order.map(id => ({ part: `station:${id}`, at: partBox(id, s), kind: 'drag' as const })),
          ...s.order.map((_, i) => ({ part: `slot:${i}`, at: slotBox(i), kind: 'drop' as const })),
        ]
      : []),
  ];
  const act = (part: string, to?: string | null) => {
    if (part.startsWith('tap:')) {
      const b = twin?.buttons?.find(x => `tap:${x.tap}` === part);
      return b ? press(b) : undefined;
    }
    const id = part.slice(8) as StepId;
    if (to === undefined) return say_(`Drag the ${stepOf(id).name.toLowerCase()} to another stop on the hill.`);
    if (!to?.startsWith('slot:')) return say_('Drop the station on one of the four stops along the track.');
    return say_(twin?.order?.(moved(s.order, id, Number(to.slice(5)))));
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);

  return (
    <div className="tc-stage au-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'log'} onClick={() => setView('log')}>
          Log
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={FUNI_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={funiLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer board={FUNI_BOARD} art={pills} prefix="au-pill-" />
            {hits.length > 0 && (
              <HitLayer
                board={FUNI_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to.startsWith('slot:')}
                onDrag={d => {
                  setLifted(d ? (d.part.slice(8) as StepId) : null);
                  stage.onDrag(d);
                }}
                pulse={closeUp?.join() ?? twin?.buttons?.map(b => b.label).join()}
              />
            )}
          </IsoStage>
        ) : (
          <LogView s={s} />
        )}
      </div>
      {twin && (
        <div className="au-twin">
          {twin.order && (
            <ol className="au-order" aria-label="Stations, bottom to top">
              {s.order.map((id, i) => (
                <li key={id}>
                  <span>{stepOf(id).name}</span>
                  <button
                    type="button"
                    className="chip"
                    aria-label={`Move ${stepOf(id).name} down`}
                    disabled={i === 0}
                    onClick={() => say_(twin.order?.(moved(s.order, id, i - 1)))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="chip"
                    aria-label={`Move ${stepOf(id).name} up`}
                    disabled={i === s.order.length - 1}
                    onClick={() => say_(twin.order?.(moved(s.order, id, i + 1)))}
                  >
                    ↑
                  </button>
                </li>
              ))}
            </ol>
          )}
          {twin.buttons?.map(b => (
            <button key={b.label} type="button" className="big" onClick={() => press(b)}>
              {b.label}
            </button>
          ))}
        </div>
      )}
      <p className="tc-caption au-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/agent-undo/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy: the return and its failures are hand-written, the bank and courier made up. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A hand-written example run: Ana’s return, the bank and QuickPost are made up, and each failure is injected by hand.
    {children && <> {children}</>}
  </p>
);

/** A switch in the step card: a chip that is pressed or not. */
export const Switch = ({ on, label, flip }: { on: boolean; label: string; flip: () => void }) => (
  <button type="button" className="chip au-switch" aria-pressed={on} onClick={flip}>
    {label}
  </button>
);
