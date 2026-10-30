// Backups' tick simulator (KTD6): a week of Larkspur's order database (data/backups/writes.json), an hour a tick,
// Monday 00:00 to Sunday 23:00. Deterministic: the same policy and disaster always give the same week.
//
// - Copies start at 01:00 and repeat every `every` hours. A copy taken at hour t holds every order written before t.
//   With incremental copies, each day's first copy is full and the rest keep only what changed since the copy before:
//   a restore needs the full copy and every link after it (PostgreSQL's manual, data/backups/facts.json).
// - Every tape goes into the cabinet in the server room; with the warehouse on, each is also sent over the network to
//   the warehouse across town. With the lockbox on, the courier collects a full tape at 18:00 every day: offline.
// - A disaster strikes at the end of its hour and wipes the places it names (data/backups/disasters.json). The restore
//   takes the newest copy that survived and whose whole chain reads; lost work is every order written since.
// - A copy job can go bad (`corruptFrom`): its tapes report done but never read back. A daily test restore at 09:00
//   reads the newest tape; a bad one is caught there, the job is fixed and a fresh full copy is taken at once.
// Restore times, the courier's hour and the costs are labelled planning numbers (data/backups/assumptions.json).
import writes from '../../../data/backups/writes.json' with { type: 'json' };
import data from '../../../data/backups/assumptions.json' with { type: 'json' };
import disasters from '../../../data/backups/disasters.json' with { type: 'json' };

export const ASSUMPTIONS = data;
export const DAYS = writes.days;
/** orders written in each hour of the week */
export const WRITES: number[] = writes.hours.flat();
export const TICKS = WRITES.length;
export const ALL_ORDERS = WRITES.reduce((a, b) => a + b, 0);

export type Place = 'cabinet' | 'warehouse' | 'lockbox';
export type Kind = 'disk' | 'fire' | 'ransomware';
export const PLACES: Place[] = ['cabinet', 'warehouse', 'lockbox'];
export const KINDS = Object.keys(disasters.kinds) as Kind[];
export const KIND = disasters.kinds as Record<Kind, { name: string; hits: string[]; how: 'dead' | 'burnt' | 'locked' }>;
export const BENCH_STRIKES = disasters.bench as Strike[];

/** "Thu 17:00" */
export const clock = (t: number) => `${DAYS[Math.floor(t / 24) % 7]} ${String(t % 24).padStart(2, '0')}:00`;
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
/** orders written in hours [from, to] */
export const ordersIn = (from: number, to: number) =>
  WRITES.slice(Math.max(0, from), to + 1).reduce((a, b) => a + b, 0);

export interface Policy {
  /** hours between copies; 0 is no copies */
  every: number;
  incremental: boolean;
  warehouse: boolean;
  lockbox: boolean;
  /** the copy job writes unreadable tapes from this hour on, until a test restore catches it */
  corruptFrom: number | null;
  /** a daily test restore at 09:00 */
  test: boolean;
  /** one tape that won't read: the copy taken at this hour */
  broken: number | null;
}
export const DEFAULTS: Policy = {
  every: 0,
  incremental: false,
  warehouse: false,
  lockbox: false,
  corruptFrom: null,
  test: false,
  broken: null,
};
export const policyOf = (p: Partial<Policy> = {}): Policy => ({ ...DEFAULTS, ...p });

export interface Copy {
  t: number;
  place: Place;
  full: boolean;
  /** the hour of the copy this one builds on (incremental), else null */
  base: number | null;
  /** reports done but never reads back */
  bad: boolean;
}
export interface Week {
  policy: Policy;
  copies: Copy[];
  /** the hour a test restore caught the bad copy job, if one did */
  caught: number | null;
  /** tapes written to the cabinet in the week, by kind */
  fulls: number;
  incrementals: number;
  /** dollars for the week: planning numbers */
  cost: number;
}

const isCopyHour = (p: Policy, t: number) =>
  p.every > 0 && t >= data.firstCopyHour && (t - data.firstCopyHour) % p.every === 0;

/** Runs the week's copies under a policy, an hour at a time. */
export function simulate(p: Policy): Week {
  const copies: Copy[] = [];
  let caught: number | null = null,
    last = null as Copy | null;
  const take = (t: number, fresh = false) => {
    const sameDay = last !== null && Math.floor(last.t / 24) === Math.floor(t / 24);
    const full = !p.incremental || fresh || !sameDay;
    const bad = (p.corruptFrom !== null && t >= p.corruptFrom && caught === null) || t === p.broken;
    const c: Copy = { t, place: 'cabinet', full, base: full ? null : last!.t, bad };
    copies.push(c);
    if (p.warehouse) copies.push({ ...c, place: 'warehouse' });
    last = c;
  };
  for (let t = 0; t < TICKS; t++) {
    // 1. the daily test restore reads the newest tape back; a bad one is caught, the job fixed, a fresh full taken
    if (p.test && caught === null && t % 24 === data.testHour && last?.bad) {
      caught = t;
      take(t, true);
    }
    // 2. the scheduled copy
    if (isCopyHour(p, t) && last?.t !== t) take(t);
    // 3. the courier collects a full tape for the lockbox
    if (p.lockbox && t % 24 === data.courierHour)
      copies.push({
        t,
        place: 'lockbox',
        full: true,
        base: null,
        bad: p.corruptFrom !== null && t >= p.corruptFrom && caught === null,
      });
  }
  const tapes = copies.filter(c => c.place === 'cabinet'),
    fulls = tapes.filter(c => c.full).length,
    incrementals = tapes.length - fulls;
  const cost =
    fulls * data.costs.full +
    incrementals * data.costs.incremental +
    (p.warehouse ? data.costs.warehouse : 0) +
    (p.lockbox ? data.costs.lockbox : 0);
  return { policy: p, copies, caught, fulls, incrementals, cost };
}

