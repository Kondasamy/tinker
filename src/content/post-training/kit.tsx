// Pieces the Post-training chapters share: the stage (the exam hall, or the Bars tab: each answer's probability before
// and after), a written answer with its live grading marks, the rule-set picker and a cited fact. Every string is React
// text here; the drawings escape theirs (esc), and the chart's art goes in as an image (a data URL), so no markup is
// injected. Fine-tuning's kit brings its chart and loading styles (fine-tuning.css) and the model loaders chapter 1 uses.
import { useId, useState, type KeyboardEvent } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { EXAM_BOARD, examLabel, examScene, type ExamOpts } from '../../components/scenes/examScene';
import { barWords, barsLabel, policyBars, type BarIn } from '../../components/scenes/policyBars';
import { RULES, passes, question, type RuleId } from '../../lib/post-training/graders';
import type { Policy, Round } from '../../lib/post-training/policy';
import { fact } from '../../lib/post-training/facts';
import { useNarrow } from '../tool-calling/kit';
import '../fine-tuning/kit';
import './post-training.css';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';

/** Every chapter says it: the policy is a choice among written answers, not a language model (R6). */
export const TOY =
  'The toy policy is a choice among answers written for this site, not a language model. Its updates run live in your browser.';

/** The hall's stacks for one question under a policy, with rewards once graded. */
export const cardsOf = (q: string, p: Policy, rewards?: number[]): ExamOpts['cards'] =>
  question(q).candidates.map((c, i) => ({ id: c.id, p: p[i], reward: rewards?.[i], gaming: c.gaming }));
/** The Bars tab's bars for one question: before and after, with rewards once graded. */
export const barsOf = (q: string, before: Policy, after: Policy, rewards?: number[]): BarIn[] =>
  question(q).candidates.map((c, i) => ({
    id: c.id,
    before: before[i],
    after: after[i],
    reward: rewards?.[i],
    gaming: c.gaming,
  }));
/** A round's group as the desk shows it: each draft rewarded or not. */
export const groupOf = (r?: Round) => r?.rewards.map(x => x > 0);

/** The bar chart: the drawing as an image, a focusable marker per answer over it (arrow keys, Home, End) and a read-out
 * line under it. */
export function PolicyChart({ bars }: { bars: BarIn[] }) {
  const phone = useNarrow(),
    id = 'pb' + useId().replace(/[^\w-]/g, '');
  const c = policyBars(bars, phone);
  const [cur, setCur] = useState(0);
  const at = Math.min(cur, c.bars.length - 1),
    m = c.bars[at];
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}"><defs>${filterFor(1, 'hand')}</defs><g filter="url(#hand)">${c.svg}</g></svg>`;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(c.bars.length - 1, i));
    setCur(n);
    (document.getElementById(`${id}-${n}`) as SVGElement | null)?.focus();
  };
  const key = (e: KeyboardEvent) => {
    const to = {
      ArrowRight: at + 1,
      ArrowUp: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at - 1,
      Home: 0,
      End: c.bars.length - 1,
    }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      go(to);
    }
  };
  return (
    <figure className="ft-chart pt-bars">
      <svg viewBox={`0 0 ${c.w} ${c.h}`} role="group" aria-label={barsLabel(bars)} onKeyDown={key}>
        <image href={`data:image/svg+xml,${encodeURIComponent(doc)}`} width={c.w} height={c.h} aria-hidden="true" />
        {c.bars.map((b, i) => (
          <g
            key={b.id}
            id={`${id}-${i}`}
            className="ft-mark pt-mark"
            role="button"
            tabIndex={i === at ? 0 : -1}
            aria-pressed={i === at}
            aria-label={barWords(b)}
            onClick={() => go(i)}
            onFocus={() => setCur(i)}
            data-answer={b.id}
          >
            <rect x={b.x - 34} y={c.top} width={68} height={c.base - c.top} fill="transparent" />
            {i === at && (
              <rect x={b.x - 22} y={c.base + 3} width={44} height={c.h - c.base - 6} rx={8} className="pt-ring" />
            )}
          </g>
        ))}
      </svg>
      <p className="ft-readout" aria-live="polite">
        {m ? barWords(m) : 'No answers yet.'}
      </p>
      <ul className="ft-key">
        <li>
          <span className="pt-swatch" data-k="before" aria-hidden="true" />
          before
        </li>
        <li>
          <span className="pt-swatch" aria-hidden="true" />
          after
        </li>
      </ul>
    </figure>
  );
}

