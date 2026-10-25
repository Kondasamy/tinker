// Pieces the Search chapters share: the stage (the index cabinet, or the postings table, one at a time), the filing
// bench (KTD15: page cards and drawers as two listboxes, pick then place by Enter or tap, dragging a card onto a
// drawer by mouse as an extra), meaning scores loaded from RAG's vectors, cited facts and the teaching note. Every
// string is React text here; the cabinet escapes its pills (esc).
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import {
  CABINET_BOARD,
  cabinetLabel,
  cabinetReadouts,
  cabinetScene,
  type CabinetOpts,
} from '../../components/scenes/cabinetScene';
import { postingsView, rowWords } from '../../components/scenes/postingsView';
import { PAGES, PAGE_WORDS, fmt, type Settings } from '../../lib/search/engine';
import { wordsOf } from '../../lib/search/stem';
import { fact } from '../../lib/search/facts';
import { openIndex } from '../../lib/rag/load';
import { MAP_FILE } from '../../lib/tokens/neighbours';
import { meaningScores, parseVectors } from '../../lib/search/vectors';
import type { Meanings } from '../../lib/search/workbench';
import vectorsUrl from '../../../data/search/vectors.bin?url';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './search.css';

// ---- the Postings tab ----

/** The query's drawers as a table: each word, its pages, its rarity, and what it adds to its best pages. */
export function PostingsTable({ query, settings }: { query: string; settings: Settings }) {
  const rows = postingsView(query, settings);
  return (
    <div className="sx-postings" tabIndex={0} role="region" aria-label="Postings, scrolls">
      <table className="tc-ledger">
        <caption>{`The drawers for “${query}”`}</caption>
        <thead>
          <tr>
            <th scope="col">Word</th>
            <th scope="col">On pages</th>
            <th scope="col">Rarity</th>
            <th scope="col">Its best pages (times said → adds)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.word} data-word={r.word}>
              <th scope="row">{r.word}</th>
              <td>{fmt(r.pages)}</td>
              <td>{r.rarity.toFixed(1)}</td>
              <td>
                {r.list.length ? (
                  <ul className="sx-plist">
                    {r.list.map(p => (
                      <li key={p.page}>{`${p.name} (×${p.tf} → ${p.adds.toFixed(1)})`}</li>
                    ))}
                    {r.more > 0 && <li className="sx-more">{`and ${fmt(r.more)} more`}</li>}
                  </ul>
                ) : (
                  'none'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sx-note">{rows.map(rowWords).join(' ')}</p>
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'postings';
/** What a chapter puts on the stage: the cabinet's state, the query behind the Postings tab (none turns it off), and
 * the caption. */
export interface Shown {
  scene: Omit<CabinetOpts, 'scale' | 'say'>;
  postings?: { query: string; settings: Settings };
  caption: ReactNode;
}

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the cabinet (default) or the postings, one at a time. The tab is the reader's view, kept out
 * of saved progress unless the chapter passes `view` and `onView`. */
export function SearchStage({
  show,
  view: kept,
  onView,
  say,
}: {
  show: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn on the cabinet (CABINET_PARTS) */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 2 : 1.2;
  const o: CabinetOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage sx-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'postings'}
          disabled={!show.postings}
          onClick={() => setView('postings')}
        >
          Postings
        </button>
      </div>
      <div className="tc-frame">
        {view === 'postings' && show.postings ? (
          <PostingsTable {...show.postings} />
        ) : (
          <IsoStage
            className="cabinet"
            board={CABINET_BOARD}
            style={FILL}
            scene={cabinetScene(o)}
            label={cabinetLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
        <span className="lbl">{cabinetReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

// ---- the filing bench (KTD15) ----

export interface Card {
  page: number;
}
/** A page's words around the first of the drawers' words it holds, so the reader can see what to file it under. */
export function snippetOf(page: number, words: readonly string[], clean: Settings['clean']): string {
  const raw = PAGES[page].text.split(' ');
  const at = Math.max(
    0,
    raw.findIndex(w => wordsOf(w, clean).some(x => words.includes(x))),
  );
  const a = Math.max(0, at - 5),
    b = Math.min(raw.length, at + 6);
  return `${a > 0 ? '… ' : ''}${raw.slice(a, b).join(' ')}${b < raw.length ? ' …' : ''}`;
}
/** Whether a page belongs in a drawer: the drawer's word is on it, after cleaning. */
export const belongs = (page: number, drawer: string, clean: Settings['clean']) =>
  wordsOf(PAGES[page].text, clean).includes(drawer);

/** The bench's own rule, apart from the drawing: a placement is kept only when it belongs; three refusals bring the
 * hint. */
export function place(misses: number, page: number, drawer: string, clean: Settings['clean']) {
  const ok = belongs(page, drawer, clean);
  return { ok, misses: ok ? misses : misses + 1, hint: !ok && misses + 1 >= 3 };
}

/** One listbox: the active option follows the arrow keys; Enter or Space picks it. */
function ListBox({
  id,
  label,
  items,
  picked,
  onPick,
  onDragStart,
  onDrop,
  disabled,
}: {
  id: string;
  label: string;
  items: { key: string; text: ReactNode; done?: boolean }[];
  picked: number | null;
  onPick: (i: number) => void;
  onDragStart?: (i: number) => void;
  onDrop?: (i: number) => void;
  disabled?: (i: number) => boolean;
}) {
  const [active, setActive] = useState(0);
  const a = Math.min(active, items.length - 1);
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowDown: a + 1,
      ArrowRight: a + 1,
      ArrowUp: a - 1,
      ArrowLeft: a - 1,
      Home: 0,
      End: items.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      setActive(Math.max(0, Math.min(items.length - 1, to)));
    } else if ((e.key === 'Enter' || e.key === ' ') && !disabled?.(a)) {
      e.preventDefault();
      onPick(a);
    }
  };
  return (
    <div
      id={id}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      aria-activedescendant={`${id}-${a}`}
      className="sx-list"
      onKeyDown={key}
    >
      {items.map((it, i) => (
        // biome-ignore lint/a11y/useFocusableInteractive: the listbox holds focus and points at its active option (aria-activedescendant)
        <div
          key={it.key}
          id={`${id}-${i}`}
          role="option"
          aria-selected={picked === i}
          aria-disabled={disabled?.(i) || undefined}
          className={`sx-opt${i === a ? ' active' : ''}${it.done ? ' done' : ''}`}
          onClick={() => {
            setActive(i);
            if (!disabled?.(i)) onPick(i);
          }}
          onPointerDown={(e: PointerEvent) => {
            // dragging is for a mouse or pen; a finger taps to pick and taps to place, so the page still scrolls
            if (e.pointerType !== 'touch' && onDragStart && !disabled?.(i)) onDragStart(i);
          }}
          onPointerUp={() => onDrop?.(i)}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

/** The filing bench: pick a page card, then the drawer of a word on it. A wrong drawer is refused; after three
 * refusals a hint shows. */
export function FilingBench({
  cards,
  drawers,
  filed,
  clean,
  onFile,
}: {
  cards: readonly number[];
  drawers: readonly string[];
  /** page → drawer it was filed in */
  filed: Record<number, string>;
  clean: Settings['clean'];
  onFile: (page: number, drawer: string) => void;
}) {
  const [card, setCard] = useState<number | null>(null),
    [misses, setMisses] = useState(0),
    [said, setSaid] = useState(''),
    [hint, setHint] = useState(false),
    drag = useRef<number | null>(null);
  useEffect(() => {
    const up = () => {
      drag.current = null;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);
  const tryPlace = (ci: number, di: number) => {
    const page = cards[ci],
      word = drawers[di];
    const r = place(misses, page, word, clean);
    setMisses(r.misses);
    if (r.hint) setHint(true);
    if (r.ok) {
      setCard(null);
      setSaid(`Filed: ${PAGES[page].title}, p. ${PAGES[page].n} under “${word}”.`);
      onFile(page, word);
    } else setSaid(`Refused: “${word}” is not on that page.`);
  };
  return (
    <div className="sx-bench">
      <div className="sx-cols">
        <div>
          <p className="sx-h" id="sx-cards-h">
            Page cards
          </p>
          <ListBox
            id="sx-cards"
            label="Page cards to file"
            picked={card}
            items={cards.map(p => ({
              key: String(p),
              done: p in filed,
              text: (
                <>
                  <strong>{`${PAGES[p].title}, p. ${PAGES[p].n}`}</strong>
                  <span className="sx-snip">{snippetOf(p, drawers, clean)}</span>
                  {p in filed && <span className="sx-in">{`in “${filed[p]}”`}</span>}
                </>
              ),
            }))}
            disabled={i => cards[i] in filed}
            onPick={i => {
              setCard(i);
              setSaid(`Picked ${PAGES[cards[i]].title}, p. ${PAGES[cards[i]].n}. Now pick its drawer.`);
            }}
            onDragStart={i => {
              drag.current = i;
              setCard(i);
            }}
          />
        </div>
        <div>
          <p className="sx-h">Drawers</p>
          <ListBox
            id="sx-drawers"
            label="Drawers, one per word"
            picked={null}
            items={drawers.map(w => ({
              key: w,
              text: (
                <>
                  <strong>{w}</strong>
                  <span className="sx-in">{`${Object.values(filed).filter(x => x === w).length} filed`}</span>
                </>
              ),
            }))}
            disabled={() => card === null}
            onPick={i => card !== null && tryPlace(card, i)}
            onDrop={i => {
              if (drag.current !== null) tryPlace(drag.current, i);
              drag.current = null;
            }}
          />
        </div>
      </div>
      <p className="sx-said" role="status">
        {said || 'Pick a card, then the drawer of a word on it. Arrow keys move; Enter picks.'}
      </p>
      {hint && <p className="sx-hint">Hint: find the drawer’s word in the card’s text, then pick that drawer.</p>}
    </div>
  );
}

// ---- meaning: RAG's vectors and the queries' ----

let meaningsP: Promise<Meanings> | null = null;
/** Every test search's meaning scores, loaded once per page; a failed load tries again on the next call. */
export function loadMeanings(): Promise<Meanings> {
  meaningsP ??= Promise.all([
    openIndex().then(i => i.load(MAP_FILE)),
    fetch(vectorsUrl).then(r => {
      if (!r.ok) throw new Error(`vectors: HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
  ]).then(
    ([cfg, ab]) => parseVectors(ab).vectors.map(v => meaningScores(cfg, v)),
    e => {
      meaningsP = null;
      throw e;
    },
  );
  return meaningsP;
}
/** The meaning scores, null while loading; `failed` offers a retry. */
export function useMeanings() {
  const [m, setM] = useState<Meanings | null>(null),
    [failed, setFailed] = useState(false),
    [tries, setTries] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadMeanings().then(
      x => live && setM(x),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [tries]);
  return { meanings: m, failed, retry: () => setTries(t => t + 1) };
}
/** Shown while meaning loads, or when it could not. */
export function MeaningGate({ failed, retry }: { failed: boolean; retry: () => void }) {
  return failed ? (
    <p className="note" role="alert">
      The meaning vectors could not load.{' '}
      <button type="button" className="chip" onClick={retry}>
        Retry
      </button>
    </p>
  ) : (
    <p className="note" role="status">
      Loading the meaning vectors…
    </p>
  );
}

// ---- facts and notes ----

/** A cited fact from data/search/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown wherever results and counts appear (R6). */
export const SimNote = () => (
  <p className="note sx-note">
    A teaching search box: Larkspur’s documents cut into RAG’s {PAGE_WORDS}-word pages, searched as you watch. The right pages for
    each test search are this site’s labels.
  </p>
);

/** The scoring formula, folded away (the maths stays optional). */
export const Maths = ({ children }: { children: ReactNode }) => (
  <details className="sx-maths">
    <summary>The maths</summary>
    <div>{children}</div>
  </details>
);
