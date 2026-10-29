// Pieces the agent-commerce chapters share: the stage (the trading hatch, or the Task tab: the task's states as flat
// cards, one at a time) and sign the slip (KTD10: a real form for cap, expiry and items, then Sign; Send carries the
// slip through the hatch and the shop's checks stamp each field; a tamper toggle changes the cap after signing; with
// reduced motion the stamps show without the travel; one polite read-out per action and verdict). Every string is
// React text here; the drawing escapes its pills and cards (esc).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import Select from '../../components/story/Select';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import {
  HATCH_BOARD,
  hatchLabel,
  hatchLane,
  hatchScene,
  laneLabel,
  type HatchOpts,
  type SlipAt,
} from '../../components/scenes/hatchScene';
import { type Mandate, mandateOf, sign, type Slip } from '../../lib/agent-commerce/mandate';
import { checkOrder, orderOf, type Verdict } from '../../lib/agent-commerce/shop';
import { ASKS, BUILDER, itemOf, SELLERS, SLIPS, sellerOf, usd } from '../../lib/agent-commerce/story';
import type { Reading } from '../../lib/agent-commerce/card';
import type { TaskState } from '../../lib/agent-commerce/task';
import { CAPS, HOURS, ITEMS } from '../../lib/agent-commerce/workbench';
import { fact } from '../../lib/agent-commerce/facts';
import type { Meta } from '../../lib/agent-commerce/turns';
import { longDate } from '../../lib/format';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../recommendations/kit';
import './agent-commerce.css';

// ---- the terms and what the read-out says ----

export interface Terms {
  merchants: string[];
  /** a key of workbench ITEMS */
  items: string;
  cap: number;
  hours: number;
}
/** The ITEMS key whose list matches, else the first. */
const itemsKey = (items: string[]) =>
  Object.keys(ITEMS).find(k => ITEMS[k].join() === items.join()) ?? Object.keys(ITEMS)[0];
export const termsOf = (t: { merchants: string[]; items: string[]; cap: number; hours: number }): Terms => ({
  ...t,
  items: itemsKey(t.items),
});
/** An item list in words: everything, a category, or an item's name (read from the catalogue). */
export const itemsWords = (key: string) => {
  const first = ITEMS[key]?.[0] ?? '*';
  return first === '*'
    ? 'Anything'
    : first.startsWith('category:')
      ? `Any ${first.slice('category:'.length)}`
      : (itemOf(first)?.name ?? first);
};
export const hoursWords = (h: number) => (h % 24 ? `${h} hours` : `${h / 24} day${h === 24 ? '' : 's'}`);
const shops = (m: string[]) => (m.includes('*') ? 'any shop' : m.join(' or '));

/** What Sign says: the terms Dana signed. */
export const signedNote = (m: Mandate, t: Terms) =>
  `Signed by ${BUILDER.name}: up to ${usd(m.cap)} of ${itemsWords(t.items).toLowerCase()} at ${shops(m.merchants)}, for ${hoursWords(t.hours)}.`;
/** The shop's verdict, field by field: the failures with their reasons, then how many passed. */
export function verdictNote(v: Verdict): string {
  const fails = v.checks.filter(c => !c.pass),
    pass = v.checks.length - fails.length;
  if (!fails.length) return `Accepted: all ${v.checks.length} checks pass.`;
  return `Refused: ${fails.map(c => `${c.field} fails (${c.reason})`).join('; ')}; ${pass ? `the other ${pass} pass` : 'nothing passes'}.`;
}
/** The tamper toggle's raised cap: double what was signed. */
export const raised = (cap: number) => cap * 2;

// ---- the stage ----

/** The Task tab: flat cards, wide or phone by width (CSS), the ink filter as FlatStage draws it. */
function TaskLane({ states }: { states: readonly TaskState[] }) {
  const wide = useMemo(() => hatchLane(states), [states]),
    phone = useMemo(() => hatchLane(states, { phone: true }), [states]),
    label = laneLabel(states);
  const svg = (t: { svg: string; w: number; h: number }, cls: string, id: string) => (
    <svg className={cls} viewBox={`0 0 ${t.w} ${t.h}`} role="img" aria-label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the ink filter, built from numbers */}
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, id) }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the scene built, every string escaped (esc) */}
      <g filter={`url(#${id})`} dangerouslySetInnerHTML={{ __html: t.svg }} />
    </svg>
  );
  return (
    <figure className="ac-lane">
      {svg(wide, 'ac-wide', 'ac-lane-hand')}
      {svg(phone, 'ac-phone', 'ac-lane-phand')}
    </figure>
  );
}

export type View = 'scene' | 'task';
const FILL = { height: '100%' };
/** The chapters' stage: the trading hatch by default, or the Task tab when `states` is given. `children` go under the
 * frame (the controls). The tab is view state unless the chapter keeps it (`view`, `onView`). */