const weeks = new Map<string, Week>();
/** A policy's week, computed once per page. */
export function weekOf(p: Policy): Week {
  const k = JSON.stringify(p);
  if (!weeks.has(k)) weeks.set(k, simulate(p));
  return weeks.get(k)!;
}

export interface Strike {
  kind: Kind;
  hour: number;
}
export interface Restore {
  strike: Strike;
  hit: Place[];
  /** where the restore came from, and the copy's hour (null: nothing restores) */
  from: Place | null;
  point: number | null;
  /** tapes read back: the full copy and its incremental links */
  links: number;
  /** orders lost: written since the restore point, or the whole week when nothing restores */
  lost: number;
  /** hours down while the restore runs (planning numbers); null when nothing restores */
  down: number | null;
}

/** The copies of a place that exist by the end of hour `at`. */
export const copiesAt = (w: Week, at: number, place?: Place) =>
  w.copies.filter(c => c.t <= at && (place === undefined || c.place === place));

/** The tapes a restore from copy `c` must read, newest first; null when one of them won't read. */
export function chainOf(w: Week, c: Copy): Copy[] | null {
  const out: Copy[] = [];
  let k: Copy | undefined = c;
  while (k && !k.bad) {
    out.push(k);
    if (k.full) return out;
    const { place, base }: Copy = k;
    k = w.copies.find(x => x.place === place && x.t === base);
  }
  return null;
}
export const restoreHours = (place: Place, links: number) =>
  data.fetchHours[place] + data.restoreHours.full + (links - 1) * data.restoreHours.incremental;

/** What a disaster leaves: the newest surviving copy whose chain reads, from whichever place loses least (then the
 * fastest), the orders lost and the hours down. */
export function restore(w: Week, s: Strike): Restore {
  const hit = PLACES.filter(p => KIND[s.kind].hits.includes(p));
  let best: Omit<Restore, 'strike' | 'hit' | 'lost'> = { from: null, point: null, links: 0, down: null };
  for (const place of PLACES) {
    if (hit.includes(place)) continue;
    const mine = copiesAt(w, s.hour, place).reverse();
    for (const c of mine) {
      const chain = chainOf(w, c);
      if (!chain) continue;
      const down = restoreHours(place, chain.length);
      if (best.point === null || c.t > best.point || (c.t === best.point && down < best.down!))
        best = { from: place, point: c.t, links: chain.length, down };
      break;
    }
  }
  return { strike: s, hit, ...best, lost: ordersIn(best.point ?? 0, s.hour) };
}

/** The runs the chapters teach from, in one place, so the chapters, the dev page and the pins agree (KTD7). */
export const SCENES = {
  /** 1: no copies; then a nightly copy */
  none: policyOf(),
  nightly: policyOf({ every: 24 }),
  /** 2: every 6 hours */
  six: policyOf({ every: 6 }),
  hourly: policyOf({ every: 1 }),
  /** 3: six-hourly incremental copies, Tuesday 13:00's tape unreadable */
  chain: policyOf({ every: 6, incremental: true }),
  broken: policyOf({ every: 6, incremental: true, broken: 37 }),
  /** 4: the warehouse across town */
  offsite: policyOf({ every: 6, warehouse: true }),
  /** 5: the courier's lockbox too */
  lockbox: policyOf({ every: 6, warehouse: true, lockbox: true }),
  /** 6: the copy job goes bad Monday 07:00; with and without the daily test restore */
  silent: policyOf({ every: 6, corruptFrom: 7 }),
  tested: policyOf({ every: 6, corruptFrom: 7, test: true }),
};
/** The disasters the chapters strike, by name */
export const STRIKES = {
  /** 1: the disk dies Wednesday 15:00 */
  wed: { kind: 'disk', hour: 63 },
  /** 2: the disk dies Thursday 17:00 */
  thu: { kind: 'disk', hour: 89 },
  /** 3: the disk dies Tuesday 22:00 */
  tue: { kind: 'disk', hour: 46 },
  /** 4: fire, Thursday 11:00 */
  fire: { kind: 'fire', hour: 83 },
  /** 5: ransomware, Saturday 21:00 */
  ransom: { kind: 'ransomware', hour: 141 },
  /** 6: the disk dies Friday 15:00 */
  fri: { kind: 'disk', hour: 111 },
} satisfies Record<string, Strike>;
