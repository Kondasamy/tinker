// Pieces the voice chapters share: the stage (the phone desk, or the Timeline tab: the call as two lanes), the clip
// buttons with their captions, the recorded transcript of a call, the line's controls and a cited fact. Every string is
// React text here; the desk escapes its pills (esc) and the timeline is drawn as React SVG, so no markup is injected.
// Sound only ever starts from a Play press, and the stage stops it whenever the step changes or the page unmounts.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { INK } from '../../lib/iso/core.js';
import ClipPlayer from '../../components/story/ClipPlayer';
import { stopClip } from '../../lib/voice/audio';
import { lineOf, speakerOf, textOf } from '../../lib/voice/script';
import { clipOf } from '../../lib/voice/turns';
import { HOST } from '../../lib/voice/latency';
import { interruptAt, type CallRun, type Point, type Turn } from '../../lib/voice/engine';
import { fact } from '../../lib/voice/facts';
import { PHONE_BOARD, phoneLabel, phoneScene, type PhoneOpts } from '../../components/scenes/phoneScene';
import {
  LANE_PAL,
  callTimeline,
  secs,
  segmentName,
  timelineLabel,
  type Mark,
  type Segment,
} from '../../components/scenes/callTimeline';
import { useNarrow } from '../tool-calling/kit';
import './voice.css';

export { secs };

// ---- the call as segments, for the Timeline tab ----

/** A call's opening exchange as timeline segments: the caller's turn, where the detector ended it, the reply after the
 * wait (or over the caller, when the turn was cut short), and on the slots call the caller cutting in (at `picked`,
 * the point the reader chose, when the key itself doesn't name one). */
export function segmentsOf(r: CallRun, picked?: Point): { segments: Segment[]; marks: Mark[] } {
  const turns = r.recording.turns,
    open = turns[0],
    reply = turns.find((t, i) => i > 0 && !t.text && !t.lost)!;
  const segments: Segment[] = [
    { lane: 'caller', clip: open.clip, who: speakerOf(open.clip).name, caption: textOf(open.clip), at: 0 },
  ];
  const marks: Mark[] = [
    { at: r.detected.fire, kind: 'turn-end', label: r.detected.gaveUp ? 'host gave up waiting' : 'end of turn' },
  ];
  const at = r.detected.fire + r.latency.firstSound - clipOf(reply.clip).parts[0].start;
  const cutIn = turns.find((t, i) => i > 1 && lineOf(t.clip).speaker !== 'assistant');
  // a barge-in key names where the host stopped; a talked-over one doesn't, so the cut-in sits where the reader picked
  const keyed = r.key.split('|')[2],
    stopPoint = keyed?.startsWith('stop-') ? (keyed as Point) : undefined;
  const stopAt = stopPoint && interruptAt(stopPoint);
  segments.push({
    lane: 'assistant',
    clip: reply.clip,
    who: 'Assistant',
    caption: textOf(reply.clip, reply.kept),
    at,
    until: stopAt,
  });
  if (cutIn && reply.kept !== undefined) {
    const t = at + interruptAt(stopPoint ?? picked ?? 'stop-3');
    segments.push({
      lane: 'caller',
      clip: cutIn.clip,
      who: speakerOf(cutIn.clip).name,
      caption: textOf(cutIn.clip),
      at: t - clipOf(cutIn.clip).parts[0].start,
      lost: cutIn.lost,
    });
    if (stopAt !== undefined) marks.push({ at: at + stopAt, kind: 'stop', label: 'assistant stops' });
  }
  return { segments, marks };
}

/** The call as two lanes: each turn a list item, one in the tab order at a time; the arrow keys (Home, End) move
 * between them, and the line under the drawing reads out the one in focus with its gap. */
