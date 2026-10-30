// Pieces the Locks and keys chapters share: the stage (the paint shop counter, or "Who sees what" one tab away, read
// off the same picture), the secret-colour picker (KTD15: one native radio group; the mix is computed), the real
// algorithms' results as they arrive from Web Crypto, and cited facts. Every string is React text here; the counter
// escapes its pills (esc).
import { useEffect, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import {
  PAINT_BOARD,
  PIGMENTS,
  mixPaint,
  paintLabel,
  paintReadouts,
  paintScene,
  type Item,
  type PaintOpts,
  type Pigment,
} from '../../components/scenes/paintScene';
import { TOY } from '../../lib/encryption/toy';
import { aesLock, ecdsaVerify } from '../../lib/encryption/real';
import { COMPANY, SUPPLIER } from '../../lib/encryption/story';
import { fact } from '../../lib/encryption/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './encryption.css';

/** The two ends' name pills, read from data. */
export const NAMES: [string, string] = [COMPANY.split(' ')[0].toUpperCase(), SUPPLIER.short.toUpperCase()];

// ---- the stage ----

export type View = 'scene' | 'detail';
export interface Shown {
  scene: Omit<PaintOpts, 'scale' | 'say' | 'names'>;
  caption: ReactNode;
  /** the pills carry toy-size numbers: the caption says so (R6) */
  toy?: boolean;
}

/** Who sees what: the counter as a table, one row per item, from the same picture. */
export function SeenView({ o }: { o: Shown['scene'] }) {
  const rows: [string, Item][] = [
    ...o.us.map(i => [NAMES[0], i] as [string, Item]),
    ...o.counter.map(i => ['Everyone', i] as [string, Item]),
    ...o.them.map(i => [NAMES[1], i] as [string, Item]),
  ];
  return (
    <table className="tc-ledger ek-seen">
      <caption>Who sees what</caption>
      <thead>
        <tr>
          <th scope="col">Seen by</th>
          <th scope="col">Thing</th>
          <th scope="col">Shows</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([who, i], k) => (
          <tr key={`${who}-${k}`} data-who={who}>
            <th scope="row">{who}</th>
            <td>{i.kind === 'box' ? 'crate' : i.kind}</td>
            <td>{i.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The chapters' stage: the counter (default) or Who sees what. The tab is the reader's view, out of saved progress. */
export function EncryptionStage({ show, say }: { show: Shown; say?: Say }) {
  const [view, setView] = useState<View>('scene');
  const scale = useNarrow() ? 2 : 1.2;
  const o: PaintOpts = { ...show.scene, names: NAMES, say, scale };
  return (
    <div className="tc-stage ek-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'detail'} onClick={() => setView('detail')}>
          Who sees what
        </button>
      </div>
      <div className="tc-frame">
        {view === 'detail' ? (
          <SeenView o={show.scene} />
        ) : (
          <IsoStage
            className="paint"
            board={PAINT_BOARD}
            style={{ height: '100%' }}
            scene={paintScene(o)}
            label={paintLabel(o)}
          />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">
          {show.caption}
          {show.toy && <span className="ek-toy"> Toy-size numbers; real keys are hundreds or thousands of bits.</span>}
        </span>
        <span className="lbl">{paintReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

// ---- the secret colour (KTD15) ----

export const SECRETS = TOY.dh.secrets.map(s => s.pigment as Pigment);

/** The reader's secret colour: one native radio group, each with its swatch and its toy number. */
export function SecretPicker({ value, onPick }: { value: Pigment | null; onPick: (p: Pigment) => void }) {
  return (
    <fieldset className="ek-field ek-secret">
      <legend>Your secret colour</legend>
      {TOY.dh.secrets.map(s => {
        const p = s.pigment as Pigment;
        return (
          <label key={p}>
            <input type="radio" name="ek-secret" checked={value === p} onChange={() => onPick(p)} />
            <span className="ek-swatch" style={{ background: mixPaint([p]) }} aria-hidden="true" />
            {`${PIGMENTS[p].name} (secret ${s.secret})`}
          </label>
        );
      })}
    </fieldset>
  );
}

// ---- the real algorithms, as they arrive ----

/** An async result from Web Crypto: undefined while it runs, null if it can't run here. */
export function useAsync<T>(run: () => Promise<T>, key: string): T | null | undefined {
  const [v, setV] = useState<{ key: string; v: T | null } | null>(null);
  useEffect(() => {
    let live = true;
    run().then(
      x => live && setV({ key, v: x }),
      () => live && setV({ key, v: null }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return v?.key === key ? v.v : undefined;
}

/** A long hex string, wrapped, in a code block. */
export const Hex = ({ value, label }: { value: string; label: string }) => (
  <p className="ek-hex">
    <span className="ek-hex-label">{label}</span>
    <code>{value}</code>
  </p>
);

/** The order locked by real AES-GCM in this browser, with the demo key and IV. */
export function CipherLine({ text }: { text: string }) {
  const c = useAsync(() => aesLock(text), text);
  return (
    <div role="status" className="ek-real" data-cipher={c ?? ''}>
      {c === undefined ? (
        <p className="ek-line">Locking with real AES-GCM…</p>
      ) : c === null ? (
        <p className="ek-line">This browser can’t run AES-GCM here.</p>
      ) : (
        <Hex label="Real AES-GCM ciphertext, made here:" value={c} />
      )}
    </div>
  );
}

/** The invoice checked against the supplier's committed signature by real ECDSA P-256 in this browser. */
export function VerifyLine({ text }: { text: string }) {
  const ok = useAsync(() => ecdsaVerify(text), text);
  return (
    <p role="status" className="ek-line" data-verified={ok === undefined ? '' : ok ? '1' : '0'}>
      {ok === undefined
        ? 'Checking with real ECDSA…'
        : ok === null
          ? 'This browser can’t run ECDSA here.'
          : `Real ECDSA P-256 check, run here: ${ok ? 'the signature matches' : 'the signature fails'}.`}
    </p>
  );
}

/** Shown beside every result of a real algorithm (R6). */
export const DemoNote = () => (
  <p className="note ek-note">
    Demo keys, made for this site and public on purpose; a real private key never leaves its owner.
  </p>
);

/** A cited fact from data/encryption/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