/** What a chapter puts on the stage: the hall's settings, the Bars tab, the caption. */
export interface Shown {
  hall: Omit<ExamOpts, 'scale' | 'say'>;
  bars?: BarIn[];
  caption: string;
  stamp?: Stamp;
}
export type View = 'scene' | 'bars';

const FILL = { height: '100%' };
/** The chapters' stage: the exam hall (default) or the Bars tab, one at a time. The tab is the reader's view, kept out
 * of saved progress unless the chapter passes `view` and `onView`. */
export function PostStage({
  shown: s,
  view: kept,
  onView,
  say,
}: {
  shown: Shown;
  view?: View;
  onView?: (v: View) => void;
  /** the step's callout, drawn over a part of the picture (EXAM_PARTS); the Bars tab ignores it */
  say?: Say;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const o: ExamOpts = { ...s.hall, scale: useNarrow() ? 2.2 : 1.3, say };
  return (
    <div className="tc-stage pt-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={view === 'bars'}
          disabled={!s.bars}
          onClick={() => setView('bars')}
        >
          Bars
        </button>
      </div>
      <div className="tc-frame">
        {view === 'bars' && s.bars ? (
          <div className="ft-scroll">
            <PolicyChart bars={s.bars} />
          </div>
        ) : (
          <IsoStage className="hall" board={EXAM_BOARD} style={FILL} scene={examScene(o)} label={examLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {s.stamp && <span className={`stamp ${STAMP_CLASS[s.stamp]}`}>{s.stamp}</span>}
        <span className="txt">{s.caption}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/post-training/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

const Mark = ({ ok }: { ok: boolean }) => (
  <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>
);

/** One written answer, labelled as written for this site, with a live mark per rule asked for and its note. */
export function AnswerCard({ q, i, rules = [], p }: { q: string; i: number; rules?: RuleId[]; p?: number }) {
  const c = question(q).candidates[i];
  return (
    <div className="tc-def pt-answer" data-answer={c.id} data-gaming={c.gaming ? '1' : undefined}>
      <p className="lbl">
        Answer {c.id} <span className="ft-tag">written for this site</span>
        {p !== undefined && <span className="pt-p">{Math.round(p * 100)}%</span>}
      </p>
      <p>“{c.text}”</p>
      {rules.length > 0 && (
        <p className="pt-marks">
          {RULES.filter(r => rules.includes(r.id)).map(r => (
            <span key={r.id}>
              <Mark ok={passes(r.id, q, c.text)} /> {r.label.toLowerCase()}
            </span>
          ))}
        </p>
      )}
      <p className="note">{c.note}</p>
    </div>
  );
}

/** The question the answers reply to. */
export const Asked = ({ q }: { q: string }) => (
  <div className="tc-def pt-asked">
    <p className="lbl">The customer asks</p>
    <p>“{question(q).query}”</p>
  </div>
);

/** The grader's rules as checkboxes, one per rule. */
export function RulePicker({ value, onChange }: { value: RuleId[]; onChange: (r: RuleId[]) => void }) {
  return (
    <fieldset className="pt-rules">
      <legend>The grader’s rules (an answer scores a point per rule it passes)</legend>
      {RULES.map(r => (
        <label key={r.id} data-rule={r.id}>
          <input
            type="checkbox"
            checked={value.includes(r.id)}
            onChange={e =>
              onChange(RULES.map(x => x.id).filter(x => (x === r.id ? e.currentTarget.checked : value.includes(x))))
            }
          />{' '}
          {r.label}
        </label>
      ))}
    </fieldset>
  );
}

/** The maths, folded away (R6: optional). */
export const Maths = ({ children }: { children: React.ReactNode }) => (
  <details className="pt-maths">
    <summary>The maths</summary>
    {children}
  </details>
);
