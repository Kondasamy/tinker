// Pieces the coding-agents chapters share: a run read beat by beat (each turn, carried out by the host), the stage (the
// agent's desk, or the Code tab: the file read, the search's hits, or the patch with a checkbox per hunk and "Run
// tests", KTD15), the step-through buttons, the test results as text, and a cited fact. Every string, code included,
// is a React text node here; the desk escapes its pills (esc).
import { Fragment, useState } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import { STAMP_CLASS, type Stamp } from '../../lib/iso/flat';
import { DESK_BOARD, beatsOf, deskAt, deskLabel, deskScene, type Beat } from '../../components/scenes/deskScene';
import { fileRows, fileText, patchPanel, searchRows, type Row } from '../../components/scenes/codePanel';
import { HOST, run as runLoop, ticketOf, type Run, type Setup } from '../../lib/coding-agents/loop';
import { fullOf as fullOfPatch, hunkCount, patchOf, version } from '../../lib/coding-agents/repo';
import type { TestResult } from '../../lib/coding-agents/tests';
import { RECORDING } from '../../lib/coding-agents/turns';
import { fact } from '../../lib/coding-agents/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import './coding-agents.css';

export { beatsOf, type Beat };
export type CaView = 'scene' | 'code';
const FILL = { height: '100%' };

const cache = new Map<string, Run>();
/** A run of the recorded agent under a setup, kept per page (the same setup always plays the same). */
export function play(s: Partial<Setup> & { case: string }): Run {
  const k = JSON.stringify(s);
  if (!cache.has(k)) cache.set(k, runLoop(RECORDING, s));
  return cache.get(k)!;
}
/** The 1-based beat of a run's n-th beat of a kind: the stage's `at` for it. */
export const nthBeat = (r: Run, kind: Beat['kind'], n = 1) => {
  let seen = 0;
  return beatsOf(r).findIndex(b => b.kind === kind && ++seen === n) + 1;
};
export const passed = (t: TestResult[]) => t.filter(x => x.pass).length;
/** The live results of the run's last test run up to `at`, if any. */
export const testsAt = (r: Run, at: number) =>
  beatsOf(r)
    .slice(0, at)
    .filter((b): b is Extract<Beat, { kind: 'run' }> => b.kind === 'run' && !!b.tests)
    .at(-1)?.tests;

function outcomeWords(b: Beat): string {
  if (b.kind === 'search') return ` ${b.hits.length} files match: ${b.tokens} tokens to read.`;
  if (b.kind === 'read') return ` ${b.tokens} tokens.`;
  if (b.kind === 'edit') {
    const n = hunkCount(version(b.path, b.from).text, version(b.path, fullOf(b)).text);
    if (b.outcome === 'refused') return ' The host refused: test files are protected.';
    const k = [...Array(n).keys()].filter(i => (b.mask >> i) & 1).length;
    return b.outcome === 'reviewed' ? ` You kept ${k} of ${n} hunks.` : ` ${n} hunks.`;
  }
  if (b.kind === 'run') {
    if (b.tests) return ` ${passed(b.tests)} of ${b.tests.length} tests pass.`;
    if (b.outcome === 'denied') return ' The host asked a person, who said no.';
    if (b.outcome === 'refused')
      return b.tier === 'never' ? ' Refused: it’s on the never list.' : ' Refused: not on the allow-list.';
    return b.tier === 'allow'
      ? ' It ran.'
      : b.tier === 'ask'
        ? ' A person approved it, and it ran.'
        : ' Nothing stopped it: it ran.';
  }
  return '';
}
const fullOf = (b: Extract<Beat, { kind: 'edit' }>) => fullOfPatch(patchOf(b.patch));

/** The caption `at` beats into a run (0: the ticket, nothing done yet). */
export function captionAt(r: Run, at: number) {
  const b = beatsOf(r)[at - 1];
  if (!b) {
    const t = ticketOf(r.case);
    return `Ticket ${t.id} from ${t.from}: “${t.says}”`;
  }
  return `“${b.text}”${outcomeWords(b)}`;
}

/** The Code tab for a beat: the patch (with a checkbox per hunk while it is under review), the file read, or the hits. */
function codeOf(r: Run, at: number): { title: string; rows: Row[]; patch?: string } {
  const beats = beatsOf(r).slice(0, Math.max(0, at));
  const b = [...beats].reverse().find(x => x.kind === 'edit' || x.kind === 'read' || x.kind === 'search');
  if (!b) return { title: 'src/discount.ts', rows: fileRows(fileText('src/discount.ts')) };
  if (b.kind === 'edit') {
    const p = patchPanel(b.patch);
    return { title: `${p.title}: the agent’s patch`, rows: p.rows, patch: b.patch };
  }
  if (b.kind === 'search') return { title: `Search: “${b.query}”`, rows: searchRows(b.hits) };
  if (b.kind === 'read') {
    const edits = beats.filter((x): x is Extract<Beat, { kind: 'edit' }> => x.kind === 'edit' && x.path === b.path);
    return { title: b.path, rows: fileRows(fileText(b.path, edits.at(-1)?.to)) };
  }
  return { title: '', rows: [] };
}

