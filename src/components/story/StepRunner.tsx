import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { reduce, startRun, isRun, type Step, type Run, type Action, type Say } from './steps';
import { loadChapter, saveChapter, markDone } from '../../lib/progress';
import { moduleOf } from '../../lib/modules';
import Drawer from './Drawer';
import { markTerms, type Segment, type TermMark } from './terms';

/** What a step control gets. `apply` hands the next state to the runner, which checks the step's predicate;
 * `sync` does too, but a miss is never a failed try (e.g. "I'm not sure"). */
export interface ControlProps<S> {
  state: S;
  apply: (next: S) => void;
  sync: (next: S) => void;
  focused: boolean;
}
/** What the hero stage (canvas or scene) gets. `inspect` opens the drawer without changing the step;
 * `sync` applies a state the learner did not cause (it can advance the step but never counts as a failed try). */
export interface StageProps<S> {
  state: S;
  apply: (next: S) => void;
  sync: (next: S) => void;
  focus?: string;
  /** the step's callout for the picture (KTD7) */
  say?: Say;
  /** 1-based chapter number within the module */
  chapter?: number;
  inspect: (panel: string, sheet?: boolean) => void;
}
export interface Panel<S> {
  title: string;
  render: (state: S, apply: (next: S) => void) => ReactNode;
}

interface Props<S> {
  /** registry id; RAG when left out */
  module?: string;
  chapter: string;
  steps: Step<S>[];
  initial: S;
  controls: Record<string, (p: ControlProps<S>) => ReactNode>;
  stage: (p: StageProps<S>) => ReactNode;
  panels?: Record<string, Panel<S>>;
  inspectPanel?: string;
  next?: { href: string; title: string };
  idleMs?: number;
  /** false hides "Show me" (e.g. while data a step's predicate or solution reads is still loading) */
  ready?: boolean;
}

