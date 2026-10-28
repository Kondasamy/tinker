// Releases' minute-tick simulator (KTD8), in Consistency's shape (policyOf, simulate, runOf). Larkspur's checkout takes
// 100 checkouts a minute (planning numbers in data/releases/assumptions.json, labelled, never measured). A change from
// data/releases/changes.json carries the failure rate it truly has; the old checkout fails at the base rate.
//
// - Exposure: the share of checkouts that meet the new version. A staged plan sets it (each stage `bake` minutes from
//   `start`), or the reader's dial does (a dial event stops the plan).
// - Each checkout has two seeded draws, fixed for its minute and place in line whatever the policy: v picks its track
//   (new when v < exposure, so a bigger share only adds checkouts) and u decides it (fails when u is under its track's
//   rate). A checkout on the new track with base ≤ u < rate is one the old version would have completed: hurt.
// - The check: at the end of each stage under everyone, the canary's failure rate is compared with the rest's; more
//   than `threshold` higher (0: no check) rings the alarm, and the alarm pulls the way back.
// - The way back: the lever (a reader event) or an alarm. It takes rollbackMinutes, or flagMinutes when the change sits
//   behind a feature flag; the new track runs until then. A change with a migration and no expand step refuses it.
// - Within a minute: a way back that is due lands, then the plan's stage, then the reader's events, then the checkouts,
//   then the check. The reader's dial and lever are events inserted into the seeded run, so replays are deterministic
//   (Queues' crash is the same idea).
import data from '../../../data/releases/assumptions.json' with { type: 'json' };
import changes from '../../../data/releases/changes.json' with { type: 'json' };
import { mulberry32 } from '../transformers/sample';

export const ASSUMPTIONS = data;
export const TICKS = data.ticks;
export const PER_MINUTE = data.checkoutsPerMinute;
export const BASE = data.baseRate;
export const ROLLBACK = data.rollbackMinutes;
export const FLAG_OFF = data.flagMinutes;
export const THRESHOLD = data.threshold;

export interface Change {
  id: string;
  name: string;
  short: string;
  /** the share of its checkouts that truly fail */
  rate: number;
  /** what goes wrong, when something does */
  bug?: string;
  /** the pipeline gate whose test covers this bug */
  caughtBy?: string;
  /** it moves data into a new table */
  migration?: boolean;
}
export const CHANGES = changes.changes as Change[];
export const changeOf = (id: string) => {
  const c = CHANGES.find(c => c.id === id);
  if (!c) throw new Error(`unknown change: ${id}`);
  return c;
};

export type Event = { t: number; kind: 'dial'; share: number } | { t: number; kind: 'back' };
export interface Policy {
  change: string;
  /** the minute the plan begins */
  start: number;
  /** exposure per stage; empty: no plan, only the reader's dial */
  stages: number[];
  /** minutes per stage */
  bake: number;
  /** the alarm rings when the canary fails more than this share above the rest; 0 is no check */
  threshold: number;
  /** the change sits behind a feature flag: the way back is switching it off */
  flag: boolean;
  /** a migration done as expand, then contract: the old version still works */
  expand: boolean;
  events: Event[];
  seed: number;
}
export const DEFAULTS: Policy = {
  change: 'new-checkout',
  start: 2,
  stages: [1],
  bake: 5,
  threshold: 0,
  flag: false,
  expand: false,
  events: [],
  seed: data.seed,
};
export const policyOf = (extra: Partial<Policy> = {}): Policy => ({ ...DEFAULTS, ...extra });

/** A minute's clock time, "10:07". */
export const clock = (t: number) => {
  const [h, m] = data.startsAt.split(':').map(Number),
    all = h * 60 + m + t * data.tickMinutes;
  return `${String(Math.floor(all / 60)).padStart(2, '0')}:${String(all % 60).padStart(2, '0')}`;
};
export const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

const draws = new Map<number, { u: Float64Array; v: Float64Array }>();
/** Every checkout's two draws for a seed, made once. */
export function drawsOf(seed: number) {
  if (!draws.has(seed)) {
    const r = mulberry32(seed),
      n = TICKS * PER_MINUTE,
      u = new Float64Array(n),
      v = new Float64Array(n);
    for (let i = 0; i < n; i++) [u[i], v[i]] = [r(), r()];
    draws.set(seed, { u, v });
  }
  return draws.get(seed)!;
}

export type MilestoneKind = 'stage' | 'dial' | 'pass' | 'alarm' | 'back' | 'refused' | 'safe' | 'full';
export interface Milestone {
  t: number;
  kind: MilestoneKind;
  /** the exposure it set (stage, dial, full) */
  share?: number;
  /** the check's counts: failures and checkouts on the canary and on the rest (pass, alarm) */
  canary?: [number, number];
  rest?: [number, number];
}
export interface Tick {
  t: number;
  share: number;
  newN: number;
  newErr: number;
  oldN: number;
  oldErr: number;
  /** checkouts the change failed this minute, and so far */
  hurt: number;
  hurtSoFar: number;
  /** the way back is under way */
  backing: boolean;
}
export interface Run {
  policy: Policy;
  change: Change;
  ticks: Tick[];
  milestones: Milestone[];
  hurt: number;
  /** the first minute everyone met the new version */
  fullAt: number | null;
  alarmAt: number | null;
  /** the way back began, and the minute the new track emptied */
  backAt: number | null;
  safeAt: number | null;
  refusedAt: number | null;
}

