// Queues' tick simulator (KTD5): Larkspur's sale morning (data/queues/day.json) run a minute (a tick) at a time. Each
// order puts a job on the queue; a free worker leases the oldest visible job for its service time (planning numbers in
// data/queues/assumptions.json, labelled, never measured). The job books the courier first (the side effect: a parcel
// ships), then prints and emails, then says done (the ack).
//
// - A lease that runs out before the ack (the worker was knocked over, or the job is slower than the lease) makes the
//   job visible again, and the ack that comes late is refused: at-least-once delivery. A job whose work started twice
//   is counted in `ranTwice`; a parcel booked twice in `doubleShipped`, unless jobs are idempotent (a job checks its
//   order first, so a second run books nothing; Payments' idempotency key is the same idea).
// - A try fails when the courier's site is struggling (the outage window: a seeded roll per job and try, web-requests'
//   `lostOn` pattern) or always, for Moe's unreadable address. A failed job waits before its next try: one tick, or
//   base × 2^(tries-1) with backoff, or a seeded random part of that with jitter.
// - Every lease taken is a try, like a queue's receive count. Once a job has had the most tries (0: no limit), its next
//   failure or lapsed lease sends it to the dead-letter shelf.
// - A crash ({ worker, tick }) is an event inserted into the run: in that tick the worker drops its job (the lease stays
//   held until it runs out, so the job never acks) and is down for `restartTicks`.
// - Within a tick: lapsed leases, then retries and arrivals become visible, then free workers take jobs in order, then
//   crashes; the benches are read here, as they are during the minute; then runs that end this tick finish.
import day from '../../../data/queues/day.json' with { type: 'json' };
import data from '../../../data/queues/assumptions.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export const ASSUMPTIONS = data;
export const TICKS = data.ticks;
export const WORKER_NAMES = day.workers;
export const MAX_WORKERS = WORKER_NAMES.length;
export const SERVICE = data.serviceTicks;
export const RESTART = data.restartTicks;
export const OUTAGE = day.outage;
export const DAY_CRASH = day.crash as Crash;

export interface Job {
  id: string;
  t: number;
  who: string;
  item: string;
  kind?: 'pallet';
  /** an order whose job fails every try (Moe's unreadable address) */
  poison?: boolean;
}
export const ALL_JOBS = day.jobs as Job[];
export const POISON = ALL_JOBS.find(j => j.poison)!;
export const JOBS = ALL_JOBS.filter(j => !j.poison);
export const serviceOf = (j: Job) => (j.kind === 'pallet' ? SERVICE.pallet : SERVICE.parcel);
export const jobOf = (id: string) => ALL_JOBS.find(j => j.id === id)!;

export type Backoff = 'none' | 'exp';
export interface Crash {
  worker: number;
  tick: number;
}
export interface Policy {
  workers: number;
  /** ticks a taken job stays hidden from the other workers */
  lease: number;
  /** the most tries before the dead-letter shelf; 0 is no limit */
  maxTries: number;
  backoff: Backoff;
  jitter: boolean;
  idempotent: boolean;
  /** the courier's site struggles for the outage window */
  outage: boolean;
  /** Moe's order is in the morning */
  poison: boolean;
  /** the till does the work inside the request: no queue, the customer's page waits */
  inline: boolean;
  crashes: Crash[];
  seed: number;
}
export const DEFAULTS: Policy = {
  workers: 2,
  lease: 6,
  maxTries: 5,
  backoff: 'exp',
  jitter: false,
  idempotent: false,
  outage: false,
  poison: false,
  inline: false,
  crashes: [],
  seed: data.seed,
};
export const policyOf = (extra: Partial<Policy> = {}): Policy => ({ ...DEFAULTS, ...extra });

/** A tick's clock time, "09:07". */
export const clock = (t: number) => {
  const [h, m] = data.startsAt.split(':').map(Number),
    all = h * 60 + m + t * data.tickMinutes;
  return `${String(Math.floor(all / 60)).padStart(2, '0')}:${String(all % 60).padStart(2, '0')}`;
};

// FNV-1a, so a job's name and try pick their own draw
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
/** A seeded draw in [0, 1) for one job and one use of it. */
export const rollOf = (seed: number, id: string, what: string) => mulberry32((seed ^ hash(`${id}#${what}`)) >>> 0)();
export const outageAt = (t: number, on: boolean) => on && t >= OUTAGE.from && t < OUTAGE.to;
/** How long a job that failed its try-th try waits before it is visible again. */
export function delayOf(p: Policy, id: string, tries: number) {
  if (p.backoff === 'none') return 1;
  const d = data.backoffBase * 2 ** (tries - 1);
  return p.jitter ? 1 + Math.floor(rollOf(p.seed, id, `jitter${tries}`) * d) : d;
}

