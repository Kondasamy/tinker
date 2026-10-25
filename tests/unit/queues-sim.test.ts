// Queues' tick simulator (U5): the plan's scenarios (a line that never forms, a backlog that more workers drain, a crash
// mid-job and the job that runs twice, a lease shorter than the work, the job that never works, jitter's seed), every
// job ending once, and each effect the chapters teach pinned in data/queues/pinned.json (KTD12; WRITE_PINNED=1
// rewrites the scenes).
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ALL_JOBS,
  JOBS,
  POISON,
  SCENES,
  SHOWN_CRASH,
  TICKS,
  clock,
  delayOf,
  policyOf,
  resultOf,
  simulate,
  type Job,
  type Run,
} from '../../src/lib/queues/sim';
import day from '../../data/queues/day.json' with { type: 'json' };

const job = (id: string, t: number, extra: Partial<Job> = {}): Job => ({ id, t, who: id, item: 'x', ...extra });
const summary = (r: Run) => ({
  done: r.done,
  ranTwice: r.ranTwice,
  deadLettered: r.deadLettered,
  dead: r.dead,
  waitedMax: r.waitedMax,
  retries: r.retries,
  doubleShipped: r.doubleShipped,
  left: r.left,
  pageWaitMax: r.pageWaitMax,
  bunch: r.bunch,
});

describe('the morning', () => {
  it('names every order from data, once, with the poison order kept apart', () => {
    expect(new Set(ALL_JOBS.map(j => j.id)).size).toBe(ALL_JOBS.length);
    expect(ALL_JOBS.filter(j => j.poison)).toEqual([POISON]);
    expect(JOBS).not.toContain(POISON);
    expect(clock(0)).toBe('09:00');
    expect(clock(day.outage.from)).toBe('09:10');
  });

  it('every job ends in one place under every scene: done, dead-lettered, or still on the rail', () => {
    for (const p of Object.values(SCENES)) {
      const r = simulate(p);
      for (const j of r.jobs) expect(Number(j.doneAt !== undefined) + Number(j.deadAt !== undefined)).toBeLessThan(2);
      const last = r.ticks.at(-1)!;
      expect(last.done).toBe(r.done);
      expect(last.dead).toEqual(r.dead);
    }
  });
});

