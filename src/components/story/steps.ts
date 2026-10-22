// Step machine for story chapters (KTD9). Pure: the runner component, the canvas (U6) and the engine (U4)
// only meet here through the chapter's state type S.

export interface Step<S> {
  id: string;
  narration: string;
  /** The one control or block this step is about; the stage may highlight it. */
  focus?: string;
  /** Controls the runner renders for this step; everything else stays hidden. */
  visibleControls: string[];
  predicate: (state: S) => boolean;
  hint?: string;
  /** Drawer panel this step opens on entry; null closes it (the drawer would show stale content). */
  opensDrawer?: string | null;
  /** Puzzles: the broken starting state, applied on entry. */
  setup?: (state: S) => S;
  /** Puzzles: what "Show me" applies. */
  solution?: (state: S) => S;
}

export interface Run<S> {
  /** the chapter's ordered step ids when the run was made: a saved run resumes only on the same steps (KTD4) */
  ids: string[];
  index: number;
  state: S;
  starts: S[]; // state at entry of each step reached, for Back and Reset
  fails: number;
  hint: boolean;
  done: boolean;
  drawer: string | null;
}

export type Action<S> =
  | { type: 'apply'; state: S }
  /** Like apply, but a miss is not a learner attempt (e.g. a verdict arriving after an async run). */
  | { type: 'sync'; state: S }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'showMe' }
  | { type: 'idle' }
  | { type: 'inspect'; panel: string }
  | { type: 'closeDrawer' }
  | { type: 'restore'; run: Run<S> };

export const HINT_AFTER = 3;

function enter<S>(steps: Step<S>[], index: number, state: S, starts: S[], drawer: string | null): Run<S> {
  const step = steps[index];
  const s = step.setup ? step.setup(state) : state;
  return {
    ids: steps.map(st => st.id),
    index,
    state: s,
    starts: [...starts.slice(0, index), s],
    fails: 0,
    hint: false,
    done: false,
    drawer: step.opensDrawer === undefined ? drawer : step.opensDrawer,
  };
}

export const startRun = <S>(steps: Step<S>[], initial: S): Run<S> => enter(steps, 0, initial, [], null);

/** A saved run fit to resume: well formed, and saved on exactly these steps. A run saved before runs carried
 * their ids is checked against the chapter's `legacy` ids instead. Anything else restarts the chapter (KTD4). */
export function isRun<S>(steps: Step<S>[], x: unknown, legacy?: string[]): x is Run<S> {
  const r = x as Partial<Run<S>>;
  if (
    !r ||
    !Number.isInteger(r.index) ||
    r.index! < 0 ||
    r.index! >= steps.length ||
    !Array.isArray(r.starts) ||
    r.starts.length !== r.index! + 1
  )
    return false;
  const ids = r.ids ?? legacy;
  return Array.isArray(ids) && ids.length === steps.length && steps.every((st, i) => st.id === ids[i]);
}

export function reduce<S>(steps: Step<S>[], run: Run<S>, a: Action<S>): Run<S> {
  const step = steps[run.index];
  switch (a.type) {
    case 'apply':
    case 'sync': {
      if (run.done) return { ...run, state: a.state };
      if (step.predicate(a.state)) {
        if (run.index === steps.length - 1) return { ...run, state: a.state, done: true, hint: false };
        return enter(steps, run.index + 1, a.state, run.starts, run.drawer);
      }
      if (a.type === 'sync') return { ...run, state: a.state };
      const fails = run.fails + 1;
      return { ...run, state: a.state, fails, hint: run.hint || fails >= HINT_AFTER };
    }
    case 'back':
      return run.index === 0
        ? run
        : {
            ...run,
            index: run.index - 1,
            state: run.starts[run.index - 1],
            starts: run.starts.slice(0, run.index),
            fails: 0,
            hint: false,
            done: false,
          };
    case 'reset':
      return { ...run, state: run.starts[run.index], fails: 0, hint: false, done: false };
    case 'showMe':
      return step.solution ? reduce(steps, run, { type: 'apply', state: step.solution(run.state) }) : run;
    case 'idle':
      return run.done ? run : { ...run, hint: true };
    case 'inspect':
      return { ...run, drawer: a.panel };
    case 'closeDrawer':
      return { ...run, drawer: null };
    case 'restore':
      return a.run;
  }
}
