// Pieces the tokens chapters share: the stage (the token press, or the same text as a row of tiles with their ids) and
// its caption, and the embedding map (RAG's projection map, read-only). The reader types the text, so every string from
// it is React text here; the drawing escapes its own (esc) before it becomes SVG.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import ProjectionMap from '../../components/panels/ProjectionMap';
import { useRagIndex } from '../../components/canvas/Canvas';
import type { Outcome } from '../../components/canvas/state';
import { TILE_COLOURS, TOKEN_BOARD, tokenLabel, tokenScene, tokensWord } from '../../components/scenes/tokenScene';
import { encode, pieceBytes, pieceText } from '../../lib/lm/bpe';
import { countText } from '../../lib/tokens/counts';
import { MAP_FILE } from '../../lib/tokens/neighbours';
import type { Encoding, Piece } from '../../lib/tokens/encodings';
import { run, type Question } from '../../lib/rag/engine';
import type { Config } from '../../lib/rag/load';
import { useNarrow } from '../tool-calling/kit';
import { fact } from '../../lib/tokens/facts';
import './tokens.css';
import Cite from '../../components/story/Cite';

/** The site tokenizer's ids and pieces for text: a piece is its text, or its bytes when they are only part of a character. */
export function siteEncoding(text: string): Encoding {
  const ids = encode(text);
  return { ids, pieces: ids.map(id => pieceText(id) ?? [...pieceBytes(id)]) };
}

const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');
/** Whitespace drawn so it can be seen: a space as ␣, a new line as ↵, a tab as ⇥. */
const shown = (s: string) => s.replace(/ /g, '␣').replace(/\n/g, '↵').replace(/\t/g, '⇥');
/** A piece in words, for a screen reader: the marks above read badly aloud. */
export function spoken(p: Piece): string {
  if (typeof p !== 'string') return p.map(b => `byte 0x${hex(b)}`).join(', ');
  if (!p.trim()) return p === ' ' ? 'a space' : p.includes('\n') ? 'a new line' : `${p.length} spaces`;
  return `“${p.trim()}”${p.startsWith(' ') ? ' with a leading space' : ''}`;
}

/** The precise view: one tile per token, its piece over its id, in a list that wraps. Arrow keys (and Home, End) move
 * along it; the read-out line under it says the token in words. Byte chips stand for a token that is part of a character. */