describe('the plan’s scenarios', () => {
  it('one worker, arrivals slower than the work: no job waits', () => {
    const r = simulate(policyOf({ workers: 1 }), [job('a', 0), job('b', 3), job('c', 6)]);
    expect(r.waitedMax).toBe(0);
    expect(r.done).toBe(3);
    expect(r.ticks.every(k => k.waiting.length === 0)).toBe(true);
  });

  it('arrivals faster than one worker: the backlog grows each minute of the flood; three workers drain it', () => {
    const one = simulate(SCENES.one),
      three = simulate(SCENES.three);
    const flood = one.ticks.slice(6, 20).map(k => k.waiting.length);
    for (let i = 1; i < flood.length; i++) expect(flood[i]).toBeGreaterThanOrEqual(flood[i - 1]);
    expect(one.left).toBeGreaterThan(0);
    expect(three.left).toBe(0);
    expect(three.ticks.findLastIndex(k => k.waiting.length > 0)).toBeLessThan(30);
  });

  it('a crash mid-job: the job comes back when its lease runs out and runs again; idempotent jobs ship once', () => {
    const p = { ...SCENES.crash, crashes: [SHOWN_CRASH] };
    const plain = simulate(p),
      safe = simulate({ ...p, idempotent: true });
    const id = simulate(SCENES.crash).ticks[SHOWN_CRASH.tick].workers[SHOWN_CRASH.worker].job!;
    expect(plain.ticks[SHOWN_CRASH.tick].workers[SHOWN_CRASH.worker].state).toBe('down');
    expect(plain.ticks[SHOWN_CRASH.tick].held).toContain(id);
    const back = SHOWN_CRASH.tick + p.lease;
    expect(plain.ticks[back].returned).toContain(id);
    expect(plain.ranTwice).toBe(1);
    expect(resultOf(plain, id).runs).toBe(2);
    expect(plain.doubleShipped).toBe(1);
    expect(safe.ranTwice).toBe(1);
    expect(safe.doubleShipped).toBe(0);
    expect(simulate(SCENES.crash).ranTwice).toBe(0);
  });

  it('a lease shorter than the work: every job runs at least twice, then is dead-lettered after the most tries', () => {
    const r = simulate(policyOf({ workers: 2, lease: 1, maxTries: 3 }), [job('a', 0), job('b', 0)]);
    for (const j of r.jobs) {
      expect(j.runs).toBeGreaterThanOrEqual(2);
      expect(j.tries).toBe(3);
      expect(j.deadAt).toBeDefined();
    }
    expect(r.done).toBe(0);
  });

  it('a job failing every try is dead-lettered after the most tries, and never tried again', () => {
    const r = simulate(SCENES.shelf),
      moe = resultOf(r, POISON.id);
    expect(moe.tries).toBe(SCENES.shelf.maxTries);
    expect(r.dead).toEqual([POISON.id]);
    const after = r.ticks.slice(moe.deadAt! + 1);
    expect(after.every(k => k.workers.every(w => w.job !== POISON.id))).toBe(true);
    // with no limit it keeps coming back all morning
    const f = simulate(SCENES.forever);
    expect(resultOf(f, POISON.id).tries).toBeGreaterThan(moe.tries * 3);
    expect(f.dead).toEqual([]);
  });

  it('jitter: the same seed gives the same run; another seed spreads the retries differently', () => {
    expect(simulate(SCENES.jitter)).toEqual(simulate(SCENES.jitter));
    const other = simulate({ ...SCENES.jitter, seed: SCENES.jitter.seed + 1 });
    const due = (r: Run) => r.ticks.map(k => k.delayed.length).join();
    expect(due(other)).not.toBe(due(simulate(SCENES.jitter)));
    const d = [1, 2, 3, 4].map(n => delayOf(SCENES.jitter, 'L114', n));
    for (const [i, x] of d.entries()) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(delayOf(SCENES.backoff, 'L114', i + 1));
    }
  });

  it('backoff keeps the courier’s outage from using up every try; jitter bunches fewer retries into one minute', () => {
    const none = simulate(SCENES.noBackoff),
      exp = simulate(SCENES.backoff),
      jit = simulate(SCENES.jitter);
    expect(none.deadLettered).toBeGreaterThan(0);
    expect(exp.deadLettered).toBe(0);
    expect(jit.deadLettered).toBe(0);
    expect(jit.bunch).toBeLessThan(exp.bunch);
  });

  it('inline, the customer’s page waits for the work; with a queue it answers at once', () => {
    expect(simulate(SCENES.inline).pageWaitMax).toBeGreaterThan(10);
    expect(simulate(SCENES.one).pageWaitMax).toBe(0);
  });

  it('runs to the end of the morning', () => {
    expect(simulate(SCENES.one).ticks).toHaveLength(TICKS);
  });
});

describe('pins', () => {
  it('each scene’s counts equal data/queues/pinned.json', () => {
    const got = Object.fromEntries(Object.entries(SCENES).map(([k, p]) => [k, summary(simulate(p))])) as Record<
      string,
      ReturnType<typeof summary>
    >;
    got.crashed = summary(simulate({ ...SCENES.crash, crashes: [SHOWN_CRASH] }));
    got.crashedSafe = summary(simulate({ ...SCENES.crash, crashes: [SHOWN_CRASH], idempotent: true }));
    const file = 'data/queues/pinned.json',
      pinned = JSON.parse(readFileSync(file, 'utf8'));
    if (process.env.WRITE_PINNED) writeFileSync(file, `${JSON.stringify({ ...pinned, scenes: got }, null, 2)}\n`);
    else expect(got).toEqual(pinned.scenes);
  });
});
