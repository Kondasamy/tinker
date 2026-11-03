// Memory you can trust kit: the stage every chapter shares (the cork board, or the memory table, one tab apart), its
// twin controls and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the board moves
// between states through useLivingStage, a source paper drags into the bin in the picture (HitLayer), a tap on a paper
// traces its threads, and reveal steps close in. Every string is React text, or escaped (esc) by the scene.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import IsoStage, { PillLayer } from '../../lib/iso/IsoStage';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { type SceneView, useLivingStage } from '../../lib/iso/motion';
import {
  CORK_BOARD,
  corkLabel,
  corkLift,
  corkMoves,
  corkPills,
  corkScene,
  partBox,
  type Cork,
  type CorkCard,
  type CorkSource,
  type Tone,
} from '../../components/scenes/corkScene';
import { fact } from '../../lib/agent-memory/facts';
import {
  CANDIDATES,
  CAPACITY,
  END,
  type Memory,
  RUN_LABEL,
  type Why,
  cardOf,
  rootOf,
  sourceOf,
  sourcesBy,
} from '../../lib/agent-memory/memory';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './agent-memory.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 1000;

const TONE: Record<string, Tone> = { ada: 'ada', ben: 'ben', cara: 'cara', dan: 'dan' };
/** The bin shows cards that fell off the board (and, in chapter 1, the small talk swept off it). */
const SHOWN: Why[] = ['expired', 'full', 'replaced', 'undone', 'forgot', 'unchecked'];

export interface Look {
  /** the last day run: the papers pinned by then */
  upTo?: number;
  /** cards or sources to light */
  lit?: string[];
  /** sources taken down from the web */
  gone?: string[];
  /** extra cards pinned beside the run's (a newcomer before its conflict is settled) */
  extra?: { id: string; slot: number }[];
}
/** The board for a run of the month (engine → picture). */
export function corkOf(m: Memory, look: Look = {}): Cork {
  const lit = new Set(look.lit ?? []),
    gone = new Set(look.gone ?? []);
  const sources: CorkSource[] = sourcesBy(look.upTo ?? END).map(id => {
    const s = sourceOf(id);
    return {
      id,
      short: s.short,
      paper: s.trust,
      at: m.pulled.includes(id) ? 'bin' : 'board',
      lit: lit.has(id),
      gone: gone.has(id),
    };
  });
  const card = (id: string, at: CorkCard['at'], slot: number): CorkCard => {
    const c = cardOf(id);
    return { id, label: c.label, tone: TONE[c.about] ?? 'store', from: c.from, at, slot, lit: lit.has(id) };
  };
  const shown = m.bin.filter(b => SHOWN.includes(b.why));
  return {
    sources,
    cards: [
      ...m.board.map(b => card(b.id, 'board', b.slot)),
      ...(look.extra ?? []).map(b => card(b.id, 'board', b.slot)),
      ...shown.map((b, i) => card(b.id, 'bin', i)),
    ],
  };
}

/** The same board with these cards (and any card hanging from them) dropped into the bin, in order. */
export function fall(s: Cork, ids: string[]): Cork {
  const down = new Set(ids);
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of s.cards) if (!down.has(c.id) && down.has(c.from)) grew = down.add(c.id) && true;
  }
  let n = s.cards.filter(c => c.at === 'bin').length;
  return { ...s, cards: s.cards.map(c => (down.has(c.id) && c.at !== 'bin' ? { ...c, at: 'bin', slot: n++ } : c)) };
}

/** Chapter 1: Ada's chat as candidates on the side table, kept on the board, or swept into the bin. */
export function chatCork(stage: 'table' | 'all' | 'sorted', keep: string[] = [], lit: string[] = []): Cork {
  let bin = 0;
  return {
    tray: true,
    sources: [
      {
        id: 'chat-ada',
        short: sourceOf('chat-ada').short,
        paper: 'customer',
        at: 'board',
        lit: lit.includes('chat-ada'),
      },
    ],
    cards: CANDIDATES.map((c, i) => {
      const at: CorkCard['at'] =
        stage === 'table' ? 'tray' : stage === 'sorted' && !keep.includes(c.id) ? 'bin' : 'board';
      const slot = at === 'bin' ? bin++ : at === 'board' && stage === 'sorted' ? keep.indexOf(c.id) : i;
      return { id: c.id, label: c.label, tone: 'ada', from: 'chat-ada', at, slot, lit: lit.includes(c.id) };
    }),
  };
}

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Cork): string {
  const up = s.cards.filter(c => c.at === 'board').length,
    bin = s.cards.filter(c => c.at === 'bin').length,
    tray = s.cards.filter(c => c.at === 'tray').length;
  const lit = s.sources.find(x => x.lit && x.at === 'board');
  const pulled = s.sources.filter(x => x.at === 'bin').map(x => sourceOf(x.id).name);
  const litCards = s.cards.filter(c => c.lit && c.at === 'board').length;
  if (tray) return `${tray} candidate cards wait on the table beside the board.`;
  return [
    `${up} card${up === 1 ? '' : 's'} on the board, ${bin} in the bin`,
    pulled.length ? `; pulled: ${pulled.join(', ')}` : '',
    lit
      ? `; lit: ${sourceOf(lit.id).name}${litCards ? `, with ${litCards} card${litCards === 1 ? '' : 's'}` : ''}`
      : '',
    '.',
  ].join('');
}