export function TokenRow({ enc, label = 'Tokens' }: { enc: Encoding; label?: string }) {
  const n = enc.ids.length,
    items = useRef<(HTMLLIElement | null)[]>([]);
  const [cur, setCur] = useState<number | null>(null);
  const at = cur !== null && cur < n ? cur : null;
  const go = (i: number) => {
    const j = Math.max(0, Math.min(n - 1, i));
    setCur(j);
    items.current[j]?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const i = at ?? 0,
      to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  const name = (i: number) => `Token ${i + 1} of ${n}: ${spoken(enc.pieces[i])}, id ${enc.ids[i]}`;
  return (
    <div className="tk-row">
      {n ? (
        <ol aria-label={`${label}: ${tokensWord(n)}`} onKeyDown={key}>
          {enc.ids.map((id, i) => {
            const p = enc.pieces[i];
            return (
              <li
                key={i}
                ref={el => {
                  items.current[i] = el;
                }}
                tabIndex={i === (at ?? 0) ? 0 : -1}
                aria-label={name(i)}
                className={typeof p === 'string' ? 'tk-tile' : 'tk-tile tk-bytes'}
                style={{ '--tile': `var(--${TILE_COLOURS[i % TILE_COLOURS.length]}-l)` } as CSSProperties}
                aria-current={i === at ? 'true' : undefined}
                onFocus={() => setCur(i)}
              >
                <span className="tk-piece" aria-hidden="true">
                  {typeof p === 'string'
                    ? shown(p)
                    : p.map((b, k) => (
                        <span key={k} className="tk-byte">
                          {hex(b)}
                        </span>
                      ))}
                </span>
                <span className="tk-id" aria-hidden="true">
                  {id}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="tk-empty">No text yet: 0 tokens.</p>
      )}
      <p className="tk-readout" aria-live="polite">
        {at !== null
          ? name(at)
          : n
            ? `${tokensWord(n)}. Tab into the row, then use the arrow keys to read each one.`
            : ''}
      </p>
    </div>
  );
}

export type View = 'scene' | 'tiles';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
/** The chapters' stage: the token press (default) or the same text as a row of tiles, one at a time. `enc` is a recorded
 * real tokenizer's output for the text (default: the site tokenizer's). `caption` is the step's line under the picture.
 * The tab is the reader's view, kept out of saved progress unless the chapter passes `view` and `onView`. */
export function TokensStage({
  text,
  enc,
  caption,
  view: kept,
  onView,
}: {
  text: string;
  enc?: Encoding;
  caption?: string;
  view?: View;
  onView?: (v: View) => void;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const scale = useNarrow() ? 1.8 : 1;
  const e = useMemo(() => enc ?? siteEncoding(text), [enc, text]);
  const c = { ...countText(text), tokens: e.ids.length };
  return (
    <div className="tc-stage tk-stage">
      <div className="tc-tabs" role="group" aria-label="Show the text as">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'tiles'} onClick={() => setView('tiles')}>
          Tokens ({c.tokens})
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            board={TOKEN_BOARD}
            style={FILL}
            scene={tokenScene({ text, tokens: c.tokens, scale })}
            label={tokenLabel({ text, tokens: c.tokens })}
          />
        ) : (
          <TokenRow enc={e} />
        )}
      </div>
      <p className="tc-caption">
        <span className="lbl" data-testid="token-counts">
          {tokensWord(c.tokens)} · {c.words} word{c.words === 1 ? '' : 's'} · {c.chars} character
          {c.chars === 1 ? '' : 's'}
        </span>
        {caption && <span>{caption}</span>}
      </p>
    </div>
  );
}

/** RAG's index and its default chunks (the map's), loaded once; `failed` when either could not load. */
export function useMapIndex() {
  const { index, failed } = useRagIndex();
  const [cfg, setCfg] = useState<Config | null>(null),
    [lost, setLost] = useState(false);
  useEffect(() => {
    index?.load(MAP_FILE).then(setCfg, () => setLost(true));
  }, [index]);
  return { index, cfg, failed: failed || lost };
}

/** RAG's map of every chunk by meaning (KTD5), read-only: one question run through RAG's own retrieval over its default
 * chunks, so the map shows the same dots and true similarities RAG chapter 5 does. `mark: false` leaves the retrieved
 * chunks unmarked (a puzzle's answer); `onProbe` fires when the reader points at or tabs to a dot. */
export function EmbeddingMap({
  question,
  mark = true,
  onProbe,
}: {
  question: Question;
  mark?: boolean;
  onProbe?: () => void;
}) {
  const { index, cfg, failed } = useMapIndex();
  // ProjectionMap reads only the run record from an Outcome
  const out = useMemo(() => {
    if (!index || !cfg) return null;
    const record = run(index, cfg, { question, topK: 3 });
    return { record: mark ? record : { ...record, context: [] } } as Outcome;
  }, [index, cfg, question, mark]);
  if (failed) return <p className="note">The map of meaning could not load. Reload the page to try again.</p>;
  return <ProjectionMap out={out} index={index} onProbe={onProbe} />;
}

/** The map as a chapter's stage, in the shared frame, with the step's line under it. */
export function MapStage({
  caption,
  ...map
}: {
  question: Question;
  mark?: boolean;
  onProbe?: () => void;
  caption?: string;
}) {
  return (
    <div className="tc-stage tk-stage">
      <div className="tc-frame tk-map">
        <EmbeddingMap {...map} />
      </div>
      {caption && (
        <p className="tc-caption">
          <span>{caption}</span>
        </p>
      )}
    </div>
  );
}

/** A cited fact from data/tokens/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim}{' '}
      <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
