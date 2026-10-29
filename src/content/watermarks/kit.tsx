// Pieces the watermarks chapters share: the stage (the UV print room, or the Strip tab: the reply's tokens as chips in
// two blocks of 32 with the checker's green count and z-score meter, read off the same ids), sweep-the-lamp (KTD10: a
// native range moves the lamp, "Light all" lights the page), rewording (a token and one of Larkspur mini's six next-best
// from two Selects, or "Reword all", the pinned paraphrase), one polite read-out, and cited facts. Larkspur mini loads
// once per page through Transformers' model store; only the swap list waits for it. Every string is React text here;
// the drawing escapes its pills (esc).
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import Select from '../../components/story/Select';
import { ListRange } from '../../components/story/ListRange';
import type { Say } from '../../components/story/steps';
import {
  COLS,
  LAMP_STOPS,
  litCounts,
  pieceOf,
  tilesOf,
  UV_BOARD,
  uvLabel,
  uvScene,
  WINDOW,
  type PrintView,
  type UvOpts,
} from '../../components/scenes/uvScene';
import { encode } from '../../lib/lm/bpe';
import { check, type Check } from '../../lib/watermarks/detect';
import { choicesAt, swap } from '../../lib/watermarks/edit';
import { isGreen } from '../../lib/watermarks/greenlist';
import { larkspur } from '../../lib/watermarks/sample';
import { MARK, REPLY } from '../../lib/watermarks/story';
import { fact } from '../../lib/watermarks/facts';
import pinned from '../../../data/watermarks/pinned.json' with { type: 'json' };
import { MODEL, useModel, type ModelStore } from '../transformers/kit';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './watermarks.css';

export { MODEL, modelNow, whenLoaded } from '../transformers/kit';
/** Every number the chapters teach (data/watermarks/pinned.json). */
export const PIN = pinned;
/** The reply chapters 2–5 light, count and reword, and its prompt. */
export const PROMPT = REPLY.prompt;
export const REPLY_IDS: number[] = pinned.reply.ids;
/** "Reword all": the writer's best other choice at every token, pinned. */
export const REWORDED: number[] = pinned.rewording.all;
export const LAMP_LIST = Array.from({ length: LAMP_STOPS }, (_, i) => i);

export type Lamp = UvOpts['lamp'];
export const lastOf = (prompt: string) => encode(prompt).at(-1)!;

// ---- the read-out's lines ----

export const signed = (z: number) => (z < 0 ? `−${(-z).toFixed(2)}` : z.toFixed(2));
/** The checker's result in words: its green pairs and z-score, or too short to say. */
export const zText = (c: Check) =>
  c.z === null
    ? `Too short to say: ${c.pairs} pairs scored.`
    : `${c.green} of ${c.pairs} pairs green: z ${signed(c.z)}, ${c.verdict}.`;
/** What the lamp shows where it now stands. */
export function lampText(ids: number[], prev: number, gamma: number, lamp: Lamp) {
  if (lamp === null) return '';
  const c = litCounts(tilesOf({ ids, prev, gamma, lamp }));
  if (lamp === 'all') return `All ${ids.length} lit: ${c.green} green, ${c.red} red. ${zText(check(ids, gamma))}`;
  const range = (from: number) => (ids.length > from ? `${from + 1}–${Math.min(ids.length, from + WINDOW)}` : '');
  const where = [range(lamp), range(lamp + COLS)].filter(Boolean).join(' and ');
  return `Tokens ${where}: ${c.green} green, ${c.red} red.`;
}

// ---- the Strip tab ----

/** The z-score meter: −2 to 8, the line at 4 marked. */
const LO = -2,
  HI = 8,
  LINE_AT = 4;
const atPct = (z: number) => `${(Math.max(0, Math.min(1, (z - LO) / (HI - LO))) * 100).toFixed(1)}%`;
function Meter({ c }: { c: Check }) {
  return (
    <div className="wm-meter" data-z={c.z === null ? 'none' : c.z.toFixed(4)}>
      <div className="wm-track" aria-hidden="true">
        {c.z !== null && <span className="wm-fill" style={{ width: atPct(c.z) }} />}
        <span className="wm-line" style={{ left: atPct(LINE_AT) }} />
      </div>
      <p className="wm-z">{zText(c)}</p>
    </div>
  );
}
/** The reply's tokens as chips in two blocks of 32, green raised with ✓ and red notched with ✗; a chip picks its
 * token when rewording is open. */