export function HatchStage({
  scene,
  states,
  caption,
  say,
  view: kept,
  onView,
  children,
}: {
  scene: HatchOpts;
  states?: readonly TaskState[];
  caption: ReactNode;
  say?: Say;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const narrow = useNarrow();
  const view = states ? (kept ?? own) : 'scene',
    setView = onView ?? setOwn;
  const o = { ...scene, say, scale: narrow ? 2 : 1.2 };
  return (
    <div className="tc-stage ac-stage">
      {states && (
        <div className="tc-tabs" role="group" aria-label="Show in the picture">
          <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
            Picture
          </button>
          <button type="button" className="chip" aria-pressed={view === 'task'} onClick={() => setView('task')}>
            Task
          </button>
        </div>
      )}
      <div className="tc-frame">
        {view === 'task' && states ? (
          <TaskLane states={states} />
        ) : (
          <IsoStage
            className="hatch"
            board={HATCH_BOARD}
            style={FILL}
            scene={hatchScene(o)}
            label={hatchLabel(o)}
            data-slip={o.slip?.at ?? 'none'}
          />
        )}
      </div>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

// ---- sign the slip ----

/** ms the slip takes for each hop (buyer → hatch → seller) */
export const HOP = 450;
export interface SlipEvent {
  kind: 'signed' | 'tampered' | 'sent' | 'checked';
  slip: Slip;
  verdict?: Verdict;
}
interface Run {
  /** what Dana signed */
  signed: Slip | null;
  /** the cap changed after signing */
  tampered: boolean;
  at: SlipAt;
  verdict: Verdict | null;
  /** nonces the shop has taken */
  spent: string[];
  /** slips signed so far, for each new nonce */
  n: number;
}
const FRESH: Run = { signed: null, tampered: false, at: 'buyer', verdict: null, spent: [], n: 0 };
/** The slip the agent carries: what Dana signed, with the cap changed when the toggle is on. */
const carried = (r: Run): Slip | null =>
  r.signed && r.tampered
    ? { ...r.signed, mandate: { ...r.signed.mandate, cap: raised(r.signed.mandate.cap) } }
    : r.signed;

/** The hatch with the sign-the-slip form under it. `terms` opens the form (default Larkspur's slip); `seller` is who the
 * order goes to, and `sellers` offers a pick among them. `onEvent` reports each action for a step's predicate. */
export function SignSlip({
  terms = SLIPS.larkspur,
  seller: start = 'larkspur',
  sellers,
  states,
  caption,
  say,
  onEvent,
}: {
  terms?: { merchants: string[]; items: string[]; cap: number; hours: number };
  seller?: string;
  sellers?: string[];
  states?: readonly TaskState[];
  caption: ReactNode;
  say?: Say;
  onEvent?: (e: SlipEvent) => void;
}) {
  const reduced = useReduced();
  const [t, setT] = useState<Terms>(() => termsOf(terms));
  const [seller, setSeller] = useState(start);
  const [r, setR] = useState<Run>(FRESH);
  const [said, setSaid] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // a Send in flight ignores another until the run re-renders, so the next check sees the nonce it spent
  const sending = useRef(false);
  useEffect(() => {
    sending.current = false;
  }, [r]);
  const slip = carried(r);
  const busy = r.at === 'hatch';

  const doSign = async () => {
    const m = mandateOf(
      { merchants: t.merchants, items: ITEMS[t.items], cap: t.cap, hours: t.hours },
      `slip-${r.n + 1}`,
    );
    const s = await sign(m);
    setR(x => ({ ...x, signed: s, tampered: false, at: 'buyer', verdict: null, n: x.n + 1 }));
    setSaid(signedNote(m, t));
    onEvent?.({ kind: 'signed', slip: s });
  };
  const tamper = () => {
    if (!r.signed) return;
    const on = !r.tampered,
      cap = r.signed.mandate.cap;
    clearTimeout(timer.current);
    setR(x => ({ ...x, tampered: on, at: 'buyer', verdict: null }));
    setSaid(
      on
        ? `Cap changed to ${usd(raised(cap))} after signing; the signature still covers ${usd(cap)}.`
        : `Cap back to the signed ${usd(cap)}.`,
    );
    const s = { ...r.signed, mandate: { ...r.signed.mandate, cap: on ? raised(cap) : cap } };
    onEvent?.({ kind: 'tampered', slip: s });
  };
  const send = async () => {
    if (!slip || sending.current) return;
    sending.current = true;
    clearTimeout(timer.current);
    const v = await checkOrder(slip, orderOf(sellerOf(seller)), r.spent);
    const land = () => {
      setR(x => ({ ...x, at: 'seller', verdict: v, spent: v.ok ? [...x.spent, slip.mandate.nonce] : x.spent }));
      setSaid(verdictNote(v));
      onEvent?.({ kind: 'checked', slip, verdict: v });
    };
    onEvent?.({ kind: 'sent', slip });
    if (reduced) return land();
    setR(x => ({ ...x, at: 'hatch', verdict: null }));
    setSaid(`Sent through the hatch to ${sellerOf(seller).domain}.`);
    timer.current = setTimeout(land, HOP);
  };
  const restart = () => {
    clearTimeout(timer.current);
    setR(x => ({ ...FRESH, n: x.n }));
    setSaid('');
  };
  const pickSeller = (id: string) => {
    clearTimeout(timer.current);
    setSeller(id);
    setR(x => ({ ...x, at: 'buyer', verdict: null }));
  };

  const locked = !!r.signed;
  const scene: HatchOpts = {
    slip: slip ? { at: r.at, signed: true, checks: r.verdict?.checks } : { at: 'buyer', signed: false },
    seller: r.verdict ? (r.verdict.ok ? 'ok' : 'bad') : undefined,
  };
  return (
    <HatchStage scene={scene} states={states} caption={caption} say={say}>
      <div className="ac-slip">
        <div className="ac-form">
          <label>
            Cap
            <Select value={t.cap} disabled={locked} onChange={e => setT({ ...t, cap: Number(e.target.value) })}>
              {CAPS.map(c => (
                <option key={c} value={c}>
                  {usd(c)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Good for
            <Select value={t.hours} disabled={locked} onChange={e => setT({ ...t, hours: Number(e.target.value) })}>
              {HOURS.map(h => (
                <option key={h} value={h}>
                  {hoursWords(h)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Items
            <Select value={t.items} disabled={locked} onChange={e => setT({ ...t, items: e.target.value })}>
              {Object.keys(ITEMS).map(k => (
                <option key={k} value={k}>
                  {itemsWords(k)}
                </option>
              ))}
            </Select>
          </label>
          {sellers && (
            <label>
              Seller
              <Select value={seller} disabled={busy} onChange={e => pickSeller(e.target.value)}>
                {sellers.map(id => (
                  <option key={id} value={id}>
                    {`${sellerOf(id).name} (${sellerOf(id).domain})`}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
        <div className="ac-buttons">
          {!locked ? (
            <button type="button" className="chip" onClick={doSign}>
              Sign
            </button>
          ) : (
            <>
              <button type="button" className="chip" onClick={send} disabled={busy}>
                {r.verdict ? 'Send again' : 'Send'}
              </button>
              <button type="button" className="chip" aria-pressed={r.tampered} onClick={tamper} disabled={busy}>
                Change the cap
              </button>
              <button type="button" className="chip" onClick={restart}>
                Start over
              </button>
            </>
          )}
        </div>
        <p className="ac-said" role="status" aria-live="polite">
          {said}
        </p>
      </div>
    </HatchStage>
  );
}

/** Every seller id, for a pick among them all (the dev page, the workbench). */
export const ALL_SELLERS = SELLERS.map(s => s.id);

// ---- notes the chapters share (R5, R6) ----

/** A cited fact from data/agent-commerce/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever a recorded agent turn shows: whose model, and when (KTD4). */
export const RecordedNote = ({ meta }: { meta: Meta }) => (
  <p className="note">
    {`Recorded: one run of ${meta.model} on ${longDate(meta.accessed)}. Another run may answer differently.`}
  </p>
);

/** Said wherever the demo key signs (R6, KTD7). */
export const DemoKeyNote = () => (
  <p className="note">
    {`${BUILDER.name}’s demo key: made for this site and public on purpose, so your browser can really sign. A real key never leaves its owner.`}
  </p>
);

/** Said wherever the sellers, orders or shop show (R6). */
export const HandNote = () => (
  <p className="note">Hand-written for this site: every shop, seller, order and domain here is fictional.</p>
);

/** One recorded reading of the shop (chapters 1–2): the agent's words, its total, and the catalogue's, checked live. */
export function ReadingCard({ r }: { r: Reading }) {
  return (
    <figure className="ac-read" data-sku={r.sku} data-right={r.right ? '1' : '0'}>
      <figcaption>{`“${ASKS[r.sku].text}” · read from the ${r.view === 'page' ? 'page' : 'catalogue'}`}</figcaption>
      <blockquote>{r.turn ? r.turn.text : 'No recorded turn.'}</blockquote>
      <p>
        {`Agent’s total ${r.turn ? usd(r.turn.total) : '?'} · catalogue ${usd(r.truth)} `}
        <span className={`stamp ${r.right ? 'correct' : 'wrong'}`}>{r.right ? 'RIGHT' : 'WRONG'}</span>
      </p>
    </figure>
  );
}