export type WorkerState = 'idle' | 'busy' | 'down';
export interface WorkerView {
  state: WorkerState;
  /** the job in hand (busy), or dropped and still leased (down), with which try this is */
  job?: string;
  tries?: number;
  /** this try will fail */
  failing?: boolean;
  /** the lease ran out while this worker was still on it: its ack will be refused */
  stale?: boolean;
}
export interface TickState {
  t: number;
  /** visible jobs, oldest first, with their tries so far */
  waiting: { id: string; tries: number }[];
  /** jobs waiting out a retry delay */
  delayed: string[];
  /** jobs whose lease is held by a worker that was knocked over */
  held: string[];
  workers: WorkerView[];
  dead: string[];
  done: number;
  /** parcels booked so far, and jobs booked twice or more */
  shipped: number;
  twice: number;
  /** the courier's site is struggling this minute */
  outage: boolean;
  /** jobs that went back on the rail this tick after a lapsed lease */
  returned: string[];
}
export interface JobResult {
  job: Job;
  tries: number;
  /** tries whose work started (not failed): 2 or more is a job that ran twice */
  runs: number;
  shipments: number;
  doneAt?: number;
  deadAt?: number;
  /** minutes the order waited beyond its own work: undefined for a dead-lettered job */
  waited?: number;
  /** inline: minutes the customer's page waited */
  pageWait?: number;
}
export interface Run {
  policy: Policy;
  ticks: TickState[];
  jobs: JobResult[];
  done: number;
  ranTwice: number;
  deadLettered: number;
  dead: string[];
  /** the longest any good order waited beyond its own work (still unfinished at the end counts to the end) */
  waitedMax: number;
  /** tries after the first, over every job */
  retries: number;
  doubleShipped: number;
  /** good orders not done when the morning ends */
  left: number;
  /** inline: the longest a customer's page waited */
  pageWaitMax: number;
  /** the most retries due in one minute: what jitter spreads */
  bunch: number;
}

interface J extends JobResult {
  status: 'pending' | 'waiting' | 'leased' | 'delayed' | 'done' | 'dead';
  readyAt: number;
  leaseEnd: number;
  holder: number;
}
interface Work {
  j: J;
  id: number;
  end: number;
  fail: boolean;
}