export default function StepRunner<S>({
  module = 'rag',
  chapter,
  steps,
  initial,
  controls,
  stage,
  panels = {},
  inspectPanel,
  next,
  idleMs = 30_000,
  ready = true,
}: Props<S>) {
  const [run, dispatch] = useReducer(
    (r: Run<S>, a: Action<S>) => reduce(steps, r, a),
    undefined,
    () => startRun(steps, initial),
  );
  const [focusDrawer, setFocusDrawer] = useState(0);
  const [sheet, setSheet] = useState(false); // opened from the picture: a bottom sheet on phones
  useEffect(() => setSheet(false), [run.index]); // a step's own drawer flows below its card again
  const loaded = useRef(false),
    restoring = useRef(false);
  const step = steps[run.index];
  const apply = (state: S) => dispatch({ type: 'apply', state });
  const sync = (state: S) => dispatch({ type: 'sync', state });
  const inspect = (panel: string, fromStage = false) => {
    dispatch({ type: 'inspect', panel });
    setSheet(fromStage);
    setFocusDrawer(n => n + 1);
  };

  const chapters = moduleOf(module).chapters;
  const n = chapters.findIndex(c => c.id === chapter),
    ch = chapters[n];

  // Save before restoring (effect order), so the first, seeded render never overwrites saved work.
  useEffect(() => {
    if (loaded.current) saveChapter(module, chapter, run);
  }, [module, chapter, run]);
  useEffect(() => {
    // a run saved on other steps restarts the chapter (KTD4); what is done stays done
    const saved = loadChapter<Run<S>>(module, chapter);
    if (isRun(steps, saved, ch?.legacySteps)) {
      // the restore moves the run off step 1; that move must not scroll the story past the intro
      if (saved.index !== 0 || saved.done) restoring.current = true;
      dispatch({ type: 'restore', run: { ...saved, ids: steps.map(st => st.id) } });
    }
    loaded.current = true;
  }, [module, chapter, steps, ch]);

  useEffect(() => {
    if (!run.done) return;
    markDone(module, chapter);
    window.dispatchEvent(new CustomEvent('tinker-progress', { detail: { module } }));
  }, [module, chapter, run.done]);

  useEffect(() => {
    if (!step.hint || run.hint || run.done) return;
    const t = setTimeout(() => dispatch({ type: 'idle' }), idleMs);
    return () => clearTimeout(t);
  }, [step, run, idleMs]);

  // the story column scrolls on its own: bring the step being worked on into view whenever it changes
  const cardRef = useRef<HTMLElement>(null);
  const firstScroll = useRef(true);
  const toCard = () =>
    cardRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  useEffect(() => {
    // every visit opens on the chapter's intro, a resumed run too (the intro links on to the step)
    if (firstScroll.current) {
      firstScroll.current = false;
      return;
    }
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    toCard();
  }, [run.index, run.done]);

  // each chapter word is marked once, at its first use in the narration (KTD3); one definition open at a time
  const marked = useMemo(
    () =>
      markTerms(
        steps.flatMap(st => [st.narration, st.act ?? '']), // narration then act, per step
        ch?.intro.terms ?? [],
      ),
    [steps, ch],
  );
  const [term, setTerm] = useState<TermMark | null>(null);
  useEffect(() => setTerm(null), [run.index]);
  const withTerms = (segs: Segment[]) =>
    segs.map(seg =>
      typeof seg === 'string' ? (
        seg
      ) : (
        <button
          key={seg.term}
          type="button"
          className="term"
          aria-label={`${seg.text}, define`}
          aria-expanded={term?.term === seg.term}
          aria-controls="term-def"
          onClick={() => setTerm(t => (t?.term === seg.term ? null : seg))}
        >
          {seg.text}
        </button>
      ),
    );
  const [logOpen, setLogOpen] = useState(false); // kept while the reader stays, even when Back empties the log

  const panel = run.drawer ? panels[run.drawer] : undefined;
  const past = steps.slice(0, run.done ? steps.length - 1 : run.index);
  const inspectTarget = inspectPanel ?? Object.keys(panels)[0];

  return (
    <div className="chapter">
      <section className="stage" aria-label="Scene">
        {stage({ state: run.state, apply, sync, focus: step.focus, say: step.say, chapter: n + 1, inspect })}
      </section>
      <div className="side">
        {ch && (
          <header className="intro">
            <p className="eyebrow">
              Chapter {n + 1} of {chapters.length}
            </p>
            <h1>{ch.title}</h1>
            <p className="story">{ch.intro.story}</p>
            <p className="goal">
              <strong>This chapter:</strong> {ch.intro.goal}
            </p>
            <details className="about">
              <summary>About this chapter</summary>
              <p className="lbl">You will learn</p>
              <ul>
                {ch.intro.learn.map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {ch.intro.terms.length > 0 && (
                <>
                  <p className="lbl">Words you’ll meet</p>
                  <dl>
                    {ch.intro.terms.map(([t, d]) => (
                      <div key={t}>
                        <dt>{t}</dt>
                        <dd>{d}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </details>
            {(run.index > 0 || run.done) && (
              <button type="button" className="chip resume" onClick={toCard}>
                {run.done ? 'You finished this chapter: see the end ↓' : `Continue at step ${run.index + 1} ↓`}
              </button>
            )}
          </header>
        )}
        {past.length > 0 && (
          <details className="log-fold" open={logOpen} onToggle={e => setLogOpen(e.currentTarget.open)}>
            <summary>Story so far ({past.length})</summary>
            <ol className="log" aria-label="Story so far">
              {past.map(st => (
                <li key={st.id}>{st.narration}</li>
              ))}
            </ol>
          </details>
        )}
        <section
          className="card"
          aria-label="Next step"
          ref={cardRef}
          onKeyDown={e => {
            if (e.key === 'Escape' && term) setTerm(null);
          }}
        >
          <div aria-live="polite" aria-atomic="true">
            <p className="count">{run.done ? 'Chapter complete' : `Step ${run.index + 1} of ${steps.length}`}</p>
            <p className="narration">{withTerms(marked[2 * run.index] ?? [step.narration])}</p>
            {step.act && !run.done && (
              <p className="act">
                <span>{withTerms(marked[2 * run.index + 1] ?? [step.act])}</span>
              </p>
            )}
          </div>
          {/* outside the atomic live region, so opening a word never re-reads the whole step */}
          <div id="term-def" className="term-def" aria-live="polite">
            {term && (
              <p>
                <strong>{term.term}:</strong> {term.def}
              </p>
            )}
          </div>
          {step.visibleControls.map(name => (
            <div key={name} className="control" data-control={name} data-focus={step.focus === name || undefined}>
              {controls[name]?.({ state: run.state, apply, sync, focused: step.focus === name })}
            </div>
          ))}
          {run.hint && step.hint && !run.done && (
            <p className="hint" role="status">
              Hint: {step.hint}
            </p>
          )}
          {run.done && next && (
            <a className="big" href={next.href}>
              Next: {next.title} →
            </a>
          )}
          {run.done && !next && chapters.at(-1)?.id === chapter && (
            <a className="big" href={`/${module}/recap/`}>
              Recap: what do you remember? →
            </a>
          )}
          <div className="recover">
            <button
              type="button"
              className="chip"
              onClick={() => dispatch({ type: 'back' })}
              disabled={run.index === 0}
            >
              ← Back
            </button>
            <button type="button" className="chip" onClick={() => dispatch({ type: 'reset' })}>
              Reset this step
            </button>
            {step.solution && !run.done && ready && (
              <button type="button" className="chip" onClick={() => dispatch({ type: 'showMe' })}>
                Show me
              </button>
            )}
            {inspectTarget && (
              <button type="button" className="chip" onClick={() => inspect(inspectTarget)}>
                Inspect
              </button>
            )}
          </div>
        </section>
        {panel && (
          <Drawer
            title={panel.title}
            focusKey={focusDrawer}
            sheet={sheet}
            onClose={() => {
              dispatch({ type: 'closeDrawer' });
              setSheet(false);
            }}
          >
            {panel.render(run.state, apply)}
          </Drawer>
        )}
      </div>
    </div>
  );
}
