import type { Step } from '../story/steps';

interface PuzzleSpec<S> extends Omit<Step<S>, 'predicate' | 'setup' | 'solution'> {
  broken: (state: S) => S; // starting state the learner must fix
  verdict: (state: S) => boolean; // true once the outcome (e.g. the answer verdict) is right
  solution: (state: S) => S; // what "Show me" applies
}

/** A fix-the-pipeline puzzle is a step: broken on entry, passes on the verdict, solvable with Show me. */
export function puzzle<S>({ broken, verdict, solution, ...step }: PuzzleSpec<S>): Step<S> {
  return { ...step, setup: broken, predicate: verdict, solution };
}

export function Verdict({ fixed }: { fixed: boolean }) {
  return <span className={`stamp ${fixed ? 'correct' : 'wrong'}`}>{fixed ? 'FIXED' : 'BROKEN'}</span>;
}