export function CallTimeline({ segments, marks }: { segments: Segment[]; marks: Mark[] }) {
  const t = callTimeline(segments, marks, { phone: useNarrow() }),
    n = t.segs.length;
  const [cur, setCur] = useState(0),
    [said, setSaid] = useState<number | null>(null),
    list = useRef<SVGSVGElement>(null);
  const at = Math.min(cur, Math.max(0, n - 1)),
    fs = t.fs;
  const go = (i: number) => {
    setCur(i);
    setSaid(i);
    list.current?.querySelector<SVGGElement>(`[data-seg="${i}"]`)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[
      e.key
    ];
    if (to === undefined || !n) return;
    e.preventDefault();
    go(Math.max(0, Math.min(n - 1, to)));
  };
  return (
    <figure className="vo-timeline">
      <div className="vo-scroll">
        <svg
          viewBox={`0 0 ${t.w} ${t.h}`}
          role="list"
          aria-label={timelineLabel(segments, marks)}
          ref={list}
          onKeyDown={key}
        >
          {t.ticks.map(k => (
            <g key={k.label} aria-hidden="true">
              <path d={`M${k.x} ${t.lanes[0].y}V${t.axisY - 6}`} stroke="var(--rule, #d8cfbd)" strokeWidth={0.8} />
              <text x={k.x} y={t.axisY + fs} fontSize={fs} textAnchor="middle">
                {k.label}
              </text>
            </g>
          ))}
          <text x={t.w - 4} y={t.axisY + fs} fontSize={fs} textAnchor="end" aria-hidden="true">
            s
          </text>
          {t.lanes.map(l => (
            <g key={l.id} aria-hidden="true">
              <path d={`M${t.x0} ${l.y + l.h / 2}H${t.w - 8}`} stroke={INK} strokeWidth={0.6} strokeDasharray="2 3" />
              <text x={t.x0 - 6} y={l.y + l.h / 2 + fs * 0.36} fontSize={fs} fontWeight={800} textAnchor="end">
                {l.label}
              </text>
            </g>
          ))}
          {t.segs.map(s => (
            <g
              key={s.i}
              role="listitem"
              tabIndex={s.i === at ? 0 : -1}
              aria-label={segmentName(segments, s.i)}
              data-seg={s.i}
              data-lane={s.lane}
              onFocus={() => {
                setCur(s.i);
                setSaid(s.i);
              }}
              onClick={() => go(s.i)}
              className="vo-seg"
            >
              {s.i === at && (
                <rect
                  x={s.sx - 3}
                  y={s.y - 2}
                  width={Math.max(6, s.ex - s.sx + 6)}
                  height={s.h + 4}
                  rx={4}
                  fill="var(--acc, #f4b829)"
                  opacity={0.22}
                />
              )}
              <path
                d={s.d}
                fill={(s.seg.lost ? LANE_PAL.lost : LANE_PAL[s.lane]).l}
                stroke={INK}
                strokeWidth={0.7}
                strokeDasharray={s.seg.lost ? '3 2' : undefined}
                aria-hidden="true"
              />
            </g>
          ))}
          {t.marks.map(m => (
            <g key={m.kind + m.at} aria-hidden="true" className="vo-mark" data-kind={m.kind}>
              <path
                d={`M${m.x} ${t.lanes[0].y - 2}V${t.lanes[1].y + t.lanes[1].h + 2}`}
                stroke={m.kind === 'stop' ? 'var(--bad, #b5361f)' : INK}
                strokeWidth={1.4}
                strokeDasharray="4 3"
              />
            </g>
          ))}
        </svg>
      </div>
      <p className="vo-readout" aria-live="polite">
        {said === null
          ? 'Tab to the timeline, then use the arrow keys to read each turn and the gap before it.'
          : segmentName(segments, at)}
      </p>
      <ul className="vo-key" aria-label="What the timeline shows">
        <li>
          <i style={{ background: LANE_PAL.caller.l }} />
          the caller’s voice
        </li>
        <li>
          <i style={{ background: LANE_PAL.assistant.l }} />
          the assistant’s voice
        </li>
        <li>
          <i className="m" />
          {marks
            .map(m => m.label)
            .filter((x, i, a) => a.indexOf(x) === i)
            .join(', ')}
        </li>
      </ul>
    </figure>
  );
}

// ---- the stage ----

export type View = 'scene' | 'timeline';
/** What a chapter puts on the stage: the desk's settings, the call for the Timeline tab, and the caption. */
export interface Shown {
  phone: Omit<PhoneOpts, 'scale'>;
  timeline?: { segments: Segment[]; marks: Mark[] };
  caption: ReactNode;
}

const FILL = { height: '100%' };
/** The chapters' stage: the phone desk (default) or the timeline, one at a time. `step` is the runner's step (its focus):
 * when it changes, whatever is playing stops. The tab is the reader's view, kept out of saved progress unless the chapter
 * passes `view` and `onView`. */