/** The memory table (the second view): every card on the board, its source, its day and how far that source is trusted. */
function TableView({ s }: { s: Cork }) {
  const rows = s.cards.filter(c => c.at !== 'bin');
  return (
    <figure className="am-table">
      <table>
        <caption>Memory table: every card on the board</caption>
        <thead>
          <tr>
            <th scope="col">Card</th>
            <th scope="col">Source</th>
            <th scope="col">Day</th>
            <th scope="col">Trust</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const card = c.id.startsWith('c-') ? null : cardOf(c.id);
            const src = card ? rootOf(card) : sourceOf('chat-ada');
            return (
              <tr key={c.id} data-lit={c.lit ? '1' : undefined}>
                <td>{(card ?? CANDIDATES.find(x => x.id === c.id))?.text}</td>
                <td>{src.name}</td>
                <td>{card ? card.day : src.day}</td>
                <td>{src.trust}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="am-none">No cards on the board.</p>}
    </figure>
  );
}

type View = 'scene' | 'table';

/**
 * The chapters' stage. `cork` is the picture's state; `pull` (a paper dropped in the bin, or Undo source) and `trace`
 * (a paper tapped, or Trace) are the handlers the picture and the twin share: each applies the chapter's next state,
 * or returns why it can't. `children` are the chapter's other twin buttons.
 */
export function MemoryStage({
  cork,
  pull,
  trace,
  say,
  closeUp,
  children,
}: {
  cork: Cork;
  pull?: (source: string) => string | undefined;
  trace?: (source: string) => string | undefined;
  say?: Say;
  closeUp?: string[];
  children?: ReactNode;
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const papers = cork.sources.filter(x => x.at === 'board');
  const [picked, setPicked] = useState<string>(papers.find(p => p.paper === 'web')?.id ?? papers[0]?.id ?? '');
  const [refused, setRefused] = useState<{ why: string; on: Cork } | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const stage = useLivingStage({
    scene: corkScene,
    state: { ...cork, say },
    moves: corkMoves,
    ms: MOTION_MS,
    board: CORK_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p, s),
    phone,
    lift: (s, v) => corkLift(s, v, lifted ?? ''),
  });
  const s = stage.state;
  const pick = papers.some(p => p.id === picked) ? picked : (papers[0]?.id ?? '');
  const hits: Hit[] = [
    // padded to 44 px, neighbouring papers overlap: the lit one goes last, on top, so it is the easiest to grab
    ...[...papers]
      .sort((a, b) => +!!a.lit - +!!b.lit)
      .map(p => ({ part: `src:${p.id}`, at: partBox(`src:${p.id}`, s), kind: 'drag' as const })),
    { part: 'bin', at: partBox('bin'), kind: 'drop' },
  ];

  const say1 = (why: string | undefined) => {
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const act = (part: string, to?: string | null) => {
    if (!part.startsWith('src:')) return;
    const id = part.slice(4);
    if (to === undefined) {
      if (!trace) return say1('Drag a paper into the bin to pull its thread, or use the buttons under the picture.');
      setPicked(id);
      return say1(trace(id));
    }
    if (to !== 'bin') return say1('Drop the paper in the bin to pull its thread; it went back on the board.');
    if (!pull) return say1('Nothing to pull in this step.');
    setPicked(id);
    return say1(pull(id));
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);

  return (
    <div className="tc-stage am-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'table'} onClick={() => setView('table')}>
          Table
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={CORK_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={corkLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer
              board={CORK_BOARD}
              art={() => corkPills(s, stage.view as SceneView, stage.t < 1 && corkMoves(stage.prev, s))}
              prefix="am-pill-"
            />
            {(pull || trace) && (
              <HitLayer
                board={CORK_BOARD}
                hits={hits}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to === 'bin' && !!pull}
                onDrag={d => {
                  setLifted(d ? d.part.slice(4) : null);
                  stage.onDrag(d);
                }}
                pulse={closeUp?.join() ?? papers.map(p => p.id).join()}
              />
            )}
          </IsoStage>
        ) : (
          <TableView s={s} />
        )}
      </div>
      {(pull || trace || children) && (
        <div className="am-twin">
          {(pull || trace) && (
            <Select value={pick} onChange={e => setPicked(e.target.value)} aria-label="Source">
              {papers.map(p => (
                <option key={p.id} value={p.id}>
                  {sourceOf(p.id).name}
                </option>
              ))}
            </Select>
          )}
          {trace && (
            <button type="button" className="big" onClick={() => act(`src:${pick}`)}>
              Trace
            </button>
          )}
          {pull && (
            <button type="button" className="big" onClick={() => act(`src:${pick}`, 'bin')}>
              Undo source
            </button>
          )}
          {children}
        </div>
      )}
      <p className="tc-caption am-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/agent-memory/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy board: a hand-written month, hand-set rules, no model. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    {RUN_LABEL} The board holds {CAPACITY} cards, a toy limit.{children && <> {children}</>}
  </p>
);
