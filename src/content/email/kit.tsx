// Pieces the email chapters share: the stage (the post room, or the raw headers one tab away, read off the same
// message), the postmarks to peel (KTD13: a list of buttons beside the picture, peeled bottom-up with Enter, and Peel
// all; with reduced motion nothing slides), one polite read-out that speaks on the reader's actions, a message picker,
// real DKIM verifying in this browser, and cited facts. Every string is React text here; the post room escapes its
// pills (esc).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import {
  POST_BOARD,
  postLabel,
  postReadouts,
  postScene,
  type Lamp,
  type PostOpts,
} from '../../components/scenes/postScene';
import { hops, parse, type Hop } from '../../lib/email/parse';
import { verify, type DkimResult } from '../../lib/email/dkim';
import type { Records } from '../../lib/email/dns';
import type { SpfResult } from '../../lib/email/spf';
import type { Verdict } from '../../lib/email/dmarc';
import { scoreText } from '../../lib/email/spam';
import { NAMES, messageAs, verdictOf, type MessageId } from '../../lib/email/story';
import { domainOf, fromOf } from '../../lib/email/parse';
import { fact } from '../../lib/email/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './email.css';

// ---- from a verdict to the picture ----

const spfLamp = (r: SpfResult): Lamp => (r === 'pass' ? 'pass' : r === 'neutral' || r === 'none' ? 'off' : 'fail');
const lamp = (r: 'pass' | 'fail' | 'none'): Lamp => (r === 'none' ? 'off' : r);

/** Which checks a chapter's picture shows, and whether the letter has been sorted. */
export interface Show {
  spf?: boolean;
  dkim?: boolean;
  dmarc?: boolean;
  spam?: boolean;
  sorted?: boolean;
}
/** The post room for one message under Larkspur's records. */
export function postOf(
  v: Verdict,
  id: MessageId,
  rec: Records,
  peeled: number,
  show: Show,
): Omit<PostOpts, 'say' | 'scale'> {
  const m = parse(messageAs(id, rec));
  return {
    from: domainOf(fromOf(m)),
    hops: hops(m).length,
    peeled,
    ...(show.spf ? { spf: [spfLamp(v.spf), v.spf.toUpperCase()] as [Lamp, string] } : {}),
    ...(show.dkim ? { dkim: [lamp(v.dkim), v.dkim.toUpperCase()] as [Lamp, string] } : {}),
    ...(show.dmarc ? { dmarc: [lamp(v.dmarc), v.dmarc.toUpperCase()] as [Lamp, string] } : {}),
    ...(show.spam ? { spam: [v.score, scoreText(v.score)] as [number, string] } : {}),
    ...(show.sorted ? { fate: v.fate } : {}),
  };
}

const FATE: Record<Verdict['fate'], string> = {
  inbox: 'It went to the inbox.',
  junk: 'It went to junk.',
  bounced: 'It bounced back.',
};
/** The verdict in one line, for the read-out. */
export function verdictLine(id: MessageId, v: Verdict, show: Show): string {
  const parts = [
    ...(show.spf ? [`SPF ${v.spf}`] : []),
    ...(show.dkim ? [`DKIM ${v.dkim}`] : []),
    ...(show.dmarc ? [`DMARC ${v.dmarc}`] : []),
    ...(show.spam ? [`spam score ${scoreText(v.score)}`] : []),
  ];
  return `${NAMES[id]}: ${parts.length ? `${parts.join(', ')}. ` : ''}${show.sorted ? FATE[v.fate] : 'On the desk.'}`;
}

/** What a postmark says once peeled. */
export const hopText = (h: Hop) => `${h.by} took it from ${h.from} (${h.ip}) at ${h.time}`;

// ---- the postmarks (KTD13) ----

