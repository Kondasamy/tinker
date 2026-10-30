// Pieces the on-device chapters share: the stage (the warehouse aisle with the phone-shaped crate, or the Bars tab of
// memory and battery read off the same numbers), one polite read-out, the story column's radio groups and context
// range, the live reply panel (Larkspur mini loads once per page through Transformers' model store), and cited facts.
// Pack the crate: bricks drop in one at a time and the tank drains in steps; with reduced motion both show their end
// state at once. Every string is React text here; the drawing escapes its pills (esc).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import { ListRange } from '../../components/story/ListRange';
import type { Say } from '../../components/story/steps';
import {
  PHONE_CRATE_BOARD,
  phoneCrateLabel,
  phoneCrateScene,
  type PhoneCrateOpts,
} from '../../components/scenes/phoneCrateScene';
import {
  BITS,
  bricksOf,
  cacheBytes,
  CONTEXTS,
  FREE,
  fits,
  SIZES,
  sizeOf,
  sizeText,
  usedBytes,
  weightBytes,
  type SizeId,
} from '../../lib/on-device/memory';
import { LENGTHS, TOKENS, type Length } from '../../lib/on-device/battery';
import { decode } from '../../lib/lm/bpe';
import { reply } from '../../lib/on-device/replies';
import { fact } from '../../lib/on-device/facts';
import { useModel } from '../transformers/kit';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './on-device.css';

export { modelNow } from '../transformers/kit';

/** What the stage shows: a model at some bits, a context's cache, the tank and the heat. */
export interface Pack {
  size: SizeId;
  bits: number;
  /** context tokens whose cache rides along */
  tokens?: number;
  /** the battery left, 0 to 1 */
  level?: number;
  hot?: boolean;
}