function Strip({
  ids,
  prev,
  gamma,
  picked,
  onPick,
}: {
  ids: number[];
  prev: number;
  gamma: number;
  picked?: number | null;
  onPick?: (i: number) => void;
}) {
  const tiles = tilesOf({ ids, prev, gamma, lamp: 'all' });
  const blocks = [tiles.slice(0, COLS), tiles.slice(COLS)].filter(b => b.length);
  return (
    <div className="wm-strip">
      {blocks.map((b, k) => (
        <div key={k} className="wm-row" role="group" aria-label={`Tokens ${k * COLS + 1} to ${k * COLS + b.length}`}>
          {b.map((t, j) => {
            const i = k * COLS + j,
              cls = `wm-chip ${t.green ? 'green' : 'red'}`,
              body = (
                <>
                  <span aria-hidden="true">{t.green ? '✓' : '✗'}</span>
                  <span className="wm-text">{pieceOf(t.id)}</span>
                  <span className="wm-sr">{t.green ? ' green' : ' red'}</span>
                </>
              );
            return onPick ? (
              <button
                key={i}
                type="button"
                className={cls}
                data-i={i}
                aria-pressed={picked === i}
                onClick={() => onPick(i)}
              >
                {body}
              </button>
            ) : (
              <span key={i} className={cls} data-i={i}>
                {body}
              </span>
            );
          })}
        </div>
      ))}
      <Meter c={check(ids, gamma)} />
    </div>
  );
}

// ---- rewording ----

/** Pick a token, swap it for one of the writer's six next-best there; or Reword all (the pinned paraphrase). */
function Reword({
  ids,
  prompt,
  gamma,
  picked,
  onPick,
  onSwap,
  onAll,
  store,
}: {
  ids: number[];
  prompt: string;
  gamma: number;
  picked: number;
  onPick: (i: number) => void;
  onSwap: (id: number) => void;
  onAll?: () => void;
  store: ModelStore;
}) {
  const { model, failed, retry } = useModel(store);
  const id = `wm${useId().replace(/[^\w-]/g, '')}`;
  const choices = useMemo(
    () => (model ? choicesAt(larkspur(model), prompt, ids, picked) : []),
    [model, prompt, ids, picked],
  );
  const prev = picked ? ids[picked - 1] : lastOf(prompt);
  const colour = (id: number) => (isGreen(prev, id, gamma) ? 'green' : 'red');
  return (
    <div className="wm-reword">
      <span className="wm-field">
        <span id={`${id}t`}>Token</span>
        <Select aria-labelledby={`${id}t`} value={picked} onChange={e => onPick(Number(e.target.value))}>
          {ids.map((id, i) => (
            <option key={i} value={i}>
              {`${i + 1} ${pieceOf(id)}`}
            </option>
          ))}
        </Select>
      </span>
      <span className="wm-field">
        <span id={`${id}s`}>Swap for</span>
        <Select
          aria-labelledby={`${id}s`}
          value={ids[picked]}
          disabled={!model}
          onChange={e => onSwap(Number(e.target.value))}
        >
          <option value={ids[picked]}>{`${pieceOf(ids[picked])} ${colour(ids[picked])} (now)`}</option>
          {choices.map(c => (
            <option key={c} value={c}>
              {`${pieceOf(c)} ${colour(c)}`}
            </option>
          ))}
        </Select>
      </span>
      {onAll && (
        <button type="button" className="chip" onClick={onAll}>
          Reword all
        </button>
      )}
      {!model && (
        <p className="wm-load">
          {failed ? 'Larkspur mini didn’t load.' : 'Loading Larkspur mini…'}
          {failed && (
            <button type="button" className="chip" onClick={retry}>
              Retry
            </button>
          )}
        </p>
      )}
    </div>
  );
}