/** The envelope's postmarks, bottom first: only the next one can be peeled; Peel all does the rest. */
export function Postmarks({
  list,
  peeled,
  onPeel,
}: {
  list: Hop[];
  peeled: number;
  onPeel: (n: number, said: string) => void;
}) {
  const next = useRef<HTMLButtonElement>(null),
    acted = useRef(false);
  useEffect(() => {
    if (acted.current) next.current?.focus();
  }, [peeled]);
  const peel = (n: number) => {
    acted.current = true;
    onPeel(
      n,
      n >= list.length && n - peeled > 1
        ? `All ${list.length} postmarks peeled. The first hop was ${list[0].from}.`
        : `Postmark ${n} of ${list.length}: ${list[n - 1].by} took it from ${list[n - 1].from} (${list[n - 1].ip}) at ${list[n - 1].time}.`,
    );
  };
  return (
    <section className="em-peel" aria-label="Postmarks, bottom first">
      <ol>
        {list.map((h, i) => (
          <li key={`${h.by}-${h.at}`} className={i < peeled ? 'peeled' : ''} data-hop={i}>
            {i < peeled ? (
              <span className="em-hop">{hopText(h)}</span>
            ) : (
              <button
                ref={i === peeled ? next : undefined}
                type="button"
                className="chip"
                disabled={i !== peeled}
                onClick={() => peel(i + 1)}
              >
                {`Peel postmark ${i + 1}`}
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="chip" disabled={peeled >= list.length} onClick={() => peel(list.length)}>
        Peel all
      </button>
    </section>
  );
}

// ---- the stage ----

export type View = 'scene' | 'headers';
const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape

/** The chapters' stage: the post room (default) or the raw headers, one at a time; the postmarks to peel when the
 * chapter passes `onPeel`; and the one read-out, which says the reader's last peel until the chapter's `said`
 * changes. */
export function EmailStage({
  id,
  rec,
  verdict,
  show,
  peeled = 0,
  onPeel,
  said,
  caption,
  view: kept,
  onView,
  say,
  text: shown,
}: {
  id: MessageId;
  rec: Records;
  verdict?: Verdict;
  show: Show;
  peeled?: number;
  onPeel?: (n: number) => void;
  said?: string;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  say?: Say;
  /** the message as it arrived, when a chapter changes it */
  text?: string;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const v = verdict ?? verdictOf(id, rec);
  const text = shown ?? messageAs(id, rec),
    list = hops(parse(text));
  const o: PostOpts = { ...postOf(v, id, rec, peeled, show), say, scale: useNarrow() ? 2 : 1.2 };
  const out = said ?? verdictLine(id, v, show),
    [note, setNote] = useState<string | null>(null);
  useEffect(() => setNote(null), [out]);
  return (
    <div className="tc-stage em-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'headers'} onClick={() => setView('headers')}>
          Headers
        </button>
      </div>
      <div className="tc-frame">
        {view === 'headers' ? (
          <pre className="em-headers" tabIndex={0} role="region" aria-label={`The raw message: ${NAMES[id]}`}>
            {text}
          </pre>
        ) : (
          <IsoStage className="post" board={POST_BOARD} style={FILL} scene={postScene(o)} label={postLabel(o)} />
        )}
      </div>
      {onPeel && (
        <Postmarks
          list={list}
          peeled={peeled}
          onPeel={(n, s) => {
            onPeel(n);
            setNote(s);
          }}
        />
      )}
      <p className="em-readout" role="status" aria-live="polite">
        {note ?? out}
      </p>
      <p className="tc-caption">
        <span className="txt">{caption}</span>
        <span className="lbl">{postReadouts(o).join(' · ')}</span>
      </p>
    </div>
  );
}

// ---- controls ----

/** One message at a time, by name. */
export function MessagePick({
  ids,
  value,
  onPick,
  legend = 'Message',
}: {
  ids: MessageId[];
  value: MessageId;
  onPick: (id: MessageId) => void;
  legend?: string;
}) {
  return (
    <fieldset className="em-row">
      <legend>{legend}</legend>
      {ids.map(id => (
        <label key={id}>
          <input type="radio" name="em-msg" checked={value === id} onChange={() => onPick(id)} /> {NAMES[id]}
        </label>
      ))}
    </fieldset>
  );
}

/** An async result: undefined while it runs, null if it can't run here. */
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

/** Real DKIM, verified by Web Crypto in this browser. */
export const useDkim = (text: string, rec: Records) =>
  useAsync<DkimResult>(() => verify(parse(text), rec), `${text}|${rec.dkim}`);

/** A cited fact from data/email/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Shown beside every live DKIM check and wherever the made-up mail appears (R6). */
export const DemoNote = () => (
  <p className="note em-note">
    Made-up mail and DNS on .example names. The DKIM key is a demo key, made for this site and public on purpose.
  </p>
);
