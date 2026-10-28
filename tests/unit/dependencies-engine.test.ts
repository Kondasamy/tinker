// Dependencies' resolver, lockfile and registry (KTD7, KTD10): each effect a chapter teaches is pinned in
// data/dependencies/pinned.json (`chapters`) and recomputed here; WRITE_PINNED=1 rewrites it. Also checks the
// fictional registry's flags and the repo fact chapter 6 quotes against pnpm-workspace.yaml.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import pinnedData from '../../data/dependencies/pinned.json' with { type: 'json' };
import {
  APP,
  REGISTRY,
  auditOf,
  availableOn,
  brokenOf,
  dependantsOf,
  diff,
  install,
  nodeAt,
} from '../../src/lib/dependencies/resolve';
import { lockOf, update } from '../../src/lib/dependencies/lock';
import {
  BAD,
  BAD_DAY,
  FIRST,
  FIRST_LOCK,
  HIJACK,
  HIJACKED,
  HIJACK_DAY,
  LOGGER,
  SECURITY,
  effects,
  pinned,
} from '../../src/lib/dependencies/story';
import { fact } from '../../src/lib/dependencies/facts';

describe('the pinned effects', () => {
  it('every chapter effect recomputes to its pin', () => {
    const now = effects();
    if (process.env.WRITE_PINNED) {
      const file = 'data/dependencies/pinned.json';
      const p = JSON.parse(readFileSync(file, 'utf8'));
      writeFileSync(file, `${JSON.stringify({ ...p, chapters: now }, null, 2)}\n`);
    } else expect(now).toEqual((pinnedData as { chapters?: unknown }).chapters);
  });
});

describe('the resolver', () => {
  it('takes the highest version in range published by the install day, and nothing removed', () => {
    expect(nodeAt(install({ day: 10 }), 'pricebook')!.version).toBe('1.4.2');
    expect(nodeAt(install({ day: 11 }), 'pricebook')!.version).toBe('1.4.3');
    expect(availableOn(HIJACKED, HIJACK.removed! - 1)).toContain(HIJACK.version);
    expect(availableOn(HIJACKED, HIJACK.removed!)).not.toContain(HIJACK.version);
  });

  it('is deterministic', () => {
    expect(install({ day: 7 })).toEqual(install({ day: 7 }));
  });

  it('installing on day 10 and day 11 without a lockfile: the bad patch arrives; with it, the trees are equal', () => {
    const d = diff(install({ day: BAD_DAY - 1 }), install({ day: BAD_DAY }));
    expect(d).toEqual([{ path: BAD.name, name: BAD.name, from: '1.4.2', to: BAD.version }]);
    expect(brokenOf(install({ day: BAD_DAY }))).toContain('');
    expect(diff(install({ day: BAD_DAY - 1, lock: FIRST_LOCK }), install({ day: BAD_DAY, lock: FIRST_LOCK }))).toEqual(
      [],
    );
  });

  it('the bad patch breaks every caret range that reaches it: the app’s and cartwheel’s', () => {
    const t = install({ day: BAD_DAY });
    expect(nodeAt(t, BAD.name)!.by.sort()).toEqual(['', 'cartwheel']);
    expect([...brokenOf(t)].sort()).toEqual(['', 'cartwheel', BAD.name]);
  });

  it('two incompatible ranges on one package give a nested second copy', () => {
    expect(nodeAt(FIRST, 'tidystr')!.version).toMatch(/^2\./);
    const nested = nodeAt(FIRST, 'cartwheel/tidystr')!;
    expect(nested.version).toMatch(/^1\./);
    expect(nested.by).toEqual(['cartwheel']);
    expect(FIRST.unmet).toEqual([]);
  });

  it('a shared package is installed once when one copy meets every range', () => {
    expect(FIRST.nodes.filter(n => n.name === 'pricebook')).toHaveLength(1);
  });

  it('pulling a package breaks exactly what stands on it; forcing a version out of range does too', () => {
    const t = install({ day: 0, overrides: { 'cartwheel/tidystr': null } });
    expect([...brokenOf(t)].sort()).toEqual(['', 'cartwheel']);
    expect([...dependantsOf(FIRST, ['cartwheel/tidystr'])].sort()).toEqual(['', 'cartwheel']);
    expect([...brokenOf(install({ day: 0, overrides: { pricebook: '2.0.0' } }))].sort()).toEqual(['', 'cartwheel']);
    expect([...brokenOf(install({ day: 0, overrides: { pricebook: '1.5.0' } }))]).toEqual([]);
    // pulling a leaf many stand on: its dependants and theirs, up to the app
    const roundnum = install({ day: 0, overrides: { roundnum: null } });
    expect([...brokenOf(roundnum)].sort()).toEqual(['', 'cartwheel', 'pricebook']);
  });

  it('the tree diff names every place that moved between two installs', () => {
    expect(diff(install({ day: 2 }), install({ day: 10 })).map(c => c.name)).toEqual([
      'cartwheel',
      'geobits',
      'shipcalc',
      'tidystr',
    ]);
  });
});

