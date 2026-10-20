import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { reduce, startRun, isRun, type Step, type Run, type Action } from './steps';
import { loadChapter, saveChapter, markDone } from '../../lib/progress';
import { CHAPTERS } from '../../lib/chapters';
import Drawer from './Drawer';

/** What a step control gets. `apply` hands the next state to the runner, which checks the step's predicate. */
export interface ControlProps<S> { state: S; apply: (next: S) => void; focused: boolean }
/** What the hero stage (canvas or scene) gets. `inspect` opens the drawer without changing the step;
 * `sync` applies a state the learner did not cause (it can advance the step but never counts as a failed try). */
export interface StageProps<S> { state: S; apply: (next: S) => void; sync: (next: S) => void; focus?: string; inspect: (panel: string) => void }
export interface Panel<S> { title: string; render: (state: S, apply: (next: S) => void) => ReactNode }

interface Props<S> {
  chapter: string;
  steps: Step<S>[];
  initial: S;
  controls: Record<string, (p: ControlProps<S>) => ReactNode>;
  stage: (p: StageProps<S>) => ReactNode;
  panels?: Record<string, Panel<S>>;
  inspectPanel?: string;
  next?: { href: string; title: string };
  idleMs?: number;
}

export default function StepRunner<S>({ chapter, steps, initial, controls, stage, panels = {}, inspectPanel, next, idleMs = 30_000 }: Props<S>) {
  const [run, dispatch] = useReducer((r: Run<S>, a: Action<S>) => reduce(steps, r, a), undefined, () => startRun(steps, initial));
  const [focusDrawer, setFocusDrawer] = useState(0);
  const loaded = useRef(false);
  const step = steps[run.index];
  const apply = (state: S) => dispatch({ type: 'apply', state });
  const sync = (state: S) => dispatch({ type: 'sync', state });
  const inspect = (panel: string) => { dispatch({ type: 'inspect', panel }); setFocusDrawer(n => n + 1); };

  // Save before restoring (effect order), so the first, seeded render never overwrites saved work.
  useEffect(() => { if (loaded.current) saveChapter(chapter, run); }, [chapter, run]);
  useEffect(() => {
    const saved = loadChapter<Run<S>>(chapter);
    if (isRun(steps, saved)) dispatch({ type: 'restore', run: saved });
    loaded.current = true;
  }, [chapter, steps]);

  useEffect(() => {
    if (!run.done) return;
    markDone(chapter);
    window.dispatchEvent(new Event('rag-progress'));
  }, [chapter, run.done]);

  useEffect(() => {
    if (!step.hint || run.hint || run.done) return;
    const t = setTimeout(() => dispatch({ type: 'idle' }), idleMs);
    return () => clearTimeout(t);
  }, [step, run, idleMs]);

  // the story column scrolls on its own: bring the step being worked on into view whenever it changes
  const cardRef = useRef<HTMLElement>(null);
  const firstScroll = useRef(true);
  useEffect(() => {
    if (firstScroll.current) { firstScroll.current = false; if (run.index === 0) return; }   // a fresh chapter opens on its intro
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [run.index, run.done]);

  const panel = run.drawer ? panels[run.drawer] : undefined;
  const n = CHAPTERS.findIndex(c => c.id === chapter), ch = CHAPTERS[n];
  const past = steps.slice(0, run.done ? steps.length - 1 : run.index);
  const inspectTarget = inspectPanel ?? Object.keys(panels)[0];

  return (
    <div className="chapter">
      <section className="stage" aria-label="Scene">
        {stage({ state: run.state, apply, sync, focus: step.focus, inspect })}
      </section>
      <div className="side">
        {ch && (
          <header className="intro">
            <p className="eyebrow">Chapter {n + 1} of {CHAPTERS.length}</p>
            <h1>{ch.title}</h1>
            <p className="story">{ch.intro.story}</p>
            <p className="goal"><strong>This chapter:</strong> {ch.intro.goal}</p>
            <div className="learn">
              <p className="lbl">You will learn</p>
              <ul>{ch.intro.learn.map(l => <li key={l}>{l}</li>)}</ul>
            </div>
            {ch.intro.terms.length > 0 && (
              <details className="terms">
                <summary>Words you’ll meet ({ch.intro.terms.length})</summary>
                <dl>{ch.intro.terms.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
              </details>
            )}
            <p className="how">The picture on the left is live. Each step below asks you to do one thing in it; the story continues here as you go.</p>
          </header>
        )}
        {past.length > 0 && (
          <ol className="log" aria-label="Story so far">
            {past.map(st => <li key={st.id}>{st.narration}</li>)}
          </ol>
        )}
        <section className="card" aria-label="Next step" ref={cardRef}>
          <div aria-live="polite" aria-atomic="true">
            <p className="count">{run.done ? 'Chapter complete' : `Step ${run.index + 1} of ${steps.length}`}</p>
            <p className="narration">{step.narration}</p>
          </div>
          {step.visibleControls.map(name => (
            <div key={name} className="control" data-control={name} data-focus={step.focus === name || undefined}>
              {controls[name]?.({ state: run.state, apply, focused: step.focus === name })}
            </div>
          ))}
          {run.hint && step.hint && !run.done && <p className="hint" role="status">Hint: {step.hint}</p>}
          {run.done && next && <a className="big" href={next.href}>Next: {next.title} →</a>}
          <div className="recover">
            <button type="button" className="chip" onClick={() => dispatch({ type: 'back' })} disabled={run.index === 0}>← Back</button>
            <button type="button" className="chip" onClick={() => dispatch({ type: 'reset' })}>Reset this step</button>
            {step.solution && !run.done && <button type="button" className="chip" onClick={() => dispatch({ type: 'showMe' })}>Show me</button>}
            {inspectTarget && <button type="button" className="chip" onClick={() => inspect(inspectTarget)}>Inspect</button>}
          </div>
        </section>
        {panel && (
          <Drawer title={panel.title} focusKey={focusDrawer} onClose={() => dispatch({ type: 'closeDrawer' })}>
            {panel.render(run.state, apply)}
          </Drawer>
        )}
      </div>
    </div>
  );
}