export interface Review {
  /** the hunks kept, bit i: hunk i */
  mask: number;
  onMask: (mask: number) => void;
  onRun: () => void;
  /** the tests have run: the boxes lock */
  ran: boolean;
  /** the hunks are set by the chapter, not the reader */
  fixed?: boolean;
}

/** Code as text rows, scrolling sideways inside itself; with a review, a checkbox heads each hunk, then Run tests. */
export function CodeView({
  title,
  rows,
  mask,
  review,
}: {
  title: string;
  rows: Row[];
  /** the hunks shown as kept (all when absent) */
  mask?: number;
  review?: Review;
}) {
  const kept = (h: number) => mask === undefined || Boolean((mask >> h) & 1);
  return (
    <div className="ca-code">
      <p className="ca-code-title">{title}</p>
      <div className="ca-rows" role="region" tabIndex={0} aria-label={`Code: ${title}`}>
        {rows.map((r, i) => {
          const head = r.hunk >= 0 && rows[i - 1]?.hunk !== r.hunk;
          const on = r.hunk < 0 || kept(r.hunk);
          return (
            <Fragment key={i}>
              {head && review && (
                <label className="tc-check ca-hunk">
                  <input
                    type="checkbox"
                    checked={kept(r.hunk)}
                    disabled={review.ran || review.fixed}
                    onChange={e =>
                      review.onMask(
                        e.currentTarget.checked ? review.mask | (1 << r.hunk) : review.mask & ~(1 << r.hunk),
                      )
                    }
                  />{' '}
                  Keep hunk {r.hunk + 1}
                </label>
              )}
              <div className={`ca-line ${r.op}`} data-hunk={r.hunk >= 0 ? r.hunk : undefined} data-kept={on ? 1 : 0}>
                <span className="ca-n" aria-hidden="true">
                  {r.n ?? ''}
                </span>
                <span className="ca-op">{r.op === 'add' ? '+' : r.op === 'del' ? '−' : ' '}</span>
                <code>{r.text}</code>
              </div>
            </Fragment>
          );
        })}
      </div>
      {review && (
        <button type="button" className="big ca-run" disabled={review.ran} onClick={review.onRun}>
          Run tests
        </button>
      )}
    </div>
  );
}

/** The chapters' stage: the agent's desk (default) or the Code tab, one at a time. The tab is the reader's view,
 * kept out of saved progress unless the chapter passes `view` and `onView`. */
export function CaStage({
  run: r,
  at,
  view: kept,
  onView,
  say,
  review,
  caption,
  stamp,
}: {
  run: Run;
  at: number;
  view?: CaView;
  onView?: (v: CaView) => void;
  say?: Say;
  review?: Review;
  caption?: string;
  stamp?: Stamp;
}) {
  const [own, setOwn] = useState<CaView>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const o = { ...deskAt(r, at), scale: useNarrow() ? 2 : 1.2, say };
  const code = codeOf(r, at),
    edit = beatsOf(r)
      .slice(0, at)
      .filter((b): b is Extract<Beat, { kind: 'edit' }> => b.kind === 'edit')
      .at(-1);
  return (
    <div className="tc-stage ca-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'code'} onClick={() => setView('code')}>
          Code
        </button>
      </div>
      <div className="tc-frame">
        {view === 'code' ? (
          <CodeView
            title={code.title}
            rows={code.rows}
            mask={review ? review.mask : code.patch && edit?.patch === code.patch ? edit.mask : undefined}
            review={review}
          />
        ) : (
          <IsoStage className="desk" board={DESK_BOARD} style={FILL} scene={deskScene(o)} label={deskLabel(o)} />
        )}
      </div>
      <p className="tc-caption">
        {stamp && <span className={`stamp ${STAMP_CLASS[stamp]}`}>{stamp}</span>}
        <span className="txt">{caption ?? captionAt(r, at)}</span>
      </p>
    </div>
  );
}

/** Steps the run one turn at a time. Gone once the run has ended. */
export function StepThrough({ r, at, onStep }: { r: Run; at: number; onStep: (n: number) => void }) {
  if (at >= beatsOf(r).length) return null;
  return (
    <button type="button" className="big" onClick={() => onStep(at + 1)}>
      Next turn →
    </button>
  );
}
/** Runs it to the end at once. */
export const RunAll = ({ r, at, onStep, label }: { r: Run; at: number; onStep: (n: number) => void; label: string }) =>
  at >= beatsOf(r).length ? null : (
    <button type="button" className="big" onClick={() => onStep(beatsOf(r).length)}>
      {label}
    </button>
  );

/** The test results as text, beside the lamps. */
export function TestList({ tests }: { tests: TestResult[] }) {
  return (
    <ul className="ca-tests" aria-label="Test results">
      {tests.map(t => (
        <li key={t.id} data-test={t.id} data-pass={t.pass ? 1 : 0}>
          <span className={`stamp ${t.pass ? 'correct' : 'wrong'}`}>{t.pass ? 'PASS' : 'FAIL'}</span> {t.name}
        </li>
      ))}
    </ul>
  );
}

/** A cited fact from data/coding-agents/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said wherever the agent's turns show (R6). */
export const RecordedNote = () => (
  <p className="ca-note">
    The agent’s turns were written for this site to show each lesson; they were not recorded from a real model. The
    code, the patches and the tests are real, and run live in your browser.
  </p>
);

export { HOST };