/** Runs the morning under a policy. */
export function simulate(policy: Policy, jobs: Job[] = policy.poison ? ALL_JOBS : JOBS, ticks = TICKS): Run {
  const js: J[] = jobs.map(job => ({
    job,
    tries: 0,
    runs: 0,
    shipments: 0,
    status: 'pending',
    readyAt: -1,
    leaseEnd: -1,
    holder: -1,
  }));
  const queue: J[] = [],
    workers: { run?: Work; downUntil: number; dropped?: Work }[] = Array.from({ length: policy.workers }, () => ({
      downUntil: -1,
    })),
    due = new Map<number, number>(),
    out: TickState[] = [];
  let runId = 0;
  const giveUp = (j: J) => policy.maxTries > 0 && j.tries >= policy.maxTries;
  for (let t = 0; t < ticks; t++) {
    const returned: string[] = [];
    // 1. leases that run out: the job is visible again, or dead-lettered after the most tries
    for (const j of js)
      if (j.status === 'leased' && j.leaseEnd === t) {
        if (giveUp(j)) [j.status, j.deadAt] = ['dead', t];
        else {
          j.status = 'waiting';
          queue.push(j);
          returned.push(j.job.id);
        }
      }
    // 2. retries whose wait is over, then new orders
    for (const j of js)
      if (j.status === 'delayed' && j.readyAt === t) {
        j.status = 'waiting';
        queue.push(j);
      }
    for (const j of js)
      if (j.status === 'pending' && j.job.t === t) {
        j.status = 'waiting';
        queue.push(j);
      }
    // 3. free workers take the oldest visible jobs
    workers.forEach(w => {
      if (w.run || w.downUntil >= t || !queue.length) return;
      const j = queue.shift()!;
      j.tries++;
      j.status = 'leased';
      j.leaseEnd = t + policy.lease;
      j.holder = ++runId;
      const fail =
        !!j.job.poison ||
        (outageAt(t, policy.outage) && rollOf(policy.seed, j.job.id, `try${j.tries}`) < data.outageFailRate);
      if (!fail) {
        j.runs++;
        // the courier is booked first: an idempotent job checks its order and books nothing the second time
        if (!policy.idempotent || j.shipments === 0) j.shipments++;
      }
      w.run = { j, id: runId, end: t + (fail ? data.failTicks : serviceOf(j.job)) - 1, fail };
    });
    // 4. crashes: the worker drops its job (the lease stays held until it runs out) and is down for a while
    for (const c of policy.crashes)
      if (c.tick === t && workers[c.worker]) {
        const w = workers[c.worker];
        if (w.run) w.dropped = w.run;
        w.run = undefined;
        w.downUntil = t + RESTART;
      }
    // the benches as they are during this minute, before this minute's runs end
    const benches: WorkerView[] = workers.map(w =>
      w.downUntil >= t
        ? {
            state: 'down',
            // the dropped job lies on the bench while its lease is still held
            ...(w.dropped && w.dropped.j.status === 'leased' && w.dropped.j.holder === w.dropped.id
              ? { job: w.dropped.j.job.id, tries: w.dropped.j.tries }
              : {}),
          }
        : w.run
          ? {
              state: 'busy',
              job: w.run.j.job.id,
              tries: w.run.j.tries,
              ...(w.run.fail ? { failing: true } : {}),
              ...(w.run.j.holder !== w.run.id || w.run.j.status !== 'leased' ? { stale: true } : {}),
            }
          : { state: 'idle' },
    );
    // 5. runs that end this tick: an ack on a lease still held finishes the job; a failure waits or is dead-lettered
    for (const w of workers) {
      const r = w.run;
      if (!r || r.end !== t) continue;
      w.run = undefined;
      const j = r.j;
      if (j.status !== 'leased' || j.holder !== r.id) continue; // the lease ran out: this ack is refused
      if (!r.fail) [j.status, j.doneAt] = ['done', t];
      else if (giveUp(j)) [j.status, j.deadAt] = ['dead', t];
      else {
        j.status = 'delayed';
        j.readyAt = t + delayOf(policy, j.job.id, j.tries);
        due.set(j.readyAt, (due.get(j.readyAt) ?? 0) + 1);
      }
    }
    const inHand = new Set(workers.map(w => w.run?.j));
    out.push({
      t,
      waiting: queue.map(j => ({ id: j.job.id, tries: j.tries })),
      delayed: js.filter(j => j.status === 'delayed').map(j => j.job.id),
      held: js.filter(j => j.status === 'leased' && !inHand.has(j)).map(j => j.job.id),
      workers: benches,
      dead: js.filter(j => j.status === 'dead').map(j => j.job.id),
      done: js.filter(j => j.status === 'done').length,
      shipped: js.reduce((a, j) => a + j.shipments, 0),
      twice: js.filter(j => j.shipments > 1).length,
      outage: outageAt(t, policy.outage),
      returned,
    });
  }
  const results: JobResult[] = js.map(({ job, tries, runs, shipments, doneAt, deadAt, status }) => {
    const waited =
      status === 'dead' ? undefined : doneAt !== undefined ? doneAt + 1 - job.t - serviceOf(job) : ticks - job.t;
    return {
      job,
      tries,
      runs,
      shipments,
      ...(doneAt !== undefined ? { doneAt } : {}),
      ...(deadAt !== undefined ? { deadAt } : {}),
      ...(waited !== undefined ? { waited } : {}),
      ...(policy.inline && doneAt !== undefined ? { pageWait: doneAt + 1 - job.t } : {}),
    };
  });
  const good = results.filter(r => !r.job.poison);
  return {
    policy,
    ticks: out,
    jobs: results,
    done: results.filter(r => r.doneAt !== undefined).length,
    ranTwice: results.filter(r => r.runs > 1).length,
    deadLettered: results.filter(r => r.deadAt !== undefined).length,
    dead: results.filter(r => r.deadAt !== undefined).map(r => r.job.id),
    waitedMax: Math.max(0, ...good.map(r => r.waited ?? 0)),
    retries: results.reduce((a, r) => a + Math.max(0, r.tries - 1), 0),
    doubleShipped: results.filter(r => r.shipments > 1).length,
    left: good.filter(r => r.doneAt === undefined && r.deadAt === undefined).length,
    pageWaitMax: Math.max(0, ...results.map(r => r.pageWait ?? 0)),
    bunch: Math.max(0, ...due.values()),
  };
}

const runs = new Map<string, Run>();
/** A policy's run over the module's morning, computed once per page. */
export function runOf(p: Policy): Run {
  const k = JSON.stringify(p);
  if (!runs.has(k)) runs.set(k, simulate(p));
  return runs.get(k)!;
}
/** The result for one order in a run. */
export const resultOf = (r: Run, id: string) => r.jobs.find(j => j.job.id === id)!;

/** The runs the chapters teach from, one place, so the chapters, the dev page and the pins agree (KTD12). */
export const SCENES = {
  /** 1: the till does the work inside the request, two customers at a time */
  inline: policyOf({ inline: true, workers: 2 }),
  /** 2: a queue and one worker */
  one: policyOf({ workers: 1 }),
  /** 3: the sale with more workers */
  three: policyOf({ workers: 3 }),
  /** 4: the courier's outage, four workers, four tries, no backoff / backoff / backoff with jitter */
  noBackoff: policyOf({ workers: 4, maxTries: 4, outage: true, backoff: 'none' }),
  backoff: policyOf({ workers: 4, maxTries: 4, outage: true, backoff: 'exp' }),
  jitter: policyOf({ workers: 4, maxTries: 4, outage: true, backoff: 'exp', jitter: true }),
  /** 5: two workers; the reader knocks one over (the pinned crash is Show me's) */
  crash: policyOf({ workers: 2 }),
  /** 6: Moe's order, retried at once, with no limit or at most five tries */
  forever: policyOf({ workers: 3, poison: true, maxTries: 0, backoff: 'none' }),
  shelf: policyOf({ workers: 3, poison: true, maxTries: 5, backoff: 'none' }),
};
/** Chapter 5's moment: both workers mid-job, and Show me's crash */
export const CRASH_AT = 6;
export const SHOWN_CRASH: Crash = { worker: 0, tick: CRASH_AT };

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