/** Runs the morning under a policy. */
export function simulate(policy: Policy): Run {
  const change = changeOf(policy.change),
    { u, v } = drawsOf(policy.seed),
    ticks: Tick[] = [],
    ms: Milestone[] = [];
  let share = 0,
    plan = policy.stages.length > 0,
    stage = -1,
    stageFrom = 0,
    doneAt = -1,
    hurtSoFar = 0;
  const run: Omit<Run, 'ticks' | 'milestones' | 'hurt'> = {
    policy,
    change,
    fullAt: null,
    alarmAt: null,
    backAt: null,
    safeAt: null,
    refusedAt: null,
  };
  const win = { cErr: 0, cN: 0, rErr: 0, rN: 0 };
  const back = (t: number) => {
    if (change.migration && !policy.expand) {
      run.refusedAt ??= t;
      ms.push({ t, kind: 'refused' });
      return;
    }
    if (doneAt >= 0) return;
    plan = false;
    doneAt = t + (policy.flag ? FLAG_OFF : ROLLBACK);
    run.backAt ??= t;
    ms.push({ t, kind: 'back' });
  };
  const set = (t: number, s: number) => {
    share = s;
    if (s === 1 && run.fullAt === null) {
      run.fullAt = t;
      ms.push({ t, kind: 'full', share: s });
    }
  };
  for (let t = 0; t < TICKS; t++) {
    // 1. the way back lands
    if (doneAt === t) {
      share = 0;
      doneAt = -1;
      run.safeAt ??= t;
      ms.push({ t, kind: 'safe', share: 0 });
    }
    // 2. the plan's next stage
    if (plan && t >= policy.start && (t - policy.start) % policy.bake === 0) {
      const k = (t - policy.start) / policy.bake;
      if (k < policy.stages.length) {
        stage = k;
        stageFrom = t;
        Object.assign(win, { cErr: 0, cN: 0, rErr: 0, rN: 0 });
        ms.push({ t, kind: 'stage', share: policy.stages[k] });
        set(t, policy.stages[k]);
      }
    }
    // 3. the reader's dial and lever; the dial waits while the way back is under way
    for (const e of policy.events)
      if (e.t === t) {
        if (e.kind === 'back') back(t);
        else if (doneAt < 0) {
          plan = false;
          ms.push({ t, kind: 'dial', share: e.share });
          set(t, e.share);
        }
      }
    // 4. the minute's checkouts
    const k: Tick = { t, share, newN: 0, newErr: 0, oldN: 0, oldErr: 0, hurt: 0, hurtSoFar, backing: doneAt >= 0 };
    for (let j = 0; j < PER_MINUTE; j++) {
      const i = t * PER_MINUTE + j;
      if (v[i] < share) {
        k.newN++;
        if (u[i] < change.rate) k.newErr++;
        if (u[i] >= BASE && u[i] < change.rate) k.hurt++;
      } else {
        k.oldN++;
        if (u[i] < BASE) k.oldErr++;
      }
    }
    hurtSoFar += k.hurt;
    k.hurtSoFar = hurtSoFar;
    ticks.push(k);
    Object.assign(win, {
      cErr: win.cErr + k.newErr,
      cN: win.cN + k.newN,
      rErr: win.rErr + k.oldErr,
      rN: win.rN + k.oldN,
    });
    // 5. the check, at the end of a stage under everyone
    if (plan && policy.threshold > 0 && stage >= 0 && policy.stages[stage] < 1 && t === stageFrom + policy.bake - 1) {
      const rate = (e: number, n: number) => (n ? e / n : 0);
      const counts = { canary: [win.cErr, win.cN] as [number, number], rest: [win.rErr, win.rN] as [number, number] };
      if (rate(win.cErr, win.cN) - rate(win.rErr, win.rN) > policy.threshold) {
        run.alarmAt ??= t;
        ms.push({ t, kind: 'alarm', ...counts });
        back(t);
        plan = false;
      } else ms.push({ t, kind: 'pass', ...counts });
    }
  }
  return { ...run, ticks, milestones: ms, hurt: hurtSoFar };
}

const runs = new Map<string, Run>();
/** A policy's run, computed once per page. */
export function runOf(p: Policy): Run {
  const key = JSON.stringify(p);
  if (!runs.has(key)) runs.set(key, simulate(p));
  return runs.get(key)!;
}
/** The minute t of a run, clamped. */
export const tickOf = (r: Run, t: number) => r.ticks[Math.max(0, Math.min(t, r.ticks.length - 1))];
/** The last milestone at or before minute t. */
export const milestoneAt = (r: Run, t: number) => r.milestones.filter(m => m.t <= t).at(-1);
/** The next minute after t that has a milestone, or the last minute. */
export const nextEventAfter = (r: Run, t: number) => r.milestones.find(m => m.t > t)?.t ?? r.ticks.length - 1;

/** The runs the chapters teach from, in one place, so the chapters, the dev page and the pins agree (KTD10). */
export const CANARY = 0.05;
export const SCENES = {
  /** 1: the new checkout, straight to everyone */
  all: policyOf({ change: 'new-checkout', start: 2, stages: [1] }),
  /** 2: nothing released yet; the pipeline runs */
  calm: policyOf({ change: 'button', stages: [] }),
  /** 3: a 5% canary with a 2-minute bake (the button: a false alarm; the tax rounding: a miss), or a longer bake */
  canary: (change: string, bake: number) =>
    policyOf({ change, start: 2, stages: [CANARY, 1], bake, threshold: THRESHOLD }),
  /** 4: gift wrap deployed dark behind a flag; the reader's dial releases it */
  flag: policyOf({ change: 'gift', start: 0, stages: [], flag: true }),
  /** 5: the saved-cards migration at a quarter of checkouts */
  migration: policyOf({ change: 'saved-cards', start: 1, stages: [0.25] }),
  /** 6: the new checkout in stages that halt themselves */
  staged: policyOf({
    change: 'new-checkout',
    start: 2,
    stages: [CANARY, 0.25, 0.5, 1],
    bake: 4,
    threshold: THRESHOLD,
  }),
};