export function VoiceStage({
  shown: s,
  view: kept,
  onView,
  step,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  step?: string;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  useEffect(() => () => stopClip(), [step]);
  const o: PhoneOpts = { ...s.phone, scale: useNarrow() ? 2 : 1.25 };
  return (
    <div className="tc-stage vo-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'timeline'}
          disabled={!s.timeline}
          onClick={() => setView('timeline')}
        >
          Timeline
        </button>
      </div>
      <div className="tc-frame">
        {view === 'timeline' && s.timeline ? (
          <CallTimeline {...s.timeline} />
        ) : (
          <IsoStage className="desk" board={PHONE_BOARD} style={FILL} scene={phoneScene(o)} label={phoneLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{s.caption}</span>
      </p>
    </div>
  );
}

// ---- the story column ----

/** A clip's button with its words as the caption. */
export const Say = ({ clip, parts }: { clip: string; parts?: number }) => (
  <ClipPlayer clip={clip} who={speakerOf(clip).name} caption={textOf(clip, parts)} />
);

/** One recorded turn: a caller's carries what speech-to-text wrote; an assistant's that was stopped shows what it said. */
function TurnRow({ t }: { t: Turn }) {
  const caller = lineOf(t.clip).speaker !== 'assistant',
    l = lineOf(t.clip);
  return (
    <li data-clip={t.clip} data-who={caller ? 'caller' : 'assistant'}>
      <Say clip={t.clip} />
      {caller && t.text && (
        <p className="vo-heard">
          <span className="vo-tag">recorded</span> Speech-to-text wrote: “{t.text}”
          {t.unsure && (
            <>
              {' '}
              <span className="vo-unsure">unsure of “{t.unsure}”</span>
            </>
          )}
        </p>
      )}
      {t.lost && <p className="vo-heard vo-lost">Never heard: the host was still speaking and not listening.</p>}
      {t.kept !== undefined && t.kept < l.parts.length && (
        <p className="vo-heard">Stopped after: “{textOf(t.clip, t.kept)} —”. Only this goes into the history.</p>
      )}
    </li>
  );
}

const VERDICT: Record<string, string> = {
  ok: 'OK',
  'cut-off': 'CUT OFF',
  wrong: 'WRONG',
  'talked-over': 'TALKED OVER',
};
/** A call's recorded turns, in order, with its verdict and the recording's note. */
export function Transcript({ run, note = true }: { run: CallRun; note?: boolean }) {
  const r = run.recording;
  return (
    <div className="tc-def vo-call" data-key={run.key} data-verdict={r.verdict}>
      <p className="lbl">
        {run.call.title} <span className="vo-tag">recorded</span>{' '}
        <span className={`stamp ${r.verdict === 'ok' ? 'correct' : 'wrong'}`}>{VERDICT[r.verdict]}</span>
      </p>
      <ol className="vo-turns">
        {r.turns.map((t, i) => (
          <TurnRow key={i} t={t} />
        ))}
      </ol>
      {note && <p className="note">{r.note}</p>}
    </div>
  );
}

/** A native range over a finite list of values, the value named beside it. */
export function Range<T extends number>({
  label,
  values,
  value,
  show,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T;
  show: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = 'vr' + useId().replace(/[^\w-]/g, ''),
    i = Math.max(0, values.indexOf(value));
  return (
    <div className="vo-range">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={i}
        aria-valuetext={show(value)}
        onChange={e => onChange(values[Number(e.currentTarget.value)])}
      />
      <output htmlFor={id} aria-live="polite">
        {show(value)}
      </output>
    </div>
  );
}

/** An on/off host rule as a switch button. */
export const Toggle = ({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" className="chip vo-toggle" aria-pressed={on} onClick={() => onChange(!on)}>
    {label}: {on ? 'on' : 'off'}
  </button>
);

/** A cited fact from data/voice/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim}{' '}
      <a className="source" href={f.source} target="_blank" rel="noreferrer">
        Source: {new URL(f.source).hostname}
      </a>{' '}
      (checked {f.accessed})
    </p>
  );
}

/** Said wherever a wait is shown (R6). */
export const PlanNote = () => (
  <p className="vo-note">
    Stage times are {HOST.label}; token counts are this site’s tokenizer’s, and the reply’s length is its clip’s.
  </p>
);
/** Said wherever recorded transcripts appear (R6). */
export const RecordedNote = () => (
  <p className="vo-note">
    The transcripts and replies were written for this site to illustrate the cited findings; they were not measured. The
    voices were generated once, ahead of time.
  </p>
);
