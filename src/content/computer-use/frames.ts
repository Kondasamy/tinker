// A computer-use run read beat by beat (each look, each click, the closing note) and what the puppet desk shows at each.
// Plain TypeScript with no styles, so pages that only draw the desk (home's card, share images) can use it.
import type { PuppetOpts } from '../../components/scenes/puppetScene';
import { run as runLoop, type Run, type Setup, type Step as LoopStep } from '../../lib/computer-use/loop';
import { BANNER, shotOf, viewOf, type View } from '../../lib/computer-use/screens';
import { RECORDING } from '../../lib/computer-use/turns';
import { thousands } from '../../lib/multimodal/patches';
const cache = new Map<string, Run>();
/** A run of the recorded agent under a setup, kept per page (the same setup always plays the same). */
export function play(s: Partial<Setup> & { case: string }): Run {
  const k = JSON.stringify(s);
  if (!cache.has(k)) cache.set(k, runLoop(RECORDING, s));
  return cache.get(k)!;
}

export type Beat = Extract<LoopStep, { kind: 'look' | 'click' | 'done' }>;
export const beatsOf = (r: Run) => r.steps.filter((s): s is Beat => s.kind !== 'norecord');
/** How many beats in the run's n-th beat of a kind sits (1-based): the stage's `at` for it. */
export const nthBeat = (r: Run, kind: Beat['kind'], n: number) => {
  let seen = 0;
  return beatsOf(r).findIndex(b => b.kind === kind && ++seen === n) + 1;
};
/** The run's clicks, in order. */
export const clicksOf = (r: Run) => beatsOf(r).filter((b): b is Extract<Beat, { kind: 'click' }> => b.kind === 'click');
/** The first screen, before anything is looked at. */
export const HOME = viewOf({ screen: 'home', lines: [], plus: false });

const outcomeWords = (b: Extract<Beat, { kind: 'click' }>) =>
  b.outcome === 'refused'
    ? `The host refused: ${BANNER.host} isn’t on the allow-list.`
    : b.outcome === 'denied'
      ? 'The host asked a person first, and they said no.'
      : b.el
        ? `It lands on ${b.el.label}.`
        : 'It lands on nothing.';

/** What the stage shows `at` beats into a run (0: the first screen, nothing done yet). */
export function frameAt(r: Run, at: number) {
  const beats = beatsOf(r),
    n = Math.max(0, Math.min(at, beats.length)),
    cur = beats[n - 1];
  const looks = beats.slice(0, n).filter(b => b.kind === 'look');
  const look = looks.at(-1);
  const view: View = cur?.kind === 'click' ? cur.view : (look?.view ?? HOME);
  const click = cur?.kind === 'click' ? cur : undefined;
  const opts: Omit<PuppetOpts, 'scale' | 'say'> = {
    view,
    flash: cur?.kind === 'look',
    stale: look?.stale,
    frames: looks.map(l => l.view),
    camera: look ? `LOOK ${looks.length} · ${thousands(look.tokens)} TOKENS` : 'CAMERA',
    click: click && { real: click.real, outcome: click.outcome, label: click.el?.label },
  };
  const caption = !cur
    ? `The portal’s home page, ${shotOf(r.setup.size).w} px screenshots. Nothing done yet.`
    : cur.kind === 'look'
      ? `Look ${looks.length}: a screenshot of ${view.title}${cur.stale ? ', taken before the page changed' : ''}, ${thousands(cur.tokens)} tokens.`
      : cur.kind === 'click'
        ? `“${cur.text}” ${outcomeWords(cur)}`
        : `“${cur.text}”`;
  return { opts, caption, cur, look, click, done: n >= beats.length, total: beats.length };
}