describe('the hijacked release', () => {
  it('is transitive, reached through a caret range, and carries both an install script and an import payload', () => {
    expect(Object.keys(APP.deps)).not.toContain(HIJACKED);
    const via = Object.values(REGISTRY[LOGGER].versions).map(r => r.deps?.[HIJACKED]);
    expect(via.every(r => r?.startsWith('^'))).toBe(true);
    expect(HIJACK.installScript).toBeTruthy();
    expect(HIJACK.importPayload).toBeTruthy();
  });

  it('is picked up even with the direct dependency pinned exactly; scripts off reports the script, the payload ships', () => {
    const deps = pinned(LOGGER);
    expect(deps[LOGGER]).toBe('1.3.0');
    const t = install({ day: HIJACK_DAY, deps });
    expect(nodeAt(t, HIJACKED)!.version).toBe(HIJACK.version);
    const off = auditOf(t, false);
    expect(off.scriptRan).toEqual([]);
    expect(off.scriptBlocked).toEqual([HIJACKED]);
    expect(off.payload).toEqual([HIJACKED]);
    expect(auditOf(t, true).scriptRan).toEqual([HIJACKED]);
  });

  it('with the lockfile it is not picked up', () => {
    const t = install({ day: HIJACK_DAY, lock: FIRST_LOCK });
    expect(nodeAt(t, HIJACKED)!.version).toBe(FIRST_LOCK[HIJACKED]);
    expect(auditOf(t)).toMatchObject({ hijacked: [], scriptRan: [], payload: [] });
  });
});

describe('the lockfile', () => {
  it('records every place in the tree', () => {
    expect(Object.keys(FIRST_LOCK).sort()).toEqual(FIRST.nodes.map(n => n.path).sort());
  });
  it('a tested update rejects a candidate with a bad release and keeps the old lockfile', () => {
    const u = update(FIRST_LOCK, BAD_DAY);
    expect(u.rejected).toBe(true);
    expect(u.lock).toBe(FIRST_LOCK);
    const next = update(FIRST_LOCK, BAD_DAY + 1);
    expect(next.rejected).toBe(false);
    expect(next.lock[BAD.name]).toBe('1.4.4');
    expect(next.lock).toEqual(lockOf(install({ day: BAD_DAY + 1 })));
  });
});

describe('the registry and its facts', () => {
  it('flags one bad release, one hijacked, one security fix; every package is labelled fictional', () => {
    expect(BAD.breaks).toBeTruthy();
    expect(SECURITY.security).toBeTruthy();
    const note = JSON.parse(readFileSync('data/dependencies/registry.json', 'utf8')).note as string;
    expect(note).toMatch(/fictional/);
  });
  it('the repo fact chapter 6 quotes matches pnpm-workspace.yaml', () => {
    const yaml = readFileSync('pnpm-workspace.yaml', 'utf8');
    for (const name of fact('this-repo').value!.split(',')) expect(yaml).toMatch(new RegExp(`\\n  ${name}: false\\n`));
  });
  it('real incidents appear only as dated facts: no registry package takes their names', () => {
    for (const real of ['left-pad', 'event-stream', 'flatmap-stream', 'xz']) expect(REGISTRY[real]).toBeUndefined();
    for (const id of ['left-pad', 'event-stream', 'xz']) expect(fact(id).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