/** The crate's bricks for a pack: weights and cache each rounded up to whole bricks. */
export const bricksFor = (p: Pack) => ({
  weights: bricksOf(weightBytes(sizeOf(p.size), p.bits)),
  cache: bricksOf(cacheBytes(sizeOf(p.size), p.tokens ?? 0)),
});
const pct = (x: number) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)}%`;
/** The read-out: memory used against the free memory, and the tank. */
export function packText(p: Pack) {
  const s = sizeOf(p.size),
    used = usedBytes(s, p.bits, p.tokens ?? 0),
    { weights, cache } = bricksFor(p),
    over = weights + cache - 16;
  const mem = `${s.name} at ${p.bits} bits${p.tokens ? ` with ${p.tokens.toLocaleString('en')} tokens of cache` : ''}: ${sizeText(used)} of ${sizeText(FREE)} free.`;
  const fit = fits(s, p.bits, p.tokens ?? 0)
    ? ' It fits.'
    : ` It doesn’t fit: ${over} brick${over === 1 ? '' : 's'} spill.`;
  const tank = p.level === undefined ? '' : ` Battery ${pct(p.level)}.`;
  return `${mem}${fit}${tank}${p.hot ? ' Hot: slowed down.' : ''}`;
}

/** Steps a shown number toward its target, one brick (or a tenth of the tank) at a time; at once with reduced motion. */
function useEased(target: number, step: number, reduced: boolean) {
  const [shown, setShown] = useState(target);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (reduced || shown === target) {
      if (shown !== target) setShown(target);
      return;
    }
    t.current = setTimeout(
      () => setShown(v => (Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step)),
      50,
    );
    return () => clearTimeout(t.current);
  }, [target, shown, reduced, step]);
  return shown;
}

export type View = 'scene' | 'bars';
const FILL = { height: '100%' };

function Bars({ p }: { p: Pack }) {
  const s = sizeOf(p.size),
    used = usedBytes(s, p.bits, p.tokens ?? 0),
    share = used / FREE;
  return (
    <div className="od-bars">
      <div className="od-bar">
        <p>{`Memory: ${sizeText(used)} of ${sizeText(FREE)} free`}</p>
        <div className="od-track" role="img" aria-label={`Memory ${pct(share)} of the free memory`}>
          <span className={`od-fill${share > 1 ? ' over' : ''}`} style={{ width: pct(share) }} />
        </div>
      </div>
      {p.level !== undefined && (
        <div className="od-bar">
          <p>{`Battery: ${pct(p.level)} left`}</p>
          <div className="od-track" role="img" aria-label={`Battery ${pct(p.level)} left`}>
            <span className="od-fill water" style={{ width: pct(p.level) }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** The chapters' stage: the aisle (default) or the Bars tab, one at a time, read off the same pack; one polite
 * read-out of the pack under the frame. */
export function CrateStage({
  pack,
  say,
  caption,
  children,
}: {
  pack: Pack;
  say?: Say;
  caption: ReactNode;
  children?: ReactNode;
}) {
  const [view, setView] = useState<View>('scene');
  const narrow = useNarrow(),
    reduced = useReduced();
  const { weights, cache } = bricksFor(pack);
  const total = useEased(weights + cache, 1, reduced),
    level = useEased(pack.level ?? 1, 0.1, reduced);
  const o: PhoneCrateOpts = {
    weights: Math.min(weights, total),
    cache: Math.max(0, total - weights),
    level,
    hot: pack.hot,
    load: `${sizeText(usedBytes(sizeOf(pack.size), pack.bits, pack.tokens ?? 0))} / ${sizeText(FREE)}`,
    charge: pack.level === undefined ? undefined : `BATTERY ${pct(pack.level)}`,
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage od-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'bars'} onClick={() => setView('bars')}>
          Bars
        </button>
      </div>
      <div className="tc-frame">
        {view === 'bars' ? (
          <Bars p={pack} />
        ) : (
          <IsoStage
            className="od-aisle"
            board={PHONE_CRATE_BOARD}
            style={FILL}
            scene={phoneCrateScene(o)}
            label={phoneCrateLabel(o)}
          />
        )}
      </div>
      <p className="od-said" role="status" aria-live="polite">
        {packText(pack)}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

// ---- the story column's controls ----

function Radios<T extends string | number>({
  legend,
  name,
  list,
  value,
  words,
  onChange,
}: {
  legend: string;
  name: string;
  list: readonly T[];
  value: T;
  words: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className="od-radios">
      <legend>{legend}</legend>
      {list.map(v => (
        <label key={String(v)}>
          <input type="radio" name={`${name}${id}`} checked={value === v} onChange={() => onChange(v)} />
          {words(v)}
        </label>
      ))}
    </fieldset>
  );
}
export const SizeRadios = (p: { value: SizeId; onChange: (v: SizeId) => void; list?: SizeId[] }) => (
  <Radios
    legend="Model"
    name="od-size"
    list={p.list ?? SIZES.map(s => s.id)}
    value={p.value}
    words={id => sizeOf(id).name}
    onChange={p.onChange}
  />
);
export const BitsRadios = (p: { value: number; onChange: (v: number) => void }) => (
  <Radios
    legend="Bits per weight"
    name="od-bits"
    list={BITS}
    value={p.value}
    words={b => `${b} bits`}
    onChange={p.onChange}
  />
);
export const LengthRadios = (p: { value: Length; onChange: (v: Length) => void }) => (
  <Radios
    legend="Reply length"
    name="od-length"
    list={LENGTHS}
    value={p.value}
    words={l => `${l[0].toUpperCase()}${l.slice(1)}: ${TOKENS[l]} tokens`}
    onChange={p.onChange}
  />
);
export const ContextRange = (p: { value: number; onChange: (v: number) => void }) => (
  <ListRange
    className="od-range"
    label="Context"
    list={CONTEXTS}
    value={p.value}
    words={t => `${t.toLocaleString('en')} tokens`}
    onChange={p.onChange}
  />
);

/** Ask Larkspur mini at `bits`, live: the reply shows in a panel; onAsked hears which width answered. */
export function AskLive({ bits, prompt, onAsked }: { bits: number; prompt: string; onAsked: (bits: number) => void }) {
  const { model, failed, retry } = useModel();
  const [shown, setShown] = useState<{ bits: number; text: string } | null>(null);
  return (
    <div className="od-ask">
      <div className="od-actions">
        <button
          type="button"
          className="big"
          disabled={!model}
          onClick={() => {
            setShown({ bits, text: decode(reply(model!, bits, prompt)) });
            onAsked(bits);
          }}
        >
          {`Ask at ${bits} bits`}
        </button>
      </div>
      {!model && (
        <p className="note">
          {failed ? 'Larkspur mini didn’t load. ' : 'Loading Larkspur mini…'}
          {failed && (
            <button type="button" className="chip" onClick={retry}>
              Retry
            </button>
          )}
        </p>
      )}
      {shown && (
        <p className="od-reply" data-bits={shown.bits}>
          {`${prompt}`}
          <strong>{shown.text}</strong>
          {`  (${shown.bits} bits)`}
        </p>
      )}
    </div>
  );
}

/** A cited fact from data/on-device/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** The planning-number label every page with the handheld's numbers carries (R6). */
export const PLANNING = 'The handheld’s memory, battery and speed are Larkspur’s planning numbers.';
/** Said wherever Larkspur mini answers (R6, KTD5): it is a toy, trained ahead of time. */
export const TOY = `Larkspur mini is a toy of ${sizeOf('mini').params.toLocaleString('en')} weights, so its replies show what rounding does, not a real model’s quality.`;
