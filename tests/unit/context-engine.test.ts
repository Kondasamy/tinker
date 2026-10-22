import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cacheHit, cost, marks, READ, WRITE, OUTPUT } from '../../src/lib/context/cache';
import { ACCESSED, FACTS } from '../../src/lib/context/facts';
import { MEMORY_DIR, writeNote } from '../../src/lib/context/memory';
import { DOMAINS, REPLY_ROOM, run, totals, type Setup } from '../../src/lib/context/loop';
import type { Recording } from '../../src/lib/context/turns';
import { CASES, DOCS, type Part } from '../../src/lib/context/window';

const SESSION = DOMAINS['05-clearing-the-desk'].sessions![0][0];
const last = <T>(xs: T[]) => xs[xs.length - 1];
const part = (kind: Part['kind'], text: string, tokens: number): Part => ({ kind, label: kind, text, tokens });

describe('context data', () => {
  it('every document is a passage from data/corpus, word for word', () => {
    for (const d of DOCS) expect(fs.readFileSync(`data/corpus/${d.source}.md`, 'utf8'), d.id).toContain(d.text);
  });
  it('every case names documents that exist, and never its fact as a distractor', () => {
    const ids = new Set(DOCS.map(d => d.id));
    for (const c of CASES) {
      if (c.fact) expect(ids.has(c.fact), c.id).toBe(true);
      for (const d of c.distractors) expect(ids.has(d) && d !== c.fact, `${c.id} ${d}`).toBe(true);
    }
  });
  it('every fact has a source and the access date (R5)', () => {
    expect(ACCESSED).toBe('2026-10-21');
    for (const f of FACTS) expect(f.source, f.id).toMatch(/^https:\/\//);
  });
});

describe('the signature holds only what the model sees (KTD7)', () => {
  const base: Partial<Setup> = { sessions: [SESSION], retrieval: 'fetch', tools: true };
  it('changing only the budget, cache lifetime or breakpoints leaves it unchanged', () => {
    const sigs = run(undefined, base).signatures;
    expect(run(undefined, { ...base, budget: 50_000 }).signatures).toEqual(sigs);
    expect(run(undefined, { ...base, lifetime: '1h', gap: 30 }).signatures).toEqual(sigs);
    expect(run(undefined, { ...base, breakpoints: [] }).signatures).toEqual(sigs);
  });
  it('moving the needed fact from early to the middle changes it', () => {
    const at = (place: Setup['place']) =>
      run(undefined, { sessions: [['free-shipping']], distractors: 4, place }).signatures[0];
    expect(at('middle')).not.toBe(at('early'));
  });
});

describe('the window', () => {
  it('is built in a fixed order: tools, system, then messages', () => {
    const w = run(undefined, { sessions: [SESSION.slice(0, 2)], tools: true }).meter[1].window;
    expect(w.parts.map(p => p.kind)).toEqual(['tools', 'system', 'docs', 'history', 'history', 'docs', 'message']);
    expect(w.tokens).toBe(w.parts.reduce((n, p) => n + p.tokens, 0));
  });
  it('an over-budget window is refused, and no model turn is looked up', () => {
    let looked = 0;
    const spy = {
      get turns() {
        looked++;
        return {};
      },
    } as unknown as Recording;
    const r = run(spy, { budget: 10 });
    expect(r.status).toBe('over-budget');
    expect(looked).toBe(0);
    expect(r.meter).toEqual([]);
    expect(r.refused!.tokens + REPLY_ROOM).toBeGreaterThan(10);
  });
  it('clearing tool results lowers the token count and keeps the latest results', () => {
    const full = last(run(undefined, { sessions: [SESSION], retrieval: 'fetch' }).meter).window;
    const cleared = last(run(undefined, { sessions: [SESSION], retrieval: 'fetch', history: 'cleared' }).meter).window;
    expect(cleared.tokens).toBeLessThan(full.tokens);
    const docs = cleared.parts.filter(p => p.kind === 'docs');
    expect(docs.slice(0, -1).every(p => p.cleared)).toBe(true);
    expect(last(docs)).toEqual(last(full.parts.filter(p => p.kind === 'docs')));
  });
});

describe('the cache', () => {
  const tools = part('tools', 'T', 100),
    sys = part('system', 'S', 50),
    msg = part('message', 'M', 30);
  it('an identical prefix is a full hit', () => {
    const parts = [tools, sys, msg];
    expect(cacheHit([{ parts, marks: marks(parts, ['end']) }], parts, ['end'])).toEqual({
      read: 180,
      write: 0,
      fresh: 0,
      parts: 3,
    });
  });
  it('a new system prompt keeps hits only on the tools when a breakpoint follows them, and none otherwise', () => {
    const dated = (bps: Setup['breakpoints']) =>
      run(undefined, { sessions: [SESSION], tools: true, retrieval: 'stuff', system: 'dated', breakpoints: bps }).meter;
    const m = dated(['tools', 'end']);
    expect(m[1].hit.read).toBe(m[1].window.parts[0].tokens);
    expect(m[1].hit.parts).toBe(1);
    expect(dated(['end'])[1].hit.read).toBe(0);
    // the plain prompt keeps the whole previous turn
    const plain = run(undefined, { sessions: [SESSION], tools: true, retrieval: 'stuff' }).meter;
    expect(plain[1].hit.read).toBe(plain[0].window.tokens);
  });
  it('reads back the longest live entry that still matches, not only the call just before', () => {
    const first = [tools, sys, msg],
      other = [tools, part('system', 'S2', 50), msg];
    const live = [
      { parts: first, marks: marks(first, ['end']) },
      { parts: other, marks: marks(other, ['end']) },
    ];
    expect(cacheHit(live, [...first, part('message', 'M2', 20)], ['end'])).toEqual({
      read: 180,
      write: 20,
      fresh: 0,
      parts: 3,
    });
    expect(cacheHit([], first, ['end'])).toEqual({ read: 0, write: 180, fresh: 0, parts: 0 });
  });
  it('a call after clearing reads back the prefix an earlier call wrote, while it lives', () => {
    const m = run(undefined, { sessions: [SESSION], retrieval: 'fetch', history: 'cleared' }).meter;
    // every call after the first reads at least the first call's tools, system prompt and question
    for (const x of m.slice(1)) expect(x.hit.read).toBeGreaterThanOrEqual(m[0].window.tokens);
    // 3 minutes apart: call 2's read keeps that prefix alive, but nothing reads it again before call 4, 6 minutes later
    const slow = run(undefined, { sessions: [SESSION], retrieval: 'fetch', history: 'cleared', gap: 3 }).meter;
    expect(slow[1].hit.read).toBe(m[0].window.tokens);
    expect(slow[3].hit.read).toBe(0);
  });
  it('an expired entry is a miss', () => {
    const m = run(undefined, { sessions: [SESSION], retrieval: 'stuff', gap: 6 }).meter;
    expect(m[1].hit.read).toBe(0);
    expect(
      run(undefined, { sessions: [SESSION], retrieval: 'stuff', gap: 6, lifetime: '1h' }).meter[1].hit.read,
    ).toBeGreaterThan(0);
  });
  it('costs the hand-computed value with the dated multipliers', () => {
    expect([READ, WRITE['5m'], WRITE['1h'], OUTPUT]).toEqual([0.1, 1.25, 2, 5]);
    // 50 fresh + 800 × 0.1 + 100 × 1.25 + 20 × 5
    expect(cost({ fresh: 50, read: 800, write: 100, parts: 2 }, 20, '5m')).toBe(355);
    const prev = [tools, sys, part('message', 'old', 30)],
      now = [tools, sys, msg];
    const h = cacheHit([{ parts: prev, marks: marks(prev, ['system', 'end']) }], now, ['system', 'end']);
    expect(h).toEqual({ read: 150, write: 30, fresh: 0, parts: 2 });
    expect(cost(h, 10, '1h')).toBe(150 * 0.1 + 30 * 2 + 10 * 5);
  });
  it('a run with hits costs less than one without', () => {
    const s: Partial<Setup> = { sessions: [SESSION], tools: true, retrieval: 'stuff' };
    expect(totals(run(undefined, s)).cost).toBeLessThan(totals(run(undefined, { ...s, breakpoints: [] })).cost);
  });
});

describe('memory', () => {
  const two = (memory: boolean) =>
    run(undefined, { ...DOMAINS['06-memory'], sessions: DOMAINS['06-memory'].sessions![0], memory } as Partial<Setup>);
  it('a note written in session 1 is in session 2’s window only when memory is on', () => {
    const on = two(true),
      off = two(false);
    const s2 = (r: ReturnType<typeof run>) => r.meter.find(m => m.session === 1)!.window.parts;
    expect(Object.keys(on.notes)).toEqual(['/memories/hollis-hardware.md']);
    expect(s2(on).find(p => p.kind === 'memory')?.text).toContain(on.notes['/memories/hollis-hardware.md']);
    expect(s2(off).some(p => p.kind === 'memory')).toBe(false);
    expect(off.notes).toEqual({});
    expect(on.answers.map(a => a.right)).toEqual([true, true]);
    expect(off.answers[1].right).toBe(false);
  });
  it('the host writes only inside the memory directory', () => {
    expect(writeNote({}, { file: '/etc/passwd', text: 'x' })).toEqual({});
    expect(writeNote({}, { file: `${MEMORY_DIR}../x`, text: 'x' })).toEqual({});
  });
});
