// A flat sequence figure, like IsoStage: role="img", a label in words, the hand-drawn wobble.
// Wide: every message so far. Below 600px: lanes stacked, one message, Prev/Next to browse (the step still leads).
import { useId, useState } from 'react';
import { filterFor } from '../../lib/iso/core.js';
import { flatScene, flatLabel, type Lane, type Msg } from '../../lib/iso/flat';
import './flat.css';

interface Props {
  lanes: Lane[];
  msgs: Msg[];
  /** messages shown so far; follows the runner's current step (default: all) */
  upTo?: number;
  className?: string;
}

export default function FlatStage({ lanes, msgs, upTo = msgs.length, className }: Props) {
  const prefix = 'flat' + useId().replace(/[^\w-]/g, '') + '-';
  // a browse choice only holds until the step moves on
  const [pick, setPick] = useState<{ at: number; i: number } | null>(null);
  const shown = Math.min(upTo, msgs.length), cur = pick?.at === shown ? pick.i : shown - 1;
  const go = (i: number) => setPick({ at: shown, i });
  const label = flatLabel(lanes, msgs, shown);
  const svg = (s: { svg: string; w: number; h: number }, cls: string, id: string, aria: string) => (
    <svg className={cls} viewBox={`0 0 ${s.w} ${s.h}`} role="img" aria-label={aria}>
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, prefix + id) }} />
      {/* the kit escapes every message text (esc) before it reaches this string */}
      <g filter={`url(#${prefix + id})`} dangerouslySetInnerHTML={{ __html: s.svg }} />
    </svg>
  );
  return (
    <figure className={`flat ${className ?? ''}`}>
      {svg(flatScene(lanes, msgs, { upTo: shown }), 'flat-wide', 'hand', label)}
      {svg(flatScene(lanes, msgs, { upTo: shown, phone: true, focus: cur }), 'flat-phone', 'phand',
        cur >= 0 ? `${label} Showing message ${cur + 1}.` : label)}
      <div className="flat-nav">
        <button type="button" className="chip" onClick={() => go(cur - 1)} disabled={cur <= 0}>← Prev</button>
        <span aria-live="polite">{shown ? `Message ${cur + 1} of ${shown}` : 'No messages yet'}</span>
        <button type="button" className="chip" onClick={() => go(cur + 1)} disabled={cur >= shown - 1}>Next →</button>
      </div>
    </figure>
  );
}