// ---- the stage ----

export type View = 'scene' | 'strip';
const FILL = { height: '100%' };

/** The chapters' stage: the UV print room (default) or the Strip tab, one at a time, read off the same ids. Under the
 * frame: the lamp range and Light all (with `onLamp`), rewording (with `onIds`), and one polite read-out of each new
 * result, cleared when `step` changes. With reduced motion the whole page is lit at once. */
export function UvStage({
  ids = REPLY_IDS,
  prompt = PROMPT,
  gamma = MARK.gamma,
  lamp,
  onLamp,
  onIds,
  rewordAll = REWORDED,
  print,
  say,
  caption,
  view: kept,
  onView,
  step,
  store = MODEL,
  children,
}: {
  ids?: number[];
  prompt?: string;
  gamma?: number;
  lamp: Lamp;
  /** none: the lamp's controls are hidden */
  onLamp?: (l: Lamp) => void;
  /** none: rewording is closed */
  onIds?: (ids: number[]) => void;
  /** what Reword all writes; null hides it */
  rewordAll?: number[] | null;
  /** chapter 6's photo print instead of the page (no Strip tab) */
  print?: PrintView;
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  step?: string | number;
  store?: ModelStore;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const strip = !print && lamp !== null, // nothing to show in the Strip while the lamp is parked
    view = strip ? (kept ?? own) : 'scene',
    setView = onView ?? setOwn;
  const narrow = useNarrow(),
    reduced = useReduced();
  const prev = lastOf(prompt);
  const [said, setSaid] = useState('');
  const [pos, setPos] = useState(typeof lamp === 'number' ? lamp : 0);
  const [picked, setPicked] = useState(0);
  useEffect(() => setSaid(''), [step]);
  const at = Math.min(picked, ids.length - 1);
  const moveLamp = (l: Lamp) => {
    if (typeof l === 'number') setPos(l);
    onLamp?.(l);
    setSaid(lampText(ids, prev, gamma, l));
  };
  const write = (next: number[], line: string) => {
    onIds?.(next);
    setSaid(`${line} ${zText(check(next, gamma))}`);
  };
  const o: UvOpts = {
    ids,
    prev,
    gamma,
    lamp: reduced && lamp !== null ? 'all' : lamp,
    picked: onIds ? at : null,
    print,
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage wm-stage">
      {strip && (
        <div className="tc-tabs" role="group" aria-label="Show in the picture">
          <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
            Picture
          </button>
          <button type="button" className="chip" aria-pressed={view === 'strip'} onClick={() => setView('strip')}>
            Strip
          </button>
        </div>
      )}
      <div className="tc-frame">
        {view === 'strip' ? (
          <Strip
            ids={ids}
            prev={prev}
            gamma={gamma}
            picked={onIds ? at : null}
            onPick={onIds ? setPicked : undefined}
          />
        ) : (
          <IsoStage className="wm-room" board={UV_BOARD} style={FILL} scene={uvScene(o)} label={uvLabel(o)} />
        )}
      </div>
      {(onLamp || onIds) && (
        <div className="wm-controls">
          {onLamp && (
            <div className="wm-lamp">
              <ListRange
                className="wm-range"
                label="Lamp"
                list={LAMP_LIST}
                value={pos}
                words={c => `over tokens ${c + 1} to ${c + WINDOW} of each row`}
                onChange={moveLamp}
              />
              <button
                type="button"
                className="chip"
                aria-pressed={lamp === 'all'}
                onClick={() => moveLamp(lamp === 'all' ? pos : 'all')}
              >
                Light all
              </button>
            </div>
          )}
          {onIds && (
            <Reword
              ids={ids}
              prompt={prompt}
              gamma={gamma}
              picked={at}
              onPick={setPicked}
              onSwap={id => write(swap(ids, at, id), `Swapped ${pieceOf(ids[at])} for ${pieceOf(id)}.`)}
              onAll={rewordAll ? () => write(rewordAll, 'Reworded every token.') : undefined}
              store={store}
            />
          )}
        </div>
      )}
      <p className="wm-said" role="status" aria-live="polite">
        {said}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/watermarks/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
