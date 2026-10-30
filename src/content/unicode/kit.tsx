// Pieces the Text and Unicode chapters share: the stage (the telegraph office, or the byte table one tab away), the
// punch (KTD8: type into a text field and each byte punches a row; chips add characters a keyboard may not have; a
// `Select` sets the reader's table; one polite read-out says what comes back), the lengths of a string, and cited
// facts. Whatever the reader types is untrusted: React text here, esc() in the picture.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { TAPE_BOARD, TAPE_PARTS, tapeLabel, tapeScene, type TapeOpts } from '../../components/scenes/tapeScene';
import { bytesOf, glyphsOf, rowsOf, shown, uplus } from '../../lib/unicode/bytes';
import { TABLES, readAs, tableOf, type Table } from '../../lib/unicode/mojibake';
import { lengthsOf } from '../../lib/unicode/graphemes';
import { fact } from '../../lib/unicode/facts';
import { count } from '../../lib/unicode/story';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import type { Say } from '../../components/story/steps';
import './unicode.css';

export const PARTS = TAPE_PARTS;
/** The byte table's rows past this many characters are counted, not listed (a paste can be long). */
const MAX_GLYPHS = 24;

/** What the reader prints: the punched bytes read back with its table. */
export const printedOf = (text: string, table: Table) => readAs(bytesOf(text), table);

/** The tape's drawing options for a text and a reader's table. */
export function tapeOf(text: string, table: Table): Omit<TapeOpts, 'scale' | 'say' | 'fresh'> {
  const t = tableOf(table);
  return { text, table: { short: t.short, right: t.id === 'utf-8' }, printed: text ? printedOf(text, table) : '' };
}

/** The byte table: each code point, its number, and its UTF-8 bytes. Plain React text. */
export function ByteTable({ text }: { text: string }) {
  const glyphs = glyphsOf(text),
    shownG = glyphs.slice(0, MAX_GLYPHS);
  if (!glyphs.length) return <p className="uc-empty">Nothing punched yet.</p>;
  return (
    <div className="uc-table-wrap">
      <table className="tc-ledger uc-table">
        <caption>Each character on the tape</caption>
        <thead>
          <tr>
            <th scope="col">Character</th>
            <th scope="col">Code point</th>
            <th scope="col">Bytes</th>
          </tr>
        </thead>
        <tbody>
          {shownG.map((g, i) => (
            <tr key={i} data-cp={g.cp}>
              <th scope="row" className="uc-ch">
                {shown(g.ch)}
              </th>
              <td>{`${uplus(g.cp)} (${g.cp})`}</td>
              <td className="uc-bytes">{g.bytes.join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {glyphs.length > MAX_GLYPHS && (
        <p className="note">{`and ${count(glyphs.length - MAX_GLYPHS, 'more character')}`}</p>
      )}
    </div>
  );
}

export type View = 'scene' | 'bytes';

/** The chapters' stage: the telegraph office (default) or the byte table, one at a time. The tab is the reader's view,
 * kept out of saved progress. Rows punched since the last draw drop in, except with reduced motion (CSS). */
export function TapeStage({
  text,
  table = 'utf-8',
  say,
  caption,
}: {
  text: string;
  table?: Table;
  say?: Say;
  caption?: ReactNode;
}) {
  const [view, setView] = useState<View>('scene');
  const scale = useNarrow() ? 2 : 1.2;
  const n = rowsOf(text).length,
    before = useRef(n),
    fresh = Math.min(before.current, n);
  useEffect(() => {
    before.current = n;
  }, [n]);
  const o: TapeOpts = { ...tapeOf(text, table), fresh, scale, say };
  return (
    <div className="tc-stage uc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'bytes'} onClick={() => setView('bytes')}>
          Bytes
        </button>
      </div>
      <div className="tc-frame">
        {view === 'bytes' ? (
          <ByteTable text={text} />
        ) : (
          <IsoStage
            className="tape"
            board={TAPE_BOARD}
            style={{ height: '100%' }}
            scene={tapeScene(o)}
            label={tapeLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{caption ?? `${count(n, 'byte')} punched, read with ${tableOf(table).name}.`}</span>
      </p>
    </div>
  );
}

/** The punch: a text field (each byte punches a row), chips that put a character or a whole string on it, and, where
 * the chapter opens it, the reader's table. One polite read-out says what was punched and what the reader prints. */
export function Punch({
  text,
  onText,
  chips = [],
  append = false,
  table,
  onTable,
  children,
}: {
  text: string;
  onText: (t: string) => void;
  /** characters or strings the chips put on the punch */
  chips?: string[];
  /** chips add to the end of the text (else they replace it) */
  append?: boolean;
  table?: Table;
  onTable?: (t: Table) => void;
  children?: ReactNode;
}) {
  const t = table ?? 'utf-8',
    n = bytesOf(text).length,
    printed = printedOf(text, t);
  return (
    <div className="uc-punch">
      <label htmlFor="uc-text">Text on the punch</label>
      <input
        id="uc-text"
        type="text"
        className="uc-input"
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={e => onText(e.target.value)}
      />
      {chips.length > 0 && (
        <div className="uc-chips" role="group" aria-label={append ? 'Add a character' : 'Put on the punch'}>
          {chips.map(c => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={!append && text === c}
              onClick={() => onText(append ? text + c : c)}
            >
              {append ? `+ ${c}` : c}
            </button>
          ))}
          {append && (
            <button type="button" className="chip" onClick={() => onText('')}>
              Clear
            </button>
          )}
        </div>
      )}
      {onTable && (
        <div className="uc-field">
          <label htmlFor="uc-table">The reader’s table</label>
          <Select id="uc-table" value={t} onChange={e => onTable(e.target.value as Table)}>
            {TABLES.map(x => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {children}
      <p className="uc-said" role="status" data-bytes={n}>
        {n ? `Punched ${count(n, 'byte')}. The reader prints “${printed}”.` : 'The tape is blank.'}
      </p>
    </div>
  );
}

/** The four lengths of one string, side by side. */
export function Lengths({ text }: { text: string }) {
  const l = lengthsOf(text);
  const cells: [string, number][] = [
    ['Code units (.length)', l.units],
    ['Code points', l.codePoints],
    ['Graphemes', l.graphemes],
    ['Bytes (UTF-8)', l.bytes],
  ];
  return (
    <dl className="uc-lengths" data-lengths={`${l.units},${l.codePoints},${l.graphemes},${l.bytes}`}>
      {cells.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A cited fact from data/unicode/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
