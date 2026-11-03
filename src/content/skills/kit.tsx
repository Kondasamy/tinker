// Skills kit: the stage every chapter shares (the binder carousel, or the words each ticket loaded, one tab apart), its
// twin controls and status line, the cited Fact and the toy note. A living scene (KTD2, KTD4, KTD6): the carousel moves
// between states through useLivingStage, the ticket drags onto it in the picture (HitLayer), and reveal steps close in.
// Every string is React text, or escaped (esc) by the scene before it becomes SVG.
import { useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import IsoStage, { stageFrame, type Board } from '../../lib/iso/IsoStage';
import { inkScale, withFrame } from '../../lib/iso/core.js';
import HitLayer, { type Hit } from '../../lib/iso/hits';
import { useLivingStage, type SceneView } from '../../lib/iso/motion';
import {
  CAROUSEL_BOARD,
  carouselLabel,
  carouselMoves,
  carouselPills,
  carouselScene,
  carouselStill,
  partBox,
  sameWordsAgain,
  trayTicket,
  type Carousel,
  type CarouselPart,
} from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import {
  LABELS,
  type Labels,
  PAGES,
  pick,
  PROMPT_WORDS,
  REQUESTS,
  requestOf,
  SKILLS,
  skillOf,
  wordsLoaded,
} from '../../lib/skills/skills';
import { num } from '../../lib/format';
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import './skills.css';

/** The module is a living scene: every step carries an end-state line (tests/unit/say-targets.test.ts). */
export const LIVING = true;
/** How long one change of the picture takes (R9). */
export const MOTION_MS = 900;

/** The tickets a chapter offers, in the data's order. */
export const TICKETS = REQUESTS.map(r => r.id);

/** The end state in one sentence: the visible status line, unless the last action was refused. */
export function statusOf(s: Carousel): string {
  if (!s.ticket) return `${SKILLS.length} binders wait on the carousel; no ticket asked yet.`;
  if (s.mode === 'prompt')
    return `All ${SKILLS.length} binders lie open on the desk, burying the ticket: ${num(PROMPT_WORDS)} words loaded.`;
  if (!s.open) return 'No binder opened: no label matched the ticket.';
  return `The carousel turned to ${skillOf(s.open).name}; only that binder lies open, ${num(s.words ?? 0)} words loaded.`;
}

const HITS: Hit[] = [
  { part: 'ticket', at: partBox('ticket'), kind: 'drag' },
  { part: 'carousel', at: partBox('carousel'), kind: 'drop' },
];

export interface Bar {
  ticket: string;
  words: number;
}
type View = 'scene' | 'words';

/** Pills drawn over the picture, outside the hand-drawn filter, which smears their small text (same frame and camera). */
function PillLayer({ board, art }: { board: Board; art: () => string }) {
  const html = withFrame({ ...stageFrame(board), prefix: 'sk-pill-' }, () => inkScale(art()));
  // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the scene built, every string escaped (esc)
  return <g className="sk-pills" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Words loaded per ticket asked, against the long prompt. */
function WordsView({ bars }: { bars: Bar[] }) {
  return (
    <figure className="sk-words">
      <ol aria-label="Words loaded per ticket">
        <li>
          <span className="sk-q">The {PAGES}-page prompt, every ticket</span>
          <span className="sk-bar long" style={{ width: '100%' }} />
          <span className="sk-n">{num(PROMPT_WORDS)} words</span>
        </li>
        {bars.map((b, i) => (
          <li key={`${b.ticket}-${i}`}>
            <span className="sk-q">{requestOf(b.ticket).text}</span>
            <span className="sk-bar" style={{ width: `${(100 * b.words) / PROMPT_WORDS}%` }} />
            <span className="sk-n">{num(b.words)} words</span>
          </li>
        ))}
      </ol>
      {!bars.length && <p className="sk-none">Ask a ticket to see its words.</p>}
    </figure>
  );
}

/**
 * The chapters' stage. `scene` is the picture's state (only fields that change what it draws); `ask` is the one
 * handler the drag and the Ask button share: it applies the chapter's next state, or returns why it can't.
 */
export function SkillsStage({
  scene,
  tickets,
  ask,
  bars = [],
  say,
  closeUp,
}: {
  scene: Carousel;
  tickets: string[];
  ask?: (ticket: string) => string | undefined;
  bars?: Bar[];
  say?: Say;
  closeUp?: string[];
}) {
  const phone = useNarrow();
  const [view, setView] = useState<View>('scene');
  const [pickd, setPick] = useState(tickets[0]);
  const [refused, setRefused] = useState<{ why: string; on: Carousel } | null>(null);
  const stage = useLivingStage({
    scene: carouselScene,
    state: { ...scene, say, bare: true },
    moves: carouselMoves,
    ms: MOTION_MS,
    board: CAROUSEL_BOARD,
    closeUp: view === 'scene' ? closeUp : undefined,
    partBox: (p, s) => partBox(p as CarouselPart, s),
    phone,
    lift: (s, v) => ({ still: carouselStill(s, v, false), piece: trayTicket() }),
  });
  const s = stage.state;
  const moving = stage.t < 1 && carouselMoves(stage.prev, s);
  const pills = () =>
    carouselPills(s, stage.view as SceneView, {
      moving,
      pulse: moving && sameWordsAgain(stage.prev, s) ? stage.t : undefined,
    });

  const act = (part: string, to?: string | null) => {
    if (part !== 'ticket') return;
    if (to !== undefined && to !== 'carousel') {
      const why = 'Drop the ticket on the carousel to ask it.';
      setRefused({ why, on: s });
      return why;
    }
    const why = ask ? ask(pickd) : 'Nothing to ask in this step.';
    setRefused(why ? { why, on: s } : null);
    return why;
  };
  const status = refused && refused.on === s ? refused.why : statusOf(s);

  return (
    <div className="tc-stage sk-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'words'} onClick={() => setView('words')}>
          Words
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={CAROUSEL_BOARD}
            scene={stage.still}
            moving={stage.moving}
            zoom={stage.zoom}
            label={carouselLabel(s)}
            style={{ height: '100%' }}
          >
            <PillLayer board={CAROUSEL_BOARD} art={pills} />
            {ask && (
              <HitLayer
                board={CAROUSEL_BOARD}
                hits={HITS}
                busy={stage.busy}
                act={act}
                legal={(_, to) => to === 'carousel'}
                onDrag={stage.onDrag}
                pulse={closeUp?.join() ?? tickets.join()}
              />
            )}
          </IsoStage>
        ) : (
          <WordsView bars={bars} />
        )}
      </div>
      {ask && (
        <div className="sk-twin">
          <Select value={pickd} onChange={e => setPick(e.target.value)} aria-label="Ticket">
            {tickets.map(id => (
              <option key={id} value={id}>
                {requestOf(id).text}
              </option>
            ))}
          </Select>
          <button type="button" className="big" onClick={() => act('ticket', 'carousel')}>
            Ask
          </button>
        </div>
      )}
      <p className="tc-caption sk-status" role="status">
        {status}
      </p>
    </div>
  );
}

/** A cited fact from data/skills/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside the toy's numbers: words, hand-set sizes, a stand-in for the model's pick. */
export const ToyNote = ({ children }: { children?: ReactNode }) => (
  <p className="note">
    A toy shelf: binder sizes are hand-set word counts, and a word-matching rule stands in for the model’s pick. Real
    skills are counted in tokens.{children && <> {children}</>}
  </p>
);

/** One ticket asked, with any labels that read differently at the time (skill id → label). */
export interface Asked {
  ticket: string;
  swap?: Record<string, string>;
}
const labelsAt = (a: Asked): Labels => ({ ...LABELS, ...a.swap });
/** The picture for a chapter's asks: the last ticket on the desk, its binder (or the whole pile) out. */
export function carouselOf(mode: Carousel['mode'], asked: Asked[], lit?: string | null): Carousel {
  const last = asked.at(-1);
  if (mode === 'prompt')
    return {
      mode,
      ticket: last?.ticket ?? null,
      open: null,
      facing: SKILLS[0].id,
      lit: lit ?? null,
      tickets: asked.length,
      words: last ? PROMPT_WORDS : undefined,
    };
  const picks = asked.map(a => pick(a.ticket, labelsAt(a)));
  const open = picks.at(-1) ?? null;
  return {
    mode,
    ticket: last?.ticket ?? null,
    open,
    facing: picks.filter(Boolean).at(-1) ?? SKILLS[0].id,
    words: last ? wordsLoaded('skills', open, labelsAt(last)) : undefined,
  };
}
/** The Words tab's bars for a chapter's asks. */
export const barsOf = (mode: Carousel['mode'], asked: Asked[]): Bar[] =>
  asked.map(a => ({ ticket: a.ticket, words: wordsLoaded(mode, pick(a.ticket, labelsAt(a)), labelsAt(a)) }));
